/**
 * Form Analytics Module
 * Handles analytics events, user engagement tracking, and GTM integration
 */

import { isEnglishSite } from './config.js';

/**
 * Check if user has given consent for analytics
 * @returns {boolean}
 */
const hasConsent = () => {
  return window.Cookiebot
    ? window.Cookiebot.consent.marketing && window.Cookiebot.consent.statistics
    : true;
};

/**
 * Fire an analytics event to GTM/dataLayer
 * @param {string} eventName - Name of the event
 * @param {object} eventData - Event data payload
 */
const fireEvent = (eventName, eventData = {}) => {
  if (!hasConsent()) return;

  // Push to dataLayer
  if (typeof window.dataLayer !== 'undefined') {
    window.dataLayer.push({
      event: eventName,
      ...eventData,
    });
  }

  // Fire specific events to gtag
  if (
    typeof window.gtag !== 'undefined' &&
    (eventName === 'generate_lead' || eventName === 'waitlist_conversion')
  ) {
    window.gtag('event', eventName, eventData);
  }
};

/**
 * Get personalized message based on user segment
 * @param {string} segment - User segment
 * @returns {string}
 */
const getPersonalizedMessage = (segment) => {
  const messages = {
    high_engagement: isEnglishSite()
      ? "Based on your interest, you'll receive premium health insights and early access."
      : 'Basierend auf Ihrem Interesse erhalten Sie Premium-Gesundheitseinblicke und frühen Zugang.',
    medium_engagement: isEnglishSite()
      ? "You'll receive our health education series and personalized tips."
      : 'Sie erhalten unsere Gesundheitsbildungsreihe und personalisierte Tipps.',
    low_engagement: isEnglishSite()
      ? "You'll receive essential health updates and wellness tips."
      : 'Sie erhalten wichtige Gesundheitsupdates und Wellness-Tipps.',
    default: isEnglishSite()
      ? "You'll receive personalized health insights tailored to your interests."
      : 'Sie erhalten personalisierte Gesundheitseinblicke, die auf Ihre Interessen zugeschnitten sind.',
  };
  return messages[segment] || messages['default'];
};

/**
 * FormAnalytics object - tracks user engagement and fires analytics events
 */
export const FormAnalytics = {
  // Session tracking state
  sessionStart: Date.now(),
  maxScroll: 0,
  sectionsViewed: [],
  clickCount: 0,

  // Methods
  hasConsent,
  fireEvent,
  getPersonalizedMessage,

  /**
   * Calculate user engagement score
   * @returns {number} Score between 0-100
   */
  calculateEngagementScore: function () {
    const timeOnSite = Math.round((Date.now() - this.sessionStart) / 1000);
    const score = Math.min(
      timeOnSite / 10 + (this.maxScroll / 100) * 15 + this.clickCount * 2 + this.sectionsViewed.length * 5,
      100
    );
    return Math.round(score);
  },

  /**
   * Get user segment based on engagement score
   * @returns {string} Segment name
   */
  getSegment: function () {
    const score = this.calculateEngagementScore();
    if (score >= 60) return 'high_engagement';
    if (score >= 35) return 'medium_engagement';
    return 'low_engagement';
  },

  /**
   * Build complete user profile for form submission
   * @returns {object} User profile object
   */
  buildUserProfile: function () {
    const timeOnSite = Math.round((Date.now() - this.sessionStart) / 1000);
    const engagementScore = this.calculateEngagementScore();
    const segment = this.getSegment();

    return {
      segment: segment,
      engagement_score: engagementScore,
      time_on_site: timeOnSite,
      scroll_depth: this.maxScroll,
      sections_viewed: this.sectionsViewed,
      health_interests: {
        biomarkers: this.sectionsViewed.includes('biomarkers'),
        doctor_collaboration: this.sectionsViewed.includes('doctor'),
        seven_pillars: this.sectionsViewed.includes('pillars'),
        precision_health: this.sectionsViewed.includes('precision'),
        longevity_focused: this.maxScroll > 50,
      },
      email_sequences: {
        welcome_series: true,
        health_education: segment !== 'low_engagement',
        biomarker_deep_dive: this.sectionsViewed.includes('biomarkers'),
        premium_content: segment === 'high_engagement',
      },
      signup_context: {
        source: 'bluesphere_waitlist',
        signup_time: new Date().toISOString(),
        referrer: document.referrer || 'direct',
        landing_page: window.location.pathname,
        device_type: /Mobile|Android|iPhone/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
      },
    };
  },
};

/**
 * Initialize scroll tracking
 */
const initScrollTracking = () => {
  window.addEventListener('scroll', () => {
    const scrollPercent = Math.round(
      (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
    );
    if (scrollPercent > FormAnalytics.maxScroll) {
      FormAnalytics.maxScroll = scrollPercent;
    }
  });
};

/**
 * Initialize section view tracking with IntersectionObserver
 */
const initSectionTracking = () => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const section = entry.target.getAttribute('data-section');
          if (section && !FormAnalytics.sectionsViewed.includes(section)) {
            FormAnalytics.sectionsViewed.push(section);
          }
        }
      });
    },
    { threshold: 0.5 }
  );

  document.querySelectorAll('[data-section]').forEach((section) => {
    observer.observe(section);
  });
};

/**
 * Initialize click counting
 */
const initClickTracking = () => {
  document.addEventListener('click', () => {
    FormAnalytics.clickCount++;
  });
};

/**
 * Initialize waitlist button tracking
 */
const initWaitlistButtonTracking = () => {
  const waitlistButtons = document.querySelectorAll('a[href*="waitlist"], .w-button');

  waitlistButtons.forEach((button) => {
    if (button.textContent.toLowerCase().match(/join|waitlist/)) {
      button.addEventListener('click', () => {
        const userProfile = FormAnalytics.buildUserProfile();

        // Store profile for form submission
        sessionStorage.setItem('bluesphere_user_profile', JSON.stringify(userProfile));

        // Fire analytics events
        FormAnalytics.fireEvent('waitlist_form_submit', {
          user_profile: userProfile,
          segment: userProfile.segment,
          engagement_score: userProfile.engagement_score,
        });

        if (typeof window.gtag !== 'undefined') {
          window.gtag('event', 'waitlist_button_click', {
            engagement_score: userProfile.engagement_score,
            segment: userProfile.segment,
            sections_viewed: userProfile.sections_viewed.join(','),
          });
        }
      });
    }
  });
};

/**
 * Initialize all engagement tracking
 */
export const initEngagementTracking = () => {
  initScrollTracking();
  initSectionTracking();
  initClickTracking();
  initWaitlistButtonTracking();
};

// Expose to window for backward compatibility
if (typeof window !== 'undefined') {
  window.FormAnalytics = FormAnalytics;
  window.getPersonalizedMessage = getPersonalizedMessage;
}

export default FormAnalytics;
