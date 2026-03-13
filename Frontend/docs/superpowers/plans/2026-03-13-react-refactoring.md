# React Codebase Refactoring & Context Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the chaotic React codebase by:
1. Creating reusable UI components and hooks
2. Converting globally-used data to React Context
3. Eliminating massive code duplication across 42+ page components and 9+ filter popups
4. Breaking extremely large pages into smaller components

**Architecture:**
- Create a dedicated `src/ui/` folder for reusable atomic components (inputs, buttons, dialogs)
- Create `src/shared/hooks/` for common stateful logic
- Create `src/shared/components/` base components for list pages, filter popups, and forms
- Create `src/app/context/` for global state management
- Use composition over duplication - pages compose reusable components
- Break extremely large pages (>50KB) into smaller feature-specific sub-components

**Tech Stack:** React 19, MUI v7, React Router v7, React Context API

---

## Part 1: Current Problem Analysis

### Codebase Issues

| Issue | Severity | Count |
|-------|----------|-------|
| Repeated filter popup components | HIGH | 9 files |
| Repeated list page boilerplate (10+ useState per page) | CRITICAL | 20+ files |
| Repeated API service patterns | HIGH | 7+ files |
| Repeated create/edit dialogs | MEDIUM | 6+ files |
| Inconsistent CSS vs sx prop | MEDIUM | 20+ files |
| Extremely large page components | CRITICAL | 8 files (>50KB) |
| No shared hooks for common logic | MEDIUM | - |
| Components and pages mixed in same folders | MEDIUM | - |
| Repeated form state (useState + validation + errors) | HIGH | 15+ files |
| Repeated localStorage for column visibility | MEDIUM | 10+ files |
| Repeated loading states in every page | MEDIUM | 40+ files |
| No React Context (all state in localStorage) | CRITICAL | - |
| Repeated table features (sort, filter, columns) | HIGH | 15+ files |
| Role/permission checking scattered | MEDIUM | 15+ files |

### Global Data Issues (Should Be Context)

| Data Type | Current Storage | Files Using | Priority |
|-----------|----------------|------------|----------|
| Auth/User | localStorage via authService.getUser() | 15+ files | HIGH |
| Categories | API calls in each component | 4+ files | HIGH |
| Suppliers | API calls in each component | 4+ files | HIGH |
| Warehouses | API calls in each component | 4+ files | HIGH |
| Brands | API calls in each component | 2+ files | MEDIUM |
| UOMs | API calls in each component | 4+ files | MEDIUM |
| Items | API calls in each component | 4+ files | MEDIUM |
| Users | API calls in each component | 3+ files | MEDIUM |
| Receivers | API calls in each component | 2+ files | MEDIUM |
| Purchase Orders | API calls in each component | 3+ files | MEDIUM |
| Toast | useToast hook (22 files create own state) | 22 files | MEDIUM |
| Location | locationService.js | Multiple | LOW |
| Roles/Permissions | roleUtils.js | 15+ files | HIGH |
| LocalStorage | Direct localStorage calls | Multiple | MEDIUM |

---

## Part 2: React Context Implementation

### Task C1: Create AuthContext

**Files:**
- Create: `src/app/context/AuthContext.jsx`
- Modify: `src/App.jsx`
- Modify: `src/components/ProtectedRoute.jsx`
- Modify: `src/components/Sidebar/Sidebar.jsx`
- Modify: `src/components/Layout/AppHeader.jsx`

- [ ] **Step 1: Write AuthContext implementation**

```javascript
// src/app/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../../shared/lib/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check auth status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userData = await authService.getUser();
        if (userData) {
          setUser(userData);
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const login = useCallback(async (credentials) => {
    const response = await authService.login(credentials);
    const { token, ...userData } = response;

    localStorage.setItem('token', token);
    localStorage.setItem('userInfo', JSON.stringify(userData));

    setUser(userData);
    setIsAuthenticated(true);

    return response;
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    localStorage.removeItem('token');
    localStorage.removeItem('userInfo');

    setUser(null);
    setIsAuthenticated(false);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const userData = await authService.getUser();
      if (userData) {
        setUser(userData);
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  }, []);

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

- [ ] **Step 2: Update ProtectedRoute.jsx to use useAuth**

```jsx
// src/components/ProtectedRoute.jsx (update)
import { useAuth } from '../app/context/AuthContext';

export function ProtectedRoute({ children, requiredPermissions }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <CircularProgress />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
```

- [ ] **Step 3: Update Sidebar.jsx and AppHeader.jsx to use useAuth**

```jsx
// In both files, replace authService.getUser() with:
const { user } = useAuth();
```



---

### Task C2: Create ToastContext

**Files:**
- Create: `src/app/context/ToastContext.jsx`
- Create: `src/components/Toast/Toast.jsx` (refactor existing)
- Modify: `src/App.jsx`

- [ ] **Step 1: Write ToastContext implementation**

```javascript
// src/app/context/ToastContext.jsx
import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type });

    // Auto-hide after 3 seconds
    setTimeout(() => {
      setToast(null);
    }, 3000);
  }, []);

  const clearToast = useCallback(() => {
    setToast(null);
  }, []);

  const value = {
    toast,
    showToast,
    clearToast,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToastContext() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToastContext must be used within a ToastProvider');
  }
  return context;
}
```

- [ ] **Step 2: Refactor Toast component**

```jsx
// src/components/Toast/Toast.jsx (refactored)
import { Alert, Snackbar } from '@mui/material';
import { useToastContext } from '../../app/context/ToastContext';

