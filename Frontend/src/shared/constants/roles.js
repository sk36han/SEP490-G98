/** Role id -> backend roleName (giữ nguyên tiếng Anh để map từ API) */
export const ROLE_OPTIONS = {
    1: 'Director',
    2: 'Sale Engineer',
    3: 'Accountants',
    4: 'Sale Support',
    6: 'Admin',
    7: 'Warehouse Keeper',
};

/** Label tiếng Việt cho dropdown chọn vai trò (Edit/Create user) */
export const ROLE_DROPDOWN_LABELS = {
    1: 'Giám Đốc',
    2: 'Sale Engineer',
    3: 'Kế Toán',
    4: 'Sale Support',
    6: 'Quản trị hệ thống',
    7: 'Thủ Kho',
};

/** Map roleName (từ API) -> roleId để điền form Edit */
export const ROLE_NAME_TO_ID = Object.fromEntries(
    Object.entries(ROLE_OPTIONS).map(([id, name]) => [name, parseInt(id, 10)])
);

/** Map roleName từ backend -> nhãn hiển thị (tiếng Việt) */
export const ROLE_DISPLAY_MAPPING = {
    'Director': 'Giám Đốc',
    'Giám Đốc': 'Giám Đốc',
    GD: 'Giám Đốc',

    'Sale Engineer': 'Sale Engineer',
    SALES: 'Sale Engineer',

    'Accountants': 'Kế Toán',
    'Kế toán': 'Kế Toán',
    'Kế Toán': 'Kế Toán',
    Accountant: 'Kế Toán',
    'Accountant - Kế toán': 'Kế Toán',

    'Sale Support': 'Sale Support',

    'Admin': 'Admin',
    admin: 'Admin',

    'Warehouse Keeper': 'Thủ Kho',
    'Thủ kho': 'Thủ Kho',
    'Thủ Kho': 'Thủ Kho',
};

export const ROLE_COLORS = {
    'Giám Đốc': 'error',
    'Sale Engineer': 'primary',
    'Kế Toán': 'warning',
    'Sale Support': 'info',
    'Admin': 'secondary',
    'Thủ Kho': 'default',
};
