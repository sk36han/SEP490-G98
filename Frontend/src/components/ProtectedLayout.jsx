import MainLayout from './Layout/MainLayout';
import ProtectedRoute from './ProtectedRoute';

/**
 * Wrapper: ProtectedRoute + MainLayout gộp lại.
 * Dùng cho hầu hết các route cần auth + layout.
 */
const ProtectedLayout = ({ children, allowedRoles }) => (
    <ProtectedRoute allowedRoles={allowedRoles}>
        <MainLayout>{children}</MainLayout>
    </ProtectedRoute>
);

export default ProtectedLayout;
