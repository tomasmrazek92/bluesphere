/**
 * Form Validator
 * Global form validation state and utilities
 */

import { getErrorMessage, translateZipFormat } from '../core/i18n.js';
import { zipPatterns } from './zip-patterns.js';

/**
 * Global Form Validator State
 */
export const FormValidator = {
  // State management
  ZIP_IS_VALID: false,
  CAN_SUBMIT: false,

  // Get error message (delegated to i18n)
  getErrorMessage: (key, replacements) => getErrorMessage(key, replacements),

  // Translate ZIP format (delegated to i18n)
  translateZipFormat: (format) => translateZipFormat(format),

  // Update submit button state - only for waitlist form
  updateSubmitButtonState: function () {
    const waitlistForm = document.querySelector('#wf-form-Waitlist-Form');

    // Only apply to actual waitlist forms (with ZIP/gender/country fields)
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

// Expose to window for backward compatibility
if (typeof window !== 'undefined') {
  window.FormValidator = FormValidator;

  // Create getters/setters for backward compatibility
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
}

export { zipPatterns };
export default FormValidator;
