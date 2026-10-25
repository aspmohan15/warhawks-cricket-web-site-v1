/**
 * Monetary formatting utility for Warhawks Cricket Tournament
 * Formats all application amounts in 1000's / direct numeric with Indian thousand separators (e.g. 23000 -> "₹23,000" or "23,000")
 * Eliminates all legacy Lakh representations (e.g. 0.23L).
 */
export function formatAmount(value, includeCurrency = true) {
  if (value === null || value === undefined || isNaN(Number(value))) {
    return includeCurrency ? '₹0' : '0';
  }
  const formatted = Number(value).toLocaleString('en-IN');
  return includeCurrency ? `₹${formatted}` : formatted;
}
