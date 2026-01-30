/**
 * Internationalization (i18n)
 * Translation system for German and English
 */

import { getLanguage } from './config.js';

// Error Messages
const errorMessages = {
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
  email_invalid: {
    de: 'Bitte geben Sie eine gültige E-Mail-Adresse ein',
    en: 'Please enter a valid email address',
  },
  gender_required: {
    de: 'Bitte wählen Sie ein Geschlecht aus',
    en: 'Please select a gender',
  },
  country_required: {
    de: 'Bitte wählen Sie ein Land aus',
    en: 'Please select a country',
  },
  country_first: {
    de: 'Bitte wählen Sie zuerst ein Land aus',
    en: 'Please select a country first',
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
};

// UI Strings
const uiStrings = {
  please_wait: {
    de: 'Bitte warten...',
    en: 'Please wait...',
  },
};

/**
 * Get error message by key
 * @param {string} key - Message key
 * @param {object} replacements - Optional replacements for placeholders
 * @returns {string} Translated message
 */
export const getErrorMessage = (key, replacements = {}) => {
  const lang = getLanguage();
  let message = errorMessages[key]?.[lang] || errorMessages.generic_error[lang];

  // Replace placeholders
  Object.entries(replacements).forEach(([placeholder, value]) => {
    message = message.replace(`{${placeholder}}`, value);
  });

  return message;
};

/**
 * Get UI string by key
 * @param {string} key - String key
 * @returns {string} Translated string
 */
export const getUIString = (key) => {
  const lang = getLanguage();
  return uiStrings[key]?.[lang] || key;
};

/**
 * Translate ZIP format description
 * @param {string} format - English format description
 * @returns {string} Translated format
 */
export const translateZipFormat = (format) => {
  if (getLanguage() === 'de') {
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
};

// Export all messages for direct access if needed
export const messages = {
  errors: errorMessages,
  ui: uiStrings,
};
