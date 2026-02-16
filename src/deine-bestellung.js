// ========================================
// ORDER PAGE - /deine-bestellung
// Depends on: global-cart-modal.js, global-auth.js
// ========================================

(function () {
  const CONFIG = {
    DEBUG: false,
    WEBHOOK_DEV:
      'https://lth-rec2-dev.orangegrass-967fbaa9.germanywestcentral.azurecontainerapps.io/api/v2/events/',
    WEBHOOK_KEY_DEV:
      '1KsF2jui1P9yUkL2SdvskKGjAqT2eaOCQKraY5wZaVbOfkROvtXeYdj6ZjUSSa0Q9dK7t5qzGK9ytKclSHl_qg',
    CALENDLY_BASE_URL: 'https://calendly.com/bluesphere-biomarker/bluttest',
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
    const navBottom = document.querySelector('.navbar')?.getBoundingClientRect().bottom || 80;
    const el = document.createElement('div');
    el.style.cssText = `position:fixed;top:${navBottom + 8}px;right:20px;padding:16px 24px;background:${type === 'success' ? '#00a86b' : type === 'error' ? '#dc3545' : '#333'};color:white;border-radius:8px;z-index:10001;font-size:14px;box-shadow:0 4px 12px rgba(0,0,0,0.15);transition:opacity 0.3s;`;
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

  let cartRetries = 0;
  function renderCart() {
    if (!window.CartModal) {
      if (cartRetries++ < 50) {
        debug.log('Waiting for CartModal...');
        setTimeout(renderCart, 100);
      } else {
        debug.log('CartModal not available after 5s, giving up');
      }
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

      // Remove previous empty state
      const orderCard = cartContainer?.closest('.order_card');
      const prevEmpty = orderCard?.querySelector('.cart-empty-state');
      if (prevEmpty) prevEmpty.remove();

      if (items.length === 0) {
        if (original) original.style.display = 'none';
        // Show empty state
        if (orderCard) {
          const emptyEl = document.createElement('div');
          emptyEl.className = 'cart-empty-state';
          emptyEl.style.cssText = 'text-align:center;padding:3rem 2rem;';
          emptyEl.innerHTML =
            '<p style="font-size:1.4rem;margin-bottom:1.5rem;color:#4B4B4E;">Füge ein Biomarker Paket zum Warenkorb hinzu</p>' +
            '<a href="/biomarker" class="button w-inline-block" style="display:inline-flex;text-decoration:none;">' +
            '<span>ZU DEN PAKETEN</span></a>';
          orderCard.appendChild(emptyEl);
        }
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
            const imgSrc = item.image || pkg.image || '';
            img.src = imgSrc;
            img.removeAttribute('srcset');
            img.removeAttribute('sizes');
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

    // Hide all order card content when cart is empty, show only empty state
    const orderCard = cartContainer?.closest('.order_card');
    if (orderCard) {
      Array.from(orderCard.children).forEach((child) => {
        if (!child.classList.contains('cart-empty-state')) {
          child.style.display = items.length === 0 ? 'none' : '';
        }
      });
    }

    // Update cart count
    $$('[data-cart-count]').forEach((el) => (el.textContent = items.length));

    debug.log('Cart render complete. Total:', fmt(calc.total));
  }

  // ========================================
  // INLINE CALENDLY
  // ========================================
  let calendlyInjected = false;

  function getSelectedPractice() {
    const practiceSelect = $(
      '#Praxis, [data-flow="practice-select"], #doctor-practice-select, select[name="Praxis"], select[name="practice"], select[name="doctor"]'
    );
    let practice = practiceSelect?.value;

    // Fallback: nice-select may not update the hidden select
    if (!practice && practiceSelect) {
      const niceSelect = practiceSelect.nextElementSibling;
      if (niceSelect && niceSelect.classList.contains('nice-select')) {
        const selected = niceSelect.querySelector('.option.selected');
        if (selected && selected.getAttribute('data-value')) {
          practice = selected.getAttribute('data-value');
        }
      }
    }
    return { practiceSelect, practice };
  }

  function updateAppointmentSection() {
    const headline = $('#choose-appointment-headline');
    const widgetContainer = $('.w-embed.w-iframe');
    const isAuth = window.Auth && window.Auth.isAuthenticated();
    const { practice } = getSelectedPractice();
    const show = isAuth && !!practice;

    debug.log('updateAppointmentSection, authenticated:', isAuth, 'practice:', practice);

    if (headline) headline.style.display = show ? '' : 'none';
    if (widgetContainer) widgetContainer.style.display = show ? '' : 'none';

    if (show && widgetContainer && !calendlyInjected) {
      injectInlineCalendly(widgetContainer);
      calendlyInjected = true;
    }

    if (!show && widgetContainer) {
      widgetContainer.innerHTML = '';
      calendlyInjected = false;
    }

    // Update Fortfahren button appearance
    updateFortfahrenButton();
  }

  function updateFortfahrenButton() {
    const btns = $$('[data-flow="btn-buy"], [data-cart="btn-buy"], [data-cart="checkout"]');
    const { practice } = getSelectedPractice();
    const enabled = !!practice;

    btns.forEach((btn) => {
      btn.style.opacity = enabled ? '' : '0.5';
      btn.style.pointerEvents = 'auto';
    });
  }

  function injectInlineCalendly(container) {
    const user = window.Auth ? window.Auth.getCurrentUser() : null;
    const name = user?.name || localStorage.getItem('userName') || '';
    const email = user?.email || localStorage.getItem('userEmail') || '';
    const nameParts = name.trim().split(/\s+/);

    let url = CONFIG.CALENDLY_BASE_URL + '?hide_gdpr_banner=1';
    if (name) url += '&name=' + encodeURIComponent(name);
    if (email) url += '&email=' + encodeURIComponent(email);

    container.innerHTML = '';
    container.style.overflow = 'visible';
    container.style.height = 'auto';
    container.style.minHeight = '1100px';
    const widget = document.createElement('div');
    widget.className = 'calendly-widget-container';
    widget.style.cssText = 'min-width:100%;height:1100px;';
    container.appendChild(widget);

    // Auto-resize to match Calendly iframe content height
    window.addEventListener('message', function calendlyResize(e) {
      if (e.data?.event === 'calendly.page_height' && e.data?.payload?.height) {
        const h = Math.ceil(parseFloat(e.data.payload.height));
        if (h > 0) {
          widget.style.height = h + 'px';
          container.style.minHeight = h + 'px';
          const iframe = widget.querySelector('iframe');
          if (iframe) iframe.style.height = h + 'px';
        }
      }
    });

    function initWidget() {
      debug.log('Initializing inline Calendly widget');
      try {
        window.Calendly.initInlineWidget({
          url: url,
          parentElement: widget,
          prefill: {
            firstName: nameParts[0] || '',
            lastName: nameParts.slice(1).join(' ') || '',
            email: email,
          },
        });
        // Apply widget styles directly (avoid adding calendly-inline-widget class
        // which triggers Calendly's auto-scan and creates a duplicate spinner)
        widget.style.fontSize = '16px';
        widget.style.lineHeight = '1.2em';
        const iframe = widget.querySelector('iframe');
        if (iframe) {
          iframe.style.display = 'inline';
          iframe.style.height = '100%';
          iframe.style.width = '100%';
          iframe.style.minHeight = '1100px';
        }
        debug.log('Inline Calendly widget initialized');
      } catch (err) {
        debug.error('Calendly.initInlineWidget failed:', err);
        const iframe = document.createElement('iframe');
        iframe.src = url;
        iframe.style.cssText = 'width:100%;height:100%;border:none;';
        widget.appendChild(iframe);
      }
    }

    if (window.Calendly) {
      initWidget();
    } else {
      if (!document.querySelector('link[href*="assets.calendly.com"]')) {
        const css = document.createElement('link');
        css.rel = 'stylesheet';
        css.href = 'https://assets.calendly.com/assets/external/widget.css';
        document.head.appendChild(css);
      }

      if (!document.querySelector('script[src*="assets.calendly.com"]')) {
        const script = document.createElement('script');
        script.src = 'https://assets.calendly.com/assets/external/widget.js';
        script.async = true;
        script.setAttribute('data-cookieconsent', 'ignore');
        script.onload = () => {
          if (window.Calendly) {
            initWidget();
          } else {
            debug.error('widget.js loaded but window.Calendly undefined');
          }
        };
        script.onerror = () => {
          debug.error('Failed to load Calendly widget.js');
          const iframe = document.createElement('iframe');
          iframe.src = url;
          iframe.style.cssText = 'width:100%;height:100%;border:none;';
          widget.appendChild(iframe);
        };
        document.head.appendChild(script);
      } else {
        const poll = setInterval(() => {
          if (window.Calendly) {
            clearInterval(poll);
            initWidget();
          }
        }, 100);
        setTimeout(() => clearInterval(poll), 5000);
      }
    }
  }

  // ========================================
  // PRACTICE SELECT LISTENER
  // ========================================
  function setupPracticeListener() {
    const { practiceSelect } = getSelectedPractice();
    if (practiceSelect) {
      practiceSelect.addEventListener('change', () => {
        debug.log('Practice changed');
        updateAppointmentSection();
      });
    }

    // Also observe nice-select clicks (nice-select doesn't fire native change reliably)
    document.addEventListener('click', (e) => {
      if (e.target.closest('.nice-select .option')) {
        setTimeout(() => {
          debug.log('Nice-select option clicked');
          updateAppointmentSection();
        }, 50);
      }
    });
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

        // Check practice first
        const { practiceSelect, practice } = getSelectedPractice();
        if (!practice) {
          showNotification('Bitte wähle eine Praxis', 'error');
          return;
        }

        // Then check auth — open register (not login) on deine-bestellung
        if (window.Auth && !window.Auth.isAuthenticated()) {
          showNotification('Bitte registriere dich oder melde dich an', 'info');
          window.Auth.openRegister();
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
        showNotification('Buchungsdaten gespeichert. Bitte Termin im Kalender unten wählen.', 'success');
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
        user_id: Number(booking.user_id) || 0,
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
    }
  });

  // ========================================
  // CONTROLS
  // ========================================
  function setupControls() {
    // Clear cart button
    const clearBtns = $$('[data-flow="cart-empty"], [data-cart="cart-empty"]');
    clearBtns.forEach((btn) => {
      btn.style.cursor = 'pointer';
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (window.CartModal) {
          window.CartModal.clear();
        }
        showNotification('Warenkorb geleert', 'info');
      });
    });
    debug.log('Clear cart buttons initialized:', clearBtns.length);

    // Back button
    const backBtn = $('.order_back');
    if (backBtn) {
      backBtn.style.cursor = 'pointer';
      backBtn.addEventListener('click', () => {
        if (window.history.length > 1) {
          window.history.back();
        } else {
          window.location.href = '/biomarker';
        }
      });
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
    setupPracticeListener();
    updateAuthUI();
    updateAppointmentSection();

    // Listen for cart updates
    window.addEventListener('cart-updated', () => {
      renderCart();
    });

    // Listen for auth changes
    window.addEventListener('auth-changed', () => {
      updateAuthUI();
      updateAppointmentSection();
    });

    debug.log('Order page ready');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
