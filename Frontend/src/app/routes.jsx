import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';

// ── Layout ──────────────────────────────────────────────────────────────────────
import ProtectedRoute from '../components/ProtectedRoute';
import MainLayout from '../components/Layout/MainLayout';

// ── Auth ───────────────────────────────────────────────────────────────────────
import Login from '../shared/pages/Login';
import ForgotPassword from '../shared/pages/ForgotPassword';
import ResetPassword from '../shared/pages/ResetPassword';
import Profile from '../shared/pages/Profile';

// ── Admin ─────────────────────────────────────────────────────────────────────
import ViewUserAccountList from '../shared/pages/ViewUserAccountList';
import ViewDeactivatedUsersList from '../shared/pages/ViewDeactivatedUsersList';
import AdminNotifications from '../shared/pages/AdminNotifications';
import ViewAdminAuditLog from '../shared/pages/ViewAdminAuditLog';

// ── Home ───────────────────────────────────────────────────────────────────────
import Home from '../shared/pages/Home';

// ── Product / Warehouse ────────────────────────────────────────────────────────
import ViewItemList from '../shared/pages/ViewItemList';
import CreateItem from '../shared/pages/CreateItem';
import ViewItemDetail from '../shared/pages/ViewItemDetail';
import EditItem from '../shared/pages/EditItem';
import ViewCategoryList from '../shared/pages/ViewCategoryList';
import CreateCategory from '../shared/pages/CreateCategory';
import EditCategory from '../shared/pages/EditCategory';
import ViewPackagingSpecList from '../shared/pages/ViewPackagingSpecList';
import ViewSpecList from '../shared/pages/ViewSpecList';
import ViewBrandList from '../shared/pages/ViewBrandList';
import ViewUomList from '../shared/pages/ViewUomList';
import ViewWarehouseList from '../shared/pages/ViewWarehouseList';
import ViewWarehouseDetail from '../shared/pages/ViewWarehouseDetail';
import CreateWarehouse from '../shared/pages/CreateWarehouse';

// ── Inventory ──────────────────────────────────────────────────────────────────
import ViewStocktakeList from '../shared/pages/ViewStocktakeList';
import CreateStocktake from '../shared/pages/CreateStocktake';
import ViewStocktakeDetail from '../shared/pages/ViewStocktakeDetail';
import StocktakeReport from '../shared/pages/StocktakeReport';
import ViewInventoryAdjustmentList from '../shared/pages/ViewInventoryAdjustmentList';
import CreateInventoryAdjustment from '../shared/pages/CreateInventoryAdjustment';
import ViewInventoryAdjustmentDetail from '../shared/pages/ViewInventoryAdjustmentDetail';

// ── Purchase ───────────────────────────────────────────────────────────────────
import ViewPurchaseOrderList from '../shared/pages/ViewPurchaseOrderList';
import ViewPurchaseOrderDetail from '../shared/pages/ViewPurchaseOrderDetail';
import CreatePurchaseOrder from '../shared/pages/CreatePurchaseOrder';
import ViewPurchaseReturnList from '../shared/pages/ViewPurchaseReturnList';
import ViewPurchaseReturnDetail from '../shared/pages/ViewPurchaseReturnDetail';
import CreatePurchaseReturn from '../shared/pages/CreatePurchaseReturn';

// ── Release / Delivery ────────────────────────────────────────────────────────
import ViewReleaseRequestList from '../shared/pages/ViewReleaseRequestList';
import ViewReleaseRequestDetail from '../shared/pages/ViewReleaseRequestDetail';
import CreateReleaseRequest from '../shared/pages/CreateReleaseRequest';
import ViewGoodDeliveryNoteList from '../shared/pages/ViewGoodDeliveryNoteList';
import ViewGoodDeliveryNoteDetail from '../shared/pages/ViewGoodDeliveryNoteDetail';
import CreateGoodDeliveryNote from '../shared/pages/CreateGoodDeliveryNote';