export function Toast() {
  const { toast, clearToast } = useToastContext();

  if (!toast) return null;

  return (
    <Snackbar
      open={!!toast}
      autoHideDuration={3000}
      onClose={clearToast}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
    >
      <Alert
        onClose={clearToast}
        severity={toast.type}
        variant="filled"
        sx={{ width: '100%' }}
      >
        {toast.message}
      </Alert>
    </Snackbar>
  );
}
```

- [ ] **Step 3: Update App.jsx to wrap with providers**

```jsx
// src/App.jsx (update)
import { AuthProvider } from './app/context/AuthContext';
import { ToastProvider } from './app/context/ToastContext';
import { Toast } from './components/Toast/Toast';

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Toast />
        <Router>
          {/* routes */}
        </Router>
      </AuthProvider>
    </ToastProvider>
  );
}
```



---

### Task C3: Create CategoryContext

**Files:**
- Create: `src/app/context/CategoryContext.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Write CategoryContext implementation**

```javascript
// src/app/context/CategoryContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { categoryService } from '../../shared/lib/categoryService';

const CategoryContext = createContext(null);

export function CategoryProvider({ children }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchCategories = useCallback(async (force = false) => {
    if (!force && categories.length > 0) return;
    setLoading(true);
    setError(null);
    try {
      const result = await categoryService.getList({ pageSize: 1000 });
      setCategories(result.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [categories.length]);

  useEffect(() => { fetchCategories(); }, []);

  const value = { categories, loading, error, fetchCategories, refetch: () => fetchCategories(true) };

  return (
    <CategoryContext.Provider value={value}>
      {children}
    </CategoryContext.Provider>
  );
}

export function useCategories() {
  const context = useContext(CategoryContext);
  if (!context) throw new Error('useCategories must be used within a CategoryProvider');
  return context;
}
```



---

### Task C4: Create SupplierContext

**Files:**
- Create: `src/app/context/SupplierContext.jsx`

- [ ] **Step 1: Write SupplierContext implementation**

```javascript
// src/app/context/SupplierContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supplierService } from '../../shared/lib/supplierService';

const SupplierContext = createContext(null);

export function SupplierProvider({ children }) {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchSuppliers = useCallback(async (force = false) => {
    if (!force && suppliers.length > 0) return;
    setLoading(true);
    setError(null);
    try {
      const result = await supplierService.getList({ pageSize: 1000 });
      setSuppliers(result.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [suppliers.length]);

  useEffect(() => { fetchSuppliers(); }, []);

  const value = { suppliers, loading, error, fetchSuppliers, refetch: () => fetchSuppliers(true) };

  return (
    <SupplierContext.Provider value={value}>
      {children}
    </SupplierContext.Provider>
  );
}

export function useSuppliers() {
  const context = useContext(SupplierContext);
  if (!context) throw new Error('useSuppliers must be used within a SupplierProvider');
  return context;
}
```



---

### Task C5: Create WarehouseContext

**Files:**
- Create: `src/app/context/WarehouseContext.jsx`

- [ ] **Step 1: Write WarehouseContext implementation**

```javascript
// src/app/context/WarehouseContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { warehouseService } from '../../shared/lib/warehouseService';

const WarehouseContext = createContext(null);

export function WarehouseProvider({ children }) {
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchWarehouses = useCallback(async (force = false) => {
    if (!force && warehouses.length > 0) return;
    setLoading(true);
    setError(null);
    try {
      const result = await warehouseService.getList({ pageSize: 1000 });
      setWarehouses(result.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [warehouses.length]);

  useEffect(() => { fetchWarehouses(); }, []);

  const value = { warehouses, loading, error, fetchWarehouses, refetch: () => fetchWarehouses(true) };

  return (
    <WarehouseContext.Provider value={value}>
      {children}
    </WarehouseContext.Provider>
  );
}

export function useWarehouses() {
  const context = useContext(WarehouseContext);
  if (!context) throw new Error('useWarehouses must be used within a WarehouseProvider');
  return context;
}
```



---

### Task C6: Create BrandContext

**Files:**
- Create: `src/app/context/BrandContext.jsx`

- [ ] **Step 1: Write BrandContext implementation**

```javascript
// src/app/context/BrandContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { brandService } from '../../shared/lib/brandService';

const BrandContext = createContext(null);

export function BrandProvider({ children }) {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchBrands = useCallback(async (force = false) => {
    if (!force && brands.length > 0) return;
    setLoading(true);
    setError(null);
    try {
      const result = await brandService.getList({ pageSize: 1000 });
      setBrands(result.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [brands.length]);

  useEffect(() => { fetchBrands(); }, []);

  const value = { brands, loading, error, fetchBrands, refetch: () => fetchBrands(true) };

  return (
    <BrandContext.Provider value={value}>
      {children}
    </BrandContext.Provider>
  );
}

export function useBrands() {
  const context = useContext(BrandContext);
  if (!context) throw new Error('useBrands must be used within a BrandProvider');
  return context;
}
```



---

### Task C7: Create UomContext

**Files:**
- Create: `src/app/context/UomContext.jsx`

- [ ] **Step 1: Write UomContext implementation**

