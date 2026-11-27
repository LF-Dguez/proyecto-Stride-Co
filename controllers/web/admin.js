const createError = require('http-errors');
const { Product, ProductVariant, Inventory } = require('../../models/sql');
const { Order } = require('../../models/mongo');
const productService = require('../../services/product.service');
const orderService = require('../../services/order.service');
const { formatPrice, formatDate } = require('../../utils/format');

// ---------- F7: dashboard ----------

exports.dashboard = async (req, res, next) => {
  try {
    const [productCount, variantCount, stockUnits, orderCount, recentOrders] = await Promise.all([
      Product.count({ where: { active: true } }),
      ProductVariant.count(),
      Inventory.sum('stock'),
      Order.countDocuments(),
      orderService.listRecent(5)
    ]);

    res.render('admin/dashboard', {
      title: req.__('admin.nav.dashboard'),
      activeNav: 'dashboard',
      user: req.user,
      stats: {
        productCount,
        variantCount,
        stockUnits: stockUnits || 0,
        orderCount
      },
      recentOrders: recentOrders.map((order) => ({
        id: order._id.toString(),
        email: order.customerId && order.customerId.email,
        status: order.status,
        totalLabel: formatPrice(order.totals.total, req.getLocale()),
        dateLabel: formatDate(order.createdAt, req.getLocale())
      }))
    });
  } catch (err) {
    next(err);
  }
};

// ---------- F8: administración de productos ----------

function categoryOptions() {
  return [
    { value: '', label: '—' },
    ...Object.entries(productService.CATEGORY_LABELS).map(([value, label]) => ({ value, label }))
  ];
}

function productFormValues(body = {}) {
  return {
    name: typeof body.name === 'string' ? body.name : '',
    brand: typeof body.brand === 'string' ? body.brand : '',
    category_id: body.category_id || '',
    price: typeof body.price === 'string' ? body.price : ''
  };
}

function validateProduct(req, body) {
  const errors = {};
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) errors.name = req.__('admin.products.errors.nameRequired');

  const priceNum = Number(body.price);
  if (typeof body.price !== 'string' || !body.price.trim() || Number.isNaN(priceNum) || priceNum < 0) {
    errors.price = req.__('admin.products.errors.priceInvalid');
  }

  if (body.category_id && !productService.CATEGORY_LABELS[Number(body.category_id)]) {
    errors.category_id = req.__('admin.products.errors.categoryInvalid');
  }

  return errors;
}

function renderProductForm(req, res, status, { productId, values, errors, isNew }) {
  res.status(status).render('admin/products/form', {
    title: isNew ? req.__('admin.products.newTitle') : req.__('admin.products.editTitle'),
    activeNav: 'products',
    isNew,
    productId,
    values,
    errors,
    categoryOptions: categoryOptions()
  });
}

exports.productsList = async (req, res, next) => {
  try {
    const { products, page, pages } = await productService.listAdmin({ page: req.query.page });
    res.render('admin/products/list', {
      title: req.__('admin.products.title'),
      activeNav: 'products',
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        brand: p.brand,
        category: productService.CATEGORY_LABELS[p.category_id] || '—',
        priceLabel: formatPrice(p.price, req.getLocale()),
        active: p.active
      })),
      pagination: { page, pages, href: (p) => `/admin/products?page=${p}` }
    });
  } catch (err) {
    next(err);
  }
};

exports.productsNew = (req, res) => {
  renderProductForm(req, res, 200, {
    productId: null,
    values: { name: '', brand: '', category_id: '', price: '' },
    errors: {},
    isNew: true
  });
};

exports.productsCreate = async (req, res, next) => {
  try {
    const values = productFormValues(req.body);
    const errors = validateProduct(req, req.body);
    if (Object.keys(errors).length > 0) {
      return renderProductForm(req, res, 400, { productId: null, values, errors, isNew: true });
    }

    await productService.createProduct({
      name: values.name.trim(),
      brand: values.brand.trim() || null,
      category_id: values.category_id ? Number(values.category_id) : null,
      price: values.price
    });
    res.setFlash(req.__('admin.products.created'));
    res.redirect('/admin/products');
  } catch (err) {
    next(err);
  }
};

