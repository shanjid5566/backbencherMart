import Stripe from "stripe";
import mongoose from "mongoose";
import paymentService from "../src/services/paymentService.js";

export const config = {
  api: {
    bodyParser: false, // Must be false to get raw body for signature verification
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Database connection helper
let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) {
    return cachedDb;
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    cachedDb = mongoose.connection;
    console.log("✅ MongoDB connected in webhook");
    return cachedDb;
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    throw error;
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // Read raw body for signature verification
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const body = Buffer.concat(chunks).toString("utf8");

  const signature = req.headers["stripe-signature"];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("❌ Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`📩 Webhook received: ${event.type}`);

  try {
    // Connect to database
    await connectToDatabase();

    // Handle different event types using service layer
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        
        if (!session.metadata?.orderId) {
          console.error("❌ No orderId in session metadata");
          return res.status(400).json({ error: "Missing orderId in metadata" });
        }

        const order = await paymentService.handleSuccessfulPayment({ session });
        console.log(`✅ Payment successful for order: ${order._id}`);
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object;
        const order = await paymentService.handleFailedPayment({ paymentIntent });
        
        if (order) {
          console.log(`❌ Payment failed for order: ${order._id}`);
        }
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object;
        const order = await paymentService.handleRefund({ charge });
        
        if (order) {
          console.log(`💰 Refund processed for order: ${order._id}`);
        }
        break;
      }

      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error("❌ Error processing webhook:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
