const axios = require('axios');

const SANDBOX_AUTH_URL = 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';

/**
 * Fetches a fresh OAuth access token from Daraja sandbox.
 * Token is valid for 1 hour; for production use a cache layer.
 */
async function getAccessToken() {
  const key    = process.env.CONSUMER_KEY;
  const secret = process.env.CONSUMER_SECRET;

  if (!key || !secret) {
    throw new Error('CONSUMER_KEY or CONSUMER_SECRET missing in .env');
  }

  const credentials = Buffer.from(`${key}:${secret}`).toString('base64');

  const response = await axios.get(SANDBOX_AUTH_URL, {
    headers: {
      Authorization: `Basic ${credentials}`,
    },
  });

  return response.data.access_token;
}

module.exports = { getAccessToken };
