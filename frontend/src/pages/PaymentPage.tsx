import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import { bookSeat } from "../api";
import { CheckCircle2, ChevronLeft, CreditCard, ScanLine, Smartphone } from "lucide-react";

export default function PaymentPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const { selectedSeats, totalAmount, date, time } = location.state || { selectedSeats: [], totalAmount: 0 };

    const [activeTab, setActiveTab] = useState<"upi" | "card">("upi");
    const [processing, setProcessing] = useState(false);
    const [success, setSuccess] = useState(false);

    const handlePayment = async () => {
        setProcessing(true);

        // Simulate payment delay
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Execute actual booking (using "locked" strategy for safety)
        const userId = `user-${Math.random().toString(36).slice(2, 9)}`;

        // Parallel booking requests
        const results = await Promise.all(
            selectedSeats.map((code: string) => bookSeat(code, userId, "locked"))
        );

        setProcessing(false);
        setSuccess(true);

        // Redirect after showing success
        setTimeout(() => {
            navigate("/");
        }, 3000);
    };

    if (success) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="w-10 h-10 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Booking Confirmed!</h2>
                    <p className="text-slate-500 mb-8">
                        Your {selectedSeats.length} tickets have been sent to your email.
                    </p>
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm py-2 border-b border-slate-100">
                            <span className="text-slate-500">Amount Paid</span>
                            <span className="font-bold text-slate-800">₹{totalAmount}</span>
                        </div>
                        <div className="flex justify-between text-sm py-2 border-b border-slate-100">
                            <span className="text-slate-500">Transaction ID</span>
                            <span className="font-mono text-slate-800">TXN{Math.random().toString().slice(2, 10)}</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
            <header className="bg-white px-4 py-3 shadow-sm flex items-center gap-4 sticky top-0 z-10">
                <button onClick={() => navigate(-1)} className="p-1 hover:bg-slate-100 rounded-full">
                    <ChevronLeft className="w-6 h-6 text-slate-600" />
                </button>
                <h1 className="text-lg font-bold text-slate-800">Payment</h1>
            </header>

            <main className="max-w-4xl mx-auto p-4 flex flex-col md:flex-row gap-6 mt-4">
                {/* Order Summary */}
                <div className="md:w-1/3 order-1 md:order-2">
                    <div className="bg-white rounded-xl shadow-sm p-6 sticky top-20">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Order Summary</h3>
                        <div className="flex gap-4 mb-6">
                            <img
                                src="https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?q=80&w=200&auto=format&fit=crop"
                                className="w-16 h-20 object-cover rounded-lg shadow-sm"
                            />
                            <div>
                                <h4 className="font-bold text-slate-800">The Eras Tour</h4>
                                <p className="text-xs text-slate-500 mt-1">{date} | {time}</p>
                                <p className="text-xs text-slate-500">Wembley Stadium</p>
                            </div>
                        </div>

                        <div className="space-y-3 mb-6">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-600">{selectedSeats.length} Tickets</span>
                                <span className="font-medium">
                                    {selectedSeats.join(", ")}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-600">Subtotal</span>
                                <span className="font-medium">₹{totalAmount}</span>
                            </div>
                            <div className="flex justify-between text-sm text-green-600">
                                <span>Convenience Fee</span>
                                <span>FREE</span>
                            </div>
                        </div>

                        <div className="border-t border-slate-100 pt-4 flex justify-between items-center">
                            <span className="font-bold text-slate-800">Total Amount</span>
                            <span className="font-bold text-xl text-slate-800">₹{totalAmount}</span>
                        </div>
                    </div>
                </div>

                {/* Payment Methods */}
                <div className="md:w-2/3 order-2 md:order-1 space-y-4">
                    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                        <div className="flex border-b border-slate-100">
                            <button
                                onClick={() => setActiveTab("upi")}
                                className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 ${activeTab === 'upi' ? 'text-rose-500 border-b-2 border-rose-500 bg-rose-50' : 'text-slate-500 hover:bg-slate-50'}`}
                            >
                                <Smartphone className="w-4 h-4" /> UPI / QR
                            </button>
                            <button
                                onClick={() => setActiveTab("card")}
                                className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 ${activeTab === 'card' ? 'text-rose-500 border-b-2 border-rose-500 bg-rose-50' : 'text-slate-500 hover:bg-slate-50'}`}
                            >
                                <CreditCard className="w-4 h-4" /> Card
                            </button>
                        </div>

                        <div className="p-8 min-h-[400px] flex flex-col items-center justify-center">
                            {activeTab === 'upi' ? (
                                <div className="text-center w-full max-w-sm">
                                    <div className="bg-white p-4 rounded-xl border-2 border-slate-100 inline-block mb-6 shadow-sm">
                                        <QRCodeCanvas value={`upi://pay?pa=ticketrush@bank&pn=TicketRush&am=${totalAmount}`} size={200} />
                                    </div>
                                    <p className="text-slate-600 mb-6 text-sm">Scan with any UPI app to pay</p>

                                    <div className="flex items-center gap-4 my-6">
                                        <div className="h-px bg-slate-200 flex-1" />
                                        <span className="text-xs text-slate-400">OR</span>
                                        <div className="h-px bg-slate-200 flex-1" />
                                    </div>

                                    <button
                                        onClick={handlePayment}
                                        disabled={processing}
                                        className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-rose-500/20 transition-all flex items-center justify-center gap-2"
                                    >
                                        {processing ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                Verifying...
                                            </>
                                        ) : (
                                            <>
                                                <ScanLine className="w-4 h-4" /> Simulate Scan & Pay
                                            </>
                                        )}
                                    </button>
                                </div>
                            ) : (
                                <div className="w-full max-w-sm space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Card Number</label>
                                        <input type="text" placeholder="0000 0000 0000 0000" className="w-full p-3 border border-slate-200 rounded-lg focus:outline-none focus:border-rose-500 transition-colors" />
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="space-y-1 flex-1">
                                            <label className="text-xs font-bold text-slate-500 uppercase">Valid Thru</label>
                                            <input type="text" placeholder="MM/YY" className="w-full p-3 border border-slate-200 rounded-lg focus:outline-none focus:border-rose-500 transition-colors" />
                                        </div>
                                        <div className="space-y-1 flex-1">
                                            <label className="text-xs font-bold text-slate-500 uppercase">CVV</label>
                                            <input type="password" placeholder="123" className="w-full p-3 border border-slate-200 rounded-lg focus:outline-none focus:border-rose-500 transition-colors" />
                                        </div>
                                    </div>

                                    <button
                                        onClick={handlePayment}
                                        disabled={processing}
                                        className="w-full mt-6 bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                                    >
                                        {processing ? "Processing..." : `Pay ₹${totalAmount}`}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
