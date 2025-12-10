import { SubscriptionTier } from '@/types';
import { getSubscription, updateSubscription, createSubscription } from './dynamodb';

// Paddle configuration
const PADDLE_CLIENT_TOKEN = process.env.PADDLE_CLIENT_TOKEN;
const PADDLE_SELLER_ID = process.env.PADDLE_SELLER_ID;
const PADDLE_WEBHOOK_SECRET = process.env.PADDLE_WEBHOOK_SECRET;
const PADDLE_ENVIRONMENT = process.env.PADDLE_ENVIRONMENT || 'sandbox';

// Plan IDs (set these in your .env.local after creating plans in Paddle dashboard)
const PADDLE_PREMIUM_PLAN_ID = process.env.PADDLE_PREMIUM_PLAN_ID;
const PADDLE_PAYG_PLAN_ID = process.env.PADDLE_PAYG_PLAN_ID;

if (!PADDLE_CLIENT_TOKEN || !PADDLE_SELLER_ID) {
  console.warn('Paddle credentials not configured. Subscription features will not work.');
}

interface CreateCheckoutParams {
  userId: string;
  email: string;
  tier: 'premium' | 'pay_as_you_go';
  successUrl: string;
  cancelUrl: string;
}

interface PaddleCheckoutResponse {
  checkoutUrl: string;
  checkoutId: string;
}

/**
 * Create a Paddle checkout session for subscription
 */
