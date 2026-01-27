import { initMaskTextReveal } from './textmask';

function waitForGlobals(callback) {
  if (typeof gsap !== 'undefined' && typeof $ !== 'undefined') {
    callback();
  } else {
    setTimeout(function () { waitForGlobals(callback); }, 50);
  }
}

waitForGlobals(function () {

// Hero Anim
$(document).ready(function () {
  let tl = gsap.timeline();

  tl.fromTo(
    $('[data-hero="image"]'),
    {
      yPercent: 10,
      scale: 0.85,
      opacity: 0,
    },
    {
      yPercent: 0,
      scale: 1,
      opacity: 1,
      duration: 1.5,
      ease: 'expo.out',
    }
  );

  tl.call(
    () => {
      initMaskTextReveal('[data-hero="heading"]');
    },
    null,
    '<0.1'
  );

  tl.fromTo(
    $('[data-hero="item"]'),
    {
      opacity: 0,
    },
    {
      opacity: 1,
      stagger: 0.02,
      duration: 1.5,
      ease: 'expo.out',
    },
    '<0.2'
  );

  tl.fromTo(
    $('[data-hero="list"] li'),
    {
      xPercent: 10,
      opacity: 0,
    },
    {
      onStart: () => {
        gsap.set($('[data-hero="list"]'), { opacity: 1 });
      },
      xPercent: 0,
      opacity: 1,
      stagger: 0.1,
      duration: 1.5,
      ease: 'expo.out',
    },
    '<0.2'
  );
});

// Global Parallax
gsap.registerPlugin(ScrollTrigger);
function initGlobalParallax() {
  const mm = gsap.matchMedia();
  mm.add(
    {
      isMobile: '(max-width:479px)',
      isMobileLandscape: '(max-width:767px)',
      isTablet: '(max-width:991px)',
      isDesktop: '(min-width:992px)',
    },
    (context) => {
      const { isMobile, isMobileLandscape, isTablet } = context.conditions;
      const ctx = gsap.context(() => {
        document.querySelectorAll('[data-parallax="trigger"]').forEach((trigger) => {
          const disable = trigger.getAttribute('data-parallax-disable');
          if (
            (disable === 'mobile' && isMobile) ||
            (disable === 'mobileLandscape' && isMobileLandscape) ||
            (disable === 'tablet' && isTablet)
          ) {
            return;
          }
          const target = trigger.querySelector('[data-parallax="target"]') || trigger;
          const direction = trigger.getAttribute('data-parallax-direction') || 'vertical';
          const prop = direction === 'horizontal' ? 'xPercent' : 'yPercent';
          const scrubAttr = trigger.getAttribute('data-parallax-scrub');
          const scrub = scrubAttr ? parseFloat(scrubAttr) : true;
          const startAttr = trigger.getAttribute('data-parallax-start');
          const startVal = startAttr !== null ? parseFloat(startAttr) : 20;
          const endAttr = trigger.getAttribute('data-parallax-end');
          const endVal = endAttr !== null ? parseFloat(endAttr) : -20;
          const scrollStartRaw = trigger.getAttribute('data-parallax-scroll-start') || 'top bottom';
          const scrollStart = `clamp(${scrollStartRaw})`;
          const scrollEndRaw = trigger.getAttribute('data-parallax-scroll-end') || 'bottom top';
          const scrollEnd = `clamp(${scrollEndRaw})`;

          const rotationStartAttr = trigger.getAttribute('data-parallax-rotation-start');
          const rotationEndAttr = trigger.getAttribute('data-parallax-rotation-end');

          const fromProps = { [prop]: startVal };
          const toProps = {
            [prop]: endVal,
            ease: 'none',
            scrollTrigger: {
              trigger,
              start: scrollStart,
              end: scrollEnd,
              scrub,
            },
          };

          if (rotationStartAttr !== null || rotationEndAttr !== null) {
            const rotationStart = rotationStartAttr !== null ? parseFloat(rotationStartAttr) : 0;
            const rotationEnd = rotationEndAttr !== null ? parseFloat(rotationEndAttr) : 0;
            fromProps.rotation = rotationStart;
            toProps.rotation = rotationEnd;
          }

          gsap.fromTo(target, fromProps, toProps);
        });
      });
      return () => ctx.revert();
    }
  );
}
document.addEventListener('DOMContentLoaded', () => {
  initGlobalParallax();
});

// Chat Swiper
$(document).ready(function () {
  const swiper = new Swiper('.hp_tiles-chat-wrap', {
    slidesPerView: 'auto',
    direction: 'vertical',
    loop: true,
    allowTouchMove: false,
    centeredSlides: true,
    speed: 800,
    autoplay: {
      delay: 2000,
      disableOnInteraction: false,
    },
    on: {
      slideChange: function () {
        const activeIndex = this.activeIndex;
        $(this.slides).removeClass('previous-slide');
        $(this.slides).each(function (index) {
          if (index < activeIndex - 1) {
            $(this).addClass('previous-slide');
          }
        });
      },
      init: function () {
        const activeIndex = this.activeIndex;
        $(this.slides).each(function (index) {
          if (index < activeIndex - 1) {
            $(this).addClass('previous-slide');
          }
        });
      },
    },
  });
});

// Grid 1
$(document).ready(function () {
  gsap.registerPlugin(ScrollTrigger);

  $('[data-counter]').each(function () {
    let counter = $(this);
    let originalText = counter.text().trim();
    let endValue = parseFloat(originalText.replace(',', '.'));
    let duration = parseFloat(counter.attr('data-duration')) || 2;
    let suffix = counter.attr('data-suffix') || '';
    let prefix = counter.attr('data-prefix') || '';

    let decimals = 0;
    let useComma = originalText.includes(',');
    if (useComma) {
      decimals = originalText.split(',')[1].length;
    }

    let startValue = 0;
    if (decimals > 0) {
      startValue = parseFloat('0.' + '0'.repeat(decimals));
    }

    let counterObj = { value: startValue };

    ScrollTrigger.create({
      trigger: counter[0],
      start: 'top bottom',
      onEnter: function () {
        gsap.to(counterObj, {
          value: endValue,
          duration: duration,
          ease: 'power2.out',
          onUpdate: function () {
            let displayValue = counterObj.value.toFixed(decimals);
            if (useComma) {
              displayValue = displayValue.replace('.', ',');
            }
            counter.text(prefix + displayValue + suffix);
          },
        });
      },
      once: true,
    });
  });

  // Graph Arrow
  $('#graphArrow').each(function () {
    let trigger = $(this).closest('.hp_tiles-stats-card');
    let tl = gsap.timeline({
      scrollTrigger: {
        trigger: trigger,
        start: 'bottom bottom',
      },
    });
    tl.fromTo(
      '#graphArrow',
      { xPercent: -300 },
      { xPercent: 0, ease: 'elastic.out(1,0.3)', duration: 3 }
    );
  });

  // Graphs Lines
  $('.start-line').each(function () {
    let parentSVG = $(this).closest('svg');
    let endLine = parentSVG.find('.end-line');

    let tl = gsap.timeline({
      scrollTrigger: {
        trigger: parentSVG,
        start: 'bottom bottom',
      },
    });

    tl.to($(this), { duration: 1, morphSVG: endLine });
  });

  // Graph Sleep
  $('.hp_tiles-graph_visual').each(function () {
    let lines = $(this).find("[id^='vertical-lines_']");

    gsap.set(lines, {
      transformOrigin: 'bottom',
      scaleY: 0,
    });

    gsap.to(lines, {
      scaleY: 1,
      duration: 0.5,
      ease: 'power2.out',
      stagger: 0.05,
      scrollTrigger: {
        trigger: this,
        start: 'top 80%',
      },
    });
  });
});

// Active Tabs
$(document).ready(function () {
  var isUserInteraction = false; // Flag to track user interactions

  function updateActiveSlice(shouldScroll = false) {
    var $currentTab = $('.w-tab-link.w--current');
    var currentIndex = $('.w-tab-link').index($currentTab);
    $('[data-slice^="slice-"]').removeClass('active');
    if (currentIndex >= 0) {
      $('[data-slice="slice-' + (currentIndex + 1) + '"]').addClass('active');
      // Only scroll if explicitly requested AND on mobile
      if (shouldScroll && window.innerWidth < 480) {
        $('html, body').animate(
          {
            scrollTop: $('.hp-tabs_tabs-slice').offset().top,
          },
          400
        );
      }
    }
  }

  function getClosestTabLink(x, y) {
    var closestTab = null;
    var minDistance = Infinity;
    $('.w-tab-link').each(function () {
      var $tab = $(this);
      var rect = this.getBoundingClientRect();
      var centerX = rect.left + rect.width / 2;
      var centerY = rect.top + rect.height / 2;
      var distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
      if (distance < minDistance) {
        minDistance = distance;
        closestTab = $tab;
      }
    });
    return closestTab;
  }

  var observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        var $target = $(mutation.target);
        if ($target.hasClass('w-tab-link')) {
          // Pass the scroll flag based on whether it's a user interaction
          updateActiveSlice(isUserInteraction);
          // Reset the flag after use
          isUserInteraction = false;
        }
      }
    });
  });

  $('.w-tab-link').each(function () {
    observer.observe(this, {
      attributes: true,
      attributeFilter: ['class'],
    });
  });

  // Set flag when user interacts with slices
  $('[data-slice^="slice-"]').on('click mousemove', function (e) {
    isUserInteraction = true; // Mark as user interaction
    var $closestTab = getClosestTabLink(e.clientX, e.clientY);
    if ($closestTab && $closestTab.length) {
      $closestTab.trigger('tap');
    }
  });

  // Also set flag for direct tab clicks
  $('.w-tab-link').on('click', function () {
    isUserInteraction = true;
  });

  // Initial setup - no scrolling on page load
  updateActiveSlice(false);
});

