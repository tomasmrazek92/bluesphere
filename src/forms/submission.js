/**
 * Form Submission Handler
 * Handles form submission to the waitlist API
 */

import { isEnglishSite, API_CONFIG } from '../core/config.js';
import { getErrorMessage, getUIString, translateZipFormat } from '../core/i18n.js';
import { FormValidator, zipPatterns } from './index.js';
import { FormState } from './validation.js';

/**
 * Show success modal/message
 * @param {object} formFields - Normalized form field values
 * @param {string} segment - User segment
 */
const showModalSuccess = (formFields, segment) => {
  const form = document.querySelector('#wf-form-Waitlist-Form');
  const successDiv = document.querySelector('.form-success-message');

  if (form) {
    form.style.display = 'none';
  }

  if (successDiv) {
    successDiv.style.display = 'block';
  }
};

/**
 * Show error message on form
 * @param {HTMLFormElement} form - The form element
 * @param {string} errorMessage - Error message to display
 */
const showFormError = (form, errorMessage) => {
  // Remove existing errors
  document.querySelectorAll('.form-error-message').forEach((el) => el.remove());

  // Create error element
  const errorDiv = document.createElement('div');
  errorDiv.className = 'form-error-message';
  errorDiv.textContent = errorMessage;

  // Insert at top of form
  try {
    if (form.firstElementChild) {
      form.insertBefore(errorDiv, form.firstElementChild);
    } else {
      form.appendChild(errorDiv);
    }
  } catch (e) {
    console.error('Error inserting error message:', e);
    alert(errorMessage);
    return;
  }

  // Scroll to error
  try {
    errorDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } catch (e) {
    console.error('Scroll error:', e);
  }

  // Ensure form is visible
  form.style.display = 'block';

  // Hide success messages
  document.querySelectorAll('.form-success-message, .w-form-done, .form_modal-form-sucess').forEach(
    (el) => {
      el.style.display = 'none';
    }
  );

  // Focus email if email error
  if (errorMessage.toLowerCase().includes('email')) {
    const emailInput = form.querySelector('input[type="email"], input[name*="email"]');
    if (emailInput) {
      setTimeout(() => {
        emailInput.focus();
        emailInput.select();
      }, 500);
    }
  }
};

/**
 * Map German gender values to API values
 * @param {string} rawGender - Raw gender value from form
 * @returns {string} Mapped gender value
 */
const mapGender = (rawGender) => {
  if (!rawGender) return '';

  const lowerGender = rawGender.toLowerCase();

  if (lowerGender === 'divers' || lowerGender === 'diverse') {
    return 'other';
  } else if (lowerGender === 'männlich') {
    return 'male';
  } else if (lowerGender === 'weiblich') {
    return 'female';
  }

  return rawGender;
};

/**
 * Extract and normalize form fields
 * @param {FormData} formData - Form data
 * @returns {object} Normalized fields
 */
const normalizeFormFields = (formData) => {
  const fields = {};
  for (const pair of formData.entries()) {
    fields[pair[0]] = pair[1];
  }

  const firstName =
    fields['first-name'] || fields['First-Name'] || fields.firstName || fields.FirstName || '';
  const lastName =
    fields['last-name'] || fields['Last-Name'] || fields.lastName || fields.LastName || '';

  return {
    email: fields.email || fields.Email || '',
    name: (firstName + ' ' + lastName).trim() || fields.name || fields.Name || '',
    gender: mapGender(fields.gender || fields.Gender || fields.Geschlecht || ''),
    city: fields.city || fields.City || fields.Stadt || '',
    country: fields.country || fields.Country || fields.Land || '',
    zip_code: fields.Postleitzahl || fields.zip || fields.Zip || fields.ZIP || '',
  };
};

/**
 * Validate all required fields before submission
 * @param {HTMLFormElement} form - The form element
 * @param {object} normalizedFields - Normalized form fields
 * @returns {boolean} Whether all fields are valid
 */
