import Stripe from 'stripe';
import FirebaseService from './firebaseService.js';

export default class StripeService {
  constructor(secretKey, endpointSecret) {
    this.stripe = new Stripe(secretKey, { apiVersion: '2022-11-15' });
    this.endpointSecret = endpointSecret;
  }

  async handleWebhook(req, res) {
    console.log('========= WEBHOOK DEBUG =========');

    const signature = req.headers['stripe-signature'];
    let event;

    try {
      // Get raw body as it was already parsed as raw by express.raw() middleware
      event = this.stripe.webhooks.constructEvent(
        req.body, // req.body is already raw buffer due to express.raw()
        signature,
        this.endpointSecret
      );
    } catch (err) {
      console.error(`⚠️ Webhook signature verification failed: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Process the event
    try {
      switch (event.type) {
        case 'payment_intent.succeeded': {
          const paymentIntent = event.data.object;
          console.log('💰 PaymentIntent Details:', {id: paymentIntent.id, amount: paymentIntent.amount, metadata: paymentIntent.metadata, customer: paymentIntent.customer });
          await this.handlePaymentIntentSucceeded(paymentIntent);
          break;
        }
        case 'checkout.session.completed': {
          const session = event.data.object;
                console.log('🛍️ Checkout Session Details:', {id: session.id, metadata: session.metadata, customer: session.customer, amount_total: session.amount_total });
                await this.handleCheckoutSessionCompleted(session)
                break;
        }
        default:
          console.warn(`[Stripe] Unhandled event type: ${event.type}`);
      }

      // Acknowledge receipt of the event
      res.status(200).json({ received: true });
    } catch (err) {
      console.error('🔴 Webhook Error Details:', {
        error: err.message,
        type: err.type,
        stack: err.stack,
        bodyType: typeof req.body,
        bodyIsBuffer: Buffer.isBuffer(req.body),
        signatureHeader: signature,
        endpointSecretPrefix: this.endpointSecret?.substring(0, 10) // Just show prefix for security
      });
      return res.status(400).send(`[Stripe] Webhook Error: ${err.message}`);
    }
    console.log('======= END WEBHOOK DEBUG =======\n');
  }

  // Custom method to handle successful PaymentIntent
  async handlePaymentIntentSucceeded(paymentIntent) {
    // Add your business logic for successful payments here
    console.log(`[Server Stripe]  Processing successful payment for: ${paymentIntent}`);
  }

  // Custom method to handle attached PaymentMethod
  async handleCheckoutSessionCompleted(session) {
    try {
      const { companyId, productId, jobId } = session.metadata;
      if (!companyId || !productId || !jobId) {
        throw new Error('[Server Stripe] Missing metadata in the session');
      }
      const firebaseService = new FirebaseService();
      await firebaseService.handleCheckoutSessionCompleted(companyId, jobId);
  
    } catch (error) {
      console.error('[Server Stripe]  Error in handleCheckoutSessionCompleted:', error.message);
    }
  }
  
  async createCheckoutSession(params) {
    const { companyId, jobId, productId, productPrice, origin } = params;

    if (!companyId || !productId || !productPrice || !origin || !jobId) {
      throw new Error('[Server Stripe] Missing required parameters: companyId, productId, productPrice, and origin are required');
    }

    if (!Number.isInteger(productPrice) || productPrice <= 0) {
      throw new Error('[Server Stripe] Product price must be a positive integer in cents');
    }

    try {
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              product: productId,
              currency: 'usd',
              unit_amount: productPrice,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/cancel`,
        metadata: {
          companyId, 
          productId,
          jobId,
        },
        payment_intent_data: {
          capture_method: 'automatic',
          metadata: {
            companyId,
            productId,
            jobId,
          },
        },
        expires_at: Math.floor(Date.now() / 1000) + (30 * 60), // Session expires in 30 minutes
      });
  
      return session;
    } catch (error) {
      console.error('[Server Stripe] Error creating checkout session:', error.message);
      throw error;
    }
  }
}
