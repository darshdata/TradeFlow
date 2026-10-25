// Financial formatting utilities for TradeFlow client

export function formatINR(paise) {
  if (typeof paise !== 'number' || !Number.isFinite(paise)) {
    return '₹0.00';
  }
  const isNegative = paise < 0;
  const absPaise = Math.abs(paise);
  const rupees = Math.floor(absPaise / 100);
  const paiseRemainder = absPaise % 100;
  const formattedPaise = paiseRemainder.toString().padStart(2, '0');

  // Format integer part in Indian numbering style
  const rupeeStr = rupees.toString();
  let result = '';
  if (rupeeStr.length > 3) {
    const lastThree = rupeeStr.slice(-3);
    const remaining = rupeeStr.slice(0, -3);
    result = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
  } else {
    result = rupeeStr;
  }

  return `${isNegative ? '-' : ''}₹${result}.${formattedPaise}`;
}

export function paiseToRupees(paise) {
  if (typeof paise !== 'number' || !Number.isFinite(paise)) return '0.00';
  return (paise / 100).toFixed(2);
}

export function rupeesToPaise(rupees) {
  const num = typeof rupees === 'string' ? parseFloat(rupees) : rupees;
  if (typeof num !== 'number' || isNaN(num)) return 0;
  return Math.round(num * 100);
}

export function formatQuantity(qty) {
  if (typeof qty !== 'number' || isNaN(qty)) return '0';
  return new Intl.NumberFormat('en-IN').format(qty);
}

export function formatDateTime(dateInput) {
  if (!dateInput) return '-';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(d);
}

export function formatTimeOnly(dateInput) {
  if (!dateInput) return '-';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(d);
}

export function formatPercentage(num) {
  if (typeof num !== 'number' || isNaN(num)) return '0.00%';
  const prefix = num > 0 ? '+' : '';
  return `${prefix}${num.toFixed(2)}%`;
}
