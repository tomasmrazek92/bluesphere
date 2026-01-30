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

  // Map Webflow gender values to API-expected values
  const GENDER_MAP = {
    male: 'MALE',
    female: 'FEMALE',
    diverse: 'OTHER',
    'non-binary': 'NON_BINARY',
    other: 'OTHER',
    'no-share': 'NO_SHARE',
    unknown: 'UNKNOWN',
    // Already uppercase values pass through
    MALE: 'MALE',
    FEMALE: 'FEMALE',
    NON_BINARY: 'NON_BINARY',
    OTHER: 'OTHER',
    NO_SHARE: 'NO_SHARE',
    UNKNOWN: 'UNKNOWN',
  };

  async function register(formData) {
    const { firstName, lastName, email, password, dateOfBirth, gender } = formData;

    debug.log('Registering user:', email);

    const mappedGender = GENDER_MAP[gender] || GENDER_MAP[gender.toLowerCase()] || 'UNKNOWN';

    const payload = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
      password: password,
      dateOfBirth: dateOfBirth,
      gender: mappedGender,
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

  function showPersonalInfoStep() {
    const steps = getFormSteps();
    for (let i = 0; i < steps.length; i++) {
      const type = steps[i].getAttribute('data-register-type');
      if (type === 'personal-info') {
        showStep(i);
        // Initialize datepicker if jQuery plugin is available
        setTimeout(() => {
          const dpInput = steps[i].querySelector('input[data-toggle="datepicker"]');
          if (dpInput && window.jQuery) {
            try {
              const $dp = window.jQuery(dpInput);
              if ($dp.datepicker && !$dp.data('datepicker')) {
                $dp.datepicker({ format: 'dd.mm.yyyy', autoHide: true });
                debug.log('Datepicker initialized on personal-info step');
              }
            } catch (e) {
              debug.log('Datepicker init failed:', e.message);
            }
          }
        }, 100);
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

  function openModal(step) {
    debug.log('Opening register modal, step:', step || 'initial');

    if (typeof window.openModal === 'function') {
      window.openModal('register');
    } else {
      const modalTarget = $('[data-modal-target="register"]');
      const modalName = $('[data-modal-name="register"]');
      const modalGroup = $('[data-modal-group-status]');

      if (modalTarget) modalTarget.setAttribute('data-modal-status', 'active');
      if (modalName) modalName.setAttribute('data-modal-status', 'active');
      if (modalGroup) modalGroup.setAttribute('data-modal-group-status', 'active');
    }

    setTimeout(() => {
      if (step === 'register') showRegisterStep();
      else if (step === 'login') showLoginStep();
      else showInitialStep();
    }, 100);
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
    $$('.form_validation.show').forEach((el) => el.classList.remove('show'));
    $$('.form_field.error').forEach((el) => el.classList.remove('error'));
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

    // Inject missing labels for fields without them (floating label pattern)
    registerModal.querySelectorAll('input[type="password"], input[data-toggle="datepicker"]').forEach((input) => {
      const field = input.closest('.form_field');
      if (field && !field.querySelector('.form_label')) {
        const label = document.createElement('label');
        label.className = 'form_label';
        label.setAttribute('for', input.id || '');
        label.textContent = input.placeholder || '';
        field.appendChild(label);
      }
    });

    // Make calendar icon click open the datepicker
    const dpInputs = registerModal.querySelectorAll('input[data-toggle="datepicker"]');
    debug.log('Datepicker inputs found:', dpInputs.length);
    dpInputs.forEach((input) => {
      const field = input.closest('.form_field');
      const icon = field?.querySelector('.form_field-icon');
      debug.log('Datepicker field:', field ? 'found' : 'not found', 'icon:', icon ? 'found' : 'not found');
      if (icon) {
        icon.style.cursor = 'pointer';
        icon.addEventListener('click', () => {
          debug.log('Calendar icon clicked, triggering datepicker');
          input.focus();
          input.click();
          // Also try jQuery datepicker trigger
          if (window.jQuery && window.jQuery(input).datepicker) {
            try {
              window.jQuery(input).datepicker('show');
              debug.log('jQuery datepicker show triggered');
            } catch (e) {
              debug.log('jQuery datepicker show failed:', e.message);
            }
          }
        });
      }
    });

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
        // If on personal-info step, go back to register step
        const parentStep = btn.closest('[data-register="form-step"]');
        if (parentStep && parentStep.getAttribute('data-register-type') === 'personal-info') {
          showRegisterStep();
        } else {
          showInitialStep();
        }
      });
    });

    // ===== REGISTRATION FLOW: Step 1 - Name/Email/Password =====
    const nextBtn = $('[data-register="btn-next"]', registerModal);

    function getStep1Fields() {
      return {
        firstName: ($('#first_name', registerModal) || $('input[name="first_name"]', registerModal))?.value || '',
        lastName: ($('#last_name', registerModal) || $('input[name="last_name"]', registerModal))?.value || '',
        email: ($('#email-sign-in', registerModal) || $('input[name="email-sign-in"]', registerModal))?.value || '',
        password: ($('#password-signin', registerModal) || $('input[name="password-signin"]', registerModal))?.value || '',
        passwordConfirm: ($('#password-signin-again', registerModal) || $('input[name="password-signin-again"]', registerModal))?.value || '',
      };
    }

    // --- Per-field inline validation helpers ---
    function showFieldError(input, message) {
      const wrap = input.closest('.form_field-wrap');
      if (!wrap) return;
      const field = wrap.querySelector('.form_field');
      if (field) field.classList.add('error');
      const msg = wrap.querySelector('.form_validation');
      if (msg) {
        msg.textContent = message;
        msg.classList.add('show');
      }
    }

    function clearFieldError(input) {
      const wrap = input.closest('.form_field-wrap');
      if (!wrap) return;
      const field = wrap.querySelector('.form_field');
      if (field) field.classList.remove('error');
      const msg = wrap.querySelector('.form_validation');
      if (msg) msg.classList.remove('show');
    }

    function validatePasswordField(passwordInput) {
      if (!passwordInput) return;
      const v = passwordInput.value;
      if (!v) return; // don't show error while empty (wait for blur)
      if (v.length < 8 || !/[A-Z]/.test(v) || !/[a-z]/.test(v) ||
          !/[0-9]/.test(v) || !/[^A-Za-z0-9]/.test(v)) {
        showFieldError(passwordInput, 'Mindestens 8 Zeichen, Groß-/Kleinbuchstabe, Zahl und Sonderzeichen');
      } else {
        clearFieldError(passwordInput);
      }
    }

    function validateConfirmField(confirmInput, passwordInput) {
      if (!confirmInput || !passwordInput) return;
      const v = confirmInput.value;
      if (!v) return;
      if (v !== passwordInput.value) {
        showFieldError(confirmInput, 'Passwörter stimmen nicht überein');
      } else {
        clearFieldError(confirmInput);
      }
    }

    function isStep1Valid() {
      const f = getStep1Fields();
      if (!f.firstName || !f.lastName) return false;
      if (!f.email || !f.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) return false;
      if (!f.password || f.password.length < 8 ||
          !/[A-Z]/.test(f.password) || !/[a-z]/.test(f.password) ||
          !/[0-9]/.test(f.password) || !/[^A-Za-z0-9]/.test(f.password)) return false;
      if (f.password !== f.passwordConfirm) return false;
      return true;
    }

    function updateStep1Button() {
      if (!nextBtn) return;
      const valid = isStep1Valid();
      nextBtn.style.opacity = valid ? '' : '0.5';
      nextBtn.style.pointerEvents = valid ? 'auto' : 'none';
    }

    // Listen for input changes on step 1 fields
    const registerStep = registerModal.querySelector('[data-register-type="register"]');
    if (registerStep) {
      registerStep.addEventListener('input', updateStep1Button);
      updateStep1Button();

      // Per-field inline validation
      const fnInput = registerStep.querySelector('#first_name, input[name="first_name"]');
      const lnInput = registerStep.querySelector('#last_name, input[name="last_name"]');
      const emInput = registerStep.querySelector('#email-sign-in, input[name="email-sign-in"]');
      const pwInput = registerStep.querySelector('#password-signin, input[name="password-signin"]');
      const pw2Input = registerStep.querySelector('#password-signin-again, input[name="password-signin-again"]');

      // On input: clear error as soon as valid, show password errors live
      if (fnInput) fnInput.addEventListener('input', () => { if (fnInput.value.trim()) clearFieldError(fnInput); });
      if (lnInput) lnInput.addEventListener('input', () => { if (lnInput.value.trim()) clearFieldError(lnInput); });
      if (emInput) emInput.addEventListener('input', () => {
        if (emInput.value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emInput.value)) clearFieldError(emInput);
      });
      if (pwInput) pwInput.addEventListener('input', () => {
        validatePasswordField(pwInput);
        if (pw2Input && pw2Input.value) validateConfirmField(pw2Input, pwInput);
      });
      if (pw2Input) pw2Input.addEventListener('input', () => validateConfirmField(pw2Input, pwInput));

      // On blur: show error if empty/invalid
      if (fnInput) fnInput.addEventListener('blur', () => {
        if (!fnInput.value.trim()) showFieldError(fnInput, 'Bitte Vornamen eingeben');
      });
      if (lnInput) lnInput.addEventListener('blur', () => {
        if (!lnInput.value.trim()) showFieldError(lnInput, 'Bitte Nachnamen eingeben');
      });
      if (emInput) emInput.addEventListener('blur', () => {
        if (!emInput.value) showFieldError(emInput, 'Bitte E-Mail eingeben');
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emInput.value)) showFieldError(emInput, 'Bitte gültige E-Mail eingeben');
      });
      if (pwInput) pwInput.addEventListener('blur', () => validatePasswordField(pwInput));
      if (pw2Input) pw2Input.addEventListener('blur', () => {
        if (!pw2Input.value) showFieldError(pw2Input, 'Bitte Passwort bestätigen');
        else validateConfirmField(pw2Input, pwInput);
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', (e) => {
        e.preventDefault();
        debug.log('Next button clicked (register step 1)');
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

        // Store step 1 data and go to personal-info step
        pendingRegistration = { firstName, lastName, email, password };
        showPersonalInfoStep();
      });
    }

    // ===== REGISTRATION FLOW: Step 2 - Personal Info (DOB, Gender, Checkboxes) =====
    const sendBtn = $('[data-register="btn-send"]', registerModal);
    const personalInfoStep = registerModal.querySelector('[data-register-type="personal-info"]');

    function getStep2Gender() {
      if (!personalInfoStep) return '';
      const genderSelect = $('select', personalInfoStep);
      let gender = genderSelect?.value || '';
      if (!gender && genderSelect) {
        const niceSelect = genderSelect.nextElementSibling;
        if (niceSelect && niceSelect.classList.contains('nice-select')) {
          const selected = niceSelect.querySelector('.option.selected');
          if (selected && selected.getAttribute('data-value')) {
            gender = selected.getAttribute('data-value');
          }
        }
      }
      return gender;
    }

    function isValidDOB(val) {
      if (!val) return false;
      return /^\d{1,2}\.\d{1,2}\.\d{4}$/.test(val);
    }

    function isStep2Valid() {
      if (!personalInfoStep) return false;
      const dob = ($('#dateOfBirth', personalInfoStep) ||
        $('input[name="dateOfBirth"]', personalInfoStep) ||
        $('input[data-toggle="datepicker"]', personalInfoStep))?.value || '';
      if (!isValidDOB(dob)) return false;
      if (!getStep2Gender()) return false;
      const requiredCheckboxes = $$('input[type="checkbox"][required]', personalInfoStep);
      if (requiredCheckboxes.some((cb) => !cb.checked)) return false;
      return true;
    }

    function updateStep2Button() {
      if (!sendBtn) return;
      const valid = isStep2Valid();
      sendBtn.style.opacity = valid ? '' : '0.5';
      sendBtn.style.pointerEvents = valid ? 'auto' : 'none';
    }

    if (personalInfoStep) {
      personalInfoStep.addEventListener('input', updateStep2Button);
      personalInfoStep.addEventListener('change', updateStep2Button);
      // nice-select clicks
      personalInfoStep.addEventListener('click', (e) => {
        if (e.target.closest('.nice-select .option')) {
          setTimeout(updateStep2Button, 50);
        }
      });
      updateStep2Button();

      // Per-field inline validation for step 2
      const dobInput = personalInfoStep.querySelector('#dateOfBirth, input[name="dateOfBirth"]');
      const genderSelect = personalInfoStep.querySelector('select');
      const requiredCbs = [...personalInfoStep.querySelectorAll('input[type="checkbox"][required]')];

      if (dobInput) {
        dobInput.addEventListener('blur', () => {
          if (!dobInput.value) showFieldError(dobInput, 'Bitte Geburtsdatum eingeben');
          else if (!isValidDOB(dobInput.value)) showFieldError(dobInput, 'Format: TT.MM.JJJJ');
          else clearFieldError(dobInput);
        });
        dobInput.addEventListener('input', () => {
          if (isValidDOB(dobInput.value)) clearFieldError(dobInput);
          updateStep2Button();
        });
        dobInput.addEventListener('change', () => {
          if (isValidDOB(dobInput.value)) clearFieldError(dobInput);
          updateStep2Button();
        });
        // Poll for datepicker changes (datepicker may set value without firing input/change)
        let lastDob = dobInput.value;
        setInterval(() => {
          if (dobInput.value !== lastDob) {
            lastDob = dobInput.value;
            if (isValidDOB(dobInput.value)) clearFieldError(dobInput);
            updateStep2Button();
          }
        }, 300);
      }

      if (genderSelect) {
        genderSelect.addEventListener('change', () => {
          if (genderSelect.value) clearFieldError(genderSelect);
          else showFieldError(genderSelect, 'Bitte Geschlecht auswählen');
        });
      }
      // nice-select gender validation
      personalInfoStep.addEventListener('click', (e) => {
        if (e.target.closest('.nice-select .option') && genderSelect) {
          setTimeout(() => {
            if (getStep2Gender()) clearFieldError(genderSelect);
          }, 100);
        }
      });

      requiredCbs.forEach((cb) => {
        cb.addEventListener('change', () => {
          if (cb.checked) clearFieldError(cb);
          else showFieldError(cb, 'Bitte akzeptieren');
        });
      });
    }

    if (sendBtn) {
      sendBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        debug.log('Send button clicked (register step 2)');
        clearFormErrors();

        const dateOfBirthRaw =
          $('#dateOfBirth', registerModal)?.value ||
          $('input[name="dateOfBirth"]', registerModal)?.value ||
          $('input[name="date-of-birth"]', registerModal)?.value ||
          $('input[data-toggle="datepicker"]', registerModal)?.value ||
          '';

        if (!dateOfBirthRaw) {
          showFormError(form, 'Bitte Geburtsdatum eingeben');
          return;
        }

        // Parse DD.MM.YYYY or other formats to ISO
        let dateOfBirth;
        const ddmmyyyy = dateOfBirthRaw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
        if (ddmmyyyy) {
          dateOfBirth = `${ddmmyyyy[3]}-${ddmmyyyy[2].padStart(2, '0')}-${ddmmyyyy[1].padStart(2, '0')}`;
        } else {
          dateOfBirth = new Date(dateOfBirthRaw).toISOString().split('T')[0];
        }

        const gender = getStep2Gender();
        if (!gender) {
          showFormError(form, 'Bitte Geschlecht auswählen');
          return;
        }

        // Check required checkbox (first one = privacy/AGB)
        const checkboxes = $$('input[type="checkbox"][required]', personalInfoStep || registerModal);
        const uncheckedRequired = checkboxes.filter((cb) => !cb.checked);
        if (uncheckedRequired.length > 0) {
          showFormError(form, 'Bitte stimme den Datenschutz- und Geschäftsbedingungen zu');
          return;
        }

        pendingRegistration.dateOfBirth = dateOfBirth;
        pendingRegistration.gender = gender;

        debug.log('Full registration data:', pendingRegistration);
        setButtonLoading(sendBtn, true);

        try {
          await register(pendingRegistration);
          showNotification('Registrierung erfolgreich! Bitte Code eingeben.', 'success');
          showCodeStep();
        } catch (error) {
          debug.error('Registration error:', error);
          showFormError(form, error.message);
        } finally {
          setButtonLoading(sendBtn, false);
        }
      });
    }

    // ===== LOGIN FLOW =====
    const signinBtn = $('[data-register="btn-signin"]', registerModal);

    function isLoginValid() {
      const email = ($('#email-login', registerModal) || $('input[name="email-login"]', registerModal))?.value || '';
      const password = ($('#password-login', registerModal) || $('input[name="password-login"]', registerModal))?.value || '';
      return !!(email && password);
    }

    function updateLoginButton() {
      if (!signinBtn) return;
      signinBtn.style.opacity = isLoginValid() ? '' : '0.5';
      signinBtn.style.pointerEvents = isLoginValid() ? 'auto' : 'none';
    }

    const loginStep = registerModal.querySelector('[data-register-type="sign-in"]') ||
      registerModal.querySelector('[data-registe-type="sign-in"]');
    if (loginStep) {
      loginStep.addEventListener('input', updateLoginButton);
      updateLoginButton();
    }

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
          if (!window.location.pathname.includes('/deine-bestellung')) {
            openCalendlyModal();
          }
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

    // Hide logged-out elements; on homepage and /vision, also hide .nav_user
    const path = window.location.pathname;
    const isHomepageOrVision = path === '/' || path === '/en' || path === '/en/' ||
      path.includes('/vision');

    $$('[data-auth-show="logged-out"]').forEach((el) => {
      if (el.classList.contains('nav_user')) {
        if (isHomepageOrVision) {
          el.style.display = 'none';
        } else {
          // On non-homepage pages, always show .nav_user regardless of auth state
          el.style.display = '';
        }
      } else {
        el.style.display = !isAuth ? '' : 'none';
      }
    });

    if (user) {
      $$('[data-auth-user="name"]').forEach((el) => {
        el.textContent = user.name;
      });
      $$('[data-auth-user="email"]').forEach((el) => {
        el.textContent = user.email;
      });
    }

    // Replace nav_user content with initials circle when logged in, restore on logout
    const navUser = $('.nav_user');
    if (navUser) {
      if (isAuth && user) {
        const parts = (user.name || '').trim().split(/\s+/);
        const initials = ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase();
        // Store original content if not already saved
        if (!navUser._originalHTML) {
          navUser._originalHTML = navUser.innerHTML;
        }
        navUser.innerHTML =
          '<div style="width:35px;height:35px;border-radius:50%;background:rgba(36,91,236,0.15);' +
          'display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:400;' +
          'color:#000;font-family:inherit;line-height:1;">' + initials + '</div>';
      } else {
        // Restore original content on logout
        if (navUser._originalHTML) {
          navUser.innerHTML = navUser._originalHTML;
        }
      }
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

        // Booking webhook is handled by deine-bestellung.js

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
  // NAV USER ICON HANDLER
  // ========================================
  function removeUserDropdown() {
    const existing = document.getElementById('nav-user-dropdown');
    if (existing) existing.remove();
  }

  function createUserDropdown(anchorEl) {
    removeUserDropdown();

    const user = getCurrentUser();
    if (!user) return;

    const dropdown = document.createElement('div');
    dropdown.id = 'nav-user-dropdown';
    dropdown.style.cssText =
      'position:absolute;top:100%;right:0;margin-top:8px;background:#fff;color:#000;' +
      'border-radius:10px;padding:16px 20px;min-width:220px;z-index:9999;' +
      'box-shadow:0 8px 24px rgba(0,0,0,0.12);font-family:inherit;';

    const name = document.createElement('div');
    name.textContent = user.name || '';
    name.style.cssText = 'font-size:15px;font-weight:600;margin-bottom:4px;color:#000;';

    const email = document.createElement('div');
    email.textContent = user.email || '';
    email.style.cssText = 'font-size:13px;color:#4B4B4E;margin-bottom:14px;';

    const logoutBtn = document.createElement('button');
    logoutBtn.setAttribute('data-auth-logout', '');
    logoutBtn.style.cssText =
      'display:flex;align-items:center;gap:8px;width:100%;padding:8px 0;background:none;border:none;' +
      'color:#000;font-size:14px;cursor:pointer;transition:opacity 0.2s;font-family:inherit;';
    logoutBtn.innerHTML =
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>' +
      'Logout';
    logoutBtn.addEventListener('mouseenter', () => { logoutBtn.style.opacity = '0.6'; });
    logoutBtn.addEventListener('mouseleave', () => { logoutBtn.style.opacity = '1'; });

    dropdown.appendChild(name);
    dropdown.appendChild(email);
    dropdown.appendChild(logoutBtn);

    // Position relative to anchor
    const wrapper = anchorEl.closest('.nav_user') || anchorEl;
    wrapper.style.position = 'relative';
    wrapper.appendChild(dropdown);
  }

  function setupNavUserHandler() {
    const path = window.location.pathname;
    const isHomepageOrVision = path === '/' || path === '/en' || path === '/en/' ||
      path.includes('/vision');
    if (isHomepageOrVision) return;

    document.addEventListener('click', (e) => {
      const navUser = e.target.closest('.nav_user');

      // Close dropdown when clicking outside
      if (!navUser) {
        removeUserDropdown();
        return;
      }

      e.preventDefault();

      if (!isAuthenticated()) {
        openModal();
      } else {
        // Toggle dropdown
        const existing = document.getElementById('nav-user-dropdown');
        if (existing) {
          removeUserDropdown();
        } else {
          createUserDropdown(navUser);
        }
      }
    });
  }

  // ========================================
  // LOGOUT HANDLER
  // ========================================
  function setupLogoutHandlers() {
    document.addEventListener('click', (e) => {
      const logoutBtn = e.target.closest('[data-auth-logout]');
      if (!logoutBtn) return;
      e.preventDefault();
      removeUserDropdown();
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
    setupNavUserHandler();
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
      openRegister: () => openModal('register'),
      openLogin: () => openModal('login'),
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
