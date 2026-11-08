/* عدّاد زوار تنوركو: يسجل كل زيارة (الصفحة، المدينة والدولة التقريبية من الإنترنت، نوع الجهاز، ومن وين جا الزائر)
   في جدول site_visits على Supabase. ما يطلب أي إذن من الزائر وما يحفظ عنوان IP.
   لإيقاف حساب زياراتك على جهازك: افتح أي صفحة وأضف ?notrack=1 للرابط، أو من صفحة «زوار الموقع». */
(function () {
  'use strict';
  var SB_URL = 'https://iekotptltmkjmieauhqc.supabase.co';
  var SB_KEY = 'sb_publishable_35u5V1apSr2-DCpjp8ltmg_gIJzhXEN';
  var GEO_KEY = 'tk_geo_v1';

  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  function ss(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch (e) { return null; } }
  function rid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 10); }
  function cut(s, n) { s = s == null ? '' : String(s); return s.length > n ? s.slice(0, n) : s; }

  try {
    var q = new URLSearchParams(location.search);
    if (q.get('notrack') === '1') ls('tk_notrack', '1');
    if (q.get('notrack') === '0') { try { localStorage.removeItem('tk_notrack'); } catch (e) {} }
  } catch (e) {}
  if (ls('tk_notrack') === '1') return;
  var ua = navigator.userAgent || '';
  if (navigator.webdriver || /bot|crawl|spider|slurp|preview|headless|lighthouse|facebookexternalhit|whatsapp\/|telegrambot/i.test(ua)) return;

  var visitor = ls('tk_vid'); if (!visitor) { visitor = rid(); ls('tk_vid', visitor); }
  var session = ss('tk_sid'); if (!session) { session = rid(); ss('tk_sid', session); }

  function device() {
    if (/iPad|Tablet/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) return 'tablet';
    if (/Mobi|iPhone|Android/i.test(ua)) return 'mobile';
    return 'desktop';
  }
  function os() {
    if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'iOS';
    if (/Android/.test(ua)) return 'Android';
    if (/Windows/.test(ua)) return 'Windows';
    if (/Mac OS X/.test(ua)) return 'Mac';
    if (/Linux/.test(ua)) return 'Linux';
    return 'أخرى';
  }
  function browser() {
    if (/Instagram/i.test(ua)) return 'Instagram';
    if (/Snapchat/i.test(ua)) return 'Snapchat';
    if (/TikTok|musical_ly|BytedanceWebview/i.test(ua)) return 'TikTok';
    if (/FBAN|FBAV/i.test(ua)) return 'Facebook';
    if (/Edg\//.test(ua)) return 'Edge';
    if (/SamsungBrowser/.test(ua)) return 'Samsung';
    if (/CriOS|Chrome\//.test(ua)) return 'Chrome';
    if (/FxiOS|Firefox\//.test(ua)) return 'Firefox';
    if (/Safari\//.test(ua)) return 'Safari';
    return 'أخرى';
  }
  function source() {
    var q; try { q = new URLSearchParams(location.search); } catch (e) { q = null; }
    var s = q && (q.get('source') || q.get('utm_source') || q.get('src'));
    if (s) return cut(s.toLowerCase(), 40);
    if (window.matchMedia && matchMedia('(display-mode: standalone)').matches) return 'app';
    var b = browser();
    if (b === 'Instagram' || b === 'Snapchat' || b === 'TikTok' || b === 'Facebook') return b.toLowerCase();
    var r = document.referrer;
    if (!r) return 'direct';
    try {
      var h = new URL(r).hostname.replace(/^www\./, '');
      if (h === location.hostname) return 'internal';
      if (/google\./.test(h)) return 'google';
      if (/instagram/.test(h)) return 'instagram';
      if (/snapchat/.test(h)) return 'snapchat';
      if (/tiktok/.test(h)) return 'tiktok';
      if (/facebook|fb\.me/.test(h)) return 'facebook';
      if (/wa\.me|whatsapp/.test(h)) return 'whatsapp';
      if (/linktr\.ee/.test(h)) return 'linktree';
      return cut(h, 60);
    } catch (e) { return 'other'; }
  }

  /* الموقع التقريبي من عنوان الإنترنت (بدون إذن وبدون حفظ IP)، ويُحفظ لمدة 6 ساعات عشان ما نكرر الطلب */
  function geo() {
    try { var c = JSON.parse(ls(GEO_KEY) || 'null'); if (c && Date.now() - c.at < 6 * 3600e3) return Promise.resolve(c.g); } catch (e) {}
    function get(url, map) {
      var ctl = window.AbortController ? new AbortController() : null;
      var t = setTimeout(function () { if (ctl) ctl.abort(); }, 4000);
      return fetch(url, { signal: ctl ? ctl.signal : undefined, cache: 'no-store' })
        .then(function (r) { clearTimeout(t); if (!r.ok) throw 0; return r.json(); }).then(map);
    }
    return get('https://get.geojs.io/v1/ip/geo.json', function (d) {
      if (!d || !d.country_code) throw 0;
      return { country: d.country, cc: d.country_code, region: d.region, city: d.city, lat: +d.latitude, lon: +d.longitude };
    }).catch(function () {
      return get('https://ipwho.is/?fields=success,country,country_code,region,city,latitude,longitude', function (d) {
        if (!d || d.success === false) throw 0;
        return { country: d.country, cc: d.country_code, region: d.region, city: d.city, lat: +d.latitude, lon: +d.longitude };
      });
    }).then(function (g) { ls(GEO_KEY, JSON.stringify({ at: Date.now(), g: g })); return g; })
      .catch(function () { return null; });
  }

  var PAGE = location.pathname.split('/').pop() || 'index.html';
  /* مصدر الزائر يُحفظ لكل الجلسة، عشان نعرف مثلًا إن اللي ضغط واتساب جا من إنستغرام */
  var SRC = ss('tk_src');
  if (!SRC || SRC === 'internal') {
    SRC = source();
    /* الصفحات اللي تنفتح في تبويب جديد (مثل المنيو من الموقع الرئيسي) تاخذ مصدر الزائر الأصلي */
    if (SRC === 'internal') { try { var l = JSON.parse(ls('tk_lsrc') || 'null'); if (l && Date.now() - l.at < 3600e3) SRC = l.s; } catch (e) {} }
    ss('tk_src', SRC);
  }
  if (SRC !== 'internal') ls('tk_lsrc', JSON.stringify({ s: SRC, at: Date.now() }));

  function row(g, page, ref) {
    g = g || {};
    var tz = ''; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) {}
    return {
        visitor: visitor, session: session,
        page: cut(page, 120), source: SRC,
        ref: cut(ref, 250),
        country: cut(g.country, 80), country_code: cut(g.cc, 4), region: cut(g.region, 80), city: cut(g.city, 80),
        lat: isFinite(g.lat) ? Math.round(g.lat * 100) / 100 : null,
        lon: isFinite(g.lon) ? Math.round(g.lon * 100) / 100 : null,
        tz: cut(tz, 60), lang: cut(navigator.language, 20),
        device: device(), os: os(), browser: browser(),
        screen: (screen.width || 0) + 'x' + (screen.height || 0)
    };
  }
  function post(r) {
    try {
      return fetch(SB_URL + '/rest/v1/site_visits', {
        method: 'POST', keepalive: true,
        headers: { apikey: SB_KEY, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify(r)
      }).catch(function () {});
    } catch (e) {}
  }
  function send() {
    geo().then(function (g) { post(row(g, PAGE, document.referrer)); });
  }

  /* الضغطات على الأزرار المهمة (واتساب، اتصال، خريطة…) تنحفظ كسطر page = click:<اسم> */
  var last = {};
  function track(name) {
    name = cut(String(name || '').toLowerCase().replace(/[^a-z0-9_-]/g, ''), 40);
    if (!name || Date.now() - (last[name] || 0) < 1500) return;
    last[name] = Date.now();
    var g = null; try { var c = JSON.parse(ls(GEO_KEY) || 'null'); if (c) g = c.g; } catch (e) {}
    post(row(g, 'click:' + name, 'from:' + PAGE));
  }
  window.tkTrack = track;
  function kind(a) {
    var k = a.getAttribute('data-k');
    if (k === 'vcard') return 'vcard';
    var h = a.getAttribute('href') || '';
    if (/^tel:/i.test(h)) return 'call';
    if (/wa\.me|whatsapp\.com/i.test(h)) return 'whatsapp';
    if (/writereview/i.test(h)) return 'greview';
    if (/google\.[a-z.]+\/maps|maps\.google|maps\.app\.goo|goo\.gl\/maps/i.test(h)) return 'map';
    if (a.classList.contains('hamad-ad-btn')) return 'promo';
    if (/instagram\.com/i.test(h)) return 'instagram';
    if (/snapchat\.com/i.test(h)) return 'snapchat';
    if (/tiktok\.com/i.test(h)) return 'tiktok';
    if (/linktr\.ee/i.test(h)) return 'linktree';
    return null;
  }
  document.addEventListener('click', function (e) {
    var el = e.target && e.target.closest ? e.target.closest('a,button.celeb') : null;
    if (!el) return;
    if (el.tagName === 'BUTTON') return track('celeb');
    var k = kind(el); if (k) track(k);
  }, true);

  if (document.readyState === 'complete') setTimeout(send, 300);
  else window.addEventListener('load', function () { setTimeout(send, 300); });
})();
