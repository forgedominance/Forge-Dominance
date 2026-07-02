(function () {
  var canvas = document.getElementById('hcv');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  var particles = [];
  var maxParticles = 60;
  var raf;

  function resize() {
    canvas.width = canvas.parentElement.offsetWidth;
    canvas.height = canvas.parentElement.offsetHeight;
  }

  function createParticle() {
    var w = canvas.width;
    var h = canvas.height;
    return {
      x: Math.random() * w,
      y: h * 0.6 + Math.random() * h * 0.4,
      vx: (Math.random() - 0.5) * 0.3,
      vy: -(0.3 + Math.random() * 0.8),
      r: 1 + Math.random() * 2,
      life: 1,
      decay: 0.003 + Math.random() * 0.005,
      color: Math.random() > 0.5 ? '212,80,10' : '200,140,60'
    };
  }

  function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    while (particles.length < maxParticles) {
      particles.push(createParticle());
    }

    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;

      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(' + p.color + ',' + (p.life * 0.6) + ')';
      ctx.fill();

      if (p.r > 1.5) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * p.life * 2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(' + p.color + ',' + (p.life * 0.1) + ')';
        ctx.fill();
      }
    }

    raf = requestAnimationFrame(tick);
  }

  function init() {
    resize();
    tick();
    // Trigger fade-in after first frame is drawn
    requestAnimationFrame(function() {
      canvas.classList.add('loaded');
    });
  }

  window.addEventListener('resize', resize);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();


