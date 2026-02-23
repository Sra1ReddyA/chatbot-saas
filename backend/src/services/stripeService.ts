import Stripe from 'stripe';
import { config } from '../config';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import type { Plan, SubscriptionStatus } from '@prisma/client';

// Stripe is optional — only initialized when key is present
export const stripe = config.STRIPE_SECRET_KEY
  ? new Stripe(config.STRIPE_SECRET_KEY, {
      apiVersion: '2024-06-20',
      typescript: true,
    })
  : null;

const PLAN_PRICE_MAP: Record<string, Plan> = {};

export function initPlanPriceMap() {
  PLAN_PRICE_MAP[config.STRIPE_PRICE_STARTER] = 'STARTER';
  PLAN_PRICE_MAP[config.STRIPE_PRICE_GROWTH] = 'GROWTH';
  PLAN_PRICE_MAP[config.STRIPE_PRICE_ENTERPRISE] = 'ENTERPRISE';
}

export async function createStripeCustomer(
  orgId: string,
  email: string,
  name: string
): Promise<string> {
  if (!stripe) throw new Error('Stripe is not configured');
  const customer = await stripe.customers.create({
    email,
    name,
    metadata: { organizationId: orgId },
  });

  await prisma.organization.update({
    where: { id: orgId },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
}

export async function createCheckoutSession(
  orgId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string
): Promise<string> {
  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) throw new Error('Organization not found');

  let customerId = org.stripeCustomerId;
  if (!customerId) {
    const user = await prisma.user.findFirst({
      where: { organizationId: orgId, role: 'owner' },
    });
    if (!user) throw new Error('Owner not found');
    customerId = await createStripeCustomer(orgId, user.email, org.name);
  }

  const session = await stripe!.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl,
    metadata: { organizationId: orgId },
    subscription_data: {
      metadata: { organizationId: orgId },
    },
    allow_promotion_codes: true,
  });

  return session.url!;
}

export async function createBillingPortalSession(
  orgId: string,
  returnUrl: string
): Promise<string> {
  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org?.stripeCustomerId) throw new Error('No billing account found');

  if (!stripe) throw new Error('Stripe is not configured');
  const session = await stripe.billingPortal.sessions.create({
    customer: org.stripeCustomerId,
    return_url: returnUrl,
  });

  return session.url;
}

export async function handleStripeWebhook(
  payload: Buffer,
  signature: string
): Promise<void> {
  if (!stripe || !config.STRIPE_WEBHOOK_SECRET) throw new Error('Stripe webhooks not configured');
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      payload,
      signature,
      config.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    throw new Error(`Webhook signature verification failed: ${err}`);
  }

  logger.info('Stripe webhook received', { type: event.type });

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      await syncSubscription(subscription);
      break;
    }
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      await cancelSubscription(subscription);
      break;
    }
    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice;
      await handleInvoicePaid(invoice);
      break;
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      await handlePaymentFailed(invoice);
      break;
    }
    default:
      logger.debug('Unhandled Stripe event', { type: event.type });
  }
}

async function syncSubscription(subscription: Stripe.Subscription): Promise<void> {
  const orgId = subscription.metadata.organizationId;
  if (!orgId) return;

  const priceId = subscription.items.data[0]?.price.id;
  const plan: Plan = PLAN_PRICE_MAP[priceId] || 'FREE';

  const statusMap: Record<Stripe.Subscription.Status, SubscriptionStatus> = {
    active: 'ACTIVE',
    canceled: 'CANCELED',
    past_due: 'PAST_DUE',
    trialing: 'TRIALING',
    incomplete: 'INCOMPLETE',
    incomplete_expired: 'CANCELED',
    unpaid: 'PAST_DUE',
    paused: 'CANCELED',
  };

  const status = statusMap[subscription.status] || 'CANCELED';

  await prisma.organization.update({
    where: { id: orgId },
    data: {
      stripeSubscriptionId: subscription.id,
      plan,
      subscriptionStatus: status,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    },
  });

  logger.info('Subscription synced', { orgId, plan, status });
}

async function cancelSubscription(subscription: Stripe.Subscription): Promise<void> {
  const orgId = subscription.metadata.organizationId;
  if (!orgId) return;

  await prisma.organization.update({
    where: { id: orgId },
    data: {
      plan: 'FREE',
      subscriptionStatus: 'CANCELED',
      stripeSubscriptionId: null,
    },
  });

  logger.info('Subscription canceled', { orgId });
}

async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  const customerId = invoice.customer as string;
  const org = await prisma.organization.findFirst({
    where: { stripeCustomerId: customerId },
  });
  if (!org) return;

  await prisma.invoice.create({
    data: {
      stripeInvoiceId: invoice.id,
      organizationId: org.id,
      amount: invoice.amount_paid,
      currency: invoice.currency,
      status: 'paid',
      paidAt: invoice.status_transitions.paid_at
        ? new Date(invoice.status_transitions.paid_at * 1000)
        : new Date(),
      invoiceUrl: invoice.hosted_invoice_url,
    },
  });
}

async function handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const customerId = invoice.customer as string;
  const org = await prisma.organization.findFirst({
    where: { stripeCustomerId: customerId },
  });
  if (!org) return;

  await prisma.organization.update({
    where: { id: org.id },
    data: { subscriptionStatus: 'PAST_DUE' },
  });

  logger.warn('Payment failed', { orgId: org.id });
}
