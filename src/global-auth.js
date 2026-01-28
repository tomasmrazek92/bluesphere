// ========================================
// GLOBAL AUTH MODULE - Works on every page
// Exposes: window.Auth
// ========================================

(function () {
  const CONFIG = {
    API_BASE: 'https://bluesphere.dev.longtermhealth.de',
    DEBUG: true,
  };

  const AUTH_CONFIG = {
    TOKEN_KEY: 'auth_token',
    REFRESH_KEY: 'refresh_token',
    USER_KEY: 'user_data',
  };

  // Debug helpers
  const debug = {
    log: (...args) => CONFIG.DEBUG && console.log('[AUTH]', ...args),
    error: (...args) => console.error('[AUTH]', ...args),
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  // ========================================
  // SECURE STORAGE
  // ========================================
  const SecureStorage = {
    set: function (key, value, expiryMinutes = 60) {
      const item = {
        value: value,
        expiry: new Date().getTime() + expiryMinutes * 60 * 1000,
      };
      try {
        sessionStorage.setItem(key, JSON.stringify(item));
      } catch (e) {
        debug.error('Storage error:', e);
      }
    },

    get: function (key) {
      try {
        const itemStr = sessionStorage.getItem(key);
        if (!itemStr) return null;

        const item = JSON.parse(itemStr);
        const now = new Date().getTime();

        if (now > item.expiry) {
          sessionStorage.removeItem(key);
          return null;
        }

        return item.value;
      } catch (e) {
        return null;
      }
    },

    remove: function (key) {
      sessionStorage.removeItem(key);
    },
  };

  // ========================================
  // API HELPERS
  // ========================================
  async function apiCall(endpoint, options = {}) {
    const url = CONFIG.API_BASE + endpoint;
    const token = SecureStorage.get(AUTH_CONFIG.TOKEN_KEY);

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    debug.log('API Call:', endpoint, options.method || 'GET');

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      debug.log('API Response:', response.status);
      return response;
    } catch (error) {
      debug.error('API error:', error);
      throw error;
    }
  }

  // ========================================
  // AUTH FUNCTIONS
  // ========================================
  let pendingRegistration = {
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  };

  async function register(formData) {
    const { firstName, lastName, email, password, dateOfBirth, gender } = formData;

    debug.log('Registering user:', email);

    const payload = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
      password: password,
      dateOfBirth: dateOfBirth,
      gender: gender,
      role: 'PATIENT',
    };

    const response = await apiCall('/user/registration', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.statusMessage || error.message || 'Registrierung fehlgeschlagen');
    }

    const data = await response.json();
    debug.log('Registration successful:', data);

    SecureStorage.set(AUTH_CONFIG.USER_KEY, {
      name: `${firstName} ${lastName}`,
      email: email,
      id: data.userId || data.id,
    });

    return data;
  }

  async function login(email, password) {
    debug.log('Logging in user:', email);

    const response = await apiCall('/user/login', {
      method: 'POST',
      body: JSON.stringify({
        email: email.toLowerCase().trim(),
        password: password,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.statusMessage || error.message || 'Anmeldung fehlgeschlagen');
    }

    const data = await response.json();
    debug.log('Login response:', data);

    const result = data.result || data;
    const user = result.user || result;
    const token = result.token || result.accessToken || data.token || data.accessToken;
    const refreshToken = result.refreshToken || data.refreshToken;

    if (token) {
      SecureStorage.set(AUTH_CONFIG.TOKEN_KEY, token);
      debug.log('Token stored');
    } else {
      debug.log('Warning: No token in login response');
    }
    if (refreshToken) {
      SecureStorage.set(AUTH_CONFIG.REFRESH_KEY, refreshToken, 60 * 24 * 7);
    }

    const userData = {
      name: user.firstName ? `${user.firstName} ${user.lastName}` : user.name,
      email: user.email || email,
      id: user.id,
    };
    SecureStorage.set(AUTH_CONFIG.USER_KEY, userData);

    // Also store in localStorage for cross-page access (Calendly, booking flow)
    localStorage.setItem('userName', userData.name);
    localStorage.setItem('userEmail', userData.email);
    localStorage.setItem('userId', String(userData.id));

    debug.log('Login successful');
    window.dispatchEvent(new CustomEvent('auth-changed', { detail: { authenticated: true } }));
    return user;
  }

  async function verifyEmail(code) {
    debug.log('Verifying email with code:', code);

    const response = await apiCall('/user/confirmation', {
      method: 'POST',
      body: JSON.stringify({ code: code.trim() }),
    });

    if (!response.ok && response.status !== 201) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.statusMessage || error.message || 'Verifizierung fehlgeschlagen');
    }

    const data = await response.json();
    debug.log('Verification successful:', data);

    if (data.token || data.accessToken) {
      SecureStorage.set(AUTH_CONFIG.TOKEN_KEY, data.token || data.accessToken);
    }

    window.dispatchEvent(new CustomEvent('auth-changed', { detail: { authenticated: true } }));
    return data;
  }

  async function resendCode() {
    debug.log('Resending verification code');

    const userData = SecureStorage.get(AUTH_CONFIG.USER_KEY);
    if (!userData?.email) {
      throw new Error('Keine E-Mail-Adresse gefunden');
    }

    const response = await apiCall('/user/verification-code-resend', {
      method: 'POST',
      body: JSON.stringify({ email: userData.email }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.statusMessage || error.message || 'Code konnte nicht gesendet werden');
    }

    return true;
  }

  function isAuthenticated() {
    const token = SecureStorage.get(AUTH_CONFIG.TOKEN_KEY);
    const userData = SecureStorage.get(AUTH_CONFIG.USER_KEY);
    return !!(token || userData);
  }

  function getCurrentUser() {
    return SecureStorage.get(AUTH_CONFIG.USER_KEY);
  }

  function logout() {
    SecureStorage.remove(AUTH_CONFIG.TOKEN_KEY);
    SecureStorage.remove(AUTH_CONFIG.REFRESH_KEY);
    SecureStorage.remove(AUTH_CONFIG.USER_KEY);
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userId');
    window.dispatchEvent(new CustomEvent('auth-changed', { detail: { authenticated: false } }));
    debug.log('User logged out');
  }

  // ========================================
  // AUTH UI - MODAL INTEGRATION
  // ========================================
  let currentStep = 0;
  let authMode = 'login';

  function getRegisterModal() {
    return $('[data-modal-name="register"]');
  }

  function getFormSteps() {
    const registerModal = getRegisterModal();
    if (registerModal) {
      return $$('[data-register="form-step"]', registerModal);
    }
    return $$('[data-register="form-step"]');
  }

  function showStep(stepIndex) {
    const steps = getFormSteps();
    steps.forEach((step, i) => {
      step.style.display = i === stepIndex ? 'block' : 'none';
    });
    currentStep = stepIndex;
    debug.log('Showing step:', stepIndex);
  }

  function showRegisterStep() {
    const steps = getFormSteps();
    for (let i = 0; i < steps.length; i++) {
      const type = steps[i].getAttribute('data-register-type');
      if (type === 'register') {
        showStep(i);
        authMode = 'register';
        return;
      }
    }
  }

  function showLoginStep() {
    const steps = getFormSteps();
    for (let i = 0; i < steps.length; i++) {
      const type =
        steps[i].getAttribute('data-registe-type') || steps[i].getAttribute('data-register-type');
      if (type === 'sign-in') {
        showStep(i);
        authMode = 'login';
        return;
      }
    }
  }

  function showCodeStep() {
    const steps = getFormSteps();
    for (let i = 0; i < steps.length; i++) {
      const type = steps[i].getAttribute('data-register-type');
      if (type === 'code') {
        showStep(i);
        return;
      }
    }
  }

  function showInitialStep() {
    showStep(0);
  }

  function openModal() {
    debug.log('Opening register modal');

    if (typeof window.openModal === 'function') {
      window.openModal('register');
      setTimeout(() => {
        showInitialStep();
      }, 100);
    } else {
      // Manual open
      const modalTarget = $('[data-modal-target="register"]');
      const modalName = $('[data-modal-name="register"]');
      const modalGroup = $('[data-modal-group-status]');

      if (modalTarget) modalTarget.setAttribute('data-modal-status', 'active');
      if (modalName) modalName.setAttribute('data-modal-status', 'active');
      if (modalGroup) modalGroup.setAttribute('data-modal-group-status', 'active');

      setTimeout(() => {
        showInitialStep();
      }, 100);
    }
  }

  function closeModal() {
    if (typeof window.closeAllModals === 'function') {
      window.closeAllModals();
    } else {
      const modalTarget = $('[data-modal-target="register"]');
      const modalName = $('[data-modal-name="register"]');
      const modalGroup = $('[data-modal-group-status]');

      if (modalTarget) modalTarget.setAttribute('data-modal-status', 'not-active');
      if (modalName) modalName.setAttribute('data-modal-status', 'not-active');
      if (modalGroup) modalGroup.setAttribute('data-modal-group-status', 'not-active');
    }
  }

  function showFormError(form, message) {
    let errorEl = form.querySelector('.auth-error-message');
    if (!errorEl) {
      errorEl = document.createElement('div');
      errorEl.className = 'auth-error-message';
      errorEl.style.cssText =
        'color: #dc3545; padding: 10px; margin: 10px 0; background: #f8d7da; border-radius: 4px; font-size: 14px;';
      const firstField = form.querySelector('.form_field-wrap');
      if (firstField) {
        firstField.parentNode.insertBefore(errorEl, firstField);
      } else {
        form.prepend(errorEl);
      }
    }
    errorEl.textContent = message;
    errorEl.style.display = 'block';

    setTimeout(() => {
      errorEl.style.display = 'none';
    }, 5000);
  }

  function clearFormErrors() {
    $$('.auth-error-message').forEach((el) => (el.style.display = 'none'));
  }

  function setButtonLoading(button, loading) {
    if (loading) {
      button.setAttribute('data-loading', 'true');
      button.style.opacity = '0.7';
      button.style.pointerEvents = 'none';
    } else {
      button.removeAttribute('data-loading');
      button.style.opacity = '1';
      button.style.pointerEvents = 'auto';
    }
  }

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

  function setupAuthHandlers() {
    debug.log('Setting up auth handlers');

    const registerModal = getRegisterModal();
    if (!registerModal) {
      debug.log('Register modal not found');
      return;
    }

    const form = $('[data-register="form-wrap"]', registerModal);
    if (!form) {
      debug.log('Auth form not found in register modal');
      return;
    }

    debug.log('Found form in register modal');

    form.addEventListener('submit', (e) => {
      e.preventDefault();
    });

    // ===== STEP 1: Initial options =====
    const emailSigninBtn = $('[data-register="email-signin"]', registerModal);
    if (emailSigninBtn) {
      emailSigninBtn.addEventListener('click', (e) => {
        e.preventDefault();
        debug.log('Email signin clicked');
        showLoginStep();
      });
    }

    const registerLinks = $$('[data-register="register-link"]', registerModal);
    registerLinks.forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        debug.log('Register link clicked');
        showRegisterStep();
      });
    });

    const loginLinks = $$('[data-register="login-link"]', registerModal);
    loginLinks.forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        debug.log('Login link clicked');
        showLoginStep();
      });
    });

    const backBtns = $$('[data-register="btn-back"]', registerModal);
    backBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        debug.log('Back button clicked');
        showInitialStep();
      });
    });

    // ===== REGISTRATION FLOW =====
    const nextBtn = $('[data-register="btn-next"]', registerModal);
    if (nextBtn) {
      nextBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        debug.log('Next button clicked (register)');
        clearFormErrors();

        const firstName =
          $('#first_name', registerModal)?.value ||
          $('input[name="first_name"]', registerModal)?.value ||
          '';
        const lastName =
          $('#last_name', registerModal)?.value ||
          $('input[name="last_name"]', registerModal)?.value ||
          '';
        const email =
          $('#email-sign-in', registerModal)?.value ||
          $('input[name="email-sign-in"]', registerModal)?.value ||
          '';
        const password =
          $('#password-signin', registerModal)?.value ||
          $('input[name="password-signin"]', registerModal)?.value ||
          '';
        const passwordConfirm =
          $('#password-signin-again', registerModal)?.value ||
          $('input[name="password-signin-again"]', registerModal)?.value ||
          '';

        debug.log('Form values:', { firstName, lastName, email, hasPassword: !!password });

        if (!firstName || !lastName) {
          showFormError(form, 'Bitte Vor- und Nachnamen eingeben');
          return;
        }

        if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
          showFormError(form, 'Bitte eine gültige E-Mail-Adresse eingeben');
          return;
        }

        if (!password || password.length < 8 ||
            !/[A-Z]/.test(password) || !/[a-z]/.test(password) ||
            !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
          showFormError(form, 'Passwort: min. 8 Zeichen, 1 Großbuchstabe, 1 Kleinbuchstabe, 1 Zahl und 1 Sonderzeichen');
          return;
        }

        if (password !== passwordConfirm) {
          showFormError(form, 'Passwörter stimmen nicht überein');
          return;
        }

        const dateOfBirthRaw =
          $('#date-of-birth', registerModal)?.value ||
          $('input[name="date-of-birth"]', registerModal)?.value ||
          $('input[name="dateOfBirth"]', registerModal)?.value ||
          $('input[type="date"]', registerModal)?.value ||
          '';

        if (!dateOfBirthRaw) {
          showFormError(form, 'Bitte Geburtsdatum eingeben');
          return;
        }

        // Ensure ISO 8601 format (YYYY-MM-DD)
        const dateOfBirth = new Date(dateOfBirthRaw).toISOString().split('T')[0];

        const gender =
          $('#gender-register', registerModal)?.value ||
          $('select[name="gender-register"]', registerModal)?.value ||
          $('select[name="gender"]', registerModal)?.value ||
          '';

        if (!gender) {
          showFormError(form, 'Bitte Geschlecht auswählen');
          return;
        }

        pendingRegistration = { firstName, lastName, email, password, dateOfBirth, gender };

        setButtonLoading(nextBtn, true);

        try {
          await register(pendingRegistration);
          showNotification('Registrierung erfolgreich! Bitte Code eingeben.', 'success');
          showCodeStep();
        } catch (error) {
          debug.error('Registration error:', error);
          showFormError(form, error.message);
        } finally {
          setButtonLoading(nextBtn, false);
        }
      });
    }

    // ===== LOGIN FLOW =====
    const signinBtn = $('[data-register="btn-signin"]', registerModal);
    if (signinBtn) {
      signinBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        debug.log('Signin button clicked');
        clearFormErrors();

        const email =
          $('#email-login', registerModal)?.value ||
          $('input[name="email-login"]', registerModal)?.value ||
          '';
        const password =
          $('#password-login', registerModal)?.value ||
          $('input[name="password-login"]', registerModal)?.value ||
          '';

        debug.log('Login attempt:', email);

        if (!email || !password) {
          showFormError(form, 'Bitte E-Mail und Passwort eingeben');
          return;
        }

        setButtonLoading(signinBtn, true);

        try {
          await login(email, password);
          showNotification('Anmeldung erfolgreich!', 'success');
          closeModal();
          updateAuthUI();
          openCalendlyModal();
        } catch (error) {
          debug.error('Login error:', error);
          showFormError(form, error.message);
        } finally {
          setButtonLoading(signinBtn, false);
        }
      });
    }

    // ===== CODE VERIFICATION =====
    const codeInputs = $$('input[name^="code-"]', registerModal);
    codeInputs.forEach((input, index) => {
      input.addEventListener('input', (e) => {
        const value = e.target.value;
        if (value.length === 1 && index < codeInputs.length - 1) {
          codeInputs[index + 1].focus();
        }
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !e.target.value && index > 0) {
          codeInputs[index - 1].focus();
        }
      });
    });

    const codeConfirmBtn = $('[data-register="btn-code-confirm"]', registerModal);
    if (codeConfirmBtn) {
      codeConfirmBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        debug.log('Code confirm clicked');
        clearFormErrors();

        let code = '';
        codeInputs.forEach((input) => {
          code += input.value;
        });

        debug.log('Code entered:', code);

        if (code.length !== 6) {
          showFormError(form, 'Bitte den vollständigen 6-stelligen Code eingeben');
          return;
        }

        setButtonLoading(codeConfirmBtn, true);

        try {
          await verifyEmail(code);
          showNotification('E-Mail erfolgreich verifiziert!', 'success');
          closeModal();
          updateAuthUI();
        } catch (error) {
          debug.error('Verification error:', error);
          showFormError(form, error.message);
        } finally {
          setButtonLoading(codeConfirmBtn, false);
        }
      });
    }

    const resendLink = $('[data-register="code-resend"]', registerModal);
    if (resendLink) {
      resendLink.addEventListener('click', async (e) => {
        e.preventDefault();
        debug.log('Resend code clicked');

        try {
          await resendCode();
          showNotification('Code wurde erneut gesendet', 'success');
        } catch (error) {
          debug.error('Resend error:', error);
          showNotification(error.message, 'error');
        }
      });
    }

    const forgetLink = $('[data-register="password-forget"]', registerModal);
    if (forgetLink) {
      forgetLink.addEventListener('click', (e) => {
        e.preventDefault();
        debug.log('Password forget clicked');
        showNotification('Passwort-Reset wird noch implementiert', 'info');
      });
    }

    const googleBtn = $('[data-register="google-signin"]', registerModal);
    if (googleBtn) {
      googleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        debug.log('Google signin clicked');
        showNotification('Google-Anmeldung wird noch implementiert', 'info');
      });
    }

    const appleBtn = $('[data-register="apple-signin"]', registerModal);
    if (appleBtn) {
      appleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        debug.log('Apple signin clicked');
        showNotification('Apple-Anmeldung wird noch implementiert', 'info');
      });
    }

    debug.log('Auth handlers setup complete');
  }

  function updateAuthUI() {
    const isAuth = isAuthenticated();
    const user = getCurrentUser();

    debug.log('Updating auth UI, authenticated:', isAuth, user);

    $$('[data-auth-show="logged-in"]').forEach((el) => {
      el.style.display = isAuth ? '' : 'none';
    });

    $$('[data-auth-show="logged-out"]').forEach((el) => {
      el.style.display = !isAuth ? '' : 'none';
    });

    if (user) {
      $$('[data-auth-user="name"]').forEach((el) => {
        el.textContent = user.name;
      });
      $$('[data-auth-user="email"]').forEach((el) => {
        el.textContent = user.email;
      });
    }
  }

  // ========================================
  // CALENDLY MODAL
  // ========================================
  const CALENDLY_URL = 'https://calendly.com/j-erdweg-longtermhealth/biomarker-bluttest';

  function openCalendlyModal() {
    debug.log('Opening Calendly modal');

    // Get user data from session or localStorage
    const user = getCurrentUser();
    const userName = user?.name || localStorage.getItem('userName') || '';
    const userEmail = user?.email || localStorage.getItem('userEmail') || '';

    let overlay = document.getElementById('calendly-modal-overlay');
    if (overlay) {
      // Rebuild widget with fresh user data
      const container = document.getElementById('calendly-embed-container');
      if (container) container.innerHTML = '';
      overlay.style.display = 'flex';
      setTimeout(() => { overlay.style.opacity = '1'; }, 10);
      injectCalendlyWidget(userName, userEmail);
      return;
    }

    overlay = document.createElement('div');
    overlay.id = 'calendly-modal-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:10000;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity 0.3s;';

    const box = document.createElement('div');
    box.style.cssText = 'background:#fff;border-radius:12px;width:90vw;max-width:700px;height:85vh;max-height:750px;position:relative;overflow:hidden;';

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '\u2715';
    closeBtn.style.cssText = 'position:absolute;top:12px;right:16px;z-index:10;background:none;border:none;font-size:20px;cursor:pointer;color:#333;';
    closeBtn.addEventListener('click', closeCalendlyModal);

    const container = document.createElement('div');
    container.id = 'calendly-embed-container';
    container.style.cssText = 'width:100%;height:100%;';

    box.appendChild(closeBtn);
    box.appendChild(container);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeCalendlyModal();
    });

    setTimeout(() => { overlay.style.opacity = '1'; }, 10);

    injectCalendlyWidget(userName, userEmail);
    setupCalendlyListener();
  }

  function injectCalendlyWidget(name, email) {
    const container = document.getElementById('calendly-embed-container');
    if (!container) return;

    let url = CALENDLY_URL + '?hide_gdpr_banner=1';
    if (name) url += '&name=' + encodeURIComponent(name);
    if (email) url += '&email=' + encodeURIComponent(email);

    const widget = document.createElement('div');
    widget.className = 'calendly-inline-widget';
    widget.setAttribute('data-url', url);
    widget.style.cssText = 'min-width:100%;height:100%;';
    container.appendChild(widget);

    // Load Calendly widget script
    if (!document.querySelector('script[src*="assets.calendly.com"]')) {
      const script = document.createElement('script');
      script.src = 'https://assets.calendly.com/assets/external/widget.js';
      script.async = true;
      document.body.appendChild(script);
    } else if (window.Calendly) {
      window.Calendly.initInlineWidget({
        url: url,
        parentElement: container,
      });
    }

    debug.log('Calendly widget injected with name:', name, 'email:', email);
  }

  function setupCalendlyListener() {
    window.addEventListener('message', (e) => {
      if (e.origin !== 'https://calendly.com') return;
      if (e.data?.event === 'calendly.event_scheduled') {
        debug.log('Calendly event scheduled:', e.data);

        const user = getCurrentUser();
        const bookingData = {
          userId: user?.id || localStorage.getItem('userId'),
          userName: user?.name || localStorage.getItem('userName'),
          userEmail: user?.email || localStorage.getItem('userEmail'),
          eventUri: e.data.payload?.event?.uri,
          inviteeUri: e.data.payload?.invitee?.uri,
          scheduledAt: new Date().toISOString(),
        };

        debug.log('Booking data:', bookingData);
        localStorage.setItem('lastBooking', JSON.stringify(bookingData));

        // POST to backend
        apiCall('/biomarker-appointment', {
          method: 'POST',
          body: JSON.stringify(bookingData),
        }).then(() => {
          debug.log('Booking sent to backend');
        }).catch((err) => {
          debug.error('Failed to send booking to backend:', err);
        });

        setTimeout(() => {
          closeCalendlyModal();
          showNotification('Termin erfolgreich gebucht!', 'success');
        }, 1500);
      }
    });
  }

  function closeCalendlyModal() {
    const overlay = document.getElementById('calendly-modal-overlay');
    if (!overlay) return;
    overlay.style.opacity = '0';
    setTimeout(() => { overlay.style.display = 'none'; }, 300);
    debug.log('Calendly modal closed');
  }

  // ========================================
  // LOGOUT HANDLER
  // ========================================
  function setupLogoutHandlers() {
    document.addEventListener('click', (e) => {
      const logoutBtn = e.target.closest('[data-auth-logout]');
      if (!logoutBtn) return;
      e.preventDefault();
      logout();
      updateAuthUI();
      showNotification('Erfolgreich abgemeldet', 'info');
      debug.log('User logged out via button');
    });
  }

  // ========================================
  // INITIALIZATION
  // ========================================
  function init() {
    debug.log('Initializing global auth module');

    setupAuthHandlers();
    setupLogoutHandlers();
    updateAuthUI();

    // Expose global API
    window.Auth = {
      isAuthenticated,
      getCurrentUser,
      login,
      register,
      verifyEmail,
      resendCode,
      logout,
      openModal,
      closeModal,
      openCalendly: openCalendlyModal,
      closeCalendly: closeCalendlyModal,
      updateUI: updateAuthUI,
    };

    debug.log('Global auth module ready. Use Auth.openModal() to open.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
