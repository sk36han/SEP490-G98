import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
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
import ViewPurchaseReturnList from '../shared/pages/ViewPurchaseReturnList';
import CreatePurchaseReturn from '../shared/pages/CreatePurchaseReturn';
import ViewItemPriceList from '../shared/pages/ViewItemPriceList';
import AdminNotifications from '../shared/pages/AdminNotifications';
import ViewNotifications from '../shared/pages/ViewNotifications';
import AdminAuditLog from '../shared/pages/ViewAdminAuditLog';
import ViewSupplierList from '../shared/pages/ViewSupplierList';
import ViewSupplierDetail from '../shared/pages/ViewSupplierDetail';
import CreateSupplier from '../shared/pages/CreateSupplier';
import ViewWarehouseList from '../shared/pages/ViewWarehouseList';
import ViewWarehouseDetail from '../shared/pages/ViewWarehouseDetail';
import ViewInventoryAdjustmentList from '../shared/pages/ViewInventoryAdjustmentList';
import ViewStocktakeList from '../shared/pages/ViewStocktakeList';
import CreateStocktake from '../shared/pages/CreateStocktake';
import ViewStocktakeDetail from '../shared/pages/ViewStocktakeDetail';
import StocktakeReport from '../shared/pages/StocktakeReport';
import CreateInventoryAdjustment from '../shared/pages/CreateInventoryAdjustment';
import ViewInventoryAdjustmentDetail from '../shared/pages/ViewInventoryAdjustmentDetail';
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
import ViewReleaseRequestList from '../shared/pages/ViewReleaseRequestList';
import CreateReleaseRequest from '../shared/pages/CreateReleaseRequest';
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
                <ProtectedRoute allowedRoles={['DIRECTOR']}>
                    <MainLayout>
                        <Home />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
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
                <ProtectedRoute allowedRoles={['WAREHOUSE_KEEPER', 'SALE_ENGINEER', 'ACCOUNTANTS']}>
                    <MainLayout>
                        <CreateItem />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/items/edit/:id"
            element={
                <ProtectedRoute allowedRoles={['WAREHOUSE_KEEPER', 'SALE_ENGINEER', 'ACCOUNTANTS']}>
                    <MainLayout>
                        <EditItem />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/items/:id"
            element={
                <ProtectedRoute allowedRoles={['WAREHOUSE_KEEPER', 'SALE_ENGINEER', 'ACCOUNTANTS']}>
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
                <ProtectedRoute allowedRoles={['WAREHOUSE_KEEPER', 'SALE_ENGINEER', 'ACCOUNTANTS']}>
                    <MainLayout>
                        <CreateCategory />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/categories/edit/:id"
            element={
                <ProtectedRoute allowedRoles={['WAREHOUSE_KEEPER', 'SALE_ENGINEER', 'ACCOUNTANTS']}>
                    <MainLayout>
                        <EditCategory />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/packaging-spec"
            element={
                <ProtectedRoute allowedRoles={['WAREHOUSE_KEEPER', 'SALE_ENGINEER', 'ACCOUNTANTS']}>
                    <MainLayout>
                        <ViewPackagingSpecList />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/specs"
            element={
                <ProtectedRoute allowedRoles={['WAREHOUSE_KEEPER', 'SALE_ENGINEER', 'ACCOUNTANTS']}>
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
                <ProtectedRoute allowedRoles={['WAREHOUSE_KEEPER', 'ACCOUNTANTS', 'SALE_ENGINEER']}>
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
                <ProtectedRoute allowedRoles={['DIRECTOR', 'WAREHOUSE_KEEPER', 'SALE_ENGINEER', 'ACCOUNTANTS', 'SALE_SUPPORT']}>
                    <MainLayout>
                        <ViewSupplierList />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/suppliers/create"
            element={
                <ProtectedRoute allowedRoles={['DIRECTOR', 'WAREHOUSE_KEEPER', 'SALE_ENGINEER', 'ACCOUNTANTS', 'SALE_SUPPORT']}>
                    <MainLayout>
                        <CreateSupplier />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/suppliers/:id"
            element={
                <ProtectedRoute allowedRoles={['DIRECTOR', 'WAREHOUSE_KEEPER', 'SALE_ENGINEER', 'ACCOUNTANTS', 'SALE_SUPPORT']}>
                    <MainLayout>
                        <ViewSupplierDetail />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/inventory"
            element={
                <ProtectedRoute allowedRoles={['DIRECTOR', 'WAREHOUSE_KEEPER', 'SALE_ENGINEER', 'ACCOUNTANTS', 'SALE_SUPPORT']}>
                    <MainLayout>
                        <ViewWarehouseList />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/inventory/create"
            element={
                <ProtectedRoute allowedRoles={['DIRECTOR', 'WAREHOUSE_KEEPER', 'SALE_ENGINEER', 'ACCOUNTANTS', 'SALE_SUPPORT']}>
                    <MainLayout>
                        <CreateWarehouse />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/inventory/:id"
            element={
                <ProtectedRoute allowedRoles={['DIRECTOR', 'WAREHOUSE_KEEPER', 'SALE_ENGINEER', 'ACCOUNTANTS', 'SALE_SUPPORT']}>
                    <MainLayout>
                        <ViewWarehouseDetail />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/inventory/adjustments"
            element={
                <ProtectedRoute allowedRoles={['WAREHOUSE_KEEPER']}>
                    <MainLayout>
                        <ViewInventoryAdjustmentList />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/inventory/adjustments/create"
            element={
                <ProtectedRoute allowedRoles={['WAREHOUSE_KEEPER']}>
                    <MainLayout>
                        <CreateInventoryAdjustment />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/inventory/adjustments/:id"
            element={
                <ProtectedRoute allowedRoles={['WAREHOUSE_KEEPER']}>
                    <MainLayout>
                        <ViewInventoryAdjustmentDetail />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/inventory/stocktakes/create"
            element={
                <ProtectedRoute allowedRoles={['WAREHOUSE_KEEPER']}>
                    <MainLayout>
                        <CreateStocktake />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/inventory/stocktakes/:id"
            element={
                <ProtectedRoute allowedRoles={['WAREHOUSE_KEEPER']}>
                    <MainLayout>
                        <ViewStocktakeDetail />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/inventory/stocktakes/report/:id"
            element={
                <ProtectedRoute allowedRoles={['WAREHOUSE_KEEPER', 'DIRECTOR', 'ACCOUNTANTS']}>
                    <MainLayout>
                        <StocktakeReport />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/inventory/stocktakes"
            element={
                <ProtectedRoute allowedRoles={['WAREHOUSE_KEEPER']}>
                    <MainLayout>
                        <ViewStocktakeList />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/reports"
            element={
                <ProtectedRoute allowedRoles={['WAREHOUSE_KEEPER', 'DIRECTOR', 'ACCOUNTANTS']}>
                    <MainLayout>
                        <Outlet />
                    </MainLayout>
                </ProtectedRoute>
            }
        >
            <Route path="stocktakes" element={<ViewStocktakeList />} />
        </Route>
        <Route
            path="/good-receipt-notes"
            element={
                <ProtectedRoute allowedRoles={['ACCOUNTANTS', 'WAREHOUSE_KEEPER', 'SALE_SUPPORT']}>
                    <MainLayout>
                        <ViewGoodReceiptNotes />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/good-receipt-notes/:id"
            element={
                <ProtectedRoute allowedRoles={['ACCOUNTANTS', 'WAREHOUSE_KEEPER', 'SALE_SUPPORT']}>
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
        <Route
            path="/good-receipt-notes/confirmation/:id"
            element={
                <ProtectedRoute allowedRoles={['ACCOUNTANTS', 'WAREHOUSE_KEEPER']}>
                    <MainLayout>
                        <ViewGoodReceiptNoteDetail />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/good-delivery-notes"
            element={
                <ProtectedRoute allowedRoles={['ACCOUNTANTS', 'WAREHOUSE_KEEPER', 'SALE_ENGINEER', 'SALE_SUPPORT']}>
                    <MainLayout>
                        <ViewReleaseRequestList />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/good-delivery-notes/create"
            element={
                <ProtectedRoute allowedRoles={['WAREHOUSE_KEEPER', 'SALE_ENGINEER']}>
                    <MainLayout>
                        <CreateReleaseRequest />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/receivers"
            element={
                <ProtectedRoute allowedRoles={['DIRECTOR', 'WAREHOUSE_KEEPER', 'SALE_ENGINEER', 'ACCOUNTANTS']}>
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
        <Route
            path="/purchase-orders"
            element={
                <ProtectedRoute allowedRoles={['SALE_SUPPORT', 'ACCOUNTANTS', 'WAREHOUSE_KEEPER']}>
                    <MainLayout>
                        <ViewPurchaseOrderList />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/purchase-orders/create"
            element={
                <ProtectedRoute allowedRoles={['SALE_SUPPORT']}>
                    <MainLayout>
                        <CreatePurchaseOrder />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/purchase-orders/:id"
            element={
                <ProtectedRoute allowedRoles={['SALE_SUPPORT', 'ACCOUNTANTS', 'WAREHOUSE_KEEPER']}>
                    <MainLayout>
                        <ViewPurchaseOrderDetail />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/purchase-returns"
            element={
                <ProtectedRoute allowedRoles={['ACCOUNTANTS']}>
                    <MainLayout>
                        <ViewPurchaseReturnList />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/purchase-returns/create"
            element={
                <ProtectedRoute allowedRoles={['ACCOUNTANTS']}>
                    <MainLayout>
                        <CreatePurchaseReturn />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
        <Route
            path="/item-prices"
            element={
                <ProtectedRoute allowedRoles={['DIRECTOR', 'ACCOUNTANTS']}>
                    <MainLayout>
                        <ViewItemPriceList />
                    </MainLayout>
                </ProtectedRoute>
            }
        />
    </Routes>
);

export default AppRoutes;