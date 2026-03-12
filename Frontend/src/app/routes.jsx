import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from '../shared/pages/Login';
import ForgotPassword from '../shared/pages/ForgotPassword';
import ResetPassword from '../shared/pages/ResetPassword';
import Profile from '../shared/pages/Profile';
import Home from '../shared/pages/Home';
import UserAccountList from '../shared/pages/ViewUserAccountList';
import DeactivatedUsersList from '../shared/pages/ViewDeactivatedUsersList';
import ItemList from '../shared/pages/ViewItemList';
import CreateItem from '../shared/pages/CreateItem';
import EditItem from '../shared/pages/EditItem';
import ViewItemDetail from '../shared/pages/ViewItemDetail';
import ViewPurchaseOrderList from '../shared/pages/ViewPurchaseOrderList';
import ViewPurchaseOrderDetail from '../shared/pages/ViewPurchaseOrderDetail';
import CreatePurchaseOrder from '../shared/pages/CreatePurchaseOrder';
import AdminNotifications from '../shared/pages/AdminNotifications';
import ViewNotifications from '../shared/pages/ViewNotifications';
import AdminAuditLog from '../shared/pages/ViewAdminAuditLog';
import ViewSupplierList from '../shared/pages/ViewSupplierList';
import CreateSupplier from '../shared/pages/CreateSupplier';
import ViewWarehouseList from '../shared/pages/ViewWarehouseList';
import CreateWarehouse from '../shared/pages/CreateWarehouse';
import ViewGoodReceiptNotes from '../shared/pages/ViewGoodReceiptNotesList';
import ViewGoodReceiptNoteDetail from '../shared/pages/ViewGoodReceiptNoteDetail';
import CreateGoodReceiptNote from '../shared/pages/CreateGoodReceiptNote';
import ViewGoodDeliveryNotes from '../shared/pages/ViewGoodDeliveryNotes';
import ViewReceiver from '../shared/pages/ViewReceiverList';
import CreateReceiver from '../shared/pages/CreateReceiver';
import ViewCategoryList from '../shared/pages/ViewCategoryList';
import CreateCategory from '../shared/pages/CreateCategory';
import EditCategory from '../shared/pages/EditCategory';
import ViewPackagingSpecList from '../shared/pages/ViewPackagingSpecList';
import ViewSpecList from '../shared/pages/ViewSpecList';
import ViewBrandList from '../shared/pages/ViewBrandList';
import ViewUomList from '../shared/pages/ViewUomList';
import ProtectedRoute from '../components/ProtectedRoute';
import MainLayout from '../components/Layout/MainLayout';