```javascript
// src/app/context/UomContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { uomService } from '../../shared/lib/uomService';

const UomContext = createContext(null);

export function UomProvider({ children }) {
  const [uoms, setUoms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchUoms = useCallback(async (force = false) => {
    if (!force && uoms.length > 0) return;
    setLoading(true);
    setError(null);
    try {
      const result = await uomService.getList({ pageSize: 1000 });
      setUoms(result.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [uoms.length]);

  useEffect(() => { fetchUoms(); }, []);

  const value = { uoms, loading, error, fetchUoms, refetch: () => fetchUoms(true) };

  return (
    <UomContext.Provider value={value}>
      {children}
    </UomContext.Provider>
  );
}

export function useUoms() {
  const context = useContext(UomContext);
  if (!context) throw new Error('useUoms must be used within a UomProvider');
  return context;
}
```



---

### Task C8: Create UserContext

**Files:**
- Create: `src/app/context/UserContext.jsx`

- [ ] **Step 1: Write UserContext implementation**

```javascript
// src/app/context/UserContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { userService } from '../../shared/lib/userService';

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchUsers = useCallback(async (force = false) => {
    if (!force && users.length > 0) return;
    setLoading(true);
    setError(null);
    try {
      const result = await userService.getList({ pageSize: 1000 });
      setUsers(result.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [users.length]);

  useEffect(() => { fetchUsers(); }, []);

  const value = { users, loading, error, fetchUsers, refetch: () => fetchUsers(true) };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

export function useUsers() {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUsers must be used within a UserProvider');
  return context;
}
```



---

### Task C9: Update App.jsx with all Context Providers

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Update App.jsx**

```jsx
// src/App.jsx (update)
import { AuthProvider } from './app/context/AuthContext';
import { ToastProvider } from './app/context/ToastContext';
import { CategoryProvider } from './app/context/CategoryContext';
import { SupplierProvider } from './app/context/SupplierContext';
import { WarehouseProvider } from './app/context/WarehouseContext';
import { BrandProvider } from './app/context/BrandContext';
import { UomProvider } from './app/context/UomContext';
import { UserProvider } from './app/context/UserContext';
import { Toast } from './components/Toast/Toast';

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <CategoryProvider>
          <SupplierProvider>
            <WarehouseProvider>
              <BrandProvider>
                <UomProvider>
                  <UserProvider>
                    <Toast />
                    <Router>
                      {/* routes */}
                    </Router>
                  </UserProvider>
                </UomProvider>
              </BrandProvider>
            </WarehouseProvider>
          </SupplierProvider>
        </CategoryProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
```



---

### Task C10: Create RoleContext (Permissions)

**Files:**
- Create: `src/app/context/RoleContext.jsx`

- [ ] **Step 1: Write RoleContext implementation**

```javascript
// src/app/context/RoleContext.jsx
import { createContext, useContext, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { getPermissionRole, getRawRoleFromUser } from '../../shared/permissions/roleUtils';

const RoleContext = createContext(null);

export function RoleProvider({ children }) {
  const { user } = useAuth();

  const permissions = useMemo(() => {
    if (!user) return null;
    return {
      rawRole: getRawRoleFromUser(user),
      permissionRole: getPermissionRole(user),
      roleCode: user.roleCode,
      roleName: user.roleName,
    };
  }, [user]);

  const value = {
    ...permissions,
    hasPermission: (requiredRole) => {
      if (!permissions) return false;
      return permissions.permissionRole >= requiredRole;
    },
    isAdmin: permissions?.rawRole === 'Admin',
    isManager: permissions?.rawRole === 'Manager',
    isWarehouse: permissions?.rawRole === 'Warehouse',
    isAccountant: permissions?.rawRole === 'Accountant',
  };

  return (
    <RoleContext.Provider value={value}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (!context) throw new Error('useRole must be used within a RoleProvider');
  return context;
}
```



---

### Task C4: Create useVietnamLocation Hook

**Files:**
- Create: `src/shared/hooks/useVietnamLocation.js`

- [ ] **Step 1: Write useVietnamLocation hook**

```javascript
// src/shared/hooks/useVietnamLocation.js
import { useState, useCallback } from 'react';
import { locationService } from '../lib/locationService';

export function useVietnamLocation() {
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [wards, setWards] = useState([]);
  const [loading, setLoading] = useState({ provinces: false, districts: false, wards: false });

  const fetchProvinces = useCallback(async () => {
    setLoading(prev => ({ ...prev, provinces: true }));
    try {
      const data = await locationService.getProvincesV2();
      setProvinces(data || []);
    } finally {
      setLoading(prev => ({ ...prev, provinces: false }));
    }
  }, []);

  const fetchDistricts = useCallback(async (provinceCode) => {
    if (!provinceCode) { setDistricts([]); return; }
    setLoading(prev => ({ ...prev, districts: true }));
    try {
      const data = await locationService.getDistricts(provinceCode);
      setDistricts(data || []);
    } finally {
      setLoading(prev => ({ ...prev, districts: false }));
    }
  }, []);

  const fetchWards = useCallback(async (districtCode) => {
    if (!districtCode) { setWards([]); return; }
    setLoading(prev => ({ ...prev, wards: true }));
    try {
      const data = await locationService.getWards(districtCode);
      setWards(data || []);
    } finally {
      setLoading(prev => ({ ...prev, wards: false }));
    }
  }, []);

  const clearDistricts = useCallback(() => { setDistricts([]); setWards([]); }, []);
  const clearWards = useCallback(() => { setWards([]); }, []);

  return {
    provinces, districts, wards, loading,
    fetchProvinces, fetchDistricts, fetchWards,
    clearDistricts, clearWards
  };
}
```



