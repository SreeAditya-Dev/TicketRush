import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getSeats } from "../api";
import { Seat } from "../types";
import { ChevronLeft } from "lucide-react";

export default function BookingPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [seats, setSeats] = useState<Seat[]>([]);
    const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    // Mock Date/Time
    const DATES = ["Fri, 06 Jun", "Sat, 07 Jun", "Sun, 08 Jun"];
    const TIMES = ["01:00 PM", "03:30 PM", "04:30 PM", "07:00 PM"];
    const [selectedDate, setSelectedDate] = useState(DATES[0]);
    const [selectedTime, setSelectedTime] = useState(TIMES[2]);

    const fetchSeats = useCallback(async () => {
        if (seats.length === 0) setLoading(true);
        try {
            const data = await getSeats();
            setSeats(data);
        } catch {
            console.error("Failed to load seats");
        } finally {
            setLoading(false);
        }
    }, [seats.length]);

    useEffect(() => {
        fetchSeats();
        const interval = setInterval(fetchSeats, 2000);
        return () => clearInterval(interval);
    }, [fetchSeats]);

    const toggleSeat = (code: string) => {
        setSelectedSeats((prev) =>
            prev.includes(code) ? prev.filter((s) => s !== code) : [...prev, code]
        );
    };

    const getPrice = (row: number) => {
        if (row <= 2) return 570; // Recliner
        if (row <= 6) return 350; // Prime
        return 310; // Classic
    };

    const calculateTotal = () => {
        return selectedSeats.reduce((total, code) => {
            // Find seat to get its row/index (assuming mock logic for row)
            const seat = seats.find(s => s.code === code);
            if (!seat) return total;
            const row = Math.ceil(seat.id / 10);
            return total + getPrice(row);
        }, 0);
    };

    const handleProceed = () => {
        if (selectedSeats.length === 0) return;
        navigate(`/payment/${id}`, {
            state: {
                selectedSeats,
                totalAmount: calculateTotal(),
                date: selectedDate,
                time: selectedTime
            }
        });
    };

    // Group seats by category
    const renderGrid = (startRow: number, endRow: number) => {
        const gridSeats = seats.filter(s => {
            const row = Math.ceil(s.id / 10);
            return row >= startRow && row <= endRow;
        });

        if (loading && seats.length === 0) return <div className="h-32 flex items-center justify-center animate-pulse text-slate-500">Loading...</div>;

        return (
            <div className="grid grid-cols-10 gap-3 max-w-3xl mx-auto my-4">
                {gridSeats.map((seat) => {
                    const isSelected = selectedSeats.includes(seat.code);
                    const isBooked = seat.isBooked;

                    return (
                        <button
                            key={seat.id}
                            disabled={isBooked}
                            onClick={() => toggleSeat(seat.code)}
                            className={`
                h-9 w-9 rounded text-xs font-semibold border flex items-center justify-center transition-all
                ${isBooked
                                    ? "bg-slate-200 border-slate-300 text-slate-400 cursor-not-allowed"
                                    : isSelected
                                        ? "bg-green-500 border-green-600 text-white shadow-md active:scale-95"
                                        : "bg-white border-green-500 text-green-600 hover:bg-green-50"
                                }
              `}
                        >
                            {seat.code.replace("S", "").replace(/^0+/, "")}
                        </button>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-24 text-slate-900 font-sans">
            {/* Top Bar */}
            <header className="bg-white px-4 py-3 shadow-sm sticky top-0 z-20 flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="p-1 hover:bg-slate-100 rounded-full">
                    <ChevronLeft className="w-6 h-6 text-slate-600" />
                </button>
                <div>
                    <h1 className="text-lg font-bold text-slate-800">The Eras Tour</h1>
                    <p className="text-xs text-slate-500">Wembley Stadium</p>
                </div>
                <div className="ml-auto flex items-center gap-1 text-rose-500 font-medium text-sm border border-rose-200 bg-rose-50 px-3 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse" />
                    Selling Fast
                </div>
            </header>

            {/* Date & Time Selector */}
            <div className="bg-white pt-2 pb-4 px-4 border-b border-slate-200">
                <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar mb-4">
                    {DATES.map((date) => (
                        <button
                            key={date}
                            onClick={() => setSelectedDate(date)}
                            className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedDate === date
                                    ? "bg-rose-500 text-white shadow-md"
                                    : "bg-white text-slate-600 border border-slate-200"
                                }`}
                        >
                            {date}
                        </button>
                    ))}
                </div>
                <div className="flex gap-3 overflow-x-auto no-scrollbar">
                    {TIMES.map((time) => (
                        <button
                            key={time}
                            onClick={() => setSelectedTime(time)}
                            className={`flex-shrink-0 px-4 py-2 rounded border text-xs font-semibold whitespace-nowrap ${selectedTime === time
                                    ? "border-green-500 bg-green-50 text-green-700"
                                    : "border-slate-300 text-slate-500"
                                }`}
                        >
                            {time}
                            <div className="text-[10px] font-normal opacity-70 mt-0.5 uppercase tracking-wide">Audio 3D</div>
                        </button>
                    ))}
                </div>
            </div>

            <div className="px-4 py-6 space-y-8">
                {/* Categories */}
                <section>
                    <div className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider pl-2">Rs. 570 RECLINER</div>
                    {renderGrid(1, 2)}
                </section>

                <section>
                    <div className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider pl-2">Rs. 350 PRIME</div>
                    {renderGrid(3, 6)}
                </section>

                <section>
                    <div className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider pl-2">Rs. 310 CLASSIC</div>
                    {renderGrid(7, 10)}
                </section>

                {/* Legend */}
                <div className="flex justify-center gap-6 mt-8 py-4 bg-white/50 rounded-xl">
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                        <div className="w-4 h-4 rounded border border-green-500 bg-white" />
                        Available
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                        <div className="w-4 h-4 rounded bg-green-500 border border-green-600" />
                        Selected
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                        <div className="w-4 h-4 rounded bg-slate-200 border border-slate-300" />
                        Sold
                    </div>
                </div>
            </div>

            {/* Sticky Footer */}
            {selectedSeats.length > 0 && (
                <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-50 animate-in slide-in-from-bottom-full duration-300">
                    <div className="max-w-7xl mx-auto flex items-center justify-between">
                        <div className="text-center">
                            <div className="text-rose-500 font-bold text-xl">₹{calculateTotal()}</div>
                            <div className="text-xs text-slate-500">{selectedSeats.length} Tickets</div>
                        </div>
                        <button
                            onClick={handleProceed}
                            className="bg-rose-500 hover:bg-rose-600 text-white font-bold py-3 px-12 rounded-lg shadow-lg shadow-rose-500/30 transition-all hover:scale-105 active:scale-95"
                        >
                            Pay ₹{calculateTotal()}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
