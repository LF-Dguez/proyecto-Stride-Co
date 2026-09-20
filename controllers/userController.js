let users = [
    { id: 1, first_name: "Ana", last_name: "López", email: "ana@stride.com", role_id: 1, active: true },
    { id: 2, first_name: "Luis", last_name: "Pérez", email: "luis@stride.com", role_id: 2, active: true },
    { id: 2, first_name: "Karen", last_name: "Gonzalez", email: "karen@stride.com", role_id: 3, active: true }
];
let nextId = 2;

function list(req, res) {
  res.json({ message: "GET users", data: users });
}

function userByID(id){
    return users.find(u => u.id == id);
}

function get(req, res) {
  const id = req.params.id;
  const user = userByID(id);
  if (!user) {
    return res.status(404).json({
        message: "User not found",
        data: {}
    });
  }
  res.json({
        message: "User found",
        data: user
    });
}

function create(req, res) {
  const newUser = {
    id: nextId++,
    first_name: req.body.first_name,
    last_name: req.body.last_name,
    email: req.body.email,
    role_id: req.body.role_id,
    active: true
  };
  users.push(newUser);

  res.status(201).json({
    message: "User created",
    data: newUser
  });
}  


function update(req, res) {
  const id = req.params.id;
  const user = userByID(id);

  if (!user) {
    return res.status(404).json({
      message: "User not found",
      data: {}
    });
  }

    user.first_name = req.body.first_name;
    user.last_name= req.body.last_name;
    user.email= req.body.email;
    user.role_id= req.body.role_id;

  res.status(200).json({
    message: "User updated",
    data: user
  });
}

function remove(req, res) {
  const id = req.params.id;
  const user = userByID(id);

  if (!user) {
    return res.status(404).json({
      message: "User not found",
      data: {}
    });
  }

  users.splice(users.indexOf(user), 1);
  res.status(200).json({
    message: "User deleted",
    data: user
  });
}

module.exports = {list, get, create, update, remove}
