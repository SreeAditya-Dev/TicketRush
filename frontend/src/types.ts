export type Seat = {
  id: number;
  code: string;
  isBooked: boolean;
  bookedAt: string | null;
};

export type BookingStrategy = "locked" | "naive";
