import mongoose from 'mongoose';

const CartItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, default: 1, min: 1 },
  // Denormalized snapshot at time of add-to-cart
  price: { type: Number, required: true },
  title: { type: String },
  thumbnail: { type: String },
  selectedOptions: { type: mongoose.Schema.Types.Mixed },
}, { _id: true });

const CartSchema = new mongoose.Schema({
  // Either `user` for authenticated users or `sessionId` for guest carts
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, sparse: true },
  sessionId: { type: String, index: true, sparse: true },
  items: { type: [CartItemSchema], default: [] },
  subTotal: { type: Number, default: 0 }, // maintained server-side
  expiresAt: { type: Date, default: null }, // TTL for guest carts
  meta: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

// Ensure one cart per user when user exists
CartSchema.index({ user: 1 }, { unique: true, sparse: true });

// TTL index for guest carts (expire when expiresAt <= now). expireAfterSeconds: 0 applies exact expireAt.
CartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, sparse: true });

// Recompute subtotal before save to ensure integrity
CartSchema.pre('save', function () {
  this.subTotal = this.items.reduce((sum, it) => sum + (it.price || 0) * (it.quantity || 0), 0);
});

// Helper to set guest TTL (e.g., 30 days)
CartSchema.methods.setGuestTTL = function (days = 30) {
  if (!this.user) {
    const ms = days * 24 * 60 * 60 * 1000;
    this.expiresAt = new Date(Date.now() + ms);
  } else {
    this.expiresAt = null;
  }
};

export default mongoose.model('Cart', CartSchema);