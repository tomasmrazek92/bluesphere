/**
 * ZIP Code Real-time Validation
 * Handles real-time ZIP code validation with visual feedback
 */

import { debounce } from '../utils/debounce.js';
import { getErrorMessage, translateZipFormat } from '../core/i18n.js';
import { zipPatterns, validateZipCode } from './zip-patterns.js';
import { FormState } from './validation.js';

/**
 * Update the visual state of a ZIP input field
 * @param {HTMLInputElement} input - The ZIP input element
 * @param {string} state - State: 'typing', 'valid', 'invalid', 'empty'
 * @param {string} errorMessage - Optional error message
 * @param {object} countryRules - Optional country validation rules
 */
const updateFieldState = (input, state, errorMessage, countryRules) => {
  const formField = input.closest('.form_field');
  const fieldWrap = formField ? formField.closest('.form_field-wrap') : null;
  const validationMsg = fieldWrap ? fieldWrap.querySelector('.form_validation') : null;

  // Remove all state classes
  input.classList.remove('zip-validating', 'zip-valid', 'zip-invalid');
  if (formField) formField.classList.remove('error');

  // Hide validation message by default
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

      // Show validation message with appropriate text
      if (validationMsg && (errorMessage || countryRules)) {
        let message = errorMessage;
        if (!message && countryRules && countryRules.format) {
          const countrySelect = document.querySelector(
            '#country, select[name="country"], select[name="Country"]'
          );
          const selectedCountry = countrySelect ? countrySelect.value : '';
          const translatedFormat = translateZipFormat(countryRules.format);
          message = getErrorMessage('zip_invalid', {
            country: selectedCountry || '',
            format: translatedFormat,
          });
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
};

/**
 * Validate a ZIP code value
 * @param {HTMLInputElement} input - The ZIP input element
 * @param {string} zipValue - The ZIP code value
 * @param {boolean} isFinalValidation - Whether this is a final validation (on blur)
 * @param {boolean} showError - Whether to show error messages
 */
const performZipValidation = (input, zipValue, isFinalValidation, showError) => {
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
      updateFieldState(input, 'invalid', getErrorMessage('country_first'));
    }
    return;
  }

  const countryRules = zipPatterns[selectedCountry];

  // If no rules for country, accept any value
  if (!countryRules) {
    FormState.zipValid = true;
    updateFieldState(input, 'valid');
    FormState.checkFormValidity();
    return;
  }

  const result = validateZipCode(zipValue, selectedCountry);

  if (result.valid) {
    FormState.zipValid = true;
    updateFieldState(input, 'valid');
  } else {
    FormState.zipValid = false;
    if (showError) {
      updateFieldState(input, 'invalid', null, countryRules);
    }
  }

  FormState.checkFormValidity();
};

/**
 * Setup a ZIP input field with validation
 * @param {HTMLInputElement} input - The ZIP input element
 */
const setupZipField = (input) => {
  // Ensure proper placeholder for Webflow floating labels
  if (!input.placeholder || input.placeholder.trim() === '' || input.placeholder === 'Postleitzahl*') {
    input.placeholder = ' '; // Single space for Webflow floating label to work
  }
};

/**
 * Remove any existing validation messages (cleanup)
 */
const removeAllValidationMessages = () => {
  const selectors = [
    '.zip-validation-container',
    '.zip-error-message',
    '.zip-hint',
    '.zip-validation-message',
  ];

  selectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((el) => el.remove());
  });

  // Remove aria-describedby from ZIP inputs
  document
    .querySelectorAll('input[name="Postleitzahl"], input[id="Postleitzahl"]')
    .forEach((input) => {
      input.removeAttribute('aria-describedby');
    });
};

/**
 * Initialize ZIP code validation for all ZIP inputs
 */
export const initZipValidation = () => {
  // Cleanup any existing validation elements
  removeAllValidationMessages();
  setTimeout(removeAllValidationMessages, 10);
  setTimeout(removeAllValidationMessages, 100);
  setTimeout(removeAllValidationMessages, 500);

  // Set default country
  const countrySelect = document.querySelector('#country');
  if (countrySelect && !countrySelect.value) {
    countrySelect.value = 'Germany';
  }

  // Find all ZIP inputs
  const zipInputs = document.querySelectorAll(
    'input[name="Postleitzahl"], input[id="Postleitzahl"], input[name="zip"], input[name="Zip"], input[name="ZIP"], input[id="zip"], input[id="Zip"], input[placeholder*="zip" i], input[placeholder*="postleitzahl" i], input[placeholder*="postal" i]'
  );

  if (zipInputs.length === 0) return;

  zipInputs.forEach((zipInput) => {
    setupZipField(zipInput);

    // Initial validation if value exists
    if (zipInput.value) {
      performZipValidation(zipInput, zipInput.value.trim(), false, false);
    } else {
      FormState.zipValid = false;
      FormState.checkFormValidity();
    }

    // Debounced validation for typing
    const debouncedValidation = debounce(() => {
      performZipValidation(zipInput, zipInput.value.trim(), false, false);
    }, 500);

    // Input event
    zipInput.addEventListener('input', (e) => {
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

    // Blur event - final validation with error display
    zipInput.addEventListener('blur', (e) => {
      const value = e.target.value.trim();
      if (value) {
        performZipValidation(zipInput, value, true, true);
      } else {
        FormState.zipValid = false;
        FormState.checkFormValidity();
      }
    });

    zipInput.setAttribute('aria-invalid', 'false');
  });

  // Re-validate on country change
  const countrySelectElement = document.querySelector(
    '#country, select[name="country"], select[name="Country"]'
  );

  if (countrySelectElement) {
    // Set default if empty
    if (!countrySelectElement.value) {
      countrySelectElement.value = 'Germany';

      // Update nice-select UI
      const niceSelectSpan = countrySelectElement.parentElement?.querySelector('.nice-select .current');
      if (niceSelectSpan) {
        niceSelectSpan.textContent = 'Germany';
        niceSelectSpan.style.color = 'black';
      }

      const niceSelectOptions = countrySelectElement.parentElement?.querySelectorAll(
        '.nice-select .option'
      );
      niceSelectOptions?.forEach((option) => {
        if (option.getAttribute('data-value') === 'Germany') {
          option.classList.add('selected');
        } else {
          option.classList.remove('selected');
        }
      });
    }

    countrySelectElement.addEventListener('change', () => {
      zipInputs.forEach((zipInput) => {
        if (zipInput.value) {
          performZipValidation(zipInput, zipInput.value.trim(), false, true);
        }
      });
    });
  }
};

export default initZipValidation;
