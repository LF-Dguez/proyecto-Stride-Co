const createError = require('http-errors');
const { Product, ProductVariant, Inventory } = require('../../models/sql');
const { Order } = require('../../models/mongo');
const productService = require('../../services/product.service');
const orderService = require('../../services/order.service');
const variantService = require('../../services/variant.service');
const inventoryService = require('../../services/inventory.service');
const customerService = require('../../services/customer.service');
const userService = require('../../services/user.service');
const roleService = require('../../services/role.service');
const { formatPrice, formatDate } = require('../../utils/format');
const { toHttpError } = require('../../utils/sequelizeHelpers');

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

exports.productsDestroy = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const product = Number.isInteger(id) ? await productService.getById(id) : null;
    if (!product) return next(createError(404, req.__('admin.products.notFound')));

    await productService.deleteProduct(id);
    res.setFlash(req.__('admin.products.deleted'));
    res.redirect('/admin/products');
  } catch (err) {
    const httpError = toHttpError(err, req);
    if (httpError.status === 409) {
      res.setFlash(httpError.message, 'error');
      return res.redirect('/admin/products');
    }
    next(httpError);
  }
};

// ---------- F9: administración de variantes ----------

async function productOptions() {
  const products = await productService.listAllForSelect();
  return products.map((p) => ({ value: String(p.id), label: p.name }));
}

function variantFormValues(body = {}) {
  return {
    product_id: body.product_id || '',
    sku: typeof body.sku === 'string' ? body.sku : '',
    color: typeof body.color === 'string' ? body.color : '',
    size: typeof body.size === 'string' ? body.size : ''
  };
}

function validateVariant(req, body) {
  const errors = {};
  if (!body.product_id || !Number.isInteger(Number(body.product_id))) {
    errors.product_id = req.__('admin.variants.errors.productRequired');
  }
  if (typeof body.sku !== 'string' || !body.sku.trim()) {
    errors.sku = req.__('admin.variants.errors.skuRequired');
  }
  if (typeof body.color !== 'string' || !body.color.trim()) {
    errors.color = req.__('admin.variants.errors.colorRequired');
  }
  if (typeof body.size !== 'string' || !body.size.trim()) {
    errors.size = req.__('admin.variants.errors.sizeRequired');
  }
  return errors;
}

async function renderVariantForm(req, res, status, { variantId, values, errors, isNew }) {
  res.status(status).render('admin/variants/form', {
    title: isNew ? req.__('admin.variants.newTitle') : req.__('admin.variants.editTitle'),
    activeNav: 'variants',
    isNew,
    variantId,
    values,
    errors,
    productOptions: await productOptions()
  });
}

exports.variantsList = async (req, res, next) => {
  try {
    const variants = await variantService.listAll();
    res.render('admin/variants/list', {
      title: req.__('admin.variants.title'),
      activeNav: 'variants',
      variants: variants.map((v) => ({
        id: v.id,
        sku: v.sku,
        productName: v.product ? v.product.name : '—',
        color: v.color,
        size: v.size,
        active: v.active,
        available: v.inventory ? Math.max(0, v.inventory.stock - v.inventory.reserved) : 0
      }))
    });
  } catch (err) {
    next(err);
  }
};

exports.variantsNew = async (req, res, next) => {
  try {
    await renderVariantForm(req, res, 200, {
      variantId: null,
      values: { product_id: '', sku: '', color: '', size: '' },
      errors: {},
      isNew: true
    });
  } catch (err) {
    next(err);
  }
};

exports.variantsCreate = async (req, res, next) => {
  try {
    const values = variantFormValues(req.body);
    const errors = validateVariant(req, req.body);
    if (Object.keys(errors).length > 0) {
      return renderVariantForm(req, res, 400, { variantId: null, values, errors, isNew: true });
    }

    await variantService.createVariant({
      product_id: Number(values.product_id),
      sku: values.sku.trim(),
      color: values.color.trim(),
      size: values.size.trim()
    });
    res.setFlash(req.__('admin.variants.created'));
    res.redirect('/admin/variants');
  } catch (err) {
    const httpError = toHttpError(err, req);
    if (httpError.status === 400) {
      return renderVariantForm(req, res, 400, {
        variantId: null,
        values: variantFormValues(req.body),
        errors: { sku: httpError.message },
        isNew: true
      });
    }
    next(httpError);
  }
};

