import React, { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { EventData } from "../data/events";
import { fetchEvents } from "../api";
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
        <div className="relative w-full h-full bg-slate-100 overflow-hidden">
            {!imageLoaded && (
                <div className="absolute inset-0 bg-slate-200 animate-pulse flex items-center justify-center">
                    <Music className="w-8 h-8 text-slate-400 animate-pulse" />
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
        <div className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-xs flex flex-col justify-between animate-pulse">
            <div>
                <div className="relative aspect-[4/3] bg-slate-200 flex items-center justify-center">
                    <Music className="w-10 h-10 text-slate-300" />
                </div>
                <div className="p-6 pt-4 space-y-3 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full bg-slate-200 flex-shrink-0" />
                        <div className="h-3 bg-slate-200 rounded-md w-1/3" />
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full bg-slate-200 flex-shrink-0" />
                        <div className="h-3 bg-slate-200 rounded-md w-2/3" />
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full bg-slate-200 flex-shrink-0" />
                        <div className="h-3 bg-slate-200 rounded-md w-1/2" />
                    </div>
                </div>
            </div>
            <div className="p-6 pt-4 bg-slate-50 flex items-center justify-between">
                <div className="space-y-1.5">
                    <div className="h-2.5 w-20 bg-slate-200 rounded" />
                    <div className="h-6 w-24 bg-slate-200 rounded-md" />
                </div>
                <div className="h-12 w-32 bg-slate-200 rounded-xl" />
            </div>
        </div>
    );
}

// Skeleton card for List view while loading
function ListSkeletonCard() {
    return (
        <div className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-xs p-4 md:p-6 flex flex-col md:flex-row items-center gap-6 animate-pulse">
            <div className="w-full md:w-64 h-52 md:h-44 rounded-2xl bg-slate-200 flex items-center justify-center flex-shrink-0">
                <Music className="w-10 h-10 text-slate-300" />
            </div>
            <div className="flex-1 w-full md:w-auto space-y-3">
                <div className="flex gap-2">
                    <div className="h-5 w-16 bg-slate-200 rounded-md" />
                    <div className="h-5 w-20 bg-slate-200 rounded-md" />
                </div>
                <div className="h-8 w-3/4 bg-slate-200 rounded-md" />
                <div className="h-4 w-1/2 bg-slate-200 rounded-md mb-2" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100">
                    <div className="h-3 bg-slate-200 rounded-md w-4/5" />
                    <div className="h-3 bg-slate-200 rounded-md w-3/4" />
                    <div className="h-3 bg-slate-200 rounded-md w-full" />
                </div>
            </div>
            <div className="w-full md:w-auto md:border-l md:border-slate-100 md:pl-8 flex md:flex-col items-center md:items-end justify-between md:justify-center gap-4 py-2">
                <div className="space-y-1.5 text-left md:text-right">
                    <div className="h-2.5 w-20 bg-slate-200 rounded" />
                    <div className="h-7 w-24 bg-slate-200 rounded-md" />
                </div>
                <div className="h-12 w-36 bg-slate-200 rounded-xl" />
            </div>
        </div>
    );
}

export default function EventsPage() {
    const [events, setEvents] = useState<EventData[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [selectedCategory, setSelectedCategory] = useState<string>("All");
    const [sortBy, setSortBy] = useState<SortOption>("featured");
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

    // Fetch live events from PostgreSQL database via backend API
    useEffect(() => {
        setIsLoading(true);
        fetchEvents()
            .then(data => {
                setEvents(data);
                setIsLoading(false);
            })
            .catch(() => setIsLoading(false));
    }, []);

    // Memoized filtering and sorting engine for peak 60fps performance
    const filteredEvents = useMemo(() => {
        return events.filter((event: EventData) => {
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
    }, [events, searchQuery, selectedCategory, sortBy]);

    const handleClearFilters = () => {
        setSearchQuery("");
        setSelectedCategory("All");
        setSortBy("featured");
    };

    return (
        <div className="min-h-screen bg-[#f4f6f9] text-slate-700 pb-24 selection:bg-blue-600 selection:text-white overflow-x-hidden">
            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
                {/* Header Banner & Hero Text */}
                <section className="text-center md:text-left mb-12">
                    <h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tight leading-none mb-4 font-sans">
                        Explore Premier <span className="text-blue-600">Events</span>
                    </h1>
                    <p className="text-base md:text-lg text-slate-600 max-w-2xl font-normal leading-relaxed mb-6">
                        Discover sold-out stadium tours and intimate arena concerts. Protected by real-time atomic seating locks and instant digital PDF ticket fulfillment.
                    </p>
                </section>

                {/* Interactive Search & Filtering Console */}
                <section aria-label="Event Filter and Search" className="bg-white border border-slate-200 rounded-3xl p-6 shadow-md shadow-slate-200/60 mb-12 transition-all duration-300">
                    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-6">
                        {/* Instant Search Bar */}
                        <div className="relative flex-1 group">
                            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-600 transition-colors duration-200" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by artist, tour name, stadium, or genre tag..."
                                className="w-full bg-slate-50 border border-slate-300 rounded-2xl pl-12 pr-10 py-3.5 text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none text-sm font-medium transition-all shadow-2xs"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery("")}
                                    aria-label="Clear search query"
                                    className="absolute right-3.5 top-1/2 transform -translate-y-1/2 w-6 h-6 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        {/* Sort & Layout Controls */}
                        <div className="flex items-center gap-3 self-end md:self-center w-full md:w-auto justify-end">
                            <div className="relative flex items-center bg-slate-50 border border-slate-300 rounded-2xl px-4 py-1 flex-1 md:flex-initial shadow-2xs">
                                <SlidersHorizontal className="w-4 h-4 text-blue-600 mr-2 flex-shrink-0" />
                                <span className="text-xs font-semibold text-slate-500 mr-2 hidden sm:inline">Sort:</span>
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                                    className="bg-transparent border-none text-slate-900 text-sm font-bold focus:outline-none cursor-pointer py-2 pr-6"
                                    aria-label="Sort events by"
                                >
                                    <option value="featured" className="bg-white text-slate-900 font-medium">Featured Curated</option>
                                    <option value="rating-desc" className="bg-white text-slate-900 font-medium">Highest Rated ⭐</option>
                                    <option value="price-asc" className="bg-white text-slate-900 font-medium">Price: Low to High</option>
                                    <option value="price-desc" className="bg-white text-slate-900 font-medium">Price: High to Low</option>
                                </select>
                            </div>

                            {/* View Mode Toggle Switcher */}
                            <div className="flex bg-slate-100 border border-slate-200 p-1 rounded-2xl flex-shrink-0">
                                <button
                                    onClick={() => setViewMode("grid")}
                                    aria-label="Switch to Grid View"
                                    className={`p-2 rounded-xl transition-all duration-200 ${viewMode === "grid" ? "bg-blue-600 text-white shadow-2xs" : "text-slate-500 hover:text-slate-900"}`}
                                >
                                    <Grid className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setViewMode("list")}
                                    aria-label="Switch to List View"
                                    className={`p-2 rounded-xl transition-all duration-200 ${viewMode === "list" ? "bg-blue-600 text-white shadow-2xs" : "text-slate-500 hover:text-slate-900"}`}
                                >
                                    <ListIcon className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Category / Genre Pills Bar */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 mr-1 flex items-center gap-1 flex-shrink-0">
                            <Filter className="w-3.5 h-3.5 text-blue-600" /> Genre:
                        </span>
                        {CATEGORIES.map((cat) => {
                            const active = selectedCategory === cat;
                            return (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all duration-300 flex-shrink-0 whitespace-nowrap ${
                                        active
                                            ? "bg-blue-600 text-white shadow-md shadow-blue-600/20 scale-105"
                                            : "bg-white text-slate-600 border border-slate-200 hover:border-blue-300 hover:text-blue-600 hover:bg-slate-50 shadow-2xs"
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
                    <span className="text-sm text-slate-500 font-medium">
                        Showing <strong className="text-slate-900 font-black">{filteredEvents.length}</strong> of {events.length} shows
                    </span>
                    {(searchQuery || selectedCategory !== "All" || sortBy !== "featured") && (
                        <button
                            onClick={handleClearFilters}
                            className="text-xs text-blue-600 hover:underline font-bold flex items-center gap-1"
                        >
                            Reset All Filters <X className="w-3.5 h-3.5" />
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
                    <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center max-w-lg mx-auto shadow-lg animate-in fade-in zoom-in duration-300">
                        <div className="w-16 h-16 bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400 shadow-2xs">
                            <Music className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 mb-2">No Matches Found</h3>
                        <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                            We couldn't find any tours matching <span className="text-blue-600 font-semibold">"{searchQuery}"</span> under the selected filters.
                        </p>
                        <button
                            onClick={handleClearFilters}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl transition-all shadow-md shadow-blue-600/20"
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
                                className="group bg-white rounded-3xl overflow-hidden border border-slate-200 hover:border-blue-300 transition-all duration-500 hover:shadow-xl hover:shadow-slate-200/80 hover:-translate-y-1.5 flex flex-col justify-between"
                            >
                                <div>
                                    {/* Image Container */}
                                    <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                                        <EventImage
                                            src={show.image}
                                            alt={show.title}
                                            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                                        />
                                        
                                        {/* Floating Rating Tag */}
                                        <div className="absolute top-4 right-4 z-20 bg-white/90 backdrop-blur-md border border-slate-200 px-2.5 py-1 rounded-full text-xs font-bold text-slate-800 flex items-center gap-1 shadow-2xs">
                                            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" /> {show.rating.toFixed(1)}
                                        </div>

                                        {/* Floating Category Tag */}
                                        <div className="absolute top-4 left-4 z-20 bg-slate-900/90 backdrop-blur-md border border-slate-700 px-3 py-1 rounded-full text-[11px] font-extrabold text-white tracking-wide uppercase shadow-2xs">
                                            {show.category}
                                        </div>
                                    </div>

                                    {/* Tour Details */}
                                    <div className="p-6 pb-4">
                                        <div className="flex gap-1.5 mb-2 overflow-hidden flex-wrap">
                                            {show.tags.map((tag: string) => (
                                                <span key={tag} className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold uppercase tracking-wider rounded-md border border-slate-200/80">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                        <h2 className="text-2xl font-black text-slate-900 leading-tight group-hover:text-blue-600 transition-colors duration-300 mb-1">
                                            {show.artist}
                                        </h2>
                                        <p className="text-sm text-slate-500 font-medium truncate mb-4">{show.title}</p>

                                        {/* Tour Meta Specifications */}
                                        <div className="space-y-2 text-xs font-semibold text-slate-600 pt-4 border-t border-slate-100">
                                            <div className="flex items-center gap-2.5">
                                                <Calendar className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                                <span className="font-bold text-slate-900">{show.date}</span>
                                            </div>
                                            <div className="flex items-center gap-2.5">
                                                <Clock className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                                <span>{show.time} (Gates Open 2h prior)</span>
                                            </div>
                                            <div className="flex items-center gap-2.5">
                                                <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0 text-ellipsis overflow-hidden whitespace-nowrap" />
                                                <span className="truncate">{show.venue}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Card Footer & Action Trigger */}
                                <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between">
                                    <div>
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Starting Price</span>
                                        <span className="text-2xl font-black text-slate-900">{show.price}</span>
                                    </div>
                                    <Link
                                        to={`/book/${show.id}`}
                                        className="bg-slate-900 hover:bg-blue-600 text-white font-bold px-5 py-2.5 rounded-xl flex items-center gap-1.5 transition-all duration-300 shadow-xs active:scale-95 group/btn text-sm"
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
                                className="group bg-white rounded-3xl overflow-hidden border border-slate-200 hover:border-blue-300 transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/80 hover:-translate-y-1 p-4 md:p-6 flex flex-col md:flex-row items-center gap-6"
                            >
                                {/* Left Thumbnail */}
                                <div className="relative w-full md:w-64 h-52 md:h-44 rounded-2xl overflow-hidden flex-shrink-0 bg-slate-100">
                                    <EventImage
                                        src={show.image}
                                        alt={show.title}
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                    />
                                    <div className="absolute top-3 left-3 bg-slate-900/90 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-extrabold text-white uppercase tracking-wider shadow-2xs">
                                        {show.category}
                                    </div>
                                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md border border-slate-200 px-2.5 py-1 rounded-full text-xs font-bold text-slate-800 flex items-center gap-1 shadow-2xs">
                                        <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" /> {show.rating.toFixed(1)}
                                    </div>
                                </div>

                                {/* Center Details */}
                                <div className="flex-1 w-full md:w-auto space-y-2">
                                    <div className="flex gap-1.5 mb-1 flex-wrap">
                                        {show.tags.map((tag: string) => (
                                            <span key={tag} className="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200/80 text-[10px] font-bold uppercase tracking-wider rounded-md">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                    <h2 className="text-2xl md:text-3xl font-black text-slate-900 group-hover:text-blue-600 transition-colors duration-300">
                                        {show.artist}
                                    </h2>
                                    <p className="text-sm text-slate-500 font-medium mb-3">{show.title}</p>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-semibold text-slate-600 pt-3 border-t border-slate-100">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                            <span className="font-bold text-slate-900">{show.date}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                            <span>{show.time}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                            <span className="truncate">{show.venue}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Action Column */}
                                <div className="w-full md:w-auto md:border-l md:border-slate-100 md:pl-8 flex md:flex-col items-center md:items-end justify-between md:justify-center gap-4 py-2">
                                    <div className="text-left md:text-right">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Starting Price</span>
                                        <span className="text-2xl font-black text-slate-900">{show.price}</span>
                                    </div>
                                    <Link
                                        to={`/book/${show.id}`}
                                        className="bg-slate-900 hover:bg-blue-600 text-white font-bold px-6 py-3 rounded-xl flex items-center gap-2 transition-all shadow-xs active:scale-95 whitespace-nowrap text-sm"
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
