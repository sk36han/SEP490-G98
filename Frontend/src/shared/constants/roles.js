export const ROLE_OPTIONS = {
    1: 'Giám Đốc',
    2: 'Sale Engineer',
    3: 'Kế toán',
    4: 'Sale Support',
    6: 'Admin',
    7: 'Thủ kho',
};

/** Map roleName (từ API) -> roleId để điền form Edit */
export const ROLE_NAME_TO_ID = Object.fromEntries(
    Object.entries(ROLE_OPTIONS).map(([id, name]) => [name, parseInt(id, 10)])
);

export const ROLE_DISPLAY_MAPPING = {
    'Giám Đốc': 'Giám Đốc',
    'Sale Engineer': 'Sale Engineer',
    'Kế toán': 'Kế toán',
    Accountant: 'Kế toán',
    'Accountant - Kế toán': 'Kế toán',
    'Sale Support': 'Sale Support',
    Admin: 'Admin',
    admin: 'Admin',
    'Thủ kho': 'Thủ kho',
    GD: 'Giám Đốc',
    SALES: 'Sale Engineer',
};

export const ROLE_COLORS = {
    'Giám Đốc': 'error',
    'Sale Engineer': 'primary',
    'Kế toán': 'warning',
    'Sale Support': 'info',
    Admin: 'secondary',
    'Thủ kho': 'default',
};
