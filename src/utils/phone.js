/**
 * Unified Phone Number Formatting for Warhawks Cricket Application
 * Strictly enforces the common "+91xxxxxxxxxx" format across both Player & Organizer roles.
 * Eliminates sporadic spaces, hyphens, parentheses, and inconsistent country code formatting.
 *
 * Examples:
 *   "98200 12345"       -> "+919820012345"
 *   "+91 98200 12345"   -> "+919820012345"
 *   "+91-98200-12345"   -> "+919820012345"
 *   "09820012345"       -> "+919820012345"
 *   "919820012345"      -> "+919820012345"
 *   "+919820012345"     -> "+919820012345"
 */

export function formatPhoneNumber(value) {
  if (!value) return '';
  const str = String(value).trim();
  // Strip all whitespace, hyphens, parentheses, dots, slashes
  let cleaned = str.replace(/[\s\-().\/]/g, '');

  if (!cleaned) return '';

  // Drop leading 0 if 11 digits (e.g. 09820012345 -> 9820012345)
  if (cleaned.length === 11 && cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }

  // Exactly 10 digits
  if (/^\d{10}$/.test(cleaned)) {
    return `+91${cleaned}`;
  }

  // Exactly 12 digits starting with 91 (e.g. 919820012345)
  if (/^91\d{10}$/.test(cleaned)) {
    return `+${cleaned}`;
  }

  // Already starts with +91 and 10 digits
  if (/^\+91\d{10}$/.test(cleaned)) {
    return cleaned;
  }

  // If starts with +91 and has 10 digits with any leftover chars
  if (cleaned.startsWith('+91')) {
    const trailingDigits = cleaned.slice(3).replace(/\D/g, '');
    if (trailingDigits.length === 10) {
      return `+91${trailingDigits}`;
    }
  }

  // Fallback: extract all digits
  const onlyDigits = cleaned.replace(/\D/g, '');
  if (onlyDigits.length === 10) {
    return `+91${onlyDigits}`;
  }
  if (onlyDigits.length === 12 && onlyDigits.startsWith('91')) {
    return `+${onlyDigits}`;
  }

  // Default prefix if not present
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  return `+91${cleaned}`;
}

export function normalizeMobile(value) {
  return formatPhoneNumber(value);
}
