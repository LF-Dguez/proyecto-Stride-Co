exports.getAll = (req, res) => {
  res.status(200).json({
    message: 'GET permisos obtenido exitosamente',
    data: [
      { id: 1, key: 'USERS_READ', description: 'Permite consultar usuarios' },
      { id: 2, key: 'PRODUCTS_WRITE', description: 'Permite crear/editar productos' }
    ]
  });
};

exports.getById = (req, res) => {
  const { id } = req.params;
  res.status(200).json({
    message: `GET permiso con ID ${id}`,
    data: { id: Number(id), key: 'USERS_READ', description: 'Permite consultar usuarios' }
  });
};

exports.create = (req, res) => {
  res.status(201).json({
    message: 'Permiso creado exitosamente',
    data: { id: 3, ...req.body }
  });
};

exports.update = (req, res) => {
  const { id } = req.params;
  res.status(200).json({
    message: `Permiso con ID ${id} actualizado exitosamente`,
    data: { id: Number(id), ...req.body }
  });
};

exports.delete = (req, res) => {
  const { id } = req.params;
  res.status(200).json({
    message: `Permiso con ID ${id} eliminado exitosamente`
  });
};