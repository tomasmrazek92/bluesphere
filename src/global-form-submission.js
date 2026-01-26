// ========================================
// GLOBAL FORM SUBMISSION - Waitlist form handling
// Depends on: global-form-validation.js
// ========================================

(function () {
  const CONFIG = {
    DEBUG: false,
    API_URL:
      'https://lth-waitlist-dev.orangegrass-967fbaa9.germanywestcentral.azurecontainerapps.io/api/waitlist/signup',
  };

  const debug = (...args) => CONFIG.DEBUG && console.log('[FORM-SUBMISSION]', ...args);

  // ========================================
  // UTILITIES
  // ========================================
  function isEnglishSite() {
    return window.location.pathname.includes('/en');
  }

  function fireAnalyticsEvent(eventName, eventData) {
    // Analytics removed - just push to dataLayer if available
    if (typeof dataLayer !== 'undefined') {
      dataLayer.push({ event: eventName, ...eventData });
    }
  }

  function getPersonalizedMessage(segment) {
    const messages = {
      high_engagement:
        "Based on your interest, you'll receive premium health insights and early access.",
      medium_engagement: "You'll receive our health education series and personalized tips.",
      low_engagement: "You'll receive essential health updates and wellness tips.",
      default: "You'll receive personalized health insights tailored to your interests.",
    };
    return messages[segment] || messages['default'];
  }

  // ========================================
  // ERROR DISPLAY
  // ========================================
  function showFormError(form, errorMessage) {
    const existingErrors = document.querySelectorAll('.form-error-message');
    existingErrors.forEach((error) => error.remove());

    const errorDiv = document.createElement('div');
    errorDiv.className = 'form-error-message';
    errorDiv.style.cssText =
      'color: #ef4444; background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px 16px; margin: 16px 0; font-size: 14px; line-height: 1.5; z-index: 1000; position: relative;';
    errorDiv.textContent = errorMessage;

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

    try {
      errorDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (e) {
      console.error('Scroll error:', e);
    }

    form.style.display = 'block';

    // Hide success messages
    const successDiv = document.querySelector('.form-success-message');
    if (successDiv) successDiv.style.display = 'none';

    const webflowSuccessDiv = document.querySelector('.w-form-done');
    if (webflowSuccessDiv) webflowSuccessDiv.style.display = 'none';

    const modalSuccessDiv = document.querySelector('.form_modal-form-sucess');
    if (modalSuccessDiv) modalSuccessDiv.style.display = 'none';

    // Focus email if error is email-related
    if (errorMessage.toLowerCase().includes('email')) {
      const emailInput = form.querySelector('input[type="email"], input[name*="email"]');
      if (emailInput) {
        setTimeout(() => {
          emailInput.focus();
          emailInput.select();
        }, 500);
      }
    }
  }

  function showModalSuccess(formFields, segment) {
    const form = document.querySelector('#wf-form-Waitlist-Form');
    const successDiv = document.querySelector('.form-success-message');

    if (form) {
      form.style.display = 'none';
    }

    if (successDiv) {
      successDiv.style.display = 'block';
    }
  }

  // ========================================
  // FORM SUBMISSION HANDLER
  // ========================================
  function setupFormSubmission() {
    const forms = document.querySelectorAll('#wf-form-Waitlist-Form');

    forms.forEach(function (form, index) {
      // Only apply to actual waitlist forms
      const isActualWaitlistForm =
        form.querySelector('input[name="Postleitzahl"], input[name="zip"]') ||
        form.querySelector(
          'select[name="gender"], select[name="Gender"], select[name="Geschlecht"]'
        ) ||
        form.querySelector('#country, select[name="country"]');

      if (!isActualWaitlistForm) return;

      // Remove default success/error divs
      form.querySelectorAll('.w-form-done').forEach((div) => {
        div.style.display = 'none';
        div.remove();
      });

      form.querySelectorAll('.w-form-fail').forEach((div) => {
        div.style.display = 'none';
        div.remove();
      });

      // Track form start
      let formStarted = false;
      form.addEventListener(
        'focus',
        function (e) {
          if (!formStarted && e.target.tagName === 'INPUT') {
            formStarted = true;
            fireAnalyticsEvent('form_start', {
              form_name: 'waitlist_signup',
              form_id: form.id || 'form_' + index,
            });
          }
        },
        true
      );

      let isSubmitting = false;

      form.addEventListener('submit', function (e) {
        e.preventDefault();

        try {
          if (isSubmitting) return false;

          fireAnalyticsEvent('form_submit_attempt', { form_name: 'waitlist_signup' });

          const formData = new FormData(form);
          const formFields = {};

          for (const pair of formData.entries()) {
            formFields[pair[0]] = pair[1];
          }

          // Normalize field names
          const firstName =
            formFields['first-name'] ||
            formFields['First-Name'] ||
            formFields.firstName ||
            formFields.FirstName ||
            '';
          const lastName =
            formFields['last-name'] ||
            formFields['Last-Name'] ||
            formFields.lastName ||
            formFields.LastName ||
            '';

          // Gender mapping
          let rawGender = formFields.gender || formFields.Gender || formFields.Geschlecht || '';
          let mappedGender = rawGender;

          if (rawGender === 'Divers' || rawGender === 'divers' || rawGender === 'diverse') {
            mappedGender = 'other';
          } else if (rawGender === 'Männlich' || rawGender === 'männlich') {
            mappedGender = 'male';
          } else if (rawGender === 'Weiblich' || rawGender === 'weiblich') {
            mappedGender = 'female';
          }

          const normalizedFields = {
            email: formFields.email || formFields.Email || '',
            name: (firstName + ' ' + lastName).trim() || formFields.name || formFields.Name || '',
            gender: mappedGender,
            city: formFields.city || formFields.City || formFields.Stadt || '',
            country: formFields.country || formFields.Country || formFields.Land || '',
            zip_code:
              formFields.Postleitzahl ||
              formFields.zip ||
              formFields.Zip ||
              formFields.ZIP ||
              '',
          };

          // Validate required fields
          let hasErrors = false;

          // Check email
          if (!normalizedFields.email) {
            const emailInput = form.querySelector(
              'input[type="email"], input[name="email"], input[name="Email"]'
            );
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
              if (fieldWrap) {
                const validationMsg = fieldWrap.querySelector('.form_validation');
                if (validationMsg && window.FormValidator) {
                  validationMsg.textContent =
                    window.FormValidator.getErrorMessage('gender_required');
                  validationMsg.classList.add('show');
                }
              }
            }
            hasErrors = true;
          }

          // Check country
          if (!normalizedFields.country) {
            const countrySelect = form.querySelector(
              '#country, select[name="country"], select[name="Country"]'
            );
            if (countrySelect) {
              const fieldWrap = countrySelect.closest('.form_field');
              if (fieldWrap) {
                const validationMsg = fieldWrap.querySelector('.form_validation');
                if (validationMsg && window.FormValidator) {
                  validationMsg.textContent =
                    window.FormValidator.getErrorMessage('country_required');
                  validationMsg.classList.add('show');
                }
              }
            }
            hasErrors = true;
          }

          // Check GDPR checkbox
          const gdprCheckbox = form.querySelector('input[type="checkbox"][name="checkbox"]');
          if (gdprCheckbox && !gdprCheckbox.checked) {
            const validationMsg = gdprCheckbox
              .closest('.form_field-wrap')
              ?.querySelector('.form_validation');
            if (validationMsg) {
              validationMsg.classList.add('show');
            }
            hasErrors = true;
          }

          // Check ZIP code
          if (!normalizedFields.zip_code) {
            const zipInput = form.querySelector(
              'input[name="Postleitzahl"], input[name="zip"], input[name="Zip"]'
            );
            if (zipInput) {
              zipInput.dispatchEvent(new Event('blur', { bubbles: true }));
            }
            hasErrors = true;
          }

          if (hasErrors) {
            showFormError(
              form,
              window.FormValidator?.getErrorMessage('generic_error') || 'Please fill all fields'
            );
            isSubmitting = false;
            return false;
          }

          // Validate ZIP format
          if (normalizedFields.zip_code && normalizedFields.country && window.zipPatterns) {
            const countryRules = window.zipPatterns[normalizedFields.country];
            if (countryRules) {
              let isValidZip = countryRules.pattern.test(normalizedFields.zip_code);
              if (countryRules.min && countryRules.max) {
                const numericValue = parseInt(normalizedFields.zip_code);
                isValidZip =
                  isValidZip &&
                  numericValue >= countryRules.min &&
                  numericValue <= countryRules.max;
              }

              if (!isValidZip) {
                const translatedFormat = window.translateZipFormat
                  ? window.translateZipFormat(countryRules.format)
                  : countryRules.format;
                const zipErrorMsg = window.FormValidator.getErrorMessage('zip_invalid')
                  .replace('{country}', normalizedFields.country)
                  .replace('{format}', translatedFormat);

                showFormError(form, zipErrorMsg);

                fireAnalyticsEvent('form_validation_error', {
                  error_type: 'invalid_zip',
                  country: normalizedFields.country,
                });

                const zipInput = form.querySelector(
                  'input[name="Postleitzahl"], input[name="zip"], input[name="Zip"]'
                );
                if (zipInput) {
                  setTimeout(() => {
                    zipInput.focus();
                    zipInput.select();
                  }, 100);
                }

                isSubmitting = false;
                return false;
              }
            }
          }

          // Update button state
          const submitButton = form.querySelector(
            'input[type="submit"], button[type="submit"], .w-button'
          );
          const originalText = submitButton ? submitButton.textContent || submitButton.value : '';

          isSubmitting = true;
          if (window.FormValidator) window.FormValidator.CAN_SUBMIT = true;

          if (submitButton) {
            submitButton.textContent = 'Please wait...';
            submitButton.disabled = true;
            submitButton.style.opacity = '0.6';
            submitButton.setAttribute('data-submitting', 'true');
          }

          // Store email
          if (normalizedFields.email) {
            sessionStorage.setItem('userEmail', normalizedFields.email);
            document.querySelectorAll('[data-user-email]').forEach((el) => {
              el.textContent = normalizedFields.email;
            });
          }

          // Get user profile and tracking data
          const userProfile = JSON.parse(
            sessionStorage.getItem('bluesphere_user_profile') || '{}'
          );

          const urlParams = new URLSearchParams(window.location.search);
          const utmParams = {
            utm_source:
              urlParams.get('utm_source') || sessionStorage.getItem('utm_source') || '',
            utm_medium:
              urlParams.get('utm_medium') || sessionStorage.getItem('utm_medium') || '',
            utm_campaign:
              urlParams.get('utm_campaign') || sessionStorage.getItem('utm_campaign') || '',
            utm_term: urlParams.get('utm_term') || sessionStorage.getItem('utm_term') || '',
            utm_content:
              urlParams.get('utm_content') || sessionStorage.getItem('utm_content') || '',
          };

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

          // Store submission data
          const fullDataPackage = {
            ...apiPayload,
            engagement_score: userProfile.engagement_score || 0,
            user_segment: userProfile.segment || 'unknown',
            time_on_site: userProfile.time_on_site || 0,
            scroll_depth: userProfile.scroll_depth || 0,
            sections_viewed: userProfile.sections_viewed || [],
            ...utmParams,
            referrer: document.referrer || 'direct',
            landing_page: window.location.pathname,
            timestamp: new Date().toISOString(),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            language: navigator.language,
            device_type: /Mobile|Android|iPhone/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
          };

          localStorage.setItem('bluesphere_last_submission', JSON.stringify(fullDataPackage));
          localStorage.setItem('bluesphere_submission_time', Date.now().toString());
          localStorage.setItem('bluesphere_submission_pending', 'true');

          // Generate signature
          const timestamp = Date.now().toString();
          const message = timestamp + '.' + JSON.stringify(apiPayload);
          const encoder = new TextEncoder();
          const data = encoder.encode(message);
          const base64 = btoa(String.fromCharCode.apply(null, data));
          const signature = 'client_signature_' + base64.replace(/[^a-zA-Z0-9]/g, '');

          // Submit to API
          fetch(CONFIG.API_URL, {
            method: 'POST',
            mode: 'cors',
            headers: {
              'Content-Type': 'application/json',
              'X-Signature': signature,
              'X-Timestamp': timestamp,
            },
            body: JSON.stringify(apiPayload),
          })
            .then((response) => {
              if (!response.ok) {
                return response.text().then((text) => {
                  console.error('Backend error response:', response.status, text);
                  try {
                    const errorData = JSON.parse(text);
                    throw new Error(errorData.message || 'Backend error');
                  } catch (e) {
                    throw new Error('Backend responded with status: ' + response.status);
                  }
                });
              }
              return response.json();
            })
            .then((data) => {
              localStorage.removeItem('bluesphere_submission_pending');

              if (data.userId || data.user_id) {
                sessionStorage.setItem('bluesphere_user_id', data.userId || data.user_id);
              }

              fireAnalyticsEvent('waitlist_conversion', {
                user_id: data.userId || data.user_id || null,
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

              showModalSuccess(normalizedFields, userProfile.segment);

              setTimeout(() => {
                if (submitButton) {
                  submitButton.textContent = originalText;
                  submitButton.disabled = false;
                  submitButton.style.opacity = '1';
                  submitButton.removeAttribute('data-submitting');
                }
                isSubmitting = false;
                if (window.FormValidator) window.FormValidator.CAN_SUBMIT = false;
              }, 2000);
            })
            .catch((error) => {
              let errorMessage =
                window.FormValidator?.getErrorMessage('generic_error') || 'Something went wrong';

              // Handle network errors gracefully
              if (
                error.message.includes('Failed to fetch') &&
                !error.message.includes('Backend error') &&
                !error.message.includes('500') &&
                !error.message.includes('400') &&
                !error.message.includes('409')
              ) {
                showModalSuccess(normalizedFields, userProfile.segment);
                setTimeout(() => {
                  if (submitButton) {
                    submitButton.textContent = originalText;
                    submitButton.disabled = false;
                    submitButton.style.opacity = '1';
                  }
                  isSubmitting = false;
                }, 2000);
                return;
              } else if (error.message.includes('Network')) {
                errorMessage =
                  window.FormValidator?.getErrorMessage('network_error') || 'Network error';
              } else if (
                error.message.includes('email') ||
                error.message.includes('duplicate') ||
                error.message.includes('already exists') ||
                error.message.includes('unique constraint') ||
                error.message.includes('already registered')
              ) {
                errorMessage =
                  window.FormValidator?.getErrorMessage('email_exists') || 'Email already exists';
              } else if (error.message.includes('An error occurred during signup')) {
                errorMessage =
                  window.FormValidator?.getErrorMessage('signup_error') || 'Signup error';
              }

              fireAnalyticsEvent('form_submission_error', {
                error_type: error.message,
                form_name: 'waitlist_signup',
              });

              showFormError(
                form,
                error.message.includes('Backend error') ? errorMessage : error.message
              );

              if (submitButton) {
                submitButton.textContent = originalText;
                submitButton.disabled = false;
                submitButton.style.opacity = '1';
                submitButton.removeAttribute('data-submitting');
              }
              isSubmitting = false;
              if (window.FormValidator) window.FormValidator.CAN_SUBMIT = false;
            });
        } catch (error) {
          console.error('Form submission error:', error);
          alert(
            window.FormValidator?.getErrorMessage('generic_error') || 'Something went wrong'
          );
          isSubmitting = false;
          if (window.FormValidator) window.FormValidator.CAN_SUBMIT = false;
        }
      });
    });
  }

  // ========================================
  // INITIALIZATION
  // ========================================
  function init() {
    debug('Initializing global form submission');

    // Delayed setup to ensure other modules are loaded
    setTimeout(setupFormSubmission, 1000);

    debug('Global form submission ready');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
