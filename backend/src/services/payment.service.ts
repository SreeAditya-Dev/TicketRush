import Razorpay from "razorpay";
import crypto from "crypto";
import { config } from "../config";

export class PaymentService {
  private razorpay: Razorpay;

  constructor() {
    this.razorpay = new Razorpay({
      key_id: config.razorpayKeyId,
      key_secret: config.razorpayKeySecret,
    });
  }

  /**
   * Create a Razorpay order in INR paise.
   * @param amountInRupees Total amount in Indian Rupees (₹)
   * @param receiptId Unique receipt ID (e.g. tracking token)
   */
  async createOrder(amountInRupees: number, receiptId: string): Promise<any> {
    const amountInPaise = Math.round(amountInRupees * 100);
    const options = {
      amount: amountInPaise,
      currency: "INR",
      receipt: receiptId,
      payment_capture: 1, // Auto capture payment
    };
    return await this.razorpay.orders.create(options);
  }

  /**
   * Verify the HMAC-SHA256 signature returned by Razorpay Checkout.
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
