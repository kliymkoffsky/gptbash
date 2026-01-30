/**
 * Centralized formatting utilities for dates, numbers, and other display fields
 */

/**
 * Format a date string in Polish format: "DD miesiąc RRRR HH:MM"
 * @param dateString ISO date string
 * @returns Formatted date string in Polish
 */
export function formatPolishDate(dateString: string): string {
  const date = new Date(dateString);
  const months = [
    'stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca',
    'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'
  ];
  
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  
  return `${day} ${month} ${year} ${hours}:${minutes}`;
}

/**
 * Get ISO datetime string for <time> element datetime attribute
 * @param dateString ISO date string
 * @returns ISO datetime string
 */
export function getISODateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toISOString();
}

/**
 * Format a number using Polish locale (spaces as thousands separator)
 * @param num Number to format
 * @returns Formatted number string (e.g., "1 234 567")
 */
export function formatNumber(num: number): string {
  return num.toLocaleString('pl-PL');
}

/**
 * Format a score with sign (+/-)
 * @param score Score value (can be positive, negative, or zero)
 * @returns Formatted score with sign (e.g., "+123", "-45", "0")
 */
export function formatScore(score: number): string {
  const formatted = formatNumber(Math.abs(score));
  if (score > 0) return `+${formatted}`;
  if (score < 0) return `-${formatted}`;
  return '0';
}

/**
 * Format a number in compact notation for large values
 * @param num Number to format
 * @param threshold Numbers above this will be compacted (default: 10000)
 * @returns Formatted number (e.g., "12K", "1.5M")
 */
export function formatCompactNumber(num: number, threshold: number = 10000): string {
  if (Math.abs(num) < threshold) {
    return formatNumber(num);
  }
  
  return new Intl.NumberFormat('pl-PL', {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1
  }).format(num);
}

/**
 * Format RFC 822 date for RSS feeds
 * @param dateString ISO date string
 * @returns RFC 822 formatted date string
 */
export function formatRFC822Date(dateString: string): string {
  const date = new Date(dateString);
  return date.toUTCString();
}
