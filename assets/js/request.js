/* 매치업 대전 — 3단계 요청서 위저드 */
(function () {
  var MU = window.MU, D = MU.data;
  var form = MU.qs('#wizard-form');
  if (!form) return;

  var panes = MU.qsa('.step-pane', form);
  var btnPrev = MU.qs('#btn-prev');
  var btnNext = MU.qs('#btn-next');
  var progress = MU.qs('#progress');
  var progressText = MU.qs('#progress-text');
  var progressPct = MU.qs('#progress-pct');
  var bar = MU.qs('.progress-bar', progress);
  var barFill = MU.qs('.progress-bar i', progress);
  var labels = MU.qsa('.step-labels li', progress);
  var STEP_NAMES = ['서비스 선택', '상세 질문', '지역·일정'];

  var gu = MU.qs('#gu');
  var dong = MU.qs('#dong');
  var strip = MU.qs('#date-strip');
  var flex = MU.qs('#flex');
  var timeChips = MU.qs('#time-chips');
  var nameInput = MU.qs('#name');
  var agree = MU.qs('#agree');
  var memo = MU.qs('#memo');
  var memoCount = MU.qs('#memo-count');
  var done = MU.qs('#done');

  var step = 1;
  var state = { cat: null, renderedCat: null };

  /* ---------- URL 파라미터로 미리 선택 ---------- */
  var pc = MU.param('cat');
  var pq = MU.param('q');
  if (pc && D.catById(pc)) {
    var pre = form.querySelector('input[name="cat"][value="' + pc + '"]');
    if (pre) { pre.checked = true; state.cat = pc; }
  }

  /* ---------- 공통 change 핸들러 ---------- */
  form.addEventListener('change', function (e) {
    var t = e.target;
    var q = t.closest('.q');
    if (q) q.classList.remove('has-error');
    if (t.name === 'cat') state.cat = t.value;

    // '없음/상관없음'은 단독 선택
    if (t.type === 'checkbox' && t.name && /^q\d$/.test(t.name)) {
      var group = MU.qsa('input[name="' + t.name + '"]', form);
      if (t.hasAttribute('data-exclusive') && t.checked) {
        group.forEach(function (g) { if (g !== t) g.checked = false; });
      } else if (t.checked) {
        group.forEach(function (g) { if (g.hasAttribute('data-exclusive')) g.checked = false; });
      }
    }
  });

  /* ---------- STEP 2: 카테고리별 질문 ---------- */
  function renderQuestions() {
    if (state.renderedCat === state.cat) return;
    state.renderedCat = state.cat;
    var cat = D.catById(state.cat);
    var qs = D.QUESTIONS[state.cat];

    MU.qs('#s2-chip').innerHTML =
      '<span class="cat-icon tone-' + cat.tone + '">' + MU.icon(cat.icon) + '</span>' +
      MU.esc(cat.name) + ' · ' + MU.esc(cat.sub) +
      '<button type="button" id="change-cat">변경</button>';

    MU.qs('#s2-questions').innerHTML = qs.map(function (q) {
      var last = q.options.length - 1;
      var isCheck = q.type === 'checkbox';
      return '<fieldset class="q" id="q-' + q.id + '">' +
        '<legend>' + MU.esc(q.title) + ' <span class="req">필수</span></legend>' +
        (q.hint ? '<p class="q-hint">' + MU.esc(q.hint) + '</p>' : '') +
        '<div class="opts">' + q.options.map(function (o, i) {
          var id = q.id + '-' + i;
          return '<div class="opt"><input type="' + q.type + '" name="' + q.id + '" id="' + id + '" value="' + MU.esc(o) + '"' +
            (isCheck && i === last ? ' data-exclusive' : '') + '>' +
            '<label for="' + id + '"><span class="mark">' + (isCheck ? MU.icon('check') : '') + '</span>' + MU.esc(o) + '</label></div>';
        }).join('') + '</div>' +
        '<p class="err" role="alert">' + MU.icon('circle-alert') +
        (isCheck ? '하나 이상 선택해 주세요 (없으면 ‘' + MU.esc(q.options[last]) + '’)' : '하나를 선택해 주세요') + '</p>' +
        '</fieldset>';
    }).join('');

    // 검색어로 들어온 경우 관련 옵션 미리 선택
    if (pq && pc === state.cat) {
      var tokens = pq.split(/\s+/).filter(function (t) { return t.length >= 2 && t !== cat.name; });
      qs.forEach(function (q) {
        for (var ti = 0; ti < tokens.length; ti++) {
          for (var oi = 0; oi < q.options.length - (q.type === 'checkbox' ? 1 : 0); oi++) {
            if (q.options[oi].indexOf(tokens[ti]) >= 0) {
              MU.qs('#' + q.id + '-' + oi).checked = true;
              return;
            }
          }
        }
      });
    }
  }

  document.addEventListener('click', function (e) {
    if (e.target.closest('#change-cat')) go(1);
  });

  /* ---------- STEP 3: 지역 · 날짜 · 시간 ---------- */
  function fillDong() {
    var list = D.DISTRICTS[gu.value] || [];
    dong.innerHTML = '<option value="">동 선택</option>' + list.map(function (d) { return '<option>' + d + '</option>'; }).join('');
    dong.disabled = !list.length;
  }
  gu.value = '서구';
  fillDong();
  gu.addEventListener('change', fillDong);

  (function buildDates() {
    var WD = ['일', '월', '화', '수', '목', '금', '토'];
    var html = '';
    var prevMonth = -1;
    for (var i = 1; i <= 14; i++) {
      var d = MU.addDays(i);
      var iso = MU.isoDate(d);
      var wd = d.getDay();
      var top = i === 1 ? '내일' : (d.getMonth() !== prevMonth ? (d.getMonth() + 1) + '월' : '&nbsp;');
      prevMonth = d.getMonth();
      html += '<div class="day' + (wd === 0 ? ' sun' : wd === 6 ? ' sat' : '') + '">' +
        '<input type="radio" name="date" id="d-' + i + '" value="' + iso + '">' +
        '<label for="d-' + i + '" aria-label="' + MU.fmtDate(iso) + '"><span class="dm">' + top + '</span><span class="dd">' + d.getDate() + '</span><span class="dw">' + WD[wd] + '</span></label></div>';
    }
    strip.innerHTML = html;
  })();

  flex.addEventListener('change', function () {
    strip.classList.toggle('is-disabled', flex.checked);
    if (flex.checked) MU.qsa('input[name="date"]', strip).forEach(function (r) { r.checked = false; });
  });

  timeChips.innerHTML = D.TIMES.map(function (t, i) {
    return '<span class="chip-r"><input type="radio" name="time" id="t-' + i + '" value="' + t + '"><label for="t-' + i + '">' + t + '</label></span>';
  }).join('');

  memo.addEventListener('input', function () { memoCount.textContent = memo.value.length; });
  nameInput.addEventListener('input', function () { if (nameInput.value.trim().length >= 2) MU.qs('#q-name').classList.remove('has-error'); });

  /* ---------- 진행 표시 ---------- */
  function setProgress(n, finished) {
    var pct = finished ? 100 : n * 25;
    barFill.style.width = pct + '%';
    bar.setAttribute('aria-valuenow', String(pct));
    progressPct.textContent = pct + '%';
    progressText.textContent = finished ? '작성 완료 · 요청서 전달됨' : n + ' / 3 단계 · ' + STEP_NAMES[n - 1];
    labels.forEach(function (li, i) {
      var idx = i + 1;
      var isDone = finished || idx < n;
      li.classList.toggle('is-active', !finished && idx === n);
      li.classList.toggle('is-done', isDone);
      MU.qs('.n', li).innerHTML = isDone ? MU.icon('check') : String(idx);
    });
  }

  function headerH() { var h = MU.qs('.site-header'); return h ? h.offsetHeight : 0; }
  function scrollToEl(el, smooth) {
    var y = el.getBoundingClientRect().top + window.scrollY - headerH() - 16;
    if (Math.abs(window.scrollY - y) > 4) window.scrollTo({ top: Math.max(0, y), behavior: smooth === false ? 'auto' : 'smooth' });
  }

  function go(n) {
    step = n;
    panes.forEach(function (p) { p.hidden = +p.getAttribute('data-step') !== n; });
    btnPrev.hidden = n === 1;
    btnNext.innerHTML = n === 3 ? '요청서 보내기' + MU.icon('send') : '다음' + MU.icon('arrow-right');
    setProgress(n);
    if (progress.getBoundingClientRect().top < headerH()) scrollToEl(progress);
  }

  /* ---------- 검증 ---------- */
  function validate(n) {
    var bad = [];
    if (n === 1) {
      if (!form.querySelector('input[name="cat"]:checked')) bad.push(MU.qs('#q-cat'));
    } else if (n === 2) {
      D.QUESTIONS[state.cat].forEach(function (q) {
        if (!form.querySelector('input[name="' + q.id + '"]:checked')) bad.push(MU.qs('#q-' + q.id));
      });
    } else if (n === 3) {
      if (!gu.value || !dong.value) bad.push(MU.qs('#q-area'));
      if (!flex.checked && !form.querySelector('input[name="date"]:checked')) bad.push(MU.qs('#q-date'));
      if (!form.querySelector('input[name="time"]:checked')) bad.push(MU.qs('#q-time'));
      if (nameInput.value.trim().length < 2) bad.push(MU.qs('#q-name'));
      if (!agree.checked) bad.push(MU.qs('#q-agree'));
    }
    bad.forEach(function (el) {
      el.classList.add('has-error');
      el.classList.remove('shake');
      void el.offsetWidth;
      el.classList.add('shake');
    });
    if (bad.length) {
      scrollToEl(bad[0]);
      MU.toast(bad.length === 1 ? '필수 항목을 확인해 주세요' : '필수 항목 ' + bad.length + '개를 확인해 주세요', 'circle-alert');
      return false;
    }
    return true;
  }

  /* ---------- 제출 ---------- */
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!validate(step)) return;
    if (step === 1) { renderQuestions(); go(2); }
    else if (step === 2) go(3);
    else finish();
  });
  btnPrev.addEventListener('click', function () { if (step > 1) go(step - 1); });

  function checkedVal(name) { var el = form.querySelector('input[name="' + name + '"]:checked'); return el ? el.value : ''; }

  function finish() {
    var qs = D.QUESTIONS[state.cat];
    var answers = {};
    qs.forEach(function (q) {
      answers[q.id] = q.type === 'radio' ? checkedVal(q.id) : MU.qsa('input[name="' + q.id + '"]:checked', form).map(function (i) { return i.value; });
    });
    var req = {
      cat: state.cat, answers: answers, memo: memo.value.trim(),
      gu: gu.value, dong: dong.value,
      date: flex.checked ? null : checkedVal('date'), flexible: flex.checked,
      time: checkedVal('time'), name: nameInput.value.trim(), createdAt: Date.now()
    };
    MU.store.set('request', req);
    form.hidden = true;
    setProgress(3, true);
    renderDone(req);
    scrollToEl(progress, false);
  }

  function renderDone(req) {
    var cat = D.catById(req.cat);
    var set = D.QUOTE_SETS[req.cat];
    var imgs = set.people.slice(0, 3).map(function (p) {
      return '<img src="assets/img/' + D.PEOPLE[p].img + '.webp" alt="" width="34" height="34">';
    }).join('');
    var extras = req.answers.q3 && req.answers.q3.length ? req.answers.q3.join(', ') : '없음';
    var when = (req.flexible ? '날짜 협의' : MU.fmtDate(req.date)) + ' · ' + req.time;
    var rows = [
      ['서비스', cat.name + ' · ' + req.answers.q1],
      ['상세', req.answers.q2],
      ['추가', extras],
      ['지역', '대전 ' + req.gu + ' ' + req.dong],
      ['일정', when],
      ['요청자', req.name + '님']
    ];
    if (req.memo) rows.push(['전할 말', req.memo]);

    done.innerHTML =
      '<div class="done">' +
        '<div class="done-icon">' + MU.icon('check') + '</div>' +
        '<h2>요청서를 보냈어요!</h2>' +
        '<p>대전 ' + MU.esc(req.gu) + ' 근처 ' + MU.esc(cat.name) + ' 전문가 ' + cat.pros + '명에게 요청서가 전달됐어요.<br class="br-pc"> 견적이 도착하면 바로 알려드릴게요.</p>' +
        '<div class="arriving">' +
          '<div class="avatar-stack">' + imgs + '</div>' +
          '<div><b id="arr-count">전문가들이 요청서를 확인 중이에요</b><span>평균 27분 안에 첫 견적이 도착해요</span></div>' +
          '<span class="live"><span class="pulse"></span>실시간</span>' +
        '</div>' +
        '<dl class="summary">' + rows.map(function (r) {
          return '<div class="summary-row"><dt>' + r[0] + '</dt><dd>' + MU.esc(r[1]) + '</dd></div>';
        }).join('') + '</dl>' +
        '<div class="done-actions">' +
          '<a class="btn btn-primary btn-lg" id="go-quotes" href="quotes.html">받은 견적 보기' + MU.icon('arrow-right') + '</a>' +
          '<a class="btn btn-outline btn-lg" href="index.html">홈으로</a>' +
        '</div>' +
      '</div>';
    done.hidden = false;

    var arr = MU.qs('#arr-count');
    var goQ = MU.qs('#go-quotes');
    [[1000, 1], [2000, 3], [3000, 5]].forEach(function (s) {
      setTimeout(function () {
        arr.textContent = '견적 ' + s[1] + '개 도착!' + (s[1] === 1 ? ' · ' + set.biz[0] : '');
        goQ.innerHTML = '받은 견적 ' + s[1] + '개 보기' + MU.icon('arrow-right');
      }, s[0]);
    });
  }

  /* ---------- 초기화 ---------- */
  go(1);
})();
