// Text Reveal
export function initMaskTextReveal(el) {
  const splitConfig = {
    lines: { duration: 0.8, stagger: 0.08 },
    words: { duration: 1, stagger: 0.06 },
    chars: { duration: 0.4, stagger: 0.01 },
  };

  let splitInstances = [];
  let scrollTriggerInstances = [];

  function setupSplitText() {
    scrollTriggerInstances.forEach((trigger) => {
      if (trigger) trigger.kill();
    });

    splitInstances.forEach((split) => {
      if (split) split.revert();
    });

    splitInstances = [];
    scrollTriggerInstances = [];

    $(el).each(function () {
      const heading = $(this);
      if (heading.hasClass('animated')) return;
      const type = heading.data('split-reveal') || 'lines';
      const typesToSplit =
        type === 'lines'
          ? ['lines']
          : type === 'words'
          ? ['lines', 'words']
          : ['lines', 'words', 'chars'];

      const isInsideLi = heading.closest('li').length > 0;

      gsap.set(heading, { visibility: 'visible', opacity: 1 });

      if (isInsideLi) {
        gsap.set(heading.closest('li'), { opacity: 0 });
      }

      try {
        const splitText = new SplitText(heading[0], {
          type: typesToSplit.join(', '),
          mask: 'lines',
          linesClass: 'line',
          wordsClass: 'word',
          charsClass: 'letter',
        });

        splitInstances.push(splitText);

        const targets = splitText[type];
        if (!targets || targets.length === 0) {
          console.warn('No split targets found for', heading);
          return;
        }

        gsap.set(targets, { yPercent: 110 });

        const config = splitConfig[type];
        const triggerType = heading.data('trigger-type') || 'load';

        const animateText = () => {
          const tl = gsap.timeline({
            onComplete: () => {
              heading.addClass('animated');
            },
          });

          if (isInsideLi) {
            tl.to(
              heading.closest('li'),
              {
                opacity: 1,
                duration: config.duration * 0.3,
                ease: 'power2.out',
              },
              0
            );
          }

          tl.to(
            targets,
            {
              yPercent: -8,
              duration: config.duration,
              stagger: config.stagger,
              ease: 'expo.out',
            },
            isInsideLi ? config.duration * 0.15 : 0
          );

          return tl;
        };

        if (triggerType === 'scroll') {
          const trigger = ScrollTrigger.create({
            trigger: heading[0],
            start: 'clamp(top 80%)',
            once: true,
            markers: heading.data('debug-markers') === 'true',
            onEnter: animateText,
          });

          scrollTriggerInstances.push(trigger);
        } else {
          gsap.delayedCall(0.2, animateText);
        }
      } catch (error) {
        console.error('Error in SplitText:', error);
      }
    });
  }

  setTimeout(setupSplitText, 300);

  function debounce(func, wait) {
    let timeout;
    return function () {
      const context = this;
      const args = arguments;
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(context, args), wait);
    };
  }

  const debouncedResize = debounce(setupSplitText, 200);
  $(window).on('resize', debouncedResize);

  return function cleanup() {};
}
