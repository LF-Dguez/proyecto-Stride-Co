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
  window.addEventListener('pageshow', function (event) {
    document.querySelectorAll('[data-vt-name]').forEach(function (el) {
      el.style.viewTransitionName = '';
    });
    if (event.persisted) restoreCameras();
  });

  // El modelo con camera-controls (el destacado del inicio) se puede arrastrar
  // para girarlo; si el clic para navegar tembló un poco, puede quedar un poco
  // girado. Si la página vuelve desde la caché del navegador (atrás/adelante) con
  // ese ángulo movido, aquí se regresa al ángulo con el que cargó la primera vez.
  var defaultOrbits = new WeakMap();
  document.querySelectorAll('model-viewer[camera-controls]').forEach(function (mv) {
    mv.addEventListener('load', function () {
      if (!defaultOrbits.has(mv)) defaultOrbits.set(mv, mv.getCameraOrbit().toString());
    });
  });

  function restoreCameras() {
    document.querySelectorAll('model-viewer[camera-controls]').forEach(function (mv) {
      var orbit = defaultOrbits.get(mv);
      if (!orbit) return;
      mv.cameraOrbit = orbit;
      mv.jumpCameraToGoal();
    });
  }
})();
