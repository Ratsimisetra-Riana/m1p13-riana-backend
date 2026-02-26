const mongoose = require('mongoose');

const BoxSchema = new mongoose.Schema(
  {
    code: String,
    floor: Number,
    zone: String
  },
  { _id: false }
);

const ContactSchema = new mongoose.Schema(
  {
    phone: String,
    email: String
  },
  { _id: false }
);

//ampina images
const ShopSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },

   box: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Box",
      default: null
    },

    rent: {
      type: Number,
      required: true
    },

    contact: {
      type: ContactSchema,
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Shop', ShopSchema);
