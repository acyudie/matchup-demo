/* 매치업 대전 — 받은 견적: 필터·정렬·채팅 드로어 */
(function () {
  var MU = window.MU, D = MU.data;
  var list = MU.qs('#quote-list');
  if (!list) return;

  /* ---------- 요청서 (없으면 샘플) ---------- */
  var req = MU.store.get('request', null);
  var isSample = !req || !D.QUOTE_SETS[req.cat];
  if (isSample) {
    req = {
      cat: 'clean',
      answers: { q1: '입주 청소', q2: '30평 이상', q3: ['베란다·창틀', '새집증후군 케어'] },
      memo: '', gu: '서구', dong: '둔산동', date: MU.isoDate(MU.addDays(8)), flexible: false,
      time: '오전 (9~12시)', name: '고객', createdAt: Date.now() - (2 * 3600 + 13 * 60) * 1000
    };
  }
  var cat = D.catById(req.cat);
  var qset = D.QUESTIONS[req.cat];
  var set = D.QUOTE_SETS[req.cat];
  var INCLUDED = {
    clean: ['전문 장비·세제 포함', '작업 후 사진 리포트', '불만족 시 재방문'],
    move: ['포장 자재 제공', '가구 분해·조립', '적재물 보험 가입'],
    interior: ['실측 방문 상담', '자재 샘플 제공', '시공 후 A/S'],
    repair: ['출장비 포함', '부품 원가 공개', '시공 후 A/S'],
    lesson: ['첫 수업 레벨 체크', '맞춤 커리큘럼', '수업 후 피드백'],
    tutor: ['진단 테스트', '주간 학습 리포트', '시험 대비 자료'],
    design: ['맞춤 시안 제안', '수정 2~3회', '최종 파일 제공'],
    dev: ['반응형 웹 구현', '배포 지원', '무상 유지보수 기간']
  };

  /* ---------- 견적 계산 ---------- */
  var mult = 1;
  qset.forEach(function (q) {
    if (q.type === 'radio' && q.mult) {
      var idx = q.options.indexOf(req.answers[q.id]);
      if (idx >= 0) mult *= q.mult[idx];
    }
  });
  var q3 = qset[2];
  var none = q3.options[q3.options.length - 1];
  var extras = (req.answers.q3 || []).filter(function (o) { return o !== none; });
  var addon = (q3.addon || 0) * extras.length;
  var area = req.gu + ' ' + req.dong;
  var detail = req.answers.q1 + (req.answers.q2 ? '(' + req.answers.q2 + ')' : '');

  var quotes = D.SLOTS.map(function (s, j) {
    var person = D.PEOPLE[set.people[j]];
    var base = Math.round(set.base[j] * mult / 10000) * 10000;
    var score = s.rating * 20 + Math.log(s.reviews + 1) * 3 - s.resp / 20 + (s.verified ? 4 : 0) + (s.noExtra ? 2 : 0);
    return {
      id: j, name: person.name, img: person.img, biz: set.biz[j], pitch: set.pitch[j],
      rating: s.rating, reviews: s.reviews, hires: s.hires, resp: s.resp, verified: s.verified,
      noExtra: s.noExtra, sameDay: s.sameDay, isNew: !!s.isNew, career: s.career, ago: s.ago,
      base: base, addon: addon, total: base + addon, score: score, hired: false, chat: null
    };
  });
  function minBy(key) { return quotes.reduce(function (a, b) { return b[key] < a[key] ? b : a; }); }
  function maxBy(key) { return quotes.reduce(function (a, b) { return b[key] > a[key] ? b : a; }); }
  var bestRec = maxBy('score').id, cheapest = minBy('total').id, fastest = minBy('resp').id;

  /* ---------- 요청서 카드 ---------- */
  var reqCard = MU.qs('#req-card');
  var when = (req.flexible ? '날짜 협의' : MU.fmtDate(req.date)) + ' · ' + req.time;
  reqCard.innerHTML =
    '<span class="req-status"><span class="pulse"></span>견적 도착 완료 · 5/5</span>' +
    '<div class="req-title"><span class="cat-icon tone-' + cat.tone + '">' + MU.icon(cat.icon) + '</span>' +
      '<div><b>' + MU.esc(cat.name) + ' · ' + MU.esc(req.answers.q1) + '</b><span>' + MU.esc(req.answers.q2) + ' · 대전 ' + MU.esc(area) + '</span></div></div>' +
    '<ul class="req-list">' +
      '<li>' + MU.icon('map-pin') + '<span>대전 ' + MU.esc(area) + '</span></li>' +
      '<li>' + MU.icon('calendar') + '<span>' + MU.esc(when) + '</span></li>' +
      '<li>' + MU.icon('sliders-horizontal') + '<span>' + MU.esc(extras.length ? extras.join(', ') : '추가 요청 없음') + '</span></li>' +
      (req.memo ? '<li>' + MU.icon('message-circle') + '<span>' + MU.esc(req.memo) + '</span></li>' : '') +
    '</ul>' +
    '<div class="req-progress">' +
      '<div class="req-progress-top"><span>도착한 견적</span><b>5 / 5</b></div>' +
      '<div class="req-bar"><i></i></div>' +
      '<div class="req-deadline">' + MU.icon('clock') + '견적 비교 마감까지 <b id="countdown">--:--:--</b></div>' +
    '</div>' +
    '<button class="req-more" type="button" aria-expanded="false">요청서 자세히 보기' + MU.icon('chevron-down') + '</button>';
  var more = MU.qs('.req-more', reqCard);
  more.addEventListener('click', function () {
    var on = reqCard.classList.toggle('is-expanded');
    more.setAttribute('aria-expanded', String(on));
    more.firstChild.nodeValue = on ? '요청서 접기' : '요청서 자세히 보기';
  });

  var deadline = (req.createdAt || Date.now()) + 48 * 3600 * 1000;
  var cd = MU.qs('#countdown');
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function tick() {
    var s = Math.max(0, Math.floor((deadline - Date.now()) / 1000));
    cd.textContent = pad(Math.floor(s / 3600)) + ':' + pad(Math.floor(s % 3600 / 60)) + ':' + pad(s % 60);
  }
  tick();
  setInterval(tick, 1000);

  if (isSample) MU.qs('#sample-banner').hidden = false;

  /* ---------- 목록 렌더 ---------- */
  var filters = {};
  var sortKey = 'rec';
  var FILTERS = {
    verified: function (q) { return q.verified; },
    top: function (q) { return q.rating >= 4.8; },
    fast: function (q) { return q.resp <= 30; },
    noextra: function (q) { return q.noExtra; }
  };
  var SORTS = {
    rec: function (a, b) { return b.score - a.score; },
    price: function (a, b) { return a.total - b.total; },
    rating: function (a, b) { return b.rating - a.rating || b.reviews - a.reviews; },
    reviews: function (a, b) { return b.reviews - a.reviews; },
    resp: function (a, b) { return a.resp - b.resp; }
  };
  function respText(m) { return m < 60 ? '평균 ' + m + '분 응답' : '평균 ' + Math.round(m / 60) + '시간 내 응답'; }

  function cardHTML(q, i) {
    var badges = '';
    if (q.id === bestRec) badges += '<span class="badge badge-brand">' + MU.icon('award') + '추천</span>';
    if (q.id === cheapest) badges += '<span class="badge badge-accent">최저가</span>';
    if (q.id === fastest) badges += '<span class="badge badge-success">' + MU.icon('zap') + '응답 1위</span>';
    if (q.hired) badges += '<span class="badge badge-dark">' + MU.icon('check') + '고용 완료</span>';
    var tags = [];
    if (q.verified) tags.push('신원·자격 인증');
    if (q.noExtra) tags.push('추가 비용 없음');
    if (q.sameDay) tags.push(cat.kind === 'visit' ? '당일 방문 가능' : '빠른 착수');
    if (q.isNew) tags.push('신규 전문가');
    tags.push('경력 ' + q.career + '년');
    return '<article class="quote' + (q.hired ? ' is-hired' : '') + '" data-id="' + q.id + '" style="animation-delay:' + (i * 50) + 'ms">' +
      '<div class="quote-top">' +
        '<img class="avatar" src="assets/img/' + q.img + '.webp" alt="' + MU.esc(q.name) + ' 전문가 프로필 일러스트" width="52" height="52">' +
        '<div class="quote-info">' +
          '<div class="quote-name">' + MU.esc(q.name) + (q.verified ? MU.icon('badge-check', 'ico-verified') : '') + badges + '</div>' +
          '<div class="quote-biz">' + MU.esc(q.biz) + '</div>' +
          '<div class="quote-meta"><span class="rating">' + MU.star() + q.rating.toFixed(1) + '<span class="cnt">(' + q.reviews + ')</span></span>' +
            '<span class="m">' + MU.icon('briefcase') + '고용 ' + q.hires + '회</span>' +
            '<span class="m">' + MU.icon('timer') + respText(q.resp) + '</span></div>' +
        '</div>' +
        '<span class="quote-ago">' + q.ago + '</span>' +
      '</div>' +
      '<p class="quote-msg">' + MU.esc(q.pitch) + '</p>' +
      '<div class="tags">' + tags.map(function (t) { return '<span class="tag">' + t + '</span>'; }).join('') + '</div>' +
      '<div class="quote-bottom">' +
        '<div class="quote-price"><small>예상 금액 · ' + MU.esc(cat.unit) + '</small><b>' + MU.won(q.total) + '</b></div>' +
        '<div class="quote-actions">' +
          '<button class="btn btn-outline btn-sm btn-detail" type="button" data-act="open">견적서</button>' +
          '<button class="btn btn-primary btn-sm" type="button" data-act="open">' + MU.icon('message-circle') + '채팅하기</button>' +
        '</div>' +
      '</div>' +
    '</article>';
  }

  function render() {
    var keys = Object.keys(filters).filter(function (k) { return filters[k]; });
    var shown = quotes.filter(function (q) {
      return keys.every(function (k) { return FILTERS[k](q); });
    }).sort(SORTS[sortKey]);
    MU.qs('#count').textContent = shown.length === quotes.length ? quotes.length : shown.length + ' / ' + quotes.length;
    MU.qs('#result-count').innerHTML = '<b>' + shown.length + '</b>개 표시 중';
    if (!shown.length) {
      list.innerHTML = '<div class="empty">' + MU.icon('funnel') + '<b>조건에 맞는 견적이 없어요</b>필터를 줄이면 더 많은 견적을 볼 수 있어요.<br><button class="btn btn-outline btn-sm" type="button" id="reset-filter">' + MU.icon('rotate-ccw') + '필터 초기화</button></div>';
      return;
    }
    list.innerHTML = shown.map(cardHTML).join('');
  }

  var chips = MU.qsa('.fchip');
  chips.forEach(function (c) {
    c.addEventListener('click', function () {
      var f = c.getAttribute('data-filter');
      if (f === 'all') { filters = {}; }
      else { filters[f] = !filters[f]; }
      syncChips();
      render();
    });
  });
  function syncChips() {
    var any = Object.keys(filters).some(function (k) { return filters[k]; });
    chips.forEach(function (c) {
      var f = c.getAttribute('data-filter');
      c.setAttribute('aria-pressed', String(f === 'all' ? !any : !!filters[f]));
    });
  }
  MU.qs('#sort').addEventListener('change', function (e) { sortKey = e.target.value; render(); });
  list.addEventListener('click', function (e) {
    if (e.target.closest('#reset-filter')) { filters = {}; syncChips(); render(); return; }
    var card = e.target.closest('.quote');
    if (card) openDrawer(+card.getAttribute('data-id'));
  });

  /* ---------- 채팅 드로어 ---------- */
  var drawer = MU.qs('#drawer');
  var overlay = MU.qs('#overlay');
  var body = MU.qs('#d-body');
  var quick = MU.qs('#d-quick');
  var dForm = MU.qs('#d-form');
  var dInput = MU.qs('#d-input');
  var hireBtn = MU.qs('#d-hire');
  var modal = MU.qs('#modal');
  var cur = null;
  var lastFocus = null;

  function timeAgo(minAgo) {
    var d = new Date(Date.now() - minAgo * 60000), h = d.getHours(), m = d.getMinutes();
    return (h < 12 ? '오전 ' : '오후 ') + ((h % 12) || 12) + ':' + pad(m);
  }
  function agoMin(q) { var m = /(\d+)분/.exec(q.ago); return m ? +m[1] : 60; }

  function proMsg(q, html, t) {
    return '<div class="msg pro"><img class="avatar" src="assets/img/' + q.img + '.webp" alt="" width="30" height="30">' +
      '<div class="msg-col">' + html + '<span class="msg-time">' + t + '</span></div></div>';
  }
  function meMsg(text, t) {
    return '<div class="msg me"><div class="msg-col"><div class="bubble">' + MU.esc(text) + '</div><span class="msg-time">' + t + '</span></div></div>';
  }

  function scheduleText() {
    if (req.flexible) return '일정은 편하신 날로 맞춰드릴게요.';
    var d = MU.fmtDate(req.date), t = req.time.replace(/\s*\(.*\)/, '');
    if (cat.kind === 'visit') return d + ' ' + t + ' 방문 가능합니다.';
    if (cat.kind === 'class') return d + '부터 ' + t + ' 수업 가능해요.';
    return d + '부터 바로 착수할 수 있어요.';
  }

  function initialChat(q) {
    var t0 = timeAgo(agoMin(q));
    var lines = '<li><span>기본 · ' + MU.esc(detail) + '</span><span>' + MU.won(q.base) + '</span></li>';
    if (extras.length) lines += '<li><span>추가 · ' + MU.esc(extras[0]) + (extras.length > 1 ? ' 외 ' + (extras.length - 1) + '건' : '') + '</span><span>' + (addon ? '+' + MU.won(addon) : '포함') + '</span></li>';
    lines += '<li><span>' + (q.noExtra ? '현장 추가 비용' : '현장 상황에 따라') + '</span><span>' + (q.noExtra ? '없음' : '사전 협의') + '</span></li>';
    var quoteCard =
      '<div class="quote-bubble">' +
        '<div class="qb-head"><span>' + MU.icon('receipt') + ' 견적서</span><span>' + MU.esc(cat.unit) + '</span></div>' +
        '<div class="qb-body">' +
          '<div class="qb-price">' + MU.won(q.total) + '<small>예상 금액</small></div>' +
          '<ul class="qb-lines">' + lines + '</ul>' +
          '<ul class="qb-incl">' + INCLUDED[req.cat].map(function (x) { return '<li>' + MU.icon('check') + x + '</li>'; }).join('') + '</ul>' +
        '</div>' +
      '</div>';
    return '<span class="chat-day">오늘</span>' +
      '<span class="chat-sys">' + MU.icon('file-text') + '요청서 · ' + MU.esc(cat.name) + ' · ' + MU.esc(area) + '</span>' +
      proMsg(q, quoteCard, t0) +
      proMsg(q, '<div class="bubble">안녕하세요, ' + MU.esc(q.biz) + ' ' + MU.esc(q.name) + '입니다. ' + MU.esc(area) + ' ' + MU.esc(detail) + ' 요청 확인했어요. ' + MU.esc(q.pitch) + '</div>', t0) +
      proMsg(q, '<div class="bubble">' + MU.esc(scheduleText()) + ' 궁금한 점 편하게 물어보세요!</div>', t0);
  }

  function quickReplies() {
    var third = cat.kind === 'class' ? '수업은 어떻게 진행되나요?' : '작업 시간은 얼마나 걸리나요?';
    var fourth = cat.kind === 'visit' ? '방문 상담 가능할까요?' : cat.kind === 'class' ? '체험 수업 가능할까요?' : '미팅 먼저 가능할까요?';
    return ['가능한 날짜가 언제인가요?', '추가 비용이 있나요?', third, fourth];
  }

  function answerFor(text, q) {
    if (/날짜|언제/.test(text)) {
      if (cat.kind === 'visit') return (req.flexible ? '이번 주 목·금 오전이 비어 있어요.' : '요청하신 ' + MU.fmtDate(req.date) + ' 외에도 이번 주 목·금 오전이 비어 있어요.') + ' 편하신 날로 맞춰드릴게요.';
      if (cat.kind === 'class') return '매주 같은 요일·시간으로 진행해요. 평일 저녁과 주말 오전이 가능해요.';
      return '바로 착수할 수 있어요. 확정되면 주차별 일정표를 먼저 공유해 드릴게요.';
    }
    if (/추가 비용|비용/.test(text)) {
      return q.noExtra ? '견적서 금액 외 추가 비용은 없어요. 현장 상황이 크게 다를 때만 작업 전에 먼저 상의드릴게요.'
        : '대부분 견적 금액 그대로 진행돼요. 달라질 수 있는 부분은 작업 전에 꼭 먼저 안내해 드려요.';
    }
    if (/시간|진행/.test(text)) return D.DURATION[req.cat];
    if (/방문|체험|미팅|상담/.test(text)) {
      if (cat.kind === 'visit') return '네, 가능해요! 방문 상담은 무료이고, 현장 확인 후 최종 견적을 확정해 드려요.';
      if (cat.kind === 'class') return '네, 첫 시간은 상담 겸 체험 수업으로 진행할 수 있어요. 부담 없이 신청해 주세요.';
      return '네, 화상 미팅으로 30분 정도 요구사항을 정리하면 더 정확한 견적을 드릴 수 있어요.';
    }
    return '메시지 확인했어요! 말씀하신 내용까지 반영해서 최종 견적과 일정을 정리해 드릴게요.';
  }

  function scrollChat() { body.scrollTop = body.scrollHeight; }

  function send(text) {
    text = String(text || '').trim();
    if (!text || !cur) return;
    var q = cur;
    var mine = meMsg(text, MU.nowTime());
    q.chat += mine;
    body.insertAdjacentHTML('beforeend', mine);
    var typing = document.createElement('div');
    typing.className = 'msg pro';
    typing.innerHTML = '<img class="avatar" src="assets/img/' + q.img + '.webp" alt="" width="30" height="30"><div class="msg-col"><div class="bubble typing" aria-label="입력 중"><i></i><i></i><i></i></div></div>';
    body.appendChild(typing);
    scrollChat();
    setTimeout(function () {
      typing.remove();
      var reply = proMsg(q, '<div class="bubble">' + MU.esc(answerFor(text, q)) + '</div>', MU.nowTime());
      q.chat += reply;
      if (cur === q) { body.insertAdjacentHTML('beforeend', reply); scrollChat(); }
    }, 1100 + Math.random() * 500);
  }

  function setHireBtn(q) {
    hireBtn.disabled = q.hired;
    hireBtn.innerHTML = q.hired ? MU.icon('check') + '고용 완료' : '고용하기';
  }

  function openDrawer(id) {
    var q = quotes.filter(function (x) { return x.id === id; })[0];
    if (!q) return;
    cur = q;
    lastFocus = document.activeElement;
    if (q.chat === null) q.chat = initialChat(q);
    MU.qs('#d-avatar').src = 'assets/img/' + q.img + '.webp';
    MU.qs('#d-avatar').alt = q.name + ' 전문가 프로필 일러스트';
    MU.qs('#drawer-name').innerHTML = MU.esc(q.name) + (q.verified ? MU.icon('badge-check', 'ico-verified') : '');
    MU.qs('#d-sub').innerHTML = '<span class="online">응답 가능</span> · ' + MU.esc(q.biz);
    body.innerHTML = q.chat;
    quick.innerHTML = quickReplies().map(function (t) { return '<button type="button">' + t + '</button>'; }).join('');
    setHireBtn(q);
    overlay.hidden = false;
    drawer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
    requestAnimationFrame(function () {
      overlay.classList.add('is-open');
      drawer.classList.add('is-open');
      scrollChat();
    });
    setTimeout(function () { drawer.focus({ preventScroll: true }); }, 60);
  }

  function closeDrawer() {
    if (!cur) return;
    overlay.classList.remove('is-open');
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('no-scroll');
    setTimeout(function () { overlay.hidden = true; }, 260);
    cur = null;
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  quick.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (b) send(b.textContent);
  });
  dForm.addEventListener('submit', function (e) {
    e.preventDefault();
    send(dInput.value);
    dInput.value = '';
  });
  MU.qs('#d-close').addEventListener('click', closeDrawer);
  overlay.addEventListener('click', closeDrawer);

  /* ---------- 고용 확인 모달 ---------- */
  function closeModal() { modal.hidden = true; modal.innerHTML = ''; }
  hireBtn.addEventListener('click', function () {
    if (!cur || cur.hired) return;
    var q = cur;
    modal.innerHTML =
      '<div class="modal-card">' +
        '<img class="avatar" src="assets/img/' + q.img + '.webp" alt="" width="64" height="64">' +
        '<h3 id="modal-title">' + MU.esc(q.name) + ' 전문가를 고용할까요?</h3>' +
        '<p>' + MU.esc(q.biz) + ' · ' + MU.esc(cat.name) + '</p>' +
        '<div class="modal-price">예상 금액<b>' + MU.won(q.total) + '</b></div>' +
        '<div class="modal-actions"><button class="btn btn-outline" type="button" data-m="cancel">취소</button><button class="btn btn-primary" type="button" data-m="ok">고용 확정</button></div>' +
      '</div>';
    modal.hidden = false;
    MU.qs('[data-m="ok"]', modal).focus();
  });
  modal.addEventListener('click', function (e) {
    var b = e.target.closest('[data-m]');
    if (e.target === modal || (b && b.getAttribute('data-m') === 'cancel')) { closeModal(); return; }
    if (b && b.getAttribute('data-m') === 'ok' && cur) {
      var q = cur;
      q.hired = true;
      var sys = '<span class="chat-sys">' + MU.icon('circle-check') + '고용이 확정됐어요 · 세부 일정은 채팅으로 조율하세요</span>';
      q.chat += sys;
      body.insertAdjacentHTML('beforeend', sys);
      scrollChat();
      setHireBtn(q);
      closeModal();
      render();
      MU.toast(q.name + ' 전문가를 고용했어요 (시연)', 'circle-check');
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (!modal.hidden) closeModal();
    else if (cur) closeDrawer();
  });

  render();

  // ?open=0 처럼 바로 열기 (데모 링크용)
  var openParam = MU.param('open');
  if (openParam !== null && quotes[+openParam]) setTimeout(function () { openDrawer(+openParam); }, 300);
})();
