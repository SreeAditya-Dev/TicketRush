export type Seat = {
  id: number;
  code: string;
  isBooked: boolean;
  isHeld?: boolean;
  heldBy?: string | null;
  bookedAt: string | null;
};

export type BookingStrategy = "locked" | "naive";
