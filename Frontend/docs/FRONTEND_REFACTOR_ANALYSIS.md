# Phân tích refactor Frontend - SEP490-G98

## 1. Tổng quan hiện trạng

### 1.1 Cấu trúc hiện tại

```
src/
├── app/              (trống)
├── components/       Layout, Sidebar, Toast, ProtectedRoute
├── feature/          auth/ (trống)
├── shared/
│   ├── lib/          authService, adminService, axios
│   ├── pages/        Login, Profile, Home, UserAccountList, CreateSupplier, ForgotPassword, ResetPassword
│   ├── styles/       CSS cho từng page
│   ├── assets/
│   ├── hooks/        (trống)
│   ├── permissions/  (trống)
│   ├── ui/           (trống)
│   ├── utils/        (trống)
│   └── widgets/      (trống)
```

### 1.2 Độ dài và độ phức tạp các file

| File | Số dòng | Mức độ | Ghi chú |
|------|---------|--------|---------|
| UserAccountList.jsx | ~510 | Cao | Nhiều responsibility, dialogs lồng trong page |
| Profile.jsx | ~418 | Cao | Profile + ChangePasswordDialog trong 1 file |
| CreateSupplier.jsx | ~381 | Trung bình | Form dài, validation nội tại |
| Sidebar.jsx | ~339 | Trung bình | Config menu + UI logic |
| ResetPassword.jsx | ~306 | Trung bình | Validation mật khẩu chi tiết |
| Login.jsx | ~295 | Trung bình | Form + layout |
| ForgotPassword.jsx | ~219 | Trung bình | Tương tự Login layout |
| Home.jsx | ~119 | Thấp | Đơn giản |
| App.jsx | ~118 | Thấp | Routes + theme |
| authService.js | ~189 | Trung bình | Đủ các method auth |
| adminService.js | ~84 | Thấp | OK |
| Toast.jsx | ~43 | Thấp | OK |

---

## 2. Vấn đề cần xử lý

### 2.1 Code trùng lặp (Duplication)

| Nội dung | Vị trí | Đề xuất |
|----------|--------|---------|
| **Auth layout** (background + Card + blur) | Login, ForgotPassword, ResetPassword | Tách `AuthLayout.jsx` component |
| **showToast** pattern | Mọi page (Login, Profile, UserAccountList, CreateSupplier...) | Tách `useToast` hook |
| **Role mapping** (roleCode/roleName → display) | Profile, UserAccountList, Sidebar, ProtectedRoute | Tách `shared/constants/roles.js` |
| **removeDiacritics, generateUsername** | UserAccountList (định nghĩa 2 lần!) | Tách `shared/utils/stringUtils.js` |
| **Password validation** | ResetPassword, Profile (ChangePassword) | Tách `shared/utils/validation.js` |
| **Button gradient style** | Login, ForgotPassword, ResetPassword, UserAccountList | Tách `shared/ui/` hoặc theme |
| **Form input với icon** (InputAdornment) | Profile, UserAccountList, Login, ResetPassword | Tách `InputWithIcon` component |

### 2.2 File quá lớn (Single responsibility vi phạm)

#### UserAccountList.jsx (~510 dòng)

Chứa:
- Constants: ROLE_OPTIONS, ROLE_DISPLAY_MAPPING, ROLE_COLORS
- Utils: removeDiacritics, generateUsername (lặp 2 lần)
- State + logic: loadUsers, search, pagination, CRUD
- UI: Header, Search bar, Table, Pagination
- CreateUserDialog (form ~80 dòng)
- EditUserDialog (form ~90 dòng)
- Toast

**Đề xuất chia:**
- `shared/constants/roles.js` – ROLE_OPTIONS, ROLE_DISPLAY_MAPPING, ROLE_COLORS
- `shared/utils/stringUtils.js` – removeDiacritics, generateUsername
- `feature/admin/components/CreateUserDialog.jsx`
- `feature/admin/components/EditUserDialog.jsx`
- `feature/admin/components/UserTable.jsx` (hoặc giữ table trong page, tùy mức độ tái sử dụng)
- `feature/admin/pages/UserAccountList.jsx` – chỉ orchestration + state

#### Profile.jsx (~418 dòng)

Chứa:
- Role mapping (giống UserAccountList)
- Profile display + form
- ChangePasswordDialog (~100 dòng)
- Avatar section

**Đề xuất chia:**
- `feature/profile/components/ChangePasswordDialog.jsx`
- `feature/profile/components/ProfileAvatarCard.jsx` (avatar + thông tin nhanh)
- `feature/profile/components/ProfileInfoForm.jsx` (form thông tin)
- `feature/profile/pages/ProfilePage.jsx` – compose các component trên