const validateRequiredFields = (form, normalizedFields) => {
  let hasErrors = false;

  // Check email
  if (!normalizedFields.email) {
    const emailInput = form.querySelector('input[type="email"], input[name="email"], input[name="Email"]');
    if (emailInput) {
      emailInput.dispatchEvent(new Event('blur', { bubbles: true }));
    }
    hasErrors = true;
  }

  // Check gender
  if (!normalizedFields.gender) {
    const genderSelect = form.querySelector(
      'select[name="gender"], select[name="Gender"], select[name="Geschlecht"]'
    );
    if (genderSelect) {
      const fieldWrap = genderSelect.closest('.form_field');
      const validationMsg = fieldWrap?.querySelector('.form_validation');
      if (validationMsg) {
        validationMsg.textContent = getErrorMessage('gender_required');
        validationMsg.classList.add('show');
      }
    }
    hasErrors = true;
  }

  // Check country
  if (!normalizedFields.country) {
    const countrySelect = form.querySelector('#country, select[name="country"], select[name="Country"]');
    if (countrySelect) {
      const fieldWrap = countrySelect.closest('.form_field');
      const validationMsg = fieldWrap?.querySelector('.form_validation');
      if (validationMsg) {
        validationMsg.textContent = getErrorMessage('country_required');
        validationMsg.classList.add('show');
      }
    }
    hasErrors = true;
  }

  // Check GDPR checkbox
  const gdprCheckbox = form.querySelector('input[type="checkbox"][name="checkbox"]');
  if (gdprCheckbox && !gdprCheckbox.checked) {
    const validationMsg = gdprCheckbox.closest('.form_field-wrap')?.querySelector('.form_validation');
    if (validationMsg) {
      validationMsg.classList.add('show');
    }
    hasErrors = true;
  }

  // Check ZIP code
  if (!normalizedFields.zip_code) {
    const zipInput = form.querySelector('input[name="Postleitzahl"], input[name="zip"], input[name="Zip"]');
    if (zipInput) {
      zipInput.dispatchEvent(new Event('blur', { bubbles: true }));
    }
    hasErrors = true;
  }

  return !hasErrors;
};

/**
 * Validate ZIP code format
 * @param {HTMLFormElement} form - The form element
 * @param {object} normalizedFields - Normalized form fields
 * @param {function} fireAnalyticsEvent - Analytics event function
 * @returns {boolean} Whether ZIP is valid
 */
const validateZipFormat = (form, normalizedFields, fireAnalyticsEvent) => {
  if (!normalizedFields.zip_code || !normalizedFields.country) {
    return true; // Will be caught by required field validation
  }

  const countryRules = zipPatterns[normalizedFields.country];
  if (!countryRules) {
    return true; // No rules for this country
  }

  let isValidZip = countryRules.pattern.test(normalizedFields.zip_code);

  if (countryRules.min && countryRules.max) {
    const numericValue = parseInt(normalizedFields.zip_code, 10);
    isValidZip = isValidZip && numericValue >= countryRules.min && numericValue <= countryRules.max;
  }

  if (!isValidZip) {
    const translatedFormat = translateZipFormat(countryRules.format);
    const zipErrorMsg = getErrorMessage('zip_invalid', {
      country: normalizedFields.country,
      format: translatedFormat,
    });

    showFormError(form, zipErrorMsg);

    if (fireAnalyticsEvent) {
      fireAnalyticsEvent('form_validation_error', {
        error_type: 'invalid_zip',
        country: normalizedFields.country,
      });
    }

    // Focus ZIP input
    const zipInput = form.querySelector('input[name="Postleitzahl"], input[name="zip"], input[name="Zip"]');
    if (zipInput) {
      setTimeout(() => {
        zipInput.focus();
        zipInput.select();
      }, 100);
    }

    return false;
  }

  return true;
};

