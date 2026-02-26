const mongoose = require('mongoose');

const BoxSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true
    },
    floor: {
      type: Number,
      required: true
    },
    zone: {
      type: String,
      required: true
    }
  }, 
   {
    timestamps: true
  }
);


module.exports = mongoose.model('Box', BoxSchema);
