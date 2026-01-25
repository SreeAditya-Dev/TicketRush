import axios from "axios";
import { Seat, BookingStrategy } from "./types";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api/v1",
});

export const getSeats = async (
  eventId?: string,
  date?: string,
  time?: string,
): Promise<Seat[]> => {
  const params = new URLSearchParams();
  if (eventId) params.append("eventId", eventId);
  if (date) params.append("date", date);
  if (time) params.append("time", time);

  const response = await api.get<{ seats: Seat[] }>(
    `/seats?${params.toString()}`,
  );
  return response.data.seats;
};

export type BookSeatResult =
  | { ok: true; message: string; booking?: any }
  | { ok: false; message: string };

export const bookSeat = async (
  seatCode: string,
  userId: string,
  strategy: BookingStrategy,
  eventId: string,
  date: string,
  time: string,
): Promise<BookSeatResult> => {
  try {
    const response = await api.post("/book-seat", {
      seatCode,
      userId,
      strategy,
      eventId,
      date,
      time,
    });
    return {
      ok: true,
      message: response.data.message ?? "Booked",
      booking: response.data.booking,
    };
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      const msg =
        typeof error.response?.data?.message === "string"
          ? error.response.data.message
          : error.message;
      return { ok: false, message: msg };
    }
    return { ok: false, message: String(error) };
  }
};
