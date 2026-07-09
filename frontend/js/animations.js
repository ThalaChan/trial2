/* ─────────────────────────────────────────────────────────────────
   animations.js — Background canvas animations.

   What it does:
     Draws animated drone flight paths across the full-screen canvas
     on the hero/landing page. Each drone is a glowing dot with a
     fading trail that flies across the screen on a random trajectory.

   How it works:
     - Runs inside an IIFE so it doesn't pollute global scope
     - Uses requestAnimationFrame for smooth animation
     - Canvas resizes automatically on window resize
     - DronePath class: one animated drone per instance
       reset() sends it back in from a random edge when it exits
     - Completely independent — no dependency on api.js, app.js, charts.js
───────────────────────────────────────────────────────────────────── */


// ── Drone particle system ─────────────────────────────────────────────────────
(function() {
  const canvas = document.getElementById('particle-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  // Drone flight paths — animated lines crossing the screen
  class DronePath {
    constructor() { this.reset(); }
    reset() {
      // Start from random edge
      const edge = Math.floor(Math.random() * 4);
      if (edge === 0) { this.x = Math.random()*canvas.width; this.y = -10; }
      else if (edge === 1) { this.x = canvas.width+10; this.y = Math.random()*canvas.height; }
      else if (edge === 2) { this.x = Math.random()*canvas.width; this.y = canvas.height+10; }
      else { this.x = -10; this.y = Math.random()*canvas.height; }

      // Fly toward opposite area
      const tx = canvas.width  * (0.2 + Math.random()*0.6);
      const ty = canvas.height * (0.2 + Math.random()*0.6);
      const dist = Math.sqrt((tx-this.x)**2 + (ty-this.y)**2);
      const speed = 0.4 + Math.random()*0.6;
      this.vx = (tx-this.x)/dist * speed;
      this.vy = (ty-this.y)/dist * speed;

      this.trail = [];
      this.trailLen = 18 + Math.floor(Math.random()*20);
      this.size  = 1.5 + Math.random()*1.5;
      this.alpha = 0.3 + Math.random()*0.4;
      this.type  = Math.random() > 0.15 ? 'safe' : 'threat';
      this.color = this.type === 'safe'
        ? `rgba(0,180,220,${this.alpha})`
        : `rgba(255,68,0,${this.alpha})`;
      this.alive = true;
    }
    update() {
      this.trail.push({x:this.x, y:this.y});
      if (this.trail.length > this.trailLen) this.trail.shift();
      this.x += this.vx;
      this.y += this.vy;
      if (this.x < -50 || this.x > canvas.width+50 ||
          this.y < -50 || this.y > canvas.height+50) this.reset();
    }
    draw() {
      if (this.trail.length < 2) return;
      // Draw trail
      for (let i = 1; i < this.trail.length; i++) {
        const t = i / this.trail.length;
        ctx.beginPath();
        ctx.moveTo(this.trail[i-1].x, this.trail[i-1].y);
        ctx.lineTo(this.trail[i].x, this.trail[i].y);
        ctx.strokeStyle = this.type === 'safe'
          ? `rgba(0,180,220,${t * this.alpha * 0.6})`
          : `rgba(255,68,0,${t * this.alpha * 0.6})`;
        ctx.lineWidth = t * this.size * 0.8;
        ctx.stroke();
      }
      // Draw drone dot
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI*2);
      ctx.fillStyle = this.color;
      ctx.fill();
      // Glow
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * 3, 0, Math.PI*2);
      ctx.fillStyle = this.type === 'safe'
        ? `rgba(0,180,220,0.04)` : `rgba(255,68,0,0.05)`;
      ctx.fill();
    }
  }

  // Static grid nodes (airspace waypoints)
  const nodes = [];
  for (let i = 0; i < 12; i++) {
    nodes.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      pulse: Math.random() * Math.PI * 2,
    });
  }

  const drones = Array.from({length: 20}, () => new DronePath());

  function drawNodes() {
    nodes.forEach(n => {
      n.pulse += 0.02;
      const a = 0.08 + Math.sin(n.pulse) * 0.06;
      // Crosshair
      ctx.strokeStyle = `rgba(0,180,220,${a})`;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(n.x-8, n.y); ctx.lineTo(n.x+8, n.y); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(n.x, n.y-8); ctx.lineTo(n.x, n.y+8); ctx.stroke();
      // Corner brackets
      const s = 5;
      ctx.strokeStyle = `rgba(0,180,220,${a*1.5})`;
      [[n.x-s,n.y-s,1,1],[n.x+s,n.y-s,-1,1],
       [n.x-s,n.y+s,1,-1],[n.x+s,n.y+s,-1,-1]].forEach(([x,y,dx,dy]) => {
        ctx.beginPath();
        ctx.moveTo(x+dx*3, y); ctx.lineTo(x, y); ctx.lineTo(x, y+dy*3);
        ctx.stroke();
      });
    });
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawNodes();
    drones.forEach(d => { d.update(); d.draw(); });
    requestAnimationFrame(animate);
  }
  animate();
})();

