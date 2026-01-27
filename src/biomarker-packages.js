// ========================================
// BIOMARKER PACKAGES PAGE - /biomarker-packages
// Depends on: global-cart-modal.js (CartModal API)
// ========================================

(function () {
  const CONFIG = {
    DEBUG: true,
    PACKAGE_IDS: {
      longterm_health: 1001,
      womens_health: 1002,
      mens_health: 1003,
      chronic_inflammation: 1004,
      iron_metabolism: 1005,
      heart_health: 1006,
      vitamin_b_metabolism: 1007,
      vitamin_d: 1008,
    },
  };

  const debug = {
    log: (...args) => CONFIG.DEBUG && console.log('[PACKAGES]', ...args),
    error: (...args) => console.error('[PACKAGES]', ...args),
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const fmt = (cents, currency = 'eur') =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(cents / 100);

  const fmtNumber = (cents) =>
    new Intl.NumberFormat('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(cents / 100);

  // Order of packages on the page (matches the card order in Webflow)
  const PACKAGE_ORDER = [
    'mens_health', // Card 1: Männergesundheit
    'womens_health', // Card 2: Frauengesundheit
    'longterm_health', // Card 3: Longtermhealth
    'iron_metabolism', // Card 4: Eisen-Metabolismus
    'vitamin_b_metabolism', // Card 5: Vitamin B
    'vitamin_d', // Card 6: Vitamin D
  ];

  // Get PACKAGES from CartModal (shared data)
  function getPackages() {
    if (window.CartModal && window.CartModal.PACKAGES) {
      return window.CartModal.PACKAGES;
    }
    debug.error('CartModal.PACKAGES not available - make sure global-cart-modal.js is loaded first');
    return {};
  }

  // ========================================
  // NOTIFICATION
  // ========================================
  function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 16px 24px;
      background: ${type === 'success' ? '#00a86b' : type === 'error' ? '#dc3545' : '#333'};
      color: white;
      border-radius: 8px;
      z-index: 10000;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      transition: opacity 0.3s ease;
    `;
    notification.innerHTML = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => notification.remove(), 300);
    }, 4000);
  }

  // ========================================
  // CART OPERATIONS (delegates to CartModal)
  // ========================================
  function addToCart(product, redirectToOrder = false) {
    debug.log('Adding item to cart:', product);

    if (!window.CartModal) {
      debug.error('CartModal not available');
      return;
    }

    const items = window.CartModal.getItems();
    const exists = items.some((i) => i.sku === product.sku);

    if (exists) {
      showNotification('Dieses Paket ist bereits im Warenkorb', 'info');
      if (redirectToOrder) {
        window.location.href = '/deine-bestellung';
      } else {
        window.CartModal.open();
      }
      return;
    }

    // Calculate potential savings
    const tempCart = [...items, { sku: product.sku }];
    const calculation = window.CartModal.calculate(tempCart);
    const currentCalc = window.CartModal.calculate(items);
    const savings = calculation.deductions - currentCalc.deductions;

    // Add to cart (pass image from product)
    window.CartModal.add(product.sku, product.image);

    if (savings > 0) {
      showNotification(
        `Paket hinzugefügt! Sie sparen ${fmt(savings)} durch bereits enthaltene Biomarker.`,
        'success'
      );
    }

    if (redirectToOrder) {
      setTimeout(() => {
        window.location.href = '/deine-bestellung';
      }, 500);
    }
  }

  // ========================================
  // FIND PACKAGE CARDS ON PAGE
  // ========================================
  function findPackageCards() {
    const titleElements = $$('[data-packages="title"]');
    const cards = [];

    titleElements.forEach((titleEl) => {
      let card = titleEl.parentElement;
      while (card && !card.classList.contains('w-dyn-item') && card.tagName !== 'SECTION') {
        const hasImg = card.querySelector('[data-packages="img"], [data-packages=" img"]');
        const hasPrice = card.querySelector('[data-packages="price"]');
        const hasListItems = card.querySelector('[data-packages="list-item-title"]');

        if (hasImg && hasPrice && hasListItems) {
          if (!cards.includes(card)) {
            cards.push(card);
          }
          break;
        }
        card = card.parentElement;
      }
    });

    debug.log(`Found ${cards.length} package cards`);
    return cards;
  }

  // ========================================
  // RENDER PACKAGE CARDS
  // ========================================
  function renderPackageCards() {
    debug.log('Rendering package cards...');

    const PACKAGES = getPackages();
    const cards = findPackageCards();

    if (cards.length === 0) {
      debug.error('No package cards found on the page!');
      return;
    }

    if (cards.length !== PACKAGE_ORDER.length) {
      debug.log(`Warning: Found ${cards.length} cards but expected ${PACKAGE_ORDER.length}`);
    }

    cards.forEach((card, index) => {
      const packageSku = PACKAGE_ORDER[index];
      if (!packageSku) {
        debug.error(`No package SKU defined for card index ${index}`);
        return;
      }

      const packageData = PACKAGES[packageSku];
      if (!packageData) {
        debug.error(`Package data not found for SKU: ${packageSku}`);
        return;
      }

      debug.log(`Rendering card ${index}: ${packageSku} (${packageData.name})`);

      card.setAttribute('data-package-sku', packageSku);

      // Update image
      const imgEl = card.querySelector('[data-packages="img"], [data-packages=" img"]');
      if (imgEl && packageData.image) {
        imgEl.src = packageData.image;
        imgEl.alt = packageData.name;
      }

      // Update title
      const titleEl = card.querySelector('[data-packages="title"]');
      if (titleEl) titleEl.textContent = packageData.name;

      // Update description
      const descEl = card.querySelector('[data-packages="desc"]');
      if (descEl && packageData.description) descEl.textContent = packageData.description;

      // Update price
      const priceEl = card.querySelector('[data-packages="price"]');
      if (priceEl) priceEl.textContent = fmtNumber(packageData.basePrice);

      // Update biomarker list
      renderBiomarkerList(card, packageData);

      // Setup click handler
      setupCardClickHandler(card, packageSku, packageData);
    });
  }

  function renderBiomarkerList(card, packageData) {
    const listItemTitles = card.querySelectorAll('[data-packages="list-item-title"]');
    const listItemPrices = card.querySelectorAll('[data-packages="list-item-price"]');

    const biomarkerEntries = Object.entries(packageData.biomarkers);

    listItemTitles.forEach((titleEl, index) => {
      if (index < biomarkerEntries.length) {
        const [biomarkerId, biomarker] = biomarkerEntries[index];
        titleEl.textContent = biomarker.name;

        if (listItemPrices[index]) {
          listItemPrices[index].textContent = fmt(biomarker.price);
        }

        const listItem =
          titleEl.closest('[data-packages="list-item"]') || titleEl.parentElement;
        if (listItem) listItem.style.display = '';
      } else {
        const listItem =
          titleEl.closest('[data-packages="list-item"]') || titleEl.parentElement;
        if (listItem) listItem.style.display = 'none';
      }
    });
  }

  function setupCardClickHandler(card, packageSku, packageData) {
    const buyBtn = card.querySelector('[data-packages="btn-buy"]');

    if (buyBtn) {
      debug.log(`Card ${packageSku}: Found buy button [data-packages="btn-buy"]`);

      buyBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        debug.log('Buy button clicked for:', packageSku);

        // Grab the image from the card DOM
        const cardImg = card.querySelector('[data-packages="img"], [data-packages=" img"]');

        const product = {
          sku: packageSku,
          name: packageData.name,
          price: packageData.basePrice,
          currency: 'eur',
          image: cardImg ? cardImg.src : '',
          priceId: CONFIG.PACKAGE_IDS[packageSku] || packageSku,
          qty: 1,
        };

        addToCart(product, false);
      });
    } else {
      // Fallback: look for button with is-cart class
      const cartBtn = card.querySelector('.is-cart, [class*="cart"]');
      if (cartBtn) {
        debug.log(`Card ${packageSku}: Found cart button by class`);

        cartBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          debug.log('Cart button clicked for:', packageSku);

          // Grab the image from the card DOM
          const cardImg = card.querySelector('[data-packages="img"], [data-packages=" img"]');

          const product = {
            sku: packageSku,
            name: packageData.name,
            price: packageData.basePrice,
            currency: 'eur',
            image: cardImg ? cardImg.src : '',
            priceId: CONFIG.PACKAGE_IDS[packageSku] || packageSku,
            qty: 1,
          };

          addToCart(product, false);
        });
      } else {
        debug.log(`Card ${packageSku}: No buy button found!`);
      }
    }
  }

  // ========================================
  // CART UI (sidebar on packages page)
  // ========================================
  let cartItemTemplate = null;
  let cartItemContainer = null;

  function initCartTemplate() {
    const cartItemTitle = document.querySelector('[data-cart="cart-item-title"]');
    if (!cartItemTitle) {
      debug.log('No cart item title found - cart template not available');
      return false;
    }

    let element = cartItemTitle.parentElement;
    while (element) {
      const hasImg = element.querySelector('[data-cart="cart-item-img"]');
      const hasPrice = element.querySelector('[data-cart="cart-item-price"]');
      if (hasImg && hasPrice) {
        cartItemTemplate = element.cloneNode(true);
        cartItemContainer = element.parentElement;
        element.setAttribute('data-cart-template', 'original');
        debug.log('Cart item template found and saved');
        return true;
      }
      element = element.parentElement;
    }

    debug.log('Could not find cart item template container');
    return false;
  }

  function renderCartUI() {
    if (!window.CartModal) return;

    const PACKAGES = getPackages();
    const items = window.CartModal.getItems();
    const calculation = window.CartModal.calculate(items);

    const totalPriceEl = document.querySelector('[data-cart="total-price"]');
    const totalPriceUnitEl = document.querySelector('[data-cart="total-price-unit"]');

    if (!cartItemTemplate) {
      initCartTemplate();
    }

    if (cartItemTemplate && cartItemContainer) {
      const clonedItems = cartItemContainer.querySelectorAll('[data-cart-cloned]');
      clonedItems.forEach((item) => item.remove());

      const originalTemplate = cartItemContainer.querySelector('[data-cart-template="original"]');
      if (originalTemplate) {
        originalTemplate.style.display = items.length === 0 ? 'none' : '';
      }

      items.forEach((item, index) => {
        const packageData = PACKAGES[item.sku];
        if (!packageData) return;

        const pkgPrice = calculation.prices.find((p) => p.sku === item.sku);

        let itemEl;
        if (index === 0 && originalTemplate) {
          itemEl = originalTemplate;
          itemEl.style.display = '';
        } else {
          itemEl = cartItemTemplate.cloneNode(true);
          itemEl.setAttribute('data-cart-cloned', 'true');
          itemEl.removeAttribute('data-cart-template');
          cartItemContainer.appendChild(itemEl);
        }

        itemEl.setAttribute('data-sku', item.sku);

        const imgEl = itemEl.querySelector('[data-cart="cart-item-img"]');
        if (imgEl) {
          imgEl.src = item.image || packageData.image;
          imgEl.alt = item.name || packageData.name;
        }

        const titleEl = itemEl.querySelector('[data-cart="cart-item-title"]');
        if (titleEl) titleEl.textContent = item.name || packageData.name;

        const descEl = itemEl.querySelector('[data-cart="cart-item-desc"]');
        if (descEl) {
          const biomarkerCount = Object.keys(packageData.biomarkers).length;
          descEl.textContent = `${biomarkerCount} Biomarker`;
        }

        const priceEl = itemEl.querySelector('[data-cart="cart-item-price"]');
        if (priceEl) {
          const displayPrice = pkgPrice ? pkgPrice.final : packageData.basePrice;
          priceEl.textContent = fmtNumber(displayPrice);
        }

        const priceUnitEl = itemEl.querySelector('[data-cart="cart-item-price-unit"]');
        if (priceUnitEl) priceUnitEl.textContent = '€';

        const removeBtn =
          itemEl.querySelector('[data-cart="remove-item"]') ||
          itemEl.querySelector('button') ||
          itemEl.querySelector('[class*="remove"]');
        if (removeBtn) {
          const newBtn = removeBtn.cloneNode(true);
          removeBtn.parentNode.replaceChild(newBtn, removeBtn);
          newBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            window.CartModal.remove(item.sku);
          });
        }
      });
    }

    if (totalPriceEl) totalPriceEl.textContent = fmtNumber(calculation.total);
    if (totalPriceUnitEl) totalPriceUnitEl.textContent = '€';

    // Update cart count badges
    $$('[data-cart-count]').forEach((el) => {
      el.textContent = items.length;
    });

    debug.log('Cart UI rendered:', {
      itemCount: items.length,
      total: calculation.total,
      deductions: calculation.deductions,
    });
  }

  // ========================================
  // CART CONTROLS
  // ========================================
  function setupCartControls() {
    const cartWrap = document.querySelector('[data-cart="wrap"]');

    const cartToggle = document.querySelector('[data-cart="toggle"]');
    if (cartToggle && cartWrap) {
      cartToggle.addEventListener('click', (e) => {
        e.preventDefault();
        const isOpen = cartWrap.getAttribute('data-modal-status') === 'active';
        cartWrap.setAttribute('data-modal-status', isOpen ? 'not-active' : 'active');
        if (!isOpen) {
          renderCartUI();
        }
      });
    }

    const closeBtn = document.querySelector('[data-cart="close"]');
    if (closeBtn && cartWrap) {
      closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        cartWrap.setAttribute('data-modal-status', 'not-active');
      });
    }

    const clearBtn = document.querySelector('[data-cart="cart-empty"]');
    if (clearBtn) {
      clearBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (window.CartModal) {
          window.CartModal.clear();
        }
        showNotification('Warenkorb wurde geleert', 'info');
      });
    }

    debug.log('Cart controls setup complete');
  }

  // ========================================
  // CHECKOUT HANDLER
  // ========================================
  function setupCheckout() {
    document.addEventListener(
      'click',
      (ev) => {
        const targetBtn = ev.target?.closest(
          '[data-cart="btn-buy"], #wf-checkout, [data-cart="checkout"]'
        );
        if (!targetBtn) return;

        debug.log('Checkout button clicked - redirecting to order page');

        ev.preventDefault();
        ev.stopPropagation();

        if (!window.CartModal) return;

        const items = window.CartModal.getItems();
        if (items.length === 0) {
          showNotification('Warenkorb ist leer.', 'error');
          return;
        }

        window.location.href = '/deine-bestellung';
      },
      true
    );
  }

  // ========================================
  // INITIALIZATION
  // ========================================
  function init() {
    debug.log('=== Biomarker package page initializing ===');

    // Wait for CartModal to be available
    if (!window.CartModal) {
      debug.log('Waiting for CartModal...');
      setTimeout(init, 100);
      return;
    }

    renderPackageCards();
    renderCartUI();
    setupCartControls();
    setupCheckout();

    // Listen for cart updates
    window.addEventListener('cart-updated', () => {
      renderCartUI();
    });

    debug.log('=== Biomarker package page initialized ===');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
