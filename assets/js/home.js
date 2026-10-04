/* 매치업 대전 — 홈: 서비스 검색 자동완성 */
(function () {
  var MU = window.MU, D = MU.data;
  var form = MU.qs('#hero-search');
  if (!form) return;
  var input = MU.qs('#search-input');
  var box = MU.qs('#suggest');

  var items = [];
  D.CATEGORIES.forEach(function (c) {
    c.keywords.forEach(function (k) { items.push({ k: k, c: c }); });
  });
  var popular = D.CATEGORIES.map(function (c) { return { k: c.keywords[0], c: c }; });

  var current = [];
  var active = -1;

  function norm(s) { return String(s).replace(/\s+/g, '').toLowerCase(); }

  function highlight(text, q) {
    var i = q ? text.indexOf(q) : -1;
    if (i < 0) return MU.esc(text);
    return MU.esc(text.slice(0, i)) + '<mark>' + MU.esc(q) + '</mark>' + MU.esc(text.slice(i + q.length));
  }

  function go(item) {
    location.href = 'request.html?cat=' + item.c.id + '&q=' + encodeURIComponent(item.k);
  }

  function render() {
    var v = input.value.trim();
    var label;
    if (!v) {
      current = popular;
      label = '많이 찾는 서비스';
    } else {
      var nv = norm(v);
      current = items.filter(function (it) {
        return norm(it.k).indexOf(nv) >= 0 || norm(it.c.name).indexOf(nv) >= 0 || norm(it.c.sub).indexOf(nv) >= 0;
      }).slice(0, 7);
      label = '추천 서비스';
    }
    active = -1;
    if (!current.length) {
      box.innerHTML = '<p class="suggest-empty">‘' + MU.esc(v) + '’에 맞는 서비스를 찾지 못했어요. 다른 단어로 검색해 보세요.</p>';
    } else {
      box.innerHTML = '<p class="suggest-label">' + label + '</p>' + current.map(function (it, i) {
        return '<button type="button" role="option" id="sg-' + i + '" data-i="' + i + '" class="tone-' + it.c.tone + '">' +
          '<span class="s-ico">' + MU.icon(it.c.icon) + '</span>' +
          '<span>' + highlight(it.k, v) + '</span>' +
          '<span class="s-cat">' + MU.esc(it.c.name) + '</span></button>';
      }).join('');
    }
    open();
  }

  function open() { box.hidden = false; form.classList.add('is-open'); input.setAttribute('aria-expanded', 'true'); }
  function close() { box.hidden = true; form.classList.remove('is-open'); input.setAttribute('aria-expanded', 'false'); active = -1; }

  function setActive(i) {
    var btns = MU.qsa('button', box);
    if (!btns.length) return;
    active = (i + btns.length) % btns.length;
    btns.forEach(function (b, j) { b.classList.toggle('is-active', j === active); });
    input.setAttribute('aria-activedescendant', 'sg-' + active);
    btns[active].scrollIntoView({ block: 'nearest' });
  }

  input.addEventListener('focus', render);
  input.addEventListener('input', render);
  input.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); if (box.hidden) render(); setActive(active + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
    else if (e.key === 'Escape') { close(); }
  });
  box.addEventListener('mousedown', function (e) { e.preventDefault(); });
  box.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-i]');
    if (b) go(current[+b.getAttribute('data-i')]);
  });
  document.addEventListener('click', function (e) { if (!form.contains(e.target)) close(); });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var v = input.value.trim();
    if (active >= 0 && current[active]) return go(current[active]);
    if (!v) { input.focus(); render(); return; }
    var nv = norm(v);
    var hit = items.filter(function (it) {
      return norm(it.k).indexOf(nv) >= 0 || norm(it.c.name).indexOf(nv) >= 0 || norm(it.c.sub).indexOf(nv) >= 0;
    })[0];
    if (hit) go(hit);
    else MU.toast('‘' + v + '’ 관련 서비스를 찾지 못했어요', 'info');
  });

  MU.qsa('.kw').forEach(function (b) {
    b.addEventListener('click', function () {
      var c = D.catById(b.getAttribute('data-cat'));
      go({ k: b.getAttribute('data-kw'), c: c });
    });
  });
})();
