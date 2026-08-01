import { Router, Request, Response } from "express";
import { paymentService, OrderBookingContext } from "../services/payment.service";
import { emailService } from "../services/email.service";
import { executeSeatBooking, Strategy } from "./booking";
import { config } from "../config";
import crypto from "crypto";

const paymentRouter = Router();

/**
 * Route: POST /api/v1/payment/create-order
 * Generates a Razorpay Order ID and caches booking context for dual-layer webhook reconciliation.
 */
paymentRouter.post("/payment/create-order", async (req: Request, res: Response) => {
  try {
    const amount = Number(req.body?.amount);
    const eventId = typeof req.body?.eventId === "string" ? req.body.eventId : "event";
    const seats = Array.isArray(req.body?.seats) ? req.body.seats : [];
    const {
      userId = "user_guest",
      email = "",
      date = "N/A",
      time = "N/A",
      eventTitle = "Live Event",
      eventArtist = "Artist",
      eventVenue = "Stadium",
      strategy = "locked",
    } = req.body || {};

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ message: "Invalid payment amount" });
    }

    const safeEventId = eventId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 10);
    const receiptId = `rcpt_${safeEventId}_${Date.now().toString(36)}_${crypto.randomBytes(3).toString("hex")}`;
    
    // Construct lightweight notes for Razorpay (each field max 256 chars)
    const notes: Record<string, string> = {
      eventId: String(eventId).slice(0, 250),
      userId: String(userId).slice(0, 250),
      seatCount: String(seats.length),
      seats: seats.join(",").slice(0, 250),
      date: String(date).slice(0, 100),
      time: String(time).slice(0, 100),
    };
    if (email) notes.email = String(email).slice(0, 250);
    if (eventTitle) notes.eventTitle = String(eventTitle).slice(0, 250);

    const order = await paymentService.createOrder(amount, receiptId, notes);

    // Register full context into server reconciliation storage
    const context: OrderBookingContext = {
      eventId,
      seatCodes: seats,
      userId,
      email,
      date,
      time,
      totalAmount: amount,
      eventTitle,
      eventArtist,
      eventVenue,
      strategy,
    };
    paymentService.registerPendingOrder(order.id, context);

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
 * Verifies Razorpay payment signature, safely reserves seats, and sends Resend confirmation email + PDF pass.
 */
