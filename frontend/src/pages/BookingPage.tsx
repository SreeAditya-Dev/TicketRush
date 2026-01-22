import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getSeats } from "../api";
import { Seat } from "../types";
import { ChevronLeft, Calendar, Clock, Info } from "lucide-react";
import { getEventById } from "../data/events";

export default function BookingPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [seats, setSeats] = useState<Seat[]>([]);
    const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    // Get event data
    const event = id ? getEventById(id) : undefined;

    // Mock Date/Time
    const DATES = ["Fri, 06 Jun", "Sat, 07 Jun", "Sun, 08 Jun"];
    const TIMES = ["01:00 PM", "03:30 PM", "04:30 PM", "07:00 PM"];
    const [selectedDate, setSelectedDate] = useState(DATES[0]);
    const [selectedTime, setSelectedTime] = useState(TIMES[2]);

    const fetchSeats = useCallback(async (isInitial = false) => {
        try {
            const data = await getSeats(id, selectedDate, selectedTime);
            setSeats(data);
        } catch {
            console.error("Failed to load seats");
        } finally {
            if (isInitial) setLoading(false);
        }
    }, [id, selectedDate, selectedTime]);

    useEffect(() => {
        // Initial fetch
        fetchSeats(true);
        
        // Polling (no loading spinner)
        const interval = setInterval(() => fetchSeats(false), 2000);
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

    const getRow = (seat: Seat) => {
        // Try extracting number from code (e.g. "S005" -> 5)
        const match = seat.code.match(/(\d+)/);
        if (match) {
            const num = parseInt(match[1], 10);
            return Math.ceil(num / 10);
        }
        // Fallback to ID
        return Math.ceil(seat.id / 10);
    };

    const calculateTotal = () => {
        return selectedSeats.reduce((total, code) => {
            const seat = seats.find(s => s.code === code);
            if (!seat) return total;
            const row = getRow(seat);
            return total + getPrice(row);
        }, 0);
    };

    const handleProceed = () => {
        if (selectedSeats.length === 0 || !event) return;
        navigate(`/payment/${id}`, {
            state: {
                selectedSeats,
                totalAmount: calculateTotal(),
                date: selectedDate,
                time: selectedTime,
                eventId: id,
                eventTitle: event.title,
                eventArtist: event.artist,
                eventVenue: event.venue,
                eventImage: event.image
            }
        });
    };

    const renderGrid = (title: string, price: number, startRow: number, endRow: number) => {
        const gridSeats = seats.filter(s => {
            const row = getRow(s);
            return row >= startRow && row <= endRow;
        });

        if (loading && seats.length === 0) return (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="w-8 h-8 border-4 border-brand-purple border-t-transparent rounded-full animate-spin"></div>
                <div className="text-slate-500 text-sm">Loading seat map...</div>
            </div>
        );

        return (
            <div className="mb-8 relative">
                <div className="flex items-center gap-3 mb-4 px-4">
                    <span className="text-xs font-bold text-brand-gold bg-brand-gold/10 px-2 py-1 rounded tracking-wider uppercase">
                        {title}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">₹{price}</span>
                    <div className="h-px bg-theatre-700 flex-grow"></div>
                </div>
                
                <div className="grid grid-cols-10 gap-y-3 gap-x-2 max-w-lg mx-auto px-4">
                    {gridSeats.map((seat) => {
                        const isSelected = selectedSeats.includes(seat.code);
                        const isBooked = seat.isBooked;

                        return (
                            <button
                                key={seat.id}
                                disabled={isBooked}
                                onClick={() => toggleSeat(seat.code)}
                                className={`
                                    relative group w-full pt-[80%] rounded-t-lg transition-all duration-300
                                    flex items-center justify-center
                                    ${isBooked 
                                        ? "bg-theatre-700/50 cursor-not-allowed opacity-40" 
                                        : isSelected 
                                            ? "bg-brand-gold shadow-glow scale-105 z-10" 
                                            : "bg-theatre-700 hover:bg-brand-purple/50 hover:shadow-glow-purple border border-theatre-600 hover:border-brand-purple"
                                    }
                                `}
                            >
                                {/* Seat Armrests Effect */}
                                <div className={`absolute bottom-1 left-0.5 right-0.5 h-1 rounded-full ${isSelected ? 'bg-black/20' : 'bg-black/40'}`}></div>
                                
                                <span className={`text-[9px] font-bold ${isSelected ? "text-black" : "text-slate-400 group-hover:text-white"}`}>
                                    {seat.code.replace("S", "").replace(/^0+/, "")}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-theatre-900 pb-32 text-slate-200 font-sans selection:bg-brand-purple selection:text-white">
            {/* Top Bar */}
            <header className="bg-theatre-800/80 backdrop-blur-xl border-b border-theatre-700 px-4 py-3 sticky top-0 z-30 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-theatre-700 rounded-full transition-colors text-slate-300 hover:text-white">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-base font-bold text-white tracking-tight">{event?.title || "Event"}</h1>
                        <p className="text-xs text-brand-gold flex items-center gap-1">
                            {event?.venue || "Venue"}
                        </p>
                    </div>
                </div>
            </header>

            {/* Date & Time Selector */}
            <div className="bg-theatre-800 border-b border-theatre-700 pt-4 pb-2">
                <div className="flex gap-3 overflow-x-auto px-4 pb-4 no-scrollbar">
                    {DATES.map((date) => (
                        <button
                            key={date}
                            onClick={() => setSelectedDate(date)}
                            className={`
                                flex-shrink-0 px-4 py-3 rounded-xl flex flex-col items-center gap-1 transition-all border
                                ${selectedDate === date
                                    ? "bg-brand-purple border-brand-purple text-white shadow-glow-purple"
                                    : "bg-theatre-700 border-theatre-600 text-slate-400 hover:bg-theatre-600 hover:border-theatre-500"
                                }
                            `}
                        >
                            <Calendar className="w-3.5 h-3.5 opacity-70" />
                            <span className="text-xs font-semibold whitespace-nowrap">{date}</span>
                        </button>
                    ))}
                </div>
                <div className="flex gap-2 overflow-x-auto px-4 pb-3 no-scrollbar border-t border-theatre-700/50 pt-3">
                    {TIMES.map((time) => (
                        <button
                            key={time}
                            onClick={() => setSelectedTime(time)}
                            className={`
                                flex-shrink-0 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all flex items-center gap-1.5
                                ${selectedTime === time
                                    ? "bg-brand-gold text-black border-brand-gold font-bold shadow-glow"
                                    : "border-theatre-600 text-slate-400 hover:border-theatre-500 hover:text-slate-200"
                                }
                            `}
                        >
                            <Clock className="w-3 h-3" />
                            {time}
                        </button>
                    ))}
                </div>
            </div>

            <div className="max-w-3xl mx-auto">
                {/* Theatre Screen */}
                <div className="relative pt-10 pb-6 overflow-hidden">
                    <div className="w-3/4 h-8 mx-auto bg-gradient-to-b from-white/10 to-transparent rounded-[50%] blur-xl opacity-30 transform -translate-y-4"></div>
                    <div className="w-2/3 h-1.5 mx-auto bg-slate-500 rounded-full shadow-screen mb-8"></div>
                    <div className="text-center text-[10px] text-slate-500 uppercase tracking-[0.2em] font-medium">Screen This Way</div>
                </div>

                {/* Seat Layout */}
                <div className="px-2">
                    {renderGrid("Recliner", 570, 1, 2)}
                    {renderGrid("Prime", 350, 3, 6)}
                    {renderGrid("Classic", 310, 7, 10)}
                </div>

                {/* Legend */}
                <div className="flex justify-center gap-6 mt-8 py-4 border-t border-theatre-700/50 mx-6">
                    <div className="flex flex-col items-center gap-2">
                        <div className="w-5 h-5 rounded-t-md bg-theatre-700 border border-theatre-600"></div>
                        <span className="text-[10px] text-slate-500">Available</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                        <div className="w-5 h-5 rounded-t-md bg-brand-gold shadow-glow"></div>
                        <span className="text-[10px] text-slate-500">Selected</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                        <div className="w-5 h-5 rounded-t-md bg-theatre-700/50 opacity-50"></div>
                        <span className="text-[10px] text-slate-500">Sold</span>
                    </div>
                </div>
            </div>

                        {/* Sticky Footer */}

                        {selectedSeats.length > 0 && (

                            <div className="fixed bottom-4 left-4 right-4 max-w-3xl mx-auto z-40">

                                <div className="bg-theatre-800/90 backdrop-blur-lg border border-theatre-600 rounded-2xl p-4 shadow-2xl flex items-center justify-between animate-in slide-in-from-bottom-10 fade-in duration-300">

                                    <div>

                                        <div className="text-xs text-slate-400 mb-0.5">Total Amount</div>

                                        <div className="text-xl font-bold text-white flex items-baseline gap-1">

                                            <span className="text-sm text-brand-gold">₹</span>

                                            {calculateTotal()}

                                        </div>

                                        <div className="text-[10px] text-slate-500 font-medium">{selectedSeats.length} Tickets Selected</div>

                                    </div>

                                    <button

                                        onClick={handleProceed}

                                        className="bg-brand-purple hover:bg-violet-500 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-brand-purple/25 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"

                                    >

                                        Proceed <ChevronLeft className="w-4 h-4 rotate-180" />

                                    </button>

                                </div>

                            </div>

                        )}
        </div>
    );
}