exports.variantsEdit = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const variant = Number.isInteger(id) ? await variantService.getById(id) : null;
    if (!variant) return next(createError(404, req.__('admin.variants.notFound')));

    await renderVariantForm(req, res, 200, {
      variantId: variant.id,
      values: {
        product_id: variant.product_id != null ? String(variant.product_id) : '',
        sku: variant.sku,
        color: variant.color || '',
        size: variant.size || ''
      },
      errors: {},
      isNew: false
    });
  } catch (err) {
    next(err);
  }
};

exports.variantsUpdate = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const variant = Number.isInteger(id) ? await variantService.getById(id) : null;
    if (!variant) return next(createError(404, req.__('admin.variants.notFound')));

    const values = variantFormValues(req.body);
    const errors = validateVariant(req, req.body);
    if (Object.keys(errors).length > 0) {
      return renderVariantForm(req, res, 400, { variantId: id, values, errors, isNew: false });
    }

    await variantService.updateVariant(id, {
      product_id: Number(values.product_id),
      sku: values.sku.trim(),
      color: values.color.trim(),
      size: values.size.trim()
    });
    res.setFlash(req.__('admin.variants.updated'));
    res.redirect('/admin/variants');
  } catch (err) {
    const httpError = toHttpError(err, req);
    if (httpError.status === 400) {
      return renderVariantForm(req, res, 400, {
        variantId: Number(req.params.id),
        values: variantFormValues(req.body),
        errors: { sku: httpError.message },
        isNew: false
      });
    }
    next(httpError);
  }
};

// ---------- F10: inventario ----------

exports.inventoryList = async (req, res, next) => {
  try {
    const rows = await inventoryService.listAll();
    res.render('admin/inventory/list', {
      title: req.__('admin.inventory.title'),
      activeNav: 'inventory',
      rows: rows.map((inv) => ({
        variantId: inv.variant_id,
        sku: inv.variant ? inv.variant.sku : '—',
        productName: inv.variant && inv.variant.product ? inv.variant.product.name : '—',
        color: inv.variant ? inv.variant.color : '',
        size: inv.variant ? inv.variant.size : '',
        stock: inv.stock,
        reserved: inv.reserved,
        available: Math.max(0, inv.stock - inv.reserved)
      }))
    });
  } catch (err) {
    next(err);
  }
};