---

### Task C11: Update Components to Use Context

**Files:**
- Modify: Multiple pages using master data and toast

- [ ] **Step 1: Update CreateItem.jsx**

```jsx
// src/shared/pages/CreateItem.jsx (update)
import { useCategories } from '../../app/context/CategoryContext';
import { useBrands } from '../../app/context/BrandContext';
import { useUoms } from '../../app/context/UomContext';
import { useWarehouses } from '../../app/context/WarehouseContext';
import { useToastContext } from '../../app/context/ToastContext';

export function CreateItem() {
  const { categories } = useCategories();
  const { brands } = useBrands();
  const { uoms } = useUoms();
  const { warehouses } = useWarehouses();
  const { showToast } = useToastContext();

  // Remove: useState for categories, brands, uoms, warehouses
  // Remove: useEffect to fetch each
  // Use categories, brands, uoms directly in Select components
}
```

- [ ] **Step 2: Update CreatePurchaseOrder.jsx**

```jsx
// src/shared/pages/CreatePurchaseOrder.jsx (update)
import { useSuppliers } from '../../app/context/SupplierContext';
import { useWarehouses } from '../../app/context/WarehouseContext';
import { useUsers } from '../../app/context/UserContext';
import { useToastContext } from '../../app/context/ToastContext';

export function CreatePurchaseOrder() {
  const { suppliers } = useSuppliers();
  const { warehouses } = useWarehouses();
  const { users } = useUsers(); // For approver dropdown
  // Remove duplicate fetch calls
}
```

- [ ] **Step 3: Update ViewSupplierList.jsx**

```jsx
// src/shared/pages/ViewSupplierList.jsx (update)
import { useSuppliers } from '../../app/context/SupplierContext';

export function ViewSupplierList() {
  const { suppliers, loading, refetch } = useSuppliers();
  // Use suppliers directly instead of local state
}
```

- [ ] **Step 4: Update ViewWarehouseList.jsx**

```jsx
// src/shared/pages/ViewWarehouseList.jsx (update)
import { useWarehouses } from '../../app/context/WarehouseContext';

export function ViewWarehouseList() {
  const { warehouses, loading, refetch } = useWarehouses();
}
```

- [ ] **Step 5: Update ViewCategoryList.jsx, ViewBrandList.jsx, ViewUomList.jsx**

Similar pattern - replace local state with respective contexts

- [ ] **Step 6: Update all files using useToast hook**

```jsx
// Before:
import { useToast } from '../hooks/useToast';
const { showToast } = useToast();

// After:
import { useToastContext } from '../app/context/ToastContext';
const { showToast } = useToastContext();
```



---

## Part 3: Reusable UI Components

### Task U1: Create Form Input Components

**Files:**
- Create: `src/ui/inputs/TextField.jsx`
- Create: `src/ui/inputs/Select.jsx`
- Create: `src/ui/inputs/DatePicker.jsx`
- Create: `src/ui/inputs/index.js`

- [ ] **Step 1: Create TextField component**

```jsx
// src/ui/inputs/TextField.jsx
import { TextField as MuiTextField } from '@mui/material';

const inputSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: 2,
    '& fieldset': { borderColor: 'divider' }
  },
  '& .MuiInputLabel-root': { overflow: 'visible' },
};

export function TextField({ sx, ...props }) {
  return <MuiTextField sx={{ ...inputSx, ...sx }} {...props} />;
}
```

- [ ] **Step 2: Create Select and DatePicker components**

```jsx
// src/ui/inputs/Select.jsx
import { FormControl, InputLabel, Select, MenuItem } from '@mui/material';

export function Select({ label, options = [], sx, ...props }) {
  return (
    <FormControl sx={{ minWidth: 120, ...sx }} size="small">
      <InputLabel>{label}</InputLabel>
      <Select {...props} label={label}>
        {options.map((opt) => (
          <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
```

```jsx
// src/ui/inputs/DatePicker.jsx
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

export function DatePickerField({ sx, ...props }) {
  return (
    <DatePicker
      slotProps={{ textField: { size: 'small', sx } }}
      format="DD/MM/YYYY"
      {...props}
    />
  );
}
```



---

### Task U2: Create Button Components

**Files:**
- Create: `src/ui/buttons/Button.jsx`
- Create: `src/ui/buttons/IconButton.jsx`
- Create: `src/ui/buttons/index.js`

- [ ] **Step 1: Create Button and IconButton**

```jsx
// src/ui/buttons/Button.jsx
import { Button as MuiButton } from '@mui/material';

const variantSx = {
  contained: { boxShadow: 'none', '&:hover': { boxShadow: 'none' } },
  outlined: { borderRadius: 2 },
  text: { borderRadius: 2 },
};

export function Button({ variant = 'contained', sx, ...props }) {
  return (
    <MuiButton
      variant={variant}
      sx={{ borderRadius: 2, ...variantSx[variant], ...sx }}
      {...props}
    />
  );
}
```

```jsx
// src/ui/buttons/IconButton.jsx
import { IconButton as MuiIconButton } from '@mui/material';

export function IconButton({ sx, ...props }) {
  return <MuiIconButton sx={{ borderRadius: 2, ...sx }} {...props} />;
}
```



