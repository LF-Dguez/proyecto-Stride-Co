const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');


const authenticate = require('./middlewares/authenticate');

const indexRouter = require('./routes/index');
const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');
const rolesRouter = require('./routes/roles');
const permissionsRouter = require('./routes/permissions');
const productsRouter = require('./routes/products');
const variantsRouter = require('./routes/variants');
const inventoryRouter = require('./routes/inventory');
const customersRouter = require('./routes/customers');
const ordersRouter = require('./routes/orders');

const app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


// /health (en indexRouter) y /api/auth/login son públicos; todo lo demás bajo
// /api exige un Bearer token válido antes de pasar por authorize() en cada router.
app.use('/', indexRouter);
app.use('/api/auth', authRouter);
app.use('/api/users', authenticate, usersRouter);
app.use('/api/roles', authenticate, rolesRouter);
app.use('/api/permissions', authenticate, permissionsRouter);
app.use('/api/products', authenticate, productsRouter);
app.use('/api/variants', authenticate, variantsRouter);
app.use('/api/inventory', authenticate, inventoryRouter);
app.use('/api/customers', authenticate, customersRouter);
app.use('/api/orders', authenticate, ordersRouter);


app.use((req, res, next) => {
  next(createError(404, 'Ruta no encontrada'));
});

app.use((err, req, res, next) => {
  if (req.originalUrl.startsWith('/api')) {
    const status = err.status || 500;
    // En un error 500 no se expone el detalle interno (consultas, rutas, librerías)
    if (status >= 500) console.error(err);
    return res.status(status).json({
      error: {
        message: status >= 500 ? 'Error interno del servidor' : err.message,
        status
      }
    });
  }

  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;