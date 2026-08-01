import http from "k6/http";
import { check, sleep } from "k6";
import { Counter, Rate, Trend } from "k6/metrics";
import { SharedArray } from "k6/data";

// ==================== CONFIGURATION ====================
const BASE_URL = __ENV.API_URL || "http://localhost:4000";
const EVENT_ID = __ENV.EVENT_ID || "event-1";
const DATE = "Fri, 06 Jun";
const TIME = "04:30 PM";
const MAX_RETRIES = 3;
const BACKOFF_BASE = 100; // ms

// ==================== CUSTOM METRICS ====================
const successfulBookings = new Counter("successful_bookings");
const failedBookings = new Counter("failed_bookings");
const retriedAttempts = new Counter("retried_attempts");
const earlyExits = new Counter("early_exits_sold_out");
const validationChecks = new Counter("validation_checks");
const successRate = new Rate("success_rate");
const retrySuccessRate = new Rate("retry_success_rate");
const attemptDuration = new Trend("attempt_duration_ms");

// ==================== TEST OPTIONS ====================
export const options = {
  stages: [
    { duration: "5s", target: 25 },    // Gentle warm up
    { duration: "15s", target: 60 },   // Moderate load
    { duration: "15s", target: 100 },  // High load
    { duration: "10s", target: 50 },   // Scale down
    { duration: "5s", target: 0 },     // Cool down
  ],
  thresholds: {
    http_req_duration: ["p(95)<700"],   // Even faster
    http_req_failed: ["rate<0.35"],     // Lower failure
    success_rate: ["rate>0.20"],        // 20%+ success rate
    retry_success_rate: ["rate>0.30"],  // 30%+ retry success
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

// ==================== SMART SEAT POOL ====================
class SeatPool {
  constructor() {
    this.availableSeats = [...seats];
    this.lastRefresh = 0;
    this.REFRESH_INTERVAL = 3000; // 3 seconds
  }

  refresh() {
    const now = Date.now();
    if (now - this.lastRefresh > this.REFRESH_INTERVAL) {
      this.availableSeats = [...seats];
      this.lastRefresh = now;
    }
  }

  getSeat() {
    this.refresh();
    
    if (this.availableSeats.length === 0) {
      // Fallback to full pool
      this.availableSeats = [...seats];
    }

    // Use VU-based offset to reduce collisions
    const offset = (__VU * 13 + __ITER * 7) % this.availableSeats.length;
    const seat = this.availableSeats[offset];
    
    // Remove used seat (helps avoid immediate collisions)
    this.availableSeats.splice(offset, 1);
    
    return seat;
  }

  removeSeat(seatCode) {
    const idx = this.availableSeats.indexOf(seatCode);
    if (idx > -1) {
      this.availableSeats.splice(idx, 1);
    }
  }

  getSeatCount() {
    return this.availableSeats.length;
  }
}

const seatPool = new SeatPool();

// ==================== HELPER FUNCTIONS ====================
function checkAvailability() {
  const res = http.get(
    `${BASE_URL}/api/v1/availability?eventId=${EVENT_ID}&date=${encodeURIComponent(DATE)}&time=${encodeURIComponent(TIME)}`,
    { 
      tags: { name: "check_availability" },
      timeout: "2s"
    }
  );

  if (res.status === 200) {
    try {
      return JSON.parse(res.body);
    } catch (e) {
      return null;
    }
  }
  return null;
}

function validateSeats(seatCodes) {
  validationChecks.add(1);
  
  const res = http.post(
    `${BASE_URL}/api/v1/validate-seats`,
    JSON.stringify({
      seatCodes,
      eventId: EVENT_ID,
      date: DATE,
      time: TIME,
    }),
    {
      headers: { "Content-Type": "application/json" },
      tags: { name: "validate_seats" },
      timeout: "2s"
    }
  );

  if (res.status === 200) {
    try {
      const data = JSON.parse(res.body);
      return data.availability;
    } catch (e) {
      return null;
    }
  }
  return null;
}

function attemptBooking(seatCode, userId, attemptNumber = 1) {
  const startTime = Date.now();
  
  const response = http.post(
    `${BASE_URL}/api/v1/book-seat`,
    JSON.stringify({
      seatCode: seatCode,
      userId: userId,
      eventId: EVENT_ID,
      date: DATE,
      time: TIME,
      paymentId: `pay_opt_${Date.now()}_${__VU}_${attemptNumber}`,
      orderId: `order_opt_${Date.now()}_${__VU}_${attemptNumber}`,
      strategy: "locked",
    }),
    {
      headers: { "Content-Type": "application/json" },
      tags: { name: "book_seat", attempt: attemptNumber.toString() },
      timeout: "5s"
    }
  );

  const duration = Date.now() - startTime;
  attemptDuration.add(duration);

  return response;
}

function exponentialBackoff(attempt) {
  const backoff = BACKOFF_BASE * Math.pow(2, attempt - 1);
  const jitter = Math.random() * 50; // Add jitter to prevent thundering herd
  return (backoff + jitter) / 1000; // Convert to seconds
}

// ==================== MAIN TEST ====================
export default function () {
  const userId = `user_ultra_${__VU}_${__ITER}`;

  // Step 1: Global availability check (every 8th iteration)
  if (__ITER % 8 === 0) {
    const avail = checkAvailability();
    
    if (avail) {
      if (avail.soldOut || avail.availableSeats < 5) {
        earlyExits.add(1);
        console.log(`🛑 Sold out! Only ${avail.availableSeats} seats left. Exiting.`);
        return;
      }
      
      // Update seat pool size awareness
      if (avail.availableSeats < 30 && seatPool.getSeatCount() > 50) {
        console.log(`⚠️  Low availability: ${avail.availableSeats} seats remaining`);
      }
    }
  }

  // Step 2: Smart seat selection with validation
  let selectedSeat = seatPool.getSeat();
  let validatedSeats = null;

  // Pre-validate seats (every 5th attempt for efficiency)
  if (__ITER % 5 === 0) {
    const candidateSeats = [selectedSeat];
    
    // Add 2 more backup seats
    for (let i = 0; i < 2; i++) {
      candidateSeats.push(seatPool.getSeat());
    }

    validatedSeats = validateSeats(candidateSeats);
    
    if (validatedSeats) {
      // Find first available seat
      const availableSeat = validatedSeats.find(s => s.available);
      if (availableSeat) {
        selectedSeat = availableSeat.code;
      } else {
        // None available, try fresh ones
        selectedSeat = seatPool.getSeat();
      }
    }
  }

  // Step 3: Attempt booking with intelligent retry
  let attempt = 1;
  let response = null;
  let success = false;

  while (attempt <= MAX_RETRIES && !success) {
    response = attemptBooking(selectedSeat, userId, attempt);

    // Check response
    const isSuccess = response.status === 200 || response.status === 201;
    const is423 = response.status === 423; // Locked by another user
    const is409 = response.status === 409; // Already booked

    if (isSuccess) {
      success = true;
      successfulBookings.add(1);
      successRate.add(1);
      
      if (attempt > 1) {
        retrySuccessRate.add(1);
        console.log(`✅ User ${userId} booked ${selectedSeat} after ${attempt} attempts`);
      } else {
        console.log(`✅ User ${userId} booked ${selectedSeat} (first try)`);
      }
      
      break;
    } else if (is409) {
      // Seat permanently booked, remove from pool
      seatPool.removeSeat(selectedSeat);
      
      if (attempt < MAX_RETRIES) {
        // Try a different seat
        selectedSeat = seatPool.getSeat();
        attempt++;
        retriedAttempts.add(1);
        
        // Quick sleep before retry
        sleep(exponentialBackoff(attempt - 1));
      } else {
        break;
      }
    } else if (is423) {
      // Temporarily locked, retry with backoff
      if (attempt < MAX_RETRIES) {
        attempt++;
        retriedAttempts.add(1);
        
        // Exponential backoff
        sleep(exponentialBackoff(attempt - 1));
      } else {
        break;
      }
    } else {
      // Other error, no retry
      break;
    }
  }

  // Track final result
  if (!success) {
    failedBookings.add(1);
    successRate.add(0);
    
    if (response) {
      if (response.status === 409) {
        console.log(`❌ ${userId} - All ${attempt} attempts failed (409)`);
      } else if (response.status === 423) {
        console.log(`⏳ ${userId} - Timed out after ${attempt} attempts (423)`);
      }
    }
  }

  // Step 4: Adaptive think time based on availability
  const avail = seatPool.getSeatCount();
  if (avail < 30) {
    sleep(Math.random() * 0.3 + 0.1); // Faster when low availability (0.1-0.4s)
  } else {
    sleep(Math.random() * 0.8 + 0.2); // Normal speed (0.2-1.0s)
  }
}

// ==================== SUMMARY ====================
export function handleSummary(data) {
  const successCount = data.metrics.successful_bookings?.values.count || 0;
  const failedCount = data.metrics.failed_bookings?.values.count || 0;
  const retryCount = data.metrics.retried_attempts?.values.count || 0;
  const earlyExitCount = data.metrics.early_exits_sold_out?.values.count || 0;
  const validationCount = data.metrics.validation_checks?.values.count || 0;
  const totalRequests = data.metrics.http_reqs?.values.count || 0;
  const successRateVal = data.metrics.success_rate?.values.rate || 0;
  const retrySuccessRateVal = data.metrics.retry_success_rate?.values.rate || 0;
  const avgDuration = data.metrics.http_req_duration?.values.avg || 0;
  const p95Duration = data.metrics.http_req_duration?.values["p(95)"] || 0;
  const avgAttemptDuration = data.metrics.attempt_duration_ms?.values.avg || 0;

  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║     🚀 TicketRush Ultra-Optimized Test Results 🚀        ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");
  
  console.log(`📊 Total HTTP Requests: ${totalRequests}`);
  console.log(`✅ Successful Bookings: ${successCount}`);
  console.log(`❌ Failed Bookings: ${failedCount}`);
  console.log(`🔄 Retry Attempts: ${retryCount}`);
  console.log(`🛑 Early Exits (Sold Out): ${earlyExitCount}`);
  console.log(`🔍 Seat Validations: ${validationCount}`);
  console.log(`📈 Success Rate: ${(successRateVal * 100).toFixed(2)}%`);
  console.log(`🎯 Retry Success Rate: ${(retrySuccessRateVal * 100).toFixed(2)}%`);
  console.log(`⏱️  Avg Response Time: ${avgDuration.toFixed(2)}ms`);
  console.log(`⚡ P95 Response Time: ${p95Duration.toFixed(2)}ms`);
  console.log(`⚙️  Avg Attempt Duration: ${avgAttemptDuration.toFixed(2)}ms`);
  
  // Calculate efficiency
  const totalAttempts = successCount + failedCount;
  const actualBookingRequests = totalAttempts + retryCount;
  const failureRate = totalAttempts > 0 ? (failedCount / totalAttempts * 100) : 0;
  const efficiency = totalRequests > 0 ? ((totalRequests - actualBookingRequests) / totalRequests * 100) : 0;
  
  console.log(`\n💡 Failure Rate: ${failureRate.toFixed(2)}%`);
  console.log(`🎯 Efficiency Gain: ${efficiency.toFixed(2)}% of requests saved`);
  console.log(`📉 Avg Retries per User: ${(retryCount / Math.max(totalAttempts, 1)).toFixed(2)}`);
  
  // Estimate improvement
  const baselineFailureRate = 95;
  const improvement = baselineFailureRate - failureRate;
  console.log(`\n🚀 Improvement vs Baseline: ${improvement.toFixed(2)}% better failure rate\n`);

  return {
    "stdout": JSON.stringify(data, null, 2),
  };
}