paymentRouter.post("/payment/verify-and-book", async (req: Request, res: Response) => {
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

    // 3. Clean up pending order from reconciliation store since checkout completed normally
    paymentService.removePendingOrder(razorpay_order_id);

    // 4. Send confirmation email receipt & PDF Gate Pass if email was provided
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

/**
 * Internal worker logic to process captured payments via webhook or simulation
 */
async function reconcileCapturedPayment(orderId: string, paymentId: string, payloadNotes?: any): Promise<{ ok: boolean; message: string }> {
  let context = paymentService.getPendingOrder(orderId);

  // If memory cache didn't have it, attempt recovery from Razorpay notes
  if (!context && payloadNotes && payloadNotes.seats && payloadNotes.eventId) {
    console.log(`Reconstructing order context from Razorpay notes for order ${orderId}...`);
    context = {
      eventId: payloadNotes.eventId,
      seatCodes: payloadNotes.seats.split(",").filter(Boolean),
      userId: payloadNotes.userId || "user_guest",
      email: payloadNotes.email || "",
      date: payloadNotes.date || "N/A",
      time: payloadNotes.time || "N/A",
      totalAmount: 0,
      eventTitle: payloadNotes.eventTitle || "Event",
    };
  }

  if (!context || !context.seatCodes || context.seatCodes.length === 0) {
    console.warn(`Webhook: Could not find pending order context for ${orderId}. Payment ${paymentId} acknowledged.`);
    return { ok: false, message: "Context unverified or already processed" };
  }

  console.log(`⚡ Webhook Reconciliation Triggered: Confirming ${context.seatCodes.length} seats for order ${orderId}`);

  for (const seatCode of context.seatCodes) {
    const result = await executeSeatBooking(
      seatCode,
      context.userId,
      context.eventId,
      context.date,
      context.time,
      (context.strategy as Strategy) || "locked"
    );

    if (!result.ok) {
      console.error(`Webhook reconciliation conflict for seat ${seatCode}. Initiating refund...`);
      try {
        await paymentService.refundPayment(paymentId, `Webhook seat conflict: ${seatCode}`);
      } catch (err) {
        console.error("Refund failure during webhook reconciliation:", err);
      }
      paymentService.removePendingOrder(orderId);
      return { ok: false, message: `Conflict on seat ${seatCode}, payment refunded.` };
    }
  }

  paymentService.removePendingOrder(orderId);

  if (context.email && context.email.includes("@")) {
    await emailService.sendBookingReceipt({
      to: context.email,
      eventTitle: context.eventTitle || "Event",
      eventArtist: context.eventArtist || "Live Performance",
      eventVenue: context.eventVenue || "Stadium",
      date: context.date,
      time: context.time,
      seatCodes: context.seatCodes,
      totalAmount: context.totalAmount,
      paymentId,
    });
  }

  return { ok: true, message: `Successfully reconciled order ${orderId} and dispatched PDF ticket via email.` };
}

/**
 * Route: POST /api/v1/payment/webhook
 * Asynchronous webhook handler for Razorpay events (payment.captured, payment.failed, refund.processed)
 */
paymentRouter.post("/payment/webhook", async (req: any, res: Response) => {
  try {
    const signature = req.headers["x-razorpay-signature"] as string;
    const isValid = paymentService.verifyWebhookSignature(req.rawBody || JSON.stringify(req.body), signature);

    if (!isValid && config.nodeEnv === "production") {
      console.error("🚨 Webhook signature authentication failed!");
      return res.status(400).json({ message: "Invalid cryptographic webhook signature" });
    }

    const event = req.body?.event;
    const entity = req.body?.payload?.payment?.entity || {};
    const orderId = entity.order_id;
    const paymentId = entity.id;

    console.log(`📩 Received Razorpay Webhook event: [${event}] for Order: ${orderId || "N/A"}`);

    if (event === "payment.captured") {
      await reconcileCapturedPayment(orderId, paymentId, entity.notes);
    } else if (event === "payment.failed") {
      console.warn(`❌ Webhook reported payment failure for order ${orderId}`);
      if (orderId) paymentService.removePendingOrder(orderId);
    } else if (event === "refund.processed") {
      console.log(`💵 Webhook confirmed refund processed for payment ${paymentId}`);
    }

    return res.status(200).json({ status: "ok" });
  } catch (err) {
    console.error("Error processing Razorpay webhook:", err);
    return res.status(500).json({ message: "Webhook execution error" });
  }
});

/**
 * Route: POST /api/v1/payment/webhook-test
 * Developer simulation endpoint for testing webhook reconciliation locally without ngrok or external tunnels.
 */
paymentRouter.post("/payment/webhook-test", async (req: Request, res: Response) => {
  if (config.nodeEnv === "production") {
    return res.status(403).json({ message: "Webhook simulator is disabled in production environments." });
  }

  try {
    const orderId = req.body?.order_id || req.body?.orderId;
    const paymentId = req.body?.payment_id || req.body?.paymentId || `SIMULATED_PAY_${Date.now()}`;
    const notes = req.body?.notes;

    if (!orderId) {
      return res.status(400).json({ message: "order_id is required to simulate payment.captured webhook" });
    }

    console.log(`🧪 [DEV SIMULATOR] Simulating payment.captured webhook for Order: ${orderId}`);
    const result = await reconcileCapturedPayment(orderId, paymentId, notes);

    return res.status(result.ok ? 200 : 409).json(result);
  } catch (err: any) {
    console.error("Error in webhook test simulator:", err);
    return res.status(500).json({ message: "Simulator failure", error: err.message });
  }
});

export { paymentRouter };

