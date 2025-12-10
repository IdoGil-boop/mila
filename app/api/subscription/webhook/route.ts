import { NextRequest, NextResponse } from 'next/server';
import { handlePaddleWebhook, verifyPaddleSignature } from '@/lib/paddle';

/**
 * POST /api/subscription/webhook
 * Handle Paddle webhook events
 */
export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const body = await request.text();
    const signature = request.headers.get('paddle-signature') || '';

    // Verify webhook signature
    if (!verifyPaddleSignature(signature, body)) {
      console.error('[Paddle Webhook] Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Parse webhook data
    const webhookData = JSON.parse(body);
    const eventType = webhookData.event_type;
    const eventData = webhookData.data;

    console.log(`[Paddle Webhook] Received event: ${eventType}`);

    // Handle webhook event
    await handlePaddleWebhook(eventType, eventData);

    return NextResponse.json({ success: true, received: true });
  } catch (error: any) {
    console.error('[Paddle Webhook] Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed', details: error.message },
      { status: 500 }
    );
  }
}