### 2.3 Thư mục trống chưa dùng

| Thư mục | Đề xuất sử dụng |
|---------|-----------------|
| `src/app/` | Routes, theme config, global providers |
| `src/feature/auth/` | Login, ForgotPassword, ResetPassword + AuthLayout |
| `src/shared/hooks/` | useToast, useAuth, usePagination |
| `src/shared/permissions/` | getPermissionRole, getMenuItems (tách từ Sidebar) |
| `src/shared/ui/` | InputWithIcon, GradientButton, AuthCard |
| `src/shared/utils/` | validation, stringUtils |
| `src/shared/widgets/` | StatCard, ActivityItem, ChartPlaceholder (từ Home) |

---

## 3. Đề xuất cấu trúc thư mục sau refactor

```
src/
├── app/
│   ├── App.jsx                 # Chỉ providers + Router
│   ├── theme.js                # MUI theme (tách từ App)
│   └── routes.jsx              # Định nghĩa routes (tách từ App)
│
├── components/                 # Global reusable
│   ├── Layout/
│   │   ├── MainLayout.jsx
│   │   └── AuthLayout.jsx      # MỚI: background + Card cho Login/Forgot/Reset
│   ├── Sidebar/
│   │   ├── Sidebar.jsx
│   │   └── menuConfig.js       # MỚI: getMenuItems (tách từ Sidebar)
│   ├── Toast/
│   ├── ProtectedRoute.jsx
│   └── ui/                     # MỚI: shared form components
│       ├── InputWithIcon.jsx
│       └── GradientButton.jsx
│
├── feature/
│   ├── auth/
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── ForgotPasswordPage.jsx
│   │   │   └── ResetPasswordPage.jsx
│   │   └── components/         # (nếu cần form riêng)
│   │
│   ├── profile/
│   │   ├── pages/
│   │   │   └── ProfilePage.jsx
│   │   └── components/
│   │       ├── ChangePasswordDialog.jsx
│   │       ├── ProfileAvatarCard.jsx
│   │       └── ProfileInfoForm.jsx
│   │
│   ├── admin/
│   │   ├── pages/
│   │   │   └── UserAccountListPage.jsx
│   │   └── components/
│   │       ├── CreateUserDialog.jsx
│   │       ├── EditUserDialog.jsx
│   │       └── UserTable.jsx
│   │
│   ├── supplier/
│   │   └── pages/
│   │       └── CreateSupplierPage.jsx
│   │
│   └── dashboard/
│       ├── pages/
│       │   └── HomePage.jsx
│       └── components/
│           ├── StatCard.jsx
│           ├── ActivityList.jsx
│           └── ChartPlaceholder.jsx
│
├── shared/
│   ├── lib/
│   │   ├── axios.js
│   │   ├── authService.js
│   │   └── adminService.js
│   │
│   ├── hooks/
│   │   └── useToast.js         # MỚI
│   │
│   ├── constants/
│   │   └── roles.js            # ROLE_OPTIONS, ROLE_DISPLAY_MAPPING, ROLE_COLORS
│   │
│   ├── utils/
│   │   ├── stringUtils.js      # removeDiacritics, generateUsername
│   │   └── validation.js       # validatePassword, validateEmail, validatePhone
│   │
│   ├── permissions/
│   │   └── roleUtils.js        # getPermissionRole
│   │
│   ├── assets/
│   ├── styles/
│   └── widgets/                # (optional, nếu tách từ Home)
```

---

## 4. Chi tiết chia file theo từng khu vực

### 4.1 `shared/constants/roles.js`

```js
// Nội dung tách từ UserAccountList, Profile, Sidebar
export const ROLE_OPTIONS = { 1: "Giám Đốc", 2: "Sale Engineer", ... };
export const ROLE_DISPLAY_MAPPING = { ... };
export const ROLE_COLORS = { ... };
```

### 4.2 `shared/utils/stringUtils.js`

```js
export const removeDiacritics = (str) => { ... };
export const generateUsername = (fullName) => { ... };
```

### 4.3 `shared/utils/validation.js`

```js
export const validatePassword = (password) => { ... };  // Từ ResetPassword
export const validateEmail = (email) => { ... };
export const validatePhone = (phone) => { ... };       // Từ Profile, CreateSupplier
```

### 4.4 `shared/hooks/useToast.js`