export async function createPaddleCheckout(
  params: CreateCheckoutParams
): Promise<PaddleCheckoutResponse> {
  const { userId, email, tier, successUrl, cancelUrl } = params;

  const planId = tier === 'premium' ? PADDLE_PREMIUM_PLAN_ID : PADDLE_PAYG_PLAN_ID;

  if (!planId) {
    throw new Error(`Plan ID not configured for tier: ${tier}`);
  }

  // Paddle Checkout API (v2)
  const checkoutData = {
    items: [
      {
        price_id: planId,
        quantity: 1,
      },
    ],
    customer: {
      email,
    },
    custom_data: {
      user_id: userId,
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
  };

  try {
    const response = await fetch(
      `https://${PADDLE_ENVIRONMENT === 'production' ? 'api' : 'sandbox-api'}.paddle.com/checkouts`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${PADDLE_CLIENT_TOKEN}`,
        },
        body: JSON.stringify(checkoutData),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Paddle API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    return {
      checkoutUrl: data.data.url,
      checkoutId: data.data.id,
    };
  } catch (error) {
    console.error('Error creating Paddle checkout:', error);
    throw error;
  }
}

/**
 * Handle Paddle webhook events
 */
export async function handlePaddleWebhook(
  eventType: string,
  eventData: any
): Promise<void> {
  console.log(`[Paddle Webhook] ${eventType}`, eventData);

  const userId = eventData.custom_data?.user_id;
  if (!userId) {
    console.error('[Paddle Webhook] No user_id in custom_data');
    return;
  }

  switch (eventType) {
    case 'subscription.created':
      await handleSubscriptionCreated(userId, eventData);
      break;

    case 'subscription.updated':
      await handleSubscriptionUpdated(userId, eventData);
      break;

    case 'subscription.canceled':
    case 'subscription.paused':
      await handleSubscriptionCanceled(userId, eventData);
      break;

    case 'subscription.resumed':
      await handleSubscriptionResumed(userId, eventData);
      break;

    case 'payment.succeeded':
      await handlePaymentSucceeded(userId, eventData);
      break;

    case 'payment.failed':
      await handlePaymentFailed(userId, eventData);
      break;

    default:
      console.log(`[Paddle Webhook] Unhandled event type: ${eventType}`);
  }
}

async function handleSubscriptionCreated(userId: string, eventData: any) {
  const subscription = eventData;
  const planId = subscription.items?.[0]?.price?.id;

  let tier: SubscriptionTier = 'free';
  if (planId === PADDLE_PREMIUM_PLAN_ID) {
    tier = 'premium';
  } else if (planId === PADDLE_PAYG_PLAN_ID) {
    tier = 'pay_as_you_go';
  }

  await createSubscription({
    userId,
    tier,
    paddleCustomerId: subscription.customer_id,
    paddleSubscriptionId: subscription.id,
    paddlePlanId: planId,
    status: subscription.status,
    currentPeriodEnd: subscription.current_billing_period?.ends_at,
    cancelAtPeriodEnd: false,
  });

  console.log(`[Paddle] Subscription created for user ${userId}: ${tier}`);
}

async function handleSubscriptionUpdated(userId: string, eventData: any) {
  const subscription = eventData;
  const planId = subscription.items?.[0]?.price?.id;

  let tier: SubscriptionTier = 'free';
  if (planId === PADDLE_PREMIUM_PLAN_ID) {
    tier = 'premium';
  } else if (planId === PADDLE_PAYG_PLAN_ID) {
    tier = 'pay_as_you_go';
  }

  await updateSubscription(userId, {
    tier,
    paddlePlanId: planId,
    status: subscription.status,
    currentPeriodEnd: subscription.current_billing_period?.ends_at,
    cancelAtPeriodEnd: subscription.scheduled_change?.action === 'cancel',
  });

  console.log(`[Paddle] Subscription updated for user ${userId}: ${tier}`);
}

async function handleSubscriptionCanceled(userId: string, eventData: any) {
  await updateSubscription(userId, {
    tier: 'free',
    status: 'canceled',
    cancelAtPeriodEnd: true,
  });

  console.log(`[Paddle] Subscription canceled for user ${userId}`);
}

async function handleSubscriptionResumed(userId: string, eventData: any) {
  const subscription = eventData;
  const planId = subscription.items?.[0]?.price?.id;

  let tier: SubscriptionTier = 'free';
  if (planId === PADDLE_PREMIUM_PLAN_ID) {
    tier = 'premium';
  } else if (planId === PADDLE_PAYG_PLAN_ID) {
    tier = 'pay_as_you_go';
  }

  await updateSubscription(userId, {
    tier,
    status: 'active',
    cancelAtPeriodEnd: false,
  });

  console.log(`[Paddle] Subscription resumed for user ${userId}: ${tier}`);
}

async function handlePaymentSucceeded(userId: string, eventData: any) {
  console.log(`[Paddle] Payment succeeded for user ${userId}:`, eventData.amount);
  // Optionally store billing history
}

async function handlePaymentFailed(userId: string, eventData: any) {
  console.log(`[Paddle] Payment failed for user ${userId}:`, eventData);
  // Optionally send notification to user
}

/**
 * Verify Paddle webhook signature
 */
export function verifyPaddleSignature(
  signature: string,
  body: string
): boolean {
  if (!PADDLE_WEBHOOK_SECRET) {
    console.warn('[Paddle] Webhook secret not configured, skipping verification');
    return true; // Allow in development
  }

  // Paddle uses HMAC SHA256 for webhook signature verification
  const crypto = require('crypto');
  const hmac = crypto.createHmac('sha256', PADDLE_WEBHOOK_SECRET);
  hmac.update(body);
  const calculatedSignature = hmac.digest('hex');

  return signature === calculatedSignature;
}

/**
 * Get user's current subscription tier
 */
export async function getUserTier(userId: string): Promise<SubscriptionTier> {
  const subscription = await getSubscription(userId);
  if (!subscription || !subscription.tier) {
    return 'free';
  }

  // Check if subscription expired
  if (subscription.currentPeriodEnd) {
    const expirationDate = new Date(subscription.currentPeriodEnd);
    if (expirationDate < new Date()) {
      return 'free';
    }
  }

  return subscription.tier as SubscriptionTier;
}

/**
 * Check if user has access to premium features
 */
export async function hasPremiumAccess(userId: string): Promise<boolean> {
  const tier = await getUserTier(userId);
  return tier === 'premium' || tier === 'pay_as_you_go';
}

/**
 * Cancel subscription (schedule cancellation at period end)
 */
export async function cancelSubscription(userId: string): Promise<void> {
  const subscription = await getSubscription(userId);
  if (!subscription || !subscription.paddleSubscriptionId) {
    throw new Error('No active subscription found');
  }

  try {
    const response = await fetch(
      `https://${PADDLE_ENVIRONMENT === 'production' ? 'api' : 'sandbox-api'}.paddle.com/subscriptions/${subscription.paddleSubscriptionId}/cancel`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${PADDLE_CLIENT_TOKEN}`,
        },
        body: JSON.stringify({
          effective_from: 'next_billing_period',
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Paddle API error: ${response.status} - ${errorText}`);
    }

    await updateSubscription(userId, {
      cancelAtPeriodEnd: true,
    });

    console.log(`[Paddle] Subscription canceled for user ${userId}`);
  } catch (error) {
    console.error('Error canceling subscription:', error);
    throw error;
  }
}

/**
 * Get Paddle customer portal URL for managing subscription
 */
export async function getCustomerPortalUrl(userId: string): Promise<string> {
  const subscription = await getSubscription(userId);
  if (!subscription || !subscription.paddleCustomerId) {
    throw new Error('No subscription found');
  }

  // Paddle automatically provides a customer portal
  // Return the portal URL for this customer
  return `https://${PADDLE_ENVIRONMENT === 'production' ? 'vendors' : 'sandbox-vendors'}.paddle.com/subscriptions/customers/${subscription.paddleCustomerId}`;
}
