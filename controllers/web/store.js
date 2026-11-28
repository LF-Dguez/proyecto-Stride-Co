const createError = require('http-errors');
const productService = require('../../services/product.service');
const cartService = require('../../services/cart.service');
const checkoutService = require('../../services/checkout.service');
const orderService = require('../../services/order.service');
const { formatPrice, formatDate } = require('../../utils/format');

function safeNext(value, fallback) {
  return typeof value === 'string' && /^\/(?!\/)/.test(value) ? value : fallback;
}

// Mismo fondo de "shoe-art" que el prototipo, elegido de forma estable por id
// para que un producto no cambie de color entre una visita y otra.
const SHOE_ART_COLORS = ['#e9f1fd', '#f3e9df', '#e6f0e9', '#eae8f6'];

// Variantes del modelo 3D de muestra (ver README, sección de créditos). Un producto
// siempre usa la misma variante para que no "parpadee" de color entre peticiones.
const MODEL_VARIANTS = ['midnight', 'street', 'beach'];

function toCardData(product, locale) {
  return {
    id: product.id,
    name: product.name,
    brand: product.brand,
    category: productService.CATEGORY_LABELS[product.category_id] || '',
    priceLabel: formatPrice(product.price, locale),
    color: SHOE_ART_COLORS[product.id % SHOE_ART_COLORS.length],
    variant: MODEL_VARIANTS[product.id % MODEL_VARIANTS.length]
  };
}

exports.home = async (req, res, next) => {
  try {
    const featured = await productService.listFeatured(4);
    const cards = featured.map((p) => toCardData(p, req.getLocale()));
    res.render('store/home', {
      title: req.__('store.home.titleLine1') + ' ' + req.__('store.home.titleLine2'),
      description: req.__('store.meta.description'),
      featured: cards,
      featuredJson: JSON.stringify(cards)
    });
  } catch (err) {
    next(err);
  }
};

