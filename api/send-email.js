// Vercel Serverless Function (/api/send-email) for transactional email delivery
// Supports Resend (RESEND_API_KEY) or Brevo (BREVO_API_KEY) configured in Vercel Environment Variables.

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ sent: false, error: 'Method not allowed. Use POST.' });
  }

  const { to, subject, html, text } = req.body || {};
  if (!to || !subject || (!html && !text)) {
    return res.status(400).json({ sent: false, error: 'Missing required email fields (to, subject, html/text).' });
  }

  const resendKey = process.env.RESEND_API_KEY;
  const brevoKey = process.env.BREVO_API_KEY;
  const fromAddress = process.env.EMAIL_FROM || 'AttendX <onboarding@resend.dev>';

  if (!resendKey && !brevoKey) {
    console.error('[EmailService] Missing email provider credentials. Set RESEND_API_KEY or BREVO_API_KEY and EMAIL_FROM in environment variables.');
    return res.status(503).json({
      sent: false,
      error: 'Email provider not configured on server. Set RESEND_API_KEY (or BREVO_API_KEY) and EMAIL_FROM in environment variables.'
    });
  }

  try {
    if (resendKey) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [to],
          subject,
          html: html || `<pre>${text}</pre>`,
          text: text || ''
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const errMsg = data?.message || data?.error || `Resend API HTTP ${response.status}`;
        console.error('[EmailService] Resend API error:', errMsg);
        return res.status(response.status).json({ sent: false, error: errMsg });
      }

      return res.status(200).json({ sent: true, provider: 'resend', id: data.id });
    }

    if (brevoKey) {
      const senderMatch = fromAddress.match(/^(?:([^<]+)\s*<([^>]+)>|([^\s]+@[^\s]+))$/);
      const senderName = senderMatch?.[1]?.trim() || 'AttendX';
      const senderEmail = senderMatch?.[2]?.trim() || senderMatch?.[3]?.trim() || fromAddress;

      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': brevoKey,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({
          sender: { name: senderName, email: senderEmail },
          to: [{ email: to }],
          subject,
          htmlContent: html || `<pre>${text}</pre>`,
          textContent: text || ''
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const errMsg = data?.message || `Brevo API HTTP ${response.status}`;
        console.error('[EmailService] Brevo API error:', errMsg);
        return res.status(response.status).json({ sent: false, error: errMsg });
      }

      return res.status(200).json({ sent: true, provider: 'brevo', id: data.messageId });
    }
  } catch (err) {
    console.error('[EmailService] Unexpected transport error:', err);
    return res.status(500).json({ sent: false, error: err.message || 'Internal email dispatch error' });
  }
};
