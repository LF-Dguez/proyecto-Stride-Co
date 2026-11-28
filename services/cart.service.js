// F4: la bolsa vive en una cookie (variantId + cantidad), nunca en el servidor;
// precios y existencias siempre se consultan en la base de datos al mostrarla o
// al pagar (sección 4.9: el navegador solo manda identificadores y cantidades).
const { ProductVariant, Product, Inventory } = require('../models/sql');

const COOKIE_NAME = 'cart';
const MAX_QUANTITY = 20;

function readCart(req) {
  const raw = req.cookies && req.cookies[COOKIE_NAME];
  if (!raw) return [];
  try {
    const items = JSON.parse(raw);
    if (!Array.isArray(items)) return [];
    return items
      .filter((it) => it && Number.isInteger(it.variantId) && Number.isInteger(it.quantity))
      .map((it) => ({ variantId: it.variantId, quantity: Math.min(MAX_QUANTITY, Math.max(1, it.quantity)) }));
  } catch {
    return [];
  }
}

function writeCart(res, items) {
  res.cookie(COOKIE_NAME, JSON.stringify(items), { httpOnly: true, sameSite: 'lax' });
}

function clearCart(res) {
  res.clearCookie(COOKIE_NAME);
}

function addItem(items, variantId, quantity) {
  const existing = items.find((it) => it.variantId === variantId);
  if (existing) {
    existing.quantity = Math.min(MAX_QUANTITY, existing.quantity + quantity);
    return [...items];
  }
  return [...items, { variantId, quantity: Math.min(MAX_QUANTITY, quantity) }];
}

function setItemQuantity(items, variantId, quantity) {
  if (quantity <= 0) return items.filter((it) => it.variantId !== variantId);
  return items.map((it) => (it.variantId === variantId ? { ...it, quantity: Math.min(MAX_QUANTITY, quantity) } : it));
}

function removeItem(items, variantId) {
  return items.filter((it) => it.variantId !== variantId);
}

// Resuelve la bolsa contra la base de datos: nombre, variante, precio y
// disponible actuales. Una variante borrada o desactivada se marca pero no se
// elimina sola de la cookie (el usuario la quita con el botón, nunca sorpresa).
async function resolveCart(items) {
  if (!items.length) return { lines: [], subtotal: 0 };

  const variants = await ProductVariant.findAll({
    where: { id: items.map((it) => it.variantId) },
    include: [{ model: Product, as: 'product' }, { model: Inventory, as: 'inventory' }]
  });
  const byId = new Map(variants.map((v) => [v.id, v]));

  const lines = items.map((it) => {
    const variant = byId.get(it.variantId);
    if (!variant || !variant.active || !variant.product || !variant.product.active) {
      return { variantId: it.variantId, quantity: it.quantity, missing: true };
    }
    const available = variant.inventory ? Math.max(0, variant.inventory.stock - variant.inventory.reserved) : 0;
    const price = Number(variant.product.price);
    return {
      variantId: variant.id,
      productId: variant.product.id,
      productName: variant.product.name,
      color: variant.color,
      size: variant.size,
      price,
      quantity: it.quantity,
      available,
      lineTotal: price * it.quantity
    };
  });

  const subtotal = lines.filter((l) => !l.missing).reduce((sum, l) => sum + l.lineTotal, 0);
  return { lines, subtotal };
}

module.exports = { readCart, writeCart, clearCart, addItem, setItemQuantity, removeItem, resolveCart };
