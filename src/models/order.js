import mongoose from 'mongoose'; // mongoose ইমপোর্ট — MongoDB মডেল তৈরির জন্য

// অর্ডারের প্রতিটি আইটেমের সাব-স্কিমা
const OrderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true }, // প্রডাক্ট রেফারেন্স
  quantity: { type: Number, required: true, min: 1 }, // অর্ডারকৃত পরিমাণ
  price: { type: Number, required: true }, // আইটেমের সময়ের দাম (snapshot)
  title: { type: String }, // আইটেম শিরোনাম (snapshot)
  selectedOptions: { type: mongoose.Schema.Types.Mixed }, // সাইজ/রঙ ইত্যাদি অপশন
}, { _id: false }); // আলাদা _id রাখা অনিবার্য নয়

// মূল Order স্কিমা
const OrderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, sparse: true }, // অর্ডার যাকে করা হয়েছে (গেস্ট হলে null)
  items: { type: [OrderItemSchema], default: [] }, // অর্ডার আইটেমগুলোর অ্যারে
  subTotal: { type: Number, required: true }, // সার্ভারে গণনা করা সাবটোটাল
  payment: { // পেমেন্ট সম্পর্কিত ইনফো
    status: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' }, // পেমেন্ট স্টেটাস
    gateway: { type: String }, // পেমেন্ট গেটওয়ে (stripe, paypal ইত্যাদি)
    transactionId: { type: String }, // পেমেন্ট ট্রানজেকশন আইডি
    raw: { type: mongoose.Schema.Types.Mixed }, // রিসিভ করা রো/গেটওয়ে ডেটা
  },
  metadata: { type: mongoose.Schema.Types.Mixed }, // অতিরিক্ত মেটা (shipping, coupon ইত্যাদি)
  status: { type: String, enum: ['created', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'], default: 'created' }, // অর্ডারের লাইফসাইকেল স্টেট
  orderId: { type: String, unique: true }, // Custom order ID (e.g., ORD-001)
}, { timestamps: true }); // createdAt, updatedAt

export default mongoose.model('Order', OrderSchema); // Order মডেল এক্সপোর্ট