---

### Task U3: Create Dialog Components

**Files:**
- Create: `src/ui/dialogs/Dialog.jsx`
- Create: `src/ui/dialogs/FormDialog.jsx`
- Create: `src/ui/dialogs/ConfirmDialog.jsx`
- Create: `src/ui/dialogs/index.js`

- [ ] **Step 1: Create dialog components**

```jsx
// src/ui/dialogs/Dialog.jsx
import { Dialog as MuiDialog } from '@mui/material';

export function Dialog({ PaperProps, ...props }) {
  return (
    <MuiDialog
      PaperProps={{
        ...PaperProps,
        sx: { borderRadius: 3, ...PaperProps?.sx }
      }}
      {...props}
    />
  );
}
```

```jsx
// src/ui/dialogs/FormDialog.jsx
import { Dialog } from './Dialog';

export function FormDialog({ open, onClose, title, children, actions, maxWidth = 'sm', ...props }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth={maxWidth} fullWidth {...props}>
      <DialogTitle onClose={onClose}>{title}</DialogTitle>
      <DialogContent>{children}</DialogContent>
      {actions && <DialogActions>{actions}</DialogActions>}
    </Dialog>
  );
}
```

```jsx
// src/ui/dialogs/ConfirmDialog.jsx
import { Dialog } from './Dialog';
import { Button } from '../buttons/Button';

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmText = 'Xác nhận', cancelText = 'Hủy', loading }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent><p>{message}</p></DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={onClose} disabled={loading}>{cancelText}</Button>
        <Button onClick={onConfirm} loading={loading}>{confirmText}</Button>
      </DialogActions>
    </Dialog>
  );
}
```



---

### Task U4: Create Table Components

**Files:**
- Create: `src/ui/table/styles.js`
- Create: `src/ui/table/DataTable.jsx`
- Create: `src/ui/table/TablePagination.jsx`
- Create: `src/ui/table/index.js`

- [ ] **Step 1: Create table components**

```jsx
// src/ui/table/styles.js
export const headCellBaseSx = {
  fontWeight: 600,
  bgcolor: '#fafafa',
  borderBottom: '1px solid #e5e7eb',
  fontSize: '12px',
  color: '#6b7280',
  height: 48,
  py: 0,
  px: 2,
  verticalAlign: 'middle',
};

export const bodyCellBaseSx = {
  color: '#374151',
  fontSize: '13px',
  py: 1.25,
  px: 2,
  verticalAlign: 'middle',
  borderBottom: '1px solid #f3f4f6',
};
```

```jsx
// src/ui/table/DataTable.jsx
import { DataGrid } from '@mui/x-data-grid';
import { headCellBaseSx, bodyCellBaseSx } from './styles';

export function DataTable({ columns, rows, loading, paginationMode = 'server', ...props }) {
  return (
    <DataGrid
      columns={columns}
      rows={rows}
      loading={loading}
      paginationMode={paginationMode}
      disableRowSelectionOnClick
      autoHeight
      getRowClassName={() => 'table-row'}
      sx={{
        border: 'none',
        '& .table-row:hover': { bgcolor: '#f9fafb' },
      }}
      {...props}
    />
  );
}
```



---

## Part 4: Shared Hooks

### Task H1: Create useListData Hook

**Files:**
- Create: `src/shared/hooks/useListData.js`

- [ ] **Step 1: Write the hook**

```javascript
// src/shared/hooks/useListData.js
import { useState, useEffect, useCallback } from 'react';

export function useListData(fetchFn, options = {}) {
  const { initialPage = 1, initialPageSize = 20 } = options;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(initialPage - 1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [totalItems, setTotalItems] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchList = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFn({ page: page + 1, pageSize, search: searchTerm, ...params });
      setRows(result.items || []);
      setTotalItems(result.totalItems || 0);
    } catch (err) {
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [fetchFn, page, pageSize, searchTerm]);

  useEffect(() => { fetchList(); }, [fetchList]);

  return {
    rows, loading, error, page, pageSize, totalItems, searchTerm,
    setSearchTerm: (term) => { setSearchTerm(term); setPage(0); },
    setPage, setPageSize,
    refetch: fetchList,
  };
}
```



---

### Task H2: Create useDialog Hook

**Files:**
- Create: `src/shared/hooks/useDialog.js`

- [ ] **Step 1: Write the hook**

```javascript
// src/shared/hooks/useDialog.js
import { useState, useCallback } from 'react';

export function useDialog(initialState = false) {
  const [open, setOpen] = useState(initialState);
  const [data, setData] = useState(null);

  const openDialog = useCallback((initialData = null) => {
    setData(initialData);
    setOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setOpen(false);
    setData(null);
  }, []);

  const toggleDialog = useCallback(() => setOpen(prev => !prev), []);

  return { open, data, openDialog, closeDialog, toggleDialog };
}
```



---

### Task H3: Create useFilterPopup Hook

**Files:**
- Create: `src/shared/hooks/useFilterPopup.js`

- [ ] **Step 1: Write the hook**

