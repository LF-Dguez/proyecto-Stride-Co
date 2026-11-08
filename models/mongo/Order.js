const mongoose = require('mongoose');

// Producto comprado: se guarda el precio del momento de la compra
const itemSchema = new mongoose.Schema({
  productId: { type: Number, required: true, min: 1 }, // id del producto en PostgreSQL
  quantity: {
    type: Number,
    required: true,
    min: 1,
    validate: { validator: Number.isInteger, message: 'La cantidad debe ser un entero' }
  },
  unitPrice: { type: Number, required: true, min: 0 }
}, { _id: false });

const ORDER_STATUSES = ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

// Historial de cambios de estado
const statusHistorySchema = new mongoose.Schema({
  status: { type: String, enum: ORDER_STATUSES, required: true },
  changedById: Number, // id del usuario que cambió el estado (PostgreSQL)
  changedAt: { type: Date, default: Date.now },
  note: String
}, { _id: false });

const shippingAddressSchema = new mongoose.Schema({
  street: String,
  number: String,
  city: String,
  state: String,
  postalCode: String,
  country: String
}, { _id: false });

const orderSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  salesPersonId: Number, // id del vendedor (usuario en PostgreSQL)
  status: { type: String, enum: ORDER_STATUSES, default: 'PENDING' },
  paymentMethod: { type: String, enum: ['CARD', 'CASH', 'TRANSFER'] },
  shippingAddress: shippingAddressSchema,
  items: [itemSchema],
  statusHistory: [statusHistorySchema],
  totals: {
    subtotal: { type: Number, default: 0, min: 0 },
    shipping: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    total: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// Calcula subtotal y total a partir de los items antes de guardar
orderSchema.pre('validate', function () {
  this.totals.subtotal = this.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  this.totals.total = this.totals.subtotal + this.totals.shipping - this.totals.discount;
});

module.exports = mongoose.model('Order', orderSchema);