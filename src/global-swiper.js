// ========================================
// GLOBAL SWIPER - Responsive swiper initialization
// Depends on: Swiper library (loaded from CDN)
// Exposes: window.initSwipers, window.createResponsiveSwiper
// ========================================

(function () {
  const CONFIG = {
    DEBUG: false,
  };

  const debug = (...args) => CONFIG.DEBUG && console.log('[SWIPER]', ...args);

  // ========================================
  // STATE
  // ========================================
  let swipers = {};
  let windowWidth = window.innerWidth;
  let uniqueIdCounter = 0;

  // ========================================
  // RESPONSIVE SWIPER CREATOR
  // ========================================
  function createResponsiveSwiper(compSel, swipSel, classSel, opts, mode) {
    const mobile = window.matchMedia('(max-width: 991px)');
    const desktop = window.matchMedia('(min-width: 992px)');

    const elems = $(compSel);
    if (!elems.length) {
      debug('No elements found for:', compSel);
      return;
    }

    elems.each(function () {
      const uKey = classSel + '_' + uniqueIdCounter++;

      $(this).find(swipSel).addClass(uKey);
      $(this).find('.swiper-arrow, .swiper-navigation').addClass(uKey);

      const swipOpts = Object.assign({}, opts, {
        navigation: {
          prevEl: `.swiper-arrow.prev.${uKey}`,
          nextEl: `.swiper-arrow.next.${uKey}`,
        },
        pagination: {
          el: `.swiper-navigation.${uKey}`,
          type: 'bullets',
          clickable: true,
        },
      });

      swipers[classSel] = swipers[classSel] || {};
      swipers[classSel][uKey] = swipers[classSel][uKey] || {};

      const shouldInit =
        (mode === 'desktop' && desktop.matches) ||
        (mode === 'mobile' && mobile.matches) ||
        mode === 'all';

      const existing = swipers[classSel][uKey].swiperInstance;

      if (shouldInit && !existing) {
        swipers[classSel][uKey] = {
          swiperInstance: new Swiper(`${swipSel}.${uKey}`, swipOpts),
          initialized: true,
        };
        debug('Swiper initialized:', classSel, uKey);
      } else if (!shouldInit && existing) {
        existing.destroy(true, true);
        delete swipers[classSel][uKey];
        debug('Swiper destroyed:', classSel, uKey);
      }
    });
  }

  // ========================================
  // BATCH INITIALIZATION
  // ========================================
  function runSwipers(instances) {
    instances.forEach((i) => createResponsiveSwiper(...i));
  }

  function initSwipers(instances) {
    window.addEventListener('load', () => runSwipers(instances));

    window.addEventListener('resize', () => {
      if (window.innerWidth !== windowWidth) {
        windowWidth = window.innerWidth;
        uniqueIdCounter = 0;
        runSwipers(instances);
        debug('Swipers re-initialized on resize');
      }
    });
  }

  // ========================================
  // INITIALIZATION
  // ========================================
  function init() {
    debug('Initializing global swiper module');

    // Check if Swiper is available
    if (typeof Swiper === 'undefined') {
      debug('Swiper library not loaded, waiting...');
      setTimeout(init, 100);
      return;
    }

    // Expose globals
    window.swipers = swipers;
    window.createResponsiveSwiper = createResponsiveSwiper;
    window.initSwipers = initSwipers;
    window.runSwipers = runSwipers;

    debug('Global swiper module ready');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
