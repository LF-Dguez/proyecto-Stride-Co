
const SAMPLE_PRODUCTS = [
  {
    category_id: 10,
    name: 'Tenis Runner Pro',
    description: 'Tenis ligeros para correr en asfalto',
    brand: 'Stride',
    price: 1299.99,
    variants: [
      { sku: 'STR-RUN-BLK-27', color: 'Negro', size: '27', stock: 50, reserved: 2 },
      { sku: 'STR-RUN-BLK-28', color: 'Negro', size: '28', stock: 35, reserved: 0 }
    ]
  },
  {
    category_id: 10,
    name: 'Tenis Trail X',
    description: 'Tenis con suela de tracción para senderos',
    brand: 'Stride',
    price: 1599.99,
    variants: [
      { sku: 'STR-TRL-GRN-26', color: 'Verde', size: '26', stock: 20, reserved: 1 },
      { sku: 'STR-TRL-GRN-27', color: 'Verde', size: '27', stock: 25, reserved: 0 }
    ]
  },
  {
    category_id: 20,
    name: 'Sandalia Urban',
    description: 'Sandalia casual de uso diario',
    brand: 'Stride',
    price: 799.5,
    variants: [
      { sku: 'STR-URB-BRN-25', color: 'Café', size: '25', stock: 40, reserved: 0 },
      { sku: 'STR-URB-BRN-26', color: 'Café', size: '26', stock: 30, reserved: 3 }
    ]
  },
  {
    category_id: 30,
    name: 'Bota Hiker',
    description: 'Bota impermeable para caminata',
    brand: 'Stride',
    price: 2199,
    variants: [
      { sku: 'STR-HIK-GRY-27', color: 'Gris', size: '27', stock: 15, reserved: 0 },
      { sku: 'STR-HIK-GRY-28', color: 'Gris', size: '28', stock: 12, reserved: 1 }
    ]
  }
];


async function seedSampleSql({ Product, ProductVariant, Inventory }) {
  const created = { products: 0, variants: 0, inventory: 0 };

  for (const { variants, ...productData } of SAMPLE_PRODUCTS) {
    const [product, productCreated] = await Product.findOrCreate({
      where: { name: productData.name },
      defaults: productData
    });
    if (productCreated) created.products += 1;

    for (const { stock, reserved, ...variantData } of variants) {
      const [variant, variantCreated] = await ProductVariant.findOrCreate({
        where: { sku: variantData.sku },
        defaults: { ...variantData, product_id: product.id }
      });
      if (variantCreated) created.variants += 1;

      // Un registro de inventario por variante (relación 1:1)
      const [, inventoryCreated] = await Inventory.findOrCreate({
        where: { variant_id: variant.id },
        defaults: { stock, reserved }
      });
      if (inventoryCreated) created.inventory += 1;
    }
  }

  return created;
}

module.exports = { seedSampleSql, SAMPLE_PRODUCTS };