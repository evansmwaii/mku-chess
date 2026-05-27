const express = require('express');
const axios   = require('axios');
const { getAccessToken } = require('../utils/auth');
const { savePending }    = require('../utils/storage');

const router = express.Router();

const STK_URL = 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest';

/**
 * Format a phone number to 254XXXXXXXXX
 * Accepts: 07XXXXXXXX  |  254XXXXXXXXX  |  +254XXXXXXXXX
 */
function formatPhone(raw) {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('254') && digits.length === 12) return digits;
  if (digits.startsWith('0')   && digits.length === 10) return '254' + digits.slice(1);
  if (digits.startsWith('7')   && digits.length === 9)  return '254' + digits;
  throw new Error(`Invalid phone number: ${raw}`);
}

/**
 * Generate the base64 password: Base64(Shortcode + Passkey + Timestamp)
 */
function generatePassword(shortcode, passkey, timestamp) {
  return Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');
}

/**
 * POST /api/stkpush
 * Body: { name, phone, amount }
 */
router.post('/stkpush', async (req, res) => {
  const { name, phone, amount } = req.body;

  // ── Validate inputs ──────────────────────────────────────────────────────
  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return res.status(400).json({ success: false, message: 'Valid name is required.' });
  }

  let formattedPhone;
  try {
    formattedPhone = formatPhone(phone);
  } catch {
    return res.status(400).json({ success: false, message: 'Invalid M-Pesa number. Use format 07XXXXXXXX.' });
  }

  const depositAmount = parseInt(amount);
  if (isNaN(depositAmount) || depositAmount < 1) {
    return res.status(400).json({ success: false, message: 'Invalid deposit amount.' });
  }

  // ── Build STK Push payload ───────────────────────────────────────────────
  const shortcode   = process.env.SHORTCODE   || '174379';
  const passkey     = process.env.PASSKEY     || 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919';
  const callbackUrl = process.env.CALLBACK_URL;

  if (!callbackUrl) {
    return res.status(500).json({ success: false, message: 'CALLBACK_URL not set in .env' });
  }

  const now       = new Date();
  const timestamp = now.toISOString().replace(/[-T:.Z]/g, '').slice(0, 14);
  const password  = generatePassword(shortcode, passkey, timestamp);

  const payload = {
    BusinessShortCode: shortcode,
    Password          : password,
    Timestamp         : timestamp,
    TransactionType   : 'CustomerPayBillOnline',
    Amount            : depositAmount,
    PartyA            : formattedPhone,           // customer phone
    PartyB            : shortcode,                // receiving shortcode
    PhoneNumber       : formattedPhone,           // phone to prompt
    CallBackURL       : callbackUrl,
    AccountReference  : 'MKUChess',
    TransactionDesc   : `MKU Chess Tournament registration - ${name.trim()}`,
  };

  // ── Call Daraja ──────────────────────────────────────────────────────────
  try {
    const token    = await getAccessToken();
    const response = await axios.post(STK_URL, payload, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const { ResponseCode, CheckoutRequestID, CustomerMessage } = response.data;

    if (ResponseCode === '0') {
      // Save to JSON file
      savePending({
        checkoutRequestId: CheckoutRequestID,
        name             : name.trim(),
        phone            : formattedPhone,
        amount           : depositAmount,
      });

      console.log(`[STK] Push sent → ${formattedPhone} | CheckoutID: ${CheckoutRequestID}`);

      return res.json({
        success          : true,
        message          : CustomerMessage || 'STK push sent. Enter your M-Pesa PIN.',
        checkoutRequestId: CheckoutRequestID,
      });
    } else {
      throw new Error(`Daraja returned ResponseCode ${ResponseCode}`);
    }

  } catch (err) {
    const msg = err.response?.data?.errorMessage || err.message || 'STK push failed.';
    console.error('[STK] Error:', msg);
    return res.status(500).json({ success: false, message: msg });
  }
});

module.exports = router;
