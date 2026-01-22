import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { getSeats, bookSeat, BookSeatResult } from "../api";
import { Seat, BookingStrategy } from "../types";
import { Lock, AlertTriangle, Armchair } from "lucide-react";

export default function BookingPage() {
    const { id } = useParams(); // In a real app, use this to fetch specific show data
    const [seats, setSeats] = useState<Seat[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState<string | null>(null);
    const [strategy, setStrategy] = useState<BookingStrategy>("locked");
    const [toasts, setToasts] = useState<{ id: number; msg: string; ok: boolean }[]>([]);
    const [userId] = useState(() => `user-${Math.random().toString(36).slice(2, 9)}`);

    const showToast = (msg: string, ok: boolean) => {
        const id = Date.now();
        setToasts((prev) => [...prev, { id, msg, ok }]);
        setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
    };

    const fetchSeats = useCallback(async () => {
        // Only show loading on initial load
        if (seats.length === 0) setLoading(true);
        try {
            const data = await getSeats();
            setSeats(data);
        } catch {
            showToast("Failed to load seats", false);
        } finally {
            setLoading(false);
        }
    }, [seats.length]);

    useEffect(() => {
        fetchSeats();
        const interval = setInterval(fetchSeats, 2000); // Polling every 2s for live feel
        return () => clearInterval(interval);
    }, [fetchSeats]);

    const handleBook = async (code: string) => {
        setProcessing(code);
        const result: BookSeatResult = await bookSeat(code, userId, strategy);
        showToast(result.message, result.ok);
        await fetchSeats();
        setProcessing(null);
    };

    const bookedCount = seats.filter((s) => s.isBooked).length;
    const availableCount = seats.length - bookedCount;

    return (
        <div className="w-full max-w-7xl mx-auto px-4 py-8">
            {/* Event Header */}
            <div className="mb-8 p-6 bg-slate-800/50 rounded-2xl border border-slate-700/50 backdrop-blur-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">The Eras Tour</h1>
                        <p className="text-slate-400 flex items-center gap-2">
                            <Armchair className="w-4 h-4" />
                            Wembley Stadium • March 15, 2024
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 items-center bg-slate-900/50 p-3 rounded-xl border border-slate-700">
                        <div className="flex items-center gap-2 text-sm px-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-emerald-400 font-medium">{availableCount} Available</span>
                        </div>
                        <div className="h-4 w-px bg-slate-700 hidden sm:block" />
                        <div className="flex items-center gap-2 text-sm px-2">
                            <span className="w-2 h-2 rounded-full bg-rose-500" />
                            <span className="text-rose-400 font-medium">{bookedCount} Sold</span>
                        </div>

                        <div className="h-8 w-px bg-slate-700 hidden sm:block mx-2" />

                        <div className="flex items-center gap-2">
                            <label htmlFor="strategy" className="text-sm font-medium text-slate-300 hidden sm:block">Mode:</label>
                            <div className="relative">
                                <select
                                    id="strategy"
                                    className="appearance-none bg-indigo-600/20 border border-indigo-500/30 hover:border-indigo-500 text-indigo-300 text-sm rounded-lg px-4 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors cursor-pointer"
                                    value={strategy}
                                    onChange={(e) => setStrategy(e.target.value as BookingStrategy)}
                                >
                                    <option value="locked">Locked (Safe)</option>
                                    <option value="naive">Naive (Unsafe)</option>
                                </select>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                    {strategy === 'locked' ? (
                                        <Lock className="w-3 h-3 text-indigo-400" />
                                    ) : (
                                        <AlertTriangle className="w-3 h-3 text-amber-500" />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* STAGE */}
            <div className="relative mb-12 flex justify-center">
                <div className="w-3/4 max-w-lg h-16 bg-gradient-to-b from-indigo-600/20 to-transparent rounded-[50%] blur-xl absolute -top-4" />
                <div className="w-2/3 max-w-md bg-slate-800 text-slate-400 text-xs font-bold tracking-[0.3em] uppercase py-3 px-12 rounded-b-3xl text-center border-b border-x border-slate-700 shadow-xl z-10">
                    Stage & Screens
                </div>
            </div>

            {/* SEAT GRID */}
            {loading && seats.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4">
                    <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-slate-400 animate-pulse">Loading seating chart...</p>
                </div>
            ) : (
                <div className="max-w-4xl mx-auto">
                    <div className="grid grid-cols-10 gap-2 sm:gap-3 p-4 sm:p-8 bg-slate-800/20 rounded-3xl border border-slate-800 shadow-inner">
                        {seats.map((seat) => {
                            const isBooked = seat.isBooked;
                            const isProcessing = processing === seat.code;

                            return (
                                <button
                                    key={seat.id}
                                    disabled={isBooked || isProcessing}
                                    onClick={() => handleBook(seat.code)}
                                    className={`
                    group relative aspect-square rounded-lg sm:rounded-xl flex items-center justify-center
                    transition-all duration-200 ease-out
                    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-indigo-500
                    ${isBooked
                                            ? "bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700"
                                            : "bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 hover:shadow-lg hover:shadow-emerald-500/20 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 text-white border border-emerald-400/20"
                                        }
                    ${isProcessing ? "animate-pulse from-indigo-500 to-indigo-600" : ""}
                  `}
                                >
                                    <span className={`text-[10px] sm:text-xs font-bold tracking-tight ${isBooked ? "opacity-30" : "opacity-90"}`}>
                                        {seat.code.replace("S", "")}
                                    </span>

                                    {isProcessing && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-indigo-600 rounded-lg">
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        </div>
                                    )}

                                    {/* Hover Tooltip */}
                                    <div className="opacity-0 group-hover:opacity-100 absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs py-1 px-2 rounded border border-slate-700 whitespace-nowrap pointer-events-none transition-opacity z-20">
                                        {isBooked ? "Sold Out" : `Row ${Math.ceil(seat.id / 10)} • Seat ${seat.code}`}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            <p className="text-xs text-center mt-12 text-slate-500">
                Session ID: <span className="font-mono text-slate-400">{userId}</span>
            </p>

            {/* Toast Container */}
            <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-50 pointer-events-none">
                {toasts.map((t) => (
                    <div
                        key={t.id}
                        className={`
              pointer-events-auto px-5 py-3 rounded-xl shadow-2xl border backdrop-blur-md flex items-center gap-3 animate-in slide-in-from-bottom-5 fade-in duration-300
              ${t.ok
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-200"
                                : "bg-rose-500/10 border-rose-500/20 text-rose-200"
                            }
            `}
                    >
                        <div className={`w-2 h-2 rounded-full ${t.ok ? "bg-emerald-400" : "bg-rose-400"}`} />
                        {t.msg}
                    </div>
                ))}
            </div>
        </div>
    );
}
