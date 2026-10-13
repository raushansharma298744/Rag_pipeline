import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Normalizes raw scores (including CrossEncoder logits like 5.26, -3.1, or cosine similarities 0.85)
 * into a clean 0% - 100% percentage that never exceeds 100%.
 */
export function formatMatchScore(rawScore) {
  if (rawScore == null || isNaN(rawScore)) return 0;
  const val = Number(rawScore);

  // If score is already normalized between 0 and 1
  if (val >= 0 && val <= 1) {
    return Math.round(val * 100);
  }

  // Cross-Encoder outputs uncalibrated logits (-inf to +inf).
  // Standard sigmoid conversion: 1 / (1 + e^(-val)) maps to (0, 1)
  const sigmoid = 1 / (1 + Math.exp(-val));
  const percent = Math.round(sigmoid * 100);
  return Math.min(Math.max(percent, 0), 100);
}

export function formatConfidence(confidence) {
  if (confidence == null || isNaN(confidence)) {
    return { label: 'Low', percent: 0, class: 'bg-rose-50 text-rose-700 border border-rose-200' };
  }
  let val = Number(confidence);
  if (val > 1 || val < 0) {
    val = 1 / (1 + Math.exp(-val));
  }
  const percent = Math.min(Math.max(Math.round(val * 100), 0), 100);

  if (percent >= 70) {
    return { label: 'High', percent, class: 'bg-emerald-50 text-emerald-700 border border-emerald-200' };
  }
  if (percent >= 40) {
    return { label: 'Medium', percent, class: 'bg-amber-50 text-amber-700 border border-amber-200' };
  }
  return { label: 'Low', percent, class: 'bg-rose-50 text-rose-700 border border-rose-200' };
}

export function truncate(text, length = 100) {
  if (!text) return '';
  return text.length > length ? text.slice(0, length) + '...' : text;
}

export function formatTimestamp(date) {
  return new Date(date).toLocaleString();
}

export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export function generateId() {
  return Math.random().toString(36).substr(2, 9);
}