import express, { Request, Response } from 'express';
import { mockDb } from './mockDb';
import { verifyLineSignature, buildStaffProfileFlex } from './lineService';

/**
 * Shared Express application (API routes only).
 *
 * Used by:
 *  - `local-server.ts` (dev: Vite middleware + this app)
 *  - `api/index.ts`    (Vercel serverless function)
 *
 * Static SPA serving is intentionally NOT done here so the same app works on
 * both local (Vite/dist) and Vercel (static output + rewrites).
 */
export function createApp() {
  const app = express();

  // Webhook raw body buffer parser for signature validation
  app.use(express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf.toString();
    }
  }));

  // ==========================================
  // Health & Diagnostic API
  // ==========================================
  // Diagnostic: distinguish "not injected" (undefined) vs "empty" ("" ) vs "set"
  const envState = (v: string | undefined) =>
    v === undefined ? 'missing' : v === '' ? 'empty' : 'set';

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'tops-line-crm-backend',
      timestamp: new Date().toISOString(),
      configured: {
        hasLineChannelAccessToken: Boolean(process.env.LINE_CHANNEL_ACCESS_TOKEN),
        hasLineChannelSecret: Boolean(process.env.LINE_CHANNEL_SECRET),
        hasLiffId: Boolean(process.env.LIFF_ID),
      },
      envDetail: {
        LINE_CHANNEL_ACCESS_TOKEN: envState(process.env.LINE_CHANNEL_ACCESS_TOKEN),
        LINE_CHANNEL_SECRET: envState(process.env.LINE_CHANNEL_SECRET),
        LIFF_ID: envState(process.env.LIFF_ID),
      }
    });
  });

  // ==========================================
  // Customers / CDP API
  // ==========================================
  app.get('/api/customers', (_req, res) => {
    const customers = mockDb.getAllCustomers();
    res.json({ data: customers, total: customers.length });
  });

  app.get('/api/customers/:id', (req, res) => {
    const customer = mockDb.getCustomerById(req.params.id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json({ data: customer });
  });

  app.post('/api/customers/map-line', (req, res) => {
    const { crmCustomerId, lineUid, displayName } = req.body;
    if (!crmCustomerId || !lineUid) {
      return res.status(400).json({ error: 'crmCustomerId and lineUid are required' });
    }
    const updated = mockDb.mapLineUid(crmCustomerId, lineUid, displayName);
    if (!updated) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json({ success: true, data: updated });
  });

  app.post('/api/customers/unmap-line', (req, res) => {
    const { crmCustomerId } = req.body;
    if (!crmCustomerId) {
      return res.status(400).json({ error: 'crmCustomerId is required' });
    }
    const updated = mockDb.unmapLineUid(crmCustomerId);
    res.json({ success: true, data: updated });
  });

  // ==========================================
  // Products API
  // ==========================================
  app.get('/api/products', (_req, res) => {
    const products = mockDb.getAllProducts();
    res.json({ data: products });
  });

  // ==========================================
  // Push / Multicast API (Real LINE API + Fallback Simulator)
  // ==========================================
  app.post('/api/line/push', async (req: Request, res: Response) => {
    const { toLineUid, crmCustomerId, customerName, flexTitle, promoSku, branch, messagePayload } = req.body;
    const channelToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;

    let realLineSuccess = false;
    let lineApiResponse: any = null;

    // If real LINE credentials exist, execute actual HTTP request to LINE Messaging API
    if (channelToken && toLineUid) {
      try {
        const response = await fetch('https://api.line.me/v2/bot/message/push', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${channelToken}`
          },
          body: JSON.stringify({
            to: toLineUid,
            messages: [
              messagePayload || {
                type: 'text',
                text: `[Tops Supermarket] สวัสดีค่ะคุณ ${customerName || ''} ข้อเสนอพิเศษสำหรับคุณ: ${flexTitle}`
              }
            ]
          })
        });

        lineApiResponse = await response.json().catch(() => ({}));
        realLineSuccess = response.ok;
      } catch (err: any) {
        console.error('Error invoking LINE Push API:', err?.message);
      }
    }

    // Always log to audit log (live mock database)
    const log = mockDb.recordPushLog({
      targetSegment: 'Direct Profile Push',
      customerLineUid: toLineUid,
      crmId: crmCustomerId,
      customerName: customerName || 'Customer',
      flexTitle: flexTitle || 'Special Offer',
      promoSku,
      branch: branch || 'Tops Food Hall CentralWorld',
      channel: 'PUSH_DIRECT'
    });

    res.json({
      success: true,
      log,
      realLinePushAttempted: Boolean(channelToken),
      realLineSuccess,
      lineApiResponse
    });
  });

  app.get('/api/line/logs', (_req, res) => {
    res.json({ data: mockDb.getPushLogs() });
  });

  // ==========================================
  // Official LINE Webhook Handler
  // Supports HMAC-SHA256 signature verification and /crm commands
  // ==========================================
  app.post('/api/line/webhook', async (req: any, res: Response) => {
    const signature = req.headers['x-line-signature'] as string;
    const channelSecret = process.env.LINE_CHANNEL_SECRET;

    // Verify signature if secret configured
    if (channelSecret && signature) {
      const isValid = verifyLineSignature(req.rawBody || JSON.stringify(req.body), signature, channelSecret);
      if (!isValid) {
        return res.status(403).json({ error: 'Invalid LINE signature' });
      }
    }

    const events = req.body?.events || [];
    const channelToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;

    for (const event of events) {
      // Process text messages
      if (event.type === 'message' && event.message?.type === 'text') {
        const text = event.message.text.trim();
        const replyToken = event.replyToken;

        // Frontline staff /crm commands
        if (text.startsWith('/crm')) {
          const parts = text.split(' ');
          const subCommand = parts[1] || 'profile';

          // Match customer either by sender line UID or default VIP persona
          const customer = mockDb.getCustomerByLineUid(event.source?.userId) || mockDb.getAllCustomers()[0];

          let replyMessage: any = null;
          if (subCommand === 'profile') {
            replyMessage = buildStaffProfileFlex(customer, 'Tops Associate');
          } else {
            replyMessage = {
              type: 'text',
              text: `[Tops CRM Bot]\nCustomer: ${customer.fullName}\nTier: ${customer.tier}\nPreferred: ${customer.preferredBranch}\nDietary: ${customer.dietaryPreferences.join(', ')}`
            };
          }

          // If real Channel Access Token configured, reply via LINE Messaging API
          if (channelToken && replyToken) {
            try {
              await fetch('https://api.line.me/v2/bot/message/reply', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${channelToken}`
                },
                body: JSON.stringify({
                  replyToken,
                  messages: [replyMessage]
                })
              });
            } catch (err: any) {
              console.error('Failed to reply to LINE webhook:', err?.message);
            }
          }
        }
      }
    }

    return res.status(200).json({ status: 'ok', processedEvents: events.length });
  });

  return app;
}
