import { Link } from "react-router-dom";
import { Calendar, MapPin, Clock } from "lucide-react";

const SHOWS = [
    {
        id: "eras-tour",
        title: "The Eras Tour",
        artist: "Taylor Swift",
        date: "March 15, 2024",
        time: "8:00 PM",
        venue: "Wembley Stadium",
        image: "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?q=80&w=1000&auto=format&fit=crop",
        price: "From $150",
        tags: ["Pop", "Global Phenomenon"]
    },
    {
        id: "weeknd-after-hours",
        title: "After Hours Til Dawn",
        artist: "The Weeknd",
        date: "April 20, 2024",
        time: "9:00 PM",
        venue: "SoFi Stadium",
        image: "https://images.unsplash.com/photo-1459749411177-d4a414c9ff0f?q=80&w=1000&auto=format&fit=crop",
        price: "From $120",
        tags: ["R&B", "Synth-Pop"]
    },
    {
        id: "hans-zimmer-live",
        title: "Hans Zimmer Live",
        artist: "Hans Zimmer",
        date: "May 10, 2024",
        time: "7:30 PM",
        venue: "O2 Arena",
        image: "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?q=80&w=1000&auto=format&fit=crop",
        price: "From $85",
        tags: ["Orchestral", "Film Score"]
    }
];

export default function ShowList() {
    return (
        <div className="flex-1 w-full bg-slate-900">
            {/* Hero Section */}
            <div className="relative h-[50vh] min-h-[400px] w-full overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent z-10" />
                <img
                    src="https://images.unsplash.com/photo-1470229722913-7ea0510d9f38?q=80&w=2670&auto=format&fit=crop"
                    alt="Concert Hero"
                    className="w-full h-full object-cover opacity-60"
                />
                <div className="absolute bottom-0 left-0 z-20 w-full p-8 md:p-12">
                    <div className="max-w-7xl mx-auto">
                        <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-4 tracking-tight">
                            Live the Moment.
                        </h1>
                        <p className="text-xl md:text-2xl text-slate-300 max-w-2xl">
                            Experience the world's biggest artists in iconic venues.
                            Secure your spot before they're gone.
                        </p>
                    </div>
                </div>
            </div>

            {/* Shows Grid */}
            <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
                <h2 className="text-2xl font-bold text-white mb-8 flex items-center gap-2">
                    <span className="w-1 h-8 bg-indigo-500 rounded-full" />
                    Upcoming Events
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {SHOWS.map((show) => (
                        <div
                            key={show.id}
                            className="group relative bg-slate-800/50 rounded-2xl overflow-hidden hover:bg-slate-800 transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10 border border-slate-700/50 hover:border-indigo-500/50"
                        >
                            <div className="aspect-[4/3] overflow-hidden">
                                <img
                                    src={show.image}
                                    alt={show.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                            </div>

                            <div className="p-6">
                                <div className="flex gap-2 mb-3">
                                    {show.tags.map(tag => (
                                        <span key={tag} className="px-2 py-1 bg-indigo-500/10 text-indigo-400 text-xs font-medium rounded-full">
                                            {tag}
                                        </span>
                                    ))}
                                </div>

                                <h3 className="text-xl font-bold text-white mb-1 group-hover:text-indigo-400 transition-colors">
                                    {show.artist}
                                </h3>
                                <p className="text-lg text-slate-400 mb-4">{show.title}</p>

                                <div className="space-y-2 text-sm text-slate-400 mb-6">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-indigo-500" />
                                        {show.date}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-indigo-500" />
                                        {show.time}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-indigo-500" />
                                        {show.venue}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between mt-auto">
                                    <div className="text-white font-bold text-lg">
                                        {show.price}
                                    </div>
                                    <Link
                                        to={`/book/${show.id}`}
                                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg transition-colors"
                                    >
                                        Buy Tickets
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
