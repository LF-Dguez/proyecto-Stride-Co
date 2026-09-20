exports.getAll = (req, res) => {
  res.status(200).json({
    message: 'GET clientes obtenido exitosamente (Modelo Documental MongoDB)',
    data: [
      {
        _id: '65f1a2b3c4d5e6f7a8b9c0d1',
        userId: 1,
        phone: '6141234567',
        email: 'cliente1@gmail.com',
        addresses: [{ type: 'shipping', street: 'Av. Universidad', number: '100', city: 'Chihuahua', state: 'Chihuahua', postalCode: '31000', country: 'México' }]
      }
    ]
  });
};

exports.getById = (req, res) => {
  const { id } = req.params;
  res.status(200).json({
    message: `GET cliente con ID ${id}`,
    data: {
      _id: id,
      userId: 1,
      phone: '6141234567',
      email: 'cliente1@gmail.com',
      addresses: [{ type: 'shipping', street: 'Av. Universidad', number: '100', city: 'Chihuahua', state: 'Chihuahua', postalCode: '31000', country: 'México' }]
    }
  });
};

exports.create = (req, res) => {
  res.status(201).json({
    message: 'Cliente creado exitosamente',
    data: { _id: '65f1a2b3c4d5e6f7a8b9c0d2', ...req.body }
  });
};

exports.update = (req, res) => {
  const { id } = req.params;
  res.status(200).json({
    message: `Cliente con ID ${id} actualizado exitosamente`,
    data: { _id: id, ...req.body }
  });
};

exports.delete = (req, res) => {
  const { id } = req.params;
  res.status(200).json({
    message: `Cliente con ID ${id} eliminado exitosamente`
  });
};