// ── Delivery ──────────────────────────────────────────────────────────────────
import ViewDeliveryList from '../shared/pages/ViewDeliveryList';

// ── Receipt ───────────────────────────────────────────────────────────────────
import ViewGoodReceiptNotesList from '../shared/pages/ViewGoodReceiptNotesList';
import ViewGoodReceiptNoteDetail from '../shared/pages/ViewGoodReceiptNoteDetail';
import CreateGoodReceiptNote from '../shared/pages/CreateGoodReceiptNote';

// ── Others ─────────────────────────────────────────────────────────────────────
import ViewSupplierList from '../shared/pages/ViewSupplierList';
import ViewSupplierDetail from '../shared/pages/ViewSupplierDetail';
import CreateSupplier from '../shared/pages/CreateSupplier';
import ViewReceiver from '../shared/pages/ViewReceiverList';
import ViewReceiverDetail from '../shared/pages/ViewReceiverDetail';
import CreateReceiver from '../shared/pages/CreateReceiver';
import ViewItemPriceList from '../shared/pages/ViewItemPriceList';
import ViewNotifications from '../shared/pages/ViewNotifications';
import InventoryAlertSetup from '../shared/pages/mockup/InventoryAlertSetup';
import SalesRevenueTarget from '../shared/pages/mockup/SalesRevenueTarget';
import Viewsalesreportlist from '../shared/pages/mockup/Viewsalesreportlist';
import ViewSalesReportDetail from '../shared/pages/mockup/ViewSalesReportDetail';

const ROLES_WS = ['WAREHOUSE_KEEPER', 'SALE_ENGINEER', 'SALE_SUPPORT'];
const ROLES_WSA = ['WAREHOUSE_KEEPER', 'SALE_ENGINEER', 'SALE_SUPPORT', 'ACCOUNTANTS'];
const ROLES_ALL = ['DIRECTOR', 'WAREHOUSE_KEEPER', 'SALE_ENGINEER', 'SALE_SUPPORT', 'ACCOUNTANTS'];
const ROLES_WA = ['WAREHOUSE_KEEPER', 'ACCOUNTANTS'];
const ROLES_DA = ['DIRECTOR', 'ACCOUNTANTS'];
const ROLES_DW = ['DIRECTOR', 'WAREHOUSE_KEEPER'];
const ROLES_WDA = ['DIRECTOR', 'WAREHOUSE_KEEPER', 'ACCOUNTANTS'];
const ROLES_WDSA = ['DIRECTOR', 'WAREHOUSE_KEEPER', 'SALE_ENGINEER', 'ACCOUNTANTS'];
const ROLES_SA = ['SALE_ENGINEER', 'ACCOUNTANTS'];
const ROLES_SSA = ['SALE_SUPPORT', 'ACCOUNTANTS', 'WAREHOUSE_KEEPER'];
const ROLES_DIRECTOR = ['DIRECTOR'];
const ROLES_ADMIN = ['ADMIN'];
const ROLES_ACC = ['ACCOUNTANTS'];

