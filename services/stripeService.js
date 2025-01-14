import Stripe from 'stripe';

export default class StripeService {
  constructor(secretKey, endpointSecret) {
    this.stripe = new Stripe(secretKey, { apiVersion: '2022-11-15' });
    this.endpointSecret = endpointSecret;
  }

  async handleWebhook(req, res) {
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
          console.log(`✅ PaymentIntent for ${event.data.object.amount} was successful!`);
          await this.handlePaymentIntentSucceeded(event.data.object);
          break;
        }
        case 'payment_method.attached': {
          console.log(`✅ PaymentMethod attached: ${event.data.object}`);
          await this.handlePaymentMethodAttached(event.data.object);
          break;
        }
        case 'checkout.session.completed': {
          console.log(`✅ Session: ${event.data.object}`);
          await this.handleCheckoutSessionCompleted(event.data.object);
          break;
        }
        default:
          console.warn(`⚠️ Unhandled event type: ${event.type}`);
      }

      // Acknowledge receipt of the event
      res.status(200).json({ received: true });
    } catch (err) {
      console.error(`Error processing webhook event: ${err.message}`);
      res.status(500).send(`Webhook processing failed: ${err.message}`);
    }
  }

  // Custom method to handle successful PaymentIntent
  async handlePaymentIntentSucceeded(paymentIntent) {
    // Add your business logic for successful payments here
    console.log(`Processing successful payment for: ${paymentIntent}`);
  }

  // Custom method to handle attached PaymentMethod
  async handlePaymentMethodAttached(paymentMethod) {
    // Add your business logic for attached payment methods here
    console.log(`Processing attached payment method: ${paymentMethod}`);
  }

  // Custom method to handle attached PaymentMethod
  async handleCheckoutSessionCompleted(session) {
    // Add your business logic for attached payment methods here
    console.log(`Checkout Session Completed: ${session}`);
    
  }
  
  async createCheckoutSession(params) {
    const { companyId, productId, productPrice, origin } = params;

    if (!companyId || !productId || !productPrice || !origin) {
      throw new Error('Missing required parameters: companyId, productId, productPrice, and origin are required');
    }

    if (!Number.isInteger(productPrice) || productPrice <= 0) {
      throw new Error('Product price must be a positive integer in cents');
    }

    try {
      return await this.stripe.checkout.sessions.create({
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
        },
      });
    } catch (error) {
      console.error('Error creating checkout session:', error.message);
      throw error;
    }
  }
}
