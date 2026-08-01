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
        <div className="flex-1 w-full bg-theatre-900 overflow-x-hidden">
            {/* Hero Section */}
            <div className="relative h-[60vh] min-h-[500px] w-full overflow-hidden flex items-center">
                <div className="absolute inset-0 bg-theatre-900/40 z-10" />
                <div className="absolute inset-0 bg-gradient-to-t from-theatre-900 via-theatre-900/60 to-transparent z-20" />
                <img
                    src="https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?q=80&w=1200&auto=format&fit=crop"
                    alt="Concert Crowd"
                    className="absolute inset-0 w-full h-full object-cover animate-pulse-slow"
                />

                <div className="relative z-30 max-w-7xl mx-auto px-6 w-full pt-20">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-gold/20 border border-brand-gold/40 text-brand-gold text-xs font-bold tracking-wider uppercase mb-6">
                        <Star className="w-3 h-3 fill-brand-gold" /> Premier Events
                    </div>
                    <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-6 tracking-tight leading-tight">
                        Experience the <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-gold to-brand-purple">Unforgettable.</span>
                    </h1>
                    <p className="text-xl text-slate-300 max-w-2xl mb-8 leading-relaxed">
                        Secure your seats for the world's most anticipated tours.
                        Immersive sound, breathtaking visuals, and memories that last a lifetime.
                    </p>
                    <Link 
                        to="/events"
                        className="inline-block bg-white text-theatre-900 hover:bg-brand-gold hover:text-black font-extrabold py-4 px-9 rounded-full transition-all duration-300 transform hover:scale-105 shadow-glow text-center text-base"
                    >
                        Explore Events
                    </Link>
                </div>
            </div>

            {/* Featured Events Carousel */}
            <div className="max-w-7xl mx-auto px-4 py-20">
                <div className="flex items-end justify-between mb-8">
                    <div>
                        <h2 className="text-3xl font-bold text-white mb-2">Trending Now</h2>
                        <p className="text-slate-400">Events selling out fast in your area</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link 
                            to="/events"
                            className="hidden sm:inline-flex items-center gap-1.5 text-xs sm:text-sm text-brand-gold hover:text-yellow-300 font-bold px-4 py-2.5 bg-brand-gold/10 hover:bg-brand-gold/20 border border-brand-gold/30 rounded-xl transition-all duration-300 shadow-sm"
                        >
                            <span>View All ({events.length}) Shows</span>
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                        <button
                            onClick={() => scroll('left')}
                            className="w-10 h-10 rounded-full border border-theatre-600 flex items-center justify-center text-slate-400 hover:bg-theatre-700 hover:text-white transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => scroll('right')}
                            className="w-10 h-10 rounded-full border border-theatre-600 flex items-center justify-center text-slate-400 hover:bg-theatre-700 hover:text-white transition-colors"
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
                    {events.map((show, index) => (
                        <div
                            key={show.id}
                            className="flex-shrink-0 w-[300px] md:w-[350px] snap-center group relative bg-theatre-800 rounded-3xl overflow-hidden border border-theatre-700 hover:border-brand-purple/50 transition-all duration-500 hover:shadow-2xl hover:shadow-brand-purple/20 hover:-translate-y-2"
                        >
                            {/* Image Container */}
                            <div className="relative aspect-[3/4] overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-t from-theatre-900 via-transparent to-transparent z-10 opacity-60 group-hover:opacity-40 transition-opacity" />
                                <img
                                    src={show.image}
                                    alt={show.title}
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                />

                                <div className="absolute top-4 right-4 z-20 bg-white/10 backdrop-blur-md border border-white/20 px-3 py-1 rounded-full text-xs font-bold text-white flex items-center gap-1">
                                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" /> {show.rating}
                                </div>

                                <div className="absolute bottom-0 left-0 right-0 p-6 z-20 translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                                    <div className="flex gap-2 mb-3 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100">
                                        {show.tags.map(tag => (
                                            <span key={tag} className="px-2 py-1 bg-brand-purple/20 text-brand-purple text-[10px] font-bold uppercase tracking-wider rounded">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>

                                    <h3 className="text-2xl font-bold text-white mb-1 leading-tight group-hover:text-brand-gold transition-colors">
                                        {show.artist}
                                    </h3>
                                    <p className="text-sm text-slate-300 font-medium mb-4">{show.title}</p>

                                    <div className="space-y-2 text-sm text-slate-400 mb-6 border-t border-white/10 pt-4">
                                        <div className="flex items-center gap-3">
                                            <Calendar className="w-4 h-4 text-brand-purple" />
                                            {show.date}
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Clock className="w-4 h-4 text-brand-purple" />
                                            {show.time}
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <MapPin className="w-4 h-4 text-brand-purple" />
                                            {show.venue}
                                        </div>
                                    </div>

                                    <Link
                                        to={`/book/${show.id}`}
                                        className="w-full bg-brand-purple hover:bg-violet-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all hover:shadow-glow-purple group-active:scale-95"
                                    >
                                        <Music className="w-4 h-4" />
                                        Get Tickets <span className="opacity-60 font-normal">| {show.price}</span>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Newsletter / CTA */}
            <div className="bg-theatre-800 py-20 border-t border-theatre-700">
                <div className="max-w-4xl mx-auto px-6 text-center">
                    <h2 className="text-3xl font-bold text-white mb-6">Don't Miss the Next Big Drop</h2>
                    <p className="text-slate-400 mb-8">Join 2 million+ fans. Get priority access to pre-sales and exclusive VIP packages.</p>
                    <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
                        <input
                            type="email"
                            placeholder="Enter your email"
                            className="flex-1 bg-theatre-900 border border-theatre-600 rounded-xl px-6 py-4 text-white focus:border-brand-purple focus:outline-none transition-colors"
                        />
                        <button className="bg-white text-theatre-900 font-bold px-8 py-4 rounded-xl hover:bg-brand-gold hover:text-black transition-colors">
                            Subscribe
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}