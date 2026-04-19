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
 * Format datetime: dd/MM/yyyy HH:mm (locale string)
 */
export function formatDate(dateStr) {
    if (!dateStr) return '–';
    const d = parseDate(dateStr);
    if (!d) return String(dateStr);
    return d.toLocaleString('vi-VN');
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
 * Format datetime in UTC (vi-VN), same convention as ViewStocktakeDetail (no local offset).
 * @param {string|null|undefined} dateStr
 * @param {string} [emptyDisplay='–'] Value when dateStr is missing (detail forms often use '').
 */
export function formatDateTimeUtc(dateStr, emptyDisplay = '–') {
    if (!dateStr) return emptyDisplay;
    const d = new Date(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z');
    if (Number.isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleString('vi-VN', { timeZone: 'UTC' });
}

/**
 * Date + time on two lines, UTC (vi-VN).
 */
export function formatDateTimeLinesUtc(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z');
    if (Number.isNaN(d.getTime())) return null;
    const datePart = d.toLocaleDateString('vi-VN', { timeZone: 'UTC' });
    const timePart = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
    return { datePart, timePart };
}

/**
 * Newline-separated date + time (for cells with white-space: pre-line), UTC.
 */
export function formatDateTimeNewlineUtc(dateStr) {
    if (!dateStr) return '-';
    const lines = formatDateTimeLinesUtc(dateStr);
    if (!lines) return '-';
    return `${lines.datePart}\n${lines.timePart}`;
}

/**
 * Calendar date only in UTC (vi-VN). Use for date-only strings or the UTC calendar day of an instant.
 */
export function formatDateOnlyUtc(dateStr) {
    if (!dateStr) return '–';
    if (!/T\d{2}/.test(dateStr)) {
        const [year, month, day] = dateStr.split('-').map(Number);
        if (year && month && day) {
            const d = new Date(Date.UTC(year, month - 1, day));
            return d.toLocaleDateString('vi-VN', { timeZone: 'UTC' });
        }
    }
    const d = new Date(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z');
    if (Number.isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString('vi-VN', { timeZone: 'UTC' });
}

/**
 * Parse ISO datetime string as UTC (kept for backwards compat).
 */
export function parseUtc(dateStr) {
    return parseDate(dateStr);
}

/**
 * Get UTC timestamp (ms) for sorting. Returns 0 for null/invalid.
 */
export function utcTimestamp(dateStr) {
    const d = parseDate(dateStr);
    return d ? d.getTime() : 0;
}