const AppRoutes = () => (
    <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Home Dashboard: chỉ Giám đốc (DIRECTOR) mới có quyền truy cập */}
        <Route
            path="/home"
            element={
                <ProtectedRoute allowedRoles={['DIRECTOR']}>
                    <MainLayout>
                        <Home />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        {/* Home dashboard chỉ dành cho Giám đốc; Admin không có đường /admin/home tới dashboard */}
        <Route
            path="/admin/home"
            element={
                <ProtectedRoute allowedRoles={['DIRECTOR']}>
                    <MainLayout>
                        <Home />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/sale-support/home"
            element={
                <ProtectedRoute allowedRoles={['DIRECTOR']}>
                    <MainLayout>
                        <Home />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/sale-support/home/suppliers-view"
            element={
                <ProtectedRoute>
                    <MainLayout>
                        <ViewSupplierList />
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
            path="/admin/users/deactivated"
            element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                    <MainLayout>
                        <DeactivatedUsersList />
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
        {/* Thông báo dùng chung cho mọi role (mockup theo role) */}
        <Route
            path="/notifications"
            element={
                <ProtectedRoute>
                    <MainLayout>
                        <ViewNotifications />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        {/* Cài đặt thông báo (chỉ Admin) */}
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
        {/* Items – full quyền: tất cả role trừ ADMIN và Giám đốc (WAREHOUSE_KEEPER, SALE_SUPPORT, SALE_ENGINEER, ACCOUNTANTS) */}
        <Route
            path="/products"
            element={
                <ProtectedRoute allowedRoles={['WAREHOUSE_KEEPER', 'SALE_SUPPORT', 'SALE_ENGINEER', 'ACCOUNTANTS']}>
                    <MainLayout>
                        <ItemList />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/items/create"
            element={
                <ProtectedRoute allowedRoles={['WAREHOUSE_KEEPER', 'SALE_SUPPORT', 'SALE_ENGINEER', 'ACCOUNTANTS']}>
                    <MainLayout>
                        <CreateItem />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/items/edit/:id"
            element={
                <ProtectedRoute allowedRoles={['WAREHOUSE_KEEPER', 'SALE_SUPPORT', 'SALE_ENGINEER', 'ACCOUNTANTS']}>
                    <MainLayout>
                        <EditItem />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/items/:id"
            element={
                <ProtectedRoute allowedRoles={['WAREHOUSE_KEEPER', 'SALE_SUPPORT', 'SALE_ENGINEER', 'ACCOUNTANTS']}>
                    <MainLayout>
                        <ViewItemDetail />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/categories"
            element={
                <ProtectedRoute allowedRoles={['WAREHOUSE_KEEPER', 'SALE_SUPPORT', 'SALE_ENGINEER', 'ACCOUNTANTS']}>
                    <MainLayout>
                        <ViewCategoryList />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/categories/create"
            element={
                <ProtectedRoute allowedRoles={['WAREHOUSE_KEEPER', 'SALE_SUPPORT', 'SALE_ENGINEER', 'ACCOUNTANTS']}>
                    <MainLayout>
                        <CreateCategory />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/categories/edit/:id"
            element={
                <ProtectedRoute allowedRoles={['WAREHOUSE_KEEPER', 'SALE_SUPPORT', 'SALE_ENGINEER', 'ACCOUNTANTS']}>
                    <MainLayout>
                        <EditCategory />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/packaging-spec"
            element={
                <ProtectedRoute allowedRoles={['WAREHOUSE_KEEPER', 'SALE_SUPPORT', 'SALE_ENGINEER', 'ACCOUNTANTS']}>
                    <MainLayout>
                        <ViewPackagingSpecList />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/specs"
            element={
                <ProtectedRoute allowedRoles={['WAREHOUSE_KEEPER', 'SALE_SUPPORT', 'SALE_ENGINEER', 'ACCOUNTANTS']}>
                    <MainLayout>
                        <ViewSpecList />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        <Route path="/item-masters" element={<Navigate to="/categories" replace />} />
        <Route
            path="/uom"
            element={
                <ProtectedRoute allowedRoles={['WAREHOUSE_KEEPER', 'ACCOUNTANTS', 'SALE_SUPPORT', 'SALE_ENGINEER']}>
                    <MainLayout>
                        <ViewUomList />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        <Route path="/uom/create" element={<Navigate to="/uom" replace />} />
        <Route path="/uom/edit/:id" element={<Navigate to="/uom" replace />} />
        <Route
            path="/brands"
            element={
                <ProtectedRoute allowedRoles={['WAREHOUSE_KEEPER', 'ACCOUNTANTS', 'SALE_SUPPORT', 'SALE_ENGINEER']}>
                    <MainLayout>
                        <ViewBrandList />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/suppliers"
            element={
                <ProtectedRoute allowedRoles={['DIRECTOR', 'WAREHOUSE_KEEPER', 'SALE_SUPPORT', 'SALE_ENGINEER', 'ACCOUNTANTS']}>
                    <MainLayout>
                        <ViewSupplierList />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/suppliers/create"
            element={
                <MainLayout>
                    <CreateSupplier />
                </MainLayout>
            }
        />
        {/* Quản lý kho – Director, Thủ kho, Sale Support, Sale Engineer, Kế toán */}
        <Route
            path="/inventory"
            element={
                <ProtectedRoute allowedRoles={['DIRECTOR', 'WAREHOUSE_KEEPER', 'SALE_SUPPORT', 'SALE_ENGINEER', 'ACCOUNTANTS']}>
                    <MainLayout>
                        <ViewWarehouseList />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/inventory/create"
            element={
                <ProtectedRoute allowedRoles={['DIRECTOR', 'WAREHOUSE_KEEPER', 'SALE_SUPPORT', 'SALE_ENGINEER', 'ACCOUNTANTS']}>
                    <MainLayout>
                        <CreateWarehouse />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        {/* Yêu cầu nhập hàng (GRN) – Kế toán, Thủ kho */}
        <Route
            path="/good-receipt-notes"
            element={
                <ProtectedRoute allowedRoles={['ACCOUNTANTS', 'WAREHOUSE_KEEPER']}>
                    <MainLayout>
                        <ViewGoodReceiptNotes />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/good-receipt-notes/:id"
            element={
                <ProtectedRoute allowedRoles={['ACCOUNTANTS', 'WAREHOUSE_KEEPER']}>
                    <MainLayout>
                        <ViewGoodReceiptNoteDetail />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/good-receipt-notes/create"
            element={
                <ProtectedRoute allowedRoles={['ACCOUNTANTS', 'WAREHOUSE_KEEPER']}>
                    <MainLayout>
                        <CreateGoodReceiptNote />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        {/* Yêu cầu xuất hàng (GDN) – Kế toán, Thủ kho */}
        <Route
            path="/good-delivery-notes"
            element={
                <ProtectedRoute allowedRoles={['ACCOUNTANTS', 'WAREHOUSE_KEEPER']}>
                    <MainLayout>
                        <ViewGoodDeliveryNotes />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/receivers"
            element={
                <ProtectedRoute allowedRoles={['DIRECTOR', 'WAREHOUSE_KEEPER', 'SALE_SUPPORT', 'SALE_ENGINEER', 'ACCOUNTANTS']}>
                    <MainLayout>
                        <ViewReceiver />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/receivers/create"
            element={
                <ProtectedRoute allowedRoles={['SALE_ENGINEER']}>
                    <MainLayout>
                        <CreateReceiver />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        {/* Purchase order: Sale Support, Kế toán (Quản lý đơn mua trong Yêu Cầu) */}
        <Route
            path="/purchase-orders"
            element={
                <ProtectedRoute allowedRoles={['SALE_SUPPORT', 'ACCOUNTANTS']}>
                    <MainLayout>
                        <ViewPurchaseOrderList />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/purchase-orders/create"
            element={
                <ProtectedRoute allowedRoles={['SALE_SUPPORT', 'ACCOUNTANTS']}>
                    <MainLayout>
                        <CreatePurchaseOrder />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/purchase-orders/:id"
            element={
                <ProtectedRoute allowedRoles={['SALE_SUPPORT', 'ACCOUNTANTS']}>
                    <MainLayout>
                        <ViewPurchaseOrderDetail />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
    </Routes>
);

export default AppRoutes;
