import { Resend } from "resend";
import { config } from "../config";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";

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

/**
 * Generate a professional scannable PDF Gate Pass with embedded QR code.
 */
async function generateTicketPdfBuffer(payload: TicketEmailPayload): Promise<Buffer> {
  const { eventTitle, eventArtist, eventVenue, date, time, seatCodes, totalAmount, paymentId } = payload;
  const qrText = `TICKET-${eventTitle.replace(/\s+/g, "")}-${seatCodes.join("-")}-${paymentId}`;
  const qrDataUrl = await QRCode.toDataURL(qrText, { margin: 1, width: 200 });
  const qrImageBuffer = Buffer.from(qrDataUrl.split(",")[1], "base64");

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: [400, 550], margin: 30 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Background fill (Dark Theatre Theme)
    doc.rect(0, 0, 400, 550).fill("#0b0c15");
    doc.rect(15, 15, 370, 520).fill("#1a1c2e").stroke("#2d314a");

    // Header banner
    doc.rect(15, 15, 370, 95).fill("#7c3aed");
    doc.fillColor("#ffffff").fontSize(20).font("Helvetica-Bold").text("TICKET CONFIRMED", 25, 38, { align: "center" });
    doc.fillColor("#fbbf24").fontSize(12).text(`${eventArtist}`, 25, 68, { align: "center" });

    // Event title
    doc.fillColor("#ffffff").fontSize(18).font("Helvetica-Bold").text(eventTitle, 30, 130, { align: "center", width: 340 });
    
    // Perforation divider
    doc.moveTo(30, 175).lineTo(370, 175).strokeColor("#474f7a").dash(5, { space: 4 }).stroke();
    doc.undash();

    // Details grid
    doc.fillColor("#94a3b8").fontSize(10).font("Helvetica").text("DATE & TIME", 40, 195);
    doc.fillColor("#ffffff").fontSize(13).font("Helvetica-Bold").text(`${date} at ${time}`, 40, 210);

    doc.fillColor("#94a3b8").fontSize(10).font("Helvetica").text("VENUE", 40, 245);
    doc.fillColor("#ffffff").fontSize(13).font("Helvetica-Bold").text(eventVenue, 40, 260);

    doc.fillColor("#94a3b8").fontSize(10).font("Helvetica").text("RESERVED SEATS", 40, 295);
    doc.fillColor("#fbbf24").fontSize(14).font("Helvetica-Bold").text(seatCodes.map((s) => s.replace("S", "")).join(", "), 40, 310);

    doc.fillColor("#94a3b8").fontSize(10).font("Helvetica").text("TOTAL AMOUNT", 240, 295);
    doc.fillColor("#10b981").fontSize(14).font("Helvetica-Bold").text(`INR ${totalAmount}`, 240, 310);

    // QR Code for scanning
    doc.image(qrImageBuffer, 130, 345, { width: 140, height: 140 });

    // Footer info
    doc.fillColor("#64748b").fontSize(9).font("Helvetica").text(`Ref ID: ${paymentId}`, 20, 495, { align: "center" });
    doc.fillColor("#64748b").fontSize(9).text("Scan at Entry • Gate 4A • Powered by TicketRush", 20, 510, { align: "center" });

    doc.end();
  });
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
              Hi there, your payment was successful and your tickets have been secured for <strong>${eventTitle}</strong>! Your downloadable, scannable PDF Gate Pass has been attached directly to this email. Present it at Gate 4A for instant entry.
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

    let attachments: any = undefined;
    try {
      const pdfBuffer = await generateTicketPdfBuffer(payload);
      attachments = [
        {
          filename: `TicketRush-${eventTitle.replace(/[^a-zA-Z0-9]/g, "_")}-${seatCodes.map(s => s.replace("S", "")).join("_")}.pdf`,
          content: pdfBuffer,
        },
      ];
      console.log(`📄 Successfully generated server-side PDF Ticket pass buffer (${pdfBuffer.length} bytes)`);
    } catch (pdfError) {
      console.error("⚠️ Could not attach PDF ticket buffer, proceeding with HTML email:", pdfError);
    }

    try {
      const result = await this.resend.emails.send({
        from: `TicketRush <${config.mailFrom}>`,
        to: [to],
        subject: `🎟️ Your Tickets for ${eventTitle} are Confirmed!`,
        html: htmlContent,
        attachments,
      });
      console.log(`✅ Email confirmation & PDF ticket sent successfully via Resend to ${to}. Result:`, result);
      return true;
    } catch (error) {
      console.error(`❌ Failed to send confirmation email to ${to} via Resend:`, error);
      return false;
    }
  }
}

export const emailService = new EmailService();

