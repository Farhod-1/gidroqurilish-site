(function () {
  'use strict';

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var root = document.documentElement;
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function store(key, value) {
    try {
      if (value === undefined) return localStorage.getItem(key);
      localStorage.setItem(key, value);
    } catch (e) { /* xotira yopiq bo‘lsa — sozlama shu sahifada qoladi */ }
    return null;
  }

  /* ---------- Tillar ---------- */
  var dict = window.SITE_I18N || {};
  var ATTRS = [
    ['data-i18n', function (el, v) { el.textContent = v; }, function (el) { return el.textContent; }],
    ['data-i18n-alt', function (el, v) { el.alt = v; }, function (el) { return el.alt; }],
    ['data-i18n-aria', function (el, v) { el.setAttribute('aria-label', v); }, function (el) { return el.getAttribute('aria-label'); }],
    ['data-i18n-caption', function (el, v) { el.dataset.caption = v; }, function (el) { return el.dataset.caption; }],
    ['data-i18n-name', function (el, v) { el.dataset.name = v; }, function (el) { return el.dataset.name; }]
  ];
  var metaDesc = $('meta[name="description"]');

  // O‘zbekcha asos matn sahifaning o‘zidan olinadi
  var uz = { 'doc.title': document.title, 'doc.desc': metaDesc ? metaDesc.content : '' };
  ATTRS.forEach(function (a) {
    $$('[' + a[0] + ']').forEach(function (el) {
      var key = el.getAttribute(a[0]);
      if (!(key in uz)) uz[key] = a[2](el);
    });
  });
  // sahifada elementi yo‘q, faqat skript ishlatadigan so‘zlar
  uz['map.count'] = 'GESlar soni';
  uz['map.share'] = 'Tizim quvvatidagi uluşi';
  uz['map.branches'] = 'Filiallar';
  uz['map.region'] = 'Hudud';
  uz['map.none'] = 'Faoliyatdagi filial yöq';
  dict.uz = uz;

  var word = function (key) {
    var table = dict[root.lang] || uz;
    return key in table ? table[key] : (uz[key] || '');
  };

  var langButtons = $$('.langs button');
  function setLang(lang) {
    if (!dict[lang]) lang = 'uz';
    var table = dict[lang];
    ATTRS.forEach(function (a) {
      $$('[' + a[0] + ']').forEach(function (el) {
        var key = el.getAttribute(a[0]);
        var value = key in table ? table[key] : uz[key];
        if (value !== undefined) a[1](el, value);
      });
    });
    document.title = table['doc.title'] || uz['doc.title'];
    if (metaDesc) metaDesc.content = table['doc.desc'] || uz['doc.desc'];
    root.lang = lang;
    langButtons.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.lang === lang)); });
    store('site-lang', lang);
    document.dispatchEvent(new CustomEvent('site:lang'));
  }
  langButtons.forEach(function (b) {
    b.addEventListener('click', function () { setLang(b.dataset.lang); });
  });
  var savedLang = store('site-lang');
  if (savedLang && savedLang !== 'uz') setLang(savedLang);

  /* ---------- Maxsus imkoniyatlar ---------- */
  var FONT_STEPS = [87.5, 100, 112.5, 125];
  var fontIndex = 1;
  function setFont(index) {
    fontIndex = Math.max(0, Math.min(FONT_STEPS.length - 1, index));
    root.style.fontSize = FONT_STEPS[fontIndex] + '%';
    store('site-font', String(fontIndex));
  }
  $$('.a11y [data-font]').forEach(function (b) {
    b.addEventListener('click', function () {
      var step = parseInt(b.dataset.font, 10);
      setFont(step === 0 ? 1 : fontIndex + step);
    });
  });
  var savedFont = parseInt(store('site-font'), 10);
  if (!isNaN(savedFont)) setFont(savedFont);

  var mono = $('#mono');
  function setMono(on) {
    root.classList.toggle('mono', on);
    mono.setAttribute('aria-pressed', String(on));
    store('site-mono', on ? '1' : '0');
  }
  mono.addEventListener('click', function () { setMono(!root.classList.contains('mono')); });
  if (store('site-mono') === '1') setMono(true);

  /* ---------- Menyu ---------- */
  var menu = $('#menu');
  var toggle = $('#menu-toggle');
  var links = $$('a[href^="#"]', menu);
  var toTop = $('#to-top');

  function setMenu(open) {
    menu.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
  }
  toggle.addEventListener('click', function () { setMenu(!menu.classList.contains('is-open')); });
  menu.addEventListener('click', function (e) { if (e.target.tagName === 'A') setMenu(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });

  var targets = links
    .map(function (a) { return { link: a, el: $(a.getAttribute('href')) }; })
    .filter(function (t) { return t.el; });

  function onScroll() {
    var y = window.scrollY;
    toTop.classList.toggle('is-visible', y > 600);

    // Ko‘rinib turgan bo‘limga mos menyu bandi belgilanadi
    var line = y + 120;
    var current = null;
    targets.forEach(function (t) {
      if (t.el.getBoundingClientRect().top + y <= line) current = t;
    });
    if (window.innerHeight + y >= root.scrollHeight - 4) current = targets[targets.length - 1];
    links.forEach(function (a) { a.classList.toggle('is-active', !!current && a === current.link); });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  toTop.addEventListener('click', function () { window.scrollTo({ top: 0 }); });

  /* ---------- Karusel ---------- */
  var hero = $('.hero');
  if (hero) {
    var slides = $$('.hslide', hero);
    var dotsWrap = $('.hero__dots', hero);
    var current = 0;
    var timer = null;
    var INTERVAL = 6500;

    var dots = slides.map(function (_, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', String(i + 1));
      b.addEventListener('click', function () { go(i, true); });
      dotsWrap.appendChild(b);
      return b;
    });

    var go = function (i, byUser) {
      current = (i + slides.length) % slides.length;
      slides.forEach(function (s, n) {
        s.classList.toggle('is-active', n === current);
        s.setAttribute('aria-hidden', String(n !== current));
      });
      dots.forEach(function (d, n) { d.setAttribute('aria-selected', String(n === current)); });
      if (byUser) play();
    };
    var stop = function () { clearInterval(timer); timer = null; };
    var play = function () {
      stop();
      if (reducedMotion || slides.length < 2) return;
      timer = setInterval(function () { go(current + 1); }, INTERVAL);
    };

    $('.hero__arrow--prev', hero).addEventListener('click', function () { go(current - 1, true); });
    $('.hero__arrow--next', hero).addEventListener('click', function () { go(current + 1, true); });
    hero.addEventListener('mouseenter', stop);
    hero.addEventListener('mouseleave', play);
    hero.addEventListener('focusin', stop);
    hero.addEventListener('focusout', play);
    document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else play(); });

    var touchX = null;
    hero.addEventListener('touchstart', function (e) { touchX = e.touches[0].clientX; }, { passive: true });
    hero.addEventListener('touchend', function (e) {
      if (touchX === null) return;
      var dx = e.changedTouches[0].clientX - touchX;
      if (Math.abs(dx) > 50) go(current + (dx < 0 ? 1 : -1), true);
      touchX = null;
    });

    go(0);
    play();
  }

  /* ---------- GESlar xaritasi ---------- */
  var hpp = $('#hpp');
  if (hpp) {
    var NS = 'http://www.w3.org/2000/svg';
    var svg = $('svg', hpp);
    var vb = svg.viewBox.baseVal;
    var mapBox = $('.hppmap', hpp);
    var pinLayer = $('.hppmap__pins', hpp);
    var card = $('#mapcard');
    var cardKicker = $('.mapcard__kicker', card);
    var cardName = $('.mapcard__name', card);
    var cardRows = $$('dl div', card).map(function (div) { return { dt: $('dt', div), dd: $('dd', div) }; });
    var rows = $$('.plant', hpp);
    var regions = $$('.region', hpp);
    var regionById = {};
    var pins = {};
    var state = null; // { type: 'plant' | 'region', el }
    var hideTimer = null;
    var totalMw = rows.reduce(function (sum, li) { return sum + parseFloat(li.dataset.mw); }, 0);

    var regionsOf = function (li) { return li.dataset.region.split(' '); };
    var rowsOf = function (id) { return rows.filter(function (li) { return regionsOf(li).indexOf(id) !== -1; }); };

    // '1066.79' → '1 066,79' (uz, ru) yoki '1,066.79' (en)
    var formatNumber = function (str) {
      var en = root.lang === 'en';
      var parts = String(str).split('.');
      var whole = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, en ? ',' : ' ');
      return parts[1] ? whole + (en ? '.' : ',') + parts[1] : whole;
    };
    var count = function (n) { return (n + ' ' + word('u.pcs')).trim(); };
    var setRow = function (i, label, value) {
      cardRows[i].dt.textContent = label;
      cardRows[i].dd.textContent = value;
      cardRows[i].dt.parentNode.hidden = label === '';
    };

    regions.forEach(function (path) {
      regionById[path.dataset.region] = path;
      path.classList.toggle('has-plants', rowsOf(path.dataset.region).length > 0);
    });

    function fillPlant(li) {
      var percent = parseFloat(li.dataset.mw) / totalMw * 100;
      var share = percent < 0.1 ? '0.1' : percent.toFixed(1);
      cardKicker.textContent = regionsOf(li).length === 1 ? regionById[li.dataset.region].dataset.name : '';
      cardName.textContent = $('.plant__name', li).textContent;
      setRow(0, word('map.count'), count(li.dataset.count));
      setRow(1, word('map.cap'), formatNumber(li.dataset.mw) + ' ' + word('u.mw'));
      setRow(2, word('map.share'), (percent < 0.1 ? '< ' : '') + formatNumber(share) + '%');
    }

    function fillRegion(path) {
      // bir nechta hududga tegishli filial (kinetik mikroGESlar) hudud yig‘indisiga qo‘shilmaydi
      var own = rowsOf(path.dataset.region).filter(function (li) { return regionsOf(li).length === 1; });
      var plants = own.reduce(function (n, li) { return n + parseInt(li.dataset.count, 10); }, 0);
      var mw = own.reduce(function (n, li) { return n + parseFloat(li.dataset.mw); }, 0);
      cardKicker.textContent = word('map.region');
      cardName.textContent = path.dataset.name;
      if (!own.length) {
        setRow(0, word('map.none'), '');
        setRow(1, '', '');
        setRow(2, '', '');
        return;
      }
      setRow(0, word('map.branches'), String(own.length));
      setRow(1, word('map.count'), count(plants));
      setRow(2, word('map.cap'), formatNumber(mw.toFixed(2)) + ' ' + word('u.mw'));
    }

    // Kartochka nuqta ustida turadi; joy yetmasa — ostida
    function placeCard(x, y, glide) {
      var w = mapBox.clientWidth;
      var h = mapBox.clientHeight;
      var cw = card.offsetWidth;
      var ch = card.offsetHeight;
      var left;
      var top;
      if (x === null) {
        left = 16;
        top = h - ch - 16;
      } else {
        var box = svg.getBoundingClientRect();
        var host = mapBox.getBoundingClientRect();
        var px = box.left - host.left + (x - vb.x) / vb.width * box.width;
        var py = box.top - host.top + (y - vb.y) / vb.height * box.height;
        left = px - cw / 2;
        top = py - ch - 18;
        if (top < 8) top = py + 18;
      }
      left = Math.max(8, Math.min(w - cw - 8, left));
      card.classList.toggle('no-glide', !glide);
      card.style.setProperty('--x', Math.round(left) + 'px');
      card.style.setProperty('--y', Math.round(top) + 'px');
      void card.offsetWidth;
      card.classList.add('is-visible');
      if (!glide) requestAnimationFrame(function () { card.classList.remove('no-glide'); });
    }

    function clearMarks() {
      $$('.is-active, .is-near', hpp).forEach(function (el) { el.classList.remove('is-active', 'is-near'); });
    }

    function show(type, el) {
      clearTimeout(hideTimer);
      if (state && state.el === el) return;
      var glide = !!state;
      state = { type: type, el: el };
      clearMarks();
      hpp.classList.add('has-active');

      if (type === 'plant') {
        el.classList.add('is-active');
        if (pins[el.dataset.id]) pins[el.dataset.id].classList.add('is-active');
        regionsOf(el).forEach(function (id) { regionById[id].classList.add('is-active'); });
        fillPlant(el);
        placeCard(el.dataset.x ? parseFloat(el.dataset.x) : null, el.dataset.x ? parseFloat(el.dataset.y) : null, glide);
      } else {
        el.classList.add('is-active');
        rowsOf(el.dataset.region).forEach(function (li) {
          li.classList.add('is-near');
          if (pins[li.dataset.id]) pins[li.dataset.id].classList.add('is-near');
        });
        fillRegion(el);
        placeCard(parseFloat(el.dataset.cx), parseFloat(el.dataset.cy), glide);
      }
    }

    function hide() {
      clearTimeout(hideTimer);
      hideTimer = setTimeout(function () {
        if (!state) return;
        state = null;
        clearMarks();
        hpp.classList.remove('has-active');
        card.classList.remove('is-visible');
      }, 180);
    }

    regions.forEach(function (path) {
      path.addEventListener('mouseenter', function () { show('region', path); });
      path.addEventListener('click', function (e) { e.stopPropagation(); show('region', path); });
    });

    rows.forEach(function (li) {
      if (li.dataset.x) {
        var g = document.createElementNS(NS, 'g');
        g.setAttribute('class', 'pin');
        g.setAttribute('transform', 'translate(' + li.dataset.x + ' ' + li.dataset.y + ')');
        [['pin__hit', 10], ['pin__halo', 11], ['pin__dot', 4.5]].forEach(function (c) {
          var circle = document.createElementNS(NS, 'circle');
          circle.setAttribute('class', c[0]);
          circle.setAttribute('r', c[1]);
          g.appendChild(circle);
        });
        g.addEventListener('mouseenter', function () { show('plant', li); });
        g.addEventListener('click', function (e) { e.stopPropagation(); show('plant', li); });
        pinLayer.appendChild(g);
        pins[li.dataset.id] = g;
      }
      li.addEventListener('mouseenter', function () { show('plant', li); });
      li.addEventListener('focus', function () { show('plant', li); });
      li.addEventListener('click', function (e) { e.stopPropagation(); show('plant', li); });
      li.addEventListener('blur', hide);
    });
    hpp.addEventListener('mouseleave', hide);
    document.addEventListener('click', hide);

    var refresh = function () {
      rows.forEach(function (li) { $('.plant__mw b', li).textContent = formatNumber(li.dataset.mw); });
      if (!state) return;
      var keep = state;
      state = null;
      show(keep.type, keep.el);
    };
    document.addEventListener('site:lang', refresh);
    window.addEventListener('resize', refresh);
    refresh();
  }

  /* ---------- Fotosurat oynasi ---------- */
  var lightbox = $('#lightbox');
  var lbImg = $('img', lightbox);
  var lbCap = $('figcaption', lightbox);
  var items = $$('.photos__item');
  var lbIndex = 0;
  var lastFocus = null;

  function showPhoto(i) {
    lbIndex = (i + items.length) % items.length;
    var img = $('img', items[lbIndex]);
    lbImg.src = img.src;
    lbImg.alt = img.alt;
    lbCap.textContent = items[lbIndex].dataset.caption || img.alt;
  }
  function openLightbox(i) {
    lastFocus = document.activeElement;
    showPhoto(i);
    lightbox.hidden = false;
    document.body.style.overflow = 'hidden';
    $('.lightbox__close', lightbox).focus();
  }
  function closeLightbox() {
    lightbox.hidden = true;
    document.body.style.overflow = '';
    if (lastFocus) lastFocus.focus();
  }
  items.forEach(function (item, i) {
    item.addEventListener('click', function () { openLightbox(i); });
  });
  $('.lightbox__close', lightbox).addEventListener('click', closeLightbox);
  $('.lightbox__nav--prev', lightbox).addEventListener('click', function () { showPhoto(lbIndex - 1); });
  $('.lightbox__nav--next', lightbox).addEventListener('click', function () { showPhoto(lbIndex + 1); });
  lightbox.addEventListener('click', function (e) { if (e.target === lightbox) closeLightbox(); });
  document.addEventListener('keydown', function (e) {
    if (lightbox.hidden) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') showPhoto(lbIndex - 1);
    if (e.key === 'ArrowRight') showPhoto(lbIndex + 1);
  });

  /* ---------- Yil ---------- */
  var year = $('#year');
  if (year) year.textContent = String(new Date().getFullYear());
})();
