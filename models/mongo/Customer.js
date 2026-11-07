const mongoose = require('mongoose');

// Dirección embebida: vive dentro del documento del cliente
const addressSchema = new mongoose.Schema({
  type: { type: String, enum: ['SHIPPING', 'BILLING'], uppercase: true, required: true },
  street: { type: String, required: true },
  number: String,
  city: { type: String, required: true },
  state: String,
  postalCode: String,
  country: { type: String, default: 'México' }
}, { _id: false });

const customerSchema = new mongoose.Schema({
  userId: Number, // id del usuario en MySQL
  phone: String,
  email: { type: String, lowercase: true, trim: true },
  addresses: [addressSchema]
}, {
  timestamps: true
});

module.exports = mongoose.model('Customer', customerSchema);
