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
import ViewSupplierList from '../shared/pages/ViewSupplierList';
import CreateSupplier from '../shared/pages/CreateSupplier';
import ViewWarehouseList from '../shared/pages/ViewWarehouseList';
import ViewWarehouseDetail from '../shared/pages/ViewWarehouseDetail';
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
                <ProtectedRoute allowedRoles={['ADMIN']}>
                    <MainLayout>
                        <Home />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        <Route path="/director/home" element={<ProtectedRoute allowedRoles={['DIRECTOR']}><MainLayout><Home /></MainLayout></ProtectedRoute>} />
        <Route
            path="/sale-support/home"
            element={
                <ProtectedRoute allowedRoles={['SALE_SUPPORT']}>
                    <MainLayout>
                        <Home />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/sale-engineer/home"
            element={
                <ProtectedRoute allowedRoles={['SALE_ENGINEER']}>
                    <MainLayout>
                        <Home />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/sale-support/home/suppliers-view"
            element={
                <ProtectedRoute allowedRoles={['SALE_SUPPORT']}>
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
        {/* Items: Admin không xem item. Director chỉ xem. Tạo/Sửa = chỉ Thủ kho. */}
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
                <ProtectedRoute allowedRoles={['WAREHOUSE_KEEPER']}>
                    <MainLayout>
                        <CreateItem />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/items/edit/:id"
            element={
                <ProtectedRoute allowedRoles={['WAREHOUSE_KEEPER']}>
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
        {/* Suppliers: View = Director, Sale Support, Kế toán. Create/Update/Status = Sale Support. */}
        <Route
            path="/suppliers"
            element={
                <ProtectedRoute allowedRoles={['DIRECTOR', 'SALE_SUPPORT', 'ACCOUNTANTS']}>
                    <MainLayout>
                        <ViewSupplierList />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/suppliers/create"
            element={
                <ProtectedRoute allowedRoles={['SALE_SUPPORT']}>
                    <MainLayout>
                        <CreateSupplier />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        {/* Warehouses: View = Director, Thủ kho. Create/Update/Status = Thủ kho. */}
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
        <Route
            path="/inventory/:id"
            element={
                <ProtectedRoute allowedRoles={['DIRECTOR', 'WAREHOUSE_KEEPER']}>
                    <MainLayout>
                        <ViewWarehouseDetail />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        {/* GRN: View = Kế toán, Thủ kho. Create/Update/Status = Thủ kho. */}
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
        {/* GDN: Giống GRN – View = Kế toán, Thủ kho. Create/Update/Status = Thủ kho. */}
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
        {/* PO: View = Kế toán, Sale Support. Create/Update/Status = Sale Support. */}
        <Route
            path="/purchase-orders"
            element={
                <ProtectedRoute allowedRoles={['ACCOUNTANTS', 'SALE_SUPPORT']}>
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
                <ProtectedRoute allowedRoles={['ACCOUNTANTS', 'SALE_SUPPORT']}>
                    <MainLayout>
                        <ViewPurchaseOrder />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
    </Routes>
);

export default AppRoutes;