// Timeline
$(document).ready(function () {
  const config = {
    timeline: '.hp-precision_timeline-wrap',
    container: '.container-large',
    columns: '.hp-precision_col',
    trigger: '.hp-precision_trigger',
    gradientPaths: '.hp-precision_timeline-wrap svg path[stroke*="var"]',
    timelineTexts: '.hp-precision_timeline-text',
  };

  let mainTimeline = null;
  let textTimelines = [];
  let scrollTriggers = [];
  let textPathElements = [];
  let columnStates = [];

  let resizeTimeout;
  let scrollTimeout;
  let isScrolling = false;
  let lastScrollY = window.scrollY;
  let pendingResize = false;
  let orientationChangeTimeout;

  function detectScrolling() {
    const currentScrollY = window.scrollY;
    if (currentScrollY !== lastScrollY) {
      isScrolling = true;
      lastScrollY = currentScrollY;

      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        isScrolling = false;
        if (pendingResize) {
          pendingResize = false;
          executeResize();
        }
      }, 150);
    }
  }

  function executeResize() {
    killAllAnimations();

    setTimeout(() => {
      initAnimation();
    }, 100);
  }

  function handleResize() {
    if (window.innerWidth <= 992) return;

    clearTimeout(resizeTimeout);

    if (isScrolling) {
      pendingResize = true;
      return;
    }

    resizeTimeout = setTimeout(() => {
      if (!isScrolling) {
        executeResize();
      } else {
        pendingResize = true;
      }
    }, 250);
  }

  function killAllAnimations() {
    if (mainTimeline) {
      mainTimeline.kill();
      mainTimeline = null;
    }

    textTimelines.forEach((tl) => tl.kill());
    textTimelines = [];

    scrollTriggers.forEach((st) => st.kill());
    scrollTriggers = [];

    $(config.timeline).find('.timeline-path-text').remove();
    $(config.timelineTexts).css('opacity', '');

    gsap.set(config.timeline, { clearProps: 'all' });
    gsap.set(config.gradientPaths, { clearProps: 'all' });

    textPathElements = [];
    columnStates = [];
  }

  function calculateTimelinePosition() {
    const $timeline = $(config.timeline);
    const $container = $(config.container);
    const $cols = $(config.columns);
    if (!$timeline.length || !$container.length || !$cols.length) return 0;
    const containerRight = $container[0].getBoundingClientRect().right;
    const lastColRight = $cols.last()[0].getBoundingClientRect().right;
    return containerRight - lastColRight;
  }

  function setupPathAnimation() {
    const gradientPaths = $(config.gradientPaths);
    gradientPaths.each(function () {
      const pathLength = this.getTotalLength();
      gsap.set(this, {
        strokeDasharray: pathLength,
        strokeDashoffset: pathLength,
        opacity: 1,
      });
    });
    return gradientPaths;
  }

  function setupTextPathAnimation() {
    const $svg = $(config.timeline).find('svg');

    $(config.timelineTexts).each(function (index) {
      const $text = $(this);
      const textContent = $text.text().toUpperCase();
      const pathId = `line-${index + 1}`;
      const textPathId = `textPath-${index + 1}`;

      const textElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      textElement.setAttribute('class', 'timeline-path-text');
      textElement.setAttribute('font-size', '1.3em');
      textElement.setAttribute('font-family', 'TT Norms Pro Mono, Impact, sans-serif');
      textElement.setAttribute('fill', getComputedStyle($text[0]).color);
      textElement.setAttribute('font-weight', '500');
      textElement.setAttribute('letter-spacing', '.05em');
      textElement.setAttribute('text-transform', 'uppercase');
      textElement.setAttribute('text-anchor', 'end');

      const textPath = document.createElementNS('http://www.w3.org/2000/svg', 'textPath');
      textPath.setAttribute('href', `#${pathId}`);
      textPath.setAttribute('id', textPathId);
      textPath.setAttribute('startOffset', '0%');
      textPath.textContent = textContent;

      textElement.appendChild(textPath);
      $svg[0].appendChild(textElement);

      $text.css('opacity', '0');

      const pathElement = document.querySelector(`#${pathId}`);
      if (pathElement) {
        const textRect = textElement.getBoundingClientRect();
        const individualPathLength = pathElement.getTotalLength();
        let elementWidth = textRect.width;

        if (elementWidth === 0 || elementWidth < 10) {
          elementWidth = textContent.length * 8;
        }

        const numberOfLetters = textPath.textContent.length;
        const startOffsetPercent = (elementWidth / individualPathLength) * 100;

        gsap.set(textElement, { y: '-1.5em' });
        gsap.set(textPath, { attr: { startOffset: `${startOffsetPercent}%` } });

        textPathElements.push({
          textElement: textElement,
          textPath: textPath,
          textPathId: textPathId,
          startOffset: startOffsetPercent,
          endOffset: 100,
          index: index,
        });
      }
    });
  }

  function checkColumnVisibility() {
    const $cols = $(config.columns);

    $cols.each(function (index) {
      const rect = this.getBoundingClientRect();
      const colNumber = index + 1;
      const colWidth = rect.width;
      const windowWidth = window.innerWidth;
      const isStartingToDisappear = rect.left <= 0;
      const is40PercentHidden = rect.left <= -(colWidth * 0.4);
      const isAppearingFromRight = rect.left <= windowWidth && rect.right > windowWidth;
      const isInMiddleOfView = rect.left <= windowWidth / 2;
      const leftSideInMiddle = rect.left <= windowWidth / 2;
      const rightSideInMiddle = rect.right <= windowWidth / 2;

      if (!columnStates[index]) {
        columnStates[index] = {
          startedDisappearing: false,
          is40PercentHidden: false,
          appearingFromRight: false,
          inMiddleOfView: false,
          leftSideInMiddle: false,
          rightSideInMiddle: false,
        };
      }

      if (isStartingToDisappear && !columnStates[index].startedDisappearing) {
        columnStates[index].startedDisappearing = true;
      }

      if (is40PercentHidden && !columnStates[index].is40PercentHidden) {
        columnStates[index].is40PercentHidden = true;
      }

      if (isAppearingFromRight && !columnStates[index].appearingFromRight) {
        columnStates[index].appearingFromRight = true;
      }

      if (leftSideInMiddle && !columnStates[index].leftSideInMiddle) {
        columnStates[index].leftSideInMiddle = true;
      }

      if (rightSideInMiddle && !columnStates[index].rightSideInMiddle) {
        columnStates[index].rightSideInMiddle = true;
      }
    });
  }

  function getBreakpoint() {
    const width = window.innerWidth;
    if (width >= 1440) return 'large-desktop';
    if (width >= 1280) return 'desktop';
    if (width >= 768) return 'tablet';
    return 'mobile';
  }

  function getTextTriggerConditions(index, breakpoint) {
    const checkColumn = (colIndex, state) =>
      columnStates[colIndex] && columnStates[colIndex][state];

    const conditions = {
      'large-desktop': {
        0: () => checkColumn(1, 'startedDisappearing'),
        1: () => checkColumn(1, 'startedDisappearing'),
        2: () => checkColumn(1, 'is40PercentHidden'),
        3: () => checkColumn(1, 'startedDisappearing'),
        4: () => checkColumn(3, 'leftSideInMiddle'),
        5: () => checkColumn(3, 'leftSideInMiddle'),
      },
      desktop: {
        0: () => checkColumn(1, 'startedDisappearing'),
        1: () => checkColumn(1, 'startedDisappearing'),
        2: () => checkColumn(1, 'is40PercentHidden'),
        3: () => checkColumn(1, 'startedDisappearing'),
        4: () => checkColumn(3, 'leftSideInMiddle'),
        5: () => checkColumn(3, 'leftSideInMiddle'),
      },
      tablet: {
        0: () => checkColumn(1, 'startedDisappearing'),
        1: () => checkColumn(1, 'startedDisappearing'),
        2: () => checkColumn(1, 'is40PercentHidden'),
        3: () => checkColumn(1, 'startedDisappearing'),
        4: () => checkColumn(2, 'leftSideInMiddle'),
        5: () => checkColumn(3, 'leftSideInMiddle'),
      },
      mobile: {
        0: () => checkColumn(1, 'startedDisappearing'),
        1: () => checkColumn(1, 'startedDisappearing'),
        2: () => checkColumn(1, 'is40PercentHidden'),
        3: () => checkColumn(1, 'startedDisappearing'),
        4: () => checkColumn(2, 'leftSideInMiddle'),
        5: () => checkColumn(3, 'leftSideInMiddle'),
      },
    };

    return conditions[breakpoint] && conditions[breakpoint][index]
      ? conditions[breakpoint][index]
      : () => false;
  }

  function getTextEndConditions(index, breakpoint) {
    const checkColumn = (colIndex, state) =>
      columnStates[colIndex] && columnStates[colIndex][state];

    const endConditions = {
      'large-desktop': {
        4: () => checkColumn(3, 'rightSideInMiddle'),
      },
      desktop: {
        4: () => checkColumn(3, 'rightSideInMiddle'),
      },
      tablet: {
        4: () => checkColumn(2, 'rightSideInMiddle'),
      },
      mobile: {
        4: () => checkColumn(2, 'rightSideInMiddle'),
      },
    };

    return endConditions[breakpoint] && endConditions[breakpoint][index]
      ? endConditions[breakpoint][index]
      : null;
  }

  function createStandardTextAnimations() {
    const standardElements = textPathElements.filter((element) => element.index !== 4);

    standardElements.forEach((textPathElement) => {
      const { index } = textPathElement;
      let hasStarted = false;
      let startProgress = 0;
      let textAnimation = null;

      const targetElement = document.querySelector(`#${textPathElement.textPathId}`);
      if (targetElement) {
        textAnimation = gsap.fromTo(
          `#${textPathElement.textPathId}`,
          {
            attr: { startOffset: `${textPathElement.startOffset}%` },
          },
          {
            attr: { startOffset: `${textPathElement.endOffset}%` },
            ease: 'none',
            paused: true,
            immediateRender: false,
          }
        );
      }

      const textTl = gsap.timeline({
        scrollTrigger: {
          trigger: config.trigger,
          start: 'top top',
          end: 'bottom bottom',
          scrub: true,
          onUpdate: (self) => {
            const currentBreakpoint = getBreakpoint();

            if (!hasStarted) {
              const triggerCondition = getTextTriggerConditions(index, currentBreakpoint);
              const shouldStart = triggerCondition();

              if (shouldStart) {
                hasStarted = true;
                startProgress = self.progress;
              }
            }

            if (hasStarted && textAnimation) {
              const totalDuration = 1 - startProgress;
              const rawProgress =
                totalDuration > 0 ? (self.progress - startProgress) / totalDuration : 0;
              const relativeProgress = Math.min(1, Math.max(0, rawProgress));
              textAnimation.progress(relativeProgress);
            }
          },
        },
      });

      scrollTriggers.push(textTl.scrollTrigger);
      textTimelines.push(textTl);
    });
  }

  function createCustomEndTextAnimation() {
    const customElement = textPathElements.find((element) => element.index === 4);
    if (!customElement) {
      return;
    }

    let textAnimation = gsap.fromTo(
      `#${customElement.textPathId}`,
      {
        attr: { startOffset: `${customElement.startOffset}%` },
      },
      {
        attr: { startOffset: `${customElement.endOffset}%` },
        ease: 'none',
        duration: 1,
        paused: true,
      }
    );

    let hasStarted = false;
    let startScrollPosition = 0;
    let frameCount = 0;
    let lastTriggerState = false;
    let triggerStableFrames = 0;
    let animationDuration = 0.3;

    ScrollTrigger.create({
      trigger: config.trigger,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => {
        frameCount++;

        if (frameCount < 5) {
          textAnimation.progress(0);
          return;
        }

        checkColumnVisibility();

        const currentBreakpoint = getBreakpoint();
        const triggerCondition = getTextTriggerConditions(4, currentBreakpoint);

        const shouldStart = triggerCondition();

        if (shouldStart === lastTriggerState) {
          triggerStableFrames++;
        } else {
          triggerStableFrames = 0;
          lastTriggerState = shouldStart;
        }

        if (!hasStarted && shouldStart && triggerStableFrames > 2) {
          hasStarted = true;
          startScrollPosition = self.scroll();
        }

        if (hasStarted) {
          const totalScrollRange = self.end - self.start;
          const animationRange = totalScrollRange * animationDuration;
          const currentRange = self.scroll() - startScrollPosition;
          const progress = Math.min(1, Math.max(0, currentRange / animationRange));

          textAnimation.progress(progress);
        }
      },
    });
  }

  function initAnimation() {
    const moveX = calculateTimelinePosition();
    const gradientPaths = setupPathAnimation();
    setupTextPathAnimation();

    mainTimeline = gsap.timeline({
      scrollTrigger: {
        trigger: config.trigger,
        start: 'top top',
        end: 'bottom bottom',
        scrub: true,
        onUpdate: checkColumnVisibility,
        onRefresh: () => checkColumnVisibility(),
      },
    });

    scrollTriggers.push(mainTimeline.scrollTrigger);

    mainTimeline
      .to(config.timeline, { x: moveX, ease: 'none' }, 0)
      .to(gradientPaths, { strokeDashoffset: 0, ease: 'none' }, 0);

    createStandardTextAnimations();
    createCustomEndTextAnimation();

    ScrollTrigger.refresh();
  }

  initAnimation();

  $(window).on('resize', handleResize);
  $(window).on('scroll', detectScrolling);

  $(window).on('orientationchange', function () {
    if (window.innerWidth <= 992) return;

    clearTimeout(orientationChangeTimeout);
    orientationChangeTimeout = setTimeout(() => {
      if (!isScrolling) {
        executeResize();
      } else {
        pendingResize = true;
      }
    }, 2000);
  });
});

