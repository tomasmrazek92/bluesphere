// ========================================
// ORDER PAGE - /deine-bestellung
// Depends on: global-cart-modal.js, global-auth.js
// ========================================

(function () {
  const CONFIG = {
    DEBUG: true,
    WEBHOOK_DEV:
      'https://lth-rec2-dev.orangegrass-967fbaa9.germanywestcentral.azurecontainerapps.io/api/v2/events/',
    WEBHOOK_KEY_DEV:
      '1KsF2jui1P9yUkL2SdvskKGjAqT2eaOCQKraY5wZaVbOfkROvtXeYdj6ZjUSSa0Q9dK7t5qzGK9ytKclSHl_qg',
    CALENDLY_BASE_URL: 'https://calendly.com/j-erdweg-longtermhealth/biomarker-bluttest',
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
    log: (...args) => CONFIG.DEBUG && console.log('[ORDER]', ...args),
    error: (...args) => console.error('[ORDER]', ...args),
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const fmt = (cents) =>
    new Intl.NumberFormat('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(cents / 100);

  // Get PACKAGES from CartModal
  function getPackages() {
    if (window.CartModal && window.CartModal.PACKAGES) {
      return window.CartModal.PACKAGES;
    }
    debug.error('CartModal.PACKAGES not available');
    return {};
  }

  // ========================================
  // NOTIFICATION
  // ========================================
  function showNotification(msg, type = 'info') {
    const el = document.createElement('div');
    el.style.cssText = `position:fixed;top:20px;right:20px;padding:16px 24px;background:${type === 'success' ? '#00a86b' : type === 'error' ? '#dc3545' : '#333'};color:white;border-radius:8px;z-index:10001;font-size:14px;box-shadow:0 4px 12px rgba(0,0,0,0.15);transition:opacity 0.3s;`;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 300);
    }, 3000);
  }

  // ========================================
  // CART DISPLAY
  // ========================================
  let cartTemplate = null;
  let cartContainer = null;

  function renderCart() {
    if (!window.CartModal) {
      debug.log('Waiting for CartModal...');
      setTimeout(renderCart, 100);
      return;
    }

    const PACKAGES = getPackages();
    const items = window.CartModal.getItems();
    const calc = window.CartModal.calculate(items);

    debug.log('Rendering cart:', items.length, 'items', calc);

    // Init template
    if (!cartTemplate) {
      const cartItem = $('[data-flow="cart-item"]');
      if (cartItem) {
        cartTemplate = cartItem.cloneNode(true);
        cartContainer = cartItem.parentElement;
        cartItem.setAttribute('data-template', 'original');
        debug.log('Cart template initialized');
      }
    }

    // Clear cloned items
    if (cartContainer) {
      $$('[data-cloned]', cartContainer).forEach((el) => el.remove());
    }

    // Render items
    if (cartTemplate && cartContainer) {
      const original = $('[data-template="original"]', cartContainer);

      if (items.length === 0) {
        if (original) original.style.display = 'none';
      } else {
        items.forEach((item, i) => {
          const pkg = PACKAGES[item.sku];
          if (!pkg) return;
          const priceInfo = calc.prices.find((p) => p.sku === item.sku);

          let el;
          if (i === 0 && original) {
            el = original;
            el.style.display = '';
          } else {
            el = cartTemplate.cloneNode(true);
            el.setAttribute('data-cloned', 'true');
            el.removeAttribute('data-template');
            cartContainer.appendChild(el);
          }

          el.setAttribute('data-sku', item.sku);

          const img = $('[data-flow="cart-item-img"]', el);
          if (img) {
            img.src = pkg.image;
            img.alt = pkg.name;
          }

          const title = $('[data-flow="cart-item-title"]', el);
          if (title) title.textContent = pkg.name;

          const desc = $('[data-flow="cart-item-desc"]', el);
          if (desc) desc.textContent = `${Object.keys(pkg.biomarkers).length} Biomarker`;

          const price = $('[data-flow="cart-item-price"]', el);
          if (price) price.textContent = fmt(priceInfo?.final || pkg.basePrice);

          const priceUnit = $('[data-flow="cart-item-price-unit"]', el);
          if (priceUnit) priceUnit.textContent = '€';

          // Remove button
          const removeBtn = $('[data-flow="cart-item-remove"]', el);
          if (removeBtn) {
            const newBtn = removeBtn.cloneNode(true);
            removeBtn.parentNode.replaceChild(newBtn, removeBtn);
            newBtn.style.cursor = 'pointer';
            newBtn.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              window.CartModal.remove(item.sku);
              showNotification('Paket entfernt', 'info');
            });
          }
        });
      }
    }

    // Update totals
    const totalEl = $('[data-flow="total-price"]');
    if (totalEl) totalEl.textContent = fmt(calc.total);

    const totalUnitEl = $('[data-flow="total-price-unit"]');
    if (totalUnitEl) totalUnitEl.textContent = '€';

    // Update cart count
    $$('[data-cart-count]').forEach((el) => (el.textContent = items.length));

    debug.log('Cart render complete. Total:', fmt(calc.total));
  }

  // ========================================
  // CALENDLY
  // ========================================
  function buildCalendlyUrl(data) {
    const nameParts = (data.name || '').trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    const params = new URLSearchParams({
      first_name: firstName,
      last_name: lastName,
      email: data.email,
      a1: `Praxis: ${data.practice}`,
      a2: `Preis: €${fmt(data.total)}`,
      a3: `Pakete: ${data.packages}`,
    });
    return `${CONFIG.CALENDLY_BASE_URL}?${params}`;
  }

  function showCalendly(url, data) {
    const container = document.createElement('div');
    container.id = 'calendly-container';
    container.style.cssText =
      'position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:10000;display:flex;align-items:center;justify-content:center;';
    container.innerHTML = `
      <div style="width:90%;max-width:1000px;height:90%;background:white;border-radius:12px;overflow:hidden;display:flex;flex-direction:column;">
        <div style="display:flex;justify-content:space-between;padding:16px 24px;border-bottom:1px solid #eee;">
          <h3 style="margin:0;">Termin buchen</h3>
          <button onclick="document.getElementById('calendly-container').remove()" style="background:none;border:none;font-size:24px;cursor:pointer;">×</button>
        </div>
        <div class="calendly-inline-widget" data-url="${url}" style="flex:1;"></div>
      </div>`;
    document.body.appendChild(container);

    const widgetEl = container.querySelector('.calendly-inline-widget');
    debug.log('Calendly widget container ready, loading widget.js...');

    function initWidget() {
      debug.log('Calling Calendly.initInlineWidget, window.Calendly:', !!window.Calendly);
      try {
        const nameParts = (data.name || '').trim().split(/\s+/);
        window.Calendly.initInlineWidget({
          url: url,
          parentElement: widgetEl,
          prefill: {
            firstName: nameParts[0] || '',
            lastName: nameParts.slice(1).join(' ') || '',
            email: data.email,
          },
        });
        debug.log('Calendly.initInlineWidget called successfully');
      } catch (err) {
        debug.error('Calendly.initInlineWidget failed:', err);
        // Fallback to direct iframe
        debug.log('Falling back to direct iframe');
        const iframe = document.createElement('iframe');
        iframe.src = url;
        iframe.style.cssText = 'width:100%;height:100%;border:none;';
        widgetEl.appendChild(iframe);
      }
    }

    if (window.Calendly) {
      initWidget();
    } else {
      // Load Calendly widget CSS
      if (!document.querySelector('link[href*="assets.calendly.com"]')) {
        const css = document.createElement('link');
        css.rel = 'stylesheet';
        css.href = 'https://assets.calendly.com/assets/external/widget.css';
        document.head.appendChild(css);
      }

      // Load Calendly widget JS
      const script = document.createElement('script');
      script.src = 'https://assets.calendly.com/assets/external/widget.js';
      script.type = 'text/javascript';
      script.async = true;
      script.setAttribute('data-cookieconsent', 'ignore');
      script.onload = () => {
        debug.log('Calendly widget.js loaded, window.Calendly:', !!window.Calendly);
        if (window.Calendly) {
          initWidget();
        } else {
          debug.error('widget.js loaded but window.Calendly still undefined');
        }
      };
      script.onerror = (err) => {
        debug.error('Failed to load Calendly widget.js:', err);
        // Fallback to direct iframe
        const iframe = document.createElement('iframe');
        iframe.src = url;
        iframe.style.cssText = 'width:100%;height:100%;border:none;';
        widgetEl.appendChild(iframe);
      };
      document.head.appendChild(script);
    }
  }

  // ========================================
  // CHECKOUT HANDLER
  // ========================================
  function setupCheckout() {
    document.addEventListener(
      'click',
      (e) => {
        const btn = e.target?.closest(
          '[data-flow="btn-buy"], [data-cart="btn-buy"], [data-cart="checkout"]'
        );
        if (!btn) return;

        e.preventDefault();
        e.stopPropagation();
        debug.log('Checkout clicked');

        // Check auth (using global Auth module)
        if (window.Auth && !window.Auth.isAuthenticated()) {
          showNotification('Bitte melden Sie sich an', 'info');
          window.Auth.openModal();
          return;
        }

        if (!window.CartModal) {
          debug.error('CartModal not available');
          return;
        }

        const items = window.CartModal.getItems();
        if (items.length === 0) {
          showNotification('Warenkorb ist leer', 'error');
          return;
        }

        // Check doctor selection (also check nice-select selected value)
        const practiceSelect = $(
          '#Praxis, [data-flow="practice-select"], #doctor-practice-select, select[name="Praxis"], select[name="practice"], select[name="doctor"]'
        );
        let practice = practiceSelect?.value;

        // Fallback: nice-select may not update the hidden select, read from nice-select UI
        if (!practice && practiceSelect) {
          const niceSelect = practiceSelect.nextElementSibling;
          if (niceSelect && niceSelect.classList.contains('nice-select')) {
            const selected = niceSelect.querySelector('.option.selected');
            if (selected && selected.getAttribute('data-value')) {
              practice = selected.getAttribute('data-value');
            }
          }
        }
        if (!practice) {
          showNotification('Bitte wählen Sie eine Arztpraxis', 'error');
          return;
        }

        const PACKAGES = getPackages();
        const calc = window.CartModal.calculate(items);
        const user = window.Auth ? window.Auth.getCurrentUser() : null;

        const bookingData = {
          user_id: user?.id || localStorage.getItem('userId') || '',
          name: user?.name || 'Guest',
          email: user?.email || '',
          practice: practiceSelect?.options?.[practiceSelect.selectedIndex]?.text || practice,
          total: calc.total,
          packages: items.map((i) => PACKAGES[i.sku]?.name).join(', '),
          items: items,
        };

        sessionStorage.setItem('pending_booking', JSON.stringify(bookingData));
        showCalendly(buildCalendlyUrl(bookingData), bookingData);
      },
      true
    );
  }

  // Calendly event listener - log ALL postMessages from Calendly
  window.addEventListener('message', (e) => {
    // Log all Calendly-related messages
    if (e.origin && e.origin.includes('calendly')) {
      debug.log('Calendly postMessage received:', {
        origin: e.origin,
        event: e.data?.event,
        data: e.data,
      });
    }

    if (e.data?.event === 'calendly.event_scheduled') {
      debug.log('Booking completed!');
      const booking = JSON.parse(sessionStorage.getItem('pending_booking') || '{}');
      debug.log('Booking data from session:', booking);

      const payload = {
        event_type: 'blood_test_booked',
        user_id: booking.user_id || '',
        event_data: {
          ...booking,
          calendly_event: e.data?.payload || {},
        },
      };
      debug.log('Sending webhook payload:', payload);
      debug.log('Webhook URL:', CONFIG.WEBHOOK_DEV);

      // Send to webhook
      fetch(CONFIG.WEBHOOK_DEV, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': CONFIG.WEBHOOK_KEY_DEV,
        },
        body: JSON.stringify(payload),
      })
        .then((res) => {
          debug.log('Webhook response:', res.status, res.statusText);
          return res.text();
        })
        .then((body) => debug.log('Webhook response body:', body))
        .catch((err) => debug.error('Webhook error:', err));

      if (window.CartModal) {
        window.CartModal.clear();
      }
      showNotification('Termin erfolgreich gebucht!', 'success');
      setTimeout(() => document.getElementById('calendly-container')?.remove(), 2000);
    }
  });

  // ========================================
  // CONTROLS
  // ========================================
  function setupControls() {
    // Clear cart button
    const clearBtn = $('[data-flow="cart-empty"], [data-cart="cart-empty"]');
    if (clearBtn) {
      clearBtn.style.cursor = 'pointer';
      clearBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (window.CartModal) {
          window.CartModal.clear();
        }
        showNotification('Warenkorb geleert', 'info');
      });
      debug.log('Clear cart button initialized');
    }
  }

  // ========================================
  // AUTH STATE
  // ========================================
  function updateAuthUI() {
    if (window.Auth) {
      window.Auth.updateUI();
    }
  }

  // ========================================
  // INIT
  // ========================================
  function init() {
    debug.log('Order page initializing');

    renderCart();
    setupControls();
    setupCheckout();
    updateAuthUI();

    // Listen for cart updates
    window.addEventListener('cart-updated', () => {
      renderCart();
    });

    // Listen for auth changes
    window.addEventListener('auth-changed', () => {
      updateAuthUI();
    });

    debug.log('Order page ready');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
