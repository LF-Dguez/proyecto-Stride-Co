const mongoose = require('mongoose');

// Producto comprado: se guarda el precio del momento de la compra
const itemSchema = new mongoose.Schema({
  variantId: { type: Number, required: true }, // id de la variante en MySQL
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  salesPersonId: Number, // id del vendedor (usuario en MySQL)
  status: {
    type: String,
    enum: ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
    default: 'PENDING'
  },
  paymentMethod: { type: String, enum: ['CARD', 'CASH', 'TRANSFER'] },
  items: [itemSchema],
  totals: {
    subtotal: { type: Number, default: 0 },
    shipping: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
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