exports.inventoryUpdate = async (req, res, next) => {
  try {
    const variantId = Number(req.params.variantId);
    const stock = Number(req.body.stock);
    const reserved = Number(req.body.reserved);

    if (!Number.isInteger(variantId)) return next(createError(400, req.__('common.invalidId')));
    if (!Number.isInteger(stock) || stock < 0 || !Number.isInteger(reserved) || reserved < 0) {
      res.setFlash(req.__('admin.inventory.errors.invalidNumbers'), 'error');
      return res.redirect('/admin/inventory');
    }
    if (reserved > stock) {
      res.setFlash(req.__('admin.inventory.errors.reservedExceedsStock'), 'error');
      return res.redirect('/admin/inventory');
    }

    const updated = await inventoryService.adjust(variantId, { stock, reserved });
    if (!updated) return next(createError(404, req.__('admin.inventory.notFound')));

    res.setFlash(req.__('admin.inventory.updated'));
    res.redirect('/admin/inventory');
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

// ---------- F12: clientes ----------

exports.customersList = async (req, res, next) => {
  try {
    const customers = await customerService.listAll();
    res.render('admin/customers/list', {
      title: req.__('admin.customers.title'),
      activeNav: 'customers',
      customers: customers.map((c) => ({
        id: c._id.toString(),
        email: c.email,
        phone: c.phone,
        addressCount: (c.addresses || []).length
      }))
    });
  } catch (err) {
    next(err);
  }
};

exports.customerDetail = async (req, res, next) => {
  try {
    const result = await customerService.getDetail(req.params.id).catch((err) => {
      if (err.name === 'CastError') return null;
      throw err;
    });
    if (!result) return next(createError(404, req.__('admin.customers.notFound')));

    res.render('admin/customers/detail', {
      title: req.__('admin.customers.detailTitle'),
      activeNav: 'customers',
      customer: {
        id: result.customer._id.toString(),
        email: result.customer.email,
        phone: result.customer.phone,
        addresses: result.customer.addresses || []
      },
      orders: result.orders.map((order) => ({
        id: order._id.toString(),
        status: order.status,
        totalLabel: formatPrice(order.totals.total, req.getLocale()),
        dateLabel: formatDate(order.createdAt, req.getLocale())
      }))
    });
  } catch (err) {
    next(err);
  }
};

// ---------- F13: usuarios internos ----------

function userFormValues(body = {}) {
  return {
    first_name: typeof body.first_name === 'string' ? body.first_name : '',
    last_name: typeof body.last_name === 'string' ? body.last_name : '',
    email: typeof body.email === 'string' ? body.email : '',
    role_id: body.role_id || ''
  };
}

function validateUser(req, body, { isNew }) {
  const errors = {};
  if (!body.first_name || !String(body.first_name).trim()) errors.first_name = req.__('admin.users.errors.firstNameRequired');
  if (!body.last_name || !String(body.last_name).trim()) errors.last_name = req.__('admin.users.errors.lastNameRequired');
  if (!body.email || !String(body.email).trim()) errors.email = req.__('admin.users.errors.emailRequired');
  if (!body.role_id || !Number.isInteger(Number(body.role_id))) errors.role_id = req.__('admin.users.errors.roleRequired');

  const MIN_PASSWORD_LENGTH = 8;
  if (isNew && (typeof body.password !== 'string' || body.password.length < MIN_PASSWORD_LENGTH)) {
    errors.password = req.__('admin.users.errors.passwordRequired', String(MIN_PASSWORD_LENGTH));
  } else if (!isNew && body.password && body.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = req.__('admin.users.errors.passwordRequired', String(MIN_PASSWORD_LENGTH));
  }
  return errors;
}

async function roleOptions() {
  const roles = await userService.listRoles();
  return roles.map((r) => ({ value: String(r.id), label: r.description || r.name }));
}

async function renderUserForm(req, res, status, { userId, values, errors, isNew }) {
  res.status(status).render('admin/users/form', {
    title: isNew ? req.__('admin.users.newTitle') : req.__('admin.users.editTitle'),
    activeNav: 'users',
    isNew,
    userId,
    values,
    errors,
    roleOptions: await roleOptions()
  });
}

exports.usersList = async (req, res, next) => {
  try {
    const users = await userService.listAll();
    res.render('admin/users/list', {
      title: req.__('admin.users.title'),
      activeNav: 'users',
      users: users.map((u) => ({
        id: u.id,
        name: `${u.first_name} ${u.last_name}`,
        email: u.email,
        roleName: u.role ? (u.role.description || u.role.name) : '—',
        active: u.active
      }))
    });
  } catch (err) {
    next(err);
  }
};

exports.usersNew = async (req, res, next) => {
  try {
    await renderUserForm(req, res, 200, {
      userId: null,
      values: { first_name: '', last_name: '', email: '', role_id: '' },
      errors: {},
      isNew: true
    });
  } catch (err) {
    next(err);
  }
};

exports.usersCreate = async (req, res, next) => {
  try {
    const values = userFormValues(req.body);
    const errors = validateUser(req, req.body, { isNew: true });
    if (Object.keys(errors).length > 0) {
      return renderUserForm(req, res, 400, { userId: null, values, errors, isNew: true });
    }

    await userService.createUser({
      first_name: values.first_name.trim(),
      last_name: values.last_name.trim(),
      email: values.email.trim(),
      role_id: Number(values.role_id),
      password: req.body.password
    });
    res.setFlash(req.__('admin.users.created'));
    res.redirect('/admin/users');
  } catch (err) {
    const httpError = toHttpError(err, req);
    if (httpError.status === 400) {
      const message = err.name === 'SequelizeUniqueConstraintError' ? req.__('users.emailTaken') : httpError.message;
      return renderUserForm(req, res, 400, {
        userId: null,
        values: userFormValues(req.body),
        errors: { email: message },
        isNew: true
      });
    }
    next(httpError);
  }
};

exports.usersEdit = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const user = Number.isInteger(id) ? await userService.getById(id) : null;
    if (!user) return next(createError(404, req.__('admin.users.notFound')));

    await renderUserForm(req, res, 200, {
      userId: user.id,
      values: {
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role_id: user.role_id != null ? String(user.role_id) : ''
      },
      errors: {},
      isNew: false
    });
  } catch (err) {
    next(err);
  }
};