// Grid 2
$('.hp_features-card.is-2').each(function () {
  let self = $(this);

  function initializeElements() {
    for (let i = 1; i <= 7; i++) {
      if (self.find(`#line-${i}`).length) {
        gsap.set(self.find(`#line-${i}`), { drawSVG: '100% 100%' });
      }
      if (self.find(`#dot-start-${i}`).length) {
        gsap.set(self.find(`#dot-start-${i}`), { scale: 0, transformOrigin: 'center center' });
      }
      if (self.find(`#dot-end-${i}`).length) {
        gsap.set(self.find(`#dot-end-${i}`), { scale: 0, transformOrigin: 'center center' });
      }
      if (self.find(`#pin-${i}`).length) {
        gsap.set(self.find(`#pin-${i}`), { x: 0, opacity: 0 });
      }
    }
  }

  function startAnimation() {
    const masterTL = gsap.timeline({
      scrollTrigger: {
        trigger: self,
        start: 'bottom bottom',
      },
    });

    for (let i = 1; i <= 7; i++) {
      if (self.find(`#dot-start-${i}`).length) {
        masterTL.to(self.find(`#dot-start-${i}`), {
          scale: 1,
          duration: 0.2,
          ease: 'back.out(1.7)',
        });
      }
      if (self.find(`#line-${i}`).length) {
        masterTL.to(
          self.find(`#line-${i}`),
          {
            drawSVG: '0% 100%',
            duration: 0.4,
            ease: 'back.out(1.7)',
          },
          '<0.1'
        );
      }
      if (self.find(`#dot-end-${i}`).length) {
        masterTL.to(
          self.find(`#dot-end-${i}`),
          {
            scale: 1,
            duration: 0.2,
            ease: 'back.out(1.7)',
          },
          '<0.1'
        );
      }
      if (self.find(`#pin-${i}`).length) {
        masterTL.to(
          self.find(`#pin-${i}`),
          {
            x: 0,
            opacity: 1,
            duration: 0.3,
            ease: 'back.out(1.7)',
          },
          '<-0.2'
        );
      }
    }
  }

  initializeElements();
  startAnimation();
});

