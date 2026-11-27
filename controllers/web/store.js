const createError = require('http-errors');
const productService = require('../../services/product.service');
const { formatPrice } = require('../../utils/format');

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
