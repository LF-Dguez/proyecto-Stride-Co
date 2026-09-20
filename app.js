const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');

// 1. Importación de rutas
const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
const rolesRouter = require('./routes/roles');
const permissionsRouter = require('./routes/permissions');
const productsRouter = require('./routes/products');
const variantsRouter = require('./routes/variants');
const inventoryRouter = require('./routes/inventory');
const customersRouter = require('./routes/customers');
const ordersRouter = require('./routes/orders');

const app = express();

// 2. Configuración del motor de vistas
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// 3. Middlewares generales y logging de solicitudes HTTP
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// 4. Montaje de rutas
app.use('/', indexRouter);
app.use('/api/users', usersRouter);
app.use('/api/roles', rolesRouter);
app.use('/api/permissions', permissionsRouter);
app.use('/api/products', productsRouter);
app.use('/api/variants', variantsRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/customers', customersRouter);
app.use('/api/orders', ordersRouter);

// 5. Captura de rutas inexistentes (404)
app.use((req, res, next) => {
  next(createError(404, 'Ruta no encontrada'));
});

// 6. Manejador global de errores
app.use((err, req, res, next) => {
  // Si la petición es hacia la API, responder con formato JSON
  if (req.originalUrl.startsWith('/api')) {
    return res.status(err.status || 500).json({
      error: {
        message: err.message,
        status: err.status || 500
      }
    });
  }

  // Para otras rutas, renderizar la página de error por defecto
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;