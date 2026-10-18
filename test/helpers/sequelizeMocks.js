// Simulaciones de Sequelize para probar controllers sin MySQL.
// Este archivo no termina en .test.js, así que Jest no lo ejecuta como prueba.

// Modelo con los métodos estáticos que usan los controllers
function mockModel() {
  return { findAll: jest.fn(), findByPk: jest.fn(), create: jest.fn() };
}

// Registro: update() aplica los cambios sobre el mismo objeto, como Sequelize
function mockInstance(data) {
  const instance = {
    ...data,
    update: jest.fn(async (changes) => {
      Object.assign(instance, changes);
      return instance;
    }),
    destroy: jest.fn(async () => {})
  };
  return instance;
}

// Error con la misma forma que lanza Sequelize
function sequelizeError(name, extra = {}) {
  const err = new Error(name);
  err.name = name;
  return Object.assign(err, extra);
}

module.exports = { mockModel, mockInstance, sequelizeError };
