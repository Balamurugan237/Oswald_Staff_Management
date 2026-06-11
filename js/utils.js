/**
 * utils.js - Core validation and UI utility helpers
 */

// Regex patterns
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const AADHAAR_REGEX = /^\d{12}$/;
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[6-9]\d{9}$/; // Standard 10 digit Indian mobile numbers

/**
 * Validates a PAN (Permanent Account Number) Card
 * @param {string} pan 
 * @returns {boolean}
 */
export function validatePAN(pan) {
  if (!pan) return false;
  return PAN_REGEX.test(pan.trim().toUpperCase());
}

/**
 * Validates an Aadhaar Number (12 digits)
 * @param {string} aadhaar 
 * @returns {boolean}
 */
export function validateAadhaar(aadhaar) {
  if (!aadhaar) return false;
  return AADHAAR_REGEX.test(aadhaar.trim());
}

/**
 * Validates an IFSC Code (11 alphanumeric characters)
 * @param {string} ifsc 
 * @returns {boolean}
 */
export function validateIFSC(ifsc) {
  if (!ifsc) return false;
  return IFSC_REGEX.test(ifsc.trim().toUpperCase());
}

/**
 * Validates Email Format
 * @param {string} email 
 * @returns {boolean}
 */
export function validateEmail(email) {
  if (!email) return false;
  return EMAIL_REGEX.test(email.trim().toLowerCase());
}

/**
 * Validates Indian Phone Number (10 digits starting with 6-9)
 * @param {string} phone 
 * @returns {boolean}
 */
export function validatePhone(phone) {
  if (!phone) return false;
  return PHONE_REGEX.test(phone.trim());
}

/**
 * Formats a number as Indian Currency (INR, ₹)
 * @param {number} amount 
 * @returns {string}
 */
export function formatCurrency(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) {
    amount = 0;
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(amount);
}

/**
 * Formats a Date string or Object into a readable date
 * @param {string|Date} dateVal 
 * @param {boolean} includeYear 
 * @returns {string}
 */
export function formatDate(dateVal, includeYear = true) {
  if (!dateVal) return 'N/A';
  const date = new Date(dateVal);
  if (isNaN(date.getTime())) return 'N/A';
  
  const options = { day: 'numeric', month: 'short' };
  if (includeYear) options.year = 'numeric';
  
  return date.toLocaleDateString('en-IN', options);
}

/**
 * Renders and displays a self-removing toast notification
 * @param {string} title - Title of notification
 * @param {string} message - Description message
 * @param {'success'|'warning'|'danger'|'info'} type - Toast type class
 * @param {number} duration - Time before removal in ms
 */
export function showToast(title, message, type = 'info', duration = 4000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  // Select icon based on type
  let iconSVG = '';
  if (type === 'success') {
    iconSVG = `<svg class="toast-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
  } else if (type === 'warning') {
    iconSVG = `<svg class="toast-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
  } else if (type === 'danger') {
    iconSVG = `<svg class="toast-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
  } else {
    iconSVG = `<svg class="toast-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
  }

  toast.innerHTML = `
    ${iconSVG}
    <div class="toast-body">
      <h5>${title}</h5>
      <p>${message}</p>
    </div>
  `;

  container.appendChild(toast);

  // Set timeout to start exit transition
  const exitTimeout = setTimeout(() => {
    toast.classList.add('toast-exit');
    toast.addEventListener('animationend', () => {
      toast.remove();
    });
  }, duration - 300);

  // Allow clicking toast to close immediately
  toast.addEventListener('click', () => {
    clearTimeout(exitTimeout);
    toast.classList.add('toast-exit');
    toast.addEventListener('animationend', () => {
      toast.remove();
    });
  });
}

/**
 * Formats full dates with time
 * @param {Date} date 
 * @returns {string}
 */
export function formatSystemTime(date) {
  const options = { 
    weekday: 'short', 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true 
  };
  return date.toLocaleDateString('en-IN', options);
}