/**
 * Submit form to API
 * @param {HTMLFormElement} form - The form element
 * @param {object} normalizedFields - Normalized form fields
 * @param {HTMLButtonElement} submitButton - Submit button element
 * @param {string} originalText - Original button text
 * @param {function} fireAnalyticsEvent - Analytics event function
 */
const submitToApi = async (form, normalizedFields, submitButton, originalText, fireAnalyticsEvent) => {
  // Store email for display
  if (normalizedFields.email) {
    sessionStorage.setItem('userEmail', normalizedFields.email);
    document.querySelectorAll('[data-user-email]').forEach((el) => {
      el.textContent = normalizedFields.email;
    });
  }

  // Get user profile from session
  const userProfile = JSON.parse(sessionStorage.getItem('bluesphere_user_profile') || '{}');

  // Build API payload
  const apiPayload = {
    email: normalizedFields.email,
    name: normalizedFields.name || undefined,
    gender: normalizedFields.gender || undefined,
    city: normalizedFields.city || undefined,
    country: normalizedFields.country || undefined,
    zip_code: normalizedFields.zip_code || undefined,
    language: isEnglishSite() ? 'en' : 'de',
  };

  // Remove undefined values
  Object.keys(apiPayload).forEach((key) => {
    if (apiPayload[key] === undefined || apiPayload[key] === '') {
      delete apiPayload[key];
    }
  });

  // Store submission locally
  localStorage.setItem('bluesphere_submission_pending', 'true');

  // Generate signature
  const timestamp = Date.now().toString();
  const message = timestamp + '.' + JSON.stringify(apiPayload);
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const base64 = btoa(String.fromCharCode.apply(null, data));
  const signature = 'client_signature_' + base64.replace(/[^a-zA-Z0-9]/g, '');

  try {
    const response = await fetch(API_CONFIG.waitlistEndpoint, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
        'X-Signature': signature,
        'X-Timestamp': timestamp,
      },
      body: JSON.stringify(apiPayload),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('Backend error response:', response.status, text);

      try {
        const errorData = JSON.parse(text);
        throw new Error(errorData.message || 'Backend error');
      } catch (e) {
        throw new Error('Backend responded with status: ' + response.status);
      }
    }

    const responseData = await response.json();

    // Clear pending flag
    localStorage.removeItem('bluesphere_submission_pending');

    // Store user ID
    if (responseData.userId || responseData.user_id) {
      sessionStorage.setItem('bluesphere_user_id', responseData.userId || responseData.user_id);
    }

    // Fire analytics events
    if (fireAnalyticsEvent) {
      fireAnalyticsEvent('waitlist_conversion', {
        user_id: responseData.userId || responseData.user_id || null,
        email: normalizedFields.email,
        segment: userProfile.segment || 'unknown',
        engagement_score: userProfile.engagement_score || 0,
        value: userProfile.engagement_score || 0,
        currency: 'EUR',
      });

      fireAnalyticsEvent('generate_lead', {
        value: userProfile.engagement_score || 0,
        currency: 'EUR',
      });

      fireAnalyticsEvent('waitlist_signup_success', {
        method: 'form',
        user_segment: userProfile.segment || 'unknown',
      });
    }

    // Show success
    showModalSuccess(normalizedFields, userProfile.segment);

    // Reset button after delay
    setTimeout(() => {
      if (submitButton) {
        submitButton.textContent = originalText;
        submitButton.disabled = false;
        submitButton.style.opacity = '1';
        submitButton.removeAttribute('data-submitting');
      }
      FormValidator.CAN_SUBMIT = false;
    }, 2000);
  } catch (error) {
    console.error('Form submission error:', error);

    let errorMessage = getErrorMessage('generic_error');

    // Handle specific errors
    if (error.message.includes('Failed to fetch') && !error.message.includes('Backend')) {
      // Network error but might have succeeded - show success anyway
      showModalSuccess(normalizedFields, userProfile.segment);

      setTimeout(() => {
        if (submitButton) {
          submitButton.textContent = originalText;
          submitButton.disabled = false;
          submitButton.style.opacity = '1';
        }
      }, 2000);

      return;
    } else if (error.message.includes('Network')) {
      errorMessage = getErrorMessage('network_error');
    } else if (
      error.message.includes('email') ||
      error.message.includes('duplicate') ||
      error.message.includes('already exists') ||
      error.message.includes('already registered')
    ) {
      errorMessage = getErrorMessage('email_exists');
    } else if (error.message.includes('signup')) {
      errorMessage = getErrorMessage('signup_error');
    }

    if (fireAnalyticsEvent) {
      fireAnalyticsEvent('form_submission_error', {
        error_type: error.message,
        form_name: 'waitlist_signup',
      });
    }

    showFormError(form, errorMessage);

    // Reset button
    if (submitButton) {
      submitButton.textContent = originalText;
      submitButton.disabled = false;
      submitButton.style.opacity = '1';
      submitButton.removeAttribute('data-submitting');
    }
    FormValidator.CAN_SUBMIT = false;
  }
};

