/* SphereWars: the interactive parts of the original site (menu, carousels, cart, product gallery, contact, image viewer), in plain JavaScript. */
(function () {
  "use strict";
  var D = {};
  try { D = JSON.parse(document.getElementById("sw-data").textContent || "{}"); } catch (e) { /* ignore */ }
  var L = D.locale || "es", T = D.t || {}, A = T.a11y || {}, S = T.shop || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var el = function (html) { var t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstChild; };
  var P = { // lucide icon paths
    menu: '<line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    bag: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>',
    left: '<path d="m15 18-6-6 6-6"/>', right: '<path d="m9 18 6-6-6-6"/>',
    trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>',
    minus: '<path d="M5 12h14"/>', plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    zoom: '<circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/><line x1="11" x2="11" y1="8" y2="14"/><line x1="8" x2="14" y1="11" y2="11"/>'
  };
  var svg = function (n, size) { return '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + P[n] + "</svg>"; };
  var asset = function (p) { return p && p.charAt(0) === "/" && p.charAt(1) !== "/" ? (D.assets || "") + p : p; };
  var rest = location.pathname.replace(/^\/(es|en|ca)(?=\/|$)/, "");

  /* ---------- scroll reveal ---------- */
  (function () {
    var els = $$("[data-reveal]");
    if (!els.length) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) { els.forEach(function (e) { e.classList.add("is-in"); }); return; }
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } }); }, { rootMargin: "0px 0px -6% 0px", threshold: 0.01 });
    els.forEach(function (e) { if (e.getBoundingClientRect().top < innerHeight) e.classList.add("is-in"); else io.observe(e); });
    document.documentElement.classList.add("js-reveal");
    setTimeout(function () { els.forEach(function (e) { e.classList.add("is-in"); }); }, 4000);
    addEventListener("beforeprint", function () { els.forEach(function (e) { e.classList.add("is-in"); }); });
  })();

  /* ---------- cart (localStorage, same format as the original) ---------- */
  var KEY = "sw_cart_v1", MAXQ = 20, listeners = [];
  var cart = {
    read: function () {
      try { var v = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(v) ? v.filter(function (i) { return i && typeof i.id === "string" && Number.isInteger(i.qty) && i.qty > 0 && typeof i.price_cents === "number"; }) : []; } catch (e) { return []; }
    },
    write: function (items) { try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) { /* private mode */ } listeners.forEach(function (f) { f(); }); },
    clamp: function (q, stock) { return Math.max(1, Math.min(q, MAXQ, stock == null ? MAXQ : stock)); },
    add: function (item, qty) {
      var items = cart.read(), f = items.filter(function (i) { return i.id === item.id; })[0];
      cart.write(f ? items.map(function (i) { return i.id === item.id ? Object.assign({}, i, item, { qty: cart.clamp(i.qty + qty, item.stock) }) : i; }) : items.concat([Object.assign({}, item, { qty: cart.clamp(qty, item.stock) })]));
    },
    change: function (id, d) { cart.write(cart.read().map(function (i) { return i.id === id ? Object.assign({}, i, { qty: cart.clamp(i.qty + d, i.stock) }) : i; })); },
    remove: function (id) { cart.write(cart.read().filter(function (i) { return i.id !== id; })); },
    clear: function () { cart.write([]); },
    count: function () { return cart.read().reduce(function (n, i) { return n + i.qty; }, 0); }
  };
  addEventListener("storage", function (e) { if (e.key === KEY) listeners.forEach(function (f) { f(); }); });

  /* ---------- header: menu + cart icon ---------- */
  (function () {
    var header = $("header"), btn = header && $('button[aria-controls="site-menu"]');
    if (!btn) return;
    var N = T.nav || {}, open = false, panel = null;
    var items = [["home", ""], ["game", "/juego"], ["factions", "/facciones"], ["wiki", "/wikisphere"], ["minis", "/miniaturas"], ["builder", "/genera-tu-banda"], ["events", "/eventos"], ["community", "/comunidad"], ["shop", "/tienda"]];
    var names = { es: "Español", en: "English", ca: "Català" };
    var switcher = function () {
      return '<div role="group" aria-label="' + esc(A.language) + '" class="flex gap-5">' + ["es", "en", "ca"].map(function (l) {
        return '<a href="/' + l + rest + '" hreflang="' + l + '" lang="' + l + '"' + (l === L ? ' aria-current="true"' : "") + ' title="' + names[l] + '" class="' + (l === L ? "text-gold" : "text-stone hover:text-ivory") + '">' + l.toUpperCase() + "</a>";
      }).join("") + "</div>";
    };
    var build = function () {
      return el('<div id="site-menu" class="absolute inset-x-0 top-full max-h-[calc(100vh-4rem)] overflow-y-auto border-b border-gold/30 bg-coal/98 shadow-2xl"><ul class="mx-auto grid max-w-7xl gap-1 px-4 py-6 sm:grid-cols-2 lg:grid-cols-3">' +
        items.map(function (it) {
          var cur = rest === it[1] || (it[1] === "" && rest === "");
          return '<li><a href="/' + L + it[1] + '"' + (cur ? ' aria-current="page"' : "") + ' class="block border-b border-gold/10 py-3 font-display text-xl uppercase tracking-wider hover:text-gold aria-[current=page]:text-gold">' + esc(N[it[0]]) + "</a></li>";
        }).join("") +
        '<li class="sm:col-span-2 lg:col-span-3"><a href="/' + L + '/juega-gratis" class="mt-3 block bg-gold py-3 text-center text-sm font-semibold uppercase tracking-widest text-abyss">' + esc(N.playFree) + "</a></li>" +
        '<li class="pt-4 text-sm sm:col-span-2 lg:col-span-3">' + switcher() + "</li></ul></div>");
    };
    var set = function (v) {
      open = v;
      btn.setAttribute("aria-expanded", String(v));
      btn.setAttribute("aria-label", v ? A.closeMenu : A.openMenu);
      btn.innerHTML = svg(v ? "x" : "menu", 28);
      if (v) { panel = build(); header.appendChild(panel); } else if (panel) { panel.remove(); panel = null; }
    };
    btn.addEventListener("click", function () { set(!open); });
    header.addEventListener("click", function (e) { if (open && e.target.closest && e.target.closest("#site-menu a")) set(false); });
    document.addEventListener("keydown", function (e) { if (open && e.key === "Escape") set(false); });

    var link = null;
    var paintCart = function () {
      var n = cart.count();
      if (link) { link.remove(); link = null; }
      if (!n) return;
      link = el('<a aria-label="' + esc((A.cart || "Cart") + " (" + n + ")") + '" class="relative text-ivory/80 hover:text-gold" href="/' + L + '/tienda/carrito">' + svg("bag", 20) + '<span class="absolute -right-2 -top-2 grid h-4 min-w-4 place-items-center rounded-full bg-gold px-1 text-[10px] font-bold text-abyss">' + n + "</span></a>");
      var search = $('header a[href$="/buscar"]');
      if (search) search.parentNode.insertBefore(link, search);
    };
    listeners.push(paintCart); paintCart();
  })();

  /* ---------- carousels ---------- */
  $$('[role="region"][aria-roledescription="carousel"]').forEach(function (root) {
    var track = $("ul", root), btns = $$(":scope > button", root), prev = btns[0], next = btns[1], dots = $$(":scope > div button", root);
    if (!track) return;
    var gap = function () { return parseFloat(getComputedStyle(track).columnGap || "0") || 0; };
    var step = function () { var f = track.children[0]; return f ? f.offsetWidth + gap() : track.clientWidth; };
    var update = function () {
      var max = track.scrollWidth - track.clientWidth;
      if (prev) prev.disabled = track.scrollLeft <= 4;
      if (next) next.disabled = track.scrollLeft >= max - 4;
      var idx = Math.min(track.children.length - 1, Math.round(track.scrollLeft / Math.max(step(), 1)));
      dots.forEach(function (d, i) { var on = i === idx; if (on) d.setAttribute("aria-current", "true"); else d.removeAttribute("aria-current"); d.className = "h-2 rounded-full transition-all " + (on ? "w-8 bg-gold" : "w-2 bg-gold/35 hover:bg-gold/60"); });
    };
    var go = function (dir) { track.scrollBy({ left: dir * step(), behavior: "smooth" }); };
    if (prev) prev.addEventListener("click", function () { go(-1); });
    if (next) next.addEventListener("click", function () { go(1); });
    dots.forEach(function (d, i) { d.addEventListener("click", function () { var t = track.children[i]; if (t) track.scrollTo({ left: t.offsetLeft - track.offsetLeft, behavior: "smooth" }); }); });
    track.addEventListener("scroll", update, { passive: true });
    track.addEventListener("keydown", function (e) { if (e.key === "ArrowRight") { e.preventDefault(); go(1); } if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); } });
    if ("ResizeObserver" in window) new ResizeObserver(update).observe(track);
    update();
  });

  /* ---------- full-screen image viewer (wiki articles and product gallery) ---------- */
  function viewer(photos, start, labels) {
    var i = start, zoom = false, many = photos.length > 1, root = el('<div role="dialog" aria-modal="true" class="fixed inset-0 z-50 bg-abyss/95"></div>');
    var prevFocus = document.activeElement;
    var paint = function () {
      var p = photos[i];
      root.setAttribute("aria-label", p.alt || labels.enlarged || "");
      root.innerHTML = '<div class="h-full w-full ' + (zoom ? "overflow-auto" : "grid place-items-center overflow-hidden p-3 sm:p-8") + '"><img src="' + esc(p.src) + '" alt="' + esc(p.alt || "") + '" class="transition-[max-height,max-width] duration-300 ' + (zoom ? "max-w-none cursor-zoom-out" : "max-h-[88vh] max-w-full cursor-zoom-in object-contain") + '"' + (zoom ? ' style="width:min(220vw, 2400px)"' : "") + "></div>" +
        '<button type="button" data-a="close" aria-label="' + esc(labels.close) + '" class="fixed right-4 top-4 bg-abyss/80 p-2 text-ivory hover:text-gold">' + svg("x", 28) + "</button>" +
        (labels.zoomToggle ? '<button type="button" data-a="zoom" aria-label="' + esc(labels.zoomToggle) + '" class="fixed right-16 top-4 bg-abyss/80 p-2 text-ivory hover:text-gold">' + svg("zoom", 28) + "</button>" : "") +
        (many ? '<button type="button" data-a="prev" aria-label="' + esc(labels.prev) + '" class="fixed left-3 top-1/2 -translate-y-1/2 bg-abyss/80 p-3 text-gold hover:bg-gold hover:text-abyss">' + svg("left", 28) + "</button>" +
          '<button type="button" data-a="next" aria-label="' + esc(labels.next) + '" class="fixed right-3 top-1/2 -translate-y-1/2 bg-abyss/80 p-3 text-gold hover:bg-gold hover:text-abyss">' + svg("right", 28) + "</button>" +
          '<p class="fixed bottom-4 left-1/2 -translate-x-1/2 bg-abyss/80 px-3 py-1 text-xs tracking-widest text-ivory">' + (i + 1) + " / " + photos.length + "</p>" : "");
    };
    var close = function () { document.removeEventListener("keydown", onKey); document.body.style.overflow = root._o; root.remove(); if (labels.onClose) labels.onClose(i); if (prevFocus && prevFocus.focus) prevFocus.focus(); };
    var move = function (d) { zoom = false; i = (i + d + photos.length) % photos.length; paint(); };
    var onKey = function (e) { if (e.key === "Escape") close(); else if (many && e.key === "ArrowLeft") move(-1); else if (many && e.key === "ArrowRight") move(1); };
    root.addEventListener("click", function (e) {
      var b = e.target.closest("button"), a = b && b.getAttribute("data-a");
      if (a === "close") close(); else if (a === "zoom") { zoom = !zoom; paint(); } else if (a === "prev") move(-1); else if (a === "next") move(1);
      else if (e.target.tagName === "IMG" && labels.zoomToggle) { zoom = !zoom; paint(); }
      else if (!labels.zoomToggle && !b) close();
    });
    root._o = document.body.style.overflow; document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    paint(); document.body.appendChild(root);
    var c = $('[data-a="close"]', root); if (c) c.focus();
  }

  // wiki articles: click any image to enlarge it
  $$('[class*="cursor-zoom-in"]').forEach(function (box) {
    if (box.tagName !== "DIV") return;
    box.addEventListener("click", function (e) {
      if (e.target.tagName !== "IMG") return;
      viewer([{ src: e.target.currentSrc || e.target.src, alt: e.target.alt }], 0, { close: A.close, enlarged: A.enlarged });
    });
  });

  /* ---------- product gallery ---------- */
  (function () {
    var root = $('[role="group"][aria-roledescription="carousel"]');
    if (!root) return;
    var track = $("ul", root), slides = $$(":scope > ul > li", root);
    var photos = slides.map(function (li) { var im = $("img", li); return { src: im ? (im.currentSrc || im.src) : "", alt: im ? im.alt : "" }; });
    var counter = $("p[aria-live]", root), arrows = $$(":scope > button", root), thumbs = root.nextElementSibling && root.nextElementSibling.tagName === "UL" ? $$("button", root.nextElementSibling) : [];
    var index = 0, many = photos.length > 1;
    var show = function (n) {
      index = n;
      if (counter) counter.textContent = (n + 1) + " / " + photos.length;
      thumbs.forEach(function (b, k) { b.setAttribute("aria-current", String(k === n)); b.className = b.className.replace(/border-gold(?!\/)|border-gold\/20 opacity-70 hover:opacity-100/g, k === n ? "border-gold" : "border-gold/20 opacity-70 hover:opacity-100"); });
    };
    var goTo = function (i) { var n = (i + photos.length) % photos.length; track.scrollTo({ left: n * track.clientWidth, behavior: "smooth" }); show(n); };
    if (many) {
      track.addEventListener("scroll", function () { show(Math.round(track.scrollLeft / track.clientWidth)); }, { passive: true });
      if (arrows[0]) arrows[0].addEventListener("click", function () { goTo(index - 1); });
      if (arrows[1]) arrows[1].addEventListener("click", function () { goTo(index + 1); });
      thumbs.forEach(function (b, k) { b.addEventListener("click", function () { goTo(k); }); });
    }
    var prevL = arrows[0] ? arrows[0].getAttribute("aria-label") : "", nextL = arrows[1] ? arrows[1].getAttribute("aria-label") : "";
    slides.forEach(function (li, k) {
      var b = $("button", li);
      if (b) b.addEventListener("click", function () { viewer(photos, k, { close: A.close, zoomToggle: S.zoomToggle, prev: prevL, next: nextL, onClose: function (n) { if (many) goTo(n); } }); });
    });
  })();

  /* ---------- buy box: quantity + add to cart + buy now ---------- */
  (function () {
    var q = $("#qty-label"), root = q && q.closest("[data-sw-item]");
    if (!root) return;
    var item; try { item = JSON.parse(root.getAttribute("data-sw-item")); } catch (e) { return; }
    var max = Math.min(MAXQ, item.stock == null ? MAXQ : item.stock), qty = 1, busy = false, timer = 0;
    var minus = $('button[aria-label="-"]', root), plus = $('button[aria-label="+"]', root), out = $("[aria-live]", root);
    var btns = $$(":scope > .grid > button", root), add = btns[0], buy = btns[1], status = $('p[role="status"]', root);
    var paint = function () { out.textContent = qty; minus.disabled = qty <= 1; plus.disabled = qty >= max; };
    minus.addEventListener("click", function () { qty = Math.max(1, qty - 1); paint(); });
    plus.addEventListener("click", function () { qty = Math.min(max, qty + 1); paint(); });
    var lock = function (fn) { if (busy) return; busy = true; try { fn(); } finally { setTimeout(function () { busy = false; }, 700); } };
    add.addEventListener("click", function () { lock(function () {
      cart.add(item, qty);
      status.innerHTML = esc(S.added) + ' · <a href="/' + L + '/tienda/carrito" class="underline">' + esc(S.viewCart) + "</a>";
      clearTimeout(timer); timer = setTimeout(function () { status.textContent = ""; }, 3000);
    }); });
    buy.addEventListener("click", function () { lock(function () { cart.add(item, qty); location.href = "/" + L + "/tienda/carrito"; }); });
    paint();
  })();

  /* ---------- catalogue: one-tap add ---------- */
  $$("[data-sw-quick]").forEach(function (root) {
    var item; try { item = JSON.parse(root.getAttribute("data-sw-item")); } catch (e) { return; }
    var btn = $("button", root), status = $('p[role="status"]', root), timer = 0;
    if (!btn) return;
    btn.addEventListener("click", function () {
      cart.add(item, 1);
      if (status) { status.innerHTML = esc(S.added) + ' · <a href="/' + L + '/tienda/carrito" class="underline underline-offset-4">' + esc(S.viewCart) + "</a>"; clearTimeout(timer); timer = setTimeout(function () { status.textContent = ""; }, 4000); }
    });
  });

  /* ---------- cart page ---------- */
  (function () {
    var box = location.pathname.indexOf("/tienda/carrito") < 0 ? null : $("main .max-w-6xl");
    if (!box) return;
    var C = D.cart || {}, settings = C.settings || { zones: [], currency: "EUR" }, canCheckout = !!C.canCheckout;
    var money = new Intl.NumberFormat(L, { style: "currency", currency: settings.currency || "EUR" });
    var names = ("DisplayNames" in Intl) ? new Intl.DisplayNames([L], { type: "region" }) : { of: function (c) { return c; } };
    var countries = Array.from(new Set([].concat.apply([], (settings.zones || []).map(function (z) { return z.countries; })))).sort();
    var country = countries[0] || "";
    var zoneFor = function (c) { return (settings.zones || []).filter(function (z) { return z.countries.indexOf(c) >= 0; })[0] || null; };
    var param = new URLSearchParams(location.search).get("e");
    var notice = param === "cancelled" ? S.cancelled : param ? ((S.errors || {})[param] || (S.errors || {}).generic) : null;
    var render = function () {
      var items = cart.read();
      var note = notice ? '<p role="alert" class="mb-6 border border-ember bg-ember/20 p-3 text-sm">' + esc(notice) + "</p>" : "";
      if (!items.length) {
        box.innerHTML = '<div class="space-y-6">' + (notice ? note.replace("mb-6", "") : "") + '<p class="text-stone">' + esc(S.cartEmpty) + '</p><a href="/' + L + '/tienda" class="inline-block bg-gold px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-abyss">' + esc(S["continue"]) + "</a></div>";
        return;
      }
      var subtotal = items.reduce(function (n, i) { return n + i.price_cents * i.qty; }, 0);
      var zone = country ? zoneFor(country) : null;
      var shipping = zone ? (zone.free_over_cents != null && subtotal >= zone.free_over_cents ? 0 : zone.price_cents) : null;
      var lines = items.map(function (i) {
        return '<li class="grid grid-cols-[5rem_1fr] gap-4 p-4 sm:grid-cols-[5rem_1fr_auto]"><div class="relative h-20 w-20 bg-abyss">' + (i.image ? '<img alt="" loading="lazy" src="' + esc(asset(i.image)) + '" class="absolute inset-0 h-full w-full object-contain">' : "") + "</div><div>" +
          '<a href="' + esc(i.url || "/" + L + "/miniaturas/" + i.slug) + '" class="font-display text-lg hover:text-gold">' + esc(i.name) + "</a>" +
          '<p class="text-sm text-stone">' + money.format(i.price_cents / 100) + "</p>" +
          '<button type="button" data-rm="' + esc(i.id) + '" class="mt-2 inline-flex items-center gap-1 text-xs uppercase tracking-widest text-stone hover:text-ember">' + svg("trash", 14) + " " + esc(S.remove) + "</button></div>" +
          '<div class="col-span-2 flex items-center justify-between gap-4 sm:col-span-1 sm:flex-col sm:items-end"><div class="flex items-center border border-gold/40" role="group" aria-label="' + esc(S.qty + ": " + i.name) + '">' +
          '<button type="button" aria-label="-" data-q="' + esc(i.id) + '" data-d="-1"' + (i.qty <= 1 ? " disabled" : "") + ' class="p-2 disabled:opacity-30">' + svg("minus", 14) + "</button>" +
          '<span class="min-w-8 text-center text-sm" aria-live="polite">' + i.qty + "</span>" +
          '<button type="button" aria-label="+" data-q="' + esc(i.id) + '" data-d="1"' + (i.stock != null && i.qty >= i.stock ? " disabled" : "") + ' class="p-2 disabled:opacity-30">' + svg("plus", 14) + "</button></div>" +
          '<p class="font-display text-gold">' + money.format(i.price_cents * i.qty / 100) + "</p></div></li>";
      }).join("");
      var side;
      if (!countries.length) {
        side = '<div class="space-y-3"><div class="flex justify-between font-display text-lg text-gold"><span>' + esc(S.subtotal) + "</span><span>" + money.format(subtotal / 100) + '</span></div><p class="text-xs text-stone">' + esc(S.taxIncluded) + '</p><p role="note" class="border border-dashed border-gold/40 p-3 text-sm text-stone">' + esc(S.noShipping) + "</p></div>";
      } else {
        var total = shipping == null ? subtotal : subtotal + shipping;
        side = '<form method="post" action="' + esc(D.checkout) + '" class="grid gap-4"><input type="hidden" name="action" value="sw_checkout"><input type="hidden" name="locale" value="' + L + '"><input type="hidden" name="cart" value="' + esc(JSON.stringify(items.map(function (i) { return { id: i.id, qty: i.qty }; }))) + '">' +
          '<label class="grid gap-1 text-sm">' + esc(S.shipTo) + '<select name="country" class="border border-gold/40 bg-abyss px-3 py-2">' + countries.map(function (c) { return '<option value="' + c + '"' + (c === country ? " selected" : "") + ">" + esc(names.of(c) || c) + "</option>"; }).join("") + "</select></label>" +
          (zone && zone.free_over_cents != null ? '<p class="text-xs text-stone">' + esc(S.freeOver.replace("{amount}", money.format(zone.free_over_cents / 100))) + "</p>" : "") +
          '<dl class="space-y-2 border-t border-gold/20 pt-4 text-sm"><div class="flex justify-between"><dt>' + esc(S.subtotal) + "</dt><dd>" + money.format(subtotal / 100) + "</dd></div>" +
          '<div class="flex justify-between"><dt>' + esc(S.shipping) + (zone ? " (" + esc(zone.label) + ")" : "") + "</dt><dd>" + (shipping == null ? "—" : shipping === 0 ? esc(S.free) : money.format(shipping / 100)) + "</dd></div>" +
          '<div class="flex justify-between border-t border-gold/20 pt-2 font-display text-lg text-gold"><dt>' + esc(S.total) + "</dt><dd>" + money.format(total / 100) + '</dd></div><p class="text-xs text-stone">' + esc(S.taxIncluded) + "</p></dl>" +
          (shipping == null ? '<p role="alert" class="text-sm text-ember">' + esc((S.errors || {}).no_zone || (S.errors || {}).generic) + "</p>" : "") +
          (canCheckout ? '<button' + (shipping == null ? " disabled" : "") + ' class="bg-gold px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-abyss transition hover:bg-ivory disabled:opacity-40">' + esc(S.checkout) + '</button><p class="text-xs text-stone">' + esc(S.checkoutNote) + '</p><p class="text-xs text-stone">' + esc(S.termsPre) + ' <a href="/' + L + '/legal/condiciones" class="underline">' + esc(S.terms) + '</a> · <a href="/' + L + '/legal/devoluciones" class="underline">' + esc(S.returns) + "</a></p>"
            : '<p role="note" class="border border-dashed border-gold/40 p-3 text-sm text-stone">' + esc(S.closed) + "</p>") + "</form>";
      }
      box.innerHTML = '<div class="grid gap-10 lg:grid-cols-[1fr_22rem]"><div>' + note + '<ul class="divide-y divide-gold/10 border border-gold/20 bg-coal">' + lines + '</ul><a href="/' + L + '/tienda" class="mt-6 inline-block text-xs uppercase tracking-widest text-gold hover:text-ivory">← ' + esc(S["continue"]) + '</a></div><aside aria-label="' + esc(S.total) + '" class="h-fit border border-gold/30 bg-coal p-5">' + side + "</aside></div>";
    };
    box.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      if (b.getAttribute("data-rm")) cart.remove(b.getAttribute("data-rm"));
      else if (b.getAttribute("data-q")) cart.change(b.getAttribute("data-q"), Number(b.getAttribute("data-d")));
    });
    box.addEventListener("change", function (e) { if (e.target.name === "country") { country = e.target.value; render(); } });
    listeners.push(render); render();
  })();

  /* ---------- contact form ---------- */
  (function () {
    var form = $("#contacto form");
    if (!form) return;
    var C = T.contact || {};
    var stamp = function () { var ts = form.elements.ts; if (ts) ts.value = String(Date.now()); };
    stamp();
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var btn = $("button:not([type])", form) || $("button", form), old = btn.textContent;
      var fd = new FormData(form); fd.append("action", "sw_contact");
      btn.disabled = true; btn.textContent = C.sending;
      var fail = function (code) {
        var m = $('[role="alert"]', form) || form.insertBefore(el('<p role="alert" class="border border-ember bg-ember/20 p-3 text-sm"></p>'), btn);
        m.textContent = code === "notReady" ? C.notReady : ((C.errors || {})[code] || (C.errors || {}).generic);
        btn.disabled = false; btn.textContent = old; stamp();
      };
      fetch(D.ajax, { method: "POST", body: fd, credentials: "same-origin" }).then(function (r) { return r.json(); }).then(function (j) {
        if (j && j.status === "ok") { form.replaceWith(el('<p role="status" class="border border-gold/50 bg-gold/10 p-5 text-lg text-ivory">' + esc(C.ok) + "</p>")); }
        else fail(j && j.error);
      }).catch(function () { fail("generic"); });
    });
  })();
})();