$('.hp_features-card.is-3').each(function () {
  let self = $(this);

  function initializeElements() {
    gsap.set(self.find('#bio-person'), { y: 50, opacity: 0 });
    gsap.set(self.find('#bio-sphere'), { scale: 0 });

    for (let i = 1; i <= 7; i++) {
      if (self.find(`#bio-axis-${i}`).length) {
        gsap.set(self.find(`#bio-axis-${i} path`), { drawSVG: '100% 100%' });
      }
    }
  }

  function animateAxis(elementId) {
    gsap.to(self.find(elementId), {
      rotation: gsap.utils.random(-8, 8),
      duration: gsap.utils.random(1, 2.5),
      ease: 'power2.inOut',
      repeat: -1,
      yoyo: true,
      repeatDelay: gsap.utils.random(0.5, 2),
      transformOrigin: 'center center',
    });
  }

  function startAnimation() {
    const masterTL = gsap.timeline({
      scrollTrigger: {
        trigger: self,
        start: 'bottom bottom',
      },
    });

    masterTL.to(self.find('#bio-person'), {
      y: 0,
      opacity: 1,
      duration: 0.8,
      ease: 'power2.out',
    });

    masterTL.to(
      self.find('#bio-sphere'),
      {
        scale: 1,
        duration: 0.5,
        ease: 'power2.out',
      },
      '<=0.1'
    );

    masterTL.add(() => {
      for (let i = 1; i <= 7; i++) {
        if (self.find(`#bio-axis-${i}`).length) {
          gsap.to(self.find(`#bio-axis-${i} path`), {
            drawSVG: '0% 100%',
            duration: gsap.utils.random(1, 2),
            ease: 'power2.out',
            delay: gsap.utils.random(0, 1),
          });

          setTimeout(() => {
            animateAxis(`#bio-axis-${i}`);
          }, gsap.utils.random(1000, 3000));
        }
      }
    }, '<=0.1');
  }

  initializeElements();
  startAnimation();
});

