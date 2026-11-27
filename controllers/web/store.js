const productService = require('../../services/product.service');
const { formatPrice } = require('../../utils/format');

// Mismo fondo de "shoe-art" que el prototipo, elegido de forma estable por id
// para que un producto no cambie de color entre una visita y otra.
const SHOE_ART_COLORS = ['#e9f1fd', '#f3e9df', '#e6f0e9', '#eae8f6'];

function toCardData(product, locale) {
  return {
    id: product.id,
    name: product.name,
    brand: product.brand,
    category: productService.CATEGORY_LABELS[product.category_id] || '',
    priceLabel: formatPrice(product.price, locale),
    color: SHOE_ART_COLORS[product.id % SHOE_ART_COLORS.length],
    emoji: '👟'
  };
}

exports.home = async (req, res, next) => {
  try {
    const featured = await productService.listFeatured(4);
    res.render('store/home', {
      title: req.__('store.home.titleLine1') + ' ' + req.__('store.home.titleLine2'),
      description: req.__('store.meta.description'),
      featured: featured.map((p) => toCardData(p, req.getLocale()))
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
