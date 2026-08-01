import { Link } from "react-router-dom";
import { Calendar, MapPin, Clock, Music, Star, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { EventData } from "../data/events";
import { fetchEvents } from "../api";

export default function ShowList() {
    const [events, setEvents] = useState<EventData[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchEvents().then(setEvents);
    }, []);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const { current } = scrollRef;
            const scrollAmount = direction === 'left' ? -400 : 400;
            current.scrollBy({ left: scrollAmount, behavior: "smooth" });
        }
    };

    return (
        <div className="flex-1 w-full bg-[#f4f6f9] overflow-x-hidden">
            {/* Hero Section */}
            <div className="relative border-b border-slate-200 bg-white py-20 px-6 overflow-hidden">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-12">
                    <div className="flex-1 z-10">
                        <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold tracking-wider uppercase mb-6 shadow-2xs">
                            <img src="/logo.png" alt="TicketRush Logo" className="w-4 h-4 rounded-md object-contain" />
                            <span>Premier Events by TicketRush</span>
                        </div>
                        <h1 className="text-5xl md:text-7xl font-black text-slate-900 mb-6 tracking-tight leading-tight">
                            Experience the <br />
                            <span className="text-blue-600">Unforgettable.</span>
                        </h1>
                        <p className="text-lg text-slate-600 max-w-xl mb-8 leading-relaxed font-normal">
                            Secure your seats for the world's most anticipated tours.
                            Immersive sound, breathtaking performances, and memories that last a lifetime.
                        </p>
                        <Link 
                            to="/events"
                            className="inline-block bg-blue-600 text-white hover:bg-blue-700 font-extrabold py-4 px-9 rounded-full transition-all duration-300 transform hover:scale-105 shadow-md shadow-blue-600/20 text-center text-base"
                        >
                            Explore Events
                        </Link>
                    </div>
                    
                    <div className="w-full md:w-5/12 relative">
                        <div className="relative h-[400px] w-full rounded-3xl overflow-hidden shadow-2xl border border-slate-200 bg-slate-100">
                            <img
                                src="https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?q=80&w=1200&auto=format&fit=crop"
                                alt="Concert Crowd"
                                className="w-full h-full object-cover"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Featured Events Carousel */}
            <div className="max-w-7xl mx-auto px-4 py-16">
                <div className="flex items-end justify-between mb-10">
                    <div>
                        <h2 className="text-3xl font-black text-slate-900 mb-1">Trending Now</h2>
                        <p className="text-slate-500 font-medium">Events selling out fast in your area</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link 
                            to="/events"
                            className="hidden sm:inline-flex items-center gap-1.5 text-xs sm:text-sm text-blue-700 hover:text-blue-800 font-bold px-4 py-2.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-all duration-300 shadow-2xs"
                        >
                            <span>View All ({events.length}) Shows</span>
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                        <button
                            onClick={() => scroll('left')}
                            className="w-10 h-10 rounded-full border border-slate-300 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors shadow-2xs"
                            aria-label="Scroll Left"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => scroll('right')}
                            className="w-10 h-10 rounded-full border border-slate-300 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors shadow-2xs"
                            aria-label="Scroll Right"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div
                    ref={scrollRef}
                    className="flex gap-6 overflow-x-auto pb-8 -mx-4 px-4 scrollbar-hide snap-x snap-mandatory"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {events.map((show) => (
                        <div
                            key={show.id}
                            className="flex-shrink-0 w-[300px] md:w-[340px] snap-center group relative bg-white rounded-3xl overflow-hidden border border-slate-200 hover:border-blue-300 transition-all duration-500 hover:shadow-xl hover:shadow-slate-200/80 hover:-translate-y-1.5 flex flex-col"
                        >
                            {/* Image Header */}
                            <div className="relative h-52 overflow-hidden bg-slate-100 border-b border-slate-100">
                                <img
                                    src={show.image}
                                    alt={show.title}
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                />
                                <div className="absolute top-3 right-3 z-20 bg-white/90 backdrop-blur-md border border-slate-200 px-2.5 py-1 rounded-full text-xs font-bold text-slate-800 flex items-center gap-1 shadow-2xs">
                                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" /> {show.rating}
                                </div>
                            </div>

                            {/* Card Body */}
                            <div className="p-6 flex-1 flex flex-col justify-between bg-white">
                                <div>
                                    <div className="flex gap-1.5 mb-2.5 flex-wrap">
                                        {show.tags.map(tag => (
                                            <span key={tag} className="px-2 py-0.5 bg-slate-100 border border-slate-200/80 text-slate-700 text-[10px] font-bold uppercase tracking-wider rounded-md">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                    <h3 className="text-xl font-black text-slate-900 mb-1 leading-tight group-hover:text-blue-600 transition-colors">
                                        {show.artist}
                                    </h3>
                                    <p className="text-sm text-slate-500 font-medium mb-4">{show.title}</p>

                                    <div className="space-y-2 text-xs font-semibold text-slate-600 mb-6 border-t border-slate-100 pt-4">
                                        <div className="flex items-center gap-2.5">
                                            <Calendar className="w-4 h-4 text-blue-600" />
                                            {show.date}
                                        </div>
                                        <div className="flex items-center gap-2.5">
                                            <Clock className="w-4 h-4 text-blue-600" />
                                            {show.time}
                                        </div>
                                        <div className="flex items-center gap-2.5">
                                            <MapPin className="w-4 h-4 text-blue-600 text-ellipsis overflow-hidden whitespace-nowrap" />
                                            <span className="truncate">{show.venue}</span>
                                        </div>
                                    </div>
                                </div>

                                <Link
                                    to={`/book/${show.id}`}
                                    className="w-full bg-slate-900 hover:bg-blue-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-xs group-active:scale-95 text-sm"
                                >
                                    <Music className="w-4 h-4" />
                                    Get Tickets <span className="opacity-75 font-normal">| {show.price}</span>
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Newsletter / CTA */}
            <div className="bg-white py-20 border-t border-slate-200">
                <div className="max-w-3xl mx-auto px-6 text-center">
                    <h2 className="text-3xl font-black text-slate-900 mb-4">Don't Miss the Next Big Drop</h2>
                    <p className="text-slate-600 mb-8 font-medium">Join 2 million+ music lovers. Get priority access to pre-sales and exclusive VIP packages.</p>
                    <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                        <input
                            type="email"
                            placeholder="Enter your email address"
                            className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-5 py-3.5 text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none transition-all shadow-2xs"
                        />
                        <button className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-7 py-3.5 rounded-xl transition-all shadow-md shadow-blue-600/20 active:scale-95">
                            Subscribe
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}