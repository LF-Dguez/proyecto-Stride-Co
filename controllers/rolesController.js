let roles = [
    {id : 1, name : "admin", description : "Acceso total al sistema"},
    {id : 2, name : "vendedor", description: "Gestion de ventas y clientes"},
    {id : 3, name: "cliente", description: "Usuario de la tienda"}
];
let nextId = 4

function roleByID(id){
    return roles.find(u => u.id == id);
}

function list(req, res) {
  res.json({ message: "GET roles", data: roles });
}

function getRole(req, res) {
  const id = req.params.id;
  const role = roleByID(id);
  if (!role) {
    return res.status(404).json({
        message: "Role not found",
        data: {}
    });
  }
  res.json({
        message: "Role found",
        data: role
    });
}

function createRole(req, res) {
  const newRole = {
    id: nextId++,
    name: req.body.name,
    description: req.body.description
  };
  roles.push(newRole);

  res.status(201).json({
    message: "New role created",
    data: newRole
  });
}  


function updateRole(req, res) {
  const id = req.params.id;
  const role = roleByID(id);

  if (!role) {
    return res.status(404).json({
      message: "Role not found",
      data: {}
    });
  }

    role.name= req.body.name;
    role.description = req.body.description;

  res.status(200).json({
    message: "Role updated",
    data: role
  });
}

function removeRole(req, res) {
  const id = req.params.id;
  const role = roleByID(id);

  if (!role) {
    return res.status(404).json({
      message: "Role not found",
      data: {}
    });
  }

  roles.splice(roles.indexOf(role), 1);
  res.status(200).json({
    message: "role deleted",
    data: role
  });
}

module.exports = {list, getRole, createRole, updateRole, removeRole}
