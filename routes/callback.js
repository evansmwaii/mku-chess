const express = require('express');
const { updateRecord, readAll } = require('../utils/storage');

const router = express.Router();

/**
 * POST /api/callback
 * Safaricom calls this URL after the customer enters their PIN (or cancels).
 * This endpoint MUST return 200 quickly or Safaricom will retry.
 */
router.post('/callback', (req, res) => {
  // Acknowledge immediately
  res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });

  try {
    const body     = req.body?.Body?.stkCallback;
    if (!body) return;

    const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = body;

    console.log(`\n[CALLBACK] CheckoutRequestID : ${CheckoutRequestID}`);
    console.log(`[CALLBACK] ResultCode         : ${ResultCode}`);
    console.log(`[CALLBACK] ResultDesc         : ${ResultDesc}`);

    if (ResultCode === 0) {
      // ── Payment SUCCESS ──────────────────────────────────────────────────
      const items = CallbackMetadata?.Item || [];
      const get   = (name) => items.find(i => i.Name === name)?.Value ?? null;

      const extra = {
        mpesaReceiptNumber: get('MpesaReceiptNumber'),
        transactionDate   : get('TransactionDate'),
        phoneUsed         : get('PhoneNumber'),
      };

      updateRecord(CheckoutRequestID, 'SUCCESS', extra);
      console.log(`[CALLBACK] ✅ Payment SUCCESS | Receipt: ${extra.mpesaReceiptNumber}`);

    } else {
      // ── Payment FAILED / cancelled ───────────────────────────────────────
      updateRecord(CheckoutRequestID, 'FAILED', { failReason: ResultDesc });
      console.log(`[CALLBACK] ❌ Payment FAILED: ${ResultDesc}`);
    }
  } catch (err) {
    console.error('[CALLBACK] Processing error:', err.message);
  }
});

/**
 * GET /api/payments
 * Quick view of all registered players (for admin use).
 */
router.get('/payments', (req, res) => {
  const all = readAll();
  const summary = {
    total    : all.length,
    confirmed: all.filter(p => p.status === 'SUCCESS').length,
    pending  : all.filter(p => p.status === 'PENDING').length,
    failed   : all.filter(p => p.status === 'FAILED').length,
    players  : all,
  };
  res.json(summary);
});

module.exports = router;
