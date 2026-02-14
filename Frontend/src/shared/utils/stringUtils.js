/**
 * Remove Vietnamese diacritics from string
 * @param {string} str - Input string
 * @returns {string}
 */
export const removeDiacritics = (str) => {
    if (!str) return '';
    return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D');
};

/**
 * Generate username from full name (lastName + initials)
 * @param {string} fullName - Full name
 * @returns {string}
 */
export const generateUsername = (fullName) => {
    if (!fullName) return '';
    const normalized = removeDiacritics(fullName.trim().toLowerCase());
    const parts = normalized.split(/\s+/);
    if (parts.length === 0) return '';
    const lastName = parts[parts.length - 1];
    const initials = parts.slice(0, parts.length - 1).map((p) => p[0]).join('');
    return lastName + initials;
};
