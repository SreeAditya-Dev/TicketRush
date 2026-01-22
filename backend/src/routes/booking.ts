import { Prisma, PrismaClient } from "@prisma/client";
import { Router } from "express";
import { bookingAttempts, bookingFailedOversold, bookingSuccess, startDbTimer } from "../metrics";
import { prisma } from "../prisma";
import { acquireLock, releaseLock } from "../redis";
import { config } from "../config";

type Strategy = "naive" | "locked";

type Booking = Awaited<ReturnType<PrismaClient["booking"]["create"]>>;

type BookingResult =
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

const bookSeatNaive = async (seatCode: string, userId: string): Promise<BookingResult> => {
  const stopTimer = startDbTimer();
  try {
    const seat = await prisma.seat.findUnique({ where: { code: seatCode } });
    if (!seat) {
      return { ok: false, status: 404, message: "Seat not found" };
    }

    if (seat.isBooked) {
      return { ok: false, status: 409, message: "Seat already booked" };
    }

    const booking = await prisma.booking.create({ data: { userId, seatId: seat.id } });
    await prisma.seat.update({
      where: { id: seat.id },
      data: { isBooked: true, bookedAt: new Date() }
    });

    return { ok: true, booking };
  } catch (error: unknown) {
    if (isPrismaError(error) && error.code === "P2002") {
      return { ok: false, status: 409, message: "Seat already booked" };
    }
    throw error;
  } finally {
    stopTimer();
  }
};

const bookSeatWithLock = async (
  seatCode: string,
  userId: string
): Promise<BookingResult> => {
  const stopTimer = startDbTimer();
  try {
    const result = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const seat = await tx.seat.findUnique({ where: { code: seatCode } });
        if (!seat) {
          return { ok: false, status: 404, message: "Seat not found" } as const;
        }

        if (seat.isBooked) {
          return { ok: false, status: 409, message: "Seat already booked" } as const;
        }

        const booking = await tx.booking.create({ data: { userId, seatId: seat.id } });
        await tx.seat.update({
          where: { id: seat.id },
          data: { isBooked: true, bookedAt: new Date() }
        });

        return { ok: true, booking } as const;
      },
      { isolationLevel: "Serializable" }
    );

    return result as BookingResult;
  } catch (error: unknown) {
    if (isPrismaError(error) && error.code === "P2002") {
      return { ok: false, status: 409, message: "Seat already booked" };
    }
    throw error;
  } finally {
    stopTimer();
  }
};

bookingRouter.get("/seats", async (_req, res) => {
  const seats = await prisma.seat.findMany({ orderBy: { id: "asc" } });
  res.json({ seats });
});

bookingRouter.post("/book-seat", async (req, res) => {
  const seatCode = typeof req.body?.seatCode === "string" ? req.body.seatCode : "";
  const userId = typeof req.body?.userId === "string" ? req.body.userId : "";
  const strategy = parseStrategy(req.body?.strategy);

  if (!seatCode || !userId) {
    return res.status(400).json({ message: "seatCode and userId are required" });
  }

  bookingAttempts.inc();

  const lockKey = `${config.seatLockPrefix}${seatCode}`;
  let hasLock = false;

  try {
    if (strategy === "locked") {
      hasLock = await acquireLock(lockKey, config.lockTtlSeconds);
      if (!hasLock) {
        bookingFailedOversold.inc();
        return res
          .status(423)
          .json({ message: "Seat is currently being booked by someone else" });
      }
    }

    const result =
      strategy === "locked"
        ? await bookSeatWithLock(seatCode, userId)
        : await bookSeatNaive(seatCode, userId);

    if (!result.ok) {
      if (result.status === 409) {
        bookingFailedOversold.inc();
      }
      return res.status(result.status).json({ message: result.message });
    }

    bookingSuccess.inc();
    return res.status(201).json({ message: "Seat booked", booking: result.booking });
  } catch (error) {
    console.error("Failed to book seat", error);
    return res.status(500).json({ message: "Internal server error" });
  } finally {
    if (hasLock) {
      await releaseLock(lockKey);
    }
  }
});

export { bookingRouter };
