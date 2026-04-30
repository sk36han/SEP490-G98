/**
 * ViewPurchaseOrderDetail - Chi tiết yêu cầu nhập hàng (read-only)
 * Kế toán: duyệt / từ chối đơn, xác nhận thanh toán
 * Thủ Kho: tạo phiếu nhập kho
 * Sale Support: tạo đơn
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Chip,
} from '@mui/material';
import { ConfirmDialog } from '@ui/dialogs';
import { StatusBadge } from '@ui/badges';
import {
    ArrowLeft,
    CheckCircle,
    Clock,
    XCircle,
    Warehouse,
    Building2,
    Calendar,
    MapPin,
    User,
    Loader,
    Check,
    Paperclip,
    FileText,
        Pencil,
} from 'lucide-react';
import authService from '../lib/authService';
import { getPermissionRole, getRawRoleFromUser, isWarehouseKeeper } from '../permissions/roleUtils';
import { getPurchaseOrderDetail, approvePurchaseOrder, rejectPurchaseOrder } from '../lib/purchaseOrderService';
import { useToastContext } from '../../app/context/ToastContext';
import { hasPendingGRNForPO } from '../lib/goodReceiptNoteService';
import '../styles/CreateSupplier.css';
import '../styles/ViewPurchaseOrderDetail.css';

const formatCurrency = (value) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);

const LIFECYCLE_STATUS_MAP = {
    PendingRcv: { label: 'Chờ nhận hàng', color: '#f59e0b', bgColor: '#fef3c7' },
    PartiallyRcv: { label: 'Nhận một phần', color: '#3b82f6', bgColor: '#dbeafe' },
    Received: { label: 'Đã nhận đủ', color: '#10b981', bgColor: '#d1fae5' },
    Closed: { label: 'Đã đóng', color: '#6b7280', bgColor: '#f3f4f6' },
    Cancelled: { label: 'Đã hủy', color: '#ef4444', bgColor: '#fee2e2' },
};

// UTC-safe: parse ISO string as UTC to avoid browser timezone shift
const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr + (dateStr.endsWith('Z') ? '' : 'Z'));
    if (Number.isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
};

const toAbsoluteFileUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const apiBase = (import.meta?.env?.VITE_API_BASE_URL || 'http://localhost:5141/api').replace(/\/api\/?$/, '');
    return `${apiBase}${url.startsWith('/') ? '' : '/'}${url}`;
};

const mapOrderDetail = (data) => ({
    purchaseOrderId:
        data.purchaseOrderId ??
        data.PurchaseOrderId ??
        data.id ??
        null,
    orderCode: data.poCode ?? data.OrderCode ?? '',
    supplierId: data.supplierId ?? data.SupplierId ?? null,
    supplierName: data.supplierName ?? data.SupplierName ?? '',
    warehouseId: data.warehouseId ?? data.WarehouseId ?? null,
    warehouseName: data.warehouseName ?? data.WarehouseName ?? '',
    creatorId: data.requestedBy ?? data.RequestedBy ?? data.createdBy ?? data.CreatedBy ?? null,
    creatorName: data.requestedByName || data.RequestedByName || '',
    responsibleUserId: data.responsibleUserId ?? data.ResponsibleUserId ?? null,
    responsiblePersonName: data.responsibleUserName || data.ResponsibleUserName || '',
    expectedDeliveryDate: data.expectedDeliveryDate ? formatDate(data.expectedDeliveryDate) : '',
    justification: data.justification || '',
    discountType: data.discountType ?? 'percent',
    discount: data.discount ?? 0,
    approvalStatus: (data.status ?? data.Status ?? 'DRAFT').toUpperCase(),
    lifecycleStatus: data.lifecycleStatus ?? data.LifecycleStatus ?? null,
    currentStageNo: data.currentStageNo ?? data.CurrentStageNo ?? 1,
    requestedDate: data.requestedDate ? formatDate(data.requestedDate) : '',
    createdAt: data.createdAt ? formatDate(data.createdAt) : '',
    submittedAt: data.submittedAt ? formatDate(data.submittedAt) : '',
    updatedAt: data.updatedAt ? formatDate(data.updatedAt) : '',
    totalAmount: data.totalAmount ?? data.TotalAmount ?? null,
    discountAmount: data.discountAmount ?? data.DiscountAmount ?? null,
    netAmount: data.netAmount ?? data.NetAmount ?? null,
    totalOrderedQty: data.totalOrderedQty ?? data.TotalOrderedQty ?? 0,
    quotationFileUrl: toAbsoluteFileUrl(data.quotationFileUrl ?? data.QuotationFileUrl ?? ''),
    contractAppendixFileUrl: toAbsoluteFileUrl(data.contractAppendixFileUrl ?? data.ContractAppendixFileUrl ?? ''),
    lines: (data.lines || []).map((line, index) => ({
        id: line.purchaseOrderLineId || line.id || index + 1,
        itemId: line.itemId ?? line.ItemId ?? null,
        itemName: line.itemName || line.ItemName || '',
        itemCode: line.itemCode || line.ItemCode || '',
        uomId: line.uomId ?? line.UomId ?? null,
        uom: line.uomName || line.UomName || '',
        orderedQty: line.orderedQty ?? line.OrderedQty ?? 0,
        receivedQty: line.receivedQty ?? line.ReceivedQty ?? 0,
        unitPrice: line.unitPrice ?? line.UnitPrice ?? 0,
        lineTotal: line.lineTotal ?? line.LineTotal ?? 0,
        totalPrice:
            line.lineTotal ??
            line.LineTotal ??
            line.totalPrice ??
            line.TotalPrice ??
            ((line.orderedQty ?? line.OrderedQty ?? 0) * (line.unitPrice ?? line.UnitPrice ?? 0)),
        currency: line.currency ?? line.Currency ?? 'VND',
        lineStatus: line.lineStatus ?? line.LineStatus ?? 'Open',
        note: line.note || line.Note || '',
        requiresCo: Boolean(line.requiresCo ?? line.RequiresCo ?? false),
        requiresCq: Boolean(line.requiresCq ?? line.RequiresCq ?? false),
    })),
});

const styles = {
    heroMetrics: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 14,
        marginTop: 20,
    },
    metricCard: {
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: 16,
        padding: '16px 18px',
        boxShadow: '0 6px 18px rgba(15, 23, 42, 0.04)',
    },
    metricLabel: {
        fontSize: 12,
        fontWeight: 700,
        color: '#6b7280',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        marginBottom: 8,
    },
    metricValue: {
        fontSize: 18,
        fontWeight: 700,
        color: '#111827',
        lineHeight: 1.35,
        wordBreak: 'break-word',
    },
    metricSubValue: {
        marginTop: 4,
        fontSize: 12,
        color: '#9ca3af',
    },
    contentGrid: {
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.6fr) minmax(320px, 0.95fr)',
        gap: 24,
        alignItems: 'start',
    },
    leftStack: {
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
        minWidth: 0,
    },
    sectionCard: {
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: 20,
        boxShadow: '0 10px 28px rgba(15, 23, 42, 0.05)',
        overflow: 'hidden',
    },
    sectionHeader: {
        padding: '18px 20px',
        borderBottom: '1px solid #f1f5f9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        flexWrap: 'wrap',
    },
    sectionTitle: {
        margin: 0,
        fontSize: 18,
        fontWeight: 700,
        color: '#111827',
    },
    sectionBody: {
        padding: 20,
    },
    emptyState: {
        padding: '48px 24px',
        textAlign: 'center',
        color: '#9ca3af',
    },
    tableWrap: {
        overflowX: 'auto',
        overflowY: 'visible',
    },
    table: {
        width: '100%',
        borderCollapse: 'separate',
        borderSpacing: 0,
        tableLayout: 'fixed',
    },
    th: {
        position: 'sticky',
        top: 0,
        zIndex: 1,
        background: '#f8fafc',
        color: '#475569',
        fontSize: 12,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.03em',
        padding: '14px 12px',
        borderBottom: '1px solid #e5e7eb',
        whiteSpace: 'nowrap',
    },
    td: {
        padding: '12px 10px',
        borderBottom: '1px solid #f1f5f9',
        fontSize: 13,
        color: '#111827',
        verticalAlign: 'middle',
        backgroundColor: '#ffffff',
    },
    infoGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: 14,
    },
    fieldWrap: {
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
    },
    fieldLabel: {
        fontSize: 13,
        fontWeight: 700,
        color: '#6b7280',
    },
    fieldBox: {
        minHeight: 46,
        borderRadius: 14,
        border: '1px solid #e5e7eb',
        background: '#f8fafc',
        padding: '12px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        color: '#111827',
        fontSize: 14,
        lineHeight: 1.5,
    },
    fieldBoxMultiline: {
        minHeight: 88,
        alignItems: 'flex-start',
    },
    sideStack: {
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
    },
    summaryGrid: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 14,
    },
    summaryBox: {
        border: '1px solid #e5e7eb',
        borderRadius: 16,
        padding: 16,
        background: '#f8fafc',
    },
    summaryBoxLabel: {
        fontSize: 12,
        fontWeight: 700,
        color: '#6b7280',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        marginBottom: 8,
    },
    summaryBoxValue: {
        fontSize: 18,
        fontWeight: 800,
        color: '#111827',
        lineHeight: 1.3,
    },
    amountRows: {
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        marginTop: 16,
        paddingTop: 16,
        borderTop: '1px dashed #e5e7eb',
    },
    amountRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 16,
        fontSize: 14,
        color: '#374151',
    },
    totalHighlight: {
        marginTop: 18,
        borderRadius: 18,
        padding: '18px 20px',
        background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
        border: '1px solid #bfdbfe',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
    },
    totalHighlightLabel: {
        fontSize: 16,
        fontWeight: 700,
        color: '#1d4ed8',
    },
    totalHighlightValue: {
        fontSize: 26,
        fontWeight: 800,
        color: '#1d4ed8',
        fontVariantNumeric: 'tabular-nums',
    },
};

const ViewPurchaseOrderDetail = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { showToast } = useToastContext();

    const userInfo = authService.getUser();
    const permissionRole = getPermissionRole(getRawRoleFromUser(userInfo));
    /** TK (Thủ kho): không hiển thị NCC, tệp đính kèm (và metric NCC ở hero). */
    const hideSensitiveForWarehouseKeeper = isWarehouseKeeper(permissionRole);

    const [loading, setLoading] = useState(true);
    const [accessDenied, setAccessDenied] = useState(false);
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [confirmDialogType, setConfirmDialogType] = useState(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [hasPendingGRNState, setHasPendingGRNState] = useState({
        purchaseOrderId: null,
        hasPending: false,
        checking: false,
    });

    const [orderData, setOrderData] = useState({
        purchaseOrderId: null,
        orderCode: '',
        supplierId: null,
        supplierName: '',
        warehouseId: null,
        warehouseName: '',
        creatorId: null,
        creatorName: '',
        responsibleUserId: null,
        responsiblePersonName: '',
        expectedDeliveryDate: '',
        justification: '',
        discountType: 'percent',
        discount: 0,
        approvalStatus: '',
        lifecycleStatus: null,
        currentStageNo: 1,
        requestedDate: '',
        createdAt: '',
        submittedAt: '',
        updatedAt: '',
        totalAmount: null,
        discountAmount: null,
        netAmount: null,
        totalOrderedQty: 0,
        quotationFileUrl: '',
        contractAppendixFileUrl: '',
        lines: [],
    });

    const loadOrderDetail = useCallback(
        async ({ showLoading = true } = {}) => {
            if (!id) {
                setLoading(false);
                return null;
            }

            if (showLoading) {
                setLoading(true);
            }

            try {
                const data = await getPurchaseOrderDetail(id);
                if (!data) return null;

                const mapped = mapOrderDetail(data);

                // Dùng authService.getCurrentUserId() thay vì tự đọc userInfo
                // vì userInfo trong localStorage có thể thiếu trường userId
                const currentUserId = authService.getCurrentUserId();
                const isDraft = (mapped.approvalStatus || '').toUpperCase() === 'DRAFT';
                const isCreator = mapped.creatorId != null && String(mapped.creatorId) === String(currentUserId);

                // Nếu là DRAFT: chỉ chặn khi CHẮC CHẮN không phải người tạo
                // creatorId null (backend chưa trả) → cho phép xem (tránh chặn nhầm creator)
                if (isDraft && mapped.creatorId != null && !isCreator) {
                    setAccessDenied(true);
                    return mapped;
                }

                setOrderData(mapped);
                return mapped;
            } catch (error) {
                console.error('Lỗi khi tải chi tiết yêu cầu nhập hàng:', error);
                showToast('Không thể tải thông tin yêu cầu nhập hàng', 'error');
                return null;
            } finally {
                if (showLoading) {
                    setLoading(false);
                }
            }
        },
        [id, showToast]
    );

    useEffect(() => {
        loadOrderDetail();
    }, [loadOrderDetail]);

    useEffect(() => {
        let cancelled = false;

        const currentPoId = orderData.purchaseOrderId;
        const isApproved = orderData.approvalStatus === 'APPROVED';

        if (!currentPoId || !isApproved) {
            setHasPendingGRNState({
                purchaseOrderId: currentPoId ?? null,
                hasPending: false,
                checking: false,
            });
            return () => {
                cancelled = true;
            };
        }

        setHasPendingGRNState({
            purchaseOrderId: currentPoId,
            hasPending: false,
            checking: true,
        });

        const checkPendingGRN = async () => {
            try {
                const result = await hasPendingGRNForPO(currentPoId);
                if (cancelled) return;

                const resultPoId =
                    result?.purchaseOrderId ??
                    result?.poId ??
                    currentPoId;

                const normalizedPoMatches =
                    Number(resultPoId) === Number(currentPoId);

                const hasPending =
                    typeof result === 'boolean'
                        ? result
                        : Boolean(
                            result?.hasPending ??
                            result?.exists ??
                            result?.isPending ??
                            false
                        );

                setHasPendingGRNState({
                    purchaseOrderId: currentPoId,
                    hasPending: normalizedPoMatches ? hasPending : false,
                    checking: false,
                });
            } catch (error) {
                console.error('Lỗi kiểm tra GRN pending:', error);
                if (cancelled) return;

                setHasPendingGRNState({
                    purchaseOrderId: currentPoId,
                    hasPending: false,
                    checking: false,
                });
            }
        };

        checkPendingGRN();

        return () => {
            cancelled = true;
        };
    }, [orderData.purchaseOrderId, orderData.approvalStatus]);

    const subtotal = orderData.totalAmount ?? orderData.lines.reduce((sum, line) => sum + (Number(line.totalPrice) || 0), 0);
    const discountAmt = orderData.discountAmount ?? (
        orderData.discountType === 'amount'
            ? Number(orderData.discount ?? 0)
            : (subtotal * Number(orderData.discount ?? 0)) / 100
    );
    const grandTotal = orderData.netAmount ?? (subtotal - discountAmt);
    const totalQty = orderData.totalOrderedQty > 0
        ? orderData.totalOrderedQty
        : orderData.lines.reduce((sum, line) => sum + (Number(line.orderedQty) || 0), 0);

    const normalizedApprovalStatus = String(orderData.approvalStatus || '').trim().toUpperCase();
    const isPending = normalizedApprovalStatus.startsWith('PENDING');
    const canApprove = (permissionRole === 'ACCOUNTANTS' || permissionRole === 'DIRECTOR') && isPending;

    const isPendingGrnCheckedForCurrentPO =
        Number(hasPendingGRNState.purchaseOrderId) === Number(orderData.purchaseOrderId);

    const showPendingGRNChip =
        (permissionRole === 'WAREHOUSE_KEEPER' || permissionRole === 'DIRECTOR') &&
        orderData.approvalStatus === 'APPROVED' &&
        isPendingGrnCheckedForCurrentPO &&
        !hasPendingGRNState.checking &&
        hasPendingGRNState.hasPending;

    const canCreateGRN =
        (permissionRole === 'WAREHOUSE_KEEPER' || permissionRole === 'DIRECTOR') &&
        orderData.approvalStatus === 'APPROVED' &&
        isPendingGrnCheckedForCurrentPO &&
        !hasPendingGRNState.checking &&
        !hasPendingGRNState.hasPending;

    const openConfirmDialog = (type) => {
        setConfirmDialogType(type);
        setConfirmDialogOpen(true);
    };

    const closeConfirmDialog = () => {
        setConfirmDialogOpen(false);
        setConfirmDialogType(null);
        setRejectionReason('');
    };

    const handleConfirmAction = async () => {
        if (!canApprove) {
            showToast('Chỉ được duyệt/từ chối khi đơn ở trạng thái chờ duyệt.', 'warning');
            return;
        }

        if (confirmDialogType === 'reject' && !rejectionReason.trim()) {
            showToast('Vui lòng nhập lý do từ chối.', 'warning');
            return;
        }

        setSubmitting(true);

        try {
            if (confirmDialogType === 'approve') {
                await approvePurchaseOrder(orderData.purchaseOrderId);
                showToast('Đã duyệt yêu cầu nhập hàng.');
            } else {
                await rejectPurchaseOrder(orderData.purchaseOrderId, rejectionReason);
                showToast('Đã từ chối yêu cầu nhập hàng.');
            }

            closeConfirmDialog();

            const refreshed = await loadOrderDetail({ showLoading: false });

            if (!refreshed || refreshed.approvalStatus !== 'APPROVED') {
                setHasPendingGRNState({
                    purchaseOrderId: refreshed?.purchaseOrderId ?? orderData.purchaseOrderId ?? null,
                    hasPending: false,
                    checking: false,
                });
            }
        } catch (err) {
            showToast(err?.response?.data?.message || err?.message || 'Có lỗi xảy ra.', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const renderReadonlyField = (label, value, Icon, options = {}) => {
        const { multiline = false } = options;

        return (
            <div style={styles.fieldWrap}>
                <label style={styles.fieldLabel}>{label}</label>
                <div
                    style={{
                        ...styles.fieldBox,
                        ...(multiline ? styles.fieldBoxMultiline : {}),
                    }}
                >
                    <Icon size={16} style={{ color: '#64748b', flexShrink: 0, marginTop: multiline ? 2 : 0 }} />
                    <span style={{ whiteSpace: multiline ? 'pre-wrap' : 'normal' }}>
                        {value || '—'}
                    </span>
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div
                className="create-supplier-page"
                style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}
            >
                <Loader size={32} style={{ color: '#9ca3af', animation: 'spin 1s linear infinite' }} />
            </div>
        );
    }

    if (accessDenied) {
        return (
            <div
                className="create-supplier-page"
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    minHeight: '400px',
                    gap: '16px',
                }}
            >
                <XCircle size={64} style={{ color: '#ef4444', opacity: 0.6 }} />
                <h2 style={{ color: '#374151', margin: 0 }}>Không có quyền truy cập</h2>
                <p style={{ color: '#6b7280', margin: 0 }}>
                    Bạn không có quyền xem yêu cầu nhập hàng này.
                </p>
                <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => navigate('/purchase-orders')}
                >
                    Quay lại danh sách
                </button>
            </div>
        );
    }

    return (
        <div className="create-supplier-page view-po-detail-page">
            <ConfirmDialog
                open={confirmDialogOpen}
                onClose={closeConfirmDialog}
                onConfirm={handleConfirmAction}
                title={confirmDialogType === 'approve' ? 'Xác nhận duyệt đơn' : 'Xác nhận từ chối đơn'}
                message={confirmDialogType === 'approve'
                    ? 'Bạn có chắc chắn muốn duyệt yêu cầu nhập hàng này? Sau khi duyệt, đơn hàng sẽ được chuyển sang trạng thái đã duyệt.'
                    : 'Bạn có chắc chắn muốn từ chối yêu cầu nhập hàng này? Sau khi từ chối, đơn hàng sẽ không thể tiếp tục xử lý.'}
                content={confirmDialogType === 'reject' && (
                    <div style={{ marginTop: 18 }}>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
                            Lý do từ chối <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            disabled={submitting}
                            rows={4}
                            placeholder="Nhập lý do từ chối đơn hàng"
                            maxLength={250}
                            style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1px solid #d1d5db', fontSize: '14px', resize: 'vertical', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', backgroundColor: '#ffffff' }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '12px', color: rejectionReason.length >= 250 ? '#ef4444' : '#6b7280', marginTop: '6px' }}>
                            {rejectionReason.length}/250 ký tự
                        </div>
                    </div>
                )}
                confirmText="Xác nhận"
                cancelText="Hủy"
                loading={submitting}
                confirmDanger={confirmDialogType === 'reject'}
                confirmDisabled={confirmDialogType === 'reject' && !rejectionReason.trim()}
            />

            <div className="page-header">
                <div className="page-header-left">
                    <button type="button" onClick={() => navigate(-1)} className="back-button">
                        <ArrowLeft size={20} />
                        <span>Quay lại</span>
                    </button>
                </div>

                <div className="page-header-actions">
                    {canApprove && (
                        <>
                            <button
                                type="button"
                                className="btn btn-cancel"
                                disabled={submitting}
                                onClick={() => openConfirmDialog('reject')}
                            >
                                <XCircle size={16} className="btn-icon" />
                                Từ chối
                            </button>

                            <button
                                type="button"
                                className="btn btn-primary"
                                disabled={submitting}
                                onClick={() => openConfirmDialog('approve')}
                            >
                                <CheckCircle size={16} className="btn-icon" />
                                Duyệt đơn
                            </button>
                        </>
                    )}

                    {canCreateGRN && (
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => navigate(`/good-receipt-notes/create?poId=${orderData.purchaseOrderId}`)}
                        >
                            <Warehouse size={16} className="btn-icon" />
                            Tạo phiếu nhập kho
                        </button>
                    )}

                    {orderData.approvalStatus === 'DRAFT' && permissionRole !== 'WAREHOUSE_KEEPER' && (
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => navigate(`/purchase-orders/edit/${orderData.purchaseOrderId}`)}
                        >
                            <Pencil size={16} className="btn-icon" />
                            Chỉnh sửa
                        </button>
                    )}

                    {permissionRole === 'WAREHOUSE_KEEPER' &&
                        orderData.approvalStatus === 'APPROVED' &&
                        hasPendingGRNState.checking && (
                            <Chip
                                label="Đang kiểm tra Phiếu Nhập Kho..."
                                sx={{
                                    bgcolor: '#eff6ff',
                                    color: '#1d4ed8',
                                    fontWeight: 600,
                                    fontSize: '12px',
                                    height: 32,
                                }}
                            />
                        )}

                    {showPendingGRNChip && (
                        <Chip
                            label="Đã có Phiếu Nhập Kho - Đang chờ duyệt"
                            sx={{
                                bgcolor: '#fef3c7',
                                color: '#92400e',
                                fontWeight: 600,
                                fontSize: '12px',
                                height: 32,
                            }}
                        />
                    )}
                </div>
            </div>

            <div className="form-card">
                <div className="form-wrapper">
                    <div className="form-card-intro view-po-detail-intro">
                        <div className="view-po-detail-intro-row">
                            <div>
                                <h1 className="page-title">Chi tiết yêu cầu nhập hàng</h1>
                                <p className="form-card-required-note" style={{ marginTop: 4 }}>
                                    Mã đơn:{' '}
                                    <strong>{orderData.orderCode || '—'}</strong>
                                    {orderData.currentStageNo != null && orderData.currentStageNo > 1 && (
                                        <span className="view-po-detail-stage-note">
                                            {' '}
                                            · Bước {orderData.currentStageNo}
                                        </span>
                                    )}
                                </p>
                            </div>
                            <div className="view-po-detail-status-row">
                                <StatusBadge status={orderData.approvalStatus} />
                                <StatusBadge
                                    status={orderData.approvalStatus === 'APPROVED' ? (orderData.lifecycleStatus || 'PendingRcv') : 'PO_NO_GRN_ORDER'}
                                    label={
                                        orderData.approvalStatus === 'APPROVED'
                                            ? LIFECYCLE_STATUS_MAP[orderData.lifecycleStatus]?.label
                                            : undefined
                                    }
                                />
                            </div>
                        </div>
                    </div>

                    <div className="view-po-detail-metrics" style={styles.heroMetrics}>
                        {!hideSensitiveForWarehouseKeeper && (
                            <div style={styles.metricCard}>
                                <div style={styles.metricLabel}>Nhà cung cấp</div>
                                <div style={styles.metricValue}>{orderData.supplierName || '—'}</div>
                            </div>
                        )}

                        <div style={styles.metricCard}>
                            <div style={styles.metricLabel}>Kho nhận</div>
                            <div style={styles.metricValue}>{orderData.warehouseName || '—'}</div>
                        </div>

                        <div style={styles.metricCard}>
                            <div style={styles.metricLabel}>Tổng số lượng</div>
                            <div style={styles.metricValue}>{totalQty}</div>
                            <div style={styles.metricSubValue}>Sản phẩm đặt mua</div>
                        </div>

                        <div style={styles.metricCard}>
                            <div style={styles.metricLabel}>Tổng giá trị</div>
                            <div style={{ ...styles.metricValue, color: '#1d4ed8' }}>
                                {formatCurrency(grandTotal)}
                            </div>
                            <div style={styles.metricSubValue}>Sau chiết khấu</div>
                        </div>
                    </div>

                    <div style={styles.contentGrid}>
                <div style={styles.leftStack}>
                    <div style={styles.sectionCard}>
                        <div style={styles.sectionHeader}>
                            <h2 style={styles.sectionTitle}>Danh sách sản phẩm</h2>
                            <Chip
                                label={`${orderData.lines.length} dòng sản phẩm`}
                                size="small"
                                sx={{
                                    backgroundColor: '#eff6ff',
                                    color: '#1d4ed8',
                                    fontWeight: 700,
                                    fontSize: '12px',
                                }}
                            />
                        </div>

                        {orderData.lines.length === 0 ? (
                            <div style={styles.emptyState}>
                                <Clock size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                                <p style={{ margin: 0 }}>Chưa có sản phẩm nào trong yêu cầu nhập hàng.</p>
                            </div>
                        ) : (
                            <div style={styles.tableWrap}>
                                <table style={styles.table}>
                                    <thead>
                                        <tr>
                                            <th style={{ ...styles.th, width: 56, textAlign: 'center' }}>STT</th>
                                            <th style={{ ...styles.th, minWidth: 220 }}>Sản phẩm</th>
                                            <th style={{ ...styles.th, width: 80, textAlign: 'center' }}>ĐVT</th>
                                            <th style={{ ...styles.th, width: 100, textAlign: 'right' }}>SL đặt</th>
                                            <th style={{ ...styles.th, width: 100, textAlign: 'right' }}>SL đã nhận</th>
                                            <th style={{ ...styles.th, width: 130, textAlign: 'right' }}>Đơn giá</th>
                                            <th style={{ ...styles.th, width: 130, textAlign: 'right' }}>Giá sau CK</th>
                                            <th style={{ ...styles.th, width: 140, textAlign: 'right' }}>Thành tiền</th>
                                            <th style={{ ...styles.th, width: 60, textAlign: 'center' }}>CO</th>
                                            <th style={{ ...styles.th, width: 60, textAlign: 'center' }}>CQ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {orderData.lines.map((line, index) => (
                                                <tr key={line.id}>
                                                    <td style={{ ...styles.td, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>
                                                        {index + 1}
                                                    </td>

                                                    <td style={styles.td}>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                            <span
                                                                style={{
                                                                    fontSize: 13,
                                                                    fontWeight: 600,
                                                                    color: '#111827',
                                                                    lineHeight: 1.4,
                                                                    display: '-webkit-box',
                                                                    WebkitLineClamp: 2,
                                                                    WebkitBoxOrient: 'vertical',
                                                                    overflow: 'hidden',
                                                                }}
                                                                title={line.itemName}
                                                            >
                                                                {line.itemName || '—'}
                                                            </span>
                                                            {line.itemCode && (
                                                                <span style={{ fontSize: 11, color: '#64748b' }}>
                                                                    {line.itemCode}
                                                                </span>
                                                            )}
                                                            {line.note && (
                                                                <span style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>
                                                                    {line.note}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>

                                                    <td style={{ ...styles.td, textAlign: 'center', color: '#64748b' }}>
                                                        {line.uom || '—'}
                                                    </td>

                                                    <td style={{ ...styles.td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                                        {Number(line.orderedQty) || 0}
                                                    </td>

                                                    <td
                                                        style={{
                                                            ...styles.td,
                                                            textAlign: 'right',
                                                            fontVariantNumeric: 'tabular-nums',
                                                            fontWeight: 700,
                                                        }}
                                                    >
                                                        {Number(line.receivedQty) || 0}
                                                    </td>

                                                    <td style={{ ...styles.td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                                                            <span>{formatCurrency(Number(line.unitPrice) || 0)}</span>
                                                            {line.currency && line.currency !== 'VND' && (
                                                                <span style={{ fontSize: 11, color: '#9ca3af' }}>{line.currency}</span>
                                                            )}
                                                        </div>
                                                    </td>

                                                    <td
                                                        style={{
                                                            ...styles.td,
                                                            textAlign: 'right',
                                                            fontVariantNumeric: 'tabular-nums',
                                                            fontWeight: 700,
                                                            color: '#10b981',
                                                        }}
                                                    >
                                                        {formatCurrency(
                                                            orderData.discount > 0
                                                                ? (Number(line.unitPrice) || 0) * (orderData.discountType === 'amount' ? 1 : (100 - (orderData.discount ?? 0)) / 100)
                                                                : (Number(line.unitPrice) || 0)
                                                        )}
                                                    </td>

                                                    <td
                                                        style={{
                                                            ...styles.td,
                                                            textAlign: 'right',
                                                            fontVariantNumeric: 'tabular-nums',
                                                            fontWeight: 800,
                                                            color: '#1d4ed8',
                                                        }}
                                                    >
                                                        {formatCurrency(Number(line.totalPrice) || 0)}
                                                    </td>

                                                    <td style={{ ...styles.td, textAlign: 'center' }}>
                                                        {line.requiresCo ? (
                                                            <Check size={16} color="#10b981" />
                                                        ) : (
                                                            <span style={{ color: '#d1d5db', fontSize: 12 }}>—</span>
                                                        )}
                                                    </td>

                                                    <td style={{ ...styles.td, textAlign: 'center' }}>
                                                        {line.requiresCq ? (
                                                            <Check size={16} color="#10b981" />
                                                        ) : (
                                                            <span style={{ color: '#d1d5db', fontSize: 12 }}>—</span>
                                                        )}
                                                    </td>
                                                </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    <div style={styles.sectionCard}>
                        <div style={styles.sectionHeader}>
                            <h2 style={styles.sectionTitle}>Tổng hợp đơn hàng</h2>
                        </div>

                        <div style={styles.sectionBody}>
                            <div style={styles.summaryGrid}>
                                <div style={styles.summaryBox}>
                                    <div style={styles.summaryBoxLabel}>Tổng số lượng</div>
                                    <div style={styles.summaryBoxValue}>{totalQty}</div>
                                </div>

                                <div style={styles.summaryBox}>
                                    <div style={styles.summaryBoxLabel}>Tạm tính</div>
                                    <div style={styles.summaryBoxValue}>{formatCurrency(subtotal)}</div>
                                </div>
                            </div>

                            <div style={styles.amountRows}>
                                {orderData.discount > 0 && (
                                    <div style={styles.amountRow}>
                                        <span>
                                            Chiết khấu {orderData.discountType === 'percent' ? `(${orderData.discount}%)` : ''}
                                        </span>
                                        <strong style={{ color: '#ef4444' }}>- {formatCurrency(discountAmt)}</strong>
                                    </div>
                                )}

                                <div style={styles.amountRow}>
                                    <span>Giá sau chiết khấu</span>
                                    <strong>{formatCurrency(grandTotal)}</strong>
                                </div>
                            </div>

                            <div style={styles.totalHighlight}>
                                <span style={styles.totalHighlightLabel}>Tổng giá trị</span>
                                <span style={styles.totalHighlightValue}>{formatCurrency(grandTotal)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div style={styles.sideStack}>
                    <div style={styles.sectionCard}>
                        <div style={styles.sectionHeader}>
                            <h2 style={styles.sectionTitle}>Thông tin đơn hàng</h2>
                        </div>

                        <div style={styles.sectionBody}>
                            <div style={styles.infoGrid}>
                                {renderReadonlyField('Kho nhận', orderData.warehouseName, MapPin)}
                                {renderReadonlyField('Người tạo', orderData.creatorName, User)}

                                {orderData.responsiblePersonName &&
                                    renderReadonlyField('Người phụ trách', orderData.responsiblePersonName, User)}

                                {orderData.requestedDate &&
                                    renderReadonlyField('Ngày yêu cầu', orderData.requestedDate, Calendar)}

                                {orderData.createdAt &&
                                    renderReadonlyField('Ngày tạo', orderData.createdAt, Calendar)}

                                {orderData.submittedAt &&
                                    renderReadonlyField('Ngày gửi duyệt', orderData.submittedAt, Calendar)}

                                {orderData.expectedDeliveryDate &&
                                    renderReadonlyField('Ngày nhận dự kiến', orderData.expectedDeliveryDate, Calendar)}
                            </div>
                        </div>
                    </div>

                    {!hideSensitiveForWarehouseKeeper && (
                        <div style={styles.sectionCard}>
                            <div style={styles.sectionHeader}>
                                <h2 style={styles.sectionTitle}>Nhà cung cấp</h2>
                            </div>
                            <div style={styles.sectionBody}>
                                <div style={styles.infoGrid}>
                                    {renderReadonlyField('Tên nhà cung cấp', orderData.supplierName, Building2)}
                                </div>
                            </div>
                        </div>
                    )}

                    <div style={styles.sectionCard}>
                        <div style={styles.sectionHeader}>
                            <h2 style={styles.sectionTitle}>Ghi chú</h2>
                        </div>
                        <div style={styles.sectionBody}>
                            {orderData.justification ? (
                                renderReadonlyField('Lý do / Ghi chú', orderData.justification, Clock, { multiline: true })
                            ) : (
                                <div style={styles.fieldWrap}>
                                    <label style={styles.fieldLabel}>Nội dung</label>
                                    <div style={{ ...styles.fieldBox, ...styles.fieldBoxMultiline, color: '#94a3b8' }}>
                                        <Clock size={16} style={{ color: '#94a3b8', flexShrink: 0, marginTop: 2 }} />
                                        <span>Không có ghi chú.</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {!hideSensitiveForWarehouseKeeper && (
                        <div style={styles.sectionCard}>
                            <div style={styles.sectionHeader}>
                                <h2 style={styles.sectionTitle}>Tệp đính kèm</h2>
                            </div>
                            <div style={styles.sectionBody}>
                                {orderData.quotationFileUrl || orderData.contractAppendixFileUrl ? (
                                    <div style={styles.fieldWrap}>
                                        <label style={styles.fieldLabel}>Tệp đính kèm PO</label>
                                        <div
                                            style={{
                                                ...styles.fieldBox,
                                                ...styles.fieldBoxMultiline,
                                                flexDirection: 'column',
                                                alignItems: 'flex-start',
                                                gap: 10,
                                            }}
                                        >
                                            {orderData.quotationFileUrl && (
                                                <a
                                                    href={orderData.quotationFileUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    style={{
                                                        color: '#1d4ed8',
                                                        textDecoration: 'none',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: 8,
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    <Paperclip size={16} />
                                                    File báo giá
                                                </a>
                                            )}
                                            {orderData.contractAppendixFileUrl && (
                                                <a
                                                    href={orderData.contractAppendixFileUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    style={{
                                                        color: '#1d4ed8',
                                                        textDecoration: 'none',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: 8,
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    <FileText size={16} />
                                                    Hợp đồng nguyên tắc
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div style={styles.fieldWrap}>
                                        <label style={styles.fieldLabel}>Tệp đính kèm PO</label>
                                        <div style={{ ...styles.fieldBox, color: '#94a3b8' }}>
                                            <Paperclip size={16} style={{ color: '#94a3b8', flexShrink: 0 }} />
                                            <span>Chưa có tệp đính kèm.</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ViewPurchaseOrderDetail;