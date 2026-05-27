const fs   = require('fs');
const path = require('path');

const DATA_DIR  = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'payments.json');

/** Ensure the data directory and file exist */
function ensureFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
}

/** Read all payment records */
function readAll() {
  ensureFile();
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

/** Write all payment records */
function writeAll(records) {
  ensureFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(records, null, 2));
}

/**
 * Save a new pending payment when STK push is initiated.
 * @param {{ checkoutRequestId, name, phone, amount }} entry
 */
function savePending({ checkoutRequestId, name, phone, amount }) {
  const records = readAll();
  records.push({
    checkoutRequestId,
    name,
    phone,
    amount,
    status   : 'PENDING',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  writeAll(records);
  console.log(`[DB] Saved pending payment for ${name} (${phone})`);
}

/**
 * Update an existing record when the callback arrives.
 * @param {string} checkoutRequestId
 * @param {'SUCCESS'|'FAILED'} status
 * @param {object} extra  – additional fields from callback (mpesaReceiptNumber, etc.)
 */
function updateRecord(checkoutRequestId, status, extra = {}) {
  const records = readAll();
  const idx = records.findIndex(r => r.checkoutRequestId === checkoutRequestId);

  if (idx === -1) {
    console.warn(`[DB] No record found for checkoutRequestId: ${checkoutRequestId}`);
    return false;
  }

  records[idx] = {
    ...records[idx],
    ...extra,
    status,
    updatedAt: new Date().toISOString(),
  };

  writeAll(records);
  console.log(`[DB] Updated ${checkoutRequestId} → ${status}`);
  return true;
}

/** Get a single record by checkoutRequestId */
function findByCheckoutId(checkoutRequestId) {
  return readAll().find(r => r.checkoutRequestId === checkoutRequestId) || null;
}

module.exports = { savePending, updateRecord, findByCheckoutId, readAll };
