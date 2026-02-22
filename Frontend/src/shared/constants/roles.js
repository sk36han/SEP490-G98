/** Role id -> display name (cho form Admin tạo/sửa user, dropdown) */
export const ROLE_OPTIONS = {
    1: 'Director',
    2: 'Sale Engineer',
    3: 'Accountants',
    4: 'Sale Support',
    6: 'Admin',
    7: 'Warehouse Keeper',
};

/** Map roleName (từ API) -> roleId để điền form Edit */
export const ROLE_NAME_TO_ID = Object.fromEntries(
    Object.entries(ROLE_OPTIONS).map(([id, name]) => [name, parseInt(id, 10)])
);

/** Map roleName từ backend -> nhãn hiển thị */
export const ROLE_DISPLAY_MAPPING = {
    'Director': 'Director',
    'Giám Đốc': 'Director',
    'Sale Engineer': 'Sale Engineer',
    'Accountants': 'Accountants',
    'Kế toán': 'Accountants',
    Accountant: 'Accountants',
    'Accountant - Kế toán': 'Accountants',
    'Sale Support': 'Sale Support',
    'Admin': 'Admin',
    admin: 'Admin',
    'Warehouse Keeper': 'Warehouse Keeper',
    'Thủ kho': 'Warehouse Keeper',
    GD: 'Director',
    SALES: 'Sale Engineer',
};

export const ROLE_COLORS = {
    'Director': 'error',
    'Sale Engineer': 'primary',
    'Accountants': 'warning',
    'Sale Support': 'info',
    'Admin': 'secondary',
    'Warehouse Keeper': 'default',
};
