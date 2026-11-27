const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');

const i18n = require('./config/i18n');


const authenticate = require('./middlewares/authenticate');
const flash = require('./middlewares/flash');

const indexRouter = require('./routes/index');
const storeRouter = require('./routes/web/store');
const authRouter = require('./routes/api/auth');
const usersRouter = require('./routes/api/users');
const rolesRouter = require('./routes/api/roles');
const permissionsRouter = require('./routes/api/permissions');
const productsRouter = require('./routes/api/products');
const variantsRouter = require('./routes/api/variants');
const inventoryRouter = require('./routes/api/inventory');
const customersRouter = require('./routes/api/customers');
const ordersRouter = require('./routes/api/orders');

const app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(i18n.middleware);
app.use(flash);


// /health (en indexRouter), / y /products (tienda, públicas) y /api/auth/login son
// públicos; todo lo demás bajo /api exige un Bearer token antes de authorize().
app.use('/', indexRouter);
app.use((req, res, next) => { res.locals.currentPath = req.path; next(); });
app.use('/', storeRouter);
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
  next(createError(404, req.__('common.routeNotFound')));
});

app.use((err, req, res, next) => {
  if (req.originalUrl.startsWith('/api')) {
    const status = err.status || 500;
    // En un error 500 no se expone el detalle interno (consultas, rutas, librerías)
    if (status >= 500) console.error(err);
    // express-jwt reporta en inglés y sin distinguir el motivo (token ausente,
    // inválido o expirado); se traduce al mismo mensaje genérico de siempre.
    let message = err.message;
    if (status >= 500) message = req.__('common.serverError');
    // Solo los errores de express-jwt traen code (credentials_required, invalid_token…);
    // un 401 propio, como el del login, conserva su mensaje.
    else if (err.name === 'UnauthorizedError' && err.code) message = req.__('common.unauthenticated');
    // Mismo formato que las respuestas correctas: { message, data }
    return res.status(status).json({ message, data: null });
  }

  // Vistas web: 403/404 con su propia página; cualquier otro código (incluido 500)
  // usa errors/500.pug sin mostrar el stack en producción.
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  const template = [403, 404].includes(status) ? `errors/${status}` : 'errors/500';
  res.status(status);
  res.render(template);
});

module.exports = app;