exports.catalog = async (req, res, next) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q : '';
    const category = typeof req.query.category === 'string' ? req.query.category : '';
    const { products, page, pages } = await productService.listActive({ q, category, page: req.query.page });

    res.render('store/catalog', {
      title: req.__('store.catalog.title'),
      description: req.__('store.meta.description'),
      q,
      category,
      categories: productService.CATEGORY_LABELS,
      products: products.map((p) => toCardData(p, req.getLocale())),
      pagination: {
        page,
        pages,
        href: (p) => {
          const params = new URLSearchParams();
          if (q) params.set('q', q);
          if (category) params.set('category', category);
          params.set('page', String(p));
          return `/products?${params.toString()}`;
        }
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.detail = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const product = Number.isInteger(id) ? await productService.getActiveById(id) : null;
    if (!product) return next(createError(404, req.__('webErrors.productNotFound')));

    const variants = (product.variants || [])
      .filter((v) => v.active)
      .map((v) => {
        const inv = v.inventory;
        const available = inv ? Math.max(0, inv.stock - inv.reserved) : 0;
        const label = [v.color, v.size].filter(Boolean).join(' · ') || v.sku;
        const status = available > 0
          ? req.__('store.detail.available', String(available))
          : req.__('store.detail.outOfStock');
        return { id: v.id, available, label: `${label} — ${status}` };
      });

    res.render('store/detail', {
      title: `${product.name} · Stride-Co`,
      description: product.description || req.__('store.meta.description'),
      product: {
        id: product.id,
        name: product.name,
        brand: product.brand,
        description: product.description,
        category: productService.CATEGORY_LABELS[product.category_id] || '',
        priceLabel: formatPrice(product.price, req.getLocale()),
        color: SHOE_ART_COLORS[product.id % SHOE_ART_COLORS.length],
        variant: MODEL_VARIANTS[product.id % MODEL_VARIANTS.length]
      },
      variants
    });
  } catch (err) {
    next(err);
  }
};

// ---------- F4: bolsa de compra ----------

function lineViewModel(line, locale) {
  if (line.missing) return { ...line, missing: true };
  return {
    ...line,
    priceLabel: formatPrice(line.price, locale),
    lineTotalLabel: formatPrice(line.lineTotal, locale)
  };
}

exports.cartView = async (req, res, next) => {
  try {
    const items = cartService.readCart(req);
    const { lines, subtotal } = await cartService.resolveCart(items);
    res.render('store/cart', {
      title: req.__('store.cart.title'),
      description: req.__('store.meta.description'),
      lines: lines.map((l) => lineViewModel(l, req.getLocale())),
      subtotalLabel: formatPrice(subtotal, req.getLocale())
    });
  } catch (err) {
    next(err);
  }
};

exports.cartAddItem = (req, res, next) => {
  try {
    const variantId = Number(req.body.variantId);
    const quantity = Math.max(1, Number.parseInt(req.body.quantity, 10) || 1);
    if (!Number.isInteger(variantId)) return next(createError(400, req.__('common.invalidId')));

    const items = cartService.addItem(cartService.readCart(req), variantId, quantity);
    cartService.writeCart(res, items);
    res.setFlash(req.__('store.cart.added'));
    res.redirect(safeNext(req.body.next, '/cart'));
  } catch (err) {
    next(err);
  }
};

exports.cartUpdateItem = (req, res, next) => {
  try {
    const variantId = Number(req.params.variantId);
    const quantity = Number.parseInt(req.body.quantity, 10);
    if (!Number.isInteger(variantId) || !Number.isInteger(quantity)) {
      return next(createError(400, req.__('common.invalidId')));
    }
    cartService.writeCart(res, cartService.setItemQuantity(cartService.readCart(req), variantId, quantity));
    res.redirect('/cart');
  } catch (err) {
    next(err);
  }
};

exports.cartRemoveItem = (req, res, next) => {
  try {
    const variantId = Number(req.params.variantId);
    cartService.writeCart(res, cartService.removeItem(cartService.readCart(req), variantId));
    res.redirect('/cart');
  } catch (err) {
    next(err);
  }
};

// ---------- F5: checkout y confirmación ----------

async function renderCheckout(req, res, status, { errors, values }) {
  const items = cartService.readCart(req);
  const { lines, subtotal } = await cartService.resolveCart(items);
  res.status(status).render('store/checkout', {
    title: req.__('store.checkout.title'),
    description: req.__('store.meta.description'),
    lines: lines.map((l) => lineViewModel(l, req.getLocale())),
    subtotalLabel: formatPrice(subtotal, req.getLocale()),
    shippingLabel: formatPrice(checkoutService.SHIPPING_COST, req.getLocale()),
    totalLabel: formatPrice(subtotal + checkoutService.SHIPPING_COST, req.getLocale()),
    errors,
    values
  });
}

exports.checkoutForm = async (req, res, next) => {
  try {
    const items = cartService.readCart(req);
    if (!items.length) {
      res.setFlash(req.__('store.cart.empty'), 'error');
      return res.redirect('/cart');
    }
    await renderCheckout(req, res, 200, { errors: {}, values: { country: 'México' } });
  } catch (err) {
    next(err);
  }
};

exports.checkoutSubmit = async (req, res, next) => {
  try {
    const body = req.body || {};
    const items = cartService.readCart(req);
    const { lines } = await cartService.resolveCart(items);

    const errors = {};
    if (!body.street || !String(body.street).trim()) errors.street = req.__('store.checkout.errors.streetRequired');
    if (!body.city || !String(body.city).trim()) errors.city = req.__('store.checkout.errors.cityRequired');
    if (!['CARD', 'CASH', 'TRANSFER'].includes(body.paymentMethod)) {
      errors.paymentMethod = req.__('store.checkout.errors.paymentRequired');
    }
    const hasStockIssue = !lines.length || lines.some((l) => l.missing || l.quantity > l.available);
    if (hasStockIssue) errors.cart = req.__('store.checkout.errors.insufficientStock');

    if (Object.keys(errors).length > 0) {
      return renderCheckout(req, res, 400, { errors, values: body });
    }

    const address = {
      type: 'SHIPPING',
      street: body.street.trim(),
      number: body.number,
      city: body.city.trim(),
      state: body.state,
      postalCode: body.postalCode,
      country: body.country || 'México'
    };

    const order = await checkoutService.placeOrder({
      userId: req.user.id,
      email: req.user.email,
      lines,
      address,
      paymentMethod: body.paymentMethod
    });

    cartService.clearCart(res);
    res.redirect(`/my/orders/${order._id}/confirmation`);
  } catch (err) {
    if (err.code === 'INSUFFICIENT_STOCK') {
      res.setFlash(req.__('store.checkout.errors.insufficientStock'), 'error');
      return res.redirect('/cart');
    }
    next(err);
  }
};

async function findOrderOr404(req, next) {
  const order = await orderService.getOrderDetail(req.params.id).catch((err) => {
    if (err.name === 'CastError') return null;
    throw err;
  });
  if (!order) next(createError(404, req.__('store.myOrders.notFound')));
  return order;
}

exports.orderConfirmation = async (req, res, next) => {
  try {
    const order = await findOrderOr404(req, next);
    if (!order) return;
    res.render('store/confirmation', {
      title: req.__('store.checkout.confirmationTitle'),
      description: req.__('store.meta.description'),
      order: {
        id: order._id.toString(),
        items: order.items.map((i) => ({
          productName: i.productName,
          quantity: i.quantity,
          unitPriceLabel: formatPrice(i.unitPrice, req.getLocale())
        })),
        totalLabel: formatPrice(order.totals.total, req.getLocale())
      }
    });
  } catch (err) {
    next(err);
  }
};

// ---------- F6: mis pedidos ----------

exports.myOrdersList = async (req, res, next) => {
  try {
    const orders = await orderService.listMine(req.user.id);
    res.render('store/myOrders/list', {
      title: req.__('store.myOrders.title'),
      description: req.__('store.meta.description'),
      orders: orders.map((o) => ({
        id: o._id.toString(),
        status: o.status,
        totalLabel: formatPrice(o.totals.total, req.getLocale()),
        dateLabel: formatDate(o.createdAt, req.getLocale())
      }))
    });
  } catch (err) {
    next(err);
  }
};

exports.myOrderDetail = async (req, res, next) => {
  try {
    const order = await findOrderOr404(req, next);
    if (!order) return;
    res.render('store/myOrders/detail', {
      title: req.__('store.myOrders.detailTitle'),
      description: req.__('store.meta.description'),
      order: {
        id: order._id.toString(),
        status: order.status,
        address: order.shippingAddress,
        items: order.items.map((i) => ({
          productName: i.productName,
          quantity: i.quantity,
          unitPriceLabel: formatPrice(i.unitPrice, req.getLocale())
        })),
        totals: {
          subtotalLabel: formatPrice(order.totals.subtotal, req.getLocale()),
          shippingLabel: formatPrice(order.totals.shipping, req.getLocale()),
          discountLabel: formatPrice(order.totals.discount, req.getLocale()),
          totalLabel: formatPrice(order.totals.total, req.getLocale())
        },
        history: [...order.statusHistory].reverse().map((entry) => ({
          status: entry.status,
          note: entry.note,
          dateLabel: formatDate(entry.changedAt, req.getLocale())
        }))
      }
    });
  } catch (err) {
    next(err);
  }
};
