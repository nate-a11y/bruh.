import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('STRIPE_SECRET_KEY is not set - Stripe functionality will be disabled');
}

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-12-15.clover',
      typescript: true,
    })
  : null;

export const STRIPE_CONFIG = {
  priceId: process.env.STRIPE_PRICE_ID || '',
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/settings?tab=billing&success=true`,
  cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL}/settings?tab=billing&canceled=true`,
  portalReturnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/settings?tab=billing`,
};
