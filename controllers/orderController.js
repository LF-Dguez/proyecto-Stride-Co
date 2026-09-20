exports.getAll = (req, res) => {
  res.status(200).json({
    message: 'GET órdenes obtenido exitosamente (Modelo Documental MongoDB)',
    data: [
      {
        _id: '65f1a2b3c4d5e6f7a8b9c0e1',
        customerId: '65f1a2b3c4d5e6f7a8b9c0d1',
        salesPersonId: 2,
        paymentMethod: 'CARD',
        totals: { subtotal: 1299.99, shipping: 100.0, discount: 0.0, total: 1399.99 },
        items: [{ productId: 1, quantity: 1, unitPrice: 1299.99 }]
      }
    ]
  });
};

exports.getById = (req, res) => {
  const { id } = req.params;
  res.status(200).json({
    message: `GET orden con ID ${id}`,
    data: {
      _id: id,
      customerId: '65f1a2b3c4d5e6f7a8b9c0d1',
      salesPersonId: 2,
      paymentMethod: 'CARD',
      totals: { subtotal: 1299.99, shipping: 100.0, discount: 0.0, total: 1399.99 },
      items: [{ productId: 1, quantity: 1, unitPrice: 1299.99 }]
    }
  });
};

exports.create = (req, res) => {
  res.status(201).json({
    message: 'Orden creada exitosamente',
    data: { _id: '65f1a2b3c4d5e6f7a8b9c0e2', ...req.body }
  });
};

exports.update = (req, res) => {
  const { id } = req.params;
  res.status(200).json({
    message: `Orden con ID ${id} actualizada exitosamente`,
    data: { _id: id, ...req.body }
  });
};

exports.delete = (req, res) => {
  const { id } = req.params;
  res.status(200).json({
    message: `Orden con ID ${id} eliminada exitosamente`
  });
};