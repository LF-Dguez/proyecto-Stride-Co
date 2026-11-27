// Mejora progresiva: sin esto, la página ya muestra un producto completo y
// clicable (el primero de "featured"), solo que fijo. Con JavaScript, rota
// entre los destacados cada pocos segundos con un fundido y puntos para saltar
// directo a uno. Los datos ya vienen en el HTML (ver #heroData), no se piden
// por fetch.
(function () {
  var dataEl = document.getElementById('heroData');
  var heroEl = document.getElementById('heroProduct');
  if (!dataEl || !heroEl) return;

  var products;
  try {
    products = JSON.parse(dataEl.textContent);
  } catch {
    return;
  }
  if (!Array.isArray(products) || products.length < 2) return;

  var linkEl = document.getElementById('heroProductLink');
  var stageEl = document.getElementById('heroStage');
  var modelEl = document.getElementById('heroModel');
  var cardEl = heroEl.querySelector('.hero-product-card');
  var categoryEl = document.getElementById('heroCategory');
  var nameEl = document.getElementById('heroName');
  var priceEl = document.getElementById('heroPrice');
  var dotsEl = document.getElementById('heroDots');

  var index = 0;
  var timer = null;

  products.forEach(function (_, i) {
    var dot = document.createElement('button');
    dot.type = 'button';
    dot.setAttribute('aria-label', 'Producto ' + (i + 1));
    if (i === 0) dot.className = 'active';
    dot.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      goTo(i);
      restart();
    });
    dotsEl.appendChild(dot);
  });

  function paintDots() {
    Array.prototype.forEach.call(dotsEl.children, function (dot, i) {
      dot.classList.toggle('active', i === index);
    });
  }

  function apply(i) {
    var p = products[i];
    linkEl.setAttribute('href', '/products/' + p.id);
    stageEl.dataset.vtName = 'product-visual-' + p.id;
    modelEl.setAttribute('variant-name', p.variant);
    categoryEl.textContent = p.category;
    nameEl.textContent = p.name;
    priceEl.textContent = p.priceLabel;
    paintDots();
  }

  function goTo(i) {
    if (i === index) return;
    index = i;
    modelEl.style.opacity = 0;
    cardEl.style.opacity = 0;
    setTimeout(function () {
      apply(index);
      modelEl.style.opacity = 1;
      cardEl.style.opacity = 1;
    }, 320);
  }

  function restart() {
    clearInterval(timer);
    timer = setInterval(function () { goTo((index + 1) % products.length); }, 4800);
  }

  restart();
  heroEl.addEventListener('mouseenter', function () { clearInterval(timer); });
  heroEl.addEventListener('mouseleave', restart);
})();