exports.usersUpdate = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const user = Number.isInteger(id) ? await userService.getById(id) : null;
    if (!user) return next(createError(404, req.__('admin.users.notFound')));

    const values = userFormValues(req.body);
    const errors = validateUser(req, req.body, { isNew: false });
    if (Object.keys(errors).length > 0) {
      return renderUserForm(req, res, 400, { userId: id, values, errors, isNew: false });
    }

    await userService.updateUser(id, {
      first_name: values.first_name.trim(),
      last_name: values.last_name.trim(),
      email: values.email.trim(),
      role_id: Number(values.role_id)
    }, req.body.password);
    res.setFlash(req.__('admin.users.updated'));
    res.redirect('/admin/users');
  } catch (err) {
    const httpError = toHttpError(err, req);
    if (httpError.status === 400) {
      const message = err.name === 'SequelizeUniqueConstraintError' ? req.__('users.emailTaken') : httpError.message;
      return renderUserForm(req, res, 400, {
        userId: Number(req.params.id),
        values: userFormValues(req.body),
        errors: { email: message },
        isNew: false
      });
    }
    next(httpError);
  }
};

exports.usersToggleActive = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const user = Number.isInteger(id) ? await userService.getById(id) : null;
    if (!user) return next(createError(404, req.__('admin.users.notFound')));

    await userService.setActive(id, !user.active);
    res.setFlash(user.active ? req.__('admin.users.deactivated') : req.__('admin.users.activated'));
    res.redirect('/admin/users');
  } catch (err) {
    next(err);
  }
};

// ---------- F14: roles y permisos ----------

exports.rolesList = async (req, res, next) => {
  try {
    const roles = await roleService.listAll();
    res.render('admin/roles/list', {
      title: req.__('admin.roles.title'),
      activeNav: 'roles',
      roles: roles.map((r) => ({ id: r.id, name: r.name, description: r.description, permissionCount: r.permissions.length }))
    });
  } catch (err) {
    next(err);
  }
};

exports.rolesEdit = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const role = Number.isInteger(id) ? await roleService.getById(id) : null;
    if (!role) return next(createError(404, req.__('admin.roles.notFound')));

    const allPermissions = await roleService.listAllPermissions();
    const grantedIds = new Set(role.permissions.map((p) => p.id));
    const groups = {};
    allPermissions.forEach((p) => {
      const [resource] = p.key.split(':');
      if (!groups[resource]) groups[resource] = [];
      groups[resource].push({ id: p.id, key: p.key, checked: grantedIds.has(p.id) });
    });

    res.render('admin/roles/edit', {
      title: req.__('admin.roles.editTitle', role.name),
      activeNav: 'roles',
      role: { id: role.id, name: role.name, description: role.description },
      groups
    });
  } catch (err) {
    next(err);
  }
};

exports.rolesUpdate = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const role = Number.isInteger(id) ? await roleService.getById(id) : null;
    if (!role) return next(createError(404, req.__('admin.roles.notFound')));

    const raw = req.body.permission_ids;
    const ids = (Array.isArray(raw) ? raw : raw ? [raw] : []).map(Number).filter(Number.isInteger);

    await roleService.setPermissions(id, ids);
    res.setFlash(req.__('admin.roles.updated'));
    res.redirect('/admin/roles');
  } catch (err) {
    next(err);
  }
};
