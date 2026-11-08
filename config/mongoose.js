const mongoose = require('mongoose');
const config = require('config');

// Conexión a MongoDB. La URI (con usuario y contraseña en Atlas) es un secreto: sale de
// config/local-<entorno>.json, que no está en git.
function connectMongo() {
  return mongoose.connect(config.get('mongo.uri'));
}

module.exports = connectMongo;
