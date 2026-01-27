// ========================================
// GLOBAL CART MODAL - Works on every page
// Exposes: window.CartModal
// ========================================

(function () {
  const CONFIG = {
    DEBUG: true,
    CART_KEY: 'wf_cart_v3',
    CHECKOUT_URL: '/deine-bestellung',
  };

  // URL slug to SKU mapping for /package-* pages
  const SLUG_TO_SKU = {
    'package-mens-health': 'mens_health',
    'package-womens-health': 'womens_health',
    'package-chronic-inflammation': 'chronic_inflammation',
    'package-eisenmetabolismus': 'iron_metabolism',
    'package-heart-health': 'heart_health',
    'package-vitamin-b-stoffwechsel': 'vitamin_b_metabolism',
    'package-vitamin-d': 'vitamin_d',
    'longterm-health': 'longterm_health',
  };

  // Package data (shared across all pages)
  const PACKAGES = {
    mens_health: {
      name: 'Männergesundheit',
      basePrice: 8743,
      image: '',
      biomarkers: {
        lh: { name: 'LH', price: 1457 },
        fsh: { name: 'FSH', price: 1457 },
        prolactin: { name: 'Prolaktin', price: 1000 },
        estradiol: { name: 'Estradiol', price: 1360 },
        dheas: { name: 'DHEAS', price: 1360 },
        shbg: { name: 'SHBG', price: 1749 },
        testosterone: { name: 'Testosterone', price: 1360 },
        free_testosterone_index: { name: 'Free Testosterone Index', price: 1000 },
      },
    },
    womens_health: {
      name: 'Frauengesundheit',
      basePrice: 12143,
      image: '',
      biomarkers: {
        progesterone: { name: 'Progesterone', price: 1360 },
        estradiol: { name: 'Estradiol', price: 1360 },
        fsh: { name: 'FSH', price: 1457 },
        lh: { name: 'LH', price: 1457 },
        dheas: { name: 'DHEAS', price: 1360 },
        shbg: { name: 'SHBG', price: 1749 },
        testosterone: { name: 'Testosterone', price: 1360 },
        free_testosterone_index: { name: 'Free Testosterone Index', price: 1000 },
        ferritin: { name: 'Ferritin', price: 1457 },
        transferrin: { name: 'Transferrin', price: 583 },
      },
    },
    chronic_inflammation: {
      name: 'Chronische Entzündung',
      basePrice: 3332,
      image: '',
      biomarkers: {
        hscrp: { name: 'hsC-reaktive Protein', price: 1166 },
        neutrophile_granulozyten: { name: 'Neutrophile Granulozyten', price: 1166 },
        interleukin_6: { name: 'Interleukin-6', price: 1000 },
      },
    },
    iron_metabolism: {
      name: 'Eisen-Metabolismus',
      basePrice: 2873,
      image: '',
      biomarkers: {
        ferritin: { name: 'Ferritin', price: 1457 },
        transferrin: { name: 'Transferrin', price: 583 },
        eisen: { name: 'Eisen', price: 233 },
        transferrin_saettigung: { name: 'Transferrin-Sättigung', price: 600 },
      },
    },
    heart_health: {
      name: 'Herzgesundheit',
      basePrice: 4498,
      image: '',
      biomarkers: {
        apo_b: { name: 'APO B', price: 2332 },
        hscrp: { name: 'hsC-reaktive Protein', price: 1166 },
        lpa: { name: 'Lp(a)', price: 1000 },
      },
    },
    vitamin_b_metabolism: {
      name: 'Vitamin B Stoffwechsel',
      basePrice: 9236,
      image: '',
      biomarkers: {
        vitamin_b2: { name: 'Vitamin B2', price: 3322 },
        vitamin_b12: { name: 'Vitamin B12', price: 1457 },
        vitamin_b9: { name: 'Vitamin B9 (Folsäure)', price: 1457 },
        vitamin_b6: { name: 'Vitamin B6', price: 3322 },
      },
    },
    vitamin_d: {
      name: 'Vitamin D',
      basePrice: 1865,
      image: '',
      biomarkers: {
        vitamin_d_25oh: { name: 'Vitamin D 25OH', price: 1865 },
      },
    },
    longterm_health: {
      name: 'Longterm Health',
      basePrice: 3964,
      image: '',
      biomarkers: {
        hba1c: { name: 'HbA1C', price: 1166 },
        crp: { name: 'CRP', price: 1166 },
        alat: { name: 'ALAT', price: 233 },
        cystatin_c: { name: 'Cystatin C', price: 1166 },
        ldl: { name: 'LDL', price: 233 },
      },
    },
  };

  // Utilities
  const debug = (...args) => CONFIG.DEBUG && console.log('[CART-MODAL]', ...args);
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const fmt = (cents) =>
    new Intl.NumberFormat('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(cents / 100);

  // Cart functions
  const readCart = () => {
    try {
      return JSON.parse(localStorage.getItem(CONFIG.CART_KEY) || '[]');
    } catch {
      return [];
    }
  };

  const writeCart = (items) => {
    localStorage.setItem(CONFIG.CART_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent('cart-updated'));
  };

  const clearCart = () => {
    localStorage.removeItem(CONFIG.CART_KEY);
    window.dispatchEvent(new CustomEvent('cart-updated'));
  };

  function calculateCart(items) {
    const seen = new Map();
    let total = 0,
      deductions = 0;
    const prices = [];

    items.forEach((item) => {
      const pkg = PACKAGES[item.sku];
      if (!pkg) return;
      let price = pkg.basePrice;

      Object.entries(pkg.biomarkers).forEach(([id, bio]) => {
        if (seen.has(id)) {
          price -= bio.price;
          deductions += bio.price;
        } else {
          seen.set(id, pkg.name);
        }
      });

      prices.push({ sku: item.sku, name: pkg.name, original: pkg.basePrice, final: price });
      total += price;
    });

    return {
      total,
      deductions,
      prices,
      original: items.reduce((s, i) => s + (PACKAGES[i.sku]?.basePrice || 0), 0),
    };
  }

  // Modal state
  let modal = null;
  let itemTemplate = null;
  let listContainer = null;

  function getModal() {
    if (!modal) {
      modal = $('.cart-modal');
    }
    return modal;
  }

  function openCartModal() {
    const m = getModal();
    if (!m) {
      debug('Cart modal not found in DOM');
      return;
    }
    m.style.display = 'flex';
    setTimeout(() => {
      m.style.opacity = '1';
      const box = $('.cart_modal-box', m);
      if (box) {
        box.style.opacity = '1';
        box.style.transform =
          'translate3d(0rem, 0px, 0px) scale3d(1, 1, 1) rotateX(0deg) rotateY(0deg) rotateZ(0deg) skew(0deg, 0deg)';
      }
    }, 10);
    renderCartModal();
    debug('Cart modal opened');
  }

  function closeCartModal() {
    const m = getModal();
    if (!m) return;

    const box = $('.cart_modal-box', m);
    if (box) {
      box.style.opacity = '0';
      box.style.transform =
        'translate3d(2rem, 0px, 0px) scale3d(1, 1, 1) rotateX(0deg) rotateY(0deg) rotateZ(0deg) skew(0deg, 0deg)';
    }

    setTimeout(() => {
      m.style.opacity = '0';
      setTimeout(() => {
        m.style.display = 'none';
      }, 200);
    }, 100);

    debug('Cart modal closed');
  }

  function renderCartModal() {
    const m = getModal();
    if (!m) return;

    const items = readCart();
    const calc = calculateCart(items);

    debug('Rendering cart modal:', items.length, 'items');

    listContainer = $('.cart_modal-list', m);
    if (!listContainer) {
      debug('List container not found');
      return;
    }

    if (!itemTemplate) {
      const firstItem = $('.cart_modal-list_item', listContainer);
      if (firstItem) {
        itemTemplate = firstItem.cloneNode(true);
        debug('Item template initialized, innerHTML:', itemTemplate.innerHTML.substring(0, 200));
        debug('Template has data-cart attrs:', {
          img: !!$('[data-cart="cart-item-img"]', itemTemplate),
          title: !!$('[data-cart="cart-item-title"]', itemTemplate),
          desc: !!$('[data-cart="cart-item-desc"]', itemTemplate),
          price: !!$('[data-cart="cart-item-price"]', itemTemplate),
          remove: !!$('[data-cart="cart-item-remove"]', itemTemplate),
        });
      }
    }

    $$('.cart_modal-list_item', listContainer).forEach((el) => el.remove());

    if (items.length === 0) {
      const emptyEl = document.createElement('li');
      emptyEl.className = 'cart_modal-list_item';
      emptyEl.innerHTML =
        '<div class="cart_modal-list_item-inner" style="justify-content: center; padding: 2rem;"><div class="text-color-gray-70"><div class="text-size-small">Warenkorb ist leer</div></div></div>';
      listContainer.appendChild(emptyEl);
    } else if (itemTemplate) {
      items.forEach((item) => {
        const pkg = PACKAGES[item.sku];
        if (!pkg) return;
        const priceInfo = calc.prices.find((p) => p.sku === item.sku);

        const el = itemTemplate.cloneNode(true);
        el.setAttribute('data-sku', item.sku);

        // Find elements using data-cart attributes or fallback to positional selectors
        const img = $('[data-cart="cart-item-img"]', el) || $('img', el);
        if (img) {
          const imgSrc = item.image || pkg.image;
          if (imgSrc) {
            img.src = imgSrc;
            img.removeAttribute('srcset');
            img.removeAttribute('sizes');
          }
          img.alt = pkg.name;
        }

        const titleEl = $('[data-cart="cart-item-title"]', el);
        if (titleEl) titleEl.textContent = pkg.name;

        const descEl = $('[data-cart="cart-item-desc"]', el);
        if (descEl) descEl.textContent = `${Object.keys(pkg.biomarkers).length} Biomarker`;

        const priceEl = $('[data-cart="cart-item-price"]', el);
        if (priceEl) priceEl.textContent = fmt(priceInfo?.final || pkg.basePrice);

        const trashBtn = $('[data-cart="cart-item-remove"]', el) || $('[class*="remove"], [class*="trash"], [class*="delete"], .cart_modal-list_item-remove', el);
        if (trashBtn) {
          trashBtn.style.cursor = 'pointer';
          trashBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            removeFromCart(item.sku);
          });
        }

        debug('Rendered item:', item.sku, 'title:', titleEl?.textContent, 'price:', priceEl?.textContent, 'img:', !!img, 'trash:', !!trashBtn);

        listContainer.appendChild(el);
      });
    }

    const totalEl = $('.cart_modal-price_wrap .heading-style-h4', m);
    if (totalEl) {
      totalEl.textContent = fmt(calc.total);
    }

    $$('[data-cart-count]').forEach((el) => {
      el.textContent = items.length;
    });

    debug('Cart modal render complete');
  }

  function removeFromCart(sku) {
    const items = readCart().filter((i) => i.sku !== sku);
    writeCart(items);
    renderCartModal();
    showNotification('Paket entfernt', 'info');
    debug('Removed from cart:', sku);
  }

  function addToCart(sku, image) {
    const items = readCart();
    if (!items.find((i) => i.sku === sku)) {
      const entry = { sku, addedAt: Date.now() };
      // Store image from the DOM if provided
      if (image) entry.image = image;
      items.push(entry);
      writeCart(items);
      showNotification('Paket hinzugefügt', 'success');
    }
    openCartModal();
  }

  function showNotification(msg, type = 'info') {
    // Use global notification if available
    if (window.Notification && typeof window.Notification.show === 'function') {
      window.Notification.show(msg, type);
      return;
    }

    const el = document.createElement('div');
    el.style.cssText = `position:fixed;top:20px;right:20px;padding:16px 24px;background:${type === 'success' ? '#00a86b' : type === 'error' ? '#dc3545' : '#333'};color:white;border-radius:8px;z-index:10001;font-size:14px;box-shadow:0 4px 12px rgba(0,0,0,0.15);transition:opacity 0.3s;`;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 300);
    }, 3000);
  }

  function setupCartModal() {
    const m = getModal();
    if (!m) {
      debug('Cart modal not found, skipping setup');
      return;
    }

    m.style.display = 'none';
    m.style.opacity = '0';

    const closeBtn = $('.cart_moda-box_close-button', m);
    if (closeBtn) {
      closeBtn.style.cursor = 'pointer';
      closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeCartModal();
      });
      debug('Close button initialized');
    }

    const bg = $('.cart_modal-bg', m);
    if (bg) {
      bg.style.cursor = 'pointer';
      bg.addEventListener('click', (e) => {
        e.preventDefault();
        closeCartModal();
      });
      debug('Background click handler initialized');
    }

    const clearBtn = $('.button.is-link.is-secondary', m);
    if (clearBtn) {
      clearBtn.style.cursor = 'pointer';
      clearBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        clearCart();
        renderCartModal();
        showNotification('Warenkorb geleert', 'info');
      });
      debug('Clear cart button initialized');
    }

    const checkoutBtn = $('.cart_modal-list_item-button_wrap .button:not(.is-secondary)', m);
    if (checkoutBtn) {
      checkoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const items = readCart();
        if (items.length === 0) {
          showNotification('Warenkorb ist leer', 'error');
          return;
        }
        window.location.href = CONFIG.CHECKOUT_URL;
      });
      debug('Checkout button initialized');
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && m.style.display !== 'none') {
        closeCartModal();
      }
    });

    debug('Cart modal setup complete');
  }

  function setupCartTriggers() {
    const triggers = $$(
      '[data-cart-trigger], [data-cart="open"], .cart-icon, .cart-trigger, [href="#cart"]'
    );

    triggers.forEach((trigger) => {
      trigger.style.cursor = 'pointer';
      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openCartModal();
      });
    });

    debug('Cart triggers initialized:', triggers.length);

    // Delegated listener for cart open triggers
    document.addEventListener('click', (e) => {
      const cartIcon = e.target.closest('[data-cart-trigger], [data-open-cart]');
      if (cartIcon) {
        e.preventDefault();
        e.stopPropagation();
        openCartModal();
      }
    });

    // Global delegated listener for buy buttons on any page
    document.addEventListener('click', (e) => {
      const buyBtn = e.target.closest('[data-packages="btn-buy"]');
      if (!buyBtn) return;

      e.preventDefault();
      e.stopPropagation();

      // Try to find SKU from the card context
      const card = buyBtn.closest('[data-package-sku]');
      let sku = card ? card.getAttribute('data-package-sku') : null;

      // Fallback: check button's own data attribute
      if (!sku) sku = buyBtn.getAttribute('data-package-sku');

      // Fallback: detect from page URL slug
      if (!sku) {
        const slug = window.location.pathname.replace(/\/$/, '').split('/').pop();
        sku = SLUG_TO_SKU[slug];
      }

      if (!sku || !PACKAGES[sku]) {
        debug('Buy button clicked but no valid SKU found');
        return;
      }

      const pkg = PACKAGES[sku];
      // Try to grab image from nearest card or hero
      const imgEl = card
        ? (card.querySelector('[data-packages="img"]') || card.querySelector('img'))
        : document.querySelector('section img.cover-img, .b-test_head img.cover-img, img');
      const image = imgEl ? imgEl.src : '';

      debug('Global buy button clicked:', sku, image);
      addToCart(sku, image);
    });
  }

  function updateCartCount() {
    const items = readCart();
    $$('[data-cart-count]').forEach((el) => {
      el.textContent = items.length;
    });
  }

  // Setup add-to-cart buttons on /package-* pages
  function setupPackagePageButtons() {
    const path = window.location.pathname.replace(/\/$/, ''); // remove trailing slash
    const slug = path.split('/').pop(); // get last segment (e.g., "package-vitamin-d")
    const sku = SLUG_TO_SKU[slug];

    if (!sku) {
      debug('Not a package page or unknown slug:', slug);
      return;
    }

    const pkg = PACKAGES[sku];
    if (!pkg) {
      debug('Package not found for SKU:', sku);
      return;
    }

    debug('Package page detected:', slug, '-> SKU:', sku);

    // Find "In den Warenkorb" buttons - look for buttons with cart-related text or data attributes
    const addToCartButtons = $$('[data-cart="add-to-cart"], [data-add-to-cart], [data-hero="item"]');

    addToCartButtons.forEach((btn) => {
      // Check if button text contains "warenkorb" (case insensitive)
      const text = btn.textContent.toLowerCase();
      if (!text.includes('warenkorb')) return;

      debug('Found add-to-cart button:', btn);

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        // Grab the hero image from the page
        const heroImg = $('section img.cover-img, .b-test_head img.cover-img');
        const image = heroImg ? heroImg.src : '';

        debug('Add to cart clicked for package:', sku, 'image:', image);
        addToCart(sku, image);
      });
    });
  }

  // Initialize on DOM ready
  function init() {
    debug('Initializing global cart modal');
    setupCartModal();
    setupCartTriggers();
    setupPackagePageButtons();
    updateCartCount();

    window.addEventListener('cart-updated', () => {
      renderCartModal();
      updateCartCount();
    });

    // Expose global API
    window.CartModal = {
      open: openCartModal,
      close: closeCartModal,
      render: renderCartModal,
      getItems: readCart,
      clear: clearCart,
      add: addToCart,
      remove: removeFromCart,
      calculate: calculateCart,
      PACKAGES: PACKAGES,
    };

    debug('Global cart modal ready. Use CartModal.open() to open.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
