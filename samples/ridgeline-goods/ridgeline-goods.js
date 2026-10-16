/* Ridgeline Goods: a sample online store for a fictional business, built as a demonstration by Ethan Gaither.
   Nothing here is for sale and nothing is sent anywhere. One small script for every page:
   the demo cart (kept in localStorage), the shop filters, and the cart page. */
(function () {
  'use strict';

  var PRODUCTS = {
  "stove": {
    "name": "Single-burner stove",
    "price": 54,
    "cat": "cook"
  },
  "mug": {
    "name": "Enamel mug",
    "price": 18,
    "cat": "drink"
  },
  "pack": {
    "name": "20 L day pack",
    "price": 68,
    "cat": "carry"
  },
  "lantern": {
    "name": "Camp lantern",
    "price": 28,
    "cat": "light"
  },
  "skillet": {
    "name": "Cast iron skillet",
    "price": 64,
    "cat": "cook"
  },
  "bottle": {
    "name": "Steel bottle",
    "price": 34,
    "cat": "drink"
  },
  "blanket": {
    "name": "Wool blanket",
    "price": 79,
    "cat": "camp"
  },
  "headlamp": {
    "name": "Headlamp",
    "price": 24,
    "cat": "light"
  },
  "coffee-pot": {
    "name": "Camp coffee pot",
    "price": 38,
    "cat": "drink"
  },
  "stool": {
    "name": "Folding stool",
    "price": 42,
    "cat": "camp"
  }
};
  var KEY = 'ridgeline-goods-demo-cart-v1';
  var MAX = 20;
  var root = document.body.getAttribute('data-root') || '';
  var memory = {};
  var broken = false;

  function money(n) { return '$' + n.toLocaleString('en-US'); }
  function items(n) { return n + (n === 1 ? ' item' : ' items'); }

  /* ---- The cart store. localStorage when it works, memory when it doesn't. ---- */
  function clean(data) {
    var out = {};
    if (!data || typeof data !== 'object') return out;
    Object.keys(PRODUCTS).forEach(function (id) {
      var q = parseInt(data[id], 10);
      if (q > 0) out[id] = Math.min(q, MAX);
    });
    return out;
  }
  function load() {
    if (broken) return clean(memory);
    try {
      var raw = window.localStorage.getItem(KEY);
      return raw ? clean(JSON.parse(raw)) : {};
    } catch (e) { return clean(memory); }
  }
  function save(cart) {
    memory = cart;
    try { window.localStorage.setItem(KEY, JSON.stringify(cart)); } catch (e) { broken = true; }
  }
  function totals(cart) {
    var n = 0, sum = 0;
    Object.keys(cart).forEach(function (id) { n += cart[id]; sum += cart[id] * PRODUCTS[id].price; });
    return { items: n, sum: sum };
  }

  /* ---- Announcements for screen readers ---- */
  var live = document.getElementById('live');
  function say(msg) {
    if (!live) return;
    live.textContent = '';
    window.setTimeout(function () { live.textContent = msg; }, 40);
  }

  /* ---- Header badge and the "in your cart" line on product pages ---- */
  function paintHeader(bump) {
    var t = totals(load());
    [].forEach.call(document.querySelectorAll('[data-cart-count]'), function (el) {
      el.textContent = t.items;
      el.hidden = t.items === 0;
      if (bump && t.items) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
    });
    [].forEach.call(document.querySelectorAll('[data-cart-link]'), function (a) {
      a.setAttribute('aria-label', t.items ? 'Cart, ' + items(t.items) : 'Cart, empty');
    });
  }
  function paintInCart() {
    var cart = load();
    [].forEach.call(document.querySelectorAll('[data-in-cart]'), function (el) {
      var q = cart[el.getAttribute('data-in-cart')] || 0;
      el.hidden = q === 0;
      var n = el.querySelector('[data-in-cart-n]');
      if (n) n.textContent = q + ' in your cart.';
    });
  }

  /* ---- Add to cart ---- */
  var resetTimers = [];
  function flash(btn) {
    var lbl = btn.querySelector('.lbl');
    if (!lbl) return;
    var original = btn.getAttribute('data-label') || lbl.textContent;
    btn.setAttribute('data-label', original);
    lbl.textContent = 'Added';
    btn.setAttribute('data-state', 'added');
    window.clearTimeout(resetTimers[btn.getAttribute('data-add')]);
    resetTimers[btn.getAttribute('data-add')] = window.setTimeout(function () {
      lbl.textContent = original;
      btn.removeAttribute('data-state');
    }, 1800);
  }
  document.addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('[data-add]') : null;
    if (!btn) return;
    var id = btn.getAttribute('data-add');
    var p = PRODUCTS[id];
    if (!p) return;
    var cart = load();
    if ((cart[id] || 0) >= MAX) {
      say('You already have ' + MAX + ' of the ' + p.name.toLowerCase() + ' in the cart. That is the limit in this demo.');
      return;
    }
    cart[id] = (cart[id] || 0) + 1;
    save(cart);
    paintHeader(true);
    paintInCart();
    flash(btn);
    var t = totals(cart);
    say(p.name + ' added. ' + items(t.items) + ' in the cart, subtotal ' + money(t.sum) + '.');
  });

  /* ---- Phone menu: close it after a choice, or on Escape ---- */
  var menu = document.querySelector('.nav-narrow');
  if (menu) {
    menu.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('a')) menu.open = false; });
    menu.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.open) { menu.open = false; menu.querySelector('summary').focus(); }
    });
  }

  /* ---- Filters on the shop page ---- */
  var form = document.querySelector('[data-filters]');
  if (form) {
    var cards = [].slice.call(document.querySelectorAll('[data-card]'));
    var statusEl = document.querySelector('[data-results]');
    var emptyEl = document.querySelector('[data-empty]');
    var toggle = form.querySelector('.filters-toggle');
    var countEl = form.querySelector('[data-filter-count]');
    var clearBtns = [].slice.call(document.querySelectorAll('[data-clear-filters]'));
    var bands = {
      low: function (p) { return p < 30; },
      mid: function (p) { return p >= 30 && p <= 60; },
      high: function (p) { return p > 60; }
    };
    var picked = function (name) {
      return [].map.call(form.querySelectorAll('input[name="' + name + '"]:checked'), function (i) { return i.value; });
    };
    var apply = function () {
      var cats = picked('cat'), prices = picked('price'), shown = 0;
      cards.forEach(function (li) {
        var price = Number(li.getAttribute('data-price'));
        var okCat = !cats.length || cats.indexOf(li.getAttribute('data-cat')) > -1;
        var okPrice = !prices.length || prices.some(function (b) { return bands[b] && bands[b](price); });
        var ok = okCat && okPrice;
        li.hidden = !ok;
        if (ok) shown++;
      });
      var active = cats.length + prices.length;
      var msg = 'Showing ' + shown + ' of ' + cards.length + ' products';
      if (statusEl.textContent !== msg) statusEl.textContent = msg;
      emptyEl.hidden = shown !== 0;
      clearBtns.forEach(function (b) { b.hidden = !active; });
      if (countEl) countEl.textContent = active ? '(' + active + ' on)' : '';
    };
    form.addEventListener('change', apply);
    form.addEventListener('submit', function (e) { e.preventDefault(); });
    clearBtns.forEach(function (b) {
      b.addEventListener('click', function () {
        [].forEach.call(form.querySelectorAll('input[type="checkbox"]'), function (i) { i.checked = false; });
        apply();
        var first = form.querySelector('input[type="checkbox"]');
        if (b.closest('[data-empty]') && first && toggle && toggle.offsetParent === null) first.focus();
      });
    });
    if (toggle) {
      toggle.addEventListener('click', function () {
        var open = form.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    }
    window.addEventListener('pageshow', apply);
    apply();
  }

  /* ---- The cart page ---- */
  var page = document.querySelector('[data-cart-page]');
  if (page) {
    var list = page.querySelector('[data-cart-list]');
    var emptyBox = page.querySelector('[data-cart-empty]');
    var summary = page.querySelector('[data-cart-summary]');
    var subtotalEl = page.querySelector('[data-subtotal]');
    var countLine = page.querySelector('[data-item-count]');
    var heading = document.getElementById('cart-title');
    var dialog = document.getElementById('demo-dialog');
    var checkout = page.querySelector('[data-checkout]');

    var mk = function (tag, cls, text) {
      var n = document.createElement(tag);
      if (cls) n.className = cls;
      if (text != null) n.textContent = text;
      return n;
    };

    var buildLine = function (id, qty) {
      var p = PRODUCTS[id];
      var li = mk('li', 'line');
      li.setAttribute('data-line', id);

      var tile = mk('div', 'line-tile');
      var img = document.createElement('img');
      img.src = root + 'art/' + id + '.svg';
      img.alt = '';
      img.width = 96; img.height = 96;
      tile.appendChild(img);

      var name = mk('h3', 'line-name');
      var link = mk('a', null, p.name);
      link.href = root + 'product/' + id + '/';
      name.appendChild(link);

      var unit = mk('p', 'line-unit', money(p.price) + ' each');
      var main = mk('div');
      main.appendChild(name); main.appendChild(unit);

      var total = mk('p', 'line-total', money(p.price * qty));
      total.setAttribute('data-line-total', '');

      var controls = mk('div', 'line-controls');
      var q = mk('div', 'qty');
      q.setAttribute('role', 'group');
      q.setAttribute('aria-label', 'Quantity for ' + p.name);
      var dec = mk('button', null, '−');
      dec.type = 'button'; dec.setAttribute('data-dec', '');
      dec.setAttribute('aria-label', 'One less ' + p.name.toLowerCase());
      var input = document.createElement('input');
      input.type = 'number'; input.min = '1'; input.max = String(MAX); input.value = String(qty);
      input.setAttribute('inputmode', 'numeric');
      input.setAttribute('aria-label', 'Quantity of ' + p.name.toLowerCase());
      var inc = mk('button', null, '+');
      inc.type = 'button'; inc.setAttribute('data-inc', '');
      inc.setAttribute('aria-label', 'One more ' + p.name.toLowerCase());
      q.appendChild(dec); q.appendChild(input); q.appendChild(inc);
      var rm = mk('button', 'link-btn', 'Remove');
      rm.type = 'button'; rm.setAttribute('data-remove', '');
      var rmName = mk('span', 'sr-only', ' ' + p.name.toLowerCase());
      rm.appendChild(rmName);
      controls.appendChild(q); controls.appendChild(rm);

      li.appendChild(tile);
      li.appendChild(main);
      li.appendChild(total);
      li.appendChild(controls);
      syncLine(li, qty);
      return li;
    };

    var syncLine = function (li, qty) {
      var id = li.getAttribute('data-line');
      li.querySelector('input').value = String(qty);
      li.querySelector('[data-line-total]').textContent = money(PRODUCTS[id].price * qty);
      li.querySelector('[data-dec]').setAttribute('aria-disabled', qty <= 1 ? 'true' : 'false');
      li.querySelector('[data-inc]').setAttribute('aria-disabled', qty >= MAX ? 'true' : 'false');
    };

    var paintTotals = function () {
      var t = totals(load());
      subtotalEl.textContent = money(t.sum);
      countLine.textContent = items(t.items);
    };

    var render = function () {
      var cart = load();
      var ids = Object.keys(PRODUCTS).filter(function (id) { return cart[id]; });
      list.textContent = '';
      ids.forEach(function (id) { list.appendChild(buildLine(id, cart[id])); });
      var has = ids.length > 0;
      list.hidden = !has;
      summary.hidden = !has;
      emptyBox.hidden = has;
      paintTotals();
    };

    var setQty = function (li, next, announce) {
      var id = li.getAttribute('data-line');
      var cart = load();
      var qty = Math.max(1, Math.min(MAX, next));
      cart[id] = qty;
      save(cart);
      syncLine(li, qty);
      paintTotals();
      paintHeader(false);
      if (announce) say(PRODUCTS[id].name + ': ' + qty + '. Subtotal ' + money(totals(cart).sum) + '.');
    };

    list.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      var li = b.closest('[data-line]');
      var id = li.getAttribute('data-line');
      var qty = load()[id] || 1;
      if (b.hasAttribute('data-inc')) { if (qty < MAX) setQty(li, qty + 1, true); }
      else if (b.hasAttribute('data-dec')) { if (qty > 1) setQty(li, qty - 1, true); }
      else if (b.hasAttribute('data-remove')) {
        var cart = load();
        delete cart[id];
        save(cart);
        render();
        paintHeader(false);
        say(PRODUCTS[id].name + ' removed. ' + (totals(cart).items ? items(totals(cart).items) + ' in the cart.' : 'The cart is empty.'));
        if (heading) heading.focus();
      }
    });
    list.addEventListener('change', function (e) {
      if (e.target.tagName !== 'INPUT') return;
      var li = e.target.closest('[data-line]');
      var n = parseInt(e.target.value, 10);
      setQty(li, isNaN(n) ? (load()[li.getAttribute('data-line')] || 1) : n, true);
    });

    if (checkout) {
      checkout.addEventListener('click', function () {
        if (dialog && typeof dialog.showModal === 'function') dialog.showModal();
        else { var note = page.querySelector('[data-notice]'); if (note) note.focus(); }
      });
    }
    if (dialog) {
      dialog.addEventListener('click', function (e) { if (e.target === dialog) dialog.close(); });
    }

    render();
  }

  /* ---- Keep everything in step, including other tabs ---- */
  window.addEventListener('storage', function (e) {
    if (e.key !== KEY && e.key !== null) return;
    paintHeader(false);
    paintInCart();
    if (page && !page.contains(document.activeElement)) render();
  });
  window.addEventListener('pageshow', function () { paintHeader(false); paintInCart(); });
  paintHeader(false);
  paintInCart();
})();
