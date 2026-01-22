import axios from "axios";
import { Seat, BookingStrategy } from "./types";

const api = axios.create({ baseURL: "/api/v1" });

export const getSeats = async (): Promise<Seat[]> => {
  const response = await api.get<{ seats: Seat[] }>("/seats");
  return response.data.seats;
};

export type BookSeatResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

export const bookSeat = async (
  seatCode: string,
  userId: string,
  strategy: BookingStrategy
): Promise<BookSeatResult> => {
  try {
    const response = await api.post("/book-seat", { seatCode, userId, strategy });
    return { ok: true, message: response.data.message ?? "Booked" };
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
