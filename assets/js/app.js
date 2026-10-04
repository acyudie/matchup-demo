/* 매치업 대전 — 공통 스크립트 */
(function () {
  var MU = (window.MU = window.MU || {});

  MU.icon = function (name, cls) {
    return '<svg class="ico' + (cls ? ' ' + cls : '') + '" aria-hidden="true"><use href="#i-' + name + '"></use></svg>';
  };
  MU.star = function (cls) { return MU.icon('star', 'ico-star' + (cls ? ' ' + cls : '')); };
  MU.won = function (n) { return Math.round(n).toLocaleString('ko-KR') + '원'; };
  MU.esc = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  MU.qs = function (sel, root) { return (root || document).querySelector(sel); };
  MU.qsa = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  MU.param = function (k) {
    try { return new URLSearchParams(location.search).get(k); } catch (e) { return null; }
  };

  /* localStorage (실패해도 동작) */
  var mem = {};
  MU.store = {
    get: function (k, d) {
      try { var v = localStorage.getItem('matchup.' + k); return v ? JSON.parse(v) : (mem[k] !== undefined ? mem[k] : d); }
      catch (e) { return mem[k] !== undefined ? mem[k] : d; }
    },
    set: function (k, v) {
      mem[k] = v;
      try { localStorage.setItem('matchup.' + k, JSON.stringify(v)); } catch (e) { /* noop */ }
    }
  };

  /* 날짜 */
  var WD = ['일', '월', '화', '수', '목', '금', '토'];
  MU.isoDate = function (d) {
    var m = d.getMonth() + 1, day = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
  };
  MU.addDays = function (n) { var d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + n); return d; };
  MU.fmtDate = function (iso) {
    if (!iso) return '';
    var p = iso.split('-');
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    return (d.getMonth() + 1) + '월 ' + d.getDate() + '일 (' + WD[d.getDay()] + ')';
  };
  MU.nowTime = function () {
    var d = new Date(), h = d.getHours(), m = d.getMinutes();
    return (h < 12 ? '오전 ' : '오후 ') + ((h % 12) || 12) + ':' + (m < 10 ? '0' : '') + m;
  };

  /* 토스트 */
  MU.toast = function (msg, icon) {
    var wrap = MU.qs('.toast-wrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'toast-wrap';
      wrap.setAttribute('role', 'status');
      wrap.setAttribute('aria-live', 'polite');
      document.body.appendChild(wrap);
    }
    var t = document.createElement('div');
    t.className = 'toast' + (icon === 'circle-alert' ? ' is-warn' : icon === 'info' ? ' is-info' : '');
    t.innerHTML = MU.icon(icon || 'circle-check') + '<span>' + MU.esc(msg) + '</span>';
    wrap.appendChild(t);
    setTimeout(function () {
      t.classList.add('is-out');
      setTimeout(function () { t.remove(); }, 260);
    }, 2400);
  };

  /* 헤더 */
  function initHeader() {
    var header = MU.qs('.site-header');
    if (!header) return;
    var onScroll = function () { header.classList.toggle('is-scrolled', window.scrollY > 4); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    var btn = MU.qs('.menu-btn');
    var menu = MU.qs('#mobile-menu');
    if (btn && menu) {
      btn.addEventListener('click', function () {
        var open = menu.hasAttribute('hidden');
        if (open) menu.removeAttribute('hidden'); else menu.setAttribute('hidden', '');
        btn.setAttribute('aria-expanded', String(open));
        btn.innerHTML = MU.icon(open ? 'x' : 'menu');
        document.body.classList.toggle('no-scroll', open);
      });
      MU.qsa('a', menu).forEach(function (a) {
        a.addEventListener('click', function () {
          menu.setAttribute('hidden', '');
          btn.setAttribute('aria-expanded', 'false');
          btn.innerHTML = MU.icon('menu');
          document.body.classList.remove('no-scroll');
        });
      });
    }
  }

  /* 데모 미지원 기능 */
  function initDemoLinks() {
    document.addEventListener('click', function (e) {
      var el = e.target.closest('[data-demo]');
      if (!el) return;
      e.preventDefault();
      MU.toast(el.getAttribute('data-demo') || '시연용 데모에서는 지원하지 않는 기능이에요', 'info');
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initHeader();
    initDemoLinks();
  });
})();
