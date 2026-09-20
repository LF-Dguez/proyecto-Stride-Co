exports.getAll = (req, res) => {
  res.status(200).json({
    message: 'GET usuarios obtenido exitosamente',
    data: [
      { id: 1, first_name: 'Juan', last_name: 'Pérez', email: 'juan@stride.com', role_id: 1, active: true },
      { id: 2, first_name: 'María', last_name: 'Gómez', email: 'maria@stride.com', role_id: 2, active: true }
    ]
  });
};

exports.getById = (req, res) => {
  const { id } = req.params;
  res.status(200).json({
    message: `GET usuario con ID ${id}`,
    data: { id: Number(id), first_name: 'Juan', last_name: 'Pérez', email: 'juan@stride.com', role_id: 1, active: true }
  });
};

exports.create = (req, res) => {
  res.status(201).json({
    message: 'Usuario creado exitosamente',
    data: { id: 3, ...req.body, active: true }
  });
};

exports.update = (req, res) => {
  const { id } = req.params;
  res.status(200).json({
    message: `Usuario con ID ${id} actualizado exitosamente`,
    data: { id: Number(id), ...req.body }
  });
};

exports.delete = (req, res) => {
  const { id } = req.params;
  res.status(200).json({
    message: `Usuario con ID ${id} eliminado exitosamente`
  });
};