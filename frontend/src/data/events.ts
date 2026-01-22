export interface EventData {
    id: string;
    title: string;
    artist: string;
    date: string;
    time: string;
    venue: string;
    image: string;
    price: string;
    tags: string[];
    rating: number;
}

export const EVENTS: EventData[] = [
    {
        id: "eras-tour",
        title: "The Eras Tour",
        artist: "Taylor Swift",
        date: "Fri, 06 Jun",
        time: "07:00 PM",
        venue: "Wembley Stadium",
        image: "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?q=80&w=1000&auto=format&fit=crop",
        price: "From ₹350",
        tags: ["Pop", "Global Phenomenon"],
        rating: 4.9
    },
    {
        id: "coldplay-spheres",
        title: "Music of the Spheres",
        artist: "Coldplay",
        date: "Sat, 07 Jun",
        time: "08:00 PM",
        venue: "O2 Arena",
        image: "https://images.unsplash.com/photo-1493225255756-d9584f8606e9?q=80&w=1000&auto=format&fit=crop",
        price: "From ₹400",
        tags: ["Alternative", "Visual Spectacle"],
        rating: 4.8
    },
    {
        id: "weeknd-after-hours",
        title: "After Hours Til Dawn",
        artist: "The Weeknd",
        date: "Sun, 08 Jun",
        time: "09:00 PM",
        venue: "SoFi Stadium",
        image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=1000&auto=format&fit=crop",
        price: "From ₹310",
        tags: ["R&B", "Synth-Pop"],
        rating: 4.7
    },
    {
        id: "ed-sheeran-math",
        title: "+–=÷x Tour",
        artist: "Ed Sheeran",
        date: "Mon, 09 Jun",
        time: "07:30 PM",
        venue: "MSG",
        image: "https://images.unsplash.com/photo-1501612780327-45045538702b?q=80&w=1000&auto=format&fit=crop",
        price: "From ₹250",
        tags: ["Acoustic", "Pop"],
        rating: 4.6
    }
];

export const getEventById = (id: string): EventData | undefined => {
    return EVENTS.find(event => event.id === id);
};
