import http from "k6/http";
import { check, sleep } from "k6";
import { Counter, Rate } from "k6/metrics";

// ==================== CONFIGURATION ====================
const BASE_URL = __ENV.API_URL || "http://localhost:4000";
const EVENT_ID = __ENV.EVENT_ID || "event-1";

// ==================== CUSTOM METRICS ====================
const successfulBookings = new Counter("successful_bookings");
const failedBookings = new Counter("failed_bookings");
const successRate = new Rate("success_rate");

// ==================== TEST OPTIONS ====================
export const options = {
  stages: [
    { duration: "10s", target: 50 },   // Warm up: Ramp to 50 users
    { duration: "30s", target: 100 },  // Load test: 100 concurrent users
    { duration: "20s", target: 200 },  // Stress: 200 concurrent users
    { duration: "10s", target: 0 },    // Cool down
  ],
  thresholds: {
    http_req_duration: ["p(95)<1000"], // 95% of requests under 1s
    http_req_failed: ["rate<0.6"],     // Less than 60% failures
    success_rate: ["rate>0.05"],       // At least 5% success rate
  },
};

// ==================== TEST DATA ====================
const seats = [];
for (let i = 1; i <= 100; i++) {
  seats.push(`S${String(i).padStart(3, "0")}`);
}

// ==================== MAIN TEST ====================
export default function () {
  const userId = `user_${__VU}_${__ITER}`;
  const seatCode = seats[Math.floor(Math.random() * seats.length)];
  const numSeats = Math.floor(Math.random() * 2) + 1; // 1-2 seats
  const selectedSeats = [seatCode];

  // Try to book a seat
  const response = http.post(
    `${BASE_URL}/api/v1/book-seat`,
    JSON.stringify({
      seatCodes: selectedSeats,
      userId: userId,
      eventId: EVENT_ID,
      date: "Fri, 06 Jun",
      time: "04:30 PM",
      paymentId: `pay_test_${Date.now()}`,
      orderId: `order_test_${Date.now()}`,
    }),
    {
      headers: { "Content-Type": "application/json" },
    }
  );

  // Check response
  const success = check(response, {
    "status is 200": (r) => r.status === 200,
    "status is expected error (409/423)": (r) => r.status === 409 || r.status === 423,
  });

  // Track metrics
  if (response.status === 200) {
    successfulBookings.add(1);
    successRate.add(1);
    console.log(`✅ User ${userId} booked seat ${seatCode}`);
  } else {
    failedBookings.add(1);
    successRate.add(0);
    if (response.status === 409) {
      console.log(`❌ User ${userId} - Seat ${seatCode} already booked (409)`);
    } else if (response.status === 423) {
      console.log(`⏳ User ${userId} - Seat ${seatCode} locked by another user (423)`);
    }
  }

  sleep(Math.random() * 2 + 0.5); // Random think time: 0.5-2.5s
}

// ==================== SUMMARY ====================
export function handleSummary(data) {
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║         🎫 TicketRush Quick Load Test Results 🎫         ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");
  
  console.log(`📊 Total Requests: ${data.metrics.http_reqs?.values.count || 0}`);
  console.log(`✅ Successful Bookings: ${data.metrics.successful_bookings?.values.count || 0}`);
  console.log(`❌ Failed Bookings: ${data.metrics.failed_bookings?.values.count || 0}`);
  console.log(`📈 Success Rate: ${((data.metrics.success_rate?.values.rate || 0) * 100).toFixed(2)}%`);
  console.log(`⏱️  Avg Response Time: ${(data.metrics.http_req_duration?.values.avg || 0).toFixed(2)}ms`);
  console.log(`⚡ P95 Response Time: ${(data.metrics.http_req_duration?.values["p(95)"] || 0).toFixed(2)}ms\n`);

  return {
    "stdout": JSON.stringify(data, null, 2),
  };
}
