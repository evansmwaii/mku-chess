const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const stkRouter = require('./routes/stk');
const callbackRouter = require('./routes/callback');

const app = express();

app.use(cors());
app.use(express.json());

// Serve the frontend index.html from the root
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/api', stkRouter);
app.use('/api', callbackRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n♟  MKU Chess Tournament Server running on http://localhost:${PORT}`);
  console.log(`   Environment : SANDBOX`);
  console.log(`   Payments log: ./data/payments.json\n`);
});
