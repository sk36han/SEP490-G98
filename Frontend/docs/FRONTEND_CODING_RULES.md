# Frontend Coding Rules - SEP490-G98

## 1. Quy tắc đặt tên (Naming Conventions)

### 1.1 File và Folder

| Loại | Quy tắc | Ví dụ |
|------|---------|-------|
| Component/Page | PascalCase | `UserAccountList.jsx`, `CreateSupplier.jsx` |
| Hook | camelCase, bắt đầu với `use` | `useToast.js`, `useDialog.js` |
| Utility function | camelCase | `stringUtils.js`, `validation.js` |
| Service/API | camelCase, kết thúc với `Service` | `authService.js`, `adminService.js` |
| Context | PascalCase, kết thúc với `Context` | `AuthContext.jsx`, `ToastContext.jsx` |
| Folder | kebab-case | `shared/pages`, `features/auth` |

### 1.2 Biến và Hàm

```javascript
// Biến - camelCase
const userList = [];
const isLoading = false;
const handleCreateUser = () => {};

// Hằng số - UPPER_SNAKE_CASE
const MAX_PAGE_SIZE = 100;
const API_BASE_URL = '/api';

// Boolean - nên có prefix is, has, can, should
const isActive = true;
const hasPermission = false;
const canEdit = true;

// Component - PascalCase
const UserAccountList = () => { ... };
const CreateSupplierDialog = () => { ... };
```

### 1.3 Import/Export

```javascript
// Đúng
import { useToast } from '../hooks/useToast';
import { validatePhone } from '@/shared/utils/validation';
import UserAccountList from '../pages/UserAccountList';

// Sai
import useToast from '../hooks/useToast';  // Thiếu destructuring
import { validate_phone } from '../utils/validation';  // Sai quy tắc
```

---

## 2. Cấu trúc thư mục (Folder Structure)

### 2.1 Cấu trúc chuẩn

```
src/
├── app/                      # App configuration
│   ├── context/              # React Context providers
│   ├── routes.jsx           # Route definitions
│   └── theme.js              # MUI theme config
│
├── components/               # Global reusable components
│   ├── Layout/              # MainLayout, AuthLayout
│   ├── Sidebar/             # Sidebar + menuConfig
│   ├── Toast/               # Toast components
│   └── ProtectedRoute.jsx    # Route protection
│
├── features/                 # Feature-based modules
│   ├── auth/                # Login, ForgotPassword, Profile
│   ├── master-data/         # Supplier, Warehouse, Brand, UOM
│   ├── item/                # Item management
│   ├── purchase-order/      # PO management
│   └── ...
│
├── shared/                   # Shared utilities
│   ├── components/          # Base components (BaseListPage, FilterPopup)
│   ├── constants/           # Constants (roles.js)
│   ├── data/                # Static data (vietnamAdministrative.js)
│   ├── hooks/              # Reusable hooks (useToast, useDialog)
│   ├── lib/                # API services (authService.js)
│   ├── permissions/        # Permission utilities
│   ├── styles/             # Global styles
│   ├── ui/                 # Basic UI components (Button, Input, Table)
│   └── utils/              # Utility functions
│
└── index.jsx                # Entry point
```

### 2.2 Quy tắc trong features

Mỗi feature nên có cấu trúc:

```
features/[feature-name]/
├── components/              # Feature-specific components
│   ├── CreateDialog.jsx
│   ├── FilterPopup.jsx
│   └── ...
├── pages/                   # Feature pages
│   ├── ListPage.jsx
│   ├── CreatePage.jsx
│   └── DetailPage.jsx
└── index.js                 # Export all (optional)
```

---

## 3. Quy tắc Component

### 3.1 Cấu trúc Component

```javascript
// 1. Import React và các thư viện
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// 2. Import MUI components
import { Box, Button, TextField } from '@mui/material';

// 3. Import icons
import { Save, Edit } from 'lucide-react';

// 4. Import services và utilities
import authService from '../../shared/lib/authService';
import { useToast } from '../../shared/hooks/useToast';
import { validatePhone } from '../../shared/utils/validation';

// 5. Component definition
const UserAccountList = () => {
    // 6. Hooks - luôn ở đầu component
    const { toast, showToast, clearToast } = useToast();
    const navigate = useNavigate();

    // 7. State
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);

    // 8. Effects
    useEffect(() => {
        loadUsers();
    }, []);

    // 9. Event handlers
    const handleCreateUser = async () => { ... };

    // 10. Render
    return (
        <Box>...</Box>
    );
};

export default UserAccountList;
```

### 3.2 Nguyên tắc Single Responsibility

Một component nên:
- Chỉ làm một việc chính
- Tối đa 200-300 dòng code
- Nếu component quá lớn, tách thành các sub-components

```javascript
// Tốt: Tách dialog ra riêng
// UserAccountList.jsx
const UserAccountList = () => {
    return (
        <>
            <UserTable users={users} />
            <CreateUserDialog />
            <EditUserDialog />
        </>
    );
};

// Tốt: Tách form validation ra utility
// validation.js
export const validateUserForm = (data) => {
    const errors = {};
    if (!data.email) errors.email = 'Email là bắt buộc';
    if (!validateEmail(data.email)) errors.email = 'Email không hợp lệ';
    return errors;
};
```

### 3.3 Props Naming