exports.productsEdit = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const product = Number.isInteger(id) ? await productService.getById(id) : null;
    if (!product) return next(createError(404, req.__('admin.products.notFound')));

    renderProductForm(req, res, 200, {
      productId: product.id,
      values: {
        name: product.name,
        brand: product.brand || '',
        category_id: product.category_id != null ? String(product.category_id) : '',
        price: String(product.price)
      },
      errors: {},
      isNew: false
    });
  } catch (err) {
    next(err);
  }
};

exports.productsUpdate = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const product = Number.isInteger(id) ? await productService.getById(id) : null;
    if (!product) return next(createError(404, req.__('admin.products.notFound')));

    const values = productFormValues(req.body);
    const errors = validateProduct(req, req.body);
    if (Object.keys(errors).length > 0) {
      return renderProductForm(req, res, 400, { productId: id, values, errors, isNew: false });
    }

    await productService.updateProduct(id, {
      name: values.name.trim(),
      brand: values.brand.trim() || null,
      category_id: values.category_id ? Number(values.category_id) : null,
      price: values.price
    });
    res.setFlash(req.__('admin.products.updated'));
    res.redirect('/admin/products');
  } catch (err) {
    next(err);
  }
};

exports.productsToggleActive = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const product = Number.isInteger(id) ? await productService.getById(id) : null;
    if (!product) return next(createError(404, req.__('admin.products.notFound')));

    await productService.setActive(id, !product.active);
    res.setFlash(product.active ? req.__('admin.products.deactivated') : req.__('admin.products.activated'));
    res.redirect('/admin/products');
  } catch (err) {
    next(err);
  }
};

// ---------- F11: administración de pedidos ----------

exports.ordersList = async (req, res, next) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : '';
    const orders = await orderService.listOrders({ status });

    res.render('admin/orders/list', {
      title: req.__('admin.orders.title'),
      activeNav: 'orders',
      status,
      statuses: orderService.STATUSES,
      orders: orders.map((order) => ({
        id: order._id.toString(),
        email: order.customerId && order.customerId.email,
        status: order.status,
        totalLabel: formatPrice(order.totals.total, req.getLocale()),
        dateLabel: formatDate(order.createdAt, req.getLocale())
      }))
    });
  } catch (err) {
    next(err);
  }
};

exports.orderDetail = async (req, res, next) => {
  try {
    const order = await orderService.getOrderDetail(req.params.id).catch((err) => {
      if (err.name === 'CastError') return null;
      throw err;
    });
    if (!order) return next(createError(404, req.__('admin.orders.notFound')));

    res.render('admin/orders/detail', {
      title: req.__('admin.orders.detailTitle'),
      activeNav: 'orders',
      statuses: orderService.STATUSES,
      order: {
        id: order._id.toString(),
        status: order.status,
        email: order.customerId && order.customerId.email,
        phone: order.customerId && order.customerId.phone,
        address: order.shippingAddress,
        items: order.items.map((item) => ({
          productName: item.productName,
          quantity: item.quantity,
          unitPriceLabel: formatPrice(item.unitPrice, req.getLocale())
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

exports.orderUpdateStatus = async (req, res, next) => {
  try {
    const { status, note } = req.body || {};
    if (!orderService.STATUSES.includes(status)) {
      return next(createError(400, req.__('admin.orders.errors.statusInvalid')));
    }

    const order = await orderService.appendStatusChange(req.params.id, {
      status,
      note: typeof note === 'string' ? note.trim() : '',
      changedById: req.user.id
    }).catch((err) => {
      if (err.name === 'CastError') return null;
      throw err;
    });
    if (!order) return next(createError(404, req.__('admin.orders.notFound')));

    res.setFlash(req.__('admin.orders.updated'));
    res.redirect(`/admin/orders/${req.params.id}`);
  } catch (err) {
    next(err);
  }
};