```js
// Thay thế pattern: const [toast, setToast] = useState(null); showToast = ...
export const useToast = () => {
  const [toast, setToast] = useState(null);
  const showToast = (message, type) => setToast({ message, type });
  return { toast, showToast, clearToast: () => setToast(null) };
};
```

### 4.5 `components/AuthLayout.jsx`

- Props: `children`, `title`, `subtitle`, `maxWidth`
- Chứa: Box (background + blur) + Container + Card
- Dùng cho: Login, ForgotPassword, ResetPassword

### 4.6 `components/Sidebar/menuConfig.js`

- `getMenuItems(role)` – tách từ Sidebar.jsx
- Có thể dùng chung với `shared/permissions/` nếu cần

### 4.7 Feature auth

- **LoginPage**: Form + logic login, dùng AuthLayout
- **ForgotPasswordPage**: Form + logic, dùng AuthLayout  
- **ResetPasswordPage**: Form + validation, dùng AuthLayout
- Có thể tách thêm `LoginForm.jsx` nếu muốn form tách khỏi layout

### 4.8 Feature admin

- **CreateUserDialog**: Form tạo user (email, fullName, roleId, username auto)
- **EditUserDialog**: Form sửa user
- **UserTable**: Bảng + hàng + action buttons (có thể tách hoặc giữ inline)
- **UserAccountListPage**: State, loadUsers, search, pagination, mở/đóng dialog

### 4.9 Feature profile

- **ChangePasswordDialog**: 3 field mật khẩu + validation
- **ProfileAvatarCard**: Avatar + Chip role + email/phone + nút Đổi mật khẩu
- **ProfileInfoForm**: Các TextField thông tin
- **ProfilePage**: Compose 2 card + dialog

### 4.10 Feature dashboard (Home)

- **StatCard**: 1 thẻ thống kê (icon + value + label)
- **ActivityList**: Danh sách hoạt động
- **ChartPlaceholder**: Biểu đồ (hoặc giữ inline)
- **HomePage**: Compose các widget trên

---

## 5. Thứ tự ưu tiên refactor

| Ưu tiên | Công việc | Lý do | Độ khó |
|---------|-----------|-------|--------|
| 1 | Tạo `shared/utils/stringUtils.js` | Xóa duplicate trong UserAccountList | Dễ |
| 2 | Tạo `shared/constants/roles.js` | Dùng ở 4+ nơi | Dễ |
| 3 | Tạo `shared/hooks/useToast.js` | Dùng ở mọi page | Dễ |
| 4 | Tạo `AuthLayout.jsx` | Giảm ~150 dòng trùng lặp | Trung bình |
| 5 | Tách `ChangePasswordDialog` từ Profile | Profile quá dài | Trung bình |
| 6 | Tách `CreateUserDialog`, `EditUserDialog` từ UserAccountList | UserAccountList quá dài | Trung bình |
| 7 | Tạo `shared/utils/validation.js` | Validation dùng lại | Dễ |
| 8 | Tách `menuConfig` từ Sidebar | Sidebar gọn hơn | Dễ |
| 9 | Di chuyển pages sang `feature/*` | Chuẩn hóa cấu trúc | Trung bình |
| 10 | Tách `theme.js`, `routes.jsx` từ App | App gọn, tách concerns | Dễ |

---

## 6. Lưu ý khi thực hiện

1. **Import path**: Cần cập nhật `vite.config.js` alias nếu di chuyển file nhiều (ví dụ: `@/shared`, `@/components`).
2. **Backward compatibility**: Có thể giữ `shared/pages/` và re-export từ `feature/*` để tránh sửa nhiều chỗ cùng lúc.
3. **CreateSupplier**: Đang dùng CSS + native input, khác với MUI của các page khác. Có thể:
   - Chuyển sang MUI cho đồng bộ, hoặc
   - Giữ nguyên và chỉ tách validation + supplierService (khi có API).
4. **Home**: Nếu ít mở rộng, có thể không tách widget; ưu tiên các page phức tạp hơn trước.

---

## 7. Tóm tắt

- **UserAccountList** và **Profile** là 2 file cần chia nhỏ trước.
- **Auth pages** (Login, Forgot, Reset) nên dùng chung **AuthLayout** và **useToast**.
- **shared/utils**, **shared/constants**, **shared/hooks** nên bổ sung ngay để giảm duplication.
- Cấu trúc **feature-based** (`feature/auth`, `feature/admin`, `feature/profile`...) phù hợp với cấu trúc folder hiện tại và dễ mở rộng sau này.

Bạn có thể chọn triển khai theo từng bước trong mục **5. Thứ tự ưu tiên refactor** tùy theo thời gian và mục tiêu dự án.
