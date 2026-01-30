/**
 * ZIP Code Validation Patterns
 * Country-specific regex patterns for postal code validation
 */

export const zipPatterns = {
  // DACH Region
  Germany: {
    pattern: /^(?:0[1-9]|[1-9][0-9])[0-9]{3}$/,
    min: 1001,
    max: 99998,
    format: '5 digits (01001-99998)',
  },
  Austria: {
    pattern: /^[1-9][0-9]{3}$/,
    format: '4 digits (1000-9999)',
  },
  Switzerland: {
    pattern: /^[1-9][0-9]{3}$/,
    format: '4 digits (1000-9999)',
  },

  // Major European Countries
  'United Kingdom': {
    pattern: /^([A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}|GIR ?0AA)$/i,
    format: 'UK format (e.g., SW1A 1AA)',
  },
  France: {
    pattern: /^(?:0[1-9]|[1-8][0-9]|9[0-8])[0-9]{3}$/,
    format: '5 digits (01000-98999)',
  },
  Italy: {
    pattern: /^[0-9]{5}$/,
    format: '5 digits (00010-99999)',
  },
  Spain: {
    pattern: /^(?:0[1-9]|[1-4][0-9]|5[0-2])[0-9]{3}$/,
    format: '5 digits (01000-52999)',
  },
  Netherlands: {
    pattern: /^[1-9][0-9]{3} ?[A-Z]{2}$/i,
    format: '4 digits + 2 letters (e.g., 1234 AB)',
  },
  Belgium: {
    pattern: /^[1-9][0-9]{3}$/,
    format: '4 digits (1000-9999)',
  },
  Poland: {
    pattern: /^[0-9]{2}-[0-9]{3}$/,
    format: '2 digits-3 digits (e.g., 00-999)',
  },
  Sweden: {
    pattern: /^[0-9]{3} ?[0-9]{2}$/,
    format: '5 digits with optional space (e.g., 123 45)',
  },
  Denmark: {
    pattern: /^[1-9][0-9]{3}$/,
    format: '4 digits (1000-9999)',
  },
  Norway: {
    pattern: /^[0-9]{4}$/,
    format: '4 digits (0001-9999)',
  },
  Finland: {
    pattern: /^[0-9]{5}$/,
    format: '5 digits (00000-99999)',
  },
  Portugal: {
    pattern: /^[1-9][0-9]{3}-[0-9]{3}$/,
    format: '4 digits-3 digits (e.g., 1000-999)',
  },
  'Czech Republic': {
    pattern: /^[0-9]{3} ?[0-9]{2}$/,
    format: '5 digits with optional space (e.g., 123 45)',
  },
  Hungary: {
    pattern: /^[1-9][0-9]{3}$/,
    format: '4 digits (1000-9999)',
  },
  Romania: {
    pattern: /^[0-9]{6}$/,
    format: '6 digits',
  },
  Greece: {
    pattern: /^[0-9]{3} ?[0-9]{2}$/,
    format: '5 digits with optional space',
  },
  Ireland: {
    pattern: /^(?:[A-Z][0-9]{2} ?[A-Z0-9]{4}|[A-Z]{3} ?[A-Z0-9]{4})$/i,
    format: 'Irish format (e.g., D02 AF30)',
  },

  // Other Major Countries
  'United States': {
    pattern: /^[0-9]{5}(-[0-9]{4})?$/,
    format: '5 digits or 5+4 (e.g., 12345 or 12345-6789)',
  },
  Canada: {
    pattern: /^[A-Z][0-9][A-Z] ?[0-9][A-Z][0-9]$/i,
    format: 'A1A 1A1 format',
  },
  Australia: {
    pattern: /^[0-9]{4}$/,
    format: '4 digits (0200-9999)',
  },
  'New Zealand': {
    pattern: /^[0-9]{4}$/,
    format: '4 digits (0110-9999)',
  },
  Japan: {
    pattern: /^[0-9]{3}-[0-9]{4}$/,
    format: '3 digits-4 digits (e.g., 100-0001)',
  },
  'South Korea': {
    pattern: /^[0-9]{5}$/,
    format: '5 digits',
  },
  China: {
    pattern: /^[0-9]{6}$/,
    format: '6 digits',
  },
  India: {
    pattern: /^[0-9]{6}$/,
    format: '6 digits',
  },
  Brazil: {
    pattern: /^[0-9]{5}-?[0-9]{3}$/,
    format: '5 digits-3 digits (e.g., 12345-678)',
  },
  Mexico: {
    pattern: /^[0-9]{5}$/,
    format: '5 digits',
  },
  Russia: {
    pattern: /^[0-9]{6}$/,
    format: '6 digits',
  },
};

/**
 * Validate a ZIP code for a specific country
 * @param {string} zipCode - The ZIP code to validate
 * @param {string} country - The country name
 * @returns {{ valid: boolean, format?: string }} Validation result
 */
export const validateZipCode = (zipCode, country) => {
  if (!zipCode || !country) {
    return { valid: false };
  }

  const rules = zipPatterns[country];

  // If no rules for country, accept any value
  if (!rules) {
    return { valid: true };
  }

  let isValid = rules.pattern.test(zipCode);

  // Additional numeric range check if min/max defined
  if (isValid && rules.min !== undefined && rules.max !== undefined) {
    const numericValue = parseInt(zipCode, 10);
    isValid = numericValue >= rules.min && numericValue <= rules.max;
  }

  return {
    valid: isValid,
    format: rules.format,
  };
};

/**
 * Get the expected format for a country
 * @param {string} country - The country name
 * @returns {string|null} Format description or null
 */
export const getZipFormat = (country) => {
  return zipPatterns[country]?.format || null;
};

// Expose to window for backward compatibility
if (typeof window !== 'undefined') {
  window.zipPatterns = zipPatterns;
}