```javascript
// src/shared/hooks/useFilterPopup.js
import { useState, useCallback } from 'react';

export function useFilterPopup() {
  const [anchorEl, setAnchorEl] = useState(null);
  const [filters, setFilters] = useState({});

  const openFilter = useCallback((event) => setAnchorEl(event.currentTarget), []);
  const closeFilter = useCallback(() => setAnchorEl(null), []);

  const applyFilters = useCallback((newFilters) => {
    setFilters(newFilters);
    closeFilter();
    return newFilters;
  }, [closeFilter]);

  const clearFilters = useCallback(() => setFilters({}), []);

  const hasFilters = useCallback(() => Object.values(filters).some(v => v !== '' && v != null), [filters]);

  return { anchorEl, filters, openFilter, closeFilter, applyFilters, clearFilters, hasFilters, isOpen: Boolean(anchorEl) };
}
```



---

### Task H4: Create useLocalStorage Hook

**Files:**
- Create: `src/shared/hooks/useLocalStorage.js`

- [ ] **Step 1: Write the hook**

```javascript
// src/shared/hooks/useLocalStorage.js
import { useState, useEffect, useCallback } from 'react';

export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch { return initialValue; }
  });

  const setStoredValue = useCallback((newValue) => {
    try {
      const valueToStore = typeof newValue === 'function' ? newValue(value) : newValue;
      setValue(valueToStore);
      localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }, [key, value]);

  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === key && e.newValue) setValue(JSON.parse(e.newValue));
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key]);

  return [value, setStoredValue];
}
```



---

## Part 5: Base Components

### Task B1: Create BaseListPage Component

**Files:**
- Create: `src/shared/components/BaseListPage.jsx`

- [ ] **Step 1: Write BaseListPage**

```jsx
// src/shared/components/BaseListPage.jsx
import { useState, useEffect, useCallback } from 'react';
import { Box, Paper, Typography, Card } from '@mui/material';
import { DataTable } from '../../ui/table/DataTable';
import { TablePagination } from '../../ui/table/TablePagination';
import { SearchInput } from '../components/SearchInput';
import { useFilterPopup } from '../hooks/useFilterPopup';
import { useLocalStorage } from '../hooks/useLocalStorage';

export function BaseListPage({
  title, columns, fetchData, defaultVisibleColumns = [],
  filterComponent: FilterComponent, onRowClick, children
}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalItems, setTotalItems] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  const filterPopup = useFilterPopup();
  const [visibleColumnIds] = useLocalStorage(`${title}VisibleColumns`, new Set(defaultVisibleColumns));

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchData({ page: page + 1, pageSize, search: searchTerm, ...filterPopup.filters });
      setRows(result.items || []);
      setTotalItems(result.totalItems || 0);
    } catch (err) {
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [fetchData, page, pageSize, searchTerm, filterPopup.filters]);

  useEffect(() => { fetchList(); }, [fetchList]);

  const visibleColumns = columns.filter(col => !visibleColumnIds.size || visibleColumnIds.has(col.field));

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>{title}</Typography>
      <Card sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <SearchInput value={searchTerm} onChange={setSearchTerm} />
          {FilterComponent && <FilterComponent {...filterPopup} />}
          {children}
        </Box>
      </Card>
      <Paper>
        <DataTable
          columns={visibleColumns} rows={rows} loading={loading}
          paginationMode="server" rowCount={totalItems}
          paginationModel={{ page, pageSize }}
          onPaginationModelChange={(model) => { setPage(model.page); setPageSize(model.pageSize); }}
          onRowClick={onRowClick}
        />
        <TablePagination
          count={totalItems} page={page} rowsPerPage={pageSize}
          onPageChange={(e, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => { setPageSize(parseInt(e.target.value, 10)); setPage(0); }}
        />
      </Paper>
    </Box>
  );
}
```



---

### Task B2: Create BaseFilterPopup Component

**Files:**
- Create: `src/shared/components/FilterPopup.jsx`

- [ ] **Step 1: Write FilterPopup**

```jsx
// src/shared/components/FilterPopup.jsx
import { Popover, Box, Button, TextField, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { useState } from 'react';

const TRANG_THAI_OPTIONS = [
  { value: '', label: 'Tất cả' },
  { value: 'true', label: 'Hoạt động' },
  { value: 'false', label: 'Ngừng Hoạt Động' },
];

export function FilterPopup({ anchorEl, open, onClose, filters = {}, onApply, onClear, fields = [], title = 'Bộ lọc' }) {
  const [localFilters, setLocalFilters] = useState(filters);

  const handleApply = () => { onApply(localFilters); onClose(); };
  const handleClear = () => { setLocalFilters({}); onClear?.(); onClose(); };
  const handleChange = (field, value) => setLocalFilters(prev => ({ ...prev, [field]: value }));

  return (
    <Popover anchorEl={anchorEl} open={open} onClose={onClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }} transformOrigin={{ vertical: 'top', horizontal: 'left' }}>
      <Box sx={{ p: 2, minWidth: 280 }}>
        <h3 style={{ margin: '0 0 16px' }}>{title}</h3>
        {fields.map(field => (
          <Box key={field.name} sx={{ mb: 2 }}>
            {field.type === 'select' ? (
              <FormControl fullWidth size="small">
                <InputLabel>{field.label}</InputLabel>
                <Select value={localFilters[field.name] || ''} label={field.label} onChange={(e) => handleChange(field.name, e.target.value)}>
                  {field.options?.map(opt => <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>)}
                </Select>
              </FormControl>
            ) : (
              <TextField fullWidth size="small" label={field.label} value={localFilters[field.name] || ''} onChange={(e) => handleChange(field.name, e.target.value)} type={field.type || 'text'} />
            )}
          </Box>
        ))}
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
          <Button size="small" onClick={handleClear}>Xóa</Button>
          <Button variant="contained" size="small" onClick={handleApply}>Áp dụng</Button>
        </Box>
      </Box>
    </Popover>
  );
}

export { TRANG_THAI_OPTIONS };
```

