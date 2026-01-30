/**
 * Responsive Swiper Factory
 * Creates responsive swipers that initialize/destroy based on viewport
 */

// Store swiper instances
const swipers = {};
let windowWidth = window.innerWidth;
let uniqueIdCounter = 0;

/**
 * Create a responsive swiper
 * @param {string} componentSelector - Selector for the swiper component wrapper
 * @param {string} swiperSelector - Selector for the swiper container
 * @param {string} classSelector - Base class for unique identification
 * @param {object} options - Swiper configuration options
 * @param {string} mode - 'mobile', 'desktop', or 'all'
 */
export const createResponsiveSwiper = (
  componentSelector,
  swiperSelector,
  classSelector,
  options,
  mode
) => {
  const mobile = window.matchMedia('(max-width: 991px)');
  const desktop = window.matchMedia('(min-width: 992px)');

  const elements = $(componentSelector);
  if (!elements.length) return;

  elements.each(function () {
    const uniqueKey = classSelector + '_' + uniqueIdCounter++;

    // Add unique class to swiper and navigation elements
    $(this).find(swiperSelector).addClass(uniqueKey);
    $(this).find('.swiper-arrow, .swiper-navigation').addClass(uniqueKey);

    // Build swiper options with navigation
    const swiperOptions = {
      ...options,
      navigation: {
        prevEl: `.swiper-arrow.prev.${uniqueKey}`,
        nextEl: `.swiper-arrow.next.${uniqueKey}`,
      },
      pagination: {
        el: `.swiper-navigation.${uniqueKey}`,
        type: 'bullets',
        clickable: true,
      },
    };

    // Initialize storage
    swipers[classSelector] = swipers[classSelector] || {};
    swipers[classSelector][uniqueKey] = swipers[classSelector][uniqueKey] || {};

    // Determine if should initialize
    const shouldInit =
      (mode === 'desktop' && desktop.matches) ||
      (mode === 'mobile' && mobile.matches) ||
      mode === 'all';

    const existing = swipers[classSelector][uniqueKey].swiperInstance;

    if (shouldInit && !existing) {
      // Initialize swiper
      swipers[classSelector][uniqueKey] = {
        swiperInstance: new Swiper(`${swiperSelector}.${uniqueKey}`, swiperOptions),
        initialized: true,
      };
    } else if (!shouldInit && existing) {
      // Destroy swiper
      existing.destroy(true, true);
      delete swipers[classSelector][uniqueKey];
    }
  });
};

/**
 * Run multiple swiper configurations
 * @param {Array} instances - Array of swiper configurations
 */
export const runSwipers = (instances) => {
  instances.forEach((config) => createResponsiveSwiper(...config));
};

/**
 * Initialize swipers with resize handling
 * @param {Array} instances - Array of swiper configurations
 */
export const initSwipers = (instances) => {
  window.addEventListener('load', () => runSwipers(instances));

  window.addEventListener('resize', () => {
    if (window.innerWidth !== windowWidth) {
      windowWidth = window.innerWidth;
      uniqueIdCounter = 0;
      runSwipers(instances);
    }
  });
};

// Expose to window for backward compatibility
if (typeof window !== 'undefined') {
  window.createResponsiveSwiper = createResponsiveSwiper;
  window.initSwipers = initSwipers;
  window.runSwipers = runSwipers;
}

export default { createResponsiveSwiper, initSwipers, runSwipers };
