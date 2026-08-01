import { Prisma, PrismaClient } from "@prisma/client";
import { Router } from "express";
import { bookingAttempts, bookingFailedOversold, bookingSuccess, startDbTimer } from "../metrics";
import { prisma } from "../prisma";
import { redis, acquireLock, releaseLock } from "../redis";
import { config } from "../config";

export type Strategy = "naive" | "locked";

export type Booking = Awaited<ReturnType<PrismaClient["booking"]["create"]>>;

export type BookingResult =
  | { ok: true; booking: Booking }
  | { ok: false; status: number; message: string };

const isPrismaError = (err: unknown): err is { code: string } => {
  return typeof err === "object" && err !== null && "code" in err;
};

const bookingRouter = Router();

const parseStrategy = (value?: string): Strategy => {
  if (value === "naive") return "naive";
  return "locked";
};

const bookSeatNaive = async (seatCode: string, userId: string, eventId: string, date: string, time: string): Promise<BookingResult> => {
  const stopTimer = startDbTimer();
  try {
    const seat = await prisma.seat.findUnique({ where: { code: seatCode } });
    if (!seat) {
      return { ok: false, status: 404, message: "Seat not found" };
    }

    const existingBooking = await prisma.booking.findFirst({
        where: {
            seatId: seat.id,
            eventId,
            date,
            time
        }
    });

    if (existingBooking) {
      return { ok: false, status: 409, message: "Seat already booked for this time" };
    }

    const booking = await prisma.booking.create({ 
        data: { userId, seatId: seat.id, eventId, date, time } 
    });

    return { ok: true, booking };
  } catch (error: unknown) {
    if (isPrismaError(error) && (error.code === "P2002" || error.code === "P2034")) {
      return { ok: false, status: 409, message: "Seat already booked for this time" };
    }
    throw error;
  } finally {
    stopTimer();
  }
};

const bookSeatWithLock = async (
  seatCode: string,
  userId: string,
  eventId: string,
  date: string,
  time: string
): Promise<BookingResult> => {
  const stopTimer = startDbTimer();
  try {
    const result = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const seat = await tx.seat.findUnique({ where: { code: seatCode } });
        if (!seat) {
          return { ok: false, status: 404, message: "Seat not found" } as const;
        }

        const existingBooking = await tx.booking.findFirst({
            where: {
                seatId: seat.id,
                eventId,
                date,
                time
            }
        });

        if (existingBooking) {
          return { ok: false, status: 409, message: "Seat already booked for this time" } as const;
        }

        const booking = await tx.booking.create({ 
            data: { userId, seatId: seat.id, eventId, date, time } 
        });

        return { ok: true, booking } as const;
      },
      { isolationLevel: "Serializable" }
    );

    return result as BookingResult;
  } catch (error: unknown) {
    if (isPrismaError(error) && (error.code === "P2002" || error.code === "P2034")) {
      return { ok: false, status: 409, message: "Seat already booked for this time" };
    }
    throw error;
  } finally {
    stopTimer();
  }
};

bookingRouter.get("/seats", async (req, res) => {
  const eventId = typeof req.query.eventId === 'string' ? req.query.eventId : '';
  const date = typeof req.query.date === 'string' ? req.query.date : '';
  const time = typeof req.query.time === 'string' ? req.query.time : '';

  const seats = await prisma.seat.findMany({ orderBy: { id: "asc" } });
  
  if (eventId && date && time) {
      const bookings = await prisma.booking.findMany({
          where: { eventId, date, time }
      });
      const bookedSeatIds = new Set(bookings.map(b => b.seatId));
      
      // Check temporary 5-minute Redis holds
      const holdKeys = seats.map(s => `seat_hold:${s.code}:${eventId}:${date}:${time}`);
      const holdValues = await redis.mget(holdKeys);

      const seatsWithStatus = seats.map((s, idx) => {
          const isBooked = bookedSeatIds.has(s.id);
          const heldBy = holdValues[idx];
          return {
              ...s,
              isBooked,
              isHeld: !isBooked && Boolean(heldBy),
              heldBy: !isBooked ? heldBy : null,
              bookedAt: null
          };
      });
      return res.json({ seats: seatsWithStatus });
  }

  // Default fallback if no eventId provided (show all open)
  const seatsWithStatus = seats.map(s => ({ ...s, isBooked: false, isHeld: false, heldBy: null, bookedAt: null }));
  res.json({ seats: seatsWithStatus });
});

