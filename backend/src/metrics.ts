import client from "prom-client";

const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry });

export const bookingAttempts = new client.Counter({
  name: "booking_attempts_total",
  help: "Number of booking attempts",
  registers: [registry]
});

export const bookingSuccess = new client.Counter({
  name: "booking_success_total",
  help: "Number of successful bookings",
  registers: [registry]
});

export const bookingFailedOversold = new client.Counter({
  name: "booking_failed_oversold",
  help: "Bookings blocked because the seat was already booked",
  registers: [registry]
});

export const dbQueryDuration = new client.Histogram({
  name: "db_query_duration_seconds",
  help: "Duration of database operations in seconds",
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  registers: [registry]
});

export const startDbTimer = (): (() => void) => dbQueryDuration.startTimer();

export const metricsRegistry = registry;
