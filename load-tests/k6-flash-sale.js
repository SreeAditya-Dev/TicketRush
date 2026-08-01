import http from "k6/http";
import { check, sleep, group } from "k6";
import { Counter, Trend, Rate } from "k6/metrics";
import { SharedArray } from "k6/data";

// ==================== CONFIGURATION ====================
const BASE_URL = __ENV.API_URL || "http://localhost:4000";
const EVENT_ID = __ENV.EVENT_ID || "event-1";
const DATE = __ENV.DATE || "Fri, 06 Jun";
const TIME = __ENV.TIME || "04:30 PM";

// ==================== CUSTOM METRICS ====================
const bookingAttempts = new Counter("booking_attempts");
const bookingSuccesses = new Counter("booking_successes");
const bookingFailures = new Counter("booking_failures");
const seatHoldAttempts = new Counter("seat_hold_attempts");
const seatHoldSuccesses = new Counter("seat_hold_successes");
const holdDuration = new Trend("hold_duration_ms");
const bookingDuration = new Trend("booking_duration_ms");
const successRate = new Rate("booking_success_rate");

// ==================== TEST DATA ====================
const seats = new SharedArray("seats", function () {
  const arr = [];
  for (let i = 1; i <= 100; i++) {
    arr.push(`S${String(i).padStart(3, "0")}`);
  }
  return arr;
});

// ==================== TEST SCENARIOS ====================
export const options = {
  scenarios: {
    // Scenario 1: Flash Sale Burst (1000 users hitting at once)
    flash_sale_burst: {
      executor: "constant-arrival-rate",
      rate: 500, // 500 requests per second
      timeUnit: "1s",
      duration: "10s",
      preAllocatedVUs: 200,
      maxVUs: 500,
      exec: "flashSaleBurst",
      tags: { scenario: "flash_sale" },
    },

    // Scenario 2: Sustained Load (Continuous booking attempts)
    sustained_load: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "10s", target: 50 },  // Ramp up
        { duration: "30s", target: 50 },  // Sustain
        { duration: "10s", target: 0 },   // Ramp down
      ],
      startTime: "15s",
      exec: "sustainedLoad",
      tags: { scenario: "sustained" },
    },

    // Scenario 3: Stress Test (Push to limits)
    stress_test: {
      executor: "ramping-arrival-rate",
      startRate: 10,
      timeUnit: "1s",
      preAllocatedVUs: 100,
      maxVUs: 1000,
      stages: [
        { duration: "30s", target: 100 },  // Ramp to 100 RPS
        { duration: "30s", target: 200 },  // Ramp to 200 RPS
        { duration: "20s", target: 500 },  // Ramp to 500 RPS (stress)
        { duration: "10s", target: 0 },    // Ramp down
      ],
      startTime: "60s",
      exec: "stressTest",
      tags: { scenario: "stress" },
    },
  },

  thresholds: {
    http_req_duration: ["p(95)<1000", "p(99)<2000"], // 95% under 1s, 99% under 2s
    http_req_failed: ["rate<0.5"], // Less than 50% failed requests (due to overselling prevention)
    booking_success_rate: ["rate>0.05"], // At least 5% success (since 100 seats / 1000+ users)
    booking_duration_ms: ["p(95)<1500"],
  },
};

// ==================== HELPER FUNCTIONS ====================
function generateUserId() {
  return `k6_user_${__VU}_${__ITER}_${Date.now()}`;
}

function getRandomSeat() {
  return seats[Math.floor(Math.random() * seats.length)];
}

function getRandomSeats(count = 1) {
  const selected = [];
  const available = [...seats];
  for (let i = 0; i < count && available.length > 0; i++) {
    const idx = Math.floor(Math.random() * available.length);
    selected.push(available.splice(idx, 1)[0]);
  }
  return selected;
}

// ==================== TEST SCENARIOS ====================

/**
 * Scenario 1: Flash Sale Burst
 * Simulates 1000+ users clicking "Buy" at the exact same second
 */
export function flashSaleBurst() {
  const userId = generateUserId();
  const selectedSeats = getRandomSeats(Math.floor(Math.random() * 3) + 1); // 1-3 seats

  group("Flash Sale - Complete Booking Flow", function () {
    // Step 1: Hold seats
    seatHoldAttempts.add(1);
    const holdStart = Date.now();
    
    const holdRes = http.post(
      `${BASE_URL}/api/v1/hold-seats`,
      JSON.stringify({
        seatCodes: selectedSeats,
        eventId: EVENT_ID,
        date: DATE,
        time: TIME,
        userId: userId,
      }),
      {
        headers: { "Content-Type": "application/json" },
        tags: { name: "hold_seats" },
      }
    );

    const holdEnd = Date.now();
    holdDuration.add(holdEnd - holdStart);

    const holdSuccess = check(holdRes, {
      "hold: status 200": (r) => r.status === 200,
      "hold: has expiresIn": (r) => JSON.parse(r.body).expiresIn !== undefined,
    });

    if (holdSuccess) {
      seatHoldSuccesses.add(1);

      // Step 2: Simulate payment (if hold succeeded)
      sleep(Math.random() * 2 + 1); // 1-3 seconds thinking time

      // Step 3: Book seats
      bookingAttempts.add(1);
      const bookStart = Date.now();

      const bookRes = http.post(
        `${BASE_URL}/api/v1/book-seat`,
        JSON.stringify({
          seatCodes: selectedSeats,
          userId: userId,
          eventId: EVENT_ID,
          date: DATE,
          time: TIME,
          paymentId: `pay_k6_${Date.now()}`,
          orderId: `order_k6_${Date.now()}`,
        }),
        {
          headers: { "Content-Type": "application/json" },
          tags: { name: "book_seat" },
        }
      );

      const bookEnd = Date.now();
      bookingDuration.add(bookEnd - bookStart);

      const bookSuccess = check(bookRes, {
        "booking: status 200 or 409": (r) => r.status === 200 || r.status === 409,
        "booking: confirmed": (r) => r.status === 200,
      });

      if (bookRes.status === 200) {
        bookingSuccesses.add(1);
        successRate.add(1);
      } else {
        bookingFailures.add(1);
        successRate.add(0);
      }
    }
  });

  sleep(0.1);
}

