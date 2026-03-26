/**
 * Parse a date/datetime string as UTC to avoid browser timezone shift.
 *
 * Problem: Backend returns `DateTime.UtcNow` as ISO string like
 *   "2026-03-22T04:46:00" (no trailing Z). In the browser, `new Date(str)`
 *   interprets it as *local* time, shifting the display by the browser's UTC
 *   offset (e.g. UTC+7 → shows 7 hours earlier than reality).
 *
 * Solution: append "Z" when the string doesn't already end in "Z", forcing
 * the Date constructor to treat it as UTC.
 *
 * @param {string|null|undefined} dateStr
 * @returns {Date|null}
 */
export function parseDate(dateStr) {
    if (!dateStr) return null;
    // Handle DateOnly strings (no time part)
    if (!/T\d{2}/.test(dateStr)) {
        const [year, month, day] = dateStr.split('-').map(Number);
        if (year && month && day) {
            return new Date(Date.UTC(year, month - 1, day));
        }
    }
    const d = new Date(dateStr + (dateStr.endsWith('Z') ? '' : 'Z'));
    return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Format datetime: dd/MM/yyyy - HH:mm
 */
export function formatDateTime(dateStr) {
    if (!dateStr) return '–';
    const d = parseDate(dateStr);
    if (!d) return String(dateStr);
    const date = d.toLocaleDateString('vi-VN');
    const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    return `${date} - ${time}`;
}

/**
 * Format datetime: dd/MM/yyyy HH:mm:ss
 */
export function formatDateTimeFull(dateStr) {
    if (!dateStr) return '–';
    const d = parseDate(dateStr);
    if (!d) return String(dateStr);
    const date = d.toLocaleDateString('vi-VN');
    const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    return `${date} ${time}`;
}

/**
 * Format date only: dd/MM/yyyy
 */
export function formatDateOnly(dateStr) {
    if (!dateStr) return '–';
    const d = parseDate(dateStr);
    if (!d) return String(dateStr);
    return d.toLocaleDateString('vi-VN');
}

/**
 * Format time only: HH:mm
 */
export function formatTimeOnly(dateStr) {
    if (!dateStr) return '–';
    const d = parseDate(dateStr);
    if (!d) return '–';
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Format datetime as two-line JSX: <Box>dd/MM/yyyy</Box><Box>HH:mm</Box>
 */
export function formatDateTimeLines(dateStr) {
    if (!dateStr) return null;
    const d = parseDate(dateStr);
    if (!d) return null;
    const datePart = d.toLocaleDateString('vi-VN');
    const timePart = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    return { datePart, timePart };
}

/**
 * Parse ISO datetime string as UTC (kept for backwards compat).
 */
export function parseUtc(dateStr) {
    return parseDate(dateStr);
}

/**
 * Get UTC-safe timestamp (ms) for sorting/filtering.
 * Returns null for invalid/null dates.
 */
export function utcTimestamp(dateStr) {
    const d = parseDate(dateStr);
    return d ? d.getTime() : 0;
}

/**
 * Format datetime: dd/MM/yyyy HH:mm
 * Used in table display cells.
 */
export function formatDateTimeShort(dateStr) {
    if (!dateStr) return '-';
    const d = parseDate(dateStr);
    if (!d) return String(dateStr);
    const date = d.toLocaleDateString('vi-VN');
    const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    return `${date} ${time}`;
}

/**
 * Format date: dd/MM/yyyy (with locale options)
 */
export function formatDateLocale(dateStr, options) {
    if (!dateStr) return '-';
    const d = parseDate(dateStr);
    if (!d) return String(dateStr);
    return d.toLocaleDateString('vi-VN', options);
}
