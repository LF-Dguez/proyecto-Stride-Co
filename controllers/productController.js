exports.getAll = (req, res) => {
  res.status(200).json({
    message: 'GET productos obtenido exitosamente',
    data: [
      { id: 1, category_id: 10, name: 'Tenis Runner Pro', brand: 'Stride', price: 1299.99, active: true },
      { id: 2, category_id: 10, name: 'Tenis Urban Casual', brand: 'Stride', price: 899.99, active: true }
    ]
  });
};

exports.getById = (req, res) => {
  const { id } = req.params;
  res.status(200).json({
    message: `GET producto con ID ${id}`,
    data: { id: Number(id), category_id: 10, name: 'Tenis Runner Pro', brand: 'Stride', price: 1299.99, active: true }
  });
};

exports.create = (req, res) => {
  res.status(201).json({
    message: 'Producto creado exitosamente',
    data: { id: 3, ...req.body, active: true }
  });
};

exports.update = (req, res) => {
  const { id } = req.params;
  res.status(200).json({
    message: `Producto con ID ${id} actualizado exitosamente`,
    data: { id: Number(id), ...req.body }
  });
};

exports.delete = (req, res) => {
  const { id } = req.params;
  res.status(200).json({
    message: `Producto con ID ${id} eliminado exitosamente`
  });
};