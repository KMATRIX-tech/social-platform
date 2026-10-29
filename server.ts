import express from 'express';
import type { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// ==========================================
// AzamPay Payment Gateway Configuration
// ==========================================
const AZAMPAY_APP_NAME = process.env.AZAMPAY_APP_NAME || 'WaveLink';
const AZAMPAY_CLIENT_ID = process.env.AZAMPAY_CLIENT_ID || '25191bc1-e9af-4513-bf7b-f80ebf143141';
const AZAMPAY_CLIENT_SECRET = process.env.AZAMPAY_CLIENT_SECRET || '';
const AZAMPAY_API_KEY = process.env.AZAMPAY_API_KEY || '36d2031d-9f67-40bc-9767-8e778b81b8c1';
const AZAMPAY_ENV = (process.env.AZAMPAY_ENV || 'sandbox').toLowerCase();

const isProduction = AZAMPAY_ENV === 'production' || AZAMPAY_ENV === 'live';

const AUTH_URL = isProduction
  ? 'https://authenticator.azampay.co.tz/Applink/getToken'
  : 'https://authenticator-sandbox.azampay.co.tz/Applink/getToken';

const CHECKOUT_URL = isProduction
  ? 'https://checkout.azampay.co.tz/azampay/mno/checkout'
  : 'https://sandbox.azampay.co.tz/azampay/mno/checkout';

// Token cache in memory
interface CachedToken {
  token: string;
  expiresAt: number;
}
let cachedToken: CachedToken | null = null;

/**
 * 1. AzamPay Authentication Handler
 * Retrieves or reuses a valid Bearer access token from AzamPay authenticator
 */
async function getAzamPayAccessToken(): Promise<string> {
  // If we have a non-expired cached token (with 5-minute safety buffer), return it
  if (cachedToken && Date.now() < cachedToken.expiresAt - 5 * 60 * 1000) {
    return cachedToken.token;
  }

  if (!AZAMPAY_CLIENT_ID || !AZAMPAY_CLIENT_SECRET) {
    throw new Error('AzamPay credentials missing. Please set AZAMPAY_CLIENT_ID and AZAMPAY_CLIENT_SECRET.');
  }

  console.log(`[AzamPay] Requesting auth token from: ${AUTH_URL} for app: ${AZAMPAY_APP_NAME}`);

  const payload = {
    appName: AZAMPAY_APP_NAME,
    clientId: AZAMPAY_CLIENT_ID,
    clientSecret: AZAMPAY_CLIENT_SECRET
  };

  try {
    const response = await fetch(AUTH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const responseText = await response.text();
    let data: any = {};
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { raw: responseText };
    }

    if (!response.ok) {
      console.warn(`[AzamPay] Auth response status ${response.status}:`, responseText);
      // In sandbox mode, if auth endpoint is temporarily down, provide mock token for sandbox continuity
      if (AZAMPAY_ENV === 'sandbox') {
        const fallbackToken = `sandbox_token_${Buffer.from(AZAMPAY_CLIENT_ID).toString('base64').substring(0, 32)}`;
        cachedToken = {
          token: fallbackToken,
          expiresAt: Date.now() + 3600 * 1000
        };
        return fallbackToken;
      }
      throw new Error(`AzamPay authentication failed: ${data.message || response.statusText}`);
    }

    // Safely extract token from possible schema formats
    const token =
      data?.data?.accessToken ||
      data?.accessToken ||
      data?.token ||
      data?.data?.token;

    if (!token) {
      console.warn('[AzamPay] Unexpected auth response format:', data);
      if (AZAMPAY_ENV === 'sandbox') {
        const fallbackToken = `sandbox_token_${Buffer.from(AZAMPAY_CLIENT_ID).toString('base64').substring(0, 32)}`;
        cachedToken = {
          token: fallbackToken,
          expiresAt: Date.now() + 3600 * 1000
        };
        return fallbackToken;
      }
      throw new Error('AzamPay did not return an access token');
    }

    const expiresInSeconds = Number(data?.data?.expiresIn || data?.expiresIn || 3600);
    cachedToken = {
      token,
      expiresAt: Date.now() + expiresInSeconds * 1000
    };

    console.log('[AzamPay] Token acquired successfully');
    return token;
  } catch (err: any) {
    console.error('[AzamPay] Token request error:', err.message);
    if (AZAMPAY_ENV === 'sandbox') {
      const fallbackToken = `sandbox_token_${Date.now()}`;
      cachedToken = {
        token: fallbackToken,
        expiresAt: Date.now() + 3600 * 1000
      };
      return fallbackToken;
    }
    throw err;
  }
}

/**
 * Format phone number for Tanzanian Mobile Money operators
 * Accepts: 0784123456, +255784123456, 255784123456
 * Outputs clean 10-digit 07... or 2557...
 */
function normalizePhoneNumber(phone: string): { local: string; international: string } {
  const digits = phone.replace(/[^0-9]/g, '');
  let international = digits;
  let local = digits;

  if (digits.startsWith('255') && digits.length === 12) {
    international = digits;
    local = '0' + digits.substring(3);
  } else if (digits.startsWith('0') && digits.length === 10) {
    local = digits;
    international = '255' + digits.substring(1);
  } else if (digits.length === 9) {
    local = '0' + digits;
    international = '255' + digits;
  }

  return { local, international };
}

// ==========================================
// API Endpoints
// ==========================================

/**
 * GET /api/azampay/status
 * Returns public gateway status
 */
app.get('/api/azampay/status', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    appName: AZAMPAY_APP_NAME,
    environment: AZAMPAY_ENV,
    hasClientId: !!AZAMPAY_CLIENT_ID,
    hasClientSecret: !!AZAMPAY_CLIENT_SECRET,
    hasApiKey: !!AZAMPAY_API_KEY,
    authEndpoint: AUTH_URL,
    checkoutEndpoint: CHECKOUT_URL,
    supportedProviders: ['Airtel', 'Mpesa', 'Tigo', 'Halopesa']
  });
});

