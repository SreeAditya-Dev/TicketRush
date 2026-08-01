import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { createRazorpayOrder, verifyAndConfirmBooking, releaseHolds, fetchEventById } from "../api";
import { ArrowLeft, Check, Download, ShieldCheck, Mail, Lock, Timer } from "lucide-react";
import { useToast } from "../components/Toast";
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
    const { toast } = useToast();

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

    const [email, setEmail] = useState("");
    const [processing, setProcessing] = useState(false);
    const [success, setSuccess] = useState(false);
    const [paymentRefId, setPaymentRefId] = useState<string>("SIMULATED-REF");
    const [emailSent, setEmailSent] = useState(false);
    const [timeLeft, setTimeLeft] = useState<number>(expiresIn);

    const ticketRef = useRef<HTMLDivElement>(null);

    // Total calculated with fee
    const upiAmount = totalAmount + 45;

    // Auto-load razorpay script on mount
    useEffect(() => {
        loadRazorpayScript();
    }, []);

    // Live 5-minute checkout countdown timer
    useEffect(() => {
        if (success) return;
        if (timeLeft <= 0) {
            toast("Your 5-minute checkout reservation has expired and your seats have been released back to public sale.", {
                type: "warning",
                title: "Reservation Expired",
                duration: 6000,
            });
            releaseHolds(selectedSeats, eventId, date, time, userId);
            navigate(-1);
            return;
        }
        const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
        return () => clearInterval(timer);
    }, [timeLeft, success, selectedSeats, eventId, date, time, userId, navigate, toast]);

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
            toast("Please provide a valid email address to receive your ticket confirmation receipt.", {
                type: "warning",
                title: "Email Required",
            });
            return;
        }

        setProcessing(true);
        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded) {
            toast("Failed to load Razorpay Gateway. Please check your internet connection.", { type: "error" });
            setProcessing(false);
            return;
        }

        try {
            // 1. Create Order on Backend with metadata for webhook resilience
            const orderRes = await createRazorpayOrder(upiAmount, eventId || id || "", selectedSeats, {
                userId,
                email: email.trim(),
                date,
                time,
                eventTitle: eventTitle || "Event",
                eventArtist: eventArtist || "Live Performance",
                eventVenue: eventVenue || "Venue",
                strategy: "locked",
            });
            if (!orderRes.ok) {
                const errorMsg = "message" in orderRes ? orderRes.message : "Unknown gateway error";
                toast(errorMsg, { type: "error", title: "Payment Gateway Initialization Failed" });
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
                image: window.location.origin + "/logo.png",
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
                        toast(errorMsg, { type: "error", title: "Booking Failed" });
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
                    color: "#2563eb",
                },
                modal: {
                    ondismiss: () => {
                        setProcessing(false);
                    },
                },
            };

            const rzp = new (window as any).Razorpay(options);
            rzp.on("payment.failed", (response: any) => {
                toast(response.error.description || "Transaction declined", { type: "error", title: "Payment Failed" });
                setProcessing(false);
            });
            rzp.open();
        } catch (error) {
            console.error("Payment checkout error:", error);
            toast("An error occurred starting checkout.", { type: "error" });
            setProcessing(false);
        }
    };

    const downloadTicket = async () => {
        if (!ticketRef.current) return;

        try {
            const canvas = await html2canvas(ticketRef.current, {
                backgroundColor: "#ffffff",
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
            <div className="min-h-screen bg-[#f4f6f9] text-slate-900 flex flex-col items-center justify-center p-4">
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/20">
                        <Check className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-3xl font-black mb-2">You're Going!</h1>
                    <p className="text-slate-600">{isGA ? "Your tickets have been securely reserved." : "Your seats have been securely reserved."}</p>
                    
                    {emailSent ? (
                        <div className="inline-flex items-center gap-2 mt-3 px-4 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
                            <Mail className="w-3.5 h-3.5" /> Confirmation email & ticket receipt sent to {email}!
                        </div>
                    ) : (
                        email && (
                            <div className="inline-flex items-center gap-2 mt-3 px-4 py-1.5 rounded-full bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">
                                ℹ️ Booking confirmed (Email delivery pending)
                            </div>
                        )
                    )}
                </div>

                {/* TICKET UI */}
                <div ref={ticketRef} className="bg-white border border-slate-200 rounded-3xl overflow-hidden max-w-sm w-full shadow-xl relative mb-8 text-slate-800">
                    {/* Top Section */}
                    <div className="relative h-48">
                        <img
                            src={eventImage}
                            className="w-full h-full object-cover"
                            alt="Concert"
                            crossOrigin="anonymous"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                        <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-200 flex items-center gap-2 shadow-sm z-20">
                            <img src="/logo.png" alt="TicketRush Logo" className="w-5 h-5 rounded-md object-contain" crossOrigin="anonymous" />
                            <span className="text-xs font-black tracking-wide text-slate-900">TicketRush</span>
                        </div>
                        <div className="absolute bottom-4 left-6 z-20">
                            <h2 className="text-2xl font-black text-white">{eventTitle}</h2>
                            <p className="text-blue-300 font-bold">{eventArtist}</p>
                        </div>
                    </div>

                    {/* Perforation */}
                    <div className="relative flex items-center justify-between px-2 -mt-3 z-10">
                        <div className="w-6 h-6 bg-[#f4f6f9] border-r border-slate-200 rounded-full -ml-4" />
                        <div className="flex-1 border-t-2 border-dashed border-slate-300 mx-2" />
                        <div className="w-6 h-6 bg-[#f4f6f9] border-l border-slate-200 rounded-full -mr-4" />
                    </div>

                    {/* Details */}
                    <div className="p-6 pt-3">
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <div className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Date</div>
                                <div className="font-bold text-slate-900">{date}</div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Time</div>
                                <div className="font-bold text-slate-900">{time}</div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Venue</div>
                                <div className="font-bold text-slate-900">{eventVenue}</div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">{isGA ? "Admission Type" : "Seats"}</div>
                                <div className="font-black text-blue-600">{getTicketSummary()}</div>
                            </div>
                        </div>

                        <div className="mb-6 pt-3 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-xs text-slate-500 font-semibold">Payment Ref ID:</span>
                            <span className="font-mono text-xs font-bold text-slate-900">{paymentRefId}</span>
                        </div>

                        <div className="flex justify-center mb-6">
                            <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl shadow-2xs">
                                <QRCodeSVG value={`TICKET-${eventId || id}-${selectedSeats.join('-')}-${paymentRefId}`} size={110} />
                            </div>
                        </div>

                        <div className="text-center text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                            Scan at Entry • Gate 4A
                        </div>
                    </div>
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={downloadTicket}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl flex items-center gap-2 transition-all shadow-md shadow-blue-600/20 active:scale-95"
                    >
                        <Download className="w-5 h-5" /> Download PDF
                    </button>
                    <button
                        onClick={() => navigate('/')}
                        className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-3 px-6 rounded-xl transition-all active:scale-95"
                    >
                        Back Home
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f4f6f9] text-slate-700 p-4 md:p-8">
            <button onClick={handleBack} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 transition-colors font-bold text-sm">
                <ArrowLeft className="w-4 h-4" /> Back to {isGA ? "Ticket Selection" : "Seat Selection"} (Release Hold)
            </button>

            <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Order Summary */}
                <div className="space-y-6">
                    <div className={`p-4 rounded-2xl border flex items-center justify-between transition-all duration-300 ${
                        timeLeft < 60 
                            ? "bg-red-50 border-red-200 text-red-900 animate-pulse shadow-xs" 
                            : "bg-amber-50 border-amber-200 text-amber-900 shadow-2xs"
                    }`}>
                        <div className="flex items-center gap-3">
                            <Timer className={`w-6 h-6 flex-shrink-0 ${timeLeft < 60 ? "text-red-600 animate-bounce" : "text-amber-600"}`} />
                            <div>
                                <h4 className="font-bold text-sm text-slate-900">{isGA ? "Tickets Reserved for Checkout" : "Seats Reserved for Checkout"}</h4>
                                <p className="text-xs text-slate-600">Please finish payment before temporary lock expires.</p>
                            </div>
                        </div>
                        <div className="font-mono text-lg font-black px-3 py-1 bg-white rounded-xl border border-slate-200 text-slate-900 shadow-2xs">
                            {formatTime(timeLeft)}
                        </div>
                    </div>

                    <h1 className="text-3xl font-black text-slate-900 mb-2">Order Summary</h1>

                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                        <div className="flex gap-4 mb-6 pb-6 border-b border-slate-100">
                            <img
                                src={eventImage}
                                className="w-24 h-24 rounded-2xl object-cover shadow-2xs"
                                alt="Show"
                                crossOrigin="anonymous"
                            />
                            <div>
                                <h3 className="font-black text-xl text-slate-900">{eventTitle}</h3>
                                <div className="text-blue-600 font-bold text-sm mb-1">{eventArtist}</div>
                                <div className="text-slate-500 text-xs font-semibold flex items-center gap-2 mb-1">
                                    {date} • {time}
                                </div>
                                <div className="text-slate-500 text-xs font-semibold">{eventVenue}</div>
                            </div>
                        </div>

                        <div className="space-y-3 mb-6">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500 font-semibold">Tickets ({selectedSeats.length})</span>
                                <span className="text-slate-900 font-bold">{getTicketSummary()}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500 font-semibold">Subtotal</span>
                                <span className="text-slate-900 font-bold">₹{totalAmount}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500 font-semibold">Convenience Fee</span>
                                <span className="text-slate-900 font-bold">₹45</span>
                            </div>
                        </div>

                        <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                            <span className="font-extrabold text-slate-900">Total Amount</span>
                            <span className="font-black text-2xl text-blue-600">₹{upiAmount}</span>
                        </div>
                    </div>

                    <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
                        <ShieldCheck className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <h4 className="font-bold text-slate-900 text-sm">100% Guaranteed & Secure Booking</h4>
                            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                                Your {isGA ? "tickets" : "seats"} are exclusively held for you during this countdown. If any conflict occurs post-payment, you receive an automated, instant full refund.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Checkout & Payment Action */}
                <div className="space-y-6">
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6 animate-in fade-in duration-300">
                        <div>
                            <h2 className="text-xl font-black text-slate-900 mb-1">Contact & Delivery</h2>
                            <p className="text-xs text-slate-500 mb-4">We'll email your digital tickets immediately after payment confirmation.</p>
                            <div className="relative">
                                <Mail className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                                <input 
                                    type="email" 
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Enter your email address (e.g., aditya@example.com)" 
                                    className="w-full bg-slate-50 border border-slate-300 rounded-2xl pl-12 pr-4 py-3 text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none text-sm transition-all shadow-2xs" 
                                />
                            </div>
                        </div>

                        <div className="border-t border-slate-100 pt-6">
                            <button
                                onClick={handleRazorpayPayment}
                                disabled={processing}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl shadow-md shadow-blue-600/20 transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 text-base"
                            >
                                {processing ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Connecting to Gateway...
                                    </>
                                ) : (
                                    <>
                                        <Lock className="w-5 h-5" /> Pay ₹{upiAmount} Now
                                    </>
                                )}
                            </button>

                            <div className="flex items-center justify-center gap-1.5 mt-4 text-xs font-semibold text-slate-500">
                                <ShieldCheck className="w-4 h-4 text-blue-600" /> Powered by Razorpay
                            </div>
                        </div>
                    </div>

                    <p className="text-xs text-center text-slate-400 font-medium">
                        By proceeding, you agree to TicketRush Terms of Service and Privacy Policy.
                    </p>
                </div>
            </div>
        </div>
    );
}