```javascript
// Tốt: Đặt tên props rõ ràng
const UserDialog = ({
    open,
    onClose,
    onSubmit,
    initialData,
    isEdit,
    loading,
}) => { ... };
```

---

## 4. Quy tắc State Management

### 4.1 Sử dụng Context cho Global State

```javascript
// Tốt: Tách logic vào Context khi dùng nhiều nơi
// ToastContext.jsx
import { createContext, useContext, useState } from 'react';

const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
    const [toast, setToast] = useState(null);

    const showToast = (message, type = 'info') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    return (
        <ToastContext.Provider value={{ toast, showToast }}>
            {children}
        </ToastContext.Provider>
    );
};

export const useToast = () => useContext(ToastContext);
```

### 4.2 Local State

```javascript
// Sử dụng useState cho state đơn giản
const [searchTerm, setSearchTerm] = useState('');

// Sử dụng useReducer cho state phức tạp
const [formState, dispatch] = useReducer(formReducer, initialState);
```

---

## 5. Quy tắc API/Services

### 5.1 Cấu trúc Service

```javascript
// shared/lib/userService.js
import axios from './axios';

const userService = {
    getUsers: async (params) => {
        const response = await axios.get('/users', { params });
        return response.data;
    },

    createUser: async (data) => {
        const response = await axios.post('/users', data);
        return response.data;
    },

    updateUser: async (id, data) => {
        const response = await axios.put(`/users/${id}`, data);
        return response.data;
    },

    deleteUser: async (id) => {
        const response = await axios.delete(`/users/${id}`);
        return response.data;
    },
};

export default userService;
```

### 5.2 Error Handling

```javascript
// Tốt: Xử lý lỗi trong service
const getUsers = async (params) => {
    try {
        const response = await axios.get('/users', { params });
        return response.data;
    } catch (error) {
        console.error('Error fetching users:', error);
        throw new Error(error.response?.data?.message || 'Không thể tải danh sách');
    }
};
```

---

## 6. Quy tắc CSS/Styling

### 6.1 Sử dụng MUI Theme

```javascript
// Tốt: Sử dụng theme
<Box sx={{
    p: 2,
    m: 1,
    color: 'primary.main',
    bgcolor: 'background.paper',
}}>

// Tốt: Sử dụng sx prop cho style động
<Button
    sx={{
        bgcolor: isActive ? 'primary.main' : 'grey.300',
    }}
>
```

---

## 7. Quy tắc Hooks

### 7.1 Custom Hooks

```javascript
// Tốt: Đặt tên rõ ràng, trả về interface nhất quán
const useUserList = (initialParams = {}) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const loadUsers = async (params) => {
        setLoading(true);
        try {
            const data = await userService.getUsers({ ...initialParams, ...params });
            setUsers(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return { users, loading, error, loadUsers };
};
```

---

## 8. Quy tắc Import Order

Thứ tự import theo thứ tự:

1. React/External libraries
2. React Router
3. MUI Components
4. Icons
5. Internal - Components
6. Internal - Services
7. Internal - Hooks
8. Internal - Utils
9. Internal - Constants

```javascript
// Ví dụ đầy đủ
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, Button, TextField, Table } from '@mui/material';
import { Save, Edit, Delete } from 'lucide-react';

import Toast from '../../components/Toast/Toast';
import authService from '../../shared/lib/authService';
import { useToast } from '../../shared/hooks/useToast';
import { validateEmail, validatePhone } from '../../shared/utils/validation';
import { ROLE_OPTIONS, ROLE_DISPLAY_MAPPING } from '../../shared/constants/roles';
```

---

## 9. Quy tắc Comment và Documentation

### 9.1 JSDoc cho Functions

```javascript
/**
 * Tạo người dùng mới
 * @param {Object} userData - Thông tin người dùng
 * @param {string} userData.email - Email người dùng
 * @param {string} userData.fullName - Họ tên đầy đủ
 * @param {number} userData.roleId - ID vai trò
 * @returns {Promise<Object>} User created
 */
const createUser = async (userData) => { ... };
```

---

## 10. Code Review Checklist

Trước khi commit, kiểm tra:

- [ ] Tên biến/hàm có rõ ràng không?
- [ ] Component có quá 300 dòng không?
- [ ] Có duplicate code không?
- [ ] Import order đúng không?
- [ ] Có xử lý error không?
- [ ] Có console.log debug không? (xóa trước khi commit)
- [ ] Responsive đã test chưa?

---

## 11. Git Commit Messages

```
# Quy tắc: <type>(<scope>): <description>

# Types:
# - feat: Feature mới
# - fix: Bug fix
# - refactor: Refactor code
# - style: Thay đổi style
# - docs: Thay đổi documentation

# Ví dụ:
feat(user): add user search functionality
fix(auth): resolve login redirect issue
refactor(shared): extract validation utilities
```

---

## Tóm tắt

| Nguyên tắc | Mô tả |
|------------|-------|
| Naming | PascalCase cho component, camelCase cho biến/hàm |
| Structure | Theo feature-based structure |
| SRP | Mỗi component chỉ làm một việc |
| DRY | Tách code trùng lặp vào shared utilities |
| Error | Luôn xử lý lỗi khi gọi API |
| Imports | Sắp xếp theo thứ tự quy định |

---

> Lưu ý: Các quy tắc này có thể được điều chỉnh theo nhu cầu dự án.
