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
 * Sinh phần gốc username từ họ tên (khớp backend AdminService.GenerateUsernameAsync).
 * Backend: lastName + initials của các phần trước + số thứ tự (tổng user + 1). Số chỉ có trên server.
 * Frontend chỉ sinh phần gốc (lastName + initials) để preview; khi tạo tài khoản không gửi username
 * để backend tự sinh đầy đủ (có số), tránh trùng.
 * VD: "Vũ Đức Thắng" → "thangvd" (backend sẽ thành "thangvd1", "thangvd2"...)
 */
export const generateUsername = (fullName) => {
    if (!fullName || !fullName.trim()) return '';
    const normalized = removeDiacritics(fullName.trim().toLowerCase());
    const parts = normalized.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '';
    const lastName = parts[parts.length - 1];
    const initials = parts.slice(0, parts.length - 1).map((p) => p[0]).join('');
    return lastName + initials;
};
