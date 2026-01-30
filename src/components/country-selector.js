/**
 * Country Selector Component
 * Handles country dropdown initialization with priority countries (DE, AT, CH)
 */

/**
 * Create country option elements with priority countries first
 * @param {Array} countries - Array of country objects with Name and Code
 * @returns {Array<HTMLOptionElement>} Array of option elements
 */
const createCountryOptions = (countries) => {
  const priorityCountries = ['Germany', 'Austria', 'Switzerland'];

  const priority = countries
    .filter((country) => priorityCountries.includes(country.Name))
    .sort((a, b) => priorityCountries.indexOf(a.Name) - priorityCountries.indexOf(b.Name));

  const remaining = countries
    .filter((country) => !priorityCountries.includes(country.Name))
    .sort((a, b) => a.Name.localeCompare(b.Name));

  const sortedCountries = [...priority, ...remaining];

  return sortedCountries.map((country) => {
    const option = document.createElement('option');
    option.value = country.Name;
    option.textContent = country.Name;
    option.setAttribute('data-code', country.Code);
    if (country.Name === 'Germany') {
      option.selected = true;
    }
    return option;
  });
};

/**
 * Initialize country selector dropdown
 * Uses jQuery and Nice Select library
 */
export const initCountrySelector = () => {
  const selectElement = $('#country');

  if (!selectElement.length) return;

  // Clear existing options
  selectElement.empty();

  // Get countries from global (loaded via CDN)
  const countriesList = window.countries || [];

  if (countriesList.length === 0) {
    console.warn('Countries list not loaded');
    return;
  }

  // Create and append country options
  const countryOptions = createCountryOptions(countriesList);
  countryOptions.forEach((option) => selectElement.append(option));

  // Set default value
  if (!selectElement.val()) {
    selectElement.val('Germany');
  }

  // Initialize Nice Select on all select elements
  $('select').niceSelect();

  // Update Nice Select UI for country dropdown
  const countryNiceSelect = selectElement.next('.nice-select');
  if (countryNiceSelect.length) {
    countryNiceSelect.find('.current').text('Germany').css('color', 'black');
    countryNiceSelect.find('li[data-value="Germany"]').addClass('selected');
    countryNiceSelect.find('li[data-value=""]').remove();
  }

  // Handle Nice Select click events
  $('.nice-select li').on('click', function () {
    const niceSelect = $(this).closest('.nice-select');
    niceSelect.find('.current').css('color', 'black');
    niceSelect.removeClass('open');
    niceSelect.find('.list').removeClass('open');
  });

  // Ensure dropdown closes after selection
  $(document).on('click', '.nice-select li', function () {
    const niceSelect = $(this).closest('.nice-select');
    setTimeout(function () {
      niceSelect.removeClass('open');
      niceSelect.find('.list').removeClass('open');
    }, 100);
  });
};

export default initCountrySelector;
