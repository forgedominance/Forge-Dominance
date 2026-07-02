const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const supabase = require('../config/supabase');
const { isMissingTableError } = require('../lib/dbUtils');

const router = express.Router();

async function getStripeConfig() {
  try {
    const { data, error } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('key', 'global')
      .limit(1)
      .single();
    if (error && !isMissingTableError(error)) throw error;
    const settings = data?.value || {};
    return settings.stripe || {};
  } catch {
    return {};
  }
}

function getStripeInstance(secretKey) {
  if (!secretKey) return null;
  try {
    return require('stripe')(secretKey);
  } catch {
    return null;
  }
}

// POST /checkout/create-session - Create a Stripe Checkout session
router.post('/checkout/create-session', async (req, res) => {
  try {
    const config = await getStripeConfig();
    if (!config.enabled || !config.secretKey) {
      return res.status(400).json({ error: 'Stripe payments are not enabled' });
    }

    const stripe = getStripeInstance(config.secretKey);
    if (!stripe) {
      return res.status(500).json({ error: 'Failed to initialize Stripe' });
    }

    const { items, successUrl, cancelUrl, customerEmail } = req.body || {};
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items array is required' });
    }

    const lineItems = items.map(item => ({
      price_data: {
        currency: config.currency || 'usd',
        product_data: {
          name: String(item.name || 'Product'),
          ...(item.image ? { images: [item.image] } : {})
        },
        unit_amount: Math.round(Number(item.price || 0) * 100)
      },
      quantity: Number(item.quantity || 1)
    }));

    const sessionParams = {
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: successUrl || `${req.protocol}://${req.get('host')}/pages/checkout/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${req.protocol}://${req.get('host')}/pages/checkout/cancel.html`
    };

    if (customerEmail) {
      sessionParams.customer_email = customerEmail;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    res.json({
      sessionId: session.id,
      url: session.url
    });
  } catch (error) {
    console.error('[Stripe] Checkout session error:', error.message);
    const errMsg = process.env.NODE_ENV === 'production' ? 'Failed to create checkout session' : error.message;
    res.status(500).json({ error: errMsg });
  }
});

// GET /checkout/session/:id - Get session details (for success page)
router.get('/checkout/session/:id', async (req, res) => {
  try {
    const config = await getStripeConfig();
    if (!config.enabled || !config.secretKey) {
      return res.status(400).json({ error: 'Stripe payments are not enabled' });
    }

    const stripe = getStripeInstance(config.secretKey);
    if (!stripe) {
      return res.status(500).json({ error: 'Failed to initialize Stripe' });
    }

    const session = await stripe.checkout.sessions.retrieve(req.params.id, {
      expand: ['line_items', 'payment_intent']
    });

    res.json({
      id: session.id,
      status: session.payment_status,
      customerEmail: session.customer_email || session.customer_details?.email || '',
      amountTotal: session.amount_total,
      currency: session.currency,
      lineItems: (session.line_items?.data || []).map(li => ({
        name: li.description,
        quantity: li.quantity,
        amount: li.amount_total
      }))
    });
  } catch (error) {
    console.error('[Stripe] Session retrieval error:', error.message);
    const errMsg = process.env.NODE_ENV === 'production' ? 'Failed to retrieve session' : error.message;
    res.status(500).json({ error: errMsg });
  }
});

// POST /webhook - Stripe webhook handler
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const config = await getStripeConfig();
    if (!config.secretKey) {
      return res.status(400).json({ error: 'Stripe not configured' });
    }

    const stripe = getStripeInstance(config.secretKey);
    if (!stripe) {
      return res.status(500).json({ error: 'Failed to initialize Stripe' });
    }

    let event;
    if (config.webhookSecret) {
      const sig = req.headers['stripe-signature'];
      event = stripe.webhooks.constructEvent(req.body, sig, config.webhookSecret);
    } else {
      event = req.body;
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        console.log('[Stripe] Payment completed:', session.id, session.customer_email);
        break;
      }
      case 'payment_intent.succeeded': {
        const intent = event.data.object;
        console.log('[Stripe] PaymentIntent succeeded:', intent.id);
        break;
      }
      default:
        console.log('[Stripe] Unhandled event:', event.type);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('[Stripe] Webhook error:', error.message);
    const errMsg = process.env.NODE_ENV === 'production' ? 'Webhook error' : error.message;
    res.status(400).json({ error: errMsg });
  }
});

// GET /config/public - Return publishable key (no auth required)
router.get('/config/public', async (_req, res) => {
  try {
    const config = await getStripeConfig();
    res.json({
      enabled: !!config.enabled,
      publishableKey: config.publishableKey || '',
      currency: config.currency || 'usd'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load config' });
  }
});

module.exports = router;


