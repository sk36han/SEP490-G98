import { createContext, useContext, useMemo } from 'react';
import { AuthContext } from './AuthContext';
import { getPermissionRole, getRawRoleFromUser } from '../../shared/permissions/roleUtils';

const RoleContext = createContext(null);

export function RoleProvider({ children }) {
  // Dùng useContext trực tiếp thay vì useAuth để tránh React throw khi context null
  const authContext = useContext(AuthContext);
  const user = authContext?.user ?? null;

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
