import Stripe from 'stripe';

export default class StripeWebhook {
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
          const paymentIntent = event.data.object;
          console.log(`✅ PaymentIntent for ${paymentIntent.amount} was successful!`);
          await this.handlePaymentIntentSucceeded(paymentIntent);
          break;
        }
        case 'payment_method.attached': {
          const paymentMethod = event.data.object;
          console.log(`✅ PaymentMethod attached: ${paymentMethod.id}`);
          await this.handlePaymentMethodAttached(paymentMethod);
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
    console.log(`Processing successful payment for: ${paymentIntent.id}`);
  }

  // Custom method to handle attached PaymentMethod
  async handlePaymentMethodAttached(paymentMethod) {
    // Add your business logic for attached payment methods here
    console.log(`Processing attached payment method: ${paymentMethod.id}`);
  }
}