import Stripe from 'stripe';

export default class StripeService {
  constructor(secretKey, endpointSecret) {
    this.stripe = new Stripe(secretKey, { apiVersion: '2022-11-15' });
    this.endpointSecret = endpointSecret;
  }

  async handleWebhook(req, res) {
    // Debug logging for incoming request
    console.log('========= WEBHOOK DEBUG =========');
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Stripe-Signature:', req.headers['stripe-signature']);
    console.log('Body type:', typeof req.body);
    console.log('Body is Buffer:', Buffer.isBuffer(req.body));
    if (Buffer.isBuffer(req.body)) {
        console.log('Body length:', req.body.length);
        // Log first 100 characters of body as string
        console.log('Body preview:', req.body.toString().substring(0, 100));
    }

    const signature = req.headers['stripe-signature'];
    let event;

    try {
      // Get raw body as it was already parsed as raw by express.raw() middleware
      event = this.stripe.webhooks.constructEvent(
        req.body, // req.body is already raw buffer due to express.raw()
        signature,
        this.endpointSecret
      );
      // Log successful event details
      console.log('✅ Event verified successfully');
      console.log('Event Type:', event.type);
      console.log('Event ID:', event.id);
    } catch (err) {
      console.error(`⚠️ Webhook signature verification failed: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Process the event
    try {
      switch (event.type) {
        case 'payment_intent.succeeded': {
          const paymentIntent = event.data.object;
          console.log('💰 PaymentIntent Details:', {
              id: paymentIntent.id,
              amount: paymentIntent.amount,
              metadata: paymentIntent.metadata,
              customer: paymentIntent.customer
          });
          await this.handlePaymentIntentSucceeded(paymentIntent);
          break;
        }
        case 'checkout.session.completed': {
          const session = event.data.object;
                console.log('🛍️ Checkout Session Details:', {
                    id: session.id,
                    metadata: session.metadata,
                    customer: session.customer,
                    amount_total: session.amount_total
                });
                break;
        }
        default:
          console.warn(`⚠️ Unhandled event type: ${event.type}`);
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
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    console.log('======= END WEBHOOK DEBUG =======\n');
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
