import { Router } from "express";
import { paymentService } from "../services/payment.service";
import { emailService } from "../services/email.service";
import { executeSeatBooking, Strategy } from "./booking";
import { config } from "../config";
import crypto from "crypto";

const paymentRouter = Router();

/**
 * Route: POST /api/v1/payment/create-order
 * Generates a Razorpay Order ID for online checkout.
 */
paymentRouter.post("/payment/create-order", async (req, res) => {
  try {
    const amount = Number(req.body?.amount);
    const eventId = typeof req.body?.eventId === "string" ? req.body.eventId : "event";
    const seats = Array.isArray(req.body?.seats) ? req.body.seats : [];

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ message: "Invalid payment amount" });
    }

    // Razorpay requires `receipt` to be at most 40 characters,
    // so sanitize/truncate the eventId and use a compact base36 timestamp.
    const safeEventId = eventId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 10);
    const receiptId = `rcpt_${safeEventId}_${Date.now().toString(36)}_${crypto.randomBytes(3).toString("hex")}`;
    const order = await paymentService.createOrder(amount, receiptId);

    return res.status(200).json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: config.razorpayKeyId,
    });
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    return res.status(500).json({ message: "Failed to initialize payment gateway order" });
  }
});

/**
 * Route: POST /api/v1/payment/verify-and-book
 * Verifies Razorpay payment signature, safely reserves seats, and sends Resend confirmation email.
 */
paymentRouter.post("/payment/verify-and-book", async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      seatCodes,
      userId,
      email,
      eventId,
      eventTitle,
      eventArtist,
      eventVenue,
      date,
      time,
      totalAmount,
      strategy = "locked",
    } = req.body || {};

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: "Missing Razorpay payment validation parameters" });
    }

    if (!Array.isArray(seatCodes) || seatCodes.length === 0 || !eventId || !date || !time) {
      return res.status(400).json({ message: "Missing required booking details" });
    }

    // 1. Verify Razorpay HMAC-SHA256 signature
    const isSignatureValid = paymentService.verifySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isSignatureValid) {
      console.error(`🚨 Possible fraud detected! Invalid payment signature for order ${razorpay_order_id}`);
      return res.status(400).json({ message: "Cryptographic signature verification failed" });
    }

    // 2. Safely execute seat booking for all seats
    const bookedResults = [];
    for (const seatCode of seatCodes) {
      const result = await executeSeatBooking(
        seatCode,
        userId || "user_guest",
        eventId,
        date,
        time,
        strategy as Strategy
      );

      if (!result.ok) {
        // A seat was taken during checkout! Initiate automated Razorpay refund immediately.
        console.error(`❌ Seat ${seatCode} already taken post-payment. Initiating automatic refund for ${razorpay_payment_id}`);
        try {
          await paymentService.refundPayment(
            razorpay_payment_id,
            `Seat ${seatCode} already booked by someone else`
          );
        } catch (refundError) {
          console.error("Refund error during conflict resolution:", refundError);
        }

        return res.status(409).json({
          ok: false,
          message: `Seat ${seatCode.replace("S", "")} was booked moments before payment completion. Your payment has been automatically refunded via Razorpay.`,
        });
      }
      bookedResults.push(result.booking);
    }

    // 3. Send confirmation email receipt if email was provided
    let emailSent = false;
    if (typeof email === "string" && email.includes("@")) {
      emailSent = await emailService.sendBookingReceipt({
        to: email,
        eventTitle: eventTitle || "Event",
        eventArtist: eventArtist || "Live Performance",
        eventVenue: eventVenue || "Stadium",
        date,
        time,
        seatCodes,
        totalAmount: Number(totalAmount) || 0,
        paymentId: razorpay_payment_id,
      });
    }

    return res.status(200).json({
      ok: true,
      message: "Payment verified and tickets confirmed!",
      bookings: bookedResults,
      emailSent,
    });
  } catch (error) {
    console.error("Error confirming booking after payment:", error);
    return res.status(500).json({ message: "Internal server error during payment verification" });
  }
});

export { paymentRouter };
