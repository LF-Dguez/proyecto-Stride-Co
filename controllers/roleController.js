exports.getAll = (req, res) => {
  res.status(200).json({
    message: 'GET roles obtenido exitosamente',
    data: [
      { id: 1, name: 'ADMIN', description: 'Administrador del sistema' },
      { id: 2, name: 'SALES', description: 'Vendedor' }
    ]
  });
};

exports.getById = (req, res) => {
  const { id } = req.params;
  res.status(200).json({
    message: `GET rol con ID ${id}`,
    data: { id: Number(id), name: 'ADMIN', description: 'Administrador del sistema' }
  });
};

exports.create = (req, res) => {
  res.status(201).json({
    message: 'Rol creado exitosamente',
    data: { id: 3, ...req.body }
  });
};

exports.update = (req, res) => {
  const { id } = req.params;
  res.status(200).json({
    message: `Rol con ID ${id} actualizado exitosamente`,
    data: { id: Number(id), ...req.body }
  });
};

exports.delete = (req, res) => {
  const { id } = req.params;
  res.status(200).json({
    message: `Rol con ID ${id} eliminado exitosamente`
  });
};