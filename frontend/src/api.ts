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

import { EventData } from "./data/events";

export const fetchEvents = async (): Promise<EventData[]> => {
  try {
    const response = await api.get<{ events: EventData[] }>("/events");
    return response.data.events || [];
  } catch (error) {
    console.error("Error fetching events from API:", error);
    return [];
  }
};

export const fetchEventById = async (id: string): Promise<EventData | null> => {
  try {
    const response = await api.get<{ event: EventData | null }>(`/events/${id}`);
    return response.data.event || null;
  } catch (error) {
    console.error("Error fetching event by id from API:", error);
    return null;
  }
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

export interface PaymentOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

export const createRazorpayOrder = async (
  amount: number,
  eventId: string,
  seats: string[],
  metadata: Record<string, any> = {}
): Promise<{ ok: true; data: PaymentOrderResponse } | { ok: false; message: string }> => {
  try {
    const response = await api.post<PaymentOrderResponse>("/payment/create-order", {
      amount,
      eventId,
      seats,
      ...metadata,
    });
    return { ok: true, data: response.data };
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

export interface VerifyPaymentPayload {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  seatCodes: string[];
  userId: string;
  email: string;
  eventId: string;
  eventTitle: string;
  eventArtist: string;
  eventVenue: string;
  date: string;
  time: string;
  totalAmount: number;
}

export const verifyAndConfirmBooking = async (
  payload: VerifyPaymentPayload
): Promise<{ ok: true; message: string; emailSent?: boolean; bookings?: any[] } | { ok: false; message: string }> => {
  try {
    const response = await api.post("/payment/verify-and-book", payload);
    return {
      ok: true,
      message: response.data?.message || "Booking confirmed",
      emailSent: response.data?.emailSent,
      bookings: response.data?.bookings,
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

export const holdSeats = async (
  seatCodes: string[],
  eventId: string,
  date: string,
  time: string,
  userId: string
): Promise<{ ok: boolean; message: string; expiresIn?: number }> => {
  try {
    const response = await api.post("/hold-seats", { seatCodes, eventId, date, time, userId });
    return { ok: true, message: response.data?.message || "Held", expiresIn: response.data?.expiresIn || 300 };
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      const msg = typeof error.response?.data?.message === "string" ? error.response.data.message : error.message;
      return { ok: false, message: msg };
    }
    return { ok: false, message: String(error) };
  }
};

export const releaseHolds = async (
  seatCodes: string[],
  eventId: string,
  date: string,
  time: string,
  userId: string
): Promise<void> => {
  try {
    await api.post("/release-holds", { seatCodes, eventId, date, time, userId });
  } catch (error) {
    console.error("Failed to release holds:", error);
  }
};