/**
 * Scenario 2: Sustained Load
 * Simulates continuous booking attempts over time
 */
export function sustainedLoad() {
  const userId = generateUserId();
  const selectedSeats = getRandomSeats(1); // Single seat booking

  group("Sustained Load - Single Seat Booking", function () {
    bookingAttempts.add(1);

    const res = http.post(
      `${BASE_URL}/api/v1/book-seat`,
      JSON.stringify({
        seatCodes: selectedSeats,
        userId: userId,
        eventId: EVENT_ID,
        date: DATE,
        time: TIME,
        paymentId: `pay_k6_${Date.now()}`,
        orderId: `order_k6_${Date.now()}`,
      }),
      {
        headers: { "Content-Type": "application/json" },
        tags: { name: "sustained_booking" },
      }
    );

    check(res, {
      "sustained: status is 2xx or expected error": (r) =>
        (r.status >= 200 && r.status < 300) || r.status === 409 || r.status === 423,
    });

    if (res.status === 200) {
      bookingSuccesses.add(1);
      successRate.add(1);
    } else {
      bookingFailures.add(1);
      successRate.add(0);
    }
  });

  sleep(Math.random() * 2 + 0.5); // 0.5-2.5s between requests
}

/**
 * Scenario 3: Stress Test
 * Pushes the system to its limits to find breaking points
 */
export function stressTest() {
  const userId = generateUserId();
  const selectedSeats = getRandomSeats(Math.floor(Math.random() * 5) + 1); // 1-5 seats

  group("Stress Test - Multi-Seat Booking", function () {
    bookingAttempts.add(1);

    const res = http.post(
      `${BASE_URL}/api/v1/book-seat`,
      JSON.stringify({
        seatCodes: selectedSeats,
        userId: userId,
        eventId: EVENT_ID,
        date: DATE,
        time: TIME,
        paymentId: `pay_k6_stress_${Date.now()}`,
        orderId: `order_k6_stress_${Date.now()}`,
      }),
      {
        headers: { "Content-Type": "application/json" },
        timeout: "10s",
        tags: { name: "stress_booking" },
      }
    );

    const stressSuccess = check(res, {
      "stress: not timeout": (r) => r.status !== 0,
      "stress: response received": (r) => r.body.length > 0,
    });

    if (res.status === 200) {
      bookingSuccesses.add(1);
      successRate.add(1);
    } else if (stressSuccess) {
      bookingFailures.add(1);
      successRate.add(0);
    }
  });

  sleep(0.05); // Minimal sleep for max stress
}

// ==================== TEARDOWN ====================
export function handleSummary(data) {
  return {
    "summary.json": JSON.stringify(data),
    stdout: textSummary(data, { indent: " ", enableColors: true }),
  };
}

function textSummary(data, { indent = "", enableColors = false } = {}) {
  const colors = enableColors
    ? { reset: "\x1b[0m", green: "\x1b[32m", red: "\x1b[31m", yellow: "\x1b[33m" }
    : { reset: "", green: "", red: "", yellow: "" };

  return `
${colors.yellow}╔════════════════════════════════════════════════════════════════╗
║           🎫 TicketRush k6 Load Test Results 🎫              ║
╚════════════════════════════════════════════════════════════════╝${colors.reset}

${colors.green}📊 Overall Statistics:${colors.reset}
${indent}Total Requests: ${data.metrics.http_reqs?.values.count || 0}
${indent}Request Rate: ${(data.metrics.http_reqs?.values.rate || 0).toFixed(2)} req/s
${indent}Failed Requests: ${data.metrics.http_req_failed?.values.rate ? (data.metrics.http_req_failed.values.rate * 100).toFixed(2) : 0}%

${colors.green}🎯 Booking Metrics:${colors.reset}
${indent}Booking Attempts: ${data.metrics.booking_attempts?.values.count || 0}
${indent}Booking Successes: ${data.metrics.booking_successes?.values.count || 0}
${indent}Booking Failures: ${data.metrics.booking_failures?.values.count || 0}
${indent}Success Rate: ${data.metrics.booking_success_rate?.values.rate ? (data.metrics.booking_success_rate.values.rate * 100).toFixed(2) : 0}%

${colors.green}⏱️  Performance:${colors.reset}
${indent}Avg Response Time: ${data.metrics.http_req_duration?.values.avg?.toFixed(2) || 0}ms
${indent}P95 Response Time: ${data.metrics.http_req_duration?.values["p(95)"]?.toFixed(2) || 0}ms
${indent}P99 Response Time: ${data.metrics.http_req_duration?.values["p(99)"]?.toFixed(2) || 0}ms

${colors.yellow}════════════════════════════════════════════════════════════════${colors.reset}
`;
}
