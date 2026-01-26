// ========================================
// GLOBAL FORM VALIDATION - Works on every page
// Exposes: window.FormValidator, window.FormState, window.zipPatterns
// ========================================

(function () {
  const CONFIG = {
    DEBUG: false,
  };

  const debug = (...args) => CONFIG.DEBUG && console.log('[FORM-VALIDATION]', ...args);

  // ========================================
  // UTILITY FUNCTIONS
  // ========================================
  function isEnglishSite() {
    return window.location.pathname.includes('/en');
  }

  function translateZipFormat(format) {
    if (!isEnglishSite()) {
      return format
        .replace(/Numeric \(no standard format\)/g, 'Numerisch (kein Standardformat)')
        .replace(/digits/g, 'Ziffern')
        .replace(/letters/g, 'Buchstaben')
        .replace(/with optional space/g, 'mit optionalem Leerzeichen')
        .replace(/\bformat\b/gi, 'Format')
        .replace(/e\.g\./g, 'z.B.')
        .replace(/\bor\b/g, 'oder');
    }
    return format;
  }

  // ========================================
  // ZIP CODE PATTERNS
  // ========================================
  const zipPatterns = {
    // DACH Region
    Germany: {
      pattern: /^(?:0[1-9]|[1-9][0-9])[0-9]{3}$/,
      min: 1001,
      max: 99998,
      format: '5 digits (01001-99998)',
    },
    Austria: { pattern: /^[1-9][0-9]{3}$/, format: '4 digits (1000-9999)' },
    Switzerland: { pattern: /^[1-9][0-9]{3}$/, format: '4 digits (1000-9999)' },

    // Major European Countries
    'United Kingdom': {
      pattern: /^([A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}|GIR ?0AA)$/i,
      format: 'UK format (e.g., SW1A 1AA)',
    },
    France: {
      pattern: /^(?:0[1-9]|[1-8][0-9]|9[0-8])[0-9]{3}$/,
      format: '5 digits (01000-98999)',
    },
    Italy: { pattern: /^[0-9]{5}$/, format: '5 digits (00010-99999)' },
    Spain: {
      pattern: /^(?:0[1-9]|[1-4][0-9]|5[0-2])[0-9]{3}$/,
      format: '5 digits (01000-52999)',
    },
    Netherlands: {
      pattern: /^[1-9][0-9]{3} ?[A-Z]{2}$/i,
      format: '4 digits + 2 letters (e.g., 1234 AB)',
    },
    Belgium: { pattern: /^[1-9][0-9]{3}$/, format: '4 digits (1000-9999)' },
    Poland: { pattern: /^[0-9]{2}-[0-9]{3}$/, format: '2 digits-3 digits (e.g., 00-999)' },
    Sweden: {
      pattern: /^[0-9]{3} ?[0-9]{2}$/,
      format: '5 digits with optional space (e.g., 123 45)',
    },
    Denmark: { pattern: /^[1-9][0-9]{3}$/, format: '4 digits (1000-9999)' },
    Norway: { pattern: /^[0-9]{4}$/, format: '4 digits (0001-9999)' },
    Finland: { pattern: /^[0-9]{5}$/, format: '5 digits (00000-99999)' },
    Portugal: {
      pattern: /^[1-9][0-9]{3}-[0-9]{3}$/,
      format: '4 digits-3 digits (e.g., 1000-999)',
    },
    'Czech Republic': {
      pattern: /^[0-9]{3} ?[0-9]{2}$/,
      format: '5 digits with optional space (e.g., 123 45)',
    },
    Hungary: { pattern: /^[1-9][0-9]{3}$/, format: '4 digits (1000-9999)' },
    Romania: { pattern: /^[0-9]{6}$/, format: '6 digits' },
    Greece: { pattern: /^[0-9]{3} ?[0-9]{2}$/, format: '5 digits with optional space' },
    Ireland: {
      pattern: /^(?:[A-Z][0-9]{2} ?[A-Z0-9]{4}|[A-Z]{3} ?[A-Z0-9]{4})$/i,
      format: 'Irish format (e.g., D02 AF30)',
    },

    // Other Major Countries
    'United States': {
      pattern: /^[0-9]{5}(-[0-9]{4})?$/,
      format: '5 digits or 5+4 (e.g., 12345 or 12345-6789)',
    },
    Canada: { pattern: /^[A-Z][0-9][A-Z] ?[0-9][A-Z][0-9]$/i, format: 'A1A 1A1 format' },
    Australia: { pattern: /^[0-9]{4}$/, format: '4 digits (0200-9999)' },
    'New Zealand': { pattern: /^[0-9]{4}$/, format: '4 digits (0110-9999)' },
    Japan: { pattern: /^[0-9]{3}-[0-9]{4}$/, format: '3 digits-4 digits (e.g., 100-0001)' },
    'South Korea': { pattern: /^[0-9]{5}$/, format: '5 digits' },
    China: { pattern: /^[0-9]{6}$/, format: '6 digits' },
    India: { pattern: /^[0-9]{6}$/, format: '6 digits' },
    Brazil: { pattern: /^[0-9]{5}-?[0-9]{3}$/, format: '5 digits-3 digits (e.g., 12345-678)' },
    Mexico: { pattern: /^[0-9]{5}$/, format: '5 digits' },
    Russia: { pattern: /^[0-9]{6}$/, format: '6 digits' },
  };

  // ========================================
  // FORM VALIDATOR
  // ========================================
  const FormValidator = {
    ZIP_IS_VALID: false,
    CAN_SUBMIT: false,

    isEnglishSite: isEnglishSite,
    translateZipFormat: translateZipFormat,

    errorMessages: {
      zip_required: {
        de: 'Bitte geben Sie eine gültige Postleitzahl ein',
        en: 'Please enter a valid ZIP code',
      },
      zip_invalid: {
        de: 'Ungültige Postleitzahl für {country}. Erwartetes Format: {format}',
        en: 'Invalid ZIP code for {country}. Expected format: {format}',
      },
      email_required: {
        de: 'Bitte geben Sie eine E-Mail-Adresse ein',
        en: 'Please enter an email address',
      },
      gender_required: {
        de: 'Bitte wählen Sie ein Geschlecht aus',
        en: 'Please select a gender',
      },
      country_required: {
        de: 'Bitte wählen Sie ein Land aus',
        en: 'Please select a country',
      },
      gdpr_required: {
        de: 'Bitte akzeptieren Sie die Datenschutzerklärung',
        en: 'Please accept the privacy policy',
      },
      email_exists: {
        de: 'Diese E-Mail-Adresse ist bereits registriert. Bitte verwenden Sie eine andere E-Mail-Adresse.',
        en: 'This email is already registered. Please use a different email address.',
      },
      signup_error: {
        de: 'Bei der Verarbeitung Ihrer Anmeldung ist ein Problem aufgetreten. Bitte versuchen Sie es in einem Moment erneut.',
        en: 'There was a problem processing your signup. Please try again in a moment.',
      },
      network_error: {
        de: 'Verbindungsfehler. Bitte überprüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.',
        en: 'Connection error. Please check your internet and try again.',
      },
      generic_error: {
        de: 'Etwas ist schiefgelaufen. Bitte versuchen Sie es erneut.',
        en: 'Something went wrong. Please try again.',
      },
    },

    getErrorMessage: function (key) {
      const lang = this.isEnglishSite() ? 'en' : 'de';
      return this.errorMessages[key]
        ? this.errorMessages[key][lang]
        : this.errorMessages.generic_error[lang];
    },

    updateSubmitButtonState: function () {
      const waitlistForm = document.querySelector('#wf-form-Waitlist-Form');
      const isActualWaitlistForm =
        waitlistForm &&
        (waitlistForm.querySelector('input[name="Postleitzahl"], input[name="zip"]') ||
          waitlistForm.querySelector(
            'select[name="gender"], select[name="Gender"], select[name="Geschlecht"]'
          ) ||
          waitlistForm.querySelector('#country, select[name="country"]'));

      if (waitlistForm && isActualWaitlistForm) {
        const submitButton = waitlistForm.querySelector(
          'input[type="submit"], button[type="submit"], .w-button'
        );
        if (submitButton) {
          if (!this.ZIP_IS_VALID) {
            submitButton.disabled = true;
            submitButton.style.opacity = '0.5';
            submitButton.style.cursor = 'not-allowed';
            submitButton.setAttribute('data-disabled-reason', 'invalid-zip');
          } else {
            if (!submitButton.hasAttribute('data-submitting')) {
              submitButton.disabled = false;
              submitButton.style.opacity = '1';
              submitButton.style.cursor = 'pointer';
              submitButton.removeAttribute('data-disabled-reason');
            }
          }
        }
      }
    },
  };

  // ========================================
  // FORM STATE
  // ========================================
  const FormState = {
    zipValid: false,
    emailValid: false,
    genderValid: false,
    gdprValid: false,
    countryValid: false,

    checkFormValidity: function () {
      const forms = document.querySelectorAll('#wf-form-Waitlist-Form');
      const self = this;

      forms.forEach(function (form) {
        const isActualWaitlistForm =
          form.querySelector('input[name="Postleitzahl"], input[name="zip"]') ||
          form.querySelector(
            'select[name="gender"], select[name="Gender"], select[name="Geschlecht"]'
          ) ||
          form.querySelector('#country, select[name="country"]');

        if (!isActualWaitlistForm) return;

        const submitButton = form.querySelector(
          'input[type="submit"], button[type="submit"], .w-button'
        );
        if (submitButton) {
          const canSubmit =
            self.emailValid &&
            self.zipValid &&
            self.genderValid &&
            self.gdprValid &&
            self.countryValid;

          submitButton.disabled = !canSubmit;
          submitButton.style.opacity = canSubmit ? '1' : '0.6';
          submitButton.style.cursor = canSubmit ? 'pointer' : 'not-allowed';
        }
      });
    },
  };

  // ========================================
  // ZIP VALIDATION LOGIC
  // ========================================
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        timeout = null;
        func.apply(this, args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  function updateFieldState(input, state, errorMessage, countryRules) {
    const formField = input.closest('.form_field');
    const fieldWrap = formField ? formField.closest('.form_field-wrap') : null;
    const validationMsg = fieldWrap ? fieldWrap.querySelector('.form_validation') : null;

    input.classList.remove('zip-validating', 'zip-valid', 'zip-invalid');
    if (formField) formField.classList.remove('error');

    if (validationMsg) {
      validationMsg.classList.remove('show');
    }

    switch (state) {
      case 'typing':
        input.classList.add('zip-validating');
        break;

      case 'valid':
        input.classList.add('zip-valid');
        input.setAttribute('aria-invalid', 'false');
        break;

      case 'invalid':
        input.classList.add('zip-invalid');
        input.setAttribute('aria-invalid', 'true');
        if (formField) formField.classList.add('error');

        if (validationMsg && (errorMessage || countryRules)) {
          let message = errorMessage;
          if (!message && countryRules && countryRules.format) {
            const countrySelect = document.querySelector(
              '#country, select[name="country"], select[name="Country"]'
            );
            const selectedCountry = countrySelect ? countrySelect.value : '';
            const translatedFormat = translateZipFormat(countryRules.format);
            message = FormValidator.getErrorMessage('zip_invalid')
              .replace('{country}', selectedCountry || '')
              .replace('{format}', translatedFormat);
          }
          if (message) {
            validationMsg.textContent = message;
            validationMsg.classList.add('show');
          }
        }
        break;

      case 'empty':
        input.setAttribute('aria-invalid', 'false');
        break;
    }
  }

  function validateZipCode(input, zipValue, isFinalValidation, showError) {
    if (!zipValue) {
      updateFieldState(input, 'empty');
      return;
    }

    const countrySelect = document.querySelector(
      '#country, select[name="country"], select[name="Country"]'
    );
    const selectedCountry = countrySelect ? countrySelect.value : '';

    if (!selectedCountry) {
      if (showError) {
        updateFieldState(input, 'invalid', 'Please select a country first');
      }
      return;
    }

    const countryRules = zipPatterns[selectedCountry];

    if (!countryRules) {
      updateFieldState(input, 'valid');
      FormState.zipValid = true;
      FormState.checkFormValidity();
      return;
    }

    let isValid = countryRules.pattern.test(zipValue);

    if (isValid && countryRules.min && countryRules.max) {
      const numericValue = parseInt(zipValue);
      isValid = numericValue >= countryRules.min && numericValue <= countryRules.max;
    }

    if (isValid) {
      FormState.zipValid = true;
      updateFieldState(input, 'valid');
    } else {
      FormState.zipValid = false;
      if (showError) {
        updateFieldState(input, 'invalid', null, countryRules);
      }
    }

    FormState.checkFormValidity();
  }

  function setupZipValidation() {
    const zipInputs = document.querySelectorAll(
      'input[name="Postleitzahl"], input[id="Postleitzahl"], input[name="zip"], input[name="Zip"], input[name="ZIP"], input[id="zip"], input[id="Zip"], input[placeholder*="zip" i], input[placeholder*="postleitzahl" i], input[placeholder*="postal" i]'
    );

    if (zipInputs.length === 0) return;

    zipInputs.forEach(function (zipInput) {
      if (!zipInput.placeholder || zipInput.placeholder.trim() === '') {
        zipInput.placeholder = ' ';
      }

      if (zipInput.value) {
        validateZipCode(zipInput, zipInput.value.trim(), false, false);
      } else {
        FormState.zipValid = false;
        FormState.checkFormValidity();
      }

      const debouncedValidation = debounce(function () {
        validateZipCode(zipInput, zipInput.value.trim(), false, false);
      }, 500);

      zipInput.addEventListener('input', function (e) {
        const value = e.target.value.trim();
        if (value) {
          updateFieldState(zipInput, 'typing');
          debouncedValidation();
        } else {
          FormState.zipValid = false;
          FormState.checkFormValidity();
          updateFieldState(zipInput, 'empty');
        }
      });

      zipInput.addEventListener('blur', function (e) {
        const value = e.target.value.trim();
        if (value) {
          validateZipCode(zipInput, value, true, true);
        } else {
          FormState.zipValid = false;
          FormState.checkFormValidity();
        }
      });

      zipInput.setAttribute('aria-invalid', 'false');
    });

    // Country change handler
    const countrySelect = document.querySelector(
      '#country, select[name="country"], select[name="Country"]'
    );
    if (countrySelect) {
      if (!countrySelect.value) {
        countrySelect.value = 'Germany';
      }

      countrySelect.addEventListener('change', function () {
        zipInputs.forEach(function (zipInput) {
          if (zipInput.value) {
            validateZipCode(zipInput, zipInput.value.trim(), false, true);
          }
        });
      });
    }
  }

  // ========================================
  // WAITLIST FORM FIELD VALIDATION
  // ========================================
  function setupWaitlistFormValidation() {
    const waitlistForm = document.querySelector('#wf-form-Waitlist-Form');
    const isActualWaitlistForm =
      waitlistForm &&
      (waitlistForm.querySelector('input[name="Postleitzahl"], input[name="zip"]') ||
        waitlistForm.querySelector(
          'select[name="gender"], select[name="Gender"], select[name="Geschlecht"]'
        ) ||
        waitlistForm.querySelector('#country, select[name="country"]'));

    if (!waitlistForm || !isActualWaitlistForm) return;

    // Email validation
    const emailInputs = waitlistForm.querySelectorAll(
      'input[type="email"], input[name="email"], input[name="Email"]'
    );
    emailInputs.forEach(function (emailInput) {
      FormState.emailValid = emailInput.value && emailInput.value.includes('@');
      FormState.checkFormValidity();

      emailInput.addEventListener('input', function (e) {
        FormState.emailValid = e.target.value && e.target.value.includes('@');
        FormState.checkFormValidity();
      });

      emailInput.addEventListener('blur', function (e) {
        const fieldWrap = e.target.closest('.form_field-wrap') || e.target.closest('.form_field');
        if (fieldWrap) {
          const validationMsg = fieldWrap.querySelector('.form_validation');
          if (validationMsg) {
            if (!e.target.value) {
              validationMsg.textContent = FormValidator.getErrorMessage('email_required');
              validationMsg.classList.add('show');
            } else if (!e.target.value.includes('@')) {
              validationMsg.textContent = isEnglishSite()
                ? 'Please enter a valid email address'
                : 'Bitte geben Sie eine gültige E-Mail-Adresse ein';
              validationMsg.classList.add('show');
            } else {
              validationMsg.classList.remove('show');
            }
          }
        }
      });
    });

    // GDPR Checkbox validation
    const gdprCheckbox = waitlistForm.querySelector('input[type="checkbox"][name="checkbox"]');
    if (gdprCheckbox) {
      FormState.gdprValid = gdprCheckbox.checked;

      gdprCheckbox.addEventListener('change', function (e) {
        FormState.gdprValid = e.target.checked;

        const validationMsg = e.target.closest('.form_field-wrap')?.querySelector('.form_validation');
        if (validationMsg) {
          if (!e.target.checked) {
            validationMsg.classList.add('show');
          } else {
            validationMsg.classList.remove('show');
          }
        }

        FormState.checkFormValidity();
      });
    }

    // Gender select validation
    const genderSelect = waitlistForm.querySelector(
      'select[name="gender"], select[name="Gender"], select[name="Geschlecht"]'
    );
    if (genderSelect) {
      FormState.genderValid = genderSelect.value && genderSelect.value !== '';

      genderSelect.addEventListener('change', function (e) {
        FormState.genderValid = e.target.value && e.target.value !== '';

        const fieldWrap = e.target.closest('.form_field');
        if (fieldWrap) {
          const validationMsg = fieldWrap.querySelector('.form_validation');
          if (validationMsg) {
            if (!e.target.value) {
              validationMsg.classList.add('show');
            } else {
              validationMsg.classList.remove('show');
            }
          }
        }

        FormState.checkFormValidity();
      });

      // Nice-select changes
      const niceSelectList = waitlistForm.querySelector('.nice-select .list');
      if (niceSelectList) {
        niceSelectList.addEventListener('click', function (e) {
          if (e.target.tagName === 'LI') {
            setTimeout(function () {
              FormState.genderValid = genderSelect.value && genderSelect.value !== '';
              FormState.checkFormValidity();
            }, 100);
          }
        });
      }
    }

    // Country select validation
    const countrySelect = waitlistForm.querySelector(
      '#country, select[name="country"], select[name="Country"]'
    );
    if (countrySelect) {
      FormState.countryValid = countrySelect.value && countrySelect.value !== '';

      countrySelect.addEventListener('change', function (e) {
        FormState.countryValid = e.target.value && e.target.value !== '';
        FormState.checkFormValidity();
      });
    }

    FormState.checkFormValidity();
  }

  // ========================================
  // INITIALIZATION
  // ========================================
  function init() {
    debug('Initializing global form validation');

    // Hide success modals initially
    const allSuccessModals = document.querySelectorAll(
      '.w-form-done, .form_modal-form-sucess, .form-success-message'
    );
    allSuccessModals.forEach(function (modal) {
      modal.style.display = 'none';
    });

    // Setup validation
    setupWaitlistFormValidation();

    // Delayed ZIP validation setup
    setTimeout(function () {
      setupZipValidation();
    }, 1500);

    // Expose globals
    window.zipPatterns = zipPatterns;
    window.FormValidator = FormValidator;
    window.FormState = FormState;

    // Backward compatibility
    Object.defineProperty(window, 'FORM_ZIP_IS_VALID', {
      get: function () {
        return FormValidator.ZIP_IS_VALID;
      },
      set: function (val) {
        FormValidator.ZIP_IS_VALID = val;
      },
    });

    Object.defineProperty(window, 'FORM_CAN_SUBMIT', {
      get: function () {
        return FormValidator.CAN_SUBMIT;
      },
      set: function (val) {
        FormValidator.CAN_SUBMIT = val;
      },
    });

    // Expose utility functions
    window.isEnglishSite = isEnglishSite;
    window.translateZipFormat = translateZipFormat;

    debug('Global form validation ready');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
