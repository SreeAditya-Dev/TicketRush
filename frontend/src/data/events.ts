export interface EventData {
    id: string;
    title: string;
    artist: string;
    date: string;
    time: string;
    venue: string;
    image: string;
    price: string;
    priceValue: number;
    category: string;
    tags: string[];
    rating: number;
    eventType?: "seated" | "general-admission";
}

// All event details have been pushed to the PostgreSQL database and are now fetched dynamically via the backend API.
export const EVENTS: EventData[] = [];
