/**
 * Core Configuration
 * Environment detection, CDN paths, and feature flags
 */

// Environment Detection
export const isStaging = () => {
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem('isStagingForMe') === 'true';
  }
  return false;
};

export const isProduction = () => !isStaging();

export const isEnglishSite = () => {
  if (typeof window !== 'undefined') {
    return window.location.pathname.includes('/en');
  }
  return false;
};

export const getLanguage = () => (isEnglishSite() ? 'en' : 'de');

// CDN Configuration
const REPOSITORY = 'https://cdn.jsdelivr.net/gh/tomasmrazek92/bluesphere@';
const VERSION = '1.7';
const LOCAL_SERVER = 'https://localhost:3000/';

export const getBasePath = () => {
  return isStaging() ? LOCAL_SERVER : `${REPOSITORY}${VERSION}/dist/`;
};

// Script Loader
export const loadScript = (src) => {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.defer = true;
    script.onload = resolve;
    script.onerror = reject;
    document.body.appendChild(script);
  });
};

export const loadStylesheet = (href) => {
  return new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.onload = resolve;
    link.onerror = reject;
    document.head.appendChild(link);
  });
};

// Page Script Loader (exposed globally for Webflow)
export const loadPageScript = (pageScriptName) => {
  const basePath = getBasePath();
  return loadScript(basePath + pageScriptName);
};

// Expose to window for Webflow compatibility
if (typeof window !== 'undefined') {
  window.loadPageScript = loadPageScript;
}

// API Configuration
export const API_CONFIG = {
  waitlistEndpoint:
    'https://lth-waitlist-dev.orangegrass-967fbaa9.germanywestcentral.azurecontainerapps.io/api/waitlist/signup',
};

// Analytics Configuration
export const ANALYTICS_CONFIG = {
  gtmId: 'GTM-N2ZXQR7G',
  cookiebotId: '03da975b-8eec-4f4d-8c7f-514c74e510c2',
};

// Feature Flags
export const FEATURES = {
  enableAnalytics: true,
  enableFormValidation: true,
  enableAnimations: true,
};
