/**
 * ViewGoodReceiptNoteDetail - Chi tiết phiếu nhập kho
 * Kế toán: có thể duyệt/từ chối
 * Thủ Kho: chỉ xem (readonly)
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Switch,
    TextField,
} from '@mui/material';
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
    X,
    Edit,
    Save,
    Loader,
    Plus,
    RotateCcw,
    CreditCard,
} from 'lucide-react';
import Toast from '../../components/Toast/Toast';
import { useToast } from '../hooks/useToast';
import authService from '../lib/authService';
import { getPermissionRole, getRawRoleFromUser } from '../permissions/roleUtils';
import { getGRNDetail, approveGRN } from '../lib/goodReceiptNoteService';
import '../styles/CreateSupplier.css';

const MAX_REASON_LENGTH = 250;

// Mock GRN data for "Trả hàng" flow
const MOCK_GRNS_FOR_RETURN = [
    {
        id: 1,
        grnCode: 'GRN-2026-001',
        supplierId: 101,
        supplierName: 'Công ty TNHH Vật tư ABC',
        warehouseId: 11,
        warehouseName: 'Kho Hà Nội',
        createdDate: '2026-02-15',
        supplierPhone: '024.12345678',
        supplierEmail: 'abc@vattu.com',
        supplierTaxCode: '0101234567',
        supplierAddressProvince: 'Hà Nội',
        supplierAddressDistrict: 'Quận Cầu Giấy',
        supplierAddressWard: 'Phường Mai Dịch',
        supplierAddressStreet: 'Số 123 Đường Nguyễn Phong Sắc',
        lines: [
            { grnLineId: 1, productId: 1, sku: 'PEN-001', productName: 'Bút bi Thiên Long TL-057', uom: 'Cây', receivedQty: 50, unitPrice: 3500 },
            { grnLineId: 2, productId: 2, sku: 'NOTE-001', productName: 'Vở note 5 chấm A5', uom: 'Quyển', receivedQty: 20, unitPrice: 22000 },
            { grnLineId: 3, productId: 3, sku: 'PAPER-001', productName: 'Giấy A4 Double A 80gsm', uom: 'Ram', receivedQty: 10, unitPrice: 62000 },
        ],
    },
    {
        id: 2,
        grnCode: 'GRN-2026-002',
        supplierId: 102,
        supplierName: 'Công ty CP Thương mại XYZ',
        warehouseId: 12,
        warehouseName: 'Kho TP.HCM',
        createdDate: '2026-02-20',
        supplierPhone: '028.98765432',
        supplierEmail: 'xyz@thuongmai.com',
        supplierTaxCode: '0109876543',
        supplierAddressProvince: 'TP.HCM',
        supplierAddressDistrict: 'Quận 1',
        supplierAddressWard: 'Phường Bến Nghé',
        supplierAddressStreet: 'Số 456 Đường Lê Duẩn',
        lines: [
            { grnLineId: 4, productId: 4, sku: 'CLIP-001', productName: 'Kẹp giấy 33mm (hộp 50 cái)', uom: 'Hộp', receivedQty: 30, unitPrice: 18000 },
            { grnLineId: 5, productId: 5, sku: 'GLUE-001', productName: 'Keo dán thiên long 15g', uom: 'Tuýp', receivedQty: 15, unitPrice: 7000 },
        ],
    },
];

// Mock GRN detail for view
const MOCK_GRN_DETAIL = {
    grnId: 1,
    grnCode: 'GRN-2026-001',
    purchaseOrderCode: 'PO-2026-001',
    warehouseName: 'Kho Hà Nội',
    supplierName: 'Công ty TNHH Vật tư ABC',
    receiptDate: '2026-02-15',
    createdByName: 'Nguyễn Văn A',
    createdAt: '2026-02-15T08:00:00',
    status: 'POSTED',
    purchaseOrderLifecycleStatus: 'FullRcv',
    isPaid: true,
    paymentMethod: 'bank_transfer',
    note: 'Nhập hàng đúng quy cách',
    shippingFee: 50000,
    totalAmount: 0,
    netAmount: 0,
    lines: [
        { grnlineId: 1, itemId: 1, itemName: 'Bút bi Thiên Long TL-057', itemCode: 'PEN-001', uomName: 'Cây', expectedQty: 50, actualQty: 50, unitPrice: 3500, hasCO: true, hasCQ: true, note: '' },
        { grnlineId: 2, itemId: 2, itemName: 'Vở note 5 chấm A5', itemCode: 'NOTE-001', uomName: 'Quyển', expectedQty: 20, actualQty: 20, unitPrice: 22000, hasCO: false, hasCQ: true, note: '' },
        { grnlineId: 3, itemId: 3, itemName: 'Giấy A4 Double A 80gsm', itemCode: 'PAPER-001', uomName: 'Ram', expectedQty: 10, actualQty: 10, unitPrice: 62000, hasCO: true, hasCQ: false, note: '' },
    ],
    postedAt: '2026-02-15T10:00:00',
    submittedAt: '2026-02-15T09:00:00',
};

const formatCurrency = (value) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value) || 0);

const getPaymentMethodLabel = (method) => {
    const methodMap = {
        'cash': 'Tiền mặt',
        'bank_transfer': 'Chuyển khoản',
        'credit_card': 'Thẻ tín dụng',
        'other': 'Khác',
    };
    return methodMap[method?.toLowerCase()] || method || '-';
};

const STATUS_STYLE = {
    Draft: { bgColor: 'rgba(107,114,128,0.15)', label: 'Nháp', dot: '•', color: '#4b5563' },
    Submitted: { bgColor: 'rgba(59,130,246,0.15)', label: 'Đã gửi duyệt', dot: '•', color: '#1d4ed8' },
    PENDING_ACC: { bgColor: 'rgba(245,158,11,0.15)', label: 'Chờ duyệt', dot: '•', color: '#d97706' },
    APPROVED: { bgColor: 'rgba(16,185,129,0.18)', label: 'Đã duyệt', dot: '•', color: '#047857' },
    POSTED: { bgColor: 'rgba(139,92,246,0.15)', label: 'Đã ghi sổ', dot: '•', color: '#6d28d9' },
    REJECTED: { bgColor: 'rgba(239,68,68,0.15)', label: 'Từ chối', dot: '•', color: '#b91c1c' },
};

const ViewGoodReceiptNoteDetail = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { toast, showToast, clearToast } = useToast();

    // Lay thong tin user va quyen
    const userInfo = authService.getUser();
    const permissionRole = getPermissionRole(getRawRoleFromUser(userInfo));

    // Ke toan: co the duyet GRN
    // Thủ Kho: chi xem (readonly)
    const isAccountant = permissionRole === 'ACCOUNTANTS';
    const isWarehouseKeeper = permissionRole === 'WAREHOUSE_KEEPER';
    const isReadOnly = isWarehouseKeeper;

    const [loading, setLoading] = useState(true);
    const [grnData, setGrnData] = useState(null);
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [confirmDialogType, setConfirmDialogType] = useState('approve');
    const [includeReason, setIncludeReason] = useState(false);
    const [reasonText, setReasonText] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [isPaid, setIsPaid] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('cash');

    // Sync isPaid & paymentMethod khi grnData load xong
    useEffect(() => {
        if (grnData) {
            setIsPaid(grnData.isPaid ?? false);
            setPaymentMethod(grnData.paymentMethod || 'cash');
        }
    }, [grnData]);

    // Load GRN detail from API
    useEffect(() => {
        const fetchGRNDetail = async () => {
            if (!id) {
                setLoading(false);
                return;
            }
        setLoading(true);
            try {
                // TODO: Uncomment when backend is ready
                // const data = await getGRNDetail(id);

                // Mock data fallback
                const data = MOCK_GRN_DETAIL;

                if (data) {
            setGrnData({
                        grnId: data.grnId,
                        grnCode: data.grnCode,
                        referencePoCode: data.purchaseOrderCode,
                        warehouseName: data.warehouseName,
                        supplierName: data.supplierName,
                        receiptDate: data.receiptDate,
                        creatorName: data.createdByName,
                        createdAt: data.createdAt ? new Date(data.createdAt).toLocaleString('vi-VN') : '',
                        status: data.status,
                        purchaseOrderLifecycleStatus: data.purchaseOrderLifecycleStatus || data.purchaseOrder?.lifecycleStatus,
                        isPaid: data.isPaid ?? false,
                        paymentMethod: data.paymentMethod || 'cash',
                        note: data.note || '',
                        shippingFee: data.shippingFee || 0,
                        totalAmount: data.totalAmount || 0,
                        netAmount: data.netAmount || 0,
                        lines: (data.lines || []).map(line => ({
                            id: line.grnlineId,
                            itemId: line.itemId,
                            itemName: line.itemName,
                            itemCode: line.itemCode,
                            uom: line.uomName,
                            orderedQty: line.expectedQty,
                            receivedQty: line.actualQty,
                            unitPrice: line.unitPrice,
                            hasCO: line.hasCO,
                            hasCQ: line.hasCQ,
                            note: line.note || '',
                        })),
                history: [
                            data.postedAt ? { action: 'Đã ghi sổ phiếu nhập kho', date: new Date(data.postedAt).toLocaleDateString('vi-VN'), time: new Date(data.postedAt).toLocaleTimeString('vi-VN') } : null,
                            data.submittedAt ? { action: 'Gửi yêu cầu duyệt phiếu', date: new Date(data.submittedAt).toLocaleDateString('vi-VN'), time: new Date(data.submittedAt).toLocaleTimeString('vi-VN') } : null,
                            { action: `Tạo mới phiếu nhập kho ${data.grnCode}`, date: new Date(data.createdAt).toLocaleDateString('vi-VN'), time: new Date(data.createdAt).toLocaleTimeString('vi-VN') },
                        ].filter(Boolean),
                    });
                }
            } catch (error) {
                console.error('Lỗi khi tải chi tiết GRN:', error);
                showToast('Không thể tải thông tin phiếu nhập kho', 'error');
            } finally {
            setLoading(false);
            }
        };

        fetchGRNDetail();
    }, [id]);

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
                await approveGRN(grnData.grnId, {
                    note: reason,
                    isPaid: isPaid,
                    paymentMethod: paymentMethod,
                });
            }

            setGrnData((prev) => ({
                ...prev,
                status: isApprove ? 'POSTED' : 'REJECTED',
            }));

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

    // Kiểm tra điều kiện hiển thị nút
    // GRN đã được duyệt/từ chối/ghi sổ → hiện Trả hàng, ẩn Duyệt/Hủy
    const isGRNFinalized = ['APPROVED', 'REJECTED', 'POSTED'].includes(grnData?.status);
    const isPOFullyReceived = grnData?.purchaseOrderLifecycleStatus === 'FullRcv';
    const showReturnButton = isAccountant && isGRNFinalized && isPOFullyReceived;
    const showApproveButton = isAccountant && !isGRNFinalized;
    // Hiện nút Trả hàng cho mọi role (nếu chưa có nút Trả hàng ở trên)
    const showGeneralReturnButton = !showReturnButton && grnData?.grnId;

    const handleApprove = () => openConfirmDialog('approve');
    const handleReject = () => openConfirmDialog('reject');

    const canConfirmAction = !submitting && (!includeReason || reasonText.trim().length > 0);

    // Tính toán tổng
    const totalQuantity = grnData?.lines?.reduce((sum, line) => sum + (Number(line.receivedQty) || 0), 0) || 0;
    const subtotal = grnData?.lines?.reduce((sum, line) => sum + ((Number(line.receivedQty) || 0) * (Number(line.unitPrice) || 0)), 0) || 0;
    const grandTotal = subtotal + (grnData?.shippingFee || 0);

    const statusStyle = STATUS_STYLE[grnData?.status] || {
        bgColor: 'rgba(107,114,128,0.15)',
        label: grnData?.status || '-',
        dot: '•',
        color: '#4b5563',
    };

    if (loading) {
        return (
            <div className="create-supplier-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                <Loader size={32} className="spinner" />
            </div>
        );
    }

    if (!grnData) {
        return (
            <div className="create-supplier-page" style={{ padding: '24px' }}>
                <div style={{ textAlign: 'center', color: '#6b7280' }}>
                    Không tìm thấy phiếu nhập kho
                </div>
            </div>
        );
    }

    return (
        <div className="create-supplier-page">
            {/* Dialog xác nhận duyệt/hủy */}
            <Dialog
                open={confirmDialogOpen}
                onClose={closeConfirmDialog}
                fullWidth
                maxWidth="sm"
                disableEscapeKeyDown={submitting}
                PaperProps={{
                    sx: {
                        width: '100%',
                        maxWidth: '620px',
                        borderRadius: '16px',
                        border: '1px solid #e5e7eb',
                        boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)',
                        overflow: 'hidden',
                        m: 2,
                    },
                }}
            >
                <DialogTitle sx={{ fontWeight: 700, color: '#111827', borderBottom: '1px solid #eef2f7' }}>
                    {confirmDialogType === 'approve' ? 'Xác nhận duyệt phiếu' : 'Xác nhận hủy phiếu'}
                </DialogTitle>
                <DialogContent sx={{ px: 3, py: 2 }}>
                    <div style={{ marginBottom: '16px' }}>
                        <span style={{ fontSize: '14px', color: '#4b5563' }}>
                            {confirmDialogType === 'approve'
                                ? 'Bạn có chắc chắn muốn duyệt phiếu nhập kho này không?'
                                : 'Bạn có chắc chắn muốn hủy phiếu nhập kho này không?'}
                        </span>
                    </div>

                    {/* Thanh toán - chỉ hiện khi duyệt & Kế Toán mới được xác nhận */}
                    {confirmDialogType === 'approve' && isAccountant && (
                        <>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                                <span style={{ fontSize: '14px', fontWeight: 500, color: '#374151' }}>Đã thanh toán?</span>
                                <Switch checked={isPaid} onChange={(e) => setIsPaid(e.target.checked)} disabled={submitting} />
                            </div>

                            {isPaid && (
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '8px' }}>Phương thức thanh toán</label>
                                    <select
                                        value={paymentMethod}
                                        onChange={(e) => setPaymentMethod(e.target.value)}
                                        disabled={submitting}
                                        style={{
                                            width: '100%',
                                            padding: '10px 12px',
                                            borderRadius: '8px',
                                            border: '1px solid #d1d5db',
                                            fontSize: '14px',
                                            backgroundColor: '#fff',
                                        }}
                                    >
                                        <option value="cash">Tiền mặt</option>
                                        <option value="bank_transfer">Chuyển khoản</option>
                                        <option value="credit">Credit</option>
                                    </select>
                                </div>
                            )}

                            <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#fef3c7', borderRadius: '8px', border: '1px solid #fcd34d' }}>
                                <span style={{ fontSize: '13px', color: '#92400e' }}>
                                    Sau khi duyệt, tồn kho sẽ được cập nhật và không thể hoàn tác.
                                </span>
                            </div>
                        </>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 500, color: '#374151' }}>Kèm lý do</span>
                        <Switch checked={includeReason} onChange={(e) => setIncludeReason(e.target.checked)} disabled={submitting} />
                    </div>
                    {includeReason && (
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
                    )}
                    {includeReason && (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '12px', color: reasonText.length >= MAX_REASON_LENGTH ? '#ef4444' : '#6b7280', marginTop: '4px' }}>
                            {reasonText.length}/{MAX_REASON_LENGTH} ký tự
                        </div>
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #eef2f7' }}>
                    <Button onClick={closeConfirmDialog} disabled={submitting} sx={{ textTransform: 'none', fontWeight: 600, color: '#6b7280' }}>Hủy</Button>
                    <Button
                        variant="contained"
                        onClick={handleConfirmAction}
                        disabled={!canConfirmAction}
                        sx={{
                            minWidth: '110px',
                            height: 40,
                            px: 2,
                            borderRadius: '12px',
                            textTransform: 'none',
                            fontSize: '14px',
                            fontWeight: 700,
                            backgroundColor: confirmDialogType === 'approve' ? '#0ea5e9' : '#ef4444',
                            boxShadow: 'none',
                            '&:hover': { backgroundColor: confirmDialogType === 'approve' ? '#0284c7' : '#dc2626', boxShadow: 'none' },
                            '&:disabled': { backgroundColor: '#bae6fd', color: '#ffffff' },
                        }}
                    >
                        {submitting ? 'Đang xử lý...' : 'Xác nhận'}
                    </Button>
                </DialogActions>
            </Dialog>

            <div className="page-header">
                <div className="page-header-left">
                    <button type="button" onClick={handleBack} className="back-button">
                        <ArrowLeft size={20} />
                        <span>Quay lại</span>
                    </button>
                </div>
                <div className="page-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Chi Kế toán & GRN chưa finalized mới thấy nút duyệt/từ chối */}
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
                    {/* Nut tra hang */}
                    {showReturnButton && (
                            <button
                                type="button"
                                className="btn btn-secondary"
                            onClick={() => navigate(`/purchase-returns/create?grnId=${grnData?.grnId}&grnCode=${grnData?.grnCode}`)}
                                disabled={submitting}
                            style={{ backgroundColor: '#f59e0b', borderColor: '#f59e0b', color: '#fff' }}
                            >
                            <RotateCcw size={16} className="btn-icon" />
                            Trả hàng
                            </button>
                    )}

                    {/* Nút Trả hàng cho các role khác */}
                    {showGeneralReturnButton && (
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => navigate(`/purchase-returns/create?grnId=${grnData?.grnId}&grnCode=${grnData?.grnCode}`)}
                            disabled={submitting}
                            style={{ backgroundColor: '#f59e0b', borderColor: '#f59e0b', color: '#fff' }}
                        >
                            <RotateCcw size={16} className="btn-icon" />
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

            <div className="form-card">
                <div className="form-wrapper">
                    <div className="form-card-intro">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                            <div>
                                <h1 className="page-title">Chi tiết phiếu nhập kho</h1>
                                <p style={{ fontSize: '14px', color: '#6b7280', margin: '8px 0 0 0' }}>
                                    MÃ PHIẾU:{' '}
                                    <span style={{ fontWeight: 600, color: '#2196F3' }}>{grnData.grnCode}</span>
                                </p>
                            </div>
                                <div
                                    style={{
                                        padding: '8px 16px',
                                        borderRadius: 20,
                                        backgroundColor: statusStyle.bgColor,
                                        color: statusStyle.color,
                                        fontWeight: 600,
                                        fontSize: '13px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                    }}
                                >
                                {grnData.status === 'APPROVED' && <CheckCircle size={16} />}
                                {grnData.status === 'REJECTED' && <XCircle size={16} />}
                                {grnData.status === 'PENDING_ACC' && <Clock size={16} />}
                                    {statusStyle.label}
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px', alignItems: 'flex-start' }}>
                        {/* Cột trái: Chi tiết sản phẩm nhập */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <div className="info-section" style={{ margin: 0, display: 'flex', flexDirection: 'column' }}>
                                <h2 className="section-title">Chi tiết sản phẩm nhập</h2>

                            {grnData.lines.length === 0 ? (
                                    <div style={{ padding: '24px 12px', textAlign: 'center', color: '#6b7280', fontSize: 14 }}>
                                        Chưa có sản phẩm nào trong phiếu nhập kho.
                                </div>
                            ) : (
                                    <div className="table-container" style={{ flex: 1, maxHeight: '500px', overflowY: 'auto' }}>
                                    <table className="product-table">
                                        <thead>
                                            <tr>
                                                <th style={{ width: '40px' }}>STT</th>
                                                <th>Sản phẩm</th>
                                                <th style={{ width: '110px' }}>SL đặt</th>
                                                <th style={{ width: '110px' }}>SL nhập</th>
                                                <th style={{ width: '130px' }}>Đơn giá</th>
                                                <th style={{ width: '150px' }}>Thành tiền</th>
                                                <th style={{ width: '80px', textAlign: 'center' }}>CO</th>
                                                <th style={{ width: '80px', textAlign: 'center' }}>CQ</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {grnData.lines.map((line, index) => (
                                                <tr key={line.id}>
                                                    <td style={{ textAlign: 'center' }}>{index + 1}</td>
                                                    <td>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                                <span style={{ fontSize: 14, fontWeight: 500 }}>{line.itemName}</span>
                                                                <span style={{ fontSize: 12, color: '#6b7280' }}>Mã: {line.itemCode || '-'}</span>
                                                        </div>
                                                    </td>
                                                        <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{Number(line.orderedQty) || 0}</td>
                                                        <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{Number(line.receivedQty) || 0}</td>
                                                        <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(Number(line.unitPrice) || 0)}</td>
                                                        <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: '#2196F3' }}>
                                                            {formatCurrency((Number(line.unitPrice) || 0) * (Number(line.receivedQty) || 0))}
                                                    </td>
                                                        <td style={{ textAlign: 'center' }}>
                                                            <input type="checkbox" checked={!!line.hasCO} readOnly disabled style={{ width: 18, height: 18, cursor: 'default', margin: 0 }} />
                                                    </td>
                                                        <td style={{ textAlign: 'center' }}>
                                                            <input type="checkbox" checked={!!line.hasCQ} readOnly disabled style={{ width: 18, height: 18, cursor: 'default', margin: 0 }} />
                                                        </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                        </div>       

                        {/* Cột phải: Thông tin chung + Lịch sử */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <div className="info-section" style={{ margin: 0 }}>
                                    <h2 className="section-title">Thông tin chung</h2>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div className="form-field">
                                        <label className="form-label">Nhân viên tạo</label>
                                        <div className="input-wrapper">
                                            <User className="input-icon" size={16} />
                                            <input type="text" value={grnData.creatorName || ''} readOnly className="form-input" style={{ backgroundColor: '#f5f5f5' }} />
                                        </div>
                                    </div>
                                    <div className="form-field">
                                        <label className="form-label">Kho nhập</label>
                                        <div className="input-wrapper">
                                            <MapPin className="input-icon" size={16} />
                                            <input type="text" value={grnData.warehouseName || ''} readOnly className="form-input" style={{ backgroundColor: '#f5f5f5' }} />
                                        </div>
                                    </div>
                                    <div className="form-field">
                                        <label className="form-label">Ngày nhập</label>
                                        <div className="input-wrapper">
                                            <Calendar className="input-icon" size={16} />
                                            <input type="text" value={grnData.receiptDate || ''} readOnly className="form-input" style={{ backgroundColor: '#f5f5f5' }} />
                                        </div>
                                    </div>
                                    <div className="form-field">
                                        <label className="form-label">Ngày tạo</label>
                                        <div className="input-wrapper">
                                            <Calendar className="input-icon" size={16} />
                                            <input type="text" value={grnData.createdAt || ''} readOnly className="form-input" style={{ backgroundColor: '#f5f5f5' }} />
                                        </div>
                                    </div>
                                    <div className="form-field">
                                        <label className="form-label">Đơn mua tham chiếu</label>
                                        <div className="input-wrapper">
                                            <FileText className="input-icon" size={16} />
                                            <input type="text" value={grnData.referencePoCode || ''} readOnly className="form-input" style={{ backgroundColor: '#f5f5f5' }} />
                                        </div>
                                    </div>
                                    
                                    {/* Thông tin thanh toán - chỉ hiển thị khi đã có dữ liệu */}
                                    {(grnData.isPaid !== undefined || grnData.paymentMethod) && (
                                        <>
                                            <div className="form-field">
                                                <label className="form-label">Trạng thái thanh toán</label>
                                                <div className="input-wrapper">
                                                    <span style={{
                                                        padding: '4px 12px',
                                                        borderRadius: '16px',
                                                        fontSize: '13px',
                                                        fontWeight: 500,
                                                        backgroundColor: grnData.isPaid ? '#d1fae5' : '#fef3c7',
                                                        color: grnData.isPaid ? '#059669' : '#d97706',
                                                    }}>
                                                        {grnData.isPaid ? 'Đã thanh toán' : 'Chưa thanh toán'}
                                                    </span>
                                                </div>
                                            </div>
                                            {grnData.isPaid && grnData.paymentMethod && (
                                                <div className="form-field">
                                                    <label className="form-label">Phương thức thanh toán</label>
                                                    <div className="input-wrapper">
                                                        <CreditCard className="input-icon" size={16} />
                                                        <input type="text" value={getPaymentMethodLabel(grnData.paymentMethod)} readOnly className="form-input" style={{ backgroundColor: '#f5f5f5' }} />
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="info-section" style={{ margin: 0 }}>
                                    <h2 className="section-title">Lịch sử phiếu nhập</h2>
                                <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {grnData.history?.map((item, index) => (
                                            <div key={index} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                                <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: index === 0 ? '#2196F3' : '#9ca3af', marginTop: '6px', flexShrink: 0 }}></div>
                                                <div style={{ flex: 1, borderLeft: index < grnData.history.length - 1 ? '2px solid #e5e7eb' : 'none', paddingLeft: '16px', paddingBottom: index < grnData.history.length - 1 ? '12px' : '0' }}>
                                                    <div style={{ fontSize: '13px', fontWeight: 500, color: '#111827', marginBottom: '2px' }}>{item.action}</div>
                                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                        <span style={{ fontSize: '12px', color: '#6b7280' }}>{item.date}</span>
                                                        <span style={{ fontSize: '12px', color: '#9ca3af' }}>|</span>
                                                        <span style={{ fontSize: '12px', color: '#6b7280' }}>{item.time}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px', alignItems: 'start', marginTop: 24 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <div className="info-section" style={{ margin: 0 }}>
                                    <h2 className="section-title">Nhà cung cấp</h2>
                                <div className="form-field">
                                    <label className="form-label">Nhà cung cấp</label>
                                    <div className="input-wrapper">
                                        <Package className="input-icon" size={16} />
                                        <input type="text" value={grnData.supplierName || ''} readOnly className="form-input" style={{ backgroundColor: '#f5f5f5' }} />
                                    </div>
                                </div>
                            </div>

                            <div className="info-section" style={{ margin: 0 }}>
                                    <h2 className="section-title">Ghi chú</h2>
                                <div className="form-field">
                                    <label className="form-label">Ghi chú / Lý do nhập kho</label>
                                    <textarea value={grnData.note || ''} readOnly rows={4} className="form-input" style={{ resize: 'vertical', backgroundColor: '#f5f5f5' }} />
                                </div>
                            </div>

                            <div className="info-section" style={{ margin: 0 }}>
                                    <h2 className="section-title">Tổng hợp đơn hàng</h2>
                                    <div className="form-grid">
                                        <div className="form-field">
                                        <label className="form-label">Tổng số lượng</label>
                                        <div style={{ padding: '10px', backgroundColor: '#f5f5f5', borderRadius: 8, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                                            {totalQuantity} sản phẩm
                                            </div>
                                        </div>
                                        <div className="form-field">
                                            <label className="form-label">Tạm tính</label>
                                        <div style={{ padding: '10px', backgroundColor: '#f5f5f5', borderRadius: 8, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                                                {formatCurrency(subtotal)}
                                            </div>
                                        </div>
                                        <div className="form-field span-2">
                                            <div style={{ fontSize: 13, color: '#666' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span style={{ fontWeight: 600 }}>Phí vận chuyển:</span>
                                                <span>{formatCurrency(grnData.shippingFee || 0)}</span>
                                                </div>
                                                    </div>
                                        <div style={{ marginTop: 16, padding: '20px', backgroundColor: '#e3f2fd', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '4px solid #2196F3' }}>
                                            <span style={{ fontSize: 18, fontWeight: 700, color: '#2196F3' }}>Tổng giá trị:</span>
                                            <span style={{ fontSize: 22, fontWeight: 700, color: '#2196F3', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(grandTotal)}</span>
                                            </div>
                                            </div>
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

export default ViewGoodReceiptNoteDetail;