- [ ] **Step 2: Refactor existing filter popups to use this base**

```jsx
// Example: src/shared/components/ItemFilterPopup.jsx
import { FilterPopup, TRANG_THAI_OPTIONS } from './FilterPopup';

const FIELDS = [
  { name: 'itemCode', label: 'Mã sản phẩm' },
  { name: 'itemName', label: 'Tên sản phẩm' },
  { name: 'categoryId', label: 'Danh mục', type: 'select', options: [] },
  { name: 'status', label: 'Trạng thái', type: 'select', options: TRANG_THAI_OPTIONS },
];

export function ItemFilterPopup(props) {
  return <FilterPopup {...props} fields={FIELDS} title="Lọc sản phẩm" />;
}
```



---

### Task B3: Create BaseFormPage and BaseFormDialog

**Files:**
- Create: `src/shared/components/BaseFormPage.jsx`
- Create: `src/shared/components/BaseFormDialog.jsx`

- [ ] **Step 1: Write components**

```jsx
// src/shared/components/BaseFormPage.jsx
import { Box, Paper, Typography, Grid } from '@mui/material';
import { Button } from '../../ui/buttons/Button';

export function BaseFormPage({ title, onSubmit, loading, children, actions, sx, ...props }) {
  return (
    <Box sx={{ p: 3, ...sx }}>
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>{title}</Typography>
      <Paper sx={{ p: 3 }}>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
          <Grid container spacing={3}>{children}</Grid>
          {actions || <Box sx={{ display: 'flex', gap: 2, mt: 3, justifyContent: 'flex-end' }}><Button type="submit" variant="contained" loading={loading}>Lưu</Button></Box>}
        </form>
      </Paper>
    </Box>
  );
}
```

```jsx
// src/shared/components/BaseFormDialog.jsx
import { FormDialog } from '../../ui/dialogs/FormDialog';
import { Button } from '../../ui/buttons/Button';

export function BaseFormDialog({ open, onClose, title, onSubmit, loading, children, actions, ...props }) {
  return (
    <FormDialog open={open} onClose={onClose} title={title}
      actions={actions || (<><Button variant="outlined" onClick={onClose}>Hủy</Button><Button type="submit" form="form-dialog" loading={loading}>Lưu</Button></>)}
      {...props}
    >
      <form id="form-dialog" onSubmit={onSubmit}>{children}</form>
    </FormDialog>
  );
}
```



---

## Part 6: Refactor API Services

### Task S1: Create baseService

**Files:**
- Create: `src/shared/lib/baseService.js`

- [ ] **Step 1: Write base service**

```javascript
// src/shared/lib/baseService.js
import { apiClient } from './axios';

function mapRow(row, mapping) {
  if (!row) return null;
  const mapped = {};
  for (const [key, fn] of Object.entries(mapping)) {
    mapped[key] = fn(row);
  }
  return mapped;
}

function parseResponse(response) {
  const body = response?.data ?? {};
  const paged = body.data ?? body;
  return {
    items: Array.isArray(paged) ? paged : (paged?.items ?? paged?.Items ?? []),
    totalItems: paged?.totalItems ?? paged?.total ?? paged?.count ?? 0,
  };
}

export function createService(endpoint, mapping = {}) {
  return {
    async getList(params = {}) {
      const response = await apiClient.get(endpoint, { params });
      const { items, ...pagination } = parseResponse(response);
      return { ...pagination, items: items.map(row => mapRow(row, mapping)) };
    },
    async getById(id) {
      const response = await apiClient.get(`${endpoint}/${id}`);
      return mapRow(response?.data, mapping);
    },
    async create(data) {
      const response = await apiClient.post(endpoint, data);
      return response?.data;
    },
    async update(id, data) {
      const response = await apiClient.put(`${endpoint}/${id}`, data);
      return response?.data;
    },
    async delete(id) {
      const response = await apiClient.delete(`${endpoint}/${id}`);
      return response?.data;
    },
  };
}
```

- [ ] **Step 2: Refactor existing services**

```javascript
// Example: src/shared/lib/brandService.js
import { createService } from './baseService';

const BRAND_MAPPING = {
  id: r => r.brandId,
  name: r => r.brandName,
  code: r => r.brandCode,
  isActive: r => r.isActive,
};

export const brandService = createService('/brands', BRAND_MAPPING);
```



---

## Part 7: Break Down Large Pages

### Task L1: Break Down ViewPurchaseOrderDetail.jsx (157KB)

**Files:**
- Create: `src/features/purchase-order/components/PurchaseOrderHeader.jsx`
- Create: `src/features/purchase-order/components/PurchaseOrderItemsTable.jsx`
- Create: `src/features/purchase-order/components/PurchaseOrderTimeline.jsx`
- Create: `src/features/purchase-order/components/PurchaseOrderActions.jsx`
- Modify: `src/shared/pages/ViewPurchaseOrderDetail.jsx`

- [ ] **Step 1: Identify logical sections** - Read ViewPurchaseOrderDetail.jsx and identify:
  - Header section (supplier info, PO details)
  - Items table section
  - Timeline/audit section
  - Action buttons section

- [ ] **Step 2: Create sub-components**