$('.hp_features-card.is-4').each(function () {
  const $card = $(this);

  function initHeartbeat() {
    const line1 = $card.find('#line-1')[0];
    const line2 = $card.find('#line-2')[0];
    const line1Length = line1.getTotalLength();
    const line2Length = line2.getTotalLength();

    gsap.set($card.find('#line-1'), {
      strokeDasharray: line1Length,
      strokeDashoffset: line1Length,
    });

    gsap.set($card.find('#line-2'), {
      strokeDasharray: line2Length,
      strokeDashoffset: line2Length,
    });

    const line1Timeline = gsap.timeline({
      scrollTrigger: { trigger: $card, start: 'bottom bottom' },
      repeat: -1,
    });
    line1Timeline.to(
      $card.find('#line-1'),
      {
        strokeDashoffset: -line1Length,
        duration: 5,
        ease: 'power1.in',
      },
      0
    );

    const line2Timeline = gsap.timeline();
    line2Timeline.to(
      $card.find('#line-2'),
      {
        strokeDashoffset: 0,
        duration: 5,
        ease: 'power1.inOut',
      },
      0
    );
  }

  initHeartbeat();
});

$('.hp_features-card.is-5').each(function () {
  function updateCircularClipPath(progress, $loader) {
    if (progress === 0) {
      $loader.css('clip-path', 'polygon(50% 50%, 50% 0%, 50% 0%)');
      return;
    }

    const angle = (progress / 100) * 360;
    const points = ['50% 50%', '50% 0%'];

    const steps = Math.min(Math.ceil(angle / 8), 45);

    for (let i = 0; i <= steps; i++) {
      const currentAngle = i * 8;
      if (currentAngle > angle) break;

      const radians = (currentAngle - 90) * (Math.PI / 180);
      const x = 50 + 50 * Math.cos(radians);
      const y = 50 + 50 * Math.sin(radians);

      points.push(`${x.toFixed(2)}% ${y.toFixed(2)}%`);
    }

    if (angle % 8 !== 0) {
      const radians = (angle - 90) * (Math.PI / 180);
      const x = 50 + 50 * Math.cos(radians);
      const y = 50 + 50 * Math.sin(radians);
      points.push(`${x.toFixed(2)}% ${y.toFixed(2)}%`);
    }

    $loader.css('clip-path', `polygon(${points.join(', ')})`);
  }

  const $card = $(this);
  const $loader = $card.find('.hp_features-card_health-loader');
  const $cols = $card.find('.hp_features-card_health-col');

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: $card,
      start: 'bottom bottom',
    },
  });

  tl.set($loader, {
    clipPath: 'polygon(50% 50%, 50% 0%, 50% 0%)',
    opacity: '1',
  })

    .to(
      {},
      {
        duration: 2.4,
        ease: 'power2.out',
        onUpdate: function () {
          const progress = this.progress() * 67;
          updateCircularClipPath(progress, $loader);
        },
      }
    )

    .to(
      $cols,
      {
        duration: 5,
        ease: 'power4.out',
        y: function (index) {
          return index === 0 ? '-60%' : '-70%';
        },
      },
      0
    );
});

$('.hp_features-card.is-6').each(function () {
  let tl = gsap.timeline({
    scrollTrigger: {
      trigger: $(this),
      start: 'bottom bottom',
    },
  });
  let card = $('.hp_features-card_doctor-box');
  let avatars = $('.hp_features-card_doctor-pill');
  let items = $('.hp_features-card_doctor-par')
    .add('.hp_features-card_doctor-btn')
    .add('.hp_features-card_doctor-back');

  gsap.set([card, avatars], { scale: 0.7, opacity: 0 });
  gsap.set(items, { y: '1em', opacity: 0 });

  tl.to([card, avatars], { scale: 1, opacity: 1, ease: 'power4.out', duration: 1, stagger: 0.05 });
  tl.to(items, { y: '0em', opacity: 1, stagger: 0.1 }, '<0.4');
});

}); // end waitForGlobals