const AppRoutes = () => (
    <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route path="/home" element={<ProtectedRoute allowedRoles={ROLES_DIRECTOR}><MainLayout><Home /></MainLayout></ProtectedRoute>} />
        <Route path="/admin/home" element={<ProtectedRoute allowedRoles={ROLES_DIRECTOR}><MainLayout><Home /></MainLayout></ProtectedRoute>} />
        <Route path="/sale-support/home" element={<ProtectedRoute allowedRoles={ROLES_DIRECTOR}><MainLayout><Home /></MainLayout></ProtectedRoute>} />
        <Route path="/sale-support/home/suppliers-view" element={<ProtectedRoute><MainLayout><ViewSupplierList /></MainLayout></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><MainLayout><Profile /></MainLayout></ProtectedRoute>} />
        <Route path="/admin/users/deactivated" element={<ProtectedRoute allowedRoles={ROLES_ADMIN}><MainLayout><ViewDeactivatedUsersList /></MainLayout></ProtectedRoute>} />
        <Route path="/admin/users" element={<ProtectedRoute allowedRoles={ROLES_ADMIN}><MainLayout><ViewUserAccountList /></MainLayout></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><MainLayout><ViewNotifications /></MainLayout></ProtectedRoute>} />
        <Route path="/admin/notifications" element={<ProtectedRoute allowedRoles={ROLES_ADMIN}><MainLayout><AdminNotifications /></MainLayout></ProtectedRoute>} />
        <Route path="/admin/audit-log" element={<ProtectedRoute allowedRoles={ROLES_ADMIN}><MainLayout><ViewAdminAuditLog /></MainLayout></ProtectedRoute>} />
        <Route path="/products" element={<ProtectedRoute allowedRoles={ROLES_WSA}><MainLayout><ViewItemList /></MainLayout></ProtectedRoute>} />
        <Route path="/items/create" element={<ProtectedRoute allowedRoles={ROLES_WA}><MainLayout><CreateItem /></MainLayout></ProtectedRoute>} />
        <Route path="/items/edit/:id" element={<ProtectedRoute allowedRoles={ROLES_WA}><MainLayout><EditItem /></MainLayout></ProtectedRoute>} />
        <Route path="/items/:id" element={<ProtectedRoute allowedRoles={ROLES_ALL}><MainLayout><ViewItemDetail /></MainLayout></ProtectedRoute>} />
        <Route path="/categories" element={<ProtectedRoute allowedRoles={ROLES_WSA}><MainLayout><ViewCategoryList /></MainLayout></ProtectedRoute>} />
        <Route path="/categories/create" element={<Navigate to="/categories" replace />} />
        <Route path="/categories/edit/:id" element={<ProtectedRoute allowedRoles={ROLES_WA}><MainLayout><EditCategory /></MainLayout></ProtectedRoute>} />
        <Route path="/packaging-spec" element={<ProtectedRoute allowedRoles={ROLES_WA}><MainLayout><ViewPackagingSpecList /></MainLayout></ProtectedRoute>} />
        <Route path="/specs" element={<ProtectedRoute allowedRoles={ROLES_WA}><MainLayout><ViewSpecList /></MainLayout></ProtectedRoute>} />
        <Route path="/item-masters" element={<Navigate to="/categories" replace />} />
        <Route path="/uom" element={<ProtectedRoute allowedRoles={ROLES_WA}><MainLayout><ViewUomList /></MainLayout></ProtectedRoute>} />
        <Route path="/uom/create" element={<Navigate to="/uom" replace />} />
        <Route path="/uom/edit/:id" element={<Navigate to="/uom" replace />} />
        <Route path="/brands" element={<ProtectedRoute allowedRoles={ROLES_WSA}><MainLayout><ViewBrandList /></MainLayout></ProtectedRoute>} />
        <Route path="/suppliers" element={<ProtectedRoute allowedRoles={ROLES_ALL}><MainLayout><ViewSupplierList /></MainLayout></ProtectedRoute>} />
        <Route path="/suppliers/create" element={<ProtectedRoute allowedRoles={ROLES_ALL}><MainLayout><CreateSupplier /></MainLayout></ProtectedRoute>} />
        <Route path="/suppliers/:id" element={<ProtectedRoute allowedRoles={ROLES_ALL}><MainLayout><ViewSupplierDetail /></MainLayout></ProtectedRoute>} />
        <Route path="/inventory" element={<ProtectedRoute allowedRoles={ROLES_ALL}><MainLayout><ViewWarehouseList /></MainLayout></ProtectedRoute>} />
        <Route path="/inventory/create" element={<ProtectedRoute allowedRoles={ROLES_ALL}><MainLayout><CreateWarehouse /></MainLayout></ProtectedRoute>} />
        <Route path="/inventory/:id" element={<ProtectedRoute allowedRoles={ROLES_ALL}><MainLayout><ViewWarehouseDetail /></MainLayout></ProtectedRoute>} />
        <Route path="/inventory/adjustments" element={<ProtectedRoute allowedRoles={ROLES_WDA}><MainLayout><ViewInventoryAdjustmentList /></MainLayout></ProtectedRoute>} />
        <Route path="/inventory/adjustments/create" element={<ProtectedRoute allowedRoles={ROLES_WS}><MainLayout><CreateInventoryAdjustment /></MainLayout></ProtectedRoute>} />
        <Route path="/inventory/adjustments/:id" element={<ProtectedRoute allowedRoles={ROLES_WDA}><MainLayout><ViewInventoryAdjustmentDetail /></MainLayout></ProtectedRoute>} />
        <Route path="/inventory/stocktakes/create" element={<ProtectedRoute allowedRoles={ROLES_DA}><MainLayout><CreateStocktake /></MainLayout></ProtectedRoute>} />
        <Route path="/inventory/stocktakes/:id" element={<ProtectedRoute allowedRoles={ROLES_WDA}><MainLayout><ViewStocktakeDetail /></MainLayout></ProtectedRoute>} />
        <Route path="/inventory/stocktakes/report/:id" element={<ProtectedRoute allowedRoles={ROLES_WDA}><MainLayout><StocktakeReport /></MainLayout></ProtectedRoute>} />
        <Route path="/inventory/stocktakes" element={<ProtectedRoute allowedRoles={ROLES_WDA}><MainLayout><ViewStocktakeList /></MainLayout></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute allowedRoles={ROLES_WDA}><MainLayout><Outlet /></MainLayout></ProtectedRoute>}>
            <Route path="stocktakes" element={<ViewStocktakeList />} />
        </Route>
        <Route path="/good-receipt-notes" element={<ProtectedRoute allowedRoles={ROLES_SSA}><MainLayout><ViewGoodReceiptNotesList /></MainLayout></ProtectedRoute>} />
        <Route path="/good-receipt-notes/:id" element={<ProtectedRoute allowedRoles={ROLES_SSA}><MainLayout><ViewGoodReceiptNoteDetail /></MainLayout></ProtectedRoute>} />
        <Route path="/good-receipt-notes/create" element={<ProtectedRoute allowedRoles={ROLES_WA}><MainLayout><CreateGoodReceiptNote /></MainLayout></ProtectedRoute>} />
        <Route path="/good-receipt-notes/confirmation/:id" element={<ProtectedRoute allowedRoles={ROLES_WA}><MainLayout><ViewGoodReceiptNoteDetail /></MainLayout></ProtectedRoute>} />
        <Route path="/good-delivery-notes" element={<ProtectedRoute allowedRoles={ROLES_ALL}><MainLayout><ViewGoodDeliveryNoteList /></MainLayout></ProtectedRoute>} />
        <Route path="/good-delivery-notes/create" element={<ProtectedRoute allowedRoles={ROLES_DW}><MainLayout><CreateGoodDeliveryNote /></MainLayout></ProtectedRoute>} />
        <Route path="/release-request" element={<ProtectedRoute allowedRoles={ROLES_ALL}><MainLayout><ViewReleaseRequestList /></MainLayout></ProtectedRoute>} />
        <Route path="/release-request/create" element={<ProtectedRoute allowedRoles={ROLES_WSA}><MainLayout><CreateReleaseRequest /></MainLayout></ProtectedRoute>} />
        <Route path="/release-request/:id" element={<ProtectedRoute allowedRoles={ROLES_ALL}><MainLayout><ViewReleaseRequestDetail /></MainLayout></ProtectedRoute>} />
        <Route path="/goods-delivery-notes" element={<Navigate to="/good-delivery-notes" replace />} />
        <Route path="/goods-delivery-notes/create" element={<Navigate to="/good-delivery-notes/create" replace />} />
        <Route path="/goods-delivery-notes/detail/:id" element={<ProtectedRoute allowedRoles={ROLES_WSA}><MainLayout><ViewGoodDeliveryNoteDetail /></MainLayout></ProtectedRoute>} />
        <Route path="/deliveries" element={<ProtectedRoute allowedRoles={ROLES_ALL}><MainLayout><ViewDeliveryList /></MainLayout></ProtectedRoute>} />
        <Route path="/deliveries/create" element={<ProtectedRoute allowedRoles={ROLES_WSA}><MainLayout><ViewDeliveryList /></MainLayout></ProtectedRoute>} />

        <Route path="/receivers" element={<ProtectedRoute allowedRoles={ROLES_WDSA}><MainLayout><ViewReceiver /></MainLayout></ProtectedRoute>} />
        <Route path="/receivers/:id" element={<ProtectedRoute allowedRoles={ROLES_WDSA}><MainLayout><ViewReceiverDetail /></MainLayout></ProtectedRoute>} />
        <Route path="/receivers/create" element={<ProtectedRoute allowedRoles={ROLES_SA}><MainLayout><CreateReceiver /></MainLayout></ProtectedRoute>} />
        <Route path="/purchase-orders" element={<ProtectedRoute allowedRoles={ROLES_SSA}><MainLayout><ViewPurchaseOrderList /></MainLayout></ProtectedRoute>} />
        <Route path="/purchase-orders/create" element={<ProtectedRoute allowedRoles={ROLES_SSA}><MainLayout><CreatePurchaseOrder /></MainLayout></ProtectedRoute>} />
        <Route path="/purchase-orders/:id" element={<ProtectedRoute allowedRoles={ROLES_SSA}><MainLayout><ViewPurchaseOrderDetail /></MainLayout></ProtectedRoute>} />
        <Route path="/purchase-returns" element={<ProtectedRoute allowedRoles={ROLES_ACC}><MainLayout><ViewPurchaseReturnList /></MainLayout></ProtectedRoute>} />
        <Route path="/purchase-returns/create" element={<ProtectedRoute allowedRoles={ROLES_ACC}><MainLayout><CreatePurchaseReturn /></MainLayout></ProtectedRoute>} />
        <Route path="/purchase-returns/:id" element={<ProtectedRoute allowedRoles={ROLES_ACC}><MainLayout><ViewPurchaseReturnDetail /></MainLayout></ProtectedRoute>} />
        <Route path="/item-prices" element={<ProtectedRoute allowedRoles={ROLES_DA}><MainLayout><ViewItemPriceList /></MainLayout></ProtectedRoute>} />

        {/* ── Mockup: Inventory Alert Setup ── */}
        <Route path="/mockup/inventory-alert" element={<ProtectedRoute allowedRoles={ROLES_WDA}><MainLayout><InventoryAlertSetup /></MainLayout></ProtectedRoute>} />

        {/* ── Mockup: Sales Revenue Target (Finance Alert) ── */}
        <Route path="/mockup/sales-target" element={<ProtectedRoute allowedRoles={ROLES_WDA}><MainLayout><SalesRevenueTarget /></MainLayout></ProtectedRoute>} />

        {/* ── Mockup: Báo cáo doanh số ── */}
        <Route path="/reports/sales" element={<ProtectedRoute allowedRoles={ROLES_WDA}><MainLayout><Viewsalesreportlist /></MainLayout></ProtectedRoute>} />
        <Route path="/reports/sales/detail/year/:year" element={<ProtectedRoute allowedRoles={ROLES_WDA}><MainLayout><ViewSalesReportDetail /></MainLayout></ProtectedRoute>} />
        <Route path="/reports/sales/detail/quarter/:quarter/:year" element={<ProtectedRoute allowedRoles={ROLES_WDA}><MainLayout><ViewSalesReportDetail /></MainLayout></ProtectedRoute>} />
        <Route path="/reports/sales/detail/month/:month/:year" element={<ProtectedRoute allowedRoles={ROLES_WDA}><MainLayout><ViewSalesReportDetail /></MainLayout></ProtectedRoute>} />
    </Routes>
);

export default AppRoutes;