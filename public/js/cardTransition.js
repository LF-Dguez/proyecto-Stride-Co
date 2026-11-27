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

  // Al volver con el botón atrás/adelante, Chrome restaura la página desde su
  // caché e igual intenta la transición nativa sobre ella; en esta combinación
  // a veces deja el repintado a medias (contenido entero que existe en el HTML
  // pero no se ve hasta la siguiente interacción) y el modelo 3D del hero puede
  // quedar con el ángulo que tenía justo antes de salir. En vez de perseguir
  // cada síntoma, se recarga la página desde el servidor en ese caso puntual:
  // se pierde el instante de "caché" de esa navegación de regreso, pero siempre
  // se ve completa y correcta.
  window.addEventListener('pageshow', function (event) {
    if (event.persisted) location.reload();
  });
})();
