/**
 * Validate password strength (min 6 chars, 1 uppercase, 1 number, 1 special char)
 * @param {string} password
 * @returns {{ valid: boolean, message?: string }}
 */
export const validatePassword = (password) => {
    if (!password || password.length < 6) {
        return { valid: false, message: 'Mật khẩu phải có ít nhất 6 ký tự!' };
    }
    if (!/[A-Z]/.test(password)) {
        return { valid: false, message: 'Mật khẩu phải có ít nhất 1 chữ in hoa (A-Z)!' };
    }
    if (!/[0-9]/.test(password)) {
        return { valid: false, message: 'Mật khẩu phải có ít nhất 1 chữ số (0-9)!' };
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        return { valid: false, message: 'Mật khẩu phải có ít nhất 1 ký tự đặc biệt (!@#$%^&*...)!' };
    }
    return { valid: true };
};

/**
 * Validate email format
 * @param {string} email
 * @returns {boolean}
 */
export const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email || '');
};

/**
 * Validate Vietnamese phone (10-11 digits, starts with 0)
 * @param {string} phone
 * @returns {boolean}
 */
export const validatePhone = (phone) => {
    return /^0\d{9,10}$/.test(phone || '');
};

/**
 * Validate phone and return error message
 * @param {string} phone
 * @returns {{ valid: boolean, message?: string }}
 */
export const validatePhoneWithMessage = (phone) => {
    if (!phone || !/^[0-9]{10,11}$/.test(phone)) {
        return { valid: false, message: 'Số điện thoại không hợp lệ (10-11 số)' };
    }
    return { valid: true };
};
