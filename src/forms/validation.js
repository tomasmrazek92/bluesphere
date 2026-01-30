/**
 * Form State & Field Validation
 * Manages form field validation states
 */

import { isEnglishSite } from '../core/config.js';
import { getErrorMessage } from '../core/i18n.js';
import { FormValidator } from './index.js';

/**
 * Form State Manager
 */
export const FormState = {
  zipValid: false,
  emailValid: false,
  genderValid: false,
  gdprValid: false,
  countryValid: false,

  /**
   * Check overall form validity and update submit button
   */
  checkFormValidity: function () {
    const forms = document.querySelectorAll('#wf-form-Waitlist-Form');

    forms.forEach((form) => {
      // Only apply to actual waitlist forms (with ZIP/gender/country fields)
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
          this.emailValid && this.zipValid && this.genderValid && this.gdprValid && this.countryValid;

        submitButton.disabled = !canSubmit;
        submitButton.style.opacity = canSubmit ? '1' : '0.6';
        submitButton.style.cursor = canSubmit ? 'pointer' : 'not-allowed';
      }
    });
  },
};

/**
 * Initialize email validation
 * @param {HTMLFormElement} form - The form element
 */
export const initEmailValidation = (form) => {
  const emailInputs = form.querySelectorAll(
    'input[type="email"], input[name="email"], input[name="Email"]'
  );

  emailInputs.forEach((emailInput) => {
    // Initial state
    FormState.emailValid = emailInput.value && emailInput.value.includes('@');
    FormState.checkFormValidity();

    // Input event
    emailInput.addEventListener('input', (e) => {
      FormState.emailValid = e.target.value && e.target.value.includes('@');
      FormState.checkFormValidity();
    });

    // Blur event - show validation message
    emailInput.addEventListener('blur', (e) => {
      const fieldWrap = e.target.closest('.form_field-wrap') || e.target.closest('.form_field');

      if (fieldWrap) {
        const validationMsg = fieldWrap.querySelector('.form_validation');

        if (validationMsg) {
          if (!e.target.value) {
            validationMsg.textContent = getErrorMessage('email_required');
            validationMsg.classList.add('show');
          } else if (!e.target.value.includes('@')) {
            validationMsg.textContent = getErrorMessage('email_invalid');
            validationMsg.classList.add('show');
          } else {
            validationMsg.classList.remove('show');
          }
        }
      }
    });
  });
};

/**
 * Initialize GDPR checkbox validation
 * @param {HTMLFormElement} form - The form element
 */
export const initGdprValidation = (form) => {
  const gdprCheckbox = form.querySelector('input[type="checkbox"][name="checkbox"]');

  if (gdprCheckbox) {
    FormState.gdprValid = gdprCheckbox.checked;

    gdprCheckbox.addEventListener('change', (e) => {
      FormState.gdprValid = e.target.checked;

      // Show/hide validation message
      const fieldWrap = e.target.closest('.form_field-wrap');
      if (fieldWrap) {
        const validationMsg = fieldWrap.querySelector('.form_validation');
        if (validationMsg) {
          if (!e.target.checked) {
            validationMsg.classList.add('show');
          } else {
            validationMsg.classList.remove('show');
          }
        }
      }

      FormState.checkFormValidity();
    });
  }
};

/**
 * Initialize gender select validation
 * @param {HTMLFormElement} form - The form element
 */
export const initGenderValidation = (form) => {
  const genderSelect = form.querySelector(
    'select[name="gender"], select[name="Gender"], select[name="Geschlecht"]'
  );

  if (genderSelect) {
    FormState.genderValid = genderSelect.value && genderSelect.value !== '';

    genderSelect.addEventListener('change', (e) => {
      FormState.genderValid = e.target.value && e.target.value !== '';

      // Show/hide validation message
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

    // Also listen for nice-select changes
    const niceSelectList = form.querySelector('.nice-select .list');
    if (niceSelectList) {
      niceSelectList.addEventListener('click', (e) => {
        if (e.target.tagName === 'LI') {
          setTimeout(() => {
            FormState.genderValid = genderSelect.value && genderSelect.value !== '';
            FormState.checkFormValidity();
          }, 100);
        }
      });
    }
  }
};

/**
 * Initialize country select validation
 * @param {HTMLFormElement} form - The form element
 */
export const initCountryValidation = (form) => {
  const countrySelect = form.querySelector('#country, select[name="country"], select[name="Country"]');

  if (countrySelect) {
    FormState.countryValid = countrySelect.value && countrySelect.value !== '';

    countrySelect.addEventListener('change', (e) => {
      FormState.countryValid = e.target.value && e.target.value !== '';
      FormState.checkFormValidity();
    });
  }
};

/**
 * Initialize all field validations for a form
 * @param {HTMLFormElement} form - The form element
 */
export const initFieldValidation = (form) => {
  initEmailValidation(form);
  initGdprValidation(form);
  initGenderValidation(form);
  initCountryValidation(form);
  FormState.checkFormValidity();
};

// Expose to window for backward compatibility
if (typeof window !== 'undefined') {
  window.FormState = FormState;
}

export default FormState;
