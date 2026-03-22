/**
 * ViewPurchaseOrderDetail - Chi tiết đơn mua hàng (read-only)
 * Kế toán: duyệt / từ chối đơn, xác nhận thanh toán
 * Thủ Kho: tạo phiếu nhập kho
 * Sale Support: tạo đơn
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Chip,
} from '@mui/material';
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
} from 'lucide-react';
import Toast from '../../components/Toast/Toast';
import { useToast } from '../hooks/useToast';
import authService from '../lib/authService';
import { getPermissionRole, getRawRoleFromUser } from '../permissions/roleUtils';
import { getPurchaseOrderDetail, approvePurchaseOrder, rejectPurchaseOrder } from '../lib/purchaseOrderService';
import { hasPendingGRNForPO } from '../lib/goodReceiptNoteService';
import '../styles/CreateSupplier.css';

const formatCurrency = (value) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);

const STATUS_MAP = {
    DRAFT: { label: 'Bản nháp', color: '#6b7280', bgColor: '#f3f4f6' },
    PENDING: { label: 'Chờ duyệt', color: '#f59e0b', bgColor: '#fef3c7' },
    PENDING_ACC: { label: 'Chờ duyệt', color: '#f59e0b', bgColor: '#fef3c7' },
    APPROVED: { label: 'Đã duyệt', color: '#10b981', bgColor: '#d1fae5' },
    REJECTED: { label: 'Từ chối', color: '#ef4444', bgColor: '#fee2e2' },
};

const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
};

const mapOrderDetail = (data) => ({
    purchaseOrderId:
        data.purchaseOrderId ??
        data.PurchaseOrderId ??
        data.id ??
        null,
    orderCode: data.poCode ?? data.OrderCode ?? '',
    supplierName: data.supplierName ?? data.SupplierName ?? '',
    warehouseName: data.warehouseName ?? data.WarehouseName ?? '',
    creatorId: data.requestedBy ?? data.RequestedBy ?? null,
    creatorName: data.requestedByName || data.RequestedByName || '',
    responsiblePersonName: data.responsiblePersonName || data.ResponsibleUserName || '',
    expectedDeliveryDate: data.expectedDeliveryDate ? formatDate(data.expectedDeliveryDate) : '',
    justification: data.justification || '',
    discountType: data.discountType ?? 'percent',
    discount: data.discount ?? 0,
    approvalStatus: (data.status ?? data.Status ?? 'DRAFT').toUpperCase(),
    createdAt: data.createdAt ? formatDate(data.createdAt) : '',
    lines: (data.lines || []).map((line, index) => ({
        id: line.purchaseOrderLineId || line.id || index + 1,
        itemName: line.itemName || line.ItemName || '',
        itemCode: line.itemCode || line.ItemCode || '',
        orderedQty: line.orderedQty ?? line.OrderedQty ?? 0,
        receivedQty: line.receivedQty ?? line.ReceivedQty ?? 0,
        unitPrice: line.unitPrice ?? line.UnitPrice ?? 0,
        totalPrice:
            line.totalPrice ??
            line.TotalPrice ??
            ((line.orderedQty ?? line.OrderedQty ?? 0) * (line.unitPrice ?? line.UnitPrice ?? 0)),
        uom: line.uomName || line.UomName || '',
        note: line.note || '',
    })),
});

const ViewPurchaseOrderDetail = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { toast, showToast, clearToast } = useToast();

    const userInfo = authService.getUser();
    const permissionRole = getPermissionRole(getRawRoleFromUser(userInfo));

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
        creatorId: null,
        creatorName: '',
        supplierName: '',
        warehouseName: '',
        creatorName: '',
        responsiblePersonName: '',
        expectedDeliveryDate: '',
        justification: '',
        discountType: 'percent',
        discount: 0,
        approvalStatus: '',
        createdAt: '',
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

                // Kiểm tra quyền truy cập: PO DRAFT chỉ người tạo mới xem được
                const currentUserId = userInfo?.userId ?? userInfo?.UserId ?? null;
                const isDraft = (mapped.approvalStatus || '').toUpperCase() === 'DRAFT';
                const isCreator = mapped.creatorId != null && String(mapped.creatorId) === String(currentUserId);
                if (isDraft && !isCreator) {
                    setAccessDenied(true);
                    return mapped;
                }

                setOrderData(mapped);
                return mapped;
            } catch (error) {
                console.error('Lỗi khi tải chi tiết đơn mua:', error);
                showToast('Không thể tải thông tin đơn mua', 'error');
                return null;
            } finally {
                if (showLoading) {
                    setLoading(false);
                }
            }
        },
        [id, showToast]
    );

    // Load PO detail
    useEffect(() => {
        loadOrderDetail();
    }, [loadOrderDetail]);

    // Kiểm tra GRN pending khi PO đã duyệt
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

    // Tính toán
    const subtotal = orderData.lines.reduce((sum, line) => sum + (Number(line.totalPrice) || 0), 0);
    const discountAmount =
        orderData.discountType === 'amount'
            ? Number(orderData.discount ?? 0)
            : (subtotal * Number(orderData.discount ?? 0)) / 100;
    const grandTotal = subtotal - discountAmount;

    // Quyền: Kế toán duyệt/từ chối đơn
    const isPending = orderData.approvalStatus === 'PENDING_ACC';
    const canApprove = permissionRole === 'ACCOUNTANTS' && isPending;

    const isPendingGrnCheckedForCurrentPO =
        Number(hasPendingGRNState.purchaseOrderId) === Number(orderData.purchaseOrderId);

    const showPendingGRNChip =
        permissionRole === 'WAREHOUSE_KEEPER' &&
        orderData.approvalStatus === 'APPROVED' &&
        isPendingGrnCheckedForCurrentPO &&
        !hasPendingGRNState.checking &&
        hasPendingGRNState.hasPending;

    // Quyền: Thủ Kho tạo GRN khi PO đã duyệt và chưa có GRN pending
    const canCreateGRN =
        permissionRole === 'WAREHOUSE_KEEPER' &&
        orderData.approvalStatus === 'APPROVED' &&
        isPendingGrnCheckedForCurrentPO &&
        !hasPendingGRNState.checking &&
        !hasPendingGRNState.hasPending;

    // Dialog
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
        if (confirmDialogType === 'reject' && !rejectionReason.trim()) {
            showToast('Vui lòng nhập lý do từ chối.', 'warning');
            return;
        }

        setSubmitting(true);

        try {
            if (confirmDialogType === 'approve') {
                await approvePurchaseOrder(orderData.purchaseOrderId);
                showToast('Đã duyệt đơn mua hàng.');
            } else {
                await rejectPurchaseOrder(orderData.purchaseOrderId, rejectionReason);
                showToast('Đã từ chối đơn mua hàng.');
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
                    Bạn không có quyền xem đơn mua hàng này.
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

    const statusStyle =
        STATUS_MAP[orderData.approvalStatus] || {
            label: orderData.approvalStatus,
            color: '#6b7280',
            bgColor: '#f3f4f6',
        };

    return (
        <div className="create-supplier-page">
            <Dialog
                open={confirmDialogOpen}
                onClose={closeConfirmDialog}
                fullWidth
                maxWidth="sm"
                disableEscapeKeyDown={submitting}
                PaperProps={{
                    sx: {
                        width: '100%',
                        maxWidth: '560px',
                        borderRadius: '16px',
                        border: '1px solid #e5e7eb',
                        boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)',
                    },
                }}
            >
                <DialogTitle
                    sx={{
                        px: 3,
                        pt: 2.5,
                        pb: 1.5,
                        fontWeight: 700,
                        fontSize: '18px',
                        color: '#111827',
                        borderBottom: '1px solid #f3f4f6',
                    }}
                >
                    {confirmDialogType === 'approve' ? 'Xác nhận duyệt đơn' : 'Xác nhận từ chối đơn'}
                </DialogTitle>

                <DialogContent sx={{ px: 3, py: 2 }}>
                    <p style={{ margin: 0, fontSize: '14px', color: '#374151', lineHeight: 1.6 }}>
                        {confirmDialogType === 'approve'
                            ? 'Bạn có chắc chắn muốn duyệt đơn mua hàng này? Sau khi duyệt, đơn hàng sẽ được chuyển sang trạng thái đã duyệt.'
                            : 'Bạn có chắc chắn muốn từ chối đơn mua hàng này? Sau khi từ chối, đơn hàng sẽ không thể tiếp tục xử lý.'}
                    </p>

                    {confirmDialogType === 'reject' && (
                        <div style={{ marginTop: '16px' }}>
                            <label
                                style={{
                                    display: 'block',
                                    fontSize: '14px',
                                    fontWeight: 500,
                                    color: '#374151',
                                    marginBottom: '8px',
                                }}
                            >
                                Lý do từ chối <span style={{ color: '#ef4444' }}>*</span>
                            </label>
                            <textarea
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                disabled={submitting}
                                rows={3}
                                placeholder="Nhập lý do từ chối đơn hàng"
                                maxLength={250}
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    borderRadius: '8px',
                                    border: '1px solid #d1d5db',
                                    fontSize: '14px',
                                    resize: 'vertical',
                                    outline: 'none',
                                    fontFamily: 'inherit',
                                    boxSizing: 'border-box',
                                }}
                            />
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'flex-end',
                                    fontSize: '12px',
                                    color: rejectionReason.length >= 250 ? '#ef4444' : '#6b7280',
                                    marginTop: '4px',
                                }}
                            >
                                {rejectionReason.length}/250 ký tự
                            </div>
                        </div>
                    )}
                </DialogContent>

                <DialogActions sx={{ px: 3, pb: 2.5, gap: 1.5, borderTop: '1px solid #f3f4f6' }}>
                    <Button
                        onClick={closeConfirmDialog}
                        disabled={submitting}
                        sx={{
                            minWidth: '72px',
                            height: 40,
                            borderRadius: '10px',
                            textTransform: 'none',
                            fontSize: '14px',
                            fontWeight: 600,
                            color: '#6b7280',
                            backgroundColor: 'transparent',
                            boxShadow: 'none',
                            '&:hover': { backgroundColor: 'transparent', color: '#4b5563' },
                        }}
                    >
                        Hủy
                    </Button>

                    <Button
                        variant="contained"
                        onClick={handleConfirmAction}
                        disabled={confirmDialogType === 'reject' && !rejectionReason.trim()}
                        sx={{
                            minWidth: '110px',
                            height: 40,
                            borderRadius: '12px',
                            textTransform: 'none',
                            fontSize: '14px',
                            fontWeight: 700,
                            backgroundColor: confirmDialogType === 'approve' ? '#0ea5e9' : '#ef4444',
                            boxShadow: 'none',
                            '&:hover': {
                                backgroundColor: confirmDialogType === 'approve' ? '#0284c7' : '#dc2626',
                                boxShadow: 'none',
                            },
                            '&:disabled': { backgroundColor: '#bae6fd', color: '#ffffff' },
                        }}
                    >
                        {submitting ? 'Đang xử lý...' : 'Xác nhận'}
                    </Button>
                </DialogActions>
            </Dialog>

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

                    {permissionRole === 'WAREHOUSE_KEEPER' &&
                        orderData.approvalStatus === 'APPROVED' &&
                        hasPendingGRNState.checking && (
                            <Chip
                                label="Đang kiểm tra Phiếu Nhập Kho..."
                                sx={{
                                    bgcolor: '#eff6ff',
                                    color: '#1d4ed8',
                                    fontWeight: 500,
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
                                fontWeight: 500,
                                fontSize: '12px',
                                height: 32,
                            }}
                        />
                    )}
                </div>
            </div>

            <div className="form-card">
                <div className="form-wrapper">
                    <div className="form-card-intro">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                            <h1 className="page-title">Chi tiết đơn mua hàng</h1>
                            {statusStyle && (
                                <Chip
                                    label={statusStyle.label}
                                    size="small"
                                    sx={{
                                        backgroundColor: statusStyle.bgColor,
                                        color: statusStyle.color,
                                        fontWeight: 600,
                                        fontSize: '12px',
                                    }}
                                />
                            )}
                        </div>

                        {orderData.orderCode && (
                            <p style={{ fontSize: '14px', color: '#6b7280', margin: '8px 0 0 0' }}>
                                MÃ ĐƠN: <span style={{ fontWeight: 600, color: '#2196F3' }}>{orderData.orderCode}</span>
                            </p>
                        )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px', alignItems: 'start' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <div className="info-section" style={{ margin: 0 }}>
                                <h2 className="section-title">Danh sách sản phẩm</h2>

                                {orderData.lines.length === 0 ? (
                                    <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
                                        <Clock size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                                        <p>Chưa có sản phẩm nào trong đơn mua hàng.</p>
                                    </div>
                                ) : (
                                    <div className="table-container" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                                        <table className="product-table">
                                            <thead>
                                                <tr>
                                                    <th style={{ width: '44px' }}>STT</th>
                                                    <th>Sản phẩm</th>
                                                    <th style={{ width: '90px', textAlign: 'right' }}>SL đặt</th>
                                                    <th style={{ width: '90px', textAlign: 'right' }}>SL nhập</th>
                                                    <th style={{ width: '130px', textAlign: 'right' }}>Đơn giá</th>
                                                    <th style={{ width: '140px', textAlign: 'right' }}>Thành tiền</th>
                                                    <th style={{ width: '130px' }}>Ghi chú</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {orderData.lines.map((line, index) => (
                                                    <tr key={line.id}>
                                                        <td style={{ textAlign: 'center', color: '#9ca3af', fontSize: '12px' }}>{index + 1}</td>
                                                        <td>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                                <span style={{ fontSize: 14, fontWeight: 500 }}>{line.itemName}</span>
                                                                {line.itemCode && (
                                                                    <span style={{ fontSize: 12, color: '#6b7280' }}>
                                                                        Mã: {line.itemCode}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                                            {Number(line.orderedQty) || 0}
                                                        </td>
                                                        <td
                                                            style={{
                                                                textAlign: 'right',
                                                                fontVariantNumeric: 'tabular-nums',
                                                                fontWeight: 600,
                                                            }}
                                                        >
                                                            {Number(line.receivedQty) || 0}
                                                        </td>
                                                        <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                                            {formatCurrency(Number(line.unitPrice) || 0)}
                                                        </td>
                                                        <td
                                                            style={{
                                                                textAlign: 'right',
                                                                fontVariantNumeric: 'tabular-nums',
                                                                fontWeight: 600,
                                                                color: '#2196F3',
                                                            }}
                                                        >
                                                            {formatCurrency(Number(line.totalPrice) || 0)}
                                                        </td>
                                                        <td style={{ color: '#6b7280', fontSize: 13 }}>{line.note || '—'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            <div
                                style={{
                                    padding: '16px 20px',
                                    backgroundColor: '#f0f9ff',
                                    borderRadius: '12px',
                                    borderLeft: '4px solid #2196F3',
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <span style={{ color: '#64748b' }}>Tạm tính:</span>
                                    <span style={{ fontWeight: 600 }}>{formatCurrency(subtotal)}</span>
                                </div>

                                {orderData.discount > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <span style={{ color: '#64748b' }}>
                                            Chiết khấu {orderData.discountType === 'percent' ? `(${orderData.discount}%)` : ''}:
                                        </span>
                                        <span style={{ fontWeight: 600, color: '#ef4444' }}>
                                            - {formatCurrency(discountAmount)}
                                        </span>
                                    </div>
                                )}

                                <div
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        paddingTop: '8px',
                                        borderTop: '1px solid #d1d5db',
                                    }}
                                >
                                    <span style={{ fontSize: '16px', fontWeight: 700, color: '#2196F3' }}>Tổng cộng:</span>
                                    <span style={{ fontSize: '20px', fontWeight: 700, color: '#2196F3' }}>
                                        {formatCurrency(grandTotal)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="info-section" style={{ margin: 0 }}>
                            <h2 className="section-title">Thông tin đơn hàng</h2>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div className="form-field">
                                    <label className="form-label">Nhà cung cấp</label>
                                    <div className="input-wrapper">
                                        <Building2 size={16} className="input-icon" />
                                        <input
                                            type="text"
                                            value={orderData.supplierName || ''}
                                            readOnly
                                            className="form-input"
                                            style={{ backgroundColor: '#f5f5f5' }}
                                        />
                                    </div>
                                </div>

                                <div className="form-field">
                                    <label className="form-label">Kho nhận</label>
                                    <div className="input-wrapper">
                                        <MapPin size={16} className="input-icon" />
                                        <input
                                            type="text"
                                            value={orderData.warehouseName || ''}
                                            readOnly
                                            className="form-input"
                                            style={{ backgroundColor: '#f5f5f5' }}
                                        />
                                    </div>
                                </div>

                                <div className="form-field">
                                    <label className="form-label">Người tạo</label>
                                    <div className="input-wrapper">
                                        <User size={16} className="input-icon" />
                                        <input
                                            type="text"
                                            value={orderData.creatorName || ''}
                                            readOnly
                                            className="form-input"
                                            style={{ backgroundColor: '#f5f5f5' }}
                                        />
                                    </div>
                                </div>

                                {orderData.responsiblePersonName && (
                                    <div className="form-field">
                                        <label className="form-label">Người phụ trách</label>
                                        <div className="input-wrapper">
                                            <User size={16} className="input-icon" />
                                            <input
                                                type="text"
                                                value={orderData.responsiblePersonName || ''}
                                                readOnly
                                                className="form-input"
                                                style={{ backgroundColor: '#f5f5f5' }}
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="form-field">
                                    <label className="form-label">Ngày tạo</label>
                                    <div className="input-wrapper">
                                        <Calendar size={16} className="input-icon" />
                                        <input
                                            type="text"
                                            value={orderData.createdAt || '—'}
                                            readOnly
                                            className="form-input"
                                            style={{ backgroundColor: '#f5f5f5' }}
                                        />
                                    </div>
                                </div>

                                <div className="form-field">
                                    <label className="form-label">Ngày nhận dự kiến</label>
                                    <div className="input-wrapper">
                                        <Calendar size={16} className="input-icon" />
                                        <input
                                            type="text"
                                            value={orderData.expectedDeliveryDate || '—'}
                                            readOnly
                                            className="form-input"
                                            style={{ backgroundColor: '#f5f5f5' }}
                                        />
                                    </div>
                                </div>

                                <div className="form-field">
                                    <label className="form-label">Lý do / Ghi chú</label>
                                    <textarea
                                        value={orderData.justification || ''}
                                        readOnly
                                        rows={4}
                                        className="form-input"
                                        style={{ resize: 'vertical', backgroundColor: '#f5f5f5' }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}
        </div>
    );
};

export default ViewPurchaseOrderDetail;