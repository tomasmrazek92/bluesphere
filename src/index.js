import { initMaskTextReveal } from './textmask';

function waitForGlobals(callback) {
  if (typeof gsap !== 'undefined' && typeof $ !== 'undefined' && typeof countries !== 'undefined') {
    callback();
  } else {
    setTimeout(function () { waitForGlobals(callback); }, 50);
  }
}

waitForGlobals(function () {

gsap.registerPlugin(MorphSVGPlugin, ScrollTrigger, DrawSVGPlugin, SplitText);

// Country Selection
$(document).ready(function () {
  const selectElement = $('#country');

  function createCountryOptions(countries) {
    const priorityCountries = ['Germany', 'Austria', 'Switzerland'];

    const priority = countries
      .filter((country) => priorityCountries.includes(country.Name))
      .sort((a, b) => priorityCountries.indexOf(a.Name) - priorityCountries.indexOf(b.Name));

    const remaining = countries
      .filter((country) => !priorityCountries.includes(country.Name))
      .sort((a, b) => a.Name.localeCompare(b.Name));

    const sortedCountries = [...priority, ...remaining];

    return sortedCountries.map((country, index) => {
      const option = document.createElement('option');
      option.value = country.Name;
      option.textContent = country.Name;
      option.setAttribute('data-code', country.Code);
      if (country.Name === 'Germany') {
        option.selected = true;
      }
      return option;
    });
  }

  selectElement.empty();

  const countryOptions = createCountryOptions(countries);
  countryOptions.forEach((option) => selectElement.append(option));

  if (!selectElement.val()) {
    selectElement.val('Germany');
  }

  $('select').niceSelect();

  const countryNiceSelect = selectElement.next('.nice-select');
  if (countryNiceSelect.length) {
    countryNiceSelect.find('.current').text('Germany').css('color', 'black');
    countryNiceSelect.find('li[data-value="Germany"]').addClass('selected');
    countryNiceSelect.find('li[data-value=""]').remove();
  }

  $('.nice-select li').on('click', function () {
    var niceSelect = $(this).closest('.nice-select');
    niceSelect.find('.current').css('color', 'black');
    niceSelect.removeClass('open');
    niceSelect.find('.list').removeClass('open');
  });

  $(document).on('click', '.nice-select li', function () {
    var niceSelect = $(this).closest('.nice-select');
    setTimeout(function () {
      niceSelect.removeClass('open');
      niceSelect.find('.list').removeClass('open');
    }, 100);
  });
});

// Button Character Stagger Animation
function initButtonCharacterStagger() {
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
}

initButtonCharacterStagger();

initMaskTextReveal('[data-split="heading"]');

// Modals
function initModalBasic() {
  var $body = $(document.body);
  var scrollPosition = 0;
  var isScrollDisabled = false;
  var currentBreakpoint = '';
  const modalGroup = document.querySelector('[data-modal-group-status]');
  const modals = document.querySelectorAll('[data-modal-name]');
  const modalTargets = document.querySelectorAll('[data-modal-target]');

  function openModal(modalTargetName) {
    modalTargets.forEach((target) => target.setAttribute('data-modal-status', 'not-active'));
    modals.forEach((modal) => modal.setAttribute('data-modal-status', 'not-active'));
    const targetElement = document.querySelector(`[data-modal-target="${modalTargetName}"]`);
    const modalElement = document.querySelector(`[data-modal-name="${modalTargetName}"]`);
    if (targetElement) targetElement.setAttribute('data-modal-status', 'active');
    if (modalElement) modalElement.setAttribute('data-modal-status', 'active');
    if (modalGroup) {
      modalGroup.setAttribute('data-modal-group-status', 'active');
    }
    disableScroll();
  }

  modalTargets.forEach((modalTarget) => {
    modalTarget.addEventListener('click', function () {
      const modalTargetName = this.getAttribute('data-modal-target');
      openModal(modalTargetName);
    });
  });

  document.querySelectorAll('[data-modal-close]').forEach((closeBtn) => {
    closeBtn.addEventListener('click', closeAllModals);
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      closeAllModals();
    }
  });

  function closeAllModals() {
    modalTargets.forEach((target) => target.setAttribute('data-modal-status', 'not-active'));
    modals.forEach((modal) => modal.setAttribute('data-modal-status', 'not-active'));
    if (modalGroup) {
      modalGroup.setAttribute('data-modal-group-status', 'not-active');
    }
    if (isScrollDisabled) {
      enableScroll();
    }
  }

  function disableScroll() {
    var oldWidth = $body.innerWidth();
    scrollPosition = window.pageYOffset;
    $body.css({
      overflow: 'hidden',
      position: 'fixed',
      top: `-${scrollPosition}px`,
      width: oldWidth,
    });
    isScrollDisabled = true;
  }

  function enableScroll() {
    $body.css({
      overflow: '',
      position: '',
      top: '',
      width: '',
    });
    $(window).scrollTop(scrollPosition);
    isScrollDisabled = false;
  }

  return {
    openModal: openModal,
    closeAllModals: closeAllModals,
  };
}

let modalController;

modalController = initModalBasic();
window.openModal = modalController.openModal;
window.closeAllModals = modalController.closeAllModals;

}); // end waitForGlobals