// New endpoint: Quick availability check (optimized for load tests)
bookingRouter.get("/availability", async (req, res) => {
  const eventId = typeof req.query.eventId === 'string' ? req.query.eventId : '';
  const date = typeof req.query.date === 'string' ? req.query.date : '';
  const time = typeof req.query.time === 'string' ? req.query.time : '';

  if (!eventId || !date || !time) {
    return res.status(400).json({ message: "eventId, date, and time are required" });
  }

  try {
    // Count total bookings
    const bookingCount = await prisma.booking.count({
      where: { eventId, date, time }
    });

    // Get total seats
    const totalSeats = await prisma.seat.count();
    const availableSeats = totalSeats - bookingCount;
    const soldOut = availableSeats <= 0;

    return res.json({ 
      totalSeats,
      bookedSeats: bookingCount,
      availableSeats: Math.max(0, availableSeats),
      soldOut,
      availabilityPercentage: ((availableSeats / totalSeats) * 100).toFixed(2)
    });
  } catch (error) {
    console.error("Error checking availability:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

bookingRouter.post("/hold-seats", async (req, res) => {
  try {
    const { seatCodes, eventId, date, time, userId = "user_guest" } = req.body || {};
    if (!Array.isArray(seatCodes) || seatCodes.length === 0 || !eventId || !date || !time) {
      return res.status(400).json({ message: "seatCodes, eventId, date, and time are required" });
    }

    // 1. Verify none of the seats are already permanently sold in PostgreSQL
    const seatsInDb = await prisma.seat.findMany({ where: { code: { in: seatCodes } } });
    const seatIds = seatsInDb.map(s => s.id);
    const existingBookings = await prisma.booking.findMany({
      where: { seatId: { in: seatIds }, eventId, date, time }
    });
    if (existingBookings.length > 0) {
      return res.status(409).json({ ok: false, message: "One or more selected seats have already been purchased!" });
    }

    // 2. Try to acquire 5-minute (300s) Redis hold for each seat
    const acquiredHolds: string[] = [];
    for (const code of seatCodes) {
      const holdKey = `seat_hold:${code}:${eventId}:${date}:${time}`;
      const resSet = await redis.set(holdKey, userId, "EX", 300, "NX");
      if (resSet === "OK") {
        acquiredHolds.push(holdKey);
      } else {
        const currentHolder = await redis.get(holdKey);
        if (currentHolder === userId) {
          // Refresh TTL to 300s for same user
          await redis.expire(holdKey, 300);
          acquiredHolds.push(holdKey);
        } else {
          // Conflict! Held by someone else in checkout
          if (acquiredHolds.length > 0) {
            await redis.del(acquiredHolds);
          }
          return res.status(423).json({
            ok: false,
            message: `Seat ${code.replace("S", "")} is currently being reserved by another customer in checkout. Please choose a different seat or check back in 5 minutes.`
          });
        }
      }
    }

    return res.status(200).json({ ok: true, message: "Seats reserved for 5 minutes", expiresIn: 300 });
  } catch (error) {
    console.error("Error holding seats:", error);
    return res.status(500).json({ message: "Internal server error during seat reservation" });
  }
});

bookingRouter.post("/release-holds", async (req, res) => {
  try {
    const { seatCodes, eventId, date, time } = req.body || {};
    if (Array.isArray(seatCodes) && eventId && date && time) {
      const keysToDel = seatCodes.map(code => `seat_hold:${code}:${eventId}:${date}:${time}`);
      await redis.del(keysToDel);
    }
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Error releasing holds:", error);
    return res.status(500).json({ message: "Internal server error releasing holds" });
  }
});

export const executeSeatBooking = async (
  seatCode: string,
  userId: string,
  eventId: string,
  date: string,
  time: string,
  strategy: Strategy
): Promise<BookingResult> => {
  bookingAttempts.inc();
  
  // Early availability check to reduce database load
  const seat = await prisma.seat.findUnique({ where: { code: seatCode } });
  if (!seat) {
    bookingFailedOversold.inc();
    return { ok: false, status: 404, message: "Seat not found" };
  }

  // Quick check if already booked (reduces lock contention)
  const existingBooking = await prisma.booking.findFirst({
    where: { seatId: seat.id, eventId, date, time }
  });
  
  if (existingBooking) {
    bookingFailedOversold.inc();
    return { ok: false, status: 409, message: "Seat already booked for this time" };
  }

  const lockKey = `${config.seatLockPrefix}${seatCode}:${eventId}:${date}:${time}`;
  let hasLock = false;

  try {
    if (strategy === "locked") {
      hasLock = await acquireLock(lockKey, config.lockTtlSeconds);
      if (!hasLock) {
        bookingFailedOversold.inc();
        return { ok: false, status: 423, message: "Seat is currently being booked by someone else" };
      }
    }

    const result =
      strategy === "locked"
        ? await bookSeatWithLock(seatCode, userId, eventId, date, time)
        : await bookSeatNaive(seatCode, userId, eventId, date, time);

    if (!result.ok && result.status === 409) {
      bookingFailedOversold.inc();
    }
    if (result.ok) {
      bookingSuccess.inc();
      // Clear temporary hold key upon confirmed purchase
      const holdKey = `seat_hold:${seatCode}:${eventId}:${date}:${time}`;
      await redis.del(holdKey);
    }
    return result;
  } finally {
    if (hasLock) {
      await releaseLock(lockKey);
    }
  }
};

bookingRouter.post("/book-seat", async (req, res) => {
  const seatCode = typeof req.body?.seatCode === "string" ? req.body.seatCode : "";
  const userId = typeof req.body?.userId === "string" ? req.body.userId : "";
  const eventId = typeof req.body?.eventId === "string" ? req.body.eventId : "";
  const date = typeof req.body?.date === "string" ? req.body.date : "";
  const time = typeof req.body?.time === "string" ? req.body.time : "";
  const strategy = parseStrategy(req.body?.strategy);

  if (!seatCode || !userId || !eventId || !date || !time) {
    return res.status(400).json({ message: "seatCode, userId, eventId, date, and time are required" });
  }

  try {
    const result = await executeSeatBooking(seatCode, userId, eventId, date, time, strategy);
    if (!result.ok) {
      return res.status(result.status).json({ message: result.message });
    }
    return res.status(201).json({ message: "Seat booked", booking: result.booking });
  } catch (error) {
    console.error("Failed to book seat", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export { bookingRouter };
