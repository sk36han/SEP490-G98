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
import ViewStorageLocationList from '../shared/pages/ViewStorageLocationList';

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
import EditReleaseRequest from '../shared/pages/EditReleaseRequest';
import ViewGoodDeliveryNoteList from '../shared/pages/ViewGoodDeliveryNoteList';
import ViewGoodDeliveryNoteDetail from '../shared/pages/ViewGoodDeliveryNoteDetail';
import CreateGoodDeliveryNote from '../shared/pages/CreateGoodDeliveryNote';

// ── Delivery ──────────────────────────────────────────────────────────────────
import ViewDeliveryList from '../shared/pages/ViewDeliveryList';
import CreateDelivery from '../shared/pages/CreateDelivery';

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
import ViewNotificationsLive from '../shared/pages/ViewNotificationsLive';
import InventoryAlertSetup from '../shared/pages/mockup/InventoryAlertSetup';
import SalesRevenueTarget from '../shared/pages/mockup/SalesRevenueTarget';
import Viewsalesreportlist from '../shared/pages/mockup/Viewsalesreportlist';
import ViewSalesReportDetail from '../shared/pages/mockup/ViewSalesReportDetail';
import { ROLE_GROUPS } from '../shared/permissions/roleUtils';

const ROLES_DIRECTOR = ROLE_GROUPS.REPORT_VIEW;
const ROLES_ADMIN = ROLE_GROUPS.ADMIN_ONLY;

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
        <Route path="/notifications" element={<ProtectedRoute><MainLayout><ViewNotificationsLive /></MainLayout></ProtectedRoute>} />
        <Route path="/admin/audit-log" element={<ProtectedRoute allowedRoles={ROLES_ADMIN}><MainLayout><ViewAdminAuditLog /></MainLayout></ProtectedRoute>} />
        <Route path="/products" element={<ProtectedRoute allowedRoles={ROLE_GROUPS.ITEM_VIEW}><MainLayout><ViewItemList /></MainLayout></ProtectedRoute>} />
        <Route path="/items/create" element={<ProtectedRoute allowedRoles={ROLE_GROUPS.ITEM_MANAGE}><MainLayout><CreateItem /></MainLayout></ProtectedRoute>} />
        <Route path="/items/edit/:id" element={<ProtectedRoute allowedRoles={ROLE_GROUPS.ITEM_MANAGE}><MainLayout><EditItem /></MainLayout></ProtectedRoute>} />
        <Route path="/items/:id" element={<ProtectedRoute allowedRoles={ROLE_GROUPS.ITEM_VIEW}><MainLayout><ViewItemDetail /></MainLayout></ProtectedRoute>} />
        <Route path="/categories" element={<ProtectedRoute allowedRoles={ROLE_GROUPS.ITEM_VIEW}><MainLayout><ViewCategoryList /></MainLayout></ProtectedRoute>} />
        <Route path="/categories/create" element={<Navigate to="/categories" replace />} />
        <Route path="/categories/edit/:id" element={<ProtectedRoute allowedRoles={ROLE_GROUPS.ITEM_MANAGE}><MainLayout><EditCategory /></MainLayout></ProtectedRoute>} />
        <Route path="/packaging-spec" element={<ProtectedRoute allowedRoles={ROLE_GROUPS.ITEM_MANAGE}><MainLayout><ViewPackagingSpecList /></MainLayout></ProtectedRoute>} />
        <Route path="/specs" element={<ProtectedRoute allowedRoles={ROLE_GROUPS.ITEM_MANAGE}><MainLayout><ViewSpecList /></MainLayout></ProtectedRoute>} />
        <Route path="/item-masters" element={<Navigate to="/categories" replace />} />
        <Route path="/uom" element={<ProtectedRoute allowedRoles={ROLE_GROUPS.ITEM_MANAGE}><MainLayout><ViewUomList /></MainLayout></ProtectedRoute>} />
        <Route path="/uom/create" element={<Navigate to="/uom" replace />} />
        <Route path="/uom/edit/:id" element={<Navigate to="/uom" replace />} />
        <Route path="/brands" element={<ProtectedRoute allowedRoles={ROLE_GROUPS.ITEM_VIEW}><MainLayout><ViewBrandList /></MainLayout></ProtectedRoute>} />
        <Route path="/suppliers" element={<ProtectedRoute allowedRoles={ROLE_GROUPS.SUPPLIER_VIEW}><MainLayout><ViewSupplierList /></MainLayout></ProtectedRoute>} />
        <Route path="/suppliers/create" element={<ProtectedRoute allowedRoles={ROLE_GROUPS.SUPPLIER_MANAGE}><MainLayout><CreateSupplier /></MainLayout></ProtectedRoute>} />
        <Route path="/suppliers/:id" element={<ProtectedRoute allowedRoles={ROLE_GROUPS.SUPPLIER_VIEW}><MainLayout><ViewSupplierDetail /></MainLayout></ProtectedRoute>} />
        <Route path="/inventory" element={<ProtectedRoute allowedRoles={ROLE_GROUPS.WAREHOUSE_VIEW}><MainLayout><ViewWarehouseList /></MainLayout></ProtectedRoute>} />
        <Route path="/inventory/create" element={<ProtectedRoute allowedRoles={ROLE_GROUPS.WAREHOUSE_MANAGE}><MainLayout><CreateWarehouse /></MainLayout></ProtectedRoute>} />
        <Route path="/inventory/:id" element={<ProtectedRoute allowedRoles={ROLE_GROUPS.WAREHOUSE_VIEW}><MainLayout><ViewWarehouseDetail /></MainLayout></ProtectedRoute>} />
        <Route path="/inventory/storage-locations" element={<ProtectedRoute allowedRoles={ROLE_GROUPS.WAREHOUSE_VIEW}><MainLayout><ViewStorageLocationList /></MainLayout></ProtectedRoute>} />
        <Route path="/inventory/adjustments" element={<ProtectedRoute allowedRoles={ROLE_GROUPS.STOCKTAKE_VIEW}><MainLayout><ViewInventoryAdjustmentList /></MainLayout></ProtectedRoute>} />
        <Route path="/inventory/adjustments/create" element={<ProtectedRoute allowedRoles={ROLE_GROUPS.INVENTORY_ADJUSTMENT_CREATE}><MainLayout><CreateInventoryAdjustment /></MainLayout></ProtectedRoute>} />
        <Route path="/inventory/adjustments/:id" element={<ProtectedRoute allowedRoles={ROLE_GROUPS.STOCKTAKE_VIEW}><MainLayout><ViewInventoryAdjustmentDetail /></MainLayout></ProtectedRoute>} />
        <Route path="/inventory/stocktakes" element={<ProtectedRoute allowedRoles={ROLE_GROUPS.STOCKTAKE_VIEW}><MainLayout><ViewStocktakeList /></MainLayout></ProtectedRoute>} />
        <Route path="/inventory/stocktakes/create" element={<ProtectedRoute allowedRoles={ROLE_GROUPS.STOCKTAKE_CREATE}><MainLayout><CreateStocktake /></MainLayout></ProtectedRoute>} />
        <Route path="/inventory/stocktakes/report/:id" element={<ProtectedRoute allowedRoles={ROLE_GROUPS.STOCKTAKE_VIEW}><MainLayout><StocktakeReport /></MainLayout></ProtectedRoute>} />
        <Route path="/inventory/stocktakes/:id" element={<ProtectedRoute allowedRoles={ROLE_GROUPS.STOCKTAKE_VIEW}><MainLayout><ViewStocktakeDetail /></MainLayout></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute allowedRoles={ROLE_GROUPS.REPORT_VIEW}><MainLayout><Outlet /></MainLayout></ProtectedRoute>}>
            <Route path="stocktakes" element={<ViewStocktakeList />} />
        </Route>
        <Route path="/good-receipt-notes" element={<ProtectedRoute allowedRoles={ROLE_GROUPS.GRN_VIEW}><MainLayout><ViewGoodReceiptNotesList /></MainLayout></ProtectedRoute>} />
        <Route path="/good-receipt-notes/:id" element={<ProtectedRoute allowedRoles={ROLE_GROUPS.GRN_VIEW}><MainLayout><ViewGoodReceiptNoteDetail /></MainLayout></ProtectedRoute>} />
        <Route path="/good-receipt-notes/create" element={<ProtectedRoute allowedRoles={ROLE_GROUPS.GRN_MANAGE}><MainLayout><CreateGoodReceiptNote /></MainLayout></ProtectedRoute>} />
        <Route path="/good-receipt-notes/confirmation/:id" element={<ProtectedRoute allowedRoles={ROLE_GROUPS.GRN_MANAGE}><MainLayout><ViewGoodReceiptNoteDetail /></MainLayout></ProtectedRoute>} />
        <Route path="/good-delivery-notes" element={<ProtectedRoute allowedRoles={ROLE_GROUPS.GDN_VIEW}><MainLayout><ViewGoodDeliveryNoteList /></MainLayout></ProtectedRoute>} />
        <Route path="/good-delivery-notes/create" element={<ProtectedRoute allowedRoles={ROLE_GROUPS.GDN_MANAGE}><MainLayout><CreateGoodDeliveryNote /></MainLayout></ProtectedRoute>} />
        <Route path="/release-request" element={<ProtectedRoute allowedRoles={ROLE_GROUPS.RELEASE_REQUEST_VIEW}><MainLayout><ViewReleaseRequestList /></MainLayout></ProtectedRoute>} />
        <Route path="/release-request/create" element={<ProtectedRoute allowedRoles={ROLE_GROUPS.RELEASE_REQUEST_MANAGE}><MainLayout><CreateReleaseRequest /></MainLayout></ProtectedRoute>} />
        <Route path="/release-request/:id/edit" element={<ProtectedRoute allowedRoles={ROLE_GROUPS.RELEASE_REQUEST_MANAGE}><MainLayout><EditReleaseRequest /></MainLayout></ProtectedRoute>} />
        <Route path="/release-request/:id" element={<ProtectedRoute allowedRoles={ROLE_GROUPS.RELEASE_REQUEST_VIEW}><MainLayout><ViewReleaseRequestDetail /></MainLayout></ProtectedRoute>} />
        <Route path="/good-delivery-notes/detail/:id" element={<ProtectedRoute allowedRoles={ROLE_GROUPS.GDN_VIEW}><MainLayout><ViewGoodDeliveryNoteDetail /></MainLayout></ProtectedRoute>} />
        <Route path="/goods-delivery-notes" element={<Navigate to="/good-delivery-notes" replace />} />
        <Route path="/goods-delivery-notes/create" element={<Navigate to="/good-delivery-notes/create" replace />} />
        <Route path="/goods-delivery-notes/detail/:id" element={<ProtectedRoute allowedRoles={ROLE_GROUPS.GDN_VIEW}><MainLayout><ViewGoodDeliveryNoteDetail /></MainLayout></ProtectedRoute>} />
        <Route path="/deliveries" element={<ProtectedRoute allowedRoles={ROLE_GROUPS.DELIVERY_VIEW}><MainLayout><ViewDeliveryList /></MainLayout></ProtectedRoute>} />
        <Route path="/deliveries/create" element={<ProtectedRoute allowedRoles={ROLE_GROUPS.DELIVERY_MANAGE}><MainLayout><CreateDelivery /></MainLayout></ProtectedRoute>} />

        <Route path="/receivers" element={<ProtectedRoute allowedRoles={ROLE_GROUPS.RECEIVER_VIEW}><MainLayout><ViewReceiver /></MainLayout></ProtectedRoute>} />
        <Route path="/receivers/:id" element={<ProtectedRoute allowedRoles={ROLE_GROUPS.RECEIVER_VIEW}><MainLayout><ViewReceiverDetail /></MainLayout></ProtectedRoute>} />
        <Route path="/receivers/create" element={<ProtectedRoute allowedRoles={ROLE_GROUPS.RECEIVER_MANAGE}><MainLayout><CreateReceiver /></MainLayout></ProtectedRoute>} />
        <Route path="/purchase-orders" element={<ProtectedRoute allowedRoles={ROLE_GROUPS.PURCHASE_ORDER_VIEW}><MainLayout><ViewPurchaseOrderList /></MainLayout></ProtectedRoute>} />
        <Route path="/purchase-orders/create" element={<ProtectedRoute allowedRoles={ROLE_GROUPS.PURCHASE_ORDER_MANAGE}><MainLayout><CreatePurchaseOrder /></MainLayout></ProtectedRoute>} />
        <Route path="/purchase-orders/:id" element={<ProtectedRoute allowedRoles={ROLE_GROUPS.PURCHASE_ORDER_VIEW}><MainLayout><ViewPurchaseOrderDetail /></MainLayout></ProtectedRoute>} />
        <Route path="/purchase-returns" element={<ProtectedRoute allowedRoles={ROLE_GROUPS.PRN_VIEW}><MainLayout><ViewPurchaseReturnList /></MainLayout></ProtectedRoute>} />
        <Route path="/purchase-returns/create" element={<ProtectedRoute allowedRoles={ROLE_GROUPS.PRN_MANAGE}><MainLayout><CreatePurchaseReturn /></MainLayout></ProtectedRoute>} />
        <Route path="/purchase-returns/:id" element={<ProtectedRoute allowedRoles={ROLE_GROUPS.PRN_VIEW}><MainLayout><ViewPurchaseReturnDetail /></MainLayout></ProtectedRoute>} />

        {/* ── Mockup: Inventory Alert Setup ── */}
        <Route path="/mockup/inventory-alert" element={<ProtectedRoute allowedRoles={ROLE_GROUPS.STOCKTAKE_VIEW}><MainLayout><InventoryAlertSetup /></MainLayout></ProtectedRoute>} />

        {/* ── Mockup: Sales Revenue Target (Finance Alert) ── */}
        <Route path="/mockup/sales-target" element={<ProtectedRoute allowedRoles={ROLE_GROUPS.STOCKTAKE_VIEW}><MainLayout><SalesRevenueTarget /></MainLayout></ProtectedRoute>} />

        {/* ── Mockup: Báo cáo doanh số ── */}
        <Route path="/reports/sales" element={<ProtectedRoute allowedRoles={ROLES_DIRECTOR}><MainLayout><Viewsalesreportlist /></MainLayout></ProtectedRoute>} />
        <Route path="/reports/sales/detail/year/:year" element={<ProtectedRoute allowedRoles={ROLES_DIRECTOR}><MainLayout><ViewSalesReportDetail /></MainLayout></ProtectedRoute>} />
        <Route path="/reports/sales/detail/quarter/:quarter/:year" element={<ProtectedRoute allowedRoles={ROLES_DIRECTOR}><MainLayout><ViewSalesReportDetail /></MainLayout></ProtectedRoute>} />
        <Route path="/reports/sales/detail/month/:month/:year" element={<ProtectedRoute allowedRoles={ROLES_DIRECTOR}><MainLayout><ViewSalesReportDetail /></MainLayout></ProtectedRoute>} />
    </Routes>
);

export default AppRoutes;