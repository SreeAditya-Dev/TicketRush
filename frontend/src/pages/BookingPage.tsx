import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getSeats, holdSeats } from "../api";
import { Seat } from "../types";
import { ChevronLeft, Calendar, Clock, Info, Plus, Minus, Ticket, Users, ShieldCheck } from "lucide-react";
import { getEventById } from "../data/events";

const getSessionUserId = () => {
    let uid = sessionStorage.getItem("ticketrush_user_id");
    if (!uid) {
        uid = "user_" + Math.random().toString(36).substring(2, 10);
        sessionStorage.setItem("ticketrush_user_id", uid);
    }
    return uid;
};

export default function BookingPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [seats, setSeats] = useState<Seat[]>([]);
    const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [userId] = useState<string>(getSessionUserId);
    const [holding, setHolding] = useState(false);

    // Get event data
    const event = id ? getEventById(id) : undefined;
    const isGA = event?.eventType === "general-admission";

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

    const handleProceed = async () => {
        if (selectedSeats.length === 0 || !event || holding) return;
        setHolding(true);
        const res = await holdSeats(selectedSeats, id || "", selectedDate, selectedTime, userId);
        setHolding(false);

        if (!res.ok) {
            alert(`⚠️ Cannot proceed to checkout: ${res.message}`);
            fetchSeats(false);
            return;
        }

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
                eventImage: event.image,
                userId,
                expiresIn: res.expiresIn || 300,
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
                        const isHeldByOther = Boolean(seat.isHeld) && seat.heldBy !== userId;

                        return (
                            <button
                                key={seat.id}
                                disabled={isBooked || isHeldByOther}
                                title={isHeldByOther ? "Reserved: checkout in progress by another customer" : isBooked ? "Sold out" : `Seat ${seat.code}`}
                                onClick={() => toggleSeat(seat.code)}
                                className={`
                                    relative group w-full pt-[80%] rounded-t-lg transition-all duration-300
                                    flex items-center justify-center
                                    ${isBooked 
                                        ? "bg-theatre-700/50 cursor-not-allowed opacity-40" 
                                        : isHeldByOther
                                            ? "bg-amber-600/70 border border-amber-500 cursor-not-allowed animate-pulse"
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

    const gaTiers = [
        {
            id: "vip",
            name: "VIP Fan Pit & Standing",
            price: 570,
            startRow: 1,
            endRow: 2,
            tag: "BEST EXPERIENCE",
            badgeColor: "bg-brand-gold/20 text-brand-gold border-brand-gold/40",
            description: "Exclusive frontline crowd access closest to the main stage, dedicated VIP entrance gate & private bar lounge access."
        },
        {
            id: "fast-track",
            name: "Fast-Track Arena Standing",
            price: 350,
            startRow: 3,
            endRow: 6,
            tag: "PRIORITY ENTRY",
            badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/40",
            description: "Priority stadium floor entry 1.5 hours before regular ticket holders, prime arena standing views."
        },
        {
            id: "general",
            name: "General Admission Floor",
            price: 310,
            startRow: 7,
            endRow: 10,
            tag: "STANDARD ENTRY",
            badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
            description: "Standard stadium ground floor access. Experience the unmatched high-energy atmosphere with the festival crowd."
        }
    ];

    const addGATicket = (startRow: number, endRow: number) => {
        let added = false;
        setSelectedSeats(prev => {
            const availableSeat = seats.find(s => {
                const r = getRow(s);
                const isHeldByOther = Boolean(s.isHeld) && s.heldBy !== userId;
                return r >= startRow && r <= endRow && !s.isBooked && !isHeldByOther && !prev.includes(s.code);
            });
            if (availableSeat) {
                added = true;
                return [...prev, availableSeat.code];
            }
            return prev;
        });
        if (!added && seats.length > 0) {
            const anyAvailable = seats.some(s => {
                const r = getRow(s);
                const isHeldByOther = Boolean(s.isHeld) && s.heldBy !== userId;
                return r >= startRow && r <= endRow && !s.isBooked && !isHeldByOther && !selectedSeats.includes(s.code);
            });
            if (!anyAvailable) {
                alert("No more tickets available in this category for the selected time!");
            }
        }
    };

    const removeGATicket = (startRow: number, endRow: number) => {
        setSelectedSeats(prev => {
            const selectedInTier = prev.filter(code => {
                const seat = seats.find(s => s.code === code);
                if (!seat) return false;
                const r = getRow(seat);
                return r >= startRow && r <= endRow;
            });
            if (selectedInTier.length > 0) {
                const codeToRemove = selectedInTier[selectedInTier.length - 1];
                return prev.filter(s => s !== codeToRemove);
            }
            return prev;
        });
    };

    const getGATierCount = (startRow: number, endRow: number) => {
        return selectedSeats.filter(code => {
            const seat = seats.find(s => s.code === code);
            if (!seat) return false;
            const r = getRow(seat);
            return r >= startRow && r <= endRow;
        }).length;
    };

    const getGATierAvailable = (startRow: number, endRow: number) => {
        return seats.filter(s => {
            const r = getRow(s);
            const isHeldByOther = Boolean(s.isHeld) && s.heldBy !== userId;
            return r >= startRow && r <= endRow && !s.isBooked && !isHeldByOther;
        }).length;
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

            {!isGA ? (
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
                    <div className="flex flex-wrap justify-center gap-6 mt-8 py-4 border-t border-theatre-700/50 mx-6">
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-5 h-5 rounded-t-md bg-theatre-700 border border-theatre-600"></div>
                            <span className="text-[10px] text-slate-500">Available</span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-5 h-5 rounded-t-md bg-brand-gold shadow-glow"></div>
                            <span className="text-[10px] text-slate-500">Selected</span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-5 h-5 rounded-t-md bg-amber-600/70 border border-amber-500 animate-pulse"></div>
                            <span className="text-[10px] text-slate-500">In Checkout</span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-5 h-5 rounded-t-md bg-theatre-700/50 opacity-50"></div>
                            <span className="text-[10px] text-slate-500">Sold</span>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="max-w-3xl mx-auto px-4 py-8">
                    <div className="bg-gradient-to-r from-brand-purple/20 via-theatre-800 to-brand-gold/15 border border-theatre-700 rounded-2xl p-6 mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-brand-purple/20 border border-brand-purple/40 flex items-center justify-center text-brand-purple flex-shrink-0">
                                <Ticket className="w-6 h-6 animate-pulse-slow" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-extrabold text-brand-gold bg-brand-gold/10 px-2 py-0.5 rounded tracking-wider uppercase">General Admission Event</span>
                                    <span className="text-[11px] text-slate-400 flex items-center gap-1"><Users className="w-3.5 h-3.5 text-slate-400" /> Open Floor / No Assigned Seating</span>
                                </div>
                                <h2 className="text-lg md:text-xl font-bold text-white">Select Your Ticket Categories</h2>
                                <p className="text-xs text-slate-400">Choose your admission tiers below. Tickets grant entry to designated arena floor zones.</p>
                            </div>
                        </div>
                    </div>

                    {loading && seats.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 space-y-4">
                            <div className="w-8 h-8 border-4 border-brand-purple border-t-transparent rounded-full animate-spin"></div>
                            <div className="text-slate-500 text-sm">Checking live ticket availability...</div>
                        </div>
                    ) : (
                        <div className="space-y-4 mb-12">
                            {gaTiers.map((tier) => {
                                const count = getGATierCount(tier.startRow, tier.endRow);
                                const available = getGATierAvailable(tier.startRow, tier.endRow);
                                const isSoldOut = available === 0;

                                return (
                                    <div 
                                        key={tier.id}
                                        className={`bg-theatre-800/80 backdrop-blur-md border ${count > 0 ? 'border-brand-purple shadow-[0_4px_20px_rgba(124,58,237,0.15)] bg-theatre-800' : 'border-theatre-700/80 hover:border-theatre-600'} rounded-2xl p-5 md:p-6 transition-all duration-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6`}
                                    >
                                        <div className="space-y-2 max-w-lg">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${tier.badgeColor}`}>
                                                    {tier.tag}
                                                </span>
                                                {isSoldOut ? (
                                                    <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded uppercase">Sold Out</span>
                                                ) : available <= 5 ? (
                                                    <span className="text-[10px] font-semibold text-amber-400">🔥 Only {available} passes left!</span>
                                                ) : (
                                                    <span className="text-[10px] font-medium text-emerald-400">● Available</span>
                                                )}
                                            </div>
                                            <h3 className="text-xl font-extrabold text-white">{tier.name}</h3>
                                            <p className="text-xs text-slate-300 leading-relaxed">{tier.description}</p>
                                        </div>

                                        <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto border-t sm:border-t-0 border-theatre-700/60 pt-4 sm:pt-0 gap-4">
                                            <div className="text-left sm:text-right">
                                                <span className="text-[10px] text-slate-400 block uppercase font-medium">Price per ticket</span>
                                                <span className="text-2xl font-black text-brand-gold">₹{tier.price}</span>
                                            </div>

                                            {isSoldOut ? (
                                                <button disabled className="px-4 py-2 rounded-xl bg-theatre-700 text-slate-500 text-xs font-bold cursor-not-allowed">
                                                    Unavailable
                                                </button>
                                            ) : (
                                                <div className="flex items-center gap-3 bg-theatre-900/90 border border-theatre-600 rounded-xl p-1.5 shadow-inner">
                                                    <button
                                                        onClick={() => removeGATicket(tier.startRow, tier.endRow)}
                                                        disabled={count === 0}
                                                        className="w-8 h-8 rounded-lg bg-theatre-800 hover:bg-theatre-700 disabled:opacity-30 disabled:hover:bg-theatre-800 text-slate-200 flex items-center justify-center transition-colors active:scale-90"
                                                        title="Remove ticket"
                                                    >
                                                        <Minus className="w-4 h-4" />
                                                    </button>
                                                    <span className="w-6 text-center font-extrabold text-white text-base font-mono">
                                                        {count}
                                                    </span>
                                                    <button
                                                        onClick={() => addGATicket(tier.startRow, tier.endRow)}
                                                        disabled={available <= count}
                                                        className="w-8 h-8 rounded-lg bg-brand-purple hover:bg-violet-500 disabled:opacity-30 disabled:hover:bg-brand-purple text-white flex items-center justify-center transition-all shadow-md shadow-brand-purple/30 active:scale-90"
                                                        title="Add ticket"
                                                    >
                                                        <Plus className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Trust and Admission Guidelines Info Bar */}
                    <div className="bg-theatre-800/50 border border-theatre-700/60 rounded-xl p-4 flex items-center gap-3 text-xs text-slate-300">
                        <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                        <span><strong>100% Guaranteed Admission:</strong> Tickets are electronically issued instantly after payment. Gates open 2 hours prior to showtime for standing floor security check-ins.</span>
                    </div>
                </div>
            )}

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
                                        disabled={holding}
                                        className="bg-brand-purple hover:bg-violet-500 disabled:opacity-50 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-brand-purple/25 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                                    >
                                        {holding ? "Reserving..." : "Proceed"} <ChevronLeft className="w-4 h-4 rotate-180" />
                                    </button>
                                </div>

                            </div>

                        )}
        </div>
    );
}
