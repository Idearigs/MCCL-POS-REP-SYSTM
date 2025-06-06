/**
 * Format a date to a readable string
 * @param date Date to format
 * @returns Formatted date string (e.g., "Jun 3, 2025")
 */
export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
};

/**
 * Format a date and time to a readable string
 * @param date Date to format
 * @returns Formatted date and time string (e.g., "Jun 3, 2025, 2:59 PM")
 */
export const formatDateTime = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  }).format(date);
};

/**
 * Format a currency value
 * @param amount Amount to format
 * @param currency Currency code (default: 'USD')
 * @returns Formatted currency string (e.g., "$123.45")
 */
export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format(amount);
};
