/* مساعد تنوركو الذكي: زر شات في المنيو يجاوب الزبون، ويعرض صورة الطبق وسعره من المنيو، ويقترح أطباق ومشروبات وسلطات.
   إذا ما عرف الجواب يعطي الزبون رقم الاتصال وزر واتساب برسالة جاهزة.
   كل المحادثات تنحفظ في جدول chat_logs على Supabase وتظهر في صفحة «زوار الموقع».
   الذكاء الاصطناعي يشتغل من دالة Supabase اسمها tanourko-chat (طريقة التفعيل في supabase/README-chat.md).
   لو الدالة مو مفعّلة أو تعطلت، المساعد يشتغل بالبحث العادي في المنيو ويحوّل للواتساب. */
(function () {
  'use strict';
  var SB_URL = 'https://iekotptltmkjmieauhqc.supabase.co';
  var SB_KEY = 'sb_publishable_35u5V1apSr2-DCpjp8ltmg_gIJzhXEN';
  var FN_URL = SB_URL + '/functions/v1/tanourko-chat';
  var C = window.CONFIG || {};
  var WHATSAPP = C.WHATSAPP || '971500888917';
  var CALL = C.CALL || '0500888917';
  var PAGE = location.pathname.split('/').pop() || 'index.html';
  var ON_MENU = PAGE === 'menu.html';

  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  function ss(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch (e) { return null; } }
  function rid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 10); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function cut(s, n) { s = s == null ? '' : String(s); return s.length > n ? s.slice(0, n) : s; }
  function norm(s) {
    return String(s || '').toLowerCase().replace(/[ً-ْـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي').replace(/[^؀-ۿa-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  /* ---------------- الصفحات الثانية: الزر يفتح المنيو والشات مفتوح ---------------- */
  var CSS = '\
.tkc-btn{position:fixed;right:16px;bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:60;display:flex;align-items:center;gap:8px;background:#2A1A0E;color:#fff;border:0;border-radius:999px;padding:10px 16px 10px 12px;font:inherit;font-size:14.5px;font-weight:900;box-shadow:0 8px 24px rgba(42,26,14,.32);cursor:pointer;text-decoration:none;font-family:"Cairo","Tajawal",system-ui,sans-serif}\
.tkc-btn .dot{width:30px;height:30px;border-radius:50%;background:#E8692F;display:flex;align-items:center;justify-content:center;font-size:17px}\
body.trk-on .tkc-btn{bottom:calc(92px + env(safe-area-inset-bottom,0px))}\
body.has-cart .tkc-btn span.t{display:none}body.has-cart .tkc-btn{padding:8px}\
.tkc{position:fixed;inset:auto 12px calc(12px + env(safe-area-inset-bottom,0px)) 12px;z-index:90;max-width:440px;margin-inline-start:auto;height:min(640px,calc(100dvh - 24px));background:#FFFBF6;border-radius:22px;box-shadow:0 18px 50px rgba(42,26,14,.35);display:flex;flex-direction:column;overflow:hidden;font-family:"Cairo","Tajawal",system-ui,sans-serif;color:#2A1A0E;direction:rtl}\
.tkc.hide{display:none}\
.tkc-h{background:#E8692F;color:#fff;display:flex;align-items:center;gap:10px;padding:12px 14px}\
.tkc-h b{display:block;font-size:16px}.tkc-h small{font-size:12px;opacity:.9}\
.tkc-h .x{margin-inline-start:auto;background:rgba(255,255,255,.2);border:0;color:#fff;width:34px;height:34px;border-radius:50%;font-size:16px;cursor:pointer}\
.tkc-av{width:38px;height:38px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;font-size:20px;flex:none}\
.tkc-m{flex:1;overflow-y:auto;padding:14px 12px;display:flex;flex-direction:column;gap:10px;overscroll-behavior:contain}\
.tkc-m>*{flex:none}\
.tkc-b{max-width:86%;padding:9px 13px;border-radius:16px;font-size:14.5px;line-height:1.65;white-space:pre-wrap;word-wrap:break-word}\
.tkc-b.bot{background:#fff;border:1px solid #F0E2D5;align-self:flex-start;border-top-right-radius:5px}\
.tkc-b.me{background:#E8692F;color:#fff;align-self:flex-end;border-top-left-radius:5px}\
.tkc-dish{display:flex;gap:8px;overflow-x:auto;padding:2px 0 4px;scroll-snap-type:x mandatory;align-self:stretch}\
.tkc-d{flex:none;width:168px;background:#fff;border:1px solid #F0E2D5;border-radius:16px;overflow:hidden;scroll-snap-align:start;display:flex;flex-direction:column}\
.tkc-d .im{height:112px;background:#FBEDE2 center/cover no-repeat;display:flex;align-items:center;justify-content:center;font-size:34px}\
.tkc-d .bd{padding:8px 10px 10px;display:flex;flex-direction:column;gap:5px;flex:1}\
.tkc-d h4{margin:0;font-size:13.5px;line-height:1.4}.tkc-d .sc{font-size:11.5px;color:#8B735F}\
.tkc-d .pr{font-size:14px;font-weight:900;color:#E8692F}.tkc-d .pr small{font-weight:700;font-size:11px;color:#8B735F}\
.tkc-d .ad{margin-top:auto;display:flex;flex-wrap:wrap;gap:4px}\
.tkc-d .ad button,.tkc-d .ad a{flex:1;border:0;background:#4FA463;color:#fff;border-radius:10px;padding:6px 6px;font:inherit;font-size:12px;font-weight:900;cursor:pointer;text-align:center;text-decoration:none;white-space:nowrap}\
.tkc-d .ad button.ok{background:#2A1A0E}\
.tkc-c{align-self:stretch;background:#fff;border:1.5px dashed #E8692F;border-radius:16px;padding:10px;display:flex;flex-direction:column;gap:7px;font-size:13.5px}\
.tkc-c a{display:flex;align-items:center;justify-content:center;gap:6px;border-radius:12px;padding:9px;font-weight:900;text-decoration:none;font-size:14px}\
.tkc-c a.wa{background:#25D366;color:#fff}.tkc-c a.cl{background:#FBEDE2;color:#2A1A0E}\
.tkc-q{display:flex;gap:6px;overflow-x:auto;padding:0 12px 8px}\
.tkc-q button{flex:none;border:1.5px solid #EED7C5;background:#fff;color:#2A1A0E;border-radius:999px;padding:6px 12px;font:inherit;font-size:13px;font-weight:800;cursor:pointer}\
.tkc-f{display:flex;gap:8px;padding:10px 12px calc(10px + env(safe-area-inset-bottom,0px));border-top:1px solid #F0E2D5;background:#fff}\
.tkc-f input{flex:1;min-width:0;border:1.5px solid #EED7C5;border-radius:14px;padding:10px 12px;font:inherit;font-size:16px;outline:none;background:#FFFBF6;color:#2A1A0E}\
.tkc-f input:focus{border-color:#E8692F}\
.tkc-f button{border:0;background:#E8692F;color:#fff;border-radius:14px;padding:0 16px;font:inherit;font-weight:900;font-size:15px;cursor:pointer}\
.tkc-f button:disabled{opacity:.5}\
.tkc-typ{align-self:flex-start;background:#fff;border:1px solid #F0E2D5;border-radius:16px;padding:10px 14px;display:flex;gap:4px}\
.tkc-typ i{width:7px;height:7px;border-radius:50%;background:#E8692F;animation:tkcb 1s infinite}.tkc-typ i:nth-child(2){animation-delay:.15s}.tkc-typ i:nth-child(3){animation-delay:.3s}\
@keyframes tkcb{50%{opacity:.25;transform:translateY(-3px)}}\
@media (prefers-reduced-motion:reduce){.tkc-typ i{animation:none}}';
  var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);

  if (!ON_MENU) {
    var a = document.createElement('a');
    a.className = 'tkc-btn'; a.href = 'menu.html?chat=1';
    a.innerHTML = '<span class="dot">🤖</span><span class="t">اسأل مساعد تنوركو</span>';
    a.addEventListener('click', function () { try { window.tkTrack && window.tkTrack('chat'); } catch (e) {} });
    document.body.appendChild(a);
    return;
  }

  /* ---------------- المنيو ---------------- */
  var ITEMS = [];
  function imgOf(v) {
    if (!v) return '';
    if (window.tkImg) return window.tkImg(v);
    return /^https?:/.test(v) ? v : '';
  }
  function setMenu(menu) {
    ITEMS = [];
    (menu || []).forEach(function (sec) {
      (sec.items || []).forEach(function (it) {
        ITEMS.push({ id: ITEMS.length, it: it, n: it.n, sec: sec.t, note: sec.note || '', nn: norm(it.n) });
      });
    });
  }
  function priceText(it) {
    if (it.sizes && it.sizes.length) return it.sizes.map(function (z) { return z[0] + ' ' + z[1]; }).join(' / ') + ' درهم';
    if (it.txt) return it.txt;
    return it.p + ' درهم' + (it.old ? ' (بدل ' + it.old + ')' : '');
  }
  function menuText() {
    return ITEMS.map(function (x) {
      return x.id + '|' + x.n + '|' + x.sec + '|' + priceText(x.it) + (x.it.d ? '|' + x.it.d : '') + (x.note ? '|' + x.note : '');
    }).join('\n');
  }
  window.tkChatSetMenu = setMenu;
  if (window.TK_MENU) setMenu(window.TK_MENU);

  /* ---------------- الحفظ في لوحة التحكم ---------------- */
  var visitor = ls('tk_vid'); if (!visitor) { visitor = rid(); ls('tk_vid', visitor); }
  var convo = ss('tk_chat_id'); if (!convo) { convo = rid(); ss('tk_chat_id', convo); }
  function geo() { try { var c = JSON.parse(ls('tk_geo_v1') || 'null'); return c ? c.g : {}; } catch (e) { return {}; } }
  function log(role, text, extra) {
    if (ls('tk_notrack') === '1') return;
    extra = extra || {};
    var g = geo() || {};
    var row = {
      visitor: visitor, convo: convo, page: PAGE, role: role, text: cut(text, 2000),
      dishes: (extra.dishes || []).slice(0, 8).map(function (s) { return cut(s, 120); }),
      handoff: !!extra.handoff, mode: extra.mode || null,
      source: cut(ss('tk_src') || '', 40), city: cut(g.city, 80), country_code: cut(g.cc, 4)
    };
    try {
      fetch(SB_URL + '/rest/v1/chat_logs', {
        method: 'POST', keepalive: true,
        headers: { apikey: SB_KEY, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify(row)
      }).catch(function () {});
    } catch (e) {}
  }

  /* ---------------- الواجهة ---------------- */
  var btn = document.createElement('button');
  btn.className = 'tkc-btn'; btn.type = 'button'; btn.setAttribute('aria-label', 'افتح مساعد تنوركو');
  btn.innerHTML = '<span class="dot">🤖</span><span class="t">اسأل مساعد تنوركو</span>';
  var box = document.createElement('div');
  box.className = 'tkc hide'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'مساعد تنوركو');
  box.innerHTML = '<div class="tkc-h"><div class="tkc-av">🤖</div><div><b>مساعد تنوركو</b><small>يجاوبك عن المنيو والأسعار ويقترح عليك</small></div><button class="x" type="button" aria-label="إغلاق">✕</button></div>' +
    '<div class="tkc-m" id="tkcM" aria-live="polite"></div>' +
    '<div class="tkc-q" id="tkcQ"></div>' +
    '<form class="tkc-f" id="tkcF"><input id="tkcI" autocomplete="off" maxlength="500" placeholder="اكتب سؤالك… مثلاً: كم سعر اللحم المخمود؟" aria-label="رسالتك"><button id="tkcS">إرسال</button></form>';
  document.body.appendChild(btn); document.body.appendChild(box);
  var M = box.querySelector('#tkcM'), I = box.querySelector('#tkcI'), S = box.querySelector('#tkcS'), Q = box.querySelector('#tkcQ');
  var QUICK = ['شو تنصحني؟', 'أبغى أشوف الصواني والعروض', 'عندكم سلطات؟', 'وش عندكم حلويات؟', 'أبغى ذبيحة', 'أكلم موظف'];
  Q.innerHTML = QUICK.map(function (q) { return '<button type="button">' + esc(q) + '</button>'; }).join('');

  var history = [], busy = false, opened = false;
  function scroll() { M.scrollTop = M.scrollHeight; }
  function bubble(text, who) {
    var d = document.createElement('div'); d.className = 'tkc-b ' + who; d.textContent = text; M.appendChild(d); scroll(); return d;
  }
  function waLink(q) {
    var m = 'السلام عليكم، عندي استفسار من منيو تنوركو' + (q ? ':\n' + q : '');
    return 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(m);
  }
  function contact(q) {
    var d = document.createElement('div'); d.className = 'tkc-c';
    d.innerHTML = '<span>تقدر تتواصل مع المطعم مباشرة وبيخدمونك 🙏</span>' +
      '<a class="wa" href="' + esc(waLink(q)) + '" target="_blank" rel="noopener">💬 كلمنا واتساب</a>' +
      '<a class="cl" href="tel:' + esc(CALL) + '">☎️ اتصل ' + esc(CALL) + '</a>';
    M.appendChild(d); scroll();
  }
  function dishCards(ids) {
    var list = [];
    ids.forEach(function (id) { var x = ITEMS[+id]; if (x && list.indexOf(x) < 0) list.push(x); });
    if (!list.length) return [];
    var w = document.createElement('div'); w.className = 'tkc-dish';
    w.innerHTML = list.map(function (x) {
      var it = x.it, im = imgOf(it.img), prices;
      if (it.sizes && it.sizes.length) {
        prices = it.sizes.map(function (z) { return esc(z[0]) + ' <b>' + esc(z[1]) + '</b>'; }).join(' · ') + ' <small>درهم</small>';
      } else if (it.txt) prices = esc(it.txt);
      else prices = esc(it.p) + ' <small>درهم</small>' + (it.old ? ' <small><s>' + esc(it.old) + '</s></small>' : '');
      var add = window.tkAddToCart
        ? (it.sizes && it.sizes.length
          ? it.sizes.map(function (z, i) { return '<button type="button" data-id="' + x.id + '" data-i="' + i + '">+ ' + esc(z[0]) + '</button>'; }).join('')
          : '<button type="button" data-id="' + x.id + '" data-i="0">🛒 أضف للسلة</button>')
        : '<a href="' + esc(waLink('أبغى أطلب: ' + it.n)) + '" target="_blank" rel="noopener">اطلب واتساب</a>';
      return '<div class="tkc-d"><div class="im"' + (im ? ' style="background-image:url(&quot;' + esc(im) + '&quot;)"' : '') + '>' + (im ? '' : '🍽️') + '</div>' +
        '<div class="bd"><h4>' + esc(it.n) + '</h4><span class="sc">' + esc(x.sec) + '</span><span class="pr">' + prices + '</span>' +
        (it.d ? '<span class="sc">' + esc(it.d) + '</span>' : '') + '<div class="ad">' + add + '</div></div></div>';
    }).join('');
    M.appendChild(w); scroll();
    return list.map(function (x) { return x.n; });
  }
  M.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-id]'); if (!b) return;
    var x = ITEMS[+b.getAttribute('data-id')]; if (!x || !window.tkAddToCart) return;
    window.tkAddToCart(x.it, +b.getAttribute('data-i') || 0, b);
    b.classList.add('ok'); var t = b.textContent; b.textContent = '✓ تمت الإضافة';
    setTimeout(function () { b.classList.remove('ok'); b.textContent = t; }, 1300);
    log('event', 'أضاف للسلة: ' + x.n, { dishes: [x.n] });
  });
  function typing(on) {
    var t = M.querySelector('.tkc-typ');
    if (on && !t) { t = document.createElement('div'); t.className = 'tkc-typ'; t.innerHTML = '<i></i><i></i><i></i>'; M.appendChild(t); scroll(); }
    if (!on && t) t.remove();
  }
  function open() {
    box.classList.remove('hide'); btn.style.display = 'none';
    if (!opened) {
      opened = true;
      bubble('هلا والله 👋 أنا مساعد مطعم تنوركو.\nاسألني عن أي طبق وأعطيك صورته وسعره، أو قول لي كم شخص وأقترح عليك طلب كامل مع سلطات ومشروبات.', 'bot');
      try { window.tkTrack && window.tkTrack('chat'); } catch (e) {}
    }
    setTimeout(function () { I.focus(); }, 50);
  }
  function close() { box.classList.add('hide'); btn.style.display = ''; }
  btn.onclick = open;
  box.querySelector('.x').onclick = close;
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !box.classList.contains('hide')) close(); });
  Q.addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) send(b.textContent); });
  box.querySelector('#tkcF').addEventListener('submit', function (e) { e.preventDefault(); send(I.value); });

  /* ---------------- الرد المحلي (بدون ذكاء اصطناعي) ---------------- */
  var STOP = ' كم سعر بكم ابغي ابغا ابي ابا عندكم عندك في فيه هل شو وش ايش اريد اطلب طلب ممكن لو سمحت من على مع حق الله '.split(' ');
  function findItems(q) {
    var nq = norm(q), words = nq.split(' ').filter(function (w) { return w.length > 1 && STOP.indexOf(w) < 0; });
    if (!words.length) return [];
    var scored = ITEMS.map(function (x) {
      var s = 0;
      if (x.nn && nq.indexOf(x.nn) >= 0) s += 10;
      words.forEach(function (w) {
        var w2 = w.replace(/^ال/, '');
        if (w2.length < 2) return;
        if (x.nn.indexOf(w2) >= 0) s += 2;
        else if (norm(x.sec).indexOf(w2) >= 0) s += 1;
      });
      return { x: x, s: s };
    }).filter(function (o) { return o.s > 1; }).sort(function (a, b) { return b.s - a.s; });
    return scored.slice(0, 6).map(function (o) { return o.x.id; });
  }
  function bySec(re, n) {
    return ITEMS.filter(function (x) { return re.test(x.sec); }).slice(0, n).map(function (x) { return x.id; });
  }
  function localReply(q) {
    var nq = norm(q);
    if (/موظف|انسان|احد يرد|اتصل|رقم|واتساب|توصيل|دوام|يفتح|تفتح|مفتوح|موقع|لوكيشن|وين/.test(nq)) {
      return { reply: 'هذا السؤال يجاوبك عليه فريق المطعم أفضل مني 🙏', dishes: [], handoff: true };
    }
    var ids = findItems(q);
    if (/سلط/.test(nq) && !ids.length) ids = bySec(/سلط|مقبلات/, 6);
    if (/حلو|حلى/.test(nq) && !ids.length) ids = bySec(/حلو/, 6);
    if (/عرض|عروض|صيني/.test(nq) && !ids.length) ids = bySec(/عروض/, 6);
    if (/مشروب|عصير|عصاير/.test(nq) && !ids.length) ids = bySec(/عصائر|مشروب/, 6);
    if (/ذبيح|خروف|تيس/.test(nq) && !ids.length) ids = bySec(/ذبائح/, 6);
    if (/تنصح|اقتراح|اقترح|شو الزين|الاكثر|افضل|مميز/.test(nq) && !ids.length) {
      ids = bySec(/رئيسي/, 2).concat(bySec(/سلط|مقبلات/, 1), bySec(/عصائر/, 1), bySec(/حلو/, 1));
      return { reply: 'أنصحك بهذي التشكيلة 😋 طبق رئيسي، ومعه سلطة وعصير، وتختمها بحلى:', dishes: ids, handoff: false };
    }
    if (ids.length) {
      var x = ITEMS[ids[0]];
      var extra = bySec(/سلط|مقبلات/, 1).concat(bySec(/عصائر|مشروب/, 1)).filter(function (i) { return ids.indexOf(i) < 0; });
      var main = /رئيسي|عروض|ذبائح/.test(x.sec);
      return { reply: 'هذا اللي لقيته لك في المنيو 👇' + (main ? '\nويمشي معه حلو سلطة ومشروب:' : ''), dishes: main ? ids.slice(0, 3).concat(extra) : ids, handoff: false };
    }
    return { reply: 'ما لقيت جواب أكيد لسؤالك، بس فريق المطعم يقدر يساعدك فوراً 🙏', dishes: [], handoff: true };
  }

  /* ---------------- الإرسال ---------------- */
  function ask(q) {
    var ctl = window.AbortController ? new AbortController() : null;
    var t = setTimeout(function () { if (ctl) ctl.abort(); }, 45000);
    return fetch(FN_URL, {
      method: 'POST', signal: ctl ? ctl.signal : undefined,
      headers: { apikey: SB_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history.slice(-12), menu: menuText(), page: PAGE })
    }).then(function (r) {
      clearTimeout(t);
      if (!r.ok) throw new Error('http ' + r.status);
      return r.json();
    }).then(function (d) {
      if (!d || typeof d.reply !== 'string') throw new Error('bad');
      d.mode = 'ai'; return d;
    });
  }
  function send(text) {
    text = String(text || '').trim();
    if (!text || busy) return;
    I.value = ''; busy = true; S.disabled = true;
    bubble(text, 'me');
    history.push({ role: 'user', content: cut(text, 500) });
    log('user', text);
    typing(true);
    var p = ITEMS.length ? ask(text) : Promise.reject(new Error('no menu'));
    p.catch(function () { var r = localReply(text); r.mode = 'local'; return r; }).then(function (r) {
      typing(false);
      var reply = String(r.reply || '').trim() || 'تفضل 👇';
      bubble(reply, 'bot');
      var names = dishCards((r.dishes || []).slice(0, 8));
      if (r.handoff) contact(text);
      history.push({ role: 'assistant', content: cut(reply + (names.length ? '\n[عرضت: ' + names.join('، ') + ']' : ''), 1200) });
      log('bot', reply, { dishes: names, handoff: !!r.handoff, mode: r.mode });
      busy = false; S.disabled = false; I.focus();
    });
  }

  try { if (new URLSearchParams(location.search).get('chat') === '1') setTimeout(open, 400); } catch (e) {}
})();
