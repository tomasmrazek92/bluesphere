/**
 * Button Character Stagger Animation
 * Splits button text into characters with staggered transitions
 */

/**
 * Initialize button character stagger animation
 * Splits text into spans with incremental transition delays
 */
export const initButtonCharacterStagger = () => {
  const offsetIncrement = 0.01;
  const buttons = document.querySelectorAll('[data-button-animate-chars]');

  buttons.forEach((button) => {
    const text = button.textContent;
    button.innerHTML = '';

    [...text].forEach((char, index) => {
      const span = document.createElement('span');
      span.textContent = char;
      span.style.transitionDelay = `${index * offsetIncrement}s`;

      if (char === ' ') {
        span.style.whiteSpace = 'pre';
      }

      button.appendChild(span);
    });
  });
};

export default initButtonCharacterStagger;
