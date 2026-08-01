import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getSeats, holdSeats, fetchEventById } from "../api";
import { Seat } from "../types";
import { ChevronLeft, Calendar, Clock, Info, Plus, Minus, Ticket, Users, ShieldCheck } from "lucide-react";
import { EventData } from "../data/events";
import { useToast } from "../components/Toast";

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
    const { toast } = useToast();
    const [seats, setSeats] = useState<Seat[]>([]);
    const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [userId] = useState<string>(getSessionUserId);
    const [holding, setHolding] = useState(false);
    const [event, setEvent] = useState<EventData | null>(null);

    useEffect(() => {
        if (id) {
            fetchEventById(id).then(setEvent);
        }
    }, [id]);

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
            toast(res.message, { type: "error", title: "Cannot Proceed to Checkout" });
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
                eventTitle: event?.title || "Event",
                eventArtist: event?.artist || "Artist",
                eventVenue: event?.venue || "Venue",
                eventImage: event?.image || "",
                eventType: event?.eventType || "seated",
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

        const rowCount = endRow - startRow + 1;
        const skeletonSeats = Array.from({ length: rowCount * 10 }, (_, i) => i);

        return (
            <div className="mb-8 relative">
                <div className="flex items-center gap-3 mb-4 px-4">
                    <span className="text-xs font-extrabold text-blue-600 bg-blue-50 border border-blue-200/60 px-2.5 py-1 rounded-lg tracking-wider uppercase">
                        {title}
                    </span>
                    <span className="text-xs font-bold text-slate-700">₹{price}</span>
                    <div className="h-px bg-slate-200 flex-grow"></div>
                </div>
                
                <div className="grid grid-cols-10 gap-y-3 gap-x-2 max-w-lg mx-auto px-4">
                    {loading && seats.length === 0 ? (
                        // Skeleton Loading
                        skeletonSeats.map((i) => (
                            <div
                                key={`skeleton-${i}`}
                                className="relative w-full pt-[80%] rounded-t-lg bg-slate-200 animate-pulse"
                            >
                                <div className="absolute bottom-1 left-0.5 right-0.5 h-1 rounded-full bg-slate-300"></div>
                            </div>
                        ))
                    ) : (
                        gridSeats.map((seat) => {
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
                                        ? "bg-slate-200 border border-slate-300 cursor-not-allowed opacity-50" 
                                        : isHeldByOther
                                            ? "bg-amber-100 border border-amber-400 cursor-not-allowed animate-pulse"
                                            : isSelected 
                                                ? "bg-blue-600 border border-blue-700 shadow-md shadow-blue-600/25 scale-105 z-10" 
                                                : "bg-white hover:bg-blue-50 border border-slate-300 hover:border-blue-400 shadow-2xs"
                                    }
                                `}
                            >
                                {/* Seat Armrests Effect */}
                                <div className={`absolute bottom-1 left-0.5 right-0.5 h-1 rounded-full ${isSelected ? 'bg-white/30' : 'bg-slate-300'}`}></div>
                                
                                <span className={`text-[9px] font-bold ${isSelected ? "text-white" : isBooked ? "text-slate-400" : "text-slate-600 group-hover:text-blue-600"}`}>
                                    {seat.code.replace("S", "").replace(/^0+/, "")}
                                </span>
                            </button>
                        );
                    })
                    )}
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
            badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
            description: "Exclusive frontline crowd access closest to the main stage, dedicated VIP entrance gate & private bar lounge access."
        },
        {
            id: "fast-track",
            name: "Fast-Track Arena Standing",
            price: 350,
            startRow: 3,
            endRow: 6,
            tag: "PRIORITY ENTRY",
            badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
            description: "Priority stadium floor entry 1.5 hours before regular ticket holders, prime arena standing views."
        },
        {
            id: "general",
            name: "General Admission Floor",
            price: 310,
            startRow: 7,
            endRow: 10,
            tag: "STANDARD ENTRY",
            badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
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
                toast("No more tickets available in this category for the selected time!", { type: "warning" });
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
        <div className="min-h-screen bg-[#f4f6f9] pb-32 text-slate-700 font-sans selection:bg-blue-600 selection:text-white">
            {/* Top Event & Schedule Card */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-2 pb-6">
                <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm mb-4">
                    <div className="flex items-center gap-4 mb-6 pb-5 border-b border-slate-100">
                        <button onClick={() => navigate(-1)} className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-colors border border-slate-200/60 text-slate-700 hover:text-slate-950">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{event?.title || "Event"}</h1>
                            <p className="text-sm font-bold text-blue-600 flex items-center gap-1.5 mt-0.5">
                                {event?.venue || "Venue"}
                            </p>
                        </div>
                    </div>

                    {/* Date & Time Selector */}
                    <div className="space-y-4">
                        <div>
                            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider block mb-2">Select Date</span>
                            <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
                                {DATES.map((date) => (
                                    <button
                                        key={date}
                                        onClick={() => setSelectedDate(date)}
                                        className={`
                                            flex-shrink-0 px-4 py-3 rounded-2xl flex flex-col items-center gap-1.5 transition-all border
                                            ${selectedDate === date
                                                ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-600/25 scale-[1.02]"
                                                : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300 hover:text-slate-900"
                                            }
                                        `}
                                    >
                                        <Calendar className="w-4 h-4 opacity-80" />
                                        <span className="text-xs font-bold whitespace-nowrap">{date}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider block mb-2">Select Show Time</span>
                            <div className="flex gap-2.5 overflow-x-auto pb-1 no-scrollbar">
                                {TIMES.map((time) => (
                                    <button
                                        key={time}
                                        onClick={() => setSelectedTime(time)}
                                        className={`
                                            flex-shrink-0 px-4 py-2 rounded-xl border text-xs font-extrabold transition-all flex items-center gap-1.5
                                            ${selectedTime === time
                                                ? "bg-slate-900 text-white border-slate-900 shadow-sm scale-[1.02]"
                                                : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900"
                                            }
                                        `}
                                    >
                                        <Clock className="w-3.5 h-3.5" />
                                        {time}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {!isGA ? (
                <div className="max-w-3xl mx-auto">
                    {/* Theatre Screen */}
                    <div className="relative pt-10 pb-6 overflow-hidden">
                        <div className="w-3/4 h-8 mx-auto bg-blue-600/5 rounded-[50%] blur-md opacity-50 transform -translate-y-4"></div>
                        <svg 
                            viewBox="0 0 300 40" 
                            className="w-2/3 mx-auto mb-6" 
                            style={{ filter: 'drop-shadow(0 4px 8px rgba(148, 163, 184, 0.2))' }}
                        >
                            <path 
                                d="M 10 30 Q 150 5, 290 30" 
                                fill="none" 
                                stroke="rgb(37, 99, 235)" 
                                strokeWidth="3" 
                                strokeLinecap="round"
                            />
                        </svg>
                        <div className="text-center text-[10px] text-slate-400 uppercase tracking-[0.2em] font-bold">Screen This Way</div>
                    </div>

                    {/* Seat Layout */}
                    <div className="px-2">
                        {renderGrid("Recliner", 570, 1, 2)}
                        {renderGrid("Prime", 350, 3, 6)}
                        {renderGrid("Classic", 310, 7, 10)}
                    </div>

                    {/* Legend */}
                    <div className="flex flex-wrap justify-center gap-6 mt-8 py-4 border-t border-slate-200 mx-6">
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded bg-white border border-slate-300 shadow-2xs"></div>
                            <span className="text-xs font-medium text-slate-600">Available</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded bg-blue-600 border border-blue-700 shadow-xs"></div>
                            <span className="text-xs font-medium text-slate-600">Selected</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded bg-amber-100 border border-amber-400 animate-pulse"></div>
                            <span className="text-xs font-medium text-slate-600">In Checkout</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded bg-slate-200 border border-slate-300 opacity-60"></div>
                            <span className="text-xs font-medium text-slate-600">Sold</span>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="max-w-3xl mx-auto px-4 py-8">
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 flex-shrink-0">
                                <Ticket className="w-6 h-6" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[10px] font-extrabold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded tracking-wider uppercase">General Admission Event</span>
                                    <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1"><Users className="w-3.5 h-3.5 text-blue-600" /> Open Floor / No Assigned Seating</span>
                                </div>
                                <h2 className="text-lg md:text-xl font-black text-slate-900">Select Your Ticket Categories</h2>
                                <p className="text-xs text-slate-500">Choose your admission tiers below. Tickets grant entry to designated arena floor zones.</p>
                            </div>
                        </div>
                    </div>

                    {loading && seats.length === 0 ? (
                        <div className="space-y-4 mb-12">
                            {gaTiers.map((tier) => (
                                <div 
                                    key={tier.id}
                                    className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 animate-pulse flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"
                                >
                                    <div className="space-y-3 max-w-lg flex-1">
                                        <div className="flex items-center gap-2">
                                            <div className="h-5 w-24 bg-slate-200 rounded-full"></div>
                                            <div className="h-4 w-16 bg-slate-200 rounded"></div>
                                        </div>
                                        <div className="h-6 w-3/4 bg-slate-200 rounded"></div>
                                        <div className="space-y-2">
                                            <div className="h-3 w-full bg-slate-200 rounded"></div>
                                            <div className="h-3 w-5/6 bg-slate-200 rounded"></div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-3">
                                        <div className="h-8 w-20 bg-slate-200 rounded"></div>
                                        <div className="h-10 w-32 bg-slate-200 rounded-xl"></div>
                                    </div>
                                </div>
                            ))}
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
                                        className={`bg-white border ${count > 0 ? 'border-blue-500 shadow-md ring-1 ring-blue-500/20' : 'border-slate-200 hover:border-blue-300'} rounded-2xl p-5 md:p-6 transition-all duration-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6`}
                                    >
                                        <div className="space-y-2 max-w-lg">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-md uppercase tracking-wider border ${tier.badgeColor}`}>
                                                    {tier.tag}
                                                </span>
                                                {isSoldOut ? (
                                                    <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded uppercase">Sold Out</span>
                                                ) : available <= 5 ? (
                                                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">🔥 Only {available} left!</span>
                                                ) : (
                                                    <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">● Available</span>
                                                )}
                                            </div>
                                            <h3 className="text-xl font-black text-slate-900">{tier.name}</h3>
                                            <p className="text-xs text-slate-600 leading-relaxed">{tier.description}</p>
                                        </div>

                                        <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto border-t sm:border-t-0 border-slate-100 pt-4 sm:pt-0 gap-4">
                                            <div className="text-left sm:text-right">
                                                <span className="text-[10px] text-slate-400 block uppercase font-bold">Price per ticket</span>
                                                <span className="text-2xl font-black text-slate-900">₹{tier.price}</span>
                                            </div>

                                            {isSoldOut ? (
                                                <button disabled className="px-4 py-2 rounded-xl bg-slate-100 text-slate-400 text-xs font-bold cursor-not-allowed border border-slate-200">
                                                    Unavailable
                                                </button>
                                            ) : (
                                                <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-1.5 shadow-2xs">
                                                    <button
                                                        onClick={() => removeGATicket(tier.startRow, tier.endRow)}
                                                        disabled={count === 0}
                                                        className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-slate-700 flex items-center justify-center transition-colors active:scale-90 shadow-2xs"
                                                        title="Remove ticket"
                                                    >
                                                        <Minus className="w-4 h-4" />
                                                    </button>
                                                    <span className="w-6 text-center font-black text-slate-900 text-base font-mono">
                                                        {count}
                                                    </span>
                                                    <button
                                                        onClick={() => addGATicket(tier.startRow, tier.endRow)}
                                                        disabled={available <= count}
                                                        className="w-8 h-8 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:hover:bg-blue-600 text-white flex items-center justify-center transition-all shadow-sm active:scale-90"
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
                    <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-4 flex items-center gap-3 text-xs text-slate-700">
                        <ShieldCheck className="w-5 h-5 text-blue-600 flex-shrink-0" />
                        <span><strong>100% Guaranteed Admission:</strong> Tickets are electronically issued instantly after payment. Gates open 2 hours prior to showtime for standing floor security check-ins.</span>
                    </div>
                </div>
            )}

            {/* Sticky Footer */}
            {selectedSeats.length > 0 && (
                <div className="fixed bottom-4 left-4 right-4 max-w-3xl mx-auto z-40">
                    <div className="bg-white/95 backdrop-blur-lg border border-slate-200 rounded-2xl p-4 shadow-xl flex items-center justify-between animate-in slide-in-from-bottom-10 fade-in duration-300">
                        <div>
                            <div className="text-xs font-semibold text-slate-500 mb-0.5">Total Amount</div>
                            <div className="text-2xl font-black text-slate-900 flex items-baseline gap-1">
                                <span className="text-sm font-bold text-blue-600">₹</span>
                                {calculateTotal()}
                            </div>
                            <div className="text-xs text-blue-600 font-bold">{selectedSeats.length} Tickets Selected</div>
                        </div>

                        <button
                            onClick={handleProceed}
                            disabled={holding}
                            className="bg-slate-900 hover:bg-blue-600 disabled:opacity-50 text-white font-bold py-3.5 px-8 rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-2 text-sm"
                        >
                            {holding ? "Reserving..." : "Proceed to Checkout"} <ChevronLeft className="w-4 h-4 rotate-180" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
