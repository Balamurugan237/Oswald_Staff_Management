/**
 * src/utils.js - Core validation and UI utility helpers for React
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
 * Dispatches a custom toast event to be caught by the App layout Toast container
 * @param {string} title 
 * @param {string} message 
 * @param {'success'|'warning'|'danger'|'info'} type 
 * @param {number} duration 
 */
export function showToast(title, message, type = 'info', duration = 4000) {
  const event = new CustomEvent('app_toast', {
    detail: { title, message, type, duration }
  });
  window.dispatchEvent(event);
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

/**
 * Formats check-in/out times nicely (HH:MM AM/PM)
 * @param {string|Date} timeVal 
 * @returns {string}
 */
export function formatTimeAMPM(timeVal) {
  if (!timeVal) return '';
  
  // If it's a "HH:MM" 24h string (from time inputs)
  if (typeof timeVal === 'string' && timeVal.includes(':') && !timeVal.includes('T')) {
    const [h, m] = timeVal.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayHour = h % 12 || 12;
    const displayMin = String(m).padStart(2, '0');
    return `${displayHour}:${displayMin} ${ampm}`;
  }
  
  // Otherwise try parsing as date
  const date = new Date(timeVal);
  if (isNaN(date.getTime())) return String(timeVal);
  
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  return `${hours}:${minutes} ${ampm}`;
}
