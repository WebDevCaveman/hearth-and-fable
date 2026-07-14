/* Hearth & Fable — shared motion driver.
   Replaces the per-page DCLogic scripts from the prototypes. Every effect is
   guarded by element presence, so one file serves all six pages: an effect
   whose elements aren't on the page simply no-ops. */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {
    // --- style-hover: swap inline styles on hover (the design attribute the
    // prototypes carried but never wired). Exact values kept verbatim. ---
    document.querySelectorAll('[style-hover]').forEach(function (el) {
      var base = el.getAttribute('style') || '';
      var hover = el.getAttribute('style-hover') || '';
      el.addEventListener('mouseenter', function () { el.setAttribute('style', base + ';' + hover); });
      el.addEventListener('mouseleave', function () { el.setAttribute('style', base); });
      el.addEventListener('focus', function () { el.setAttribute('style', base + ';' + hover); });
      el.addEventListener('blur', function () { el.setAttribute('style', base); });
    });

    // --- reduced motion: kill loops, reveal everything, draw paths statically ---
    if (reduced) {
      document.querySelectorAll('[data-loop]').forEach(function (el) {
        el.style.animation = 'none';
        el.querySelectorAll('*').forEach(function (c) { c.style.animation = 'none'; });
      });
      document.querySelectorAll('[data-reveal],[data-lantern]').forEach(function (el) {
        el.style.opacity = '1'; el.style.translate = '0 0';
      });
      var rib = document.querySelector('[data-ribbon]'); if (rib) rib.style.opacity = '0.35';
      var rp = document.querySelector('[data-ribbon-path]'); if (rp) rp.style.strokeDashoffset = '0';
      var halo = document.querySelector('[data-halo]'); if (halo) halo.style.opacity = '0.5';
      var sweep = document.querySelector('[data-sweep]'); if (sweep) sweep.style.display = 'none';
      var warm = document.querySelector('[data-warm-glow]'); if (warm) warm.style.opacity = '0.5';
      var mp = document.querySelector('[data-map-path]');
      if (mp) { mp.style.strokeDasharray = String(mp.getTotalLength()); mp.style.strokeDashoffset = '0'; }
      return;
    }

    // --- scroll reveals (fade + rise / slide) ---
    var revealEls = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));
    revealEls.forEach(function (el, i) {
      var dir = el.getAttribute('data-reveal');
      el.style.opacity = '0';
      el.style.transition = 'opacity 0.9s ease, translate 0.9s cubic-bezier(0.22, 1, 0.36, 1)';
      el.style.transitionDelay = (i % 3) * 0.12 + 's';
      el.style.translate = dir === 'left' ? '-36px 0' : dir === 'right' ? '36px 0' : '0 36px';
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.translate = '0 0';
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.18, rootMargin: '0px 0px -8% 0px' });
    revealEls.forEach(function (el) { io.observe(el); });

    // --- lanterns: light up in sequence (Visit hours) ---
    var lanterns = Array.prototype.slice.call(document.querySelectorAll('[data-lantern]'));
    if (lanterns.length) {
      lanterns.forEach(function (el) {
        el.style.opacity = '0';
        el.style.transition = 'opacity 1.1s ease, translate 1.1s cubic-bezier(0.22, 1, 0.36, 1)';
        el.style.transitionDelay = (parseInt(el.getAttribute('data-lantern'), 10) - 1) * 0.55 + 's';
        el.style.translate = '0 14px';
      });
      var lio = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            lanterns.forEach(function (el) { el.style.opacity = '1'; el.style.translate = '0 0'; });
            lio.disconnect();
          }
        });
      }, { threshold: 0.4 });
      lio.observe(lanterns[0].parentElement);
    }

    // --- one-time moments (fire once at ~50% visibility) ---
    function once(sel, cb) {
      var el = document.querySelector(sel);
      if (!el) return;
      var o = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) { cb(el); o.disconnect(); }
        });
      }, { threshold: 0.5 });
      o.observe(el.parentElement);
    }
    once('[data-halo]', function (el) { el.style.opacity = '0.55'; });
    once('[data-sweep]', function (el) { setTimeout(function () { el.style.transform = 'translateX(320%) skewX(-8deg)'; }, 350); });
    once('[data-warm-glow]', function (el) { el.style.opacity = '0.55'; });

    // --- scroll-bound effects: parallax + ribbon / rush-dissolve / map draw ---
    var bg = document.querySelector('[data-parallax-bg]');
    var fg = document.querySelector('[data-parallax-fg]');
    var bgF = bg ? parseFloat(bg.getAttribute('data-parallax-bg')) : 0;
    var fgF = fg ? parseFloat(fg.getAttribute('data-parallax-fg')) : 0;

    var ribbonPath = document.querySelector('[data-ribbon-path]');
    var ribbonSection = ribbonPath ? ribbonPath.closest('section') : null;
    if (ribbonPath) {
      var rlen = ribbonPath.getTotalLength();
      ribbonPath.style.strokeDasharray = String(rlen);
      ribbonPath.style.strokeDashoffset = String(rlen);
    }
    var mapPath = document.querySelector('[data-map-path]');
    var mapFig = mapPath ? mapPath.closest('figure') : null;
    if (mapPath) { mapPath.style.strokeDasharray = String(mapPath.getTotalLength()); }

    var rush = document.querySelector('[data-rush]');
    var doorway = document.querySelector('[data-doorway-warm]');
    var rushSection = rush ? rush.closest('section') : null;

    var needScroll = bg || fg || ribbonPath || mapPath || rush;
    if (needScroll) {
      var ticking = false;
      var onScroll = function () {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(function () {
          var y = window.scrollY, vh = window.innerHeight;
          if (bg) bg.style.transform = 'translateY(' + Math.min(y * bgF, vh * 0.14) + 'px)';
          if (fg) {
            fg.style.transform = 'translateY(' + y * fgF + 'px)';
            fg.style.opacity = String(Math.max(0, 1 - y / (vh * 0.85)));
          }
          if (ribbonPath && ribbonSection) {
            var r = ribbonSection.getBoundingClientRect();
            var p = Math.max(0, Math.min(1, (vh - r.top) / (vh + r.height * 0.6)));
            ribbonPath.style.strokeDashoffset = String(rlen * (1 - p));
          }
          if (rush && rushSection) {
            var rr = rushSection.getBoundingClientRect();
            var rp2 = Math.max(0, Math.min(1, (vh - rr.top) / (vh + rr.height * 0.6)));
            rush.style.filter = 'grayscale(' + (rp2 * 0.55) + ') brightness(' + (1 - rp2 * 0.12) + ')';
            if (doorway) doorway.style.opacity = String(rp2 * 0.9);
          }
          if (mapPath && mapFig) {
            var mr = mapFig.getBoundingClientRect();
            var mp2 = Math.max(0, Math.min(1, (vh * 0.9 - mr.top) / (mr.height + vh * 0.3)));
            mapPath.style.strokeDashoffset = String(mapPath.getTotalLength() * (1 - mp2));
          }
          ticking = false;
        });
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }
  });
})();
