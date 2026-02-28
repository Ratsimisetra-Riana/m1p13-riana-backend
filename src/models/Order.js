const mongoose = require('mongoose');

const OrderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    variantSku: {
      type: String,
      required: true
    },
    variantLabel: {
      type: String,
      required: true
    },
    unitPrice: {
      type: Number,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    }
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop',
      required: true
    },
    channel: {
      type: String,
      enum: ['in_store', 'online', 'phone', 'other'],
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'processing', 'shipped', 'delivered', 'canceled'],
      default: 'pending'
    },
    items: {
      type: [OrderItemSchema],
      required: true,
      validate: {
        validator: function (v) {
          return v.length > 0;
        },
        message: 'An order must have at least one item'
      }
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0
    },
    customerInfo: {
      name: String,
      email: String,
      phone: String
    },
    notes: String
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', OrderSchema);
