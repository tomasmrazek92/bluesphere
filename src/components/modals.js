/**
 * Modal Component
 * Handles modal open/close functionality with scroll lock
 */

/**
 * Initialize modal system
 * @returns {object} Modal controller with openModal and closeAllModals methods
 */
export const initModalBasic = () => {
  const $body = $(document.body);
  let scrollPosition = 0;
  let isScrollDisabled = false;

  const modalGroup = document.querySelector('[data-modal-group-status]');
  const modals = document.querySelectorAll('[data-modal-name]');
  const modalTargets = document.querySelectorAll('[data-modal-target]');

  /**
   * Disable page scrolling
   */
  const disableScroll = () => {
    const oldWidth = $body.innerWidth();
    scrollPosition = window.pageYOffset;
    $body.css({
      overflow: 'hidden',
      position: 'fixed',
      top: `-${scrollPosition}px`,
      width: oldWidth,
    });
    isScrollDisabled = true;
  };

  /**
   * Enable page scrolling
   */
  const enableScroll = () => {
    $body.css({
      overflow: '',
      position: '',
      top: '',
      width: '',
    });
    $(window).scrollTop(scrollPosition);
    isScrollDisabled = false;
  };

  /**
   * Open a specific modal by name
   * @param {string} modalTargetName - The modal target name
   */
  const openModal = (modalTargetName) => {
    // Reset all modal states
    modalTargets.forEach((target) => target.setAttribute('data-modal-status', 'not-active'));
    modals.forEach((modal) => modal.setAttribute('data-modal-status', 'not-active'));

    // Find and activate target elements
    const targetElement = document.querySelector(`[data-modal-target="${modalTargetName}"]`);
    const modalElement = document.querySelector(`[data-modal-name="${modalTargetName}"]`);

    if (targetElement) targetElement.setAttribute('data-modal-status', 'active');
    if (modalElement) modalElement.setAttribute('data-modal-status', 'active');

    // Activate modal group
    if (modalGroup) {
      modalGroup.setAttribute('data-modal-group-status', 'active');
    }

    disableScroll();
  };

  /**
   * Close all open modals
   */
  const closeAllModals = () => {
    modalTargets.forEach((target) => target.setAttribute('data-modal-status', 'not-active'));
    modals.forEach((modal) => modal.setAttribute('data-modal-status', 'not-active'));

    if (modalGroup) {
      modalGroup.setAttribute('data-modal-group-status', 'not-active');
    }

    if (isScrollDisabled) {
      enableScroll();
    }
  };

  // Setup click handlers for modal triggers
  modalTargets.forEach((modalTarget) => {
    modalTarget.addEventListener('click', function () {
      const modalTargetName = this.getAttribute('data-modal-target');
      openModal(modalTargetName);
    });
  });

  // Setup close button handlers
  document.querySelectorAll('[data-modal-close]').forEach((closeBtn) => {
    closeBtn.addEventListener('click', closeAllModals);
  });

  // Setup ESC key handler
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      closeAllModals();
    }
  });

  return {
    openModal,
    closeAllModals,
  };
};

/**
 * Initialize modals and expose to window
 */
export const initModals = () => {
  const modalController = initModalBasic();

  // Expose to window for global access
  window.openModal = modalController.openModal;
  window.closeAllModals = modalController.closeAllModals;

  return modalController;
};

export default initModals;
