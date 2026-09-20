exports.getAll = (req, res) => {
  res.status(200).json({
    message: 'GET variantes obtenido exitosamente',
    data: [
      { id: 1, product_id: 1, sku: 'STR-RUN-BLK-27', color: 'Negro', size: '27', active: true },
      { id: 2, product_id: 1, sku: 'STR-RUN-WHT-27', color: 'Blanco', size: '27', active: true }
    ]
  });
};

exports.getById = (req, res) => {
  const { id } = req.params;
  res.status(200).json({
    message: `GET variante con ID ${id}`,
    data: { id: Number(id), product_id: 1, sku: 'STR-RUN-BLK-27', color: 'Negro', size: '27', active: true }
  });
};

exports.create = (req, res) => {
  res.status(201).json({
    message: 'Variante creada exitosamente',
    data: { id: 3, ...req.body, active: true }
  });
};

exports.update = (req, res) => {
  const { id } = req.params;
  res.status(200).json({
    message: `Variante con ID ${id} actualizada exitosamente`,
    data: { id: Number(id), ...req.body }
  });
};

exports.delete = (req, res) => {
  const { id } = req.params;
  res.status(200).json({
    message: `Variante con ID ${id} eliminada exitosamente`
  });
};