// ── Reveal on scroll ──────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {

  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });

  function observe() {
    document.querySelectorAll('.reveal:not(.visible)').forEach(el => obs.observe(el));
  }
  observe();
  new MutationObserver(observe).observe(document.body, {childList:true,subtree:true});
});

// ── Blip stagger animation ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.blip').forEach((b, i) => {
    b.style.animationDelay = `${i * 0.4}s`;
  });
});

// ── Utility functions ─────────────────────────────────────────────────────────
window.showLoading = function(msg) {
  const el  = document.getElementById('loading-overlay');
  const txt = document.getElementById('loading-text');
  if (el)  el.classList.remove('hidden');
  if (txt) txt.textContent = msg || 'LOADING…';
};

window.hideLoading = function() {
  const el = document.getElementById('loading-overlay');
  if (el) el.classList.add('hidden');
};

window.showModalStatus = function(msg, type) {
  const el = document.getElementById('modal-status');
  if (!el) return;
  el.textContent = msg;
  el.className   = 'modal-status ' + (type || '');
  el.classList.remove('hidden');
};

window.triggerReveal = function() {
  document.querySelectorAll('.reveal:not(.visible)').forEach(el => {
    el.classList.add('visible');
  });
};

window.animatePageIn = function(el) {
  const target = el || document.getElementById('pages');
  if (!target) return;
  // Don't hide then show — just trigger reveal immediately
  // The blink was caused by setting opacity:0 first
  window.triggerReveal();
};

window.transitionToDashboard = function() {
  const hero      = document.getElementById('hero');
  const dashboard = document.getElementById('dashboard');
  if (!hero || !dashboard) return;
  hero.style.display = 'none';
  hero.classList.add('hidden');
  dashboard.classList.remove('hidden');
  // Clear any lingering inline styles after transition so they
  // don't interfere with page navigation later
  setTimeout(function() {
    dashboard.style.opacity   = '';
    dashboard.style.transform = '';
    dashboard.style.transition = '';
  }, 400);
};

window.animateKPICount = function(el, target, suffix='', duration=900) {
  const isFloat = String(target).includes('.');
  const startTime = performance.now();
  function step(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased    = 1 - Math.pow(1 - progress, 4);
    const val      = isFloat
      ? (target * eased).toFixed(1)
      : Math.round(target * eased);
    el.textContent = val + suffix;
    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = target + suffix;
  }
  requestAnimationFrame(step);
};

// ── Typed text effect for system ID ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  const el = document.querySelector('.hero-system-id');
  if (!el) return;
  const text = el.textContent;
  el.textContent = '';
  let i = 0;
  function type() {
    if (i < text.length) {
      el.textContent += text[i++];
      setTimeout(type, 35 + Math.random() * 25);
    }
  }
  setTimeout(type, 600);
});
