import React, { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { EVENTS, EventData } from "../data/events";
import { 
    Search, 
    Filter, 
    Calendar, 
    MapPin, 
    Clock, 
    Music, 
    Star, 
    Grid, 
    List as ListIcon, 
    ArrowUpRight, 
    X, 
    SlidersHorizontal
} from "lucide-react";

type SortOption = "featured" | "rating-desc" | "price-asc" | "price-desc";

const CATEGORIES = ["All", "Pop", "Rock", "R&B", "Hip-Hop", "Alternative", "Acoustic", "Fusion"];

// Reusable component with built-in image skeleton loading state to prevent layout shift & delayed pop-in
function EventImage({ src, alt, className }: { src: string; alt: string; className: string }) {
    const [imageLoaded, setImageLoaded] = useState(false);
    return (
        <div className="relative w-full h-full bg-theatre-950 overflow-hidden">
            {!imageLoaded && (
                <div className="absolute inset-0 bg-theatre-800 animate-pulse flex items-center justify-center">
                    <Music className="w-8 h-8 text-theatre-600 animate-pulse" />
                </div>
            )}
            <img
                src={src}
                alt={alt}
                onLoad={() => setImageLoaded(true)}
                className={`${className} transition-all duration-700 ease-out ${
                    imageLoaded ? "opacity-100 scale-100" : "opacity-0 scale-95"
                }`}
            />
        </div>
    );
}

// Skeleton card for Grid view while loading
function GridSkeletonCard() {
    return (
        <div className="bg-theatre-800/85 backdrop-blur-md rounded-3xl overflow-hidden border border-theatre-700/80 flex flex-col justify-between animate-pulse">
            <div>
                <div className="relative aspect-[4/3] bg-theatre-700/40 flex items-center justify-center">
                    <Music className="w-10 h-10 text-theatre-600/50" />
                </div>
                <div className="p-6 pt-4 space-y-3 border-b border-theatre-700/50">
                    <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full bg-theatre-700 flex-shrink-0" />
                        <div className="h-3 bg-theatre-700 rounded-md w-1/3" />
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full bg-theatre-700 flex-shrink-0" />
                        <div className="h-3 bg-theatre-700 rounded-md w-2/3" />
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full bg-theatre-700 flex-shrink-0" />
                        <div className="h-3 bg-theatre-700 rounded-md w-1/2" />
                    </div>
                </div>
            </div>
            <div className="p-6 pt-4 bg-theatre-900/40 flex items-center justify-between">
                <div className="space-y-1.5">
                    <div className="h-2.5 w-20 bg-theatre-700 rounded" />
                    <div className="h-6 w-24 bg-theatre-700 rounded-md" />
                </div>
                <div className="h-12 w-32 bg-theatre-700/80 rounded-xl" />
            </div>
        </div>
    );
}

// Skeleton card for List view while loading
function ListSkeletonCard() {
    return (
        <div className="bg-theatre-800/85 backdrop-blur-md rounded-3xl overflow-hidden border border-theatre-700/80 p-4 md:p-6 flex flex-col md:flex-row items-center gap-6 animate-pulse">
            <div className="w-full md:w-64 h-52 md:h-44 rounded-2xl bg-theatre-700/40 flex items-center justify-center flex-shrink-0">
                <Music className="w-10 h-10 text-theatre-600/50" />
            </div>
            <div className="flex-1 w-full md:w-auto space-y-3">
                <div className="flex gap-2">
                    <div className="h-5 w-16 bg-theatre-700/60 rounded-md" />
                    <div className="h-5 w-20 bg-theatre-700/60 rounded-md" />
                </div>
                <div className="h-8 w-3/4 bg-theatre-700 rounded-md" />
                <div className="h-4 w-1/2 bg-theatre-700/80 rounded-md mb-2" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-theatre-700/60">
                    <div className="h-3 bg-theatre-700 rounded-md w-4/5" />
                    <div className="h-3 bg-theatre-700 rounded-md w-3/4" />
                    <div className="h-3 bg-theatre-700 rounded-md w-full" />
                </div>
            </div>
            <div className="w-full md:w-auto md:border-l md:border-theatre-700/80 md:pl-8 flex md:flex-col items-center md:items-end justify-between md:justify-center gap-4 py-2">
                <div className="space-y-1.5 text-left md:text-right">
                    <div className="h-2.5 w-20 bg-theatre-700 rounded" />
                    <div className="h-7 w-24 bg-theatre-700 rounded-md" />
                </div>
                <div className="h-12 w-36 bg-theatre-700/80 rounded-xl" />
            </div>
        </div>
    );
}

export default function EventsPage() {
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [selectedCategory, setSelectedCategory] = useState<string>("All");
    const [sortBy, setSortBy] = useState<SortOption>("featured");
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

    // Simulate event hydration and smooth loading transition on page reload
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 700);
        return () => clearTimeout(timer);
    }, []);

    // Memoized filtering and sorting engine for peak 60fps performance
    const filteredEvents = useMemo(() => {
        return EVENTS.filter((event: EventData) => {
            const matchesCategory = selectedCategory === "All" || event.category.toLowerCase() === selectedCategory.toLowerCase();
            const query = searchQuery.trim().toLowerCase();
            const matchesSearch = !query || 
                event.artist.toLowerCase().includes(query) || 
                event.title.toLowerCase().includes(query) || 
                event.venue.toLowerCase().includes(query) ||
                event.tags.some((t: string) => t.toLowerCase().includes(query));

            return matchesCategory && matchesSearch;
        }).sort((a: EventData, b: EventData) => {
            switch (sortBy) {
                case "rating-desc":
                    return b.rating - a.rating;
                case "price-asc":
                    return a.priceValue - b.priceValue;
                case "price-desc":
                    return b.priceValue - a.priceValue;
                case "featured":
                default:
                    return 0; // Maintain official editorial curation order
            }
        });
    }, [searchQuery, selectedCategory, sortBy]);

    const handleClearFilters = () => {
        setSearchQuery("");
        setSelectedCategory("All");
        setSortBy("featured");
    };

    return (
        <div className="min-h-screen bg-theatre-900 text-slate-200 pb-24 selection:bg-brand-purple selection:text-white overflow-x-hidden">
            {/* Ambient Lighting Background Backdrop */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-brand-purple/15 rounded-full blur-[120px] animate-pulse-slow" />
                <div className="absolute bottom-[20%] left-[-10%] w-[400px] h-[400px] bg-brand-gold/10 rounded-full blur-[100px]" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-theatre-800/20 via-theatre-900 to-theatre-950/80" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
                {/* Header Banner & Hero Text */}
                <section className="text-center md:text-left mb-12">
                    <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight leading-none mb-4 font-sans">
                        Explore Premier <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-gold via-yellow-200 to-brand-purple">Events</span>
                    </h1>
                    <p className="text-base md:text-lg text-slate-300 max-w-2xl font-normal leading-relaxed mb-6">
                        Discover sold-out stadium tours and intimate arena concerts. Protected by real-time atomic seating locks and instant digital PDF ticket fulfillment.
                    </p>
                </section>

                {/* Interactive Search & Filtering Console */}
                <section aria-label="Event Filter and Search" className="bg-theatre-800/90 backdrop-blur-md border border-theatre-700/90 rounded-3xl p-6 shadow-2xl mb-12 transition-all duration-300">
                    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-6">
                        {/* Instant Search Bar */}
                        <div className="relative flex-1 group">
                            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-brand-gold transition-colors duration-200" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by artist, tour name, stadium, or genre tag..."
                                className="w-full bg-theatre-900/90 border border-theatre-600/80 rounded-2xl pl-12 pr-10 py-3.5 text-white placeholder-slate-400 focus:border-brand-purple focus:outline-none focus:ring-2 focus:ring-brand-purple/30 text-sm font-medium transition-all shadow-inner"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery("")}
                                    aria-label="Clear search query"
                                    className="absolute right-3.5 top-1/2 transform -translate-y-1/2 w-6 h-6 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        {/* Sort & Layout Controls */}
                        <div className="flex items-center gap-3 self-end md:self-center w-full md:w-auto justify-end">
                            <div className="relative flex items-center bg-theatre-900/90 border border-theatre-600/80 rounded-2xl px-4 py-1 flex-1 md:flex-initial">
                                <SlidersHorizontal className="w-4 h-4 text-brand-gold mr-2 flex-shrink-0" />
                                <span className="text-xs text-slate-400 mr-2 hidden sm:inline">Sort:</span>
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                                    className="bg-transparent border-none text-white text-sm font-semibold focus:outline-none cursor-pointer py-2 pr-6"
                                    aria-label="Sort events by"
                                >
                                    <option value="featured" className="bg-theatre-900">Featured Curated</option>
                                    <option value="rating-desc" className="bg-theatre-900">Highest Rated ⭐</option>
                                    <option value="price-asc" className="bg-theatre-900">Price: Low to High</option>
                                    <option value="price-desc" className="bg-theatre-900">Price: High to Low</option>
                                </select>
                            </div>

                            {/* View Mode Toggle Switcher */}
                            <div className="flex bg-theatre-900/90 border border-theatre-600/80 p-1 rounded-2xl flex-shrink-0">
                                <button
                                    onClick={() => setViewMode("grid")}
                                    aria-label="Switch to Grid View"
                                    className={`p-2 rounded-xl transition-all duration-200 ${viewMode === "grid" ? "bg-brand-purple text-white shadow-glow-purple" : "text-slate-400 hover:text-white"}`}
                                >
                                    <Grid className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setViewMode("list")}
                                    aria-label="Switch to List View"
                                    className={`p-2 rounded-xl transition-all duration-200 ${viewMode === "list" ? "bg-brand-purple text-white shadow-glow-purple" : "text-slate-400 hover:text-white"}`}
                                >
                                    <ListIcon className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Category / Genre Pills Bar */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1 flex-shrink-0">
                            <Filter className="w-3.5 h-3.5 text-brand-purple" /> Genre:
                        </span>
                        {CATEGORIES.map((cat) => {
                            const active = selectedCategory === cat;
                            return (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`px-4 py-2 rounded-xl text-xs font-extrabold tracking-wide transition-all duration-300 flex-shrink-0 whitespace-nowrap ${
                                        active
                                            ? "bg-gradient-to-r from-brand-purple to-violet-600 text-white shadow-lg shadow-brand-purple/30 scale-105"
                                            : "bg-theatre-900/60 text-slate-400 border border-theatre-700 hover:border-brand-purple/40 hover:text-white hover:bg-theatre-700/50"
                                    }`}
                                >
                                    {cat}
                                </button>
                            );
                        })}
                    </div>
                </section>

                {/* Live Count Indicator */}
                <div className="flex items-center justify-between mb-6 px-2">
                    <span className="text-sm text-slate-400">
                        Showing <strong className="text-white font-bold">{filteredEvents.length}</strong> of {EVENTS.length} shows
                    </span>
                    {(searchQuery || selectedCategory !== "All" || sortBy !== "featured") && (
                        <button
                            onClick={handleClearFilters}
                            className="text-xs text-brand-gold hover:underline font-medium flex items-center gap-1"
                        >
                            Reset All Filters <X className="w-3 h-3" />
                        </button>
                    )}
                </div>

                {/* Event Showcase Display (Grid or List Layout) */}
                {isLoading ? (
                    /* SKELETON LOADING STATE */
                    viewMode === "grid" ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <GridSkeletonCard key={i} />
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {[1, 2, 3, 4].map((i) => (
                                <ListSkeletonCard key={i} />
                            ))}
                        </div>
                    )
                ) : filteredEvents.length === 0 ? (
                    /* Zero Results Empty State Card */
                    <div className="bg-theatre-800/60 backdrop-blur-md border border-theatre-700/80 rounded-3xl p-12 text-center max-w-lg mx-auto shadow-2xl animate-in fade-in zoom-in duration-300">
                        <div className="w-16 h-16 bg-theatre-900 border border-theatre-600 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-500 shadow-inner">
                            <Music className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">No Matches Found</h3>
                        <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                            We couldn't find any tours matching <span className="text-brand-gold font-semibold">"{searchQuery}"</span> under the selected filters.
                        </p>
                        <button
                            onClick={handleClearFilters}
                            className="bg-brand-purple hover:bg-violet-600 text-white font-bold px-6 py-3 rounded-xl transition-all shadow-glow-purple"
                        >
                            Reset Search & View All Shows
                        </button>
                    </div>
                ) : viewMode === "grid" ? (
                    /* GRID VIEW (3 Columns) */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredEvents.map((show: EventData, idx: number) => (
                            <article
                                key={show.id}
                                style={{ animationDelay: `${idx * 75}ms` }}
                                className="group bg-theatre-800/85 backdrop-blur-md rounded-3xl overflow-hidden border border-theatre-700/80 hover:border-brand-purple/60 transition-all duration-500 hover:shadow-[0_15px_40px_rgba(124,58,237,0.25)] hover:-translate-y-2 flex flex-col justify-between"
                            >
                                <div>
                                    {/* Image Container with Dynamic Lighting */}
                                    <div className="relative aspect-[4/3] overflow-hidden bg-theatre-950">
                                        <div className="absolute inset-0 bg-gradient-to-t from-theatre-800 via-theatre-900/30 to-transparent z-10 opacity-80 group-hover:opacity-60 transition-opacity duration-500" />
                                        <EventImage
                                            src={show.image}
                                            alt={show.title}
                                            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                                        />
                                        
                                        {/* Floating Rating Tag */}
                                        <div className="absolute top-4 right-4 z-20 bg-black/60 backdrop-blur-md border border-white/15 px-3 py-1 rounded-full text-xs font-extrabold text-white flex items-center gap-1.5 shadow-lg">
                                            <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" /> {show.rating.toFixed(1)}
                                        </div>

                                        {/* Floating Category Tag */}
                                        <div className="absolute top-4 left-4 z-20 bg-brand-purple/80 backdrop-blur-md border border-white/20 px-3 py-1 rounded-full text-[11px] font-extrabold text-white tracking-wide uppercase shadow-lg">
                                            {show.category}
                                        </div>

                                        {/* Overlay Artist & Title */}
                                        <div className="absolute bottom-0 left-0 right-0 p-6 z-20">
                                            <div className="flex gap-1.5 mb-2 overflow-hidden">
                                                {show.tags.map((tag: string) => (
                                                    <span key={tag} className="px-2 py-0.5 bg-white/10 backdrop-blur-sm text-slate-200 text-[9px] font-bold uppercase tracking-wider rounded border border-white/10">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                            <h2 className="text-2xl font-extrabold text-white leading-tight group-hover:text-brand-gold transition-colors duration-300">
                                                {show.artist}
                                            </h2>
                                            <p className="text-sm text-slate-300 font-medium truncate">{show.title}</p>
                                        </div>
                                    </div>

                                    {/* Tour Meta Specifications */}
                                    <div className="p-6 pt-4 space-y-3 text-xs md:text-sm text-slate-300 border-b border-theatre-700/50">
                                        <div className="flex items-center gap-3">
                                            <Calendar className="w-4 h-4 text-brand-gold flex-shrink-0" />
                                            <span className="font-semibold text-white">{show.date}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Clock className="w-4 h-4 text-brand-purple flex-shrink-0" />
                                            <span>{show.time} (Gates Open 2 hours prior)</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <MapPin className="w-4 h-4 text-rose-400 flex-shrink-0" />
                                            <span className="truncate font-medium">{show.venue}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Card Footer & Action Trigger */}
                                <div className="p-6 pt-4 bg-theatre-900/40 flex items-center justify-between">
                                    <div>
                                        <span className="text-[11px] uppercase tracking-wider text-slate-400 block">Starting Price</span>
                                        <span className="text-2xl font-black text-brand-gold">{show.price}</span>
                                    </div>
                                    <Link
                                        to={`/book/${show.id}`}
                                        className="bg-brand-purple hover:bg-violet-500 text-white font-bold px-5 py-3 rounded-xl flex items-center gap-1.5 transition-all duration-300 shadow-lg shadow-brand-purple/25 hover:shadow-glow-purple active:scale-95 group/btn"
                                    >
                                        <span>{show.eventType === "general-admission" ? "Get Tickets" : "Select Seats"}</span>
                                        <ArrowUpRight className="w-4 h-4 transition-transform duration-300 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
                                    </Link>
                                </div>
                            </article>
                        ))}
                    </div>
                ) : (
                    /* LIST VIEW (Horizontal Cards) */
                    <div className="space-y-6">
                        {filteredEvents.map((show: EventData, idx: number) => (
                            <article
                                key={show.id}
                                style={{ animationDelay: `${idx * 50}ms` }}
                                className="group bg-theatre-800/85 backdrop-blur-md rounded-3xl overflow-hidden border border-theatre-700/80 hover:border-brand-purple/60 transition-all duration-300 hover:shadow-[0_10px_35px_rgba(124,58,237,0.2)] hover:-translate-y-1 p-4 md:p-6 flex flex-col md:flex-row items-center gap-6"
                            >
                                {/* Left Thumbnail */}
                                <div className="relative w-full md:w-64 h-52 md:h-44 rounded-2xl overflow-hidden flex-shrink-0 bg-theatre-950">
                                    <EventImage
                                        src={show.image}
                                        alt={show.title}
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                    />
                                    <div className="absolute top-3 left-3 bg-brand-purple/90 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-extrabold text-white uppercase tracking-wider">
                                        {show.category}
                                    </div>
                                    <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-full text-xs font-extrabold text-white flex items-center gap-1">
                                        <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" /> {show.rating.toFixed(1)}
                                    </div>
                                </div>

                                {/* Center Details */}
                                <div className="flex-1 w-full md:w-auto space-y-2">
                                    <div className="flex gap-2 mb-1">
                                        {show.tags.map((tag: string) => (
                                            <span key={tag} className="px-2 py-0.5 bg-brand-purple/20 text-brand-purple border border-brand-purple/30 text-[10px] font-bold uppercase tracking-wider rounded-md">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                    <h2 className="text-2xl md:text-3xl font-extrabold text-white group-hover:text-brand-gold transition-colors duration-300">
                                        {show.artist}
                                    </h2>
                                    <p className="text-sm text-slate-300 font-medium mb-3">{show.title}</p>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-300 pt-2 border-t border-theatre-700/60">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-brand-gold flex-shrink-0" />
                                            <span className="font-bold text-white">{show.date}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-brand-purple flex-shrink-0" />
                                            <span>{show.time}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <MapPin className="w-4 h-4 text-rose-400 flex-shrink-0" />
                                            <span className="truncate">{show.venue}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Action Column */}
                                <div className="w-full md:w-auto md:border-l md:border-theatre-700/80 md:pl-8 flex md:flex-col items-center md:items-end justify-between md:justify-center gap-4 py-2">
                                    <div className="text-left md:text-right">
                                        <span className="text-[11px] uppercase tracking-wider text-slate-400 block">Starting Price</span>
                                        <span className="text-2xl font-extrabold text-brand-gold">{show.price}</span>
                                    </div>
                                    <Link
                                        to={`/book/${show.id}`}
                                        className="bg-brand-purple hover:bg-violet-500 text-white font-bold px-6 py-3.5 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-brand-purple/30 hover:shadow-glow-purple active:scale-95 whitespace-nowrap"
                                    >
                                        <span>{show.eventType === "general-admission" ? "Get Tickets" : "Select Seats"}</span>
                                        <ArrowUpRight className="w-4 h-4" />
                                    </Link>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
