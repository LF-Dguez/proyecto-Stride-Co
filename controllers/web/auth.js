const { User } = require('../../models/sql');
const { verifyPassword } = require('../../services/password');
const { signToken } = require('../../services/token');

// Solo se acepta una ruta interna como destino tras el login ("/algo"); nunca
// "//host" o una URL absoluta, que redirigiría fuera del sitio (open redirect).
function safeNext(value) {
  return typeof value === 'string' && /^\/(?!\/)/.test(value) ? value : '/';
}

function renderForm(req, res, status, { next, email, error }) {
  res.status(status).render('auth/login', {
    title: req.__('auth.login.title'),
    description: req.__('auth.login.title'),
    next,
    email,
    error
  });
}

exports.loginForm = (req, res) => {
  const next = safeNext(req.query.next);
  if (req.user) return res.redirect(next);
  renderForm(req, res, 200, { next, email: '', error: null });
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    const nextUrl = safeNext(req.body && req.body.next);

    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
      return renderForm(req, res, 400, { next: nextUrl, email: typeof email === 'string' ? email : '', error: req.__('auth.missingFields') });
    }

    const user = await User.findOne({ where: { email } });
    if (!user || !user.active || !(await verifyPassword(password, user.password_hash))) {
      return renderForm(req, res, 400, { next: nextUrl, email, error: req.__('auth.invalidCredentials') });
    }

    const token = signToken(user);
    res.cookie('access_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    });
    res.redirect(nextUrl);
  } catch (err) {
    next(err);
  }
};

exports.logout = (req, res) => {
  res.clearCookie('access_token');
  res.redirect('/');
};
