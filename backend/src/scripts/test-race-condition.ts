import express from "express";
import cors from "cors";
import { bookingRouter } from "../routes/booking";
import { prisma } from "../prisma";
import { redis } from "../redis";

const PORT = 4055;
const BASE_URL = `http://localhost:${PORT}/api/v1`;
const SEAT_CODE = "TEST_S999";
const EVENT_ID = "RACE_TEST_EVENT";
const DATE = "2026-08-15";
const TIME = "18:00";

const runConcurrencyTest = async (strategy: "naive" | "locked") => {
  console.log(`\n======================================================`);
  console.log(`🚀 STARTING CONCURRENCY RACE CONDITION TEST [Strategy: ${strategy.toUpperCase()}]`);
  console.log(`Simulating 20 users trying to book seat ${SEAT_CODE} simultaneously at exact same instant...`);
  console.log(`======================================================`);

  // Reset any existing bookings for this test event and seat
  await prisma.booking.deleteMany({
    where: { eventId: EVENT_ID, date: DATE, time: TIME }
  });

  const CONCURRENT_USERS = 20;
  const requests = Array.from({ length: CONCURRENT_USERS }, (_, idx) => {
    const userId = `user_${idx + 1}`;
    return fetch(`${BASE_URL}/book-seat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        seatCode: SEAT_CODE,
        userId,
        eventId: EVENT_ID,
        date: DATE,
        time: TIME,
        strategy
      })
    }).then(async (res) => ({
      status: res.status,
      body: await res.json(),
      userId
    }));
  });

  const results = await Promise.all(requests);

  const successes = results.filter((r) => r.status === 201);
  const conflicts = results.filter((r) => r.status === 409 || r.status === 423);
  const errors = results.filter((r) => r.status !== 201 && r.status !== 409 && r.status !== 423);

  console.log(`\n📊 RESULTS SUMMARY [${strategy.toUpperCase()}]:`);
  console.log(`✅ Successful Bookings (Status 201): ${successes.length} (Expected: EXACTLY 1)`);
  if (successes.length === 1) {
    console.log(`   -> Winning user: ${successes[0].userId}`);
  }
  console.log(`🛡️ Blocked / Prevented by Race Condition Protection (Status 409/423): ${conflicts.length} (Expected: 19)`);
  if (errors.length > 0) {
    console.log(`⚠️ Other unexpected errors:`, errors);
  }

  // Double-check the actual database record count to be 100% sure no double booking slipped into the DB
  const dbBookings = await prisma.booking.findMany({
    where: { eventId: EVENT_ID, date: DATE, time: TIME }
  });
  console.log(`\n🗄️ Database Audit Check:`);
  console.log(`Total bookings registered in PostgreSQL for this seat/event: ${dbBookings.length}`);

  if (successes.length === 1 && dbBookings.length === 1 && conflicts.length === (CONCURRENT_USERS - 1)) {
    console.log(`\n🏆 [PASSED]: Race condition completely prevented! Two or more persons CANNOT book the same seat!`);
  } else {
    console.error(`\n❌ [FAILED]: Double booking or unexpected error detected!`);
    process.exitCode = 1;
  }
};

const main = async () => {
  // Setup express server for testing
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use("/api/v1", bookingRouter);

  const server = app.listen(PORT, async () => {
    try {
      console.log(`Test Express server listening on port ${PORT}...`);

      // Ensure test seat exists
      await prisma.seat.upsert({
        where: { code: SEAT_CODE },
        update: {},
        create: { code: SEAT_CODE }
      });

      // Run tests for both locked (Redis + DB) and naive (DB Unique Constraint) strategies
      await runConcurrencyTest("locked");
      await runConcurrencyTest("naive");

    } catch (err) {
      console.error("Test execution failed:", err);
    } finally {
      // Clean up test seat and bookings
      await prisma.booking.deleteMany({ where: { eventId: EVENT_ID } });
      await prisma.seat.deleteMany({ where: { code: SEAT_CODE } });

      await prisma.$disconnect();
      await redis.quit();
      server.close();
    }
  });
};

main();
