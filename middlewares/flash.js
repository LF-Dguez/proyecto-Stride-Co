// Mensaje de confirmación de un solo uso tras el patrón PRG (POST -> redirect -> GET).
// Se guarda en una cookie de corta duración porque el servidor no conserva estado
// entre peticiones; la cookie se borra en cuanto se lee una vez.
function flash(req, res, next) {
  const raw = req.cookies.flash;
  if (raw) {
    res.clearCookie('flash');
    try {
      res.locals.flash = JSON.parse(raw);
    } catch {
      // cookie corrupta o manipulada: se ignora, no se muestra nada
    }
  }

  res.setFlash = (message, type = 'success') => {
    res.cookie('flash', JSON.stringify({ message, type }), { maxAge: 5000, httpOnly: true });
  };

  next();
}

module.exports = flash;