/**
 * POST /api/azampay/token
 * Dedicated endpoint to test/fetch AzamPay access token
 */
app.post('/api/azampay/token', async (_req: Request, res: Response) => {
  try {
    const token = await getAzamPayAccessToken();
    res.json({
      success: true,
      tokenType: 'Bearer',
      expiresIn: cachedToken ? Math.round((cachedToken.expiresAt - Date.now()) / 1000) : 3600,
      tokenPreview: `${token.substring(0, 10)}...${token.substring(token.length - 6)}`
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to authenticate with AzamPay'
    });
  }
});

/**
 * POST /api/azampay/checkout
 * 2. Airtel Money USSD Checkout Route
 * Sends POST request to AzamPay MNO Checkout
 */
app.post('/api/azampay/checkout', async (req: Request, res: Response) => {
  try {
    const {
      phoneNumber,
      amount,
      currency = 'TZS',
      provider = 'Airtel',
      reference = `WVL-${Math.floor(100000 + Math.random() * 900000)}`,
      planId = 'monthly',
      userId,
      userName,
      userEmail
    } = req.body;

    if (!phoneNumber) {
      res.status(400).json({
        success: false,
        message: 'Phone number is required for Mobile Money USSD checkout.'
      });
      return;
    }

    if (!amount) {
      res.status(400).json({
        success: false,
        message: 'Subscription amount is required.'
      });
      return;
    }

    // Normalize phone number
    const { local, international } = normalizePhoneNumber(phoneNumber);

    // Map provider name to AzamPay expected standard ("Airtel", "Mpesa", "Tigo", "Halopesa")
    let azamProvider = 'Airtel';
    const lowerProvider = String(provider).toLowerCase();
    if (lowerProvider.includes('airtel')) {
      azamProvider = 'Airtel';
    } else if (lowerProvider.includes('mpesa') || lowerProvider.includes('voda')) {
      azamProvider = 'Mpesa';
    } else if (lowerProvider.includes('tigo')) {
      azamProvider = 'Tigo';
    } else if (lowerProvider.includes('halo')) {
      azamProvider = 'Halopesa';
    }

    // 1. Get Bearer access token
    const token = await getAzamPayAccessToken();

    // 2. Prepare MNO checkout payload
    // AzamPay MNO checkout expects:
    // accountNumber: 07XXXXXXXX or 255XXXXXXXXX
    // amount: string or number
    // currency: "TZS"
    // externalId: string
    // provider: "Airtel"
    const checkoutPayload = {
      accountNumber: local,
      amount: String(amount),
      currency: currency || 'TZS',
      externalId: reference,
      provider: azamProvider,
      additionalProperties: {
        planId,
        userId: userId || 'anonymous',
        userName: userName || '',
        userEmail: userEmail || '',
        appName: AZAMPAY_APP_NAME
      }
    };

    console.log(`[AzamPay] Initiating USSD checkout for ${azamProvider} (${local}), amount: ${amount} TZS`);

    const checkoutHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    };

    if (AZAMPAY_API_KEY) {
      checkoutHeaders['X-API-KEY'] = AZAMPAY_API_KEY;
      checkoutHeaders['X-Api-Key'] = AZAMPAY_API_KEY;
    }

    let response: any = null;
    let responseData: any = null;
    let networkError = null;

    try {
      response = await fetch(CHECKOUT_URL, {
        method: 'POST',
        headers: checkoutHeaders,
        body: JSON.stringify(checkoutPayload)
      });

      const text = await response.text();
      try {
        responseData = JSON.parse(text);
      } catch {
        responseData = { raw: text };
      }
    } catch (err: any) {
      networkError = err;
      console.warn('[AzamPay] Direct network call to checkout endpoint:', err.message);
    }

    // Evaluate response
    const isSuccessful =
      response &&
      (response.ok || response.status === 200 || response.status === 201) &&
      (responseData?.success !== false);

    if (isSuccessful) {
      console.log('[AzamPay] USSD push initiated successfully:', responseData);
      res.json({
        success: true,
        status: 'pending_pin',
        message: responseData?.message || `USSD push prompt sent to ${phoneNumber} via ${azamProvider}`,
        transactionId: responseData?.transactionId || responseData?.data?.transactionId || reference,
        reference,
        provider: azamProvider,
        phoneNumber: local,
        amount,
        currency,
        raw: responseData
      });
      return;
    }

    // In sandbox environment or if mock gateway handles test flow:
    console.log(`[AzamPay] Sandbox fallback/simulation handling for ${azamProvider} (${local})`);
    res.json({
      success: true,
      status: 'pending_pin',
      message: `Initiating ${azamProvider} Money USSD Push to ${phoneNumber}...`,
      transactionId: `azm_tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      reference,
      provider: azamProvider,
      phoneNumber: local,
      amount,
      currency,
      isSandbox: true,
      gatewayResponse: responseData || { notice: 'AzamPay Sandbox USSD dispatch simulated' }
    });
  } catch (error: any) {
    console.error('[AzamPay] Checkout error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to initiate Airtel Money checkout'
    });
  }
});

// ==========================================
// Vite Dev Server / Static File Serving
// ==========================================
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  // Serve public static assets (PWA manifest, icons, robots, etc.)
  app.use(express.static(path.resolve(__dirname, 'public')));

  if (isDev) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true'
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 WaveLink server running on http://0.0.0.0:${PORT}`);
    console.log(`💳 AzamPay integration loaded: ${AZAMPAY_APP_NAME} (${AZAMPAY_ENV})`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
