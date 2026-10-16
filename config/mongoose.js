require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');

// Conexión a MongoDB. La URI sale del archivo .env (ver .env.example).
function connectMongo() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/stride_co';
  return mongoose.connect(uri);
}

module.exports = connectMongo;
