// Mejora progresiva: sin este script, el enlace navega igual (ver @view-transition
// en stride.css), solo sin el "zoom" hacia el detalle. El mismo producto puede
// aparecer más de una vez en una página (destacado del inicio + grilla de
// "Destacados"), y view-transition-name debe ser único por página, así que no se
// asigna en el HTML. Aquí se activa solo en el escenario que el usuario realmente
// toca, justo antes de que el navegador capture la página para la transición, para
// que el zoom salga de ahí y no de otra copia del mismo producto.
(function () {
  document.addEventListener('click', function (event) {
    var link = event.target.closest('a[href^="/products/"]');
    if (!link) return;
    var stage = link.querySelector('[data-vt-name]');
    if (stage) stage.style.viewTransitionName = stage.dataset.vtName;
  }, true);

  // Si el navegador vuelve a esta página desde su caché (botón atrás/adelante),
  // el nombre que se dejó puesto en el clic anterior sigue ahí: dos elementos con
  // view-transition-name en la misma página cancelan la transición por completo,
  // no solo la de ese elemento. pageshow se dispara tanto en la carga normal (no
  // hace nada, no hay nombres puestos) como al restaurar desde caché (limpia lo
  // que haya quedado).
  window.addEventListener('pageshow', function () {
    document.querySelectorAll('[data-vt-name]').forEach(function (el) {
      el.style.viewTransitionName = '';
    });
  });
})();
