import dotenv from "dotenv";

dotenv.config();

const parseNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const config = {
  port: parseNumber(process.env.PORT, 4000),
  databaseUrl:
    process.env.DATABASE_URL ??
    "postgresql://ticketrush:ticketrush@localhost:5432/ticketrush",
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  lockTtlSeconds: parseNumber(process.env.LOCK_TTL_SECONDS, 10),
  seatLockPrefix: "seat_lock:",
  razorpayKeyId: process.env.RAZORPAY_KEY_ID ?? "rzp_test_TBk2cz1k0IdiW4",
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET ?? "",
  razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET ?? "ticketrush_wh_test_secret",
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  mailFrom: process.env.MAIL_FROM ?? "noreply@sreeaditya.tech",
  nodeEnv: process.env.NODE_ENV ?? "development",
};
