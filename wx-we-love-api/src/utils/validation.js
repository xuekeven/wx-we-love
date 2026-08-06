function isValidDateOnly(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

function parseDateOnly(value) {
  if (!isValidDateOnly(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function daysBetween(start, end) {
  const startDate = parseDateOnly(String(start).slice(0, 10));
  const endDate = parseDateOnly(String(end).slice(0, 10));
  if (!startDate || !endDate) return Number.NaN;
  return Math.round((endDate - startDate) / 86400000);
}

function normalizeOptionalText(value, maxLength) {
  if (value == null) return '';
  return String(value).trim().slice(0, maxLength);
}

function validateOptionalText(value, maxLength) {
  if (value == null) return { value: '' };
  const normalized = String(value).trim();
  if (normalized.length > maxLength) return { error: `内容不能超过 ${maxLength} 个字符` };
  return { value: normalized };
}

function todayDateOnly() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

module.exports = {
  daysBetween,
  isValidDateOnly,
  normalizeOptionalText,
  parseDateOnly,
  todayDateOnly,
  validateOptionalText
};
