// Mejora progresiva: el contenido con .scroll-reveal ya es visible por defecto
// (ver stride.css) para que la página funcione igual con JavaScript deshabilitado.
// Si este script arranca, agrega la clase que activa la animación y observa cada
// elemento para revelarlo suavemente al entrar en pantalla.
(function () {
  var items = document.querySelectorAll('.scroll-reveal');
  if (!items.length || !('IntersectionObserver' in window)) return;

  document.documentElement.classList.add('js-scroll-ready');

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('in-view');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.15 });

  items.forEach(function (el) { observer.observe(el); });
})();
