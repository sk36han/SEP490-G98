import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from '../shared/pages/Login';
import ForgotPassword from '../shared/pages/ForgotPassword';
import ResetPassword from '../shared/pages/ResetPassword';
import Profile from '../shared/pages/Profile';
import Home from '../shared/pages/Home';
import UserAccountList from '../shared/pages/ViewUserAccountList';
import ItemList from '../shared/pages/ViewItemList';
import CreateItem from '../shared/pages/CreateItem';
import EditItem from '../shared/pages/EditItem';
import ViewItemDetail from '../shared/pages/ViewItemDetail';
import PurchaseOrderList from '../shared/pages/ViewPurchaseOrderList';
import ViewPurchaseOrder from '../shared/pages/ViewPurchaseOrder';
import CreatePO from '../shared/pages/CreatePO';
import EditPO from '../shared/pages/EditPO';
import AdminNotifications from '../shared/pages/AdminNotifications';
import AdminAuditLog from '../shared/pages/ViewAdminAuditLog';
import SupplierView from '../shared/pages/SupplierView';
import ViewWarehouseList from '../shared/pages/ViewWarehouseList';
import ViewGoodReceiptNotes from '../shared/pages/ViewGoodReceiptNotes';
import ViewGoodDeliveryNotes from '../shared/pages/ViewGoodDeliveryNotes';
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
            path="/director/home"
            element={
                <ProtectedRoute>
                    <MainLayout>
                        <Home />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/warehouse-keeper/home"
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
            path="/sale-engineer/home"
            element={
                <ProtectedRoute>
                    <MainLayout>
                        <Home />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/accountants/home"
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
                <ProtectedRoute allowedRoles={['ADMIN', 'DIRECTOR']}>
                    <MainLayout>
                        <UserAccountList />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/admin/notifications"
            element={
                <ProtectedRoute allowedRoles={['ADMIN', 'DIRECTOR']}>
                    <MainLayout>
                        <AdminNotifications />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/admin/audit-log"
            element={
                <ProtectedRoute allowedRoles={['ADMIN', 'DIRECTOR']}>
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
                <ProtectedRoute allowedRoles={['DIRECTOR', 'WAREHOUSE_KEEPER', 'SALE_SUPPORT', 'SALE_ENGINEER', 'ACCOUNTANTS']}>
                    <MainLayout>
                        <ItemList />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/items/create"
            element={
                <ProtectedRoute allowedRoles={['DIRECTOR', 'WAREHOUSE_KEEPER', 'SALE_SUPPORT', 'SALE_ENGINEER', 'ACCOUNTANTS']}>
                    <MainLayout>
                        <CreateItem />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/items/edit/:id"
            element={
                <ProtectedRoute allowedRoles={['DIRECTOR', 'WAREHOUSE_KEEPER', 'SALE_SUPPORT', 'SALE_ENGINEER', 'ACCOUNTANTS']}>
                    <MainLayout>
                        <EditItem />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/items/:id"
            element={
                <ProtectedRoute allowedRoles={['DIRECTOR', 'WAREHOUSE_KEEPER', 'SALE_SUPPORT', 'SALE_ENGINEER', 'ACCOUNTANTS']}>
                    <MainLayout>
                        <ViewItemDetail />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/suppliers"
            element={
                <ProtectedRoute allowedRoles={['DIRECTOR', 'SALE_SUPPORT', 'SALE_ENGINEER']}>
                    <MainLayout>
                        <SupplierView />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        {/* Quản lý kho – Thủ kho (menu chỉ hiển thị cho Thủ kho; route cho phép cả Manager/Staff nếu truy cập trực tiếp) */}
        <Route
            path="/inventory"
            element={
                <ProtectedRoute allowedRoles={['DIRECTOR', 'WAREHOUSE_KEEPER']}>
                    <MainLayout>
                        <ViewWarehouseList />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        {/* Yêu cầu nhập hàng (GRN) – Thủ kho */}
        <Route
            path="/good-receipt-notes"
            element={
                <ProtectedRoute allowedRoles={['DIRECTOR', 'WAREHOUSE_KEEPER']}>
                    <MainLayout>
                        <ViewGoodReceiptNotes />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        {/* Yêu cầu xuất hàng (GDN) – Thủ kho */}
        <Route
            path="/good-delivery-notes"
            element={
                <ProtectedRoute allowedRoles={['DIRECTOR', 'WAREHOUSE_KEEPER']}>
                    <MainLayout>
                        <ViewGoodDeliveryNotes />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        {/* Purchase order mockup: chỉ Sale Support */}
        <Route
            path="/purchase-orders"
            element={
                <ProtectedRoute allowedRoles={['DIRECTOR', 'SALE_SUPPORT', 'ACCOUNTANTS']}>
                    <MainLayout>
                        <PurchaseOrderList />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/purchase-orders/create"
            element={
                <ProtectedRoute allowedRoles={['DIRECTOR', 'SALE_SUPPORT']}>
                    <MainLayout>
                        <CreatePO />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/purchase-orders/edit/:id"
            element={
                <ProtectedRoute allowedRoles={['DIRECTOR', 'SALE_SUPPORT']}>
                    <MainLayout>
                        <EditPO />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/purchase-orders/:id"
            element={
                <ProtectedRoute allowedRoles={['DIRECTOR', 'SALE_SUPPORT', 'ACCOUNTANTS']}>
                    <MainLayout>
                        <ViewPurchaseOrder />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/reports"
            element={
                <ProtectedRoute allowedRoles={['DIRECTOR', 'ACCOUNTANTS']}>
                    <MainLayout>
                        <div style={{ padding: 24, textAlign: 'center' }}>
                            <p style={{ marginBottom: 16 }}>Trang báo cáo đang được phát triển.</p>
                            <a href="/home" style={{ color: '#0284c7' }}>Về trang chủ</a>
                        </div>
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        {/* Fallback: nếu không có route nào khớp (tránh trang trống) */}
        <Route
            path="*"
            element={
                <ProtectedRoute>
                    <MainLayout>
                        <div style={{ padding: 24, textAlign: 'center' }}>
                            <p style={{ marginBottom: 16 }}>Trang không tồn tại.</p>
                            <a href="/home" style={{ color: '#0284c7' }}>Về trang chủ</a>
                        </div>
                    </MainLayout>
                </ProtectedRoute>
            }
        />
    </Routes>
);

export default AppRoutes;
