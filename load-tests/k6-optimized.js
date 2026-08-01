import http from "k6/http";
import { check, sleep } from "k6";
import { Counter, Rate } from "k6/metrics";
import { SharedArray } from "k6/data";

// ==================== CONFIGURATION ====================
const BASE_URL = __ENV.API_URL || "http://localhost:4000";
const EVENT_ID = __ENV.EVENT_ID || "event-1";
const DATE = "Fri, 06 Jun";
const TIME = "04:30 PM";

// ==================== CUSTOM METRICS ====================
const successfulBookings = new Counter("successful_bookings");
const failedBookings = new Counter("failed_bookings");
const earlyExits = new Counter("early_exits_sold_out");
const successRate = new Rate("success_rate");

// ==================== TEST OPTIONS ====================
export const options = {
  stages: [
    { duration: "5s", target: 30 },    // Warm up
    { duration: "20s", target: 80 },   // Moderate load
    { duration: "15s", target: 120 },  // High load
    { duration: "10s", target: 60 },   // Scale down
    { duration: "5s", target: 0 },     // Cool down
  ],
  thresholds: {
    http_req_duration: ["p(95)<800"],   // Faster threshold
    http_req_failed: ["rate<0.4"],      // Lower failure rate
    success_rate: ["rate>0.15"],        // Better success rate (15%+)
  },
};

// ==================== SEAT DATA ====================
const seats = new SharedArray("seats", function () {
  const arr = [];
  for (let i = 1; i <= 100; i++) {
    arr.push(`S${String(i).padStart(3, "0")}`);
  }
  return arr;
});

// ==================== SMART SEAT SELECTION ====================
let availableSeatsCache = [...seats];
let cacheTimestamp = 0;
const CACHE_TTL = 2000; // 2 seconds

function getSmartSeat() {
  // Use jitter to spread seat selection across range
  const now = Date.now();
  if (now - cacheTimestamp > CACHE_TTL) {
    // Reset cache periodically
    availableSeatsCache = [...seats];
    cacheTimestamp = now;
  }

  if (availableSeatsCache.length === 0) {
    // Fallback to random if cache empty
    return seats[Math.floor(Math.random() * seats.length)];
  }

  // Remove and return a seat
  const idx = Math.floor(Math.random() * availableSeatsCache.length);
  return availableSeatsCache.splice(idx, 1)[0];
}

// ==================== MAIN TEST ====================
export default function () {
  // Step 1: Quick availability check (every 10th user)
  if (__ITER % 10 === 0) {
    const availRes = http.get(
      `${BASE_URL}/api/v1/availability?eventId=${EVENT_ID}&date=${encodeURIComponent(DATE)}&time=${encodeURIComponent(TIME)}`,
      { tags: { name: "check_availability" } }
    );

    if (availRes.status === 200) {
      try {
        const availData = JSON.parse(availRes.body);
        if (availData.soldOut || availData.availableSeats < 5) {
          earlyExits.add(1);
          console.log(`🛑 Event sold out or nearly full (${availData.availableSeats} left). Exiting early.`);
          return; // Exit early if sold out
        }
      } catch (e) {
        // Continue if parse fails
      }
    }
  }

  const userId = `user_${__VU}_${__ITER}`;
  const seatCode = getSmartSeat(); // Smart seat selection

  // Step 2: Try to book the seat
  const response = http.post(
    `${BASE_URL}/api/v1/book-seat`,
    JSON.stringify({
      seatCode: seatCode,
      userId: userId,
      eventId: EVENT_ID,
      date: DATE,
      time: TIME,
      paymentId: `pay_test_${Date.now()}_${__VU}`,
      orderId: `order_test_${Date.now()}_${__VU}`,
      strategy: "locked",
    }),
    {
      headers: { "Content-Type": "application/json" },
      tags: { name: "book_seat" },
    }
  );

  // Step 3: Check response
  const success = check(response, {
    "status is 200": (r) => r.status === 200,
    "status is expected error": (r) => r.status === 409 || r.status === 423,
    "not server error": (r) => r.status < 500,
  });

  // Step 4: Track metrics
  if (response.status === 200) {
    successfulBookings.add(1);
    successRate.add(1);
    console.log(`✅ User ${userId} booked seat ${seatCode}`);
  } else {
    failedBookings.add(1);
    successRate.add(0);
    
    if (response.status === 409) {
      // Remove from cache since it's confirmed booked
      const idx = availableSeatsCache.indexOf(seatCode);
      if (idx > -1) availableSeatsCache.splice(idx, 1);
    }
  }

  // Step 5: Realistic think time (shorter than before)
  sleep(Math.random() * 1 + 0.3); // 0.3-1.3s (faster users)
}

// ==================== SUMMARY ====================
export function handleSummary(data) {
  const successCount = data.metrics.successful_bookings?.values.count || 0;
  const failedCount = data.metrics.failed_bookings?.values.count || 0;
  const earlyExitCount = data.metrics.early_exits_sold_out?.values.count || 0;
  const totalRequests = data.metrics.http_reqs?.values.count || 0;
  const successRateVal = data.metrics.success_rate?.values.rate || 0;
  const avgDuration = data.metrics.http_req_duration?.values.avg || 0;
  const p95Duration = data.metrics.http_req_duration?.values["p(95)"] || 0;

  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║      🎫 TicketRush Optimized Load Test Results 🎫        ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");
  
  console.log(`📊 Total Requests: ${totalRequests}`);
  console.log(`✅ Successful Bookings: ${successCount}`);
  console.log(`❌ Failed Bookings: ${failedCount}`);
  console.log(`🛑 Early Exits (Sold Out): ${earlyExitCount}`);
  console.log(`📈 Success Rate: ${(successRateVal * 100).toFixed(2)}%`);
  console.log(`⏱️  Avg Response Time: ${avgDuration.toFixed(2)}ms`);
  console.log(`⚡ P95 Response Time: ${p95Duration.toFixed(2)}ms`);
  
  // Failure reduction calculation
  const totalAttempts = successCount + failedCount;
  const failureRate = totalAttempts > 0 ? (failedCount / totalAttempts * 100) : 0;
  console.log(`\n💡 Failure Rate: ${failureRate.toFixed(2)}% (Lower is better)`);
  console.log(`🎯 Efficiency: ${totalAttempts} actual booking attempts (${earlyExitCount} avoided)\n`);

  return {
    "stdout": JSON.stringify(data, null, 2),
  };
}
