import { useState, useRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { bookSeat } from "../api";
import { ArrowLeft, CreditCard, Smartphone, Check, Download, Share2, Ticket } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export default function PaymentPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    // State from BookingPage
    const { selectedSeats, totalAmount, date, time } = location.state || {
        selectedSeats: [], totalAmount: 0, date: "N/A", time: "N/A"
    };

    const [paymentMethod, setPaymentMethod] = useState<"card" | "gpay">("gpay");
    const [userId, setUserId] = useState("user-123"); // Mock user
    const [processing, setProcessing] = useState(false);
    const [success, setSuccess] = useState(false);
    const [customQrUrl, setCustomQrUrl] = useState("");

    const ticketRef = useRef<HTMLDivElement>(null);

    const handlePayment = async () => {
        setProcessing(true);
        try {
            // Simulate Payment Delay
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Book each seat
            const promises = selectedSeats.map((code: string) =>
                bookSeat(code, userId, "locked", date, time)
            );

            await Promise.all(promises);
            setSuccess(true);
        } catch (error) {
            alert("Payment failed or seats taken!");
            console.error(error);
        } finally {
            setProcessing(false);
        }
    };

    const downloadTicket = async () => {
        if (!ticketRef.current) return;

        try {
            const canvas = await html2canvas(ticketRef.current, {
                backgroundColor: "#0b0c15",
                scale: 2,
                useCORS: true,       // Added for external images
                allowTaint: true,    // Added permissions
            });
            const imgData = canvas.toDataURL("image/png");

            const pdf = new jsPDF({
                orientation: "portrait",
                unit: "px",
                format: [canvas.width / 2, canvas.height / 2]
            });

            pdf.addImage(imgData, "PNG", 0, 0, canvas.width / 2, canvas.height / 2);
            pdf.save("TicketRush-Pass.pdf");
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
                    <p className="text-slate-400">Your seats have been secured.</p>
                </div>

                {/* TICKET UI */}
                <div ref={ticketRef} className="bg-theatre-800 border border-theatre-700 rounded-3xl overflow-hidden max-w-sm w-full shadow-2xl relative mb-8">
                    {/* Top Section */}
                    <div className="relative h-48">
                        <img
                            src="https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?q=80&w=1000&auto=format&fit=crop"
                            className="w-full h-full object-cover"
                            alt="Concert"
                            crossOrigin="anonymous" // Added CORS header
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-theatre-900 to-transparent" />
                        <div className="absolute bottom-4 left-6">
                            <h2 className="text-2xl font-bold text-white">The Eras Tour</h2>
                            <p className="text-brand-gold font-medium">Taylor Swift</p>
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
                        <div className="grid grid-cols-2 gap-4 mb-6">
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
                                <div className="font-semibold text-slate-200">Wembley Stadium</div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Seats</div>
                                <div className="font-semibold text-brand-gold">{selectedSeats.map(s => s.replace('S', '')).join(', ')}</div>
                            </div>
                        </div>

                        <div className="flex justify-center mb-6">
                            <div className="bg-white p-2 rounded-lg">
                                <QRCodeSVG value={`TICKET-${id}-${selectedSeats.join('-')}`} size={100} />
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
                        className="bg-brand-purple hover:bg-violet-600 text-white font-bold py-3 px-6 rounded-xl flex items-center gap-2 transition-colors"
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
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors">
                <ArrowLeft className="w-5 h-5" /> Back to Booking
            </button>

            <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Order Summary */}
                <div className="space-y-6">
                    <h1 className="text-3xl font-bold text-white mb-2">Order Summary</h1>

                    <div className="bg-theatre-800 border border-theatre-700 rounded-2xl p-6 shadow-xl">
                        <div className="flex gap-4 mb-6 pb-6 border-b border-theatre-700">
                            <img
                                src="https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?q=80&w=200&auto=format&fit=crop"
                                className="w-24 h-24 rounded-lg object-cover"
                                alt="Show"
                            />
                            <div>
                                <h3 className="font-bold text-xl text-white">The Eras Tour</h3>
                                <div className="text-brand-gold text-sm mb-1">Taylor Swift</div>
                                <div className="text-slate-400 text-sm flex items-center gap-2">
                                    {date} • {time}
                                </div>
                                <div className="text-slate-400 text-sm">Wembley Stadium</div>
                            </div>
                        </div>

                        <div className="space-y-3 mb-6">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400">Tickets ({selectedSeats.length})</span>
                                <span className="text-white font-medium">{selectedSeats.join(', ')}</span>
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
                            <span className="font-bold text-2xl text-brand-gold">₹{totalAmount + 45}</span>
                        </div>
                    </div>
                </div>

                {/* Payment Method */}
                <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-white mb-4">Payment Method</h2>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <button
                            onClick={() => setPaymentMethod("gpay")}
                            className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${paymentMethod === "gpay"
                                    ? "bg-brand-purple/20 border-brand-purple text-white shadow-glow-purple"
                                    : "bg-theatre-800 border-theatre-700 text-slate-400 hover:bg-theatre-700"
                                }`}
                        >
                            <Smartphone className="w-6 h-6" />
                            <span className="font-medium">Google Pay</span>
                        </button>
                        <button
                            onClick={() => setPaymentMethod("card")}
                            className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${paymentMethod === "card"
                                    ? "bg-brand-purple/20 border-brand-purple text-white shadow-glow-purple"
                                    : "bg-theatre-800 border-theatre-700 text-slate-400 hover:bg-theatre-700"
                                }`}
                        >
                            <CreditCard className="w-6 h-6" />
                            <span className="font-medium">Card</span>
                        </button>
                    </div>

                    {paymentMethod === "gpay" && (
                        <div className="bg-theatre-800 border border-theatre-700 rounded-2xl p-6 text-center animate-in fade-in zoom-in duration-300">
                            <div className="mb-4">
                                <label className="block text-sm text-slate-400 mb-2 text-left">Your UPI QR Code URL (Optional)</label>
                                <input
                                    type="text"
                                    placeholder="Paste image URL of your QR..."
                                    value={customQrUrl}
                                    onChange={(e) => setCustomQrUrl(e.target.value)}
                                    className="w-full bg-theatre-900 border border-theatre-600 rounded-lg px-4 py-2 text-white text-sm focus:border-brand-purple focus:outline-none mb-4"
                                />
                            </div>

                            <div className="bg-white p-4 rounded-xl inline-block mb-4">
                                <img
                                    src={customQrUrl || "https://upload.wikimedia.org/wikipedia/commons/d/d0/QR_code_for_mobile_English_Wikipedia.svg"}
                                    alt="Payment QR"
                                    className="w-48 h-48 object-contain"
                                />
                            </div>
                            <p className="text-sm text-slate-400">Scan this code with your GPay app to pay</p>
                            <div className="mt-4 text-brand-gold font-bold text-xl">₹{totalAmount + 45}</div>
                        </div>
                    )}

                    {paymentMethod === "card" && (
                        <div className="bg-theatre-800 border border-theatre-700 rounded-2xl p-6 space-y-4 animate-in fade-in zoom-in duration-300">
                            <input type="text" placeholder="Card Number" className="w-full bg-theatre-900 border border-theatre-600 rounded-lg px-4 py-3 text-white focus:border-brand-purple focus:outline-none" />
                            <div className="grid grid-cols-2 gap-4">
                                <input type="text" placeholder="MM/YY" className="w-full bg-theatre-900 border border-theatre-600 rounded-lg px-4 py-3 text-white focus:border-brand-purple focus:outline-none" />
                                <input type="text" placeholder="CVV" className="w-full bg-theatre-900 border border-theatre-600 rounded-lg px-4 py-3 text-white focus:border-brand-purple focus:outline-none" />
                            </div>
                            <input type="text" placeholder="Cardholder Name" className="w-full bg-theatre-900 border border-theatre-600 rounded-lg px-4 py-3 text-white focus:border-brand-purple focus:outline-none" />
                        </div>
                    )}

                    <button
                        onClick={handlePayment}
                        disabled={processing}
                        className="w-full bg-brand-gold hover:bg-yellow-400 text-black font-bold py-4 rounded-xl shadow-glow transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {processing ? (
                            <>
                                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                                Processing...
                            </>
                        ) : (
                            <>
                                Pay ₹{totalAmount + 45}
                            </>
                        )}
                    </button>

                    <p className="text-xs text-center text-slate-500">
                        By proceeding, you agree to our Terms of Service.
                    </p>
                </div>
            </div>
        </div>
    );
}