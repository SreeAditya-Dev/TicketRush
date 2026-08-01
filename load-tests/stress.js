import http from "k6/http";
import { check, sleep } from "k6";
import { SharedArray } from "k6/data";

const BASE_URL = __ENV.API_URL || "http://localhost:4000";
const STRATEGY = __ENV.STRATEGY || "locked";

const seats = new SharedArray("seats", function () {
  const arr = [];
  for (let i = 1; i <= 100; i++) {
    arr.push(`S${String(i).padStart(3, "0")}`);
  }
  return arr;
});

export const options = {
  vus: 100,
  iterations: 500,
  thresholds: {
    http_req_duration: ["p(95)<500"]
  }
};

export default function () {
  const seatCode = seats[Math.floor(Math.random() * seats.length)];
  const userId = `k6_user_${__VU}_${__ITER}`;

  const res = http.post(
    `${BASE_URL}/api/v1/book-seat`,
    JSON.stringify({ seatCode, userId, strategy: STRATEGY, eventId: "event-1", date: "2025-01-01", time: "20:00" }),
    { headers: { "Content-Type": "application/json" } }
  );

  const checkRes = check(res, {
    "status is 2xx or known error": (r) => r.status >= 200 && r.status < 500
  });

  if (!checkRes || res.status >= 400) {
      console.log(`Failed: ${res.status} ${res.body}`);
  }

  sleep(0.1);
}
