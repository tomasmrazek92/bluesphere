/**
 * Style Injector
 * Injects CSS styles into the document head
 */

import baseStyles from './base.css';
import niceSelectStyles from './nice-select.css';
import formValidationStyles from './form-validation.css';

/**
 * Inject a CSS string into the document head
 * @param {string} css - CSS string to inject
 * @param {string} id - Optional ID for the style element
 */
const injectStyles = (css, id) => {
  if (typeof document === 'undefined') return;

  // Check if already injected
  if (id && document.getElementById(id)) return;

  const style = document.createElement('style');
  style.type = 'text/css';
  if (id) style.id = id;
  style.appendChild(document.createTextNode(css));
  document.head.appendChild(style);
};

/**
 * Initialize all styles
 */
export const initStyles = () => {
  injectStyles(baseStyles, 'bluesphere-base-styles');
  injectStyles(niceSelectStyles, 'bluesphere-nice-select-styles');
  injectStyles(formValidationStyles, 'bluesphere-form-validation-styles');
};

// Auto-initialize when imported
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initStyles);
  } else {
    initStyles();
  }
}

export default initStyles;
