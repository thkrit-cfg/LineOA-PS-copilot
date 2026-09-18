import crypto from 'crypto';
import { CustomerProfile } from '../../src/types';

/**
 * Verifies that incoming webhook requests originate from LINE servers
 * using HMAC-SHA256 with the LINE Channel Secret.
 */
export function verifyLineSignature(body: string, signature: string, channelSecret: string): boolean {
  if (!signature || !channelSecret) return false;
  try {
    const hash = crypto
      .createHmac('sha256', channelSecret)
      .update(body)
      .digest('base64');
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
  } catch {
    return false;
  }
}

/**
 * Builds standard Tops CRM Flex Message response for LINE 1-on-1 staff /crm bot
 */
export function buildStaffProfileFlex(customer: CustomerProfile, staffName: string) {
  const the1Points = Math.round((customer.totalSpendLtv / 25) * 8);

  return {
    type: 'flex',
    altText: `Tops CRM: ${customer.fullName} (${customer.tier})`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#1b2434',
        paddingAll: '16px',
        contents: [
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              {
                type: 'text',
                text: 'TOPS CRM COPILOT',
                weight: 'bold',
                color: '#06c755',
                size: 'xs'
              },
              {
                type: 'text',
                text: `Staff: ${staffName.split(' ')[0]}`,
                color: '#94a3b8',
                size: 'xxs',
                align: 'end'
              }
            ]
          },
          {
            type: 'text',
            text: customer.fullName,
            weight: 'bold',
            color: '#ffffff',
            size: 'md',
            margin: 'md'
          },
          {
            type: 'text',
            text: `The 1 No: ${customer.the1CardNo} • Tier: ${customer.tier}`,
            color: '#cbd5e1',
            size: 'xs',
            margin: 'xs'
          }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#0f172a',
        paddingAll: '16px',
        spacing: 'md',
        contents: [
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              {
                type: 'box',
                layout: 'vertical',
                contents: [
                  {
                    type: 'text',
                    text: 'The 1 Points',
                    color: '#94a3b8',
                    size: 'xxs'
                  },
                  {
                    type: 'text',
                    text: `${the1Points.toLocaleString()} pts`,
                    weight: 'bold',
                    color: '#f59e0b',
                    size: 'sm'
                  }
                ]
              },
              {
                type: 'box',
                layout: 'vertical',
                contents: [
                  {
                    type: 'text',
                    text: 'Average Basket',
                    color: '#94a3b8',
                    size: 'xxs'
                  },
                  {
                    type: 'text',
                    text: `฿${customer.aov}`,
                    weight: 'bold',
                    color: '#10b981',
                    size: 'sm'
                  }
                ]
              }
            ]
          },
          {
            type: 'separator',
            color: '#334155'
          },
          {
            type: 'text',
            text: `🌿 Preferences: ${customer.dietaryPreferences.join(', ')}`,
            color: '#cbd5e1',
            size: 'xs',
            wrap: true
          },
          {
            type: 'text',
            text: `📍 Primary Store: ${customer.preferredBranch}`,
            color: '#94a3b8',
            size: 'xs'
          }
        ]
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#1b2434',
        paddingAll: '12px',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            action: {
              type: 'uri',
              label: 'Explore Full Profile (LIFF)',
              uri: `https://liff.line.me/${process.env.LIFF_ID || 'demo-liff'}?customer=${customer.crmCustomerId}`
            },
            style: 'primary',
            color: '#06c755',
            height: 'sm'
          }
        ]
      }
    }
  };
}
