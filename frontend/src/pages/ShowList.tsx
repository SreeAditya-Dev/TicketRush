import { Link } from "react-router-dom";
import { 
    Calendar, MapPin, Clock, Star, ArrowRight, ChevronLeft, 
    ChevronRight, ShieldCheck, Ticket, Sparkles, TrendingUp, Zap, 
    CheckCircle2, Search, Filter
} from "lucide-react";
import { useState, useRef, useEffect, useMemo } from "react";
import { EventData } from "../data/events";
import { fetchEvents } from "../api";

export default function ShowList() {
    const [events, setEvents] = useState<EventData[]>([]);
    const [activeTab, setActiveTab] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState<string>("");
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchEvents().then(setEvents);
    }, []);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const { current } = scrollRef;
            const scrollAmount = direction === 'left' ? -360 : 360;
            current.scrollBy({ left: scrollAmount, behavior: "smooth" });
        }
    };

    const filteredEvents = useMemo(() => {
        return events.filter(ev => {
            const matchesTab = activeTab === "all" || ev.tags.some(t => t.toLowerCase() === activeTab.toLowerCase());
            const matchesSearch = !searchQuery || 
                ev.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                ev.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
                ev.venue.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesTab && matchesSearch;
        });
    }, [events, activeTab, searchQuery]);

    const categories = [
        { id: "all", label: "All Events" },
        { id: "concert", label: "Concerts" },
        { id: "festival", label: "Festivals" },
        { id: "vip", label: "VIP Experiences" }
    ];

    return (
        <div className="flex-1 w-full bg-[#f4f6f9] overflow-x-hidden text-slate-900 font-sans selection:bg-blue-600 selection:text-white">
            {/* Hero Section with Social Proof & Trust Metrics */}
            <section aria-label="Hero" className="relative border-b border-slate-200/80 bg-gradient-to-b from-blue-50/40 via-white to-white pt-10 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-70 pointer-events-none" />
                
                <div className="max-w-7xl mx-auto relative z-10">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center pt-6 sm:pt-10">
                        
                        {/* Hero Left Content */}
                        <div className="lg:col-span-7 space-y-6 text-left">
                            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-blue-50/80 border border-blue-200/80 text-blue-700 text-xs font-extrabold tracking-wide shadow-2xs">
                                <Sparkles className="w-4 h-4 text-blue-600 animate-pulse" />
                                <span>Next-Gen High-Volume Ticket Engine</span>
                            </div>
                            
                            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-slate-950 tracking-tight leading-[1.08]">
                                Secure Your Spot at the World's <br className="hidden sm:inline" />
                                <span className="text-blue-600 underline decoration-blue-500/20 decoration-wavy decoration-from-font">Premier Shows.</span>
                            </h1>
                            
                            <p className="text-base sm:text-lg text-slate-600 max-w-xl leading-relaxed font-normal">
                                Guaranteed verified passes for sold-out stadiums, intimate acoustics, and VIP festivals. Zero queues, instant digital QR dispatch, and ironclad reservation holds.
                            </p>

                            {/* Live Search Bar inside Hero */}
                            <div className="max-w-xl pt-2">
                                <div className="p-1.5 bg-white border border-slate-300/80 rounded-2xl shadow-lg shadow-slate-200/50 flex flex-col sm:flex-row gap-2 transition-all focus-within:border-blue-600 focus-within:ring-4 focus-within:ring-blue-600/10">
                                    <div className="flex-1 flex items-center gap-3 px-4 py-2 sm:py-0">
                                        <Search className="w-5 h-5 text-slate-400 shrink-0" />
                                        <input 
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Search by artist, tour, or city venue..." 
                                            className="w-full bg-transparent border-0 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none font-medium"
                                            aria-label="Search events"
                                        />
                                    </div>
                                    <Link 
                                        to="/events"
                                        className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-extrabold py-3 px-8 rounded-xl transition-colors duration-150 flex items-center justify-center gap-2 shadow-sm text-sm shrink-0 cursor-pointer"
                                    >
                                        <span>Browse All Shows</span>
                                        <ArrowRight className="w-4 h-4" />
                                    </Link>
                                </div>
                            </div>

                            {/* Trust Badge Social Proof */}
                            <div className="pt-4 flex flex-wrap items-center gap-6 text-xs text-slate-600 font-bold">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                    <span>100% Guaranteed Entry</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                                    <span>Verified Official Partner</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Zap className="w-4 h-4 text-amber-500" />
                                    <span>Instant E-Ticket QR Code</span>
                                </div>
                            </div>
                        </div>
                        
                        {/* Hero Right Interactive Deck Showcase */}
                        <div className="lg:col-span-5 relative">
                            <div className="relative mx-auto max-w-md lg:max-w-none">
                                <div className="absolute -inset-4 bg-gradient-to-tr from-blue-600/15 to-slate-400/10 rounded-3xl blur-2xl -z-10" />
                                
                                <div className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-5 shadow-2xl shadow-slate-900/10 relative">
                                    <div className="relative h-64 sm:h-72 w-full rounded-2xl overflow-hidden bg-slate-100 mb-4 border border-slate-200/60">
                                        <img
                                            src="https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=1200&auto=format&fit=crop"
                                            alt="Featured Concert Experience"
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                                        <div className="absolute bottom-4 left-4 right-4 text-white">
                                            <span className="inline-block px-2.5 py-1 rounded-full bg-blue-600 text-[10px] font-black tracking-wider uppercase mb-2 text-white">
                                                Selling Fast
                                            </span>
                                            <h3 className="text-xl font-black text-white leading-tight">Neon Skyline Tour 2026</h3>
                                            <p className="text-xs text-slate-200 font-medium mt-0.5">Madison Square Garden, New York</p>
                                        </div>
                                    </div>

                                    {/* Live stats ticker card inside Hero Deck */}
                                    <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                                        <div className="flex items-center gap-3 px-2">
                                            <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                                                <TrendingUp className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-black text-slate-900">4,820+</div>
                                                <div className="text-[11px] font-semibold text-slate-500">Tickets Sold Today</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 px-2 border-l border-slate-200">
                                            <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 shrink-0">
                                                <Ticket className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-black text-slate-900">Live Seat Map</div>
                                                <div className="text-[11px] font-semibold text-slate-500">Real-time locks</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </section>

            {/* Why Choose TicketRush - Value Proposition Grid */}
            <section aria-label="Why Choose TicketRush" className="bg-white py-16 px-4 sm:px-6 lg:px-8 border-b border-slate-200">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center max-w-2xl mx-auto mb-12">
                        <h2 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">The Modern Way to Book Tickets</h2>
                        <p className="text-slate-600 text-sm mt-2">Built for speed, fairness, and absolute security so you never miss a show.</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="p-6 rounded-3xl bg-[#f8fafc] border border-slate-200/80 hover:border-blue-300 transition-colors duration-200 shadow-2xs flex flex-col justify-between">
                            <div>
                                <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center mb-5 shadow-md shadow-blue-600/20">
                                    <Zap className="w-6 h-6" />
                                </div>
                                <h3 className="text-lg font-extrabold text-slate-900 mb-2">Sub-Second Seat Locking</h3>
                                <p className="text-sm text-slate-600 leading-relaxed">
                                    Our reactive booking architecture prevents double-bookings and race conditions during high-demand on-sale rush moments.
                                </p>
                            </div>
                            <div className="mt-6 pt-4 border-t border-slate-200/60 flex items-center text-xs font-extrabold text-blue-600">
                                <span>Zero checkout latency</span>
                            </div>
                        </div>

                        <div className="p-6 rounded-3xl bg-[#f8fafc] border border-slate-200/80 hover:border-blue-300 transition-colors duration-200 shadow-2xs flex flex-col justify-between">
                            <div>
                                <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center mb-5 shadow-sm">
                                    <ShieldCheck className="w-6 h-6 text-white" />
                                </div>
                                <h3 className="text-lg font-extrabold text-slate-900 mb-2">Verified Official Resale</h3>
                                <p className="text-sm text-slate-600 leading-relaxed">
                                    Every pass is directly cryptographic and authenticated by show organizers. No counterfeit vouchers or shady resellers.
                                </p>
                            </div>
                            <div className="mt-6 pt-4 border-t border-slate-200/60 flex items-center text-xs font-extrabold text-slate-900">
                                <span>100% refund guarantee</span>
                            </div>
                        </div>

                        <div className="p-6 rounded-3xl bg-[#f8fafc] border border-slate-200/80 hover:border-blue-300 transition-colors duration-200 shadow-2xs flex flex-col justify-between">
                            <div>
                                <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center mb-5 shadow-md shadow-blue-600/20">
                                    <Ticket className="w-6 h-6" />
                                </div>
                                <h3 className="text-lg font-extrabold text-slate-900 mb-2">Instant E-Ticket Dispatch</h3>
                                <p className="text-sm text-slate-600 leading-relaxed">
                                    Download your official QR confirmation PDF immediately upon payment check-out. Ready for gate scan on any smart device.
                                </p>
                            </div>
                            <div className="mt-6 pt-4 border-t border-slate-200/60 flex items-center text-xs font-extrabold text-blue-600">
                                <span>Apple & Google Wallet Ready</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Featured Events Carousel & Catalog */}
            <section aria-label="Featured Events" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                    <div>
                        <div className="flex items-center gap-2 text-blue-600 text-xs font-extrabold uppercase tracking-wider mb-2">
                            <TrendingUp className="w-4 h-4" />
                            <span>Trending Nationwide</span>
                        </div>
                        <h2 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight">Upcoming Featured Shows</h2>
                    </div>

                    {/* Category Filter Tabs */}
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                        {categories.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-150 shrink-0 cursor-pointer ${
                                    activeTab === tab.id 
                                        ? "bg-slate-900 text-white shadow-sm" 
                                        : "bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300"
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Carousel controls bar */}
                <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-200/60 text-xs text-slate-500 font-bold">
                    <span>Showing {filteredEvents.length} active high-demand events</span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => scroll('left')}
                            className="w-9 h-9 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition-colors shadow-2xs cursor-pointer"
                            aria-label="Scroll left through events"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => scroll('right')}
                            className="w-9 h-9 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition-colors shadow-2xs cursor-pointer"
                            aria-label="Scroll right through events"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Events Horizontal Snap Container */}
                {filteredEvents.length === 0 ? (
                    <div className="text-center py-20 bg-white border border-slate-200 rounded-3xl shadow-2xs">
                        <Filter className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <h3 className="text-lg font-bold text-slate-900">No events match your criteria</h3>
                        <p className="text-sm text-slate-500 mt-1">Try selecting a different category tab or clearing your search filter.</p>
                        <button 
                            onClick={() => { setActiveTab("all"); setSearchQuery(""); }} 
                            className="mt-5 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                            Reset Filters
                        </button>
                    </div>
                ) : (
                    <div
                        ref={scrollRef}
                        className="flex gap-6 overflow-x-auto pb-8 scrollbar-hide snap-x snap-mandatory pt-2"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                        {filteredEvents.map((show) => (
                            <article
                                key={show.id}
                                className="flex-shrink-0 w-[300px] sm:w-[340px] snap-center group bg-white rounded-3xl overflow-hidden border border-slate-200/90 hover:border-blue-500/60 transition-all duration-300 hover:shadow-xl hover:shadow-slate-300/60 flex flex-col justify-between"
                            >
                                <div>
                                    <div className="relative h-52 overflow-hidden bg-slate-100 border-b border-slate-100">
                                        <img
                                            src={show.image}
                                            alt={show.title}
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                        />
                                        <div className="absolute top-3 left-3 z-10 bg-slate-900/85 backdrop-blur-md px-3 py-1 rounded-full text-xs font-black text-white uppercase tracking-wider shadow-sm">
                                            {show.price}
                                        </div>
                                        <div className="absolute top-3 right-3 z-10 bg-white/95 backdrop-blur-md border border-slate-200 px-2.5 py-1 rounded-full text-xs font-extrabold text-slate-900 flex items-center gap-1 shadow-2xs">
                                            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" /> {show.rating}
                                        </div>
                                    </div>

                                    <div className="p-6 pb-4">
                                        <div className="flex gap-1.5 mb-3 flex-wrap">
                                            {show.tags.map(tag => (
                                                <span key={tag} className="px-2.5 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-wider rounded-lg">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                        <h3 className="text-xl font-black text-slate-950 mb-1 leading-tight group-hover:text-blue-600 transition-colors">
                                            {show.artist}
                                        </h3>
                                        <p className="text-sm text-slate-600 font-medium line-clamp-1 mb-5">{show.title}</p>

                                        <div className="space-y-2.5 text-xs font-bold text-slate-600 border-t border-slate-100 pt-4">
                                            <div className="flex items-center gap-2.5">
                                                <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
                                                <span className="text-slate-900">{show.date}</span>
                                            </div>
                                            <div className="flex items-center gap-2.5">
                                                <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                                                <span>{show.time}</span>
                                            </div>
                                            <div className="flex items-center gap-2.5">
                                                <MapPin className="w-4 h-4 text-blue-600 shrink-0 text-ellipsis overflow-hidden whitespace-nowrap" />
                                                <span className="truncate">{show.venue}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6 pt-2">
                                    <Link
                                        to={`/book/${show.id}`}
                                        className="w-full bg-slate-900 group-hover:bg-blue-600 text-white font-extrabold py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 transition-colors duration-200 shadow-md shadow-slate-900/10 group-hover:shadow-blue-600/25 text-sm cursor-pointer"
                                    >
                                        <Ticket className="w-4 h-4" />
                                        <span>Reserve Seats</span>
                                        <ArrowRight className="w-4 h-4 ml-1 opacity-70 group-hover:translate-x-0.5 transition-transform" />
                                    </Link>
                                </div>
                            </article>
                        ))}
                    </div>
                )}

                <div className="mt-8 text-center">
                    <Link
                        to="/events"
                        className="inline-flex items-center gap-2 text-sm font-extrabold px-6 py-3.5 bg-white border border-slate-300 rounded-2xl text-slate-900 hover:border-blue-500 hover:text-blue-600 transition-colors duration-200 shadow-2xs cursor-pointer"
                    >
                        <span>Explore Full Catalog ({events.length} Shows)</span>
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </section>

            {/* Newsletter & Priority Access CTA Section */}
            <section aria-label="Priority Access Newsletter" className="bg-white py-20 border-t border-slate-200 mt-8">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
                    <div className="w-14 h-14 rounded-3xl bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto mb-6 shadow-2xs">
                        <Sparkles className="w-7 h-7 text-blue-600" />
                    </div>
                    <h2 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight mb-4">Don't Miss the Next Big Drop</h2>
                    <p className="text-slate-600 mb-8 font-medium max-w-xl mx-auto text-base">
                        Join 2,000,000+ live event fans. Subscribe for verified presale codes, exclusive backstage VIP packages, and instant tour alerts.
                    </p>
                    
                    <form onSubmit={(e) => e.preventDefault()} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                        <div className="flex-1 relative">
                            <label htmlFor="newsletter-email" className="sr-only">Email address for notifications</label>
                            <input
                                id="newsletter-email"
                                type="email"
                                placeholder="Enter your best email address..."
                                required
                                className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-5 py-4 text-sm font-medium text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 transition-all shadow-2xs"
                            />
                        </div>
                        <button 
                            type="submit" 
                            className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-8 py-4 rounded-2xl transition-all duration-200 shadow-lg shadow-blue-600/25 active:scale-95 text-sm cursor-pointer whitespace-nowrap"
                        >
                            Get Priority Access
                        </button>
                    </form>

                    <p className="text-xs text-slate-400 mt-4 font-semibold">
                        Zero spam guarantee. Unsubscribe with a single click at any time.
                    </p>
                </div>
            </section>
        </div>
    );
}