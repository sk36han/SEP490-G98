/**
 * ViewGoodReceiptNoteDetail - Chi tiết phiếu nhập kho
 * Kế toán: có thể duyệt/từ chối
 * Thủ Kho: chỉ xem (readonly)
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { formatDateTime, formatDateOnly, formatTimeOnly } from '../lib/dateUtils';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Switch,
    TextField,
} from '@mui/material';
import { ConfirmDialog } from '@ui/dialogs';
import {
    ArrowLeft,
    MapPin,
    User,
    Calendar,
    FileText,
    Package,
    CheckCircle,
    XCircle,
    Clock,
    Send,
    X,
    Loader,
    RotateCcw,
    CreditCard,
} from 'lucide-react';
import authService from '../lib/authService';
import { getPermissionRole, getRawRoleFromUser } from '../permissions/roleUtils';
import { getGRNDetail, approveGoodReceiptNote, rejectGoodReceiptNote } from '../lib/goodReceiptNoteService';
import { getPurchaseOrderDetail } from '../lib/purchaseOrderService';
import { useToastContext } from '../../app/context/ToastContext';
import '../styles/CreateSupplier.css';

const MAX_REASON_LENGTH = 250;

const formatCurrency = (value) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value) || 0);

const safeFormatDateOnly = (value) => {
    if (!value) return '';
    try {
        return formatDateOnly(value);
    } catch {
        return value;
    }
};

const safeFormatDateTime = (value) => {
    if (!value) return '';
    try {
        return formatDateTime(value);
    } catch {
        return value;
    }
};

const buildSupplierAddress = (data) => {
    const parts = [
        data.SupplierAddressStreet ?? data.supplierAddressStreet ?? '',
        data.SupplierAddressWard ?? data.supplierAddressWard ?? '',
        data.SupplierAddressDistrict ?? data.supplierAddressDistrict ?? '',
        data.SupplierAddressProvince ?? data.supplierAddressProvince ?? '',
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : '';
};

const _SAFE_FORMAT_TIME_ONLY = (value) => {
    if (!value) return '';
    try {
        return formatTimeOnly(value);
    } catch {
        return value;
    }
};

const buildPurchaseOrderHistory = (poData) => {
    if (!poData || typeof poData !== 'object') return [];

    const poCode = poData.PoCode ?? poData.poCode ?? poData.purchaseOrderCode ?? 'PO';
    const createdAt = poData.CreatedAt ?? poData.createdAt;
    const submittedAt = poData.SubmittedAt ?? poData.submittedAt;
    const approvedAt = poData.ApprovedAt ?? poData.approvedAt;
    const rejectedAt = poData.RejectedAt ?? poData.rejectedAt;
    const rejectedReason = poData.RejectedReason ?? poData.rejectedReason ?? '';

    return [
        approvedAt
            ? {
                type: 'approved',
                title: `Duyệt yêu cầu nhập hàng ${poCode}`,
                actor: poData.ApprovedByName ?? poData.approvedByName ?? '',
                at: approvedAt,
                source: 'PO',
            }
            : null,
        rejectedAt
            ? {
                type: 'rejected',
                title: `Từ chối yêu cầu nhập hàng ${poCode}`,
                actor: poData.RejectedByName ?? poData.rejectedByName ?? '',
                at: rejectedAt,
                note: rejectedReason,
                source: 'PO',
            }
            : null,
        submittedAt
            ? {
                type: 'submitted',
                title: `Gửi duyệt yêu cầu nhập hàng ${poCode}`,
                actor: poData.SubmittedByName ?? poData.submittedByName ?? '',
                at: submittedAt,
                source: 'PO',
            }
            : null,
        createdAt
            ? {
                type: 'created',
                title: `Tạo yêu cầu nhập hàng ${poCode}`,
                actor: poData.CreatedByName ?? poData.createdByName ?? '',
                at: createdAt,
                source: 'PO',
            }
            : null,
    ].filter(Boolean);
};

const buildGrnProcessHistory = (data, grnCode) => {
    if (!data || typeof data !== 'object') return [];
    const createdAt = data.CreatedAt ?? data.createdAt;

    return [
        data.PostedAt
            ? {
                type: 'completed',
                title: `Đã ghi sổ phiếu nhập kho ${grnCode}`,
                actor: data.PostedByName ?? data.postedByName ?? '',
                at: data.PostedAt,
                source: 'GRN',
            }
            : null,
        data.ApprovedAt
            ? {
                type: 'approved',
                title: `Duyệt phiếu nhập kho ${grnCode}`,
                actor: data.ApprovedByName ?? data.approvedByName ?? '',
                at: data.ApprovedAt,
                source: 'GRN',
            }
            : null,
        data.RejectedAt
            ? {
                type: 'rejected',
                title: `Từ chối phiếu nhập kho ${grnCode}`,
                actor: data.RejectedByName ?? data.rejectedByName ?? '',
                at: data.RejectedAt,
                note: data.RejectedReason ?? data.rejectedReason ?? '',
                source: 'GRN',
            }
            : null,
        data.SubmittedAt
            ? {
                type: 'submitted',
                title: `Gửi duyệt phiếu nhập kho ${grnCode}`,
                actor: data.SubmittedByName ?? data.submittedByName ?? '',
                at: data.SubmittedAt,
                source: 'GRN',
            }
            : null,
        createdAt
            ? {
                type: 'created',
                title: `Tạo phiếu nhập kho ${grnCode}`,
                actor: data.CreatedByName ?? data.createdByName ?? '',
                at: createdAt,
                source: 'GRN',
            }
            : null,
    ].filter(Boolean);
};

const _GET_PAYMENT_METHOD_LABEL = (method) => {
    const methodMap = {
        cash: 'Tiền mặt',
        bank_transfer: 'Chuyển khoản',
        credit_card: 'Thẻ tín dụng',
        credit: 'Credit',
        other: 'Khác',
    };
    return methodMap[String(method || '').toLowerCase()] || method || '-';
};

const STATUS_STYLE = {
    DRAFT: { bgColor: 'rgba(107,114,128,0.15)', label: 'Nháp', color: '#4b5563' },
    SUBMITTED: { bgColor: 'rgba(59,130,246,0.15)', label: 'Đã gửi duyệt', color: '#1d4ed8' },
    PENDING_ACC: { bgColor: 'rgba(245,158,11,0.15)', label: 'Chờ duyệt', color: '#d97706' },
    APPROVED: { bgColor: 'rgba(16,185,129,0.18)', label: 'Đã duyệt', color: '#047857' },
    POSTED: { bgColor: 'rgba(139,92,246,0.15)', label: 'Đã ghi sổ', color: '#6d28d9' },
    REJECTED: { bgColor: 'rgba(239,68,68,0.15)', label: 'Từ chối', color: '#b91c1c' },
};

const getStatusMeta = (status) => {
    const normalizedStatus = String(status || '').toUpperCase();
    return (
        STATUS_STYLE[normalizedStatus] || {
            bgColor: 'rgba(107,114,128,0.15)',
            label: status || '-',
            color: '#4b5563',
        }
    );
};

const StatusIcon = ({ status, size = 16 }) => {
    const normalizedStatus = String(status || '').toUpperCase();

    if (normalizedStatus === 'APPROVED') return <CheckCircle size={size} />;
    if (normalizedStatus === 'REJECTED') return <XCircle size={size} />;
    if (normalizedStatus === 'PENDING_ACC' || normalizedStatus === 'SUBMITTED') return <Clock size={size} />;
    return <FileText size={size} />;
};

const SectionCard = ({ title, subtitle, children, rightSlot }) => (
    <div className="info-section" style={{ margin: 0 }}>
        <div
            style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 12,
                marginBottom: 16,
                flexWrap: 'wrap',
            }}
        >
            <div>
                <h2 className="section-title" style={{ marginBottom: subtitle ? 4 : 0 }}>
                    {title}
                </h2>
                {subtitle && (
                    <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>
                        {subtitle}
                    </p>
                )}
            </div>
            {rightSlot}
        </div>
        {children}
    </div>
);

const ReadonlyField = ({ label, value, icon: Icon, valueStyle = {} }) => (
    <div className="form-field">
        <label className="form-label">{label}</label>
        <div className="input-wrapper">
            {Icon ? <Icon className="input-icon" size={16} /> : null}
            <input
                type="text"
                value={value ?? ''}
                readOnly
                className="form-input"
                style={{ backgroundColor: '#f5f5f5', ...valueStyle }}
            />
        </div>
    </div>
);

const SummaryMetric = ({ label, value }) => (
    <div
        style={{
            padding: '14px 16px',
            borderRadius: 12,
            border: '1px solid #e5e7eb',
            backgroundColor: '#f9fafb',
        }}
    >
        <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 6 }}>{label}</div>
        <div
            style={{
                fontSize: 16,
                fontWeight: 700,
                color: '#111827',
                fontVariantNumeric: 'tabular-nums',
            }}
        >
            {value}
        </div>
    </div>
);

const ViewGoodReceiptNoteDetail = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { showToast } = useToastContext();

    const userInfo = authService.getUser();
    const permissionRole = getPermissionRole(getRawRoleFromUser(userInfo));

    const isAccountant = permissionRole === 'ACCOUNTANTS';
    const isDirector = permissionRole === 'DIRECTOR';
    const isPaymentEditor = isAccountant || isDirector;
    const isWarehouseKeeper = permissionRole === 'WAREHOUSE_KEEPER';

    const [loading, setLoading] = useState(true);
    const [grnData, setGrnData] = useState(null);
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [confirmDialogType, setConfirmDialogType] = useState('approve');
    const [includeReason, setIncludeReason] = useState(false);
    const [reasonText, setReasonText] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [isPaid, setIsPaid] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [trackingDialogOpen, setTrackingDialogOpen] = useState(false);

    useEffect(() => {
        if (grnData) {
            setIsPaid(grnData.isPaid ?? false);
            setPaymentMethod(grnData.paymentMethod || 'cash');
        }
    }, [grnData]);

    useEffect(() => {
        const fetchGRNDetail = async () => {
            if (!id) {
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                const data = await getGRNDetail(id);
                let poData = null;
                const purchaseOrderId = data?.PurchaseOrderId ?? data?.purchaseOrderId;
                if (purchaseOrderId) {
                    try {
                        poData = await getPurchaseOrderDetail(purchaseOrderId);
                    } catch {
                        poData = null;
                    }
                }

                if (data) {
                    const grnCode = data.GrnCode ?? data.grnCode;
                    const createdAt = data.CreatedAt ?? data.createdAt;
                    const receiptDate = data.ReceiptDate ?? data.receiptDate;
                    const rawLines = data.Lines ?? data.lines ?? [];
                    const mappedLines = Array.isArray(rawLines)
                        ? rawLines.map((line, idx) => ({
                            id: line.GrnlineId ?? line.grnlineId ?? idx,
                            itemId: line.ItemId ?? line.itemId,
                            itemName: line.ItemName ?? line.itemName ?? '',
                            itemCode: line.ItemCode ?? line.itemCode ?? '',
                            uom: line.UomName ?? line.uomName ?? '',
                            orderedQty: Number((line.ExpectedQty ?? line.expectedQty) || 0),
                            receivedQty: Number((line.ActualQty ?? line.actualQty) || 0),
                            unitPrice: Number((line.UnitPrice ?? line.unitPrice) ?? 0),
                            hasCO: line.HasCO ?? line.hasCO ?? false,
                            hasCQ: line.HasCQ ?? line.hasCQ ?? false,
                            note: (line.Note ?? line.note) || '',
                        }))
                        : [];

                    setGrnData({
                        grnId: data.GrnId ?? data.grnId,
                        grnCode,
                        referencePoCode: data.PurchaseOrderCode ?? data.purchaseOrderCode ?? '',
                        warehouseName: data.WarehouseName ?? data.warehouseName ?? '',
                        supplierName: data.SupplierName ?? data.supplierName ?? '',
                        supplierPhone: data.SupplierPhone ?? data.supplierPhone ?? '',
                        supplierEmail: data.SupplierEmail ?? data.supplierEmail ?? '',
                        supplierTaxCode: data.SupplierTaxCode ?? data.supplierTaxCode ?? '',
                        supplierAddress: buildSupplierAddress(data),
                        receiptDate: safeFormatDateOnly(receiptDate),
                        creatorName: data.CreatedByName ?? data.createdByName ?? '',
                        createdAt: safeFormatDateTime(createdAt),
                        status: String(data.Status ?? data.status ?? '').toUpperCase(),
                        isPaid: data.IsPaid ?? data.isPaid ?? false,
                        paymentMethod: (data.PaymentMethod ?? data.paymentMethod) || 'cash',
                        note: (data.Note ?? data.note) || '',
                        shippingFee: Number((data.ShippingFee ?? data.shippingFee) || 0),
                        totalAmount: Number((data.TotalAmount ?? data.totalAmount) || 0),
                        netAmount: Number((data.NetAmount ?? data.netAmount) || 0),
                        lines: mappedLines,
                        processHistory: [
                            ...buildPurchaseOrderHistory(poData),
                            ...buildGrnProcessHistory(data, grnCode),
                        ]
                            .filter(Boolean)
                            .sort((a, b) => new Date(b.at || 0).getTime() - new Date(a.at || 0).getTime()),
                    });
                }
            } catch (error) {
                console.error('Lỗi khi tải chi tiết GRN:', error);
                showToast(error?.response?.data?.message || 'Không thể tải thông tin phiếu nhập kho', 'error');
            } finally {
                setLoading(false);
            }
        };

        fetchGRNDetail();
    }, [id, showToast]);

    const handleBack = () => navigate(-1);

    const openConfirmDialog = (type) => {
        setConfirmDialogType(type);
        setConfirmDialogOpen(true);
        setIncludeReason(false);
        setReasonText('');
    };

    const closeConfirmDialog = () => {
        setConfirmDialogOpen(false);
        setIncludeReason(false);
        setReasonText('');
    };

    const handleConfirmAction = async () => {
        try {
            setSubmitting(true);
            const reason = includeReason ? reasonText.trim() : '';
            const isApprove = confirmDialogType === 'approve';

            if (isApprove) {
                await approveGoodReceiptNote(grnData.grnId, {
                    note: reason,
                    IsPaid: isPaid,
                    PaymentMethod: paymentMethod,
                });

                setGrnData((prev) => ({
                    ...prev,
                    status: 'APPROVED',
                    isPaid,
                    paymentMethod,
                }));
            } else {
                await rejectGoodReceiptNote(grnData.grnId, reason);
                setGrnData((prev) => ({
                    ...prev,
                    status: 'REJECTED',
                }));
            }

            showToast(
                isApprove
                    ? reason
                        ? `Đã duyệt phiếu nhập kho. Lý do: ${reason}`
                        : 'Đã duyệt phiếu nhập kho.'
                    : reason
                        ? `Đã hủy phiếu nhập kho. Lý do: ${reason}`
                        : 'Đã hủy phiếu nhập kho.',
                isApprove ? 'success' : 'info'
            );

            closeConfirmDialog();
        } catch (error) {
            console.error('Lỗi khi duyệt GRN:', error);
            showToast(error?.response?.data?.message || 'Có lỗi xảy ra.', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const normalizedStatus = String(grnData?.status || '').toUpperCase();
    const canReview = !['APPROVED', 'POSTED', 'REJECTED'].includes(normalizedStatus);
    const showApproveButton = isPaymentEditor && canReview;
    const showReturnButton =
        isPaymentEditor && ['APPROVED', 'POSTED'].includes(normalizedStatus);

    const handleApprove = () => openConfirmDialog('approve');
    const handleReject = () => openConfirmDialog('reject');

    const canConfirmAction = !submitting && (confirmDialogType !== 'reject' || includeReason);

    const calculatedSubtotal =
        grnData?.lines?.reduce(
            (sum, line) => sum + (Number(line.receivedQty) || 0) * (Number(line.unitPrice) || 0),
            0
        ) || 0;

    const totalQuantity =
        grnData?.lines?.reduce((sum, line) => sum + (Number(line.receivedQty) || 0), 0) || 0;

    const subtotal = Number(grnData?.totalAmount) || calculatedSubtotal;
    const grandTotal = Number(grnData?.netAmount) || subtotal + (grnData?.shippingFee || 0);
    const statusStyle = getStatusMeta(grnData?.status);

    if (loading) {
        return (
            <div
                className="create-supplier-page"
                style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    minHeight: '400px',
                }}
            >
                <Loader size={32} className="spinner" />
            </div>
        );
    }

    if (!grnData) {
        return (
            <div className="create-supplier-page" style={{ padding: '24px' }}>
                <div style={{ textAlign: 'center', color: '#6b7280' }}>Không tìm thấy phiếu nhập kho</div>
            </div>
        );
    }

    return (
        <div
            className="create-supplier-page"
            style={{
                minHeight: 0,
                height: 'auto',
                paddingBottom: 0,
                padding: 16,
            }}
        >
            <ConfirmDialog
                open={confirmDialogOpen}
                onClose={closeConfirmDialog}
                onConfirm={handleConfirmAction}
                title={confirmDialogType === 'approve' ? 'Xác nhận duyệt phiếu' : 'Xác nhận hủy phiếu'}
                confirmText="Xác nhận"
                cancelText="Hủy"
                loading={submitting}
                confirmDanger={confirmDialogType === 'reject'}
                confirmDisabled={!canConfirmAction}
                content={
                    <>
                        <div style={{ marginBottom: 16 }}>
                            <span style={{ fontSize: 14, color: '#4b5563' }}>
                                {confirmDialogType === 'approve'
                                    ? 'Bạn có chắc chắn muốn duyệt phiếu nhập kho này không?'
                                    : 'Bạn có chắc chắn muốn hủy phiếu nhập kho này không?'}
                            </span>
                        </div>

                        {confirmDialogType === 'approve' && isPaymentEditor && (
                            <>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, padding: 12, backgroundColor: '#f9fafb', borderRadius: 8 }}>
                                    <span style={{ fontSize: 14, fontWeight: 500, color: '#374151' }}>Đã thanh toán?</span>
                                    <Switch checked={isPaid} onChange={(e) => setIsPaid(e.target.checked)} disabled={submitting} />
                                </div>
                                {isPaid && (
                                    <div style={{ marginBottom: 16 }}>
                                        <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 8 }}>Phương thức thanh toán</label>
                                        <select
                                            value={paymentMethod}
                                            onChange={(e) => setPaymentMethod(e.target.value)}
                                            disabled={submitting}
                                            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, backgroundColor: '#fff' }}
                                        >
                                            <option value="cash">Tiền mặt</option>
                                            <option value="bank_transfer">Chuyển khoản</option>
                                            <option value="credit">Credit</option>
                                        </select>
                                    </div>
                                )}
                                <div style={{ marginBottom: 16, padding: 12, backgroundColor: '#fef3c7', borderRadius: 8, border: '1px solid #fcd34d' }}>
                                    <span style={{ fontSize: 13, color: '#92400e' }}>Sau khi duyệt, tồn kho sẽ được cập nhật và không thể hoàn tác.</span>
                                </div>
                            </>
                        )}

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, padding: 12, backgroundColor: '#f9fafb', borderRadius: 8 }}>
                            <span style={{ fontSize: 14, fontWeight: 500, color: '#374151' }}>Kèm lý do</span>
                            <Switch checked={includeReason} onChange={(e) => setIncludeReason(e.target.checked)} disabled={submitting} />
                        </div>

                        {confirmDialogType === 'reject' && (
                            <div style={{ marginBottom: 16, padding: 12, backgroundColor: '#fef3c7', borderRadius: 8, border: '1px solid #fcd34d' }}>
                                <span style={{ fontSize: 13, color: '#92400e' }}>Bắt buộc nhập lý do từ chối phiếu nhập kho.</span>
                            </div>
                        )}

                        {includeReason && (
                            <>
                                <TextField
                                    label="Lý do"
                                    multiline
                                    rows={3}
                                    fullWidth
                                    value={reasonText}
                                    onChange={(e) => setReasonText(e.target.value)}
                                    disabled={submitting}
                                    inputProps={{ maxLength: MAX_REASON_LENGTH }}
                                    placeholder={confirmDialogType === 'approve' ? 'Nhập lý do duyệt' : 'Nhập lý do hủy'}
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                                />
                                <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: 12, color: reasonText.length >= MAX_REASON_LENGTH ? '#ef4444' : '#6b7280', marginTop: 4 }}>
                                    {reasonText.length}/{MAX_REASON_LENGTH} ký tự
                                </div>
                            </>
                        )}
                    </>
                }
            />

            <div className="page-header">
                <div className="page-header-left">
                    <button type="button" onClick={handleBack} className="back-button">
                        <ArrowLeft size={20} />
                        <span>Quay lại</span>
                    </button>
                </div>

                <div
                    className="page-header-actions"
                    style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}
                >
                    {showApproveButton && (
                        <>
                            <button
                                type="button"
                                className="btn btn-cancel"
                                disabled={submitting}
                                onClick={handleReject}
                            >
                                <X size={15} />
                                Hủy phiếu
                            </button>
                            <button
                                type="button"
                                className="btn btn-primary"
                                disabled={submitting}
                                onClick={handleApprove}
                            >
                                <CheckCircle size={16} className="btn-icon" />
                                Duyệt phiếu
                            </button>
                        </>
                    )}
                    {showReturnButton && (
                        <button
                            type="button"
                            className="btn btn-sm"
                            onClick={() =>
                                navigate(`/purchase-returns/create?grnId=${grnData.grnId}`)
                            }
                        >
                            <RotateCcw size={15} />
                            Trả hàng
                        </button>
                    )}
                    {/* Neu la Thủ Kho - hien thi thong bao */}
                    {isWarehouseKeeper && (
                        <div
                            style={{
                                padding: '8px 16px',
                                backgroundColor: '#fef3c7',
                                borderRadius: '8px',
                                color: '#92400e',
                                fontSize: '13px',
                                fontWeight: 500,
                            }}
                        >
                            Bạn chỉ có quyền xem
                        </div>
                    )}
                </div>
            </div>

            <div className="form-card" style={{ marginBottom: 0, padding: 16 }}>
                <div className="form-wrapper" style={{ gap: 16 }}>
                    <div className="form-card-intro">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                            <div>
                                <h1 className="page-title" style={{ marginBottom: 0 }}>
                                    Chi tiết phiếu nhập kho
                                </h1>
                                <div className="grn-hero-code">
                                    <FileText size={14} />
                                    Mã phiếu: {grnData.grnCode || '-'}
                                </div>
                            </div>

                            <div
                                className="grn-status-pill"
                                style={{
                                    backgroundColor: statusStyle.bgColor,
                                    color: statusStyle.color,
                                }}
                            >
                                <StatusIcon status={grnData.status} size={16} />
                                {statusStyle.label}
                            </div>
                            <button type="button" className="btn btn-secondary" onClick={() => setTrackingDialogOpen(true)}>
                                <FileText size={15} />
                                Lịch Sử quy trình Nhập Kho
                            </button>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: 16, alignItems: 'flex-start' }}>
                        {/* Cột trái: Chi tiết sản phẩm + Ghi chú + Tóm tắt (cuối) */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div className="info-section" style={{ margin: 0, display: 'flex', flexDirection: 'column' }}>
                                <h2 className="section-title">Chi tiết sản phẩm nhập</h2>

                                {grnData.lines.length === 0 ? (
                                    <div className="grn-empty-state">
                                        Chưa có sản phẩm nào trong phiếu nhập kho.
                                    </div>
                                ) : (
                                    <div
                                        className="table-container"
                                        style={{
                                            overflowY: 'visible',
                                            overflowX: 'auto',
                                            height: 'auto',
                                            maxHeight: 'none',
                                            flex: '0 0 auto',
                                        }}
                                    >
                                        <table className="product-table">
                                            <thead>
                                                <tr>
                                                    <th style={{ width: 56 }}>STT</th>
                                                    <th>Sản phẩm</th>
                                                    <th style={{ width: 110 }}>ĐVT</th>
                                                    <th style={{ width: 110 }}>SL đặt</th>
                                                    <th style={{ width: 110 }}>SL nhập</th>
                                                    <th style={{ width: 130 }}>Đơn giá</th>
                                                    <th style={{ width: 150 }}>Thành tiền</th>
                                                    <th style={{ width: 70, textAlign: 'center' }}>CO</th>
                                                    <th style={{ width: 70, textAlign: 'center' }}>CQ</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {grnData.lines.map((line, index) => (
                                                    <tr key={line.id}>
                                                        <td style={{ textAlign: 'center' }}>
                                                            {index + 1}
                                                        </td>
                                                        <td>
                                                            <div
                                                                style={{
                                                                    display: 'flex',
                                                                    flexDirection: 'column',
                                                                    gap: 4,
                                                                }}
                                                            >
                                                                <span
                                                                    style={{
                                                                        fontSize: 14,
                                                                        fontWeight: 600,
                                                                        color: '#111827',
                                                                    }}
                                                                >
                                                                    {line.itemName || '-'}
                                                                </span>
                                                                <span
                                                                    style={{
                                                                        fontSize: 12,
                                                                        color: '#6b7280',
                                                                    }}
                                                                >
                                                                    Mã: {line.itemCode || '-'}
                                                                </span>
                                                                {line.note ? (
                                                                    <span
                                                                        style={{
                                                                            fontSize: 12,
                                                                            color: '#9ca3af',
                                                                        }}
                                                                    >
                                                                        Ghi chú: {line.note}
                                                                    </span>
                                                                ) : null}
                                                            </div>
                                                        </td>
                                                        <td
                                                            style={{
                                                                textAlign: 'center',
                                                                color: '#374151',
                                                            }}
                                                        >
                                                            {line.uom || '-'}
                                                        </td>
                                                        <td
                                                            style={{
                                                                textAlign: 'right',
                                                                fontVariantNumeric: 'tabular-nums',
                                                            }}
                                                        >
                                                            {Number(line.orderedQty) || 0}
                                                        </td>
                                                        <td
                                                            style={{
                                                                textAlign: 'right',
                                                                fontVariantNumeric: 'tabular-nums',
                                                                fontWeight: 700,
                                                                color: '#111827',
                                                            }}
                                                        >
                                                            {Number(line.receivedQty) || 0}
                                                        </td>
                                                        <td
                                                            style={{
                                                                textAlign: 'right',
                                                                fontVariantNumeric: 'tabular-nums',
                                                            }}
                                                        >
                                                            {formatCurrency(Number(line.unitPrice) || 0)}
                                                        </td>
                                                        <td
                                                            style={{
                                                                textAlign: 'right',
                                                                fontVariantNumeric: 'tabular-nums',
                                                                fontWeight: 700,
                                                                color: '#2196F3',
                                                            }}
                                                        >
                                                            {formatCurrency(
                                                                (Number(line.unitPrice) || 0) *
                                                                (Number(line.receivedQty) || 0)
                                                            )}
                                                        </td>
                                                        <td style={{ textAlign: 'center' }}>
                                                            <input
                                                                type="checkbox"
                                                                checked={!!line.hasCO}
                                                                readOnly
                                                                disabled
                                                                style={{
                                                                    width: 18,
                                                                    height: 18,
                                                                    cursor: 'default',
                                                                    margin: 0,
                                                                }}
                                                            />
                                                        </td>
                                                        <td style={{ textAlign: 'center' }}>
                                                            <input
                                                                type="checkbox"
                                                                checked={!!line.hasCQ}
                                                                readOnly
                                                                disabled
                                                                style={{
                                                                    width: 18,
                                                                    height: 18,
                                                                    cursor: 'default',
                                                                    margin: 0,
                                                                }}
                                                            />
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            <SectionCard
                                title="Ghi chú"
                                subtitle="Nội dung ghi chú hoặc lý do nhập kho của chứng từ"
                            >
                                <div className="grn-note-box">
                                    {grnData.note?.trim() || 'Không có ghi chú.'}
                                </div>
                            </SectionCard>

                            <SectionCard
                                title="Tóm tắt đơn hàng"
                                subtitle="Giá trị nhanh của phiếu nhập kho"
                            >
                                <div className="grn-summary-grid">
                                    <SummaryMetric
                                        label="Tổng số lượng"
                                        value={`${totalQuantity} sản phẩm`}
                                    />
                                    <SummaryMetric
                                        label="Tạm tính"
                                        value={formatCurrency(subtotal)}
                                    />
                                </div>

                                <div
                                    style={{
                                        marginTop: 12,
                                        padding: '14px 16px',
                                        borderRadius: 12,
                                        border: '1px solid #e5e7eb',
                                        backgroundColor: '#f9fafb',
                                    }}
                                >
                                    <div
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            gap: 12,
                                            fontSize: 14,
                                            color: '#374151',
                                        }}
                                    >
                                        <span>Phí vận chuyển</span>
                                        <span
                                            style={{
                                                fontWeight: 700,
                                                fontVariantNumeric: 'tabular-nums',
                                            }}
                                        >
                                            {formatCurrency(grnData.shippingFee || 0)}
                                        </span>
                                    </div>
                                </div>

                                <div
                                    style={{
                                        marginTop: 16,
                                        padding: '18px 16px',
                                        backgroundColor: '#e3f2fd',
                                        borderRadius: 14,
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        gap: 12,
                                        borderLeft: '4px solid #2196F3',
                                    }}
                                >
                                    <span
                                        style={{
                                            fontSize: 16,
                                            fontWeight: 700,
                                            color: '#2196F3',
                                        }}
                                    >
                                        Tổng giá trị
                                    </span>
                                    <span
                                        style={{
                                            fontSize: 22,
                                            fontWeight: 800,
                                            color: '#2196F3',
                                            fontVariantNumeric: 'tabular-nums',
                                        }}
                                    >
                                        {formatCurrency(grandTotal)}
                                    </span>
                                </div>
                            </SectionCard>
                        </div>

                        {/* Cột phải: Thông tin chung + Lịch sử */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div className="info-section" style={{ margin: 0 }}>
                                <h2 className="section-title">Thông tin chung</h2>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div className="form-field">
                                        <label className="form-label">Nhân viên tạo</label>
                                        <div className="input-wrapper">
                                            <User className="input-icon" size={16} />
                                            <input type="text" value={grnData.creatorName || ''} readOnly className="form-input" style={{ backgroundColor: '#f5f5f5' }} />
                                        </div>

                                        {grnData.supplierPhone && (
                                            <div className="form-field">
                                                <label className="form-label">Số điện thoại</label>
                                                <div className="input-wrapper">
                                                    <input
                                                        type="text"
                                                        value={grnData.supplierPhone || '-'}
                                                        readOnly
                                                        className="form-input"
                                                        style={{ backgroundColor: '#f5f5f5' }}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {grnData.supplierEmail && (
                                            <div className="form-field">
                                                <label className="form-label">Email</label>
                                                <div className="input-wrapper">
                                                    <input
                                                        type="text"
                                                        value={grnData.supplierEmail || '-'}
                                                        readOnly
                                                        className="form-input"
                                                        style={{ backgroundColor: '#f5f5f5' }}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {grnData.supplierTaxCode && (
                                            <div className="form-field">
                                                <label className="form-label">Mã số thuế</label>
                                                <div className="input-wrapper">
                                                    <input
                                                        type="text"
                                                        value={grnData.supplierTaxCode || '-'}
                                                        readOnly
                                                        className="form-input"
                                                        style={{ backgroundColor: '#f5f5f5' }}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {grnData.supplierAddress && (
                                            <div className="form-field">
                                                <label className="form-label">Địa chỉ</label>
                                                <div className="input-wrapper">
                                                    <input
                                                        type="text"
                                                        value={grnData.supplierAddress || '-'}
                                                        readOnly
                                                        className="form-input"
                                                        style={{ backgroundColor: '#f5f5f5' }}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <ReadonlyField
                                        label="Nhân viên tạo"
                                        value={grnData.creatorName || '-'}
                                        icon={User}
                                    />
                                    <ReadonlyField
                                        label="Kho nhập"
                                        value={grnData.warehouseName || '-'}
                                        icon={MapPin}
                                    />
                                    <ReadonlyField
                                        label="Ngày nhập"
                                        value={grnData.receiptDate || '-'}
                                        icon={Calendar}
                                    />
                                    <ReadonlyField
                                        label="Ngày tạo"
                                        value={grnData.createdAt || '-'}
                                        icon={Calendar}
                                    />
                                    <ReadonlyField
                                        label="Yêu cầu nhập hàng tham chiếu"
                                        value={grnData.referencePoCode || '-'}
                                        icon={FileText}
                                    />

                                    {/* Ẩn tạm: trạng thái & phương thức thanh toán trên GRN detail
                                    <div className="form-field">
                                        <label className="form-label">Trạng thái thanh toán</label>
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                minHeight: 44,
                                            }}
                                        >
                                            <span
                                                className="grn-payment-pill"
                                                style={{
                                                    backgroundColor: grnData.isPaid
                                                        ? '#d1fae5'
                                                        : '#fef3c7',
                                                    color: grnData.isPaid
                                                        ? '#059669'
                                                        : '#d97706',
                                                }}
                                            >
                                                {grnData.isPaid
                                                    ? 'Đã thanh toán'
                                                    : 'Chưa thanh toán'}
                                            </span>
                                        </div>
                                    </div>

                                    {grnData.isPaid && grnData.paymentMethod && (
                                        <ReadonlyField
                                            label="Phương thức thanh toán"
                                            value={getPaymentMethodLabel(grnData.paymentMethod)}
                                            icon={CreditCard}
                                        />
                                    )}
                                    */}
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>

            <Dialog open={trackingDialogOpen} onClose={() => setTrackingDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Lịch Sử quy trình Nhập Kho</DialogTitle>
                <DialogContent dividers>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {grnData.processHistory?.length ? grnData.processHistory.map((event, i) => (
                            <div key={`${event.source}-${event.type}-${event.at}-${i}`} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                                <div
                                    style={{
                                        width: 20,
                                        height: 20,
                                        borderRadius: '50%',
                                        backgroundColor:
                                            event.type === 'rejected'
                                                ? '#dc2626'
                                                : event.type === 'submitted'
                                                    ? '#f59e0b'
                                                    : event.type === 'completed'
                                                        ? '#16a34a'
                                                        : '#2563eb',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                        marginTop: 2,
                                    }}
                                >
                                    {event.type === 'rejected' ? (
                                        <XCircle size={12} color="#fff" />
                                    ) : event.type === 'submitted' ? (
                                        <Send size={12} color="#fff" />
                                    ) : (
                                        <CheckCircle size={12} color="#fff" />
                                    )}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
                                        {event.title}
                                        {event.note ? (
                                            <span style={{ fontWeight: 400, color: '#6b7280' }}> — {event.note}</span>
                                        ) : null}
                                    </div>
                                    <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
                                        {event.actor ? `${event.actor} • ` : ''}
                                        {event.at ? formatDateTime(event.at) : 'Đang cập nhật'}
                                        {event.source ? ` • ${event.source}` : ''}
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <div className="grn-empty-state" style={{ padding: 0 }}>
                                Chưa có lịch sử quy trình nhập kho.
                            </div>
                        )}
                    </div>
                </DialogContent>
                <DialogActions>
                    <button type="button" className="btn btn-secondary" onClick={() => setTrackingDialogOpen(false)}>
                        Đóng
                    </button>
                </DialogActions>
            </Dialog>
        </div>
    );
};

export default ViewGoodReceiptNoteDetail;