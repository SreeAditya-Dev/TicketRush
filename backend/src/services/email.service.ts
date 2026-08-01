import { Resend } from "resend";
import { config } from "../config";

export interface TicketEmailPayload {
  to: string;
  eventTitle: string;
  eventArtist: string;
  eventVenue: string;
  date: string;
  time: string;
  seatCodes: string[];
  totalAmount: number;
  paymentId: string;
}

export class EmailService {
  private resend: Resend;

  constructor() {
    this.resend = new Resend(config.resendApiKey);
  }

  async sendBookingReceipt(payload: TicketEmailPayload): Promise<boolean> {
    const {
      to,
      eventTitle,
      eventArtist,
      eventVenue,
      date,
      time,
      seatCodes,
      totalAmount,
      paymentId,
    } = payload;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background-color: #0b0c15; color: #e2e8f0; margin: 0; padding: 20px; }
          .card { max-width: 500px; margin: 0 auto; background-color: #1a1c2e; border: 1px solid #2d314a; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
          .header { background: linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%); padding: 32px 24px; text-align: center; }
          .header h1 { margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.025em; }
          .header p { margin: 8px 0 0; color: #fbbf24; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; }
          .body { padding: 24px; }
          .field { margin-bottom: 16px; }
          .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; margin-bottom: 4px; }
          .value { font-size: 15px; font-weight: 600; color: #ffffff; }
          .seats { background-color: #0f111d; border: 1px solid #2d314a; padding: 16px; border-radius: 12px; margin: 20px 0; }
          .seats-list { color: #fbbf24; font-size: 18px; font-weight: 700; }
          .footer { background-color: #0f111d; padding: 16px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #2d314a; }
          .amount-badge { display: inline-block; background-color: rgba(16, 185, 129, 0.2); color: #10b981; padding: 6px 12px; border-radius: 9999px; font-weight: 700; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <h1>Ticket Confirmed! 🎟️</h1>
            <p>${eventTitle} • ${eventArtist}</p>
          </div>
          <div class="body">
            <p style="font-size: 14px; color: #cbd5e1; line-height: 1.5;">
              Hi there, your payment was successful and your tickets have been secured for <strong>${eventTitle}</strong>! Present your booking confirmation at Gate 4A for entry.
            </p>
            
            <div class="seats">
              <div class="label">Your Reserved Seats</div>
              <div class="seats-list">${seatCodes.map((s) => s.replace("S", "")).join(", ")}</div>
            </div>

            <div style="display: table; width: 100%; margin-bottom: 12px;">
              <div style="display: table-cell; width: 50%;">
                <div class="field">
                  <div class="label">Date & Time</div>
                  <div class="value">${date} at ${time}</div>
                </div>
              </div>
              <div style="display: table-cell; width: 50%;">
                <div class="field">
                  <div class="label">Venue</div>
                  <div class="value">${eventVenue}</div>
                </div>
              </div>
            </div>

            <div style="display: table; width: 100%;">
              <div style="display: table-cell; width: 50%;">
                <div class="field">
                  <div class="label">Total Paid</div>
                  <div class="amount-badge">₹${totalAmount}</div>
                </div>
              </div>
              <div style="display: table-cell; width: 50%;">
                <div class="field">
                  <div class="label">Payment Ref ID</div>
                  <div class="value" style="font-size: 12px; font-family: monospace;">${paymentId}</div>
                </div>
              </div>
            </div>
          </div>
          <div class="footer">
            TicketRush Powered by SreeAditya • Support: noreply@sreeaditya.tech
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      const result = await this.resend.emails.send({
        from: `TicketRush <${config.mailFrom}>`,
        to: [to],
        subject: `🎟️ Your Tickets for ${eventTitle} are Confirmed!`,
        html: htmlContent,
      });
      console.log(`✅ Email confirmation sent successfully via Resend to ${to}. Result:`, result);
      return true;
    } catch (error) {
      console.error(`❌ Failed to send confirmation email to ${to} via Resend:`, error);
      // We log but don't throw, as the booking itself is valid and shouldn't be rolled back over email delivery latency
      return false;
    }
  }
}

export const emailService = new EmailService();
