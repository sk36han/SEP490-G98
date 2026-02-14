import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from '../shared/pages/Login';
import ForgotPassword from '../shared/pages/ForgotPassword';
import ResetPassword from '../shared/pages/ResetPassword';
import Profile from '../shared/pages/Profile';
import Home from '../shared/pages/Home';
import UserAccountList from '../shared/pages/UserAccountList';
import ItemList from '../shared/pages/ItemList';
import CreateItem from '../shared/pages/CreateItem';
import EditItem from '../shared/pages/EditItem';
import ViewItem from '../shared/pages/ViewItem';
import PurchaseOrderList from '../shared/pages/PurchaseOrderList';
import ViewPurchaseOrder from '../shared/pages/ViewPurchaseOrder';
import CreatePO from '../shared/pages/CreatePO';
import EditPO from '../shared/pages/EditPO';
import AdminNotifications from '../shared/pages/AdminNotifications';
import AdminAuditLog from '../shared/pages/AdminAuditLog';
import SupplierList from '../shared/pages/SupplierList';
import ProtectedRoute from '../components/ProtectedRoute';
import MainLayout from '../components/Layout/MainLayout';

const AppRoutes = () => (
    <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route
            path="/home"
            element={
                <ProtectedRoute>
                    <MainLayout>
                        <Home />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/admin/home"
            element={
                <ProtectedRoute>
                    <MainLayout>
                        <Home />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/manager/home"
            element={
                <ProtectedRoute>
                    <MainLayout>
                        <Home />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/staff/home"
            element={
                <ProtectedRoute>
                    <MainLayout>
                        <Home />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/sale-support/home"
            element={
                <ProtectedRoute>
                    <MainLayout>
                        <Home />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/profile"
            element={
                <ProtectedRoute>
                    <MainLayout>
                        <Profile />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/admin/users"
            element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                    <MainLayout>
                        <UserAccountList />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/admin/notifications"
            element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                    <MainLayout>
                        <AdminNotifications />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/admin/audit-log"
            element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                    <MainLayout>
                        <AdminAuditLog />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        {/* Item mockup: public cho tất cả user trừ Admin */}
        <Route
            path="/products"
            element={
                <ProtectedRoute allowedRoles={['MANAGER', 'WAREHOUSE_KEEPER', 'SALE_SUPPORT', 'STAFF']}>
                    <MainLayout>
                        <ItemList />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/items/create"
            element={
                <ProtectedRoute allowedRoles={['MANAGER', 'WAREHOUSE_KEEPER', 'SALE_SUPPORT', 'STAFF']}>
                    <MainLayout>
                        <CreateItem />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/items/edit/:id"
            element={
                <ProtectedRoute allowedRoles={['MANAGER', 'WAREHOUSE_KEEPER', 'SALE_SUPPORT', 'STAFF']}>
                    <MainLayout>
                        <EditItem />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/items/:id"
            element={
                <ProtectedRoute allowedRoles={['MANAGER', 'WAREHOUSE_KEEPER', 'SALE_SUPPORT', 'STAFF']}>
                    <MainLayout>
                        <ViewItem />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/suppliers"
            element={
                <ProtectedRoute allowedRoles={['SALE_SUPPORT']}>
                    <MainLayout>
                        <SupplierList />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        {/* Purchase order mockup: chỉ Sale Support */}
        <Route
            path="/purchase-orders"
            element={
                <ProtectedRoute allowedRoles={['SALE_SUPPORT']}>
                    <MainLayout>
                        <PurchaseOrderList />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/purchase-orders/create"
            element={
                <ProtectedRoute allowedRoles={['SALE_SUPPORT']}>
                    <MainLayout>
                        <CreatePO />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/purchase-orders/edit/:id"
            element={
                <ProtectedRoute allowedRoles={['SALE_SUPPORT']}>
                    <MainLayout>
                        <EditPO />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/purchase-orders/:id"
            element={
                <ProtectedRoute allowedRoles={['SALE_SUPPORT']}>
                    <MainLayout>
                        <ViewPurchaseOrder />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
    </Routes>
);

export default AppRoutes;
