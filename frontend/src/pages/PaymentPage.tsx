import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { bookSeat, createRazorpayOrder, verifyAndConfirmBooking, releaseHolds, fetchEventById } from "../api";
import { ArrowLeft, CreditCard, Smartphone, Check, Download, ShieldCheck, Mail, Lock, Timer } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
        if ((window as any).Razorpay) {
            resolve(true);
            return;
        }
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
};

export default function PaymentPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    // State from BookingPage
    const { 
        selectedSeats = [], 
        totalAmount = 0, 
        date = "N/A", 
        time = "N/A",
        eventId = id || "",
        eventTitle = "Event",
        eventArtist = "Artist",
        eventVenue = "Venue",
        eventImage = "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?q=80&w=1000&auto=format&fit=crop",
        eventType: initialEventType = "seated",
        userId = "user-123",
        expiresIn = 300
    } = location.state || {};

    const [currentEventType, setCurrentEventType] = useState<string>(initialEventType);

    useEffect(() => {
        const evId = eventId || id;
        if (evId && !location.state?.eventType) {
            fetchEventById(evId).then(data => {
                if (data && data.eventType) {
                    setCurrentEventType(data.eventType);
                }
            });
        }
    }, [eventId, id, location.state?.eventType]);

    const isGA = currentEventType === "general-admission";

    const getTicketSummary = () => {
        if (!isGA) return selectedSeats.map((s: string) => s.replace('S', '')).join(', ');
        let vip = 0, fast = 0, ga = 0;
        selectedSeats.forEach((code: string) => {
            const match = code.match(/(\d+)/);
            if (match) {
                const num = parseInt(match[1], 10);
                if (num <= 20) vip++;
                else if (num <= 60) fast++;
                else ga++;
            }
        });
        const parts = [];
        if (vip > 0) parts.push(`${vip}x VIP Pit`);
        if (fast > 0) parts.push(`${fast}x Fast-Track`);
        if (ga > 0) parts.push(`${ga}x GA Floor`);
        return parts.join(', ') || `${selectedSeats.length}x General Admission`;
    };

    const [paymentMethod, setPaymentMethod] = useState<"razorpay" | "gpay" | "card">("razorpay");
    const [email, setEmail] = useState("");
    const [processing, setProcessing] = useState(false);
    const [success, setSuccess] = useState(false);
    const [qrScanned, setQrScanned] = useState(false);
    const [paymentRefId, setPaymentRefId] = useState<string>("SIMULATED-REF");
    const [emailSent, setEmailSent] = useState(false);
    const [timeLeft, setTimeLeft] = useState<number>(expiresIn);

    const ticketRef = useRef<HTMLDivElement>(null);

    // Total calculated with fee
    const upiAmount = totalAmount + 45;
    const upiPaymentString = `upi://pay?pa=ticketrush@upi&pn=TicketRush&am=${upiAmount}&cu=INR&tn=Ticket for ${eventTitle}`;

    // Auto-load razorpay script on mount
    useEffect(() => {
        loadRazorpayScript();
    }, []);

    // Live 5-minute checkout countdown timer
    useEffect(() => {
        if (success) return;
        if (timeLeft <= 0) {
            alert("⏱️ Your 5-minute checkout reservation has expired and your seats have been released back to public sale!");
            releaseHolds(selectedSeats, eventId, date, time, userId);
            navigate(-1);
            return;
        }
        const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
        return () => clearInterval(timer);
    }, [timeLeft, success, selectedSeats, eventId, date, time, userId, navigate]);

    // Auto-complete payment when QR is scanned in simulated mode
    useEffect(() => {
        if (qrScanned && paymentMethod === "gpay" && !processing && !success) {
            handleSimulatedPayment();
        }
    }, [qrScanned]);

    const handleBack = () => {
        if (!success) {
            releaseHolds(selectedSeats, eventId, date, time, userId);
        }
        navigate(-1);
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    };

    const handleRazorpayPayment = async () => {
        if (!email.trim() || !email.includes("@")) {
            alert("Please provide a valid email address to receive your ticket confirmation receipt.");
            return;
        }

        setProcessing(true);
        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded) {
            alert("Failed to load Razorpay Gateway. Please check your internet connection.");
            setProcessing(false);
            return;
        }

        try {
            // 1. Create Order on Backend
            const orderRes = await createRazorpayOrder(upiAmount, eventId || id || "", selectedSeats);
            if (!orderRes.ok) {
                const errorMsg = "message" in orderRes ? orderRes.message : "Unknown gateway error";
                alert(`❌ Payment Gateway Initialization Failed: ${errorMsg}`);
                setProcessing(false);
                return;
            }

            // 2. Open Razorpay Checkout Modal
            const options = {
                key: orderRes.data.keyId,
                amount: orderRes.data.amount,
                currency: orderRes.data.currency,
                name: "TicketRush",
                description: `${eventTitle} (${selectedSeats.length} Seats)`,
                image: eventImage,
                order_id: orderRes.data.orderId,
                handler: async (response: any) => {
                    setProcessing(true);
                    // 3. Verify signature and confirm tickets on Backend
                    const verifyRes = await verifyAndConfirmBooking({
                        razorpay_order_id: response.razorpay_order_id,
                        razorpay_payment_id: response.razorpay_payment_id,
                        razorpay_signature: response.razorpay_signature,
                        seatCodes: selectedSeats,
                        userId,
                        email: email.trim(),
                        eventId: eventId || id || "",
                        eventTitle: eventTitle || "Event",
                        eventArtist: eventArtist || "Live Performance",
                        eventVenue: eventVenue || "Venue",
                        date,
                        time,
                        totalAmount: upiAmount,
                    });

                    if (!verifyRes.ok) {
                        const errorMsg = "message" in verifyRes ? verifyRes.message : "Verification failed";
                        alert(`❌ Booking Failed: ${errorMsg}`);
                        setProcessing(false);
                    } else {
                        setPaymentRefId(response.razorpay_payment_id);
                        setEmailSent(!!verifyRes.emailSent);
                        setSuccess(true);
                        setProcessing(false);
                    }
                },
                prefill: {
                    email: email.trim(),
                    contact: "9988776655",
                },
                theme: {
                    color: "#7c3aed",
                },
                modal: {
                    ondismiss: () => {
                        setProcessing(false);
                    },
                },
            };

            const rzp = new (window as any).Razorpay(options);
            rzp.on("payment.failed", (response: any) => {
                alert(`❌ Payment Failed: ${response.error.description || "Transaction declined"}`);
                setProcessing(false);
            });
            rzp.open();
        } catch (error) {
            console.error("Payment checkout error:", error);
            alert("An error occurred starting checkout.");
            setProcessing(false);
        }
    };

    const handleSimulatedPayment = async () => {
        setProcessing(true);
        try {
            await new Promise((resolve) => setTimeout(resolve, 1500));

            const promises = selectedSeats.map((code: string) =>
                bookSeat(code, userId, "locked", eventId || id || "", date, time)
            );

            const results = await Promise.all(promises);
            const failures = results.filter((r) => !r.ok);

            if (failures.length > 0) {
                const errorMsg = "message" in failures[0] ? failures[0].message : "Seat already booked!";
                alert(`❌ Booking Failed: ${errorMsg}\n\nSomeone may have booked this seat moments ago. Please select another seat.`);
                setProcessing(false);
                return;
            }

            setPaymentRefId(`MOCK-TXN-${Math.floor(100000 + Math.random() * 900000)}`);
            setSuccess(true);
        } catch (error) {
            alert("Payment failed or seats taken!");
            console.error(error);
        } finally {
            setProcessing(false);
        }
    };

    const handleQrScanned = () => {
        setQrScanned(true);
    };

    const downloadTicket = async () => {
        if (!ticketRef.current) return;

        try {
            const canvas = await html2canvas(ticketRef.current, {
                backgroundColor: "#0b0c15",
                scale: 2,
                useCORS: true,
                allowTaint: true,
            });
            const imgData = canvas.toDataURL("image/png");

            const pdf = new jsPDF({
                orientation: "portrait",
                unit: "px",
                format: [canvas.width / 2, canvas.height / 2],
            });

            pdf.addImage(imgData, "PNG", 0, 0, canvas.width / 2, canvas.height / 2);
            pdf.save(`TicketRush-${selectedSeats.join("_")}.pdf`);
        } catch (err) {
            console.error("PDF generation failed", err);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-theatre-900 text-white flex flex-col items-center justify-center p-4">
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(34,197,94,0.5)]">
                        <Check className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold mb-2">You're Going!</h1>
                    <p className="text-slate-400">{isGA ? "Your tickets have been securely reserved." : "Your seats have been securely reserved."}</p>
                    
                    {emailSent ? (
                        <div className="inline-flex items-center gap-2 mt-3 px-4 py-1.5 rounded-full bg-brand-purple/20 text-brand-gold text-xs font-semibold border border-brand-purple/40">
                            <Mail className="w-3.5 h-3.5" /> Confirmation email & ticket receipt sent to {email}!
                        </div>
                    ) : (
                        email && (
                            <div className="inline-flex items-center gap-2 mt-3 px-4 py-1.5 rounded-full bg-slate-800 text-slate-300 text-xs font-medium border border-slate-700">
                                ℹ️ Booking confirmed (Email delivery pending or in mock mode)
                            </div>
                        )
                    )}
                </div>

                {/* TICKET UI */}
                <div ref={ticketRef} className="bg-theatre-800 border border-theatre-700 rounded-3xl overflow-hidden max-w-sm w-full shadow-2xl relative mb-8">
                    {/* Top Section */}
                    <div className="relative h-48">
                        <img
                            src={eventImage}
                            className="w-full h-full object-cover"
                            alt="Concert"
                            crossOrigin="anonymous"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-theatre-900 to-transparent" />
                        <div className="absolute bottom-4 left-6">
                            <h2 className="text-2xl font-bold text-white">{eventTitle}</h2>
                            <p className="text-brand-gold font-medium">{eventArtist}</p>
                        </div>
                    </div>

                    {/* Perforation */}
                    <div className="relative flex items-center justify-between px-2 -mt-3 z-10">
                        <div className="w-6 h-6 bg-theatre-900 rounded-full -ml-3" />
                        <div className="flex-1 border-t-2 border-dashed border-slate-600 mx-2" />
                        <div className="w-6 h-6 bg-theatre-900 rounded-full -mr-3" />
                    </div>

                    {/* Details */}
                    <div className="p-6 pt-2">
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Date</div>
                                <div className="font-semibold text-slate-200">{date}</div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Time</div>
                                <div className="font-semibold text-slate-200">{time}</div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Venue</div>
                                <div className="font-semibold text-slate-200">{eventVenue}</div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">{isGA ? "Admission Type" : "Seats"}</div>
                                <div className="font-semibold text-brand-gold">{getTicketSummary()}</div>
                            </div>
                        </div>

                        <div className="mb-6 pt-3 border-t border-slate-700/50 flex items-center justify-between">
                            <span className="text-xs text-slate-400 font-medium">Payment Ref ID:</span>
                            <span className="font-mono text-xs text-brand-gold">{paymentRefId}</span>
                        </div>

                        <div className="flex justify-center mb-6">
                            <div className="bg-white p-2 rounded-lg">
                                <QRCodeSVG value={`TICKET-${eventId || id}-${selectedSeats.join('-')}-${paymentRefId}`} size={100} />
                            </div>
                        </div>

                        <div className="text-center text-[10px] text-slate-500 uppercase tracking-widest">
                            Scan at Entry • Gate 4A
                        </div>
                    </div>
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={downloadTicket}
                        className="bg-brand-purple hover:bg-violet-600 text-white font-bold py-3 px-6 rounded-xl flex items-center gap-2 transition-colors shadow-glow-purple"
                    >
                        <Download className="w-5 h-5" /> Download PDF
                    </button>
                    <button
                        onClick={() => navigate('/')}
                        className="bg-theatre-700 hover:bg-theatre-600 text-white font-bold py-3 px-6 rounded-xl transition-colors"
                    >
                        Back Home
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-theatre-900 text-slate-200 p-4 md:p-8">
            <button onClick={handleBack} className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors">
                <ArrowLeft className="w-5 h-5" /> Back to {isGA ? "Ticket Selection" : "Seat Selection"} (Release Hold)
            </button>

            <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Order Summary */}
                <div className="space-y-6">
                    <div className={`p-4 rounded-2xl border flex items-center justify-between transition-all duration-300 ${
                        timeLeft < 60 
                            ? "bg-red-950/80 border-red-500 text-red-300 animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.4)]" 
                            : "bg-amber-950/60 border-amber-500/50 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                    }`}>
                        <div className="flex items-center gap-3">
                            <Timer className={`w-6 h-6 flex-shrink-0 ${timeLeft < 60 ? "text-red-400 animate-bounce" : "text-amber-400"}`} />
                            <div>
                                <h4 className="font-bold text-sm text-white">{isGA ? "Tickets Reserved for Checkout" : "Seats Reserved for Checkout"}</h4>
                                <p className="text-xs opacity-85">Please finish payment before temporary lock expires.</p>
                            </div>
                        </div>
                        <div className="font-mono text-xl font-extrabold px-3 py-1 bg-black/40 rounded-xl border border-white/10 tracking-widest text-white shadow-inner">
                            {formatTime(timeLeft)}
                        </div>
                    </div>

                    <h1 className="text-3xl font-bold text-white mb-2">Order Summary</h1>

                    <div className="bg-theatre-800 border border-theatre-700 rounded-2xl p-6 shadow-xl">
                        <div className="flex gap-4 mb-6 pb-6 border-b border-theatre-700">
                            <img
                                src={eventImage}
                                className="w-24 h-24 rounded-lg object-cover"
                                alt="Show"
                                crossOrigin="anonymous"
                            />
                            <div>
                                <h3 className="font-bold text-xl text-white">{eventTitle}</h3>
                                <div className="text-brand-gold text-sm mb-1">{eventArtist}</div>
                                <div className="text-slate-400 text-sm flex items-center gap-2">
                                    {date} • {time}
                                </div>
                                <div className="text-slate-400 text-sm">{eventVenue}</div>
                            </div>
                        </div>

                        <div className="space-y-3 mb-6">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400">Tickets ({selectedSeats.length})</span>
                                <span className="text-white font-medium">{getTicketSummary()}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400">Subtotal</span>
                                <span className="text-white">₹{totalAmount}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400">Convenience Fee</span>
                                <span className="text-white">₹45</span>
                            </div>
                        </div>

                        <div className="flex justify-between items-center pt-4 border-t border-theatre-700">
                            <span className="font-bold text-white">Total Amount</span>
                            <span className="font-bold text-2xl text-brand-gold">₹{upiAmount}</span>
                        </div>
                    </div>

                    <div className="bg-gradient-to-r from-purple-900/40 to-slate-800/80 border border-brand-purple/30 rounded-2xl p-4 flex items-start gap-3">
                        <ShieldCheck className="w-6 h-6 text-brand-gold flex-shrink-0 mt-0.5" />
                        <div>
                            <h4 className="font-bold text-white text-sm">100% Guaranteed & Secure Booking</h4>
                            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                                Your {isGA ? "tickets" : "seats"} are exclusively held for you during this countdown. If any conflict occurs post-payment, you receive an automated, instant full refund.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Payment Method */}
                <div className="space-y-6">
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-1">Contact & Delivery</h2>
                        <p className="text-xs text-slate-400 mb-4">We'll email your digital tickets immediately after payment.</p>
                        <div className="relative">
                            <Mail className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                            <input 
                                type="email" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Enter your email address (e.g., aditya@example.com)" 
                                className="w-full bg-theatre-800 border border-theatre-600 rounded-xl pl-12 pr-4 py-3 text-white placeholder-slate-500 focus:border-brand-purple focus:outline-none focus:ring-1 focus:ring-brand-purple text-sm transition-all" 
                            />
                        </div>
                    </div>

                    <h2 className="text-2xl font-bold text-white mb-4 pt-2">Select Payment Method</h2>

                    <div className="grid grid-cols-3 gap-3 mb-6">
                        <button
                            onClick={() => setPaymentMethod("razorpay")}
                            className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all relative ${paymentMethod === "razorpay"
                                    ? "bg-brand-purple/20 border-brand-purple text-white shadow-glow-purple font-bold"
                                    : "bg-theatre-800 border-theatre-700 text-slate-400 hover:bg-theatre-700"
                                }`}
                        >
                            <span className="absolute -top-2 bg-brand-gold text-black text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider shadow">Recommended</span>
                            <ShieldCheck className="w-6 h-6 text-brand-gold" />
                            <span className="text-xs text-center">Razorpay Secure</span>
                        </button>
                        <button
                            onClick={() => setPaymentMethod("gpay")}
                            className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${paymentMethod === "gpay"
                                    ? "bg-brand-purple/20 border-brand-purple text-white shadow-glow-purple font-bold"
                                    : "bg-theatre-800 border-theatre-700 text-slate-400 hover:bg-theatre-700"
                                }`}
                        >
                            <Smartphone className="w-6 h-6" />
                            <span className="text-xs text-center">Simulated UPI</span>
                        </button>
                        <button
                            onClick={() => setPaymentMethod("card")}
                            className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${paymentMethod === "card"
                                    ? "bg-brand-purple/20 border-brand-purple text-white shadow-glow-purple font-bold"
                                    : "bg-theatre-800 border-theatre-700 text-slate-400 hover:bg-theatre-700"
                                }`}
                        >
                            <CreditCard className="w-6 h-6" />
                            <span className="text-xs text-center">Demo Card</span>
                        </button>
                    </div>

                    {paymentMethod === "razorpay" && (
                        <div className="bg-theatre-800 border border-theatre-700 rounded-2xl p-6 animate-in fade-in zoom-in duration-300">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-sm font-semibold text-white">Supported Payment Modes:</span>
                                <div className="flex items-center gap-2 text-xs text-brand-gold font-bold">
                                    <Lock className="w-3.5 h-3.5" /> SSL 256-Bit Encryption
                                </div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-slate-300 mb-6">
                                <div className="bg-theatre-900/80 p-2.5 rounded-lg text-center font-medium border border-slate-700/60">UPI / GPay</div>
                                <div className="bg-theatre-900/80 p-2.5 rounded-lg text-center font-medium border border-slate-700/60">Credit/Debit</div>
                                <div className="bg-theatre-900/80 p-2.5 rounded-lg text-center font-medium border border-slate-700/60">NetBanking</div>
                                <div className="bg-theatre-900/80 p-2.5 rounded-lg text-center font-medium border border-slate-700/60">Wallets</div>
                            </div>

                            <button
                                onClick={handleRazorpayPayment}
                                disabled={processing}
                                className="w-full bg-brand-gold hover:bg-yellow-400 text-black font-bold py-4 rounded-xl shadow-glow transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base"
                            >
                                {processing ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                                        Connecting to Razorpay...
                                    </>
                                ) : (
                                    <>
                                        <ShieldCheck className="w-5 h-5" /> Pay ₹{upiAmount} securely
                                    </>
                                )}
                            </button>
                            <p className="text-[11px] text-slate-500 text-center mt-3">
                                You will be directed to Razorpay's safe checkout portal.
                            </p>
                        </div>
                    )}

                    {paymentMethod === "gpay" && (
                        <div className="bg-theatre-800 border border-theatre-700 rounded-2xl p-6 text-center animate-in fade-in zoom-in duration-300">
                            <div className="bg-white p-4 rounded-xl inline-block mb-4">
                                <QRCodeSVG value={upiPaymentString} size={192} />
                            </div>
                            <p className="text-sm text-slate-400 mb-2">Scan this QR code with any UPI app to test mock payment</p>
                            <div className="mt-4 text-brand-gold font-bold text-xl mb-4">₹{upiAmount}</div>

                            <button
                                onClick={handleQrScanned}
                                disabled={processing || qrScanned}
                                className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                            >
                                {qrScanned ? (
                                    <>
                                        <Check className="w-5 h-5" /> Payment Confirmed
                                    </>
                                ) : (
                                    <>
                                        <Smartphone className="w-5 h-5" /> I've Completed Mock Payment
                                    </>
                                )}
                            </button>
                            <p className="text-xs text-slate-500 mt-2">After testing QR scan, tap the button above to simulate transaction</p>
                        </div>
                    )}

                    {paymentMethod === "card" && (
                        <div className="bg-theatre-800 border border-theatre-700 rounded-2xl p-6 space-y-4 animate-in fade-in zoom-in duration-300">
                            <p className="text-xs text-brand-gold">Demo Mode Card Simulation</p>
                            <input type="text" placeholder="Card Number (4242 ...)" defaultValue="4242 4242 4242 4242" className="w-full bg-theatre-900 border border-theatre-600 rounded-lg px-4 py-3 text-white focus:border-brand-purple focus:outline-none text-sm" />
                            <div className="grid grid-cols-2 gap-4">
                                <input type="text" placeholder="MM/YY" defaultValue="12/28" className="w-full bg-theatre-900 border border-theatre-600 rounded-lg px-4 py-3 text-white focus:border-brand-purple focus:outline-none text-sm" />
                                <input type="text" placeholder="CVV" defaultValue="123" className="w-full bg-theatre-900 border border-theatre-600 rounded-lg px-4 py-3 text-white focus:border-brand-purple focus:outline-none text-sm" />
                            </div>
                            <input type="text" placeholder="Cardholder Name" defaultValue="Aditya Kumar" className="w-full bg-theatre-900 border border-theatre-600 rounded-lg px-4 py-3 text-white focus:border-brand-purple focus:outline-none text-sm" />

                            <button
                                onClick={handleSimulatedPayment}
                                disabled={processing}
                                className="w-full bg-brand-gold hover:bg-yellow-400 text-black font-bold py-4 rounded-xl shadow-glow transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 text-base mt-4"
                            >
                                {processing ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                                        Simulating Bank Processing...
                                    </>
                                ) : (
                                    <>
                                        Pay ₹{upiAmount} via Demo Card
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    <p className="text-xs text-center text-slate-500">
                        By proceeding, you agree to TicketRush Terms of Service and Privacy Policy.
                    </p>
                </div>
            </div>
        </div>
    );
}