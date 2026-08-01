import Razorpay from "razorpay";
import crypto from "crypto";
import { config } from "../config";

export interface OrderBookingContext {
  eventId: string;
  seatCodes: string[];
  userId: string;
  email?: string;
  date: string;
  time: string;
  totalAmount: number;
  eventTitle?: string;
  eventArtist?: string;
  eventVenue?: string;
  strategy?: string;
}

export class PaymentService {
  private razorpay: Razorpay;
  // Dual-layer state reconciliation cache for asynchronous webhook delivery
  private pendingOrders: Map<string, OrderBookingContext> = new Map();

  constructor() {
    this.razorpay = new Razorpay({
      key_id: config.razorpayKeyId,
      key_secret: config.razorpayKeySecret,
    });
  }

  /**
   * Create a Razorpay order in INR paise with embedded order context in notes.
   */
  async createOrder(amountInRupees: number, receiptId: string, notes: Record<string, string> = {}): Promise<any> {
    const amountInPaise = Math.round(amountInRupees * 100);
    const options = {
      amount: amountInPaise,
      currency: "INR",
      receipt: receiptId,
      payment_capture: 1,
      notes,
    };
    return await this.razorpay.orders.create(options);
  }

  /**
   * Register order booking context into memory for webhook fallback recovery.
   */
  registerPendingOrder(orderId: string, context: OrderBookingContext): void {
    this.pendingOrders.set(orderId, context);
    console.log(`Registered pending order ${orderId} in reconciliation cache. Total pending: ${this.pendingOrders.size}`);
  }

  getPendingOrder(orderId: string): OrderBookingContext | undefined {
    return this.pendingOrders.get(orderId);
  }

  removePendingOrder(orderId: string): void {
    this.pendingOrders.delete(orderId);
  }

  /**
   * Verify the HMAC-SHA256 signature returned by frontend Razorpay Checkout redirect.
   */
  verifySignature(orderId: string, paymentId: string, razorpaySignature: string): boolean {
    const body = orderId + "|" + paymentId;
    const expectedSignature = crypto
      .createHmac("sha256", config.razorpayKeySecret)
      .update(body.toString())
      .digest("hex");
    return expectedSignature === razorpaySignature;
  }

  /**
   * Verify the HMAC-SHA256 signature from Razorpay background webhooks (X-Razorpay-Signature).
   */
  verifyWebhookSignature(rawBody: Buffer | string, signature: string): boolean {
    if (!config.razorpayWebhookSecret || !signature || !rawBody) return false;
    const bodyString = typeof rawBody === "string" ? rawBody : rawBody.toString("utf8");
    const expectedSignature = crypto
      .createHmac("sha256", config.razorpayWebhookSecret)
      .update(bodyString)
      .digest("hex");
    return expectedSignature === signature;
  }

  /**
   * Initiate an immediate refund in case seat booking fails post-payment due to concurrency.
   */
  async refundPayment(paymentId: string, reason: string = "Seat booking conflict after payment"): Promise<any> {
    try {
      console.log(`Initiating automated Razorpay refund for ${paymentId}. Reason: ${reason}`);
      return await this.razorpay.payments.refund(paymentId, {
        notes: { reason },
      });
    } catch (error) {
      console.error(`Failed to execute automatic Razorpay refund for payment ${paymentId}:`, error);
      throw error;
    }
  }
}

export const paymentService = new PaymentService();