```jsx
// src/features/purchase-order/components/PurchaseOrderHeader.jsx
import { Box, Typography, Grid } from '@mui/material';

export function PurchaseOrderHeader({ order }) {
  return (
    <Box sx={{ mb: 3 }}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle2">Mã đơn mua hàng</Typography>
          <Typography variant="body1">{order.purchaseOrderCode}</Typography>
        </Grid>
        <Grid item xs={12} md={6}>
          <Typography variant="subtitle2">Nhà cung cấp</Typography>
          <Typography variant="body1">{order.supplierName}</Typography>
        </Grid>
      </Grid>
    </Box>
  );
}
```

```jsx
// src/features/purchase-order/components/PurchaseOrderItemsTable.jsx
import { DataTable } from '../../ui/table/DataTable';

const COLUMNS = [
  { field: 'itemCode', headerName: 'Mã sản phẩm', width: 120 },
  { field: 'itemName', headerName: 'Tên sản phẩm', flex: 1 },
  { field: 'quantity', headerName: 'Số lượng', width: 100 },
  { field: 'unitPrice', headerName: 'Đơn giá', width: 120 },
  { field: 'totalPrice', headerName: 'Thành tiền', width: 150 },
];

export function PurchaseOrderItemsTable({ items }) {
  return <DataTable columns={COLUMNS} rows={items} />;
}
```

- [ ] **Step 3: Refactor main page**

```jsx
// src/shared/pages/ViewPurchaseOrderDetail.jsx (refactored)
import { PurchaseOrderHeader } from '../../features/purchase-order/components/PurchaseOrderHeader';
import { PurchaseOrderItemsTable } from '../../features/purchase-order/components/PurchaseOrderItemsTable';

export function ViewPurchaseOrderDetail() {
  const { order, items } = usePurchaseOrderData();

  return (
    <Box sx={{ p: 3 }}>
      <PurchaseOrderHeader order={order} />
      <PurchaseOrderItemsTable items={items} />
    </Box>
  );
}
```



---

### Task L2: Break Down Other Large Pages

Continue breaking down:
- ViewGoodReceiptNoteDetail.jsx (121KB)
- CreatePurchaseOrder.jsx (112KB)
- CreateGoodReceiptNote.jsx (92KB)
- ViewItemList.jsx (79KB)
- ViewPurchaseOrderList.jsx (69KB)

---

## Part 8: Feature-Based Folder Structure

### Task F1: Create Feature Directories

**Files:**
- Create: `src/features/purchase-order/`, `src/features/supplier/`, `src/features/item/`, etc.

Each feature folder will contain:
- `components/` - Feature-specific components
- `hooks/` - Feature-specific hooks
- `pages/` - Feature page components

- [ ] **Step 1: Create directory structure and move components**




---

## Part 9: Final Cleanup

### Task FC1: Update Routes

**Files:**
- Modify: `src/app/routes.jsx`

- [ ] **Update imports to point to new locations**



---

### Task FC2: Verify Application Works

- [ ] **Step 1: Run development server**


- [ ] **Step 2: Test navigation and basic functionality**



---

## Summary

### New Directories Created

| Directory | Purpose |
|-----------|---------|
| `src/app/context/` | React Context providers |
| `src/ui/inputs/` | Reusable form inputs |
| `src/ui/buttons/` | Reusable buttons |
| `src/ui/dialogs/` | Reusable dialogs |
| `src/ui/table/` | Reusable table components |
| `src/ui/badges/` | Reusable badges and chips |
| `src/shared/hooks/` | Shared React hooks |
| `src/shared/components/` | Base components |
| `src/features/*/` | Feature-based organization |

### Context Providers Created (10 Contexts)

| Context | Purpose | Files Modified |
|---------|---------|----------------|
| AuthContext | User authentication state | ~5 files |
| ToastContext | Global notifications | ~22 files |
| CategoryContext | Categories master data | ~4 files |
| SupplierContext | Suppliers master data | ~4 files |
| WarehouseContext | Warehouses master data | ~4 files |
| BrandContext | Brands master data | ~2 files |
| UomContext | Units of measure data | ~4 files |
| UserContext | Users data | ~3 files |
| useVietnamLocation | Vietnam location data (hook) | Multiple |
| RoleContext | Permissions/roles | ~15 files |

### Additional Patterns to Refactor

| Pattern | Description | Files Affected |
|---------|-------------|----------------|
| List View State | 10+ useState in each list page | 20+ pages |
| Form State | useState + validation + errors | 15+ pages |
| localStorage | Column visibility, sorting | Multiple |
| Table Features | Column toggle, reorder, sort | 15+ pages |
| Filter Popups | Similar structure in 9 files | 9 files |
| Dialogs | Similar structure in 6+ files | 6+ files |
| Loading States | CircularProgress in every page | 40+ pages |

### Expected Outcomes

- ✅ Centralized auth state accessible via `useAuth()`
- ✅ Toast notifications work globally without prop drilling
- ✅ Each master data type has its own context (Category, Supplier, Warehouse, Brand, Uom, User)
- ✅ Role/permissions centralized via `useRole()`
- ✅ Vietnam location data accessible via useVietnamLocation hook
- ✅ Repeated UI components consolidated
- ✅ Large pages broken into maintainable pieces
- ✅ Feature-based organization
- ✅ Consistent styling through shared UI components
- ✅ Easier testing and maintenance
