/**
 * Email service for sending order confirmation emails
 * Uses Resend API (https://resend.com) - 3000 free emails/month
 */

interface OrderDetails {
  orderId: string;
  purchaserName: string;
  email: string;
  total: number;
  cartItems: string;
  deliveryType?: string;
  deliveryDate1?: string;
  time1?: string;
  venue1?: string;
  room1?: string;
  recipientName?: string;
  advocacyDonation?: number;
}

/**
 * Format time from 24h to 12h AM/PM format
 */
function formatTime(time: string): string {
  if (!time) return '';
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Build the HTML email content
 */
function buildEmailHtml(details: OrderDetails): string {
  // Build delivery details section
  let deliverySection = '';
  if (details.deliveryType === 'deliver' && details.deliveryDate1) {
    deliverySection = `
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #FDE7E9;">
          <strong style="color: #333;">📍 Delivery Details</strong>
        </td>
      </tr>
      <tr>
        <td style="padding: 8px 0; padding-left: 16px; color: #666;">
          <strong>Recipient:</strong> ${details.recipientName || 'N/A'}<br/>
          <strong>Date:</strong> ${details.deliveryDate1}<br/>
          <strong>Time:</strong> ${formatTime(details.time1 || '')}<br/>
          <strong>Venue:</strong> ${details.venue1 || 'N/A'} ${details.room1 ? `(Room ${details.room1})` : ''}
        </td>
      </tr>
    `;
  } else if (details.deliveryType === 'pickup') {
    deliverySection = `
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #FDE7E9;">
          <strong style="color: #333;">📦 Pickup Order</strong>
        </td>
      </tr>
      <tr>
        <td style="padding: 8px 0; padding-left: 16px; color: #666;">
          You will be notified about the pickup location and time via email.
        </td>
      </tr>
    `;
  }

  // Build advocacy donation section
  let advocacySection = '';
  if (details.advocacyDonation && details.advocacyDonation > 0) {
    advocacySection = `
      <tr>
        <td style="padding: 8px 0; padding-left: 16px; color: #666;">
          <strong>Advocacy Donation:</strong> ${details.advocacyDonation} rose(s) (₱${(details.advocacyDonation * 80).toFixed(2)})
        </td>
      </tr>
    `;
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #FFF5F5;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header -->
        <tr>
          <td style="background: linear-gradient(135deg, #F43F5E 0%, #EC4899 100%); padding: 32px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🌹 Rose Sale</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">Order Confirmation</p>
          </td>
        </tr>
        
        <!-- Content -->
        <tr>
          <td style="padding: 32px;">
            <p style="color: #333; font-size: 16px; margin: 0 0 24px 0;">
              Hi <strong>${details.purchaserName}</strong>,
            </p>
            
            <p style="color: #666; font-size: 15px; margin: 0 0 24px 0;">
              Thank you for your order! We've received your purchase and will process it shortly.
            </p>
            
            <!-- Order ID Box -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #FFF1F2; border-radius: 12px; margin-bottom: 24px;">
              <tr>
                <td style="padding: 20px; text-align: center;">
                  <p style="color: #666; margin: 0 0 4px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Order ID</p>
                  <p style="color: #F43F5E; margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 2px;">${details.orderId}</p>
                </td>
              </tr>
            </table>
            
            <!-- Order Details -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #FDE7E9;">
                  <strong style="color: #333;">🛒 Items Ordered</strong>
                </td>
              </tr>
              <tr>
                <td style="padding: 12px 0; padding-left: 16px; color: #666; font-size: 14px;">
                  ${details.cartItems.split(', ').map(item => `• ${item}`).join('<br/>')}
                </td>
              </tr>
              ${advocacySection}
              ${deliverySection}
            </table>
            
            <!-- Total -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #F43F5E 0%, #EC4899 100%); border-radius: 12px;">
              <tr>
                <td style="padding: 20px; text-align: center;">
                  <p style="color: rgba(255,255,255,0.9); margin: 0 0 4px 0; font-size: 12px; text-transform: uppercase;">Total Amount</p>
                  <p style="color: #ffffff; margin: 0; font-size: 32px; font-weight: bold;">₱${details.total.toFixed(2)}</p>
                </td>
              </tr>
            </table>
            
            <p style="color: #999; font-size: 13px; margin: 24px 0 0 0; text-align: center;">
              Save your Order ID to track your order status.
            </p>
          </td>
        </tr>
        
        <!-- Footer -->
        <tr>
          <td style="background-color: #FFF5F5; padding: 24px; text-align: center; border-top: 1px solid #FDE7E9;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              Questions? Reply to this email or contact us on Facebook.
            </p>
            <p style="color: #ccc; font-size: 11px; margin: 12px 0 0 0;">
              © ${new Date().getFullYear()} Rose Sale. Made with ❤️
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

/**
 * Send order confirmation email using Resend API
 */
export async function sendOrderConfirmationEmail(details: OrderDetails): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.log('[Email] RESEND_API_KEY not configured. Email notifications disabled.');
    return false;
  }

  const fromEmail = process.env.EMAIL_FROM || 'Rose Sale <onboarding@resend.dev>';

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [details.email],
        subject: `🌹 Order Confirmed - ${details.orderId}`,
        html: buildEmailHtml(details),
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[Email] Resend API error:', error);
      return false;
    }

    const result = await response.json() as { id: string };
    console.log('[Email] Order confirmation sent:', result.id, 'to:', details.email);
    return true;
  } catch (error: any) {
    console.error('[Email] Failed to send confirmation:', error.message);
    return false;
  }
}