/**
 * Initialize form submission handler
 * @param {function} fireAnalyticsEvent - Optional analytics event function
 */
export const initFormSubmission = (fireAnalyticsEvent) => {
  // Hide all success modals initially
  document.querySelectorAll('.w-form-done, .form_modal-form-sucess, .form-success-message').forEach(
    (modal) => {
      modal.style.display = 'none';
    }
  );

  // Find all waitlist forms
  const forms = document.querySelectorAll('#wf-form-Waitlist-Form');

  forms.forEach((form, index) => {
    // Only apply to actual waitlist forms
    const isActualWaitlistForm =
      form.querySelector('input[name="Postleitzahl"], input[name="zip"]') ||
      form.querySelector('select[name="gender"], select[name="Gender"], select[name="Geschlecht"]') ||
      form.querySelector('#country, select[name="country"]');

    if (!isActualWaitlistForm) return;

    // Remove Webflow success/error divs
    form.querySelectorAll('.w-form-done, .w-form-fail').forEach((div) => {
      div.style.display = 'none';
      div.remove();
    });

    // Track form start
    let formStarted = false;
    form.addEventListener(
      'focus',
      (e) => {
        if (!formStarted && e.target.tagName === 'INPUT') {
          formStarted = true;
          if (fireAnalyticsEvent) {
            fireAnalyticsEvent('form_start', {
              form_name: 'waitlist_signup',
              form_id: form.id || 'form_' + index,
            });
          }
        }
      },
      true
    );

    // Submission state
    let isSubmitting = false;

    // Handle submit
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (isSubmitting) return;

      if (fireAnalyticsEvent) {
        fireAnalyticsEvent('form_submit_attempt', { form_name: 'waitlist_signup' });
      }

      // Get form data
      const formData = new FormData(form);
      const normalizedFields = normalizeFormFields(formData);

      // Validate required fields
      if (!validateRequiredFields(form, normalizedFields)) {
        showFormError(form, getErrorMessage('generic_error'));
        return;
      }

      // Validate ZIP format
      if (!validateZipFormat(form, normalizedFields, fireAnalyticsEvent)) {
        return;
      }

      // Get submit button
      const submitButton = form.querySelector(
        'input[type="submit"], button[type="submit"], .w-button'
      );
      const originalText = submitButton ? submitButton.textContent || submitButton.value : '';

      // Set submitting state
      isSubmitting = true;
      FormValidator.CAN_SUBMIT = true;

      if (submitButton) {
        submitButton.textContent = getUIString('please_wait');
        submitButton.disabled = true;
        submitButton.style.opacity = '0.6';
        submitButton.setAttribute('data-submitting', 'true');
      }

      // Submit to API
      await submitToApi(form, normalizedFields, submitButton, originalText, fireAnalyticsEvent);

      isSubmitting = false;
    });
  });
};

export default initFormSubmission;
