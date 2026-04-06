import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    getGoodsDeliveryNoteDetail,
    approveGoodsDeliveryNote,
    issueGoodsDeliveryNote,
    confirmDeliveryGoodsDeliveryNote,
} from '../lib/goodsDeliveryNoteService';
import authService from '../lib/authService';
import { getPermissionRole, getRawRoleFromUser } from '../permissions/roleUtils';
import {
    ArrowLeft,
    FileText,
    Printer,
    Package,
    MapPin,
    Truck,
    Phone,
    CheckCircle,
    XCircle,
} from 'lucide-react';
import { Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { useToast } from '../hooks/useToast';
import Toast from '../../components/Toast/Toast';
import '../styles/CreateSupplier.css';
import '../styles/CreateGoodDeliveryNote.css';

const MAX_NOTE_LENGTH = 1000;

const STATUS_META = {
    DRAFT: { label: 'Nháp', bg: 'rgba(107, 114, 128, 0.15)', color: '#4b5563' },
    PENDING_ACC: { label: 'Chờ kế toán duyệt', bg: 'rgba(251, 191, 36, 0.18)', color: '#b45309' },
    PENDING_DIR: { label: 'Chờ giám đốc duyệt', bg: 'rgba(251, 191, 36, 0.18)', color: '#b45309' },
    PENDING_ISSUE: { label: 'Chờ xuất hàng', bg: 'rgba(14, 165, 233, 0.18)', color: '#0369a1' },
    ISSUED: { label: 'Đã xuất hàng', bg: 'rgba(139, 92, 246, 0.18)', color: '#6d28d9' },
    POSTED: { label: 'Đã ghi sổ', bg: 'rgba(59, 130, 246, 0.18)', color: '#1d4ed8' },
    APPROVED: { label: 'Đã duyệt', bg: 'rgba(16, 185, 129, 0.18)', color: '#047857' },
    REJECTED: { label: 'Từ chối', bg: 'rgba(239, 68, 68, 0.18)', color: '#b91c1c' },
    CANCELLED: { label: 'Đã hủy', bg: 'rgba(239, 68, 68, 0.18)', color: '#b91c1c' },
};

const toNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const formatCurrency = (value) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(toNumber(value));

const formatQuantity = (value) =>
    toNumber(value).toLocaleString('vi-VN', { maximumFractionDigits: 3 });

const formatDateTime = (value) => {
    if (!value) return '—';
    const date = new Date(String(value).endsWith('Z') ? value : `${value}Z`);
    if (Number.isNaN(date.getTime())) return String(value);
    return `${date.toLocaleDateString('vi-VN')} ${date.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
    })}`;
};

const normalize = (d) => {
    if (!d) return null;

    const lines = (d.lines || []).map((l) => ({
        gdnLineId: l.gdnLineId ?? l.GdnLineId,
        itemId: l.itemId ?? l.ItemId,
        itemCode: l.itemCode ?? l.ItemCode,
        itemName: l.itemName ?? l.ItemName,
        requestedQty: l.requestedQty ?? l.RequestedQty,
        actualQty: l.actualQty ?? l.ActualQty,
        uomId: l.uomId ?? l.UomId,
        uomName: l.uomName ?? l.UomName,
        unitPrice: l.unitPrice ?? l.UnitPrice,
        lineTotal: l.lineTotal ?? l.LineTotal,
        requiresCertificateCopy: l.requiresCertificateCopy ?? l.RequiresCertificateCopy,
        releaseRequestLineId: l.releaseRequestLineId ?? l.ReleaseRequestLineId,
        lotId: l.lotId ?? l.LotId,
        note: l.note ?? l.Note,
        stockQty: l.stockQty ?? l.StockQty,
        approvedQty: l.approvedQty ?? l.ApprovedQty,
        previouslyDeliveredQty: l.previouslyDeliveredQty ?? l.PreviouslyDeliveredQty,
        remainingQty: l.remainingQty ?? l.RemainingQty,
        availableQty:
            l.availableQty ??
            l.AvailableQty ??
            l.stockQty ??
            l.StockQty ??
            0,
        allocatedQty:
            l.allocatedQty ??
            l.AllocatedQty ??
            l.approvedQty ??
            l.ApprovedQty ??
            0,
        issuedQty:
            l.issuedQty ??
            l.IssuedQty ??
            l.previouslyDeliveredQty ??
            l.PreviouslyDeliveredQty ??
            0,
    }));

    const receiver = d.receiver
        ? {
              receiverId: d.receiver.receiverId ?? d.receiver.ReceiverId,
              receiverName: d.receiver.receiverName ?? d.receiver.ReceiverName,
              phone: d.receiver.phone ?? d.receiver.Phone,
              email: d.receiver.email ?? d.receiver.Email,
              companyId: d.receiver.companyId ?? d.receiver.CompanyId,
              companyName: d.receiver.companyName ?? d.receiver.CompanyName,
              notes: d.receiver.notes ?? d.receiver.Notes,
              address: d.receiver.address ?? d.receiver.Address,
              city: d.receiver.city ?? d.receiver.City,
              district: d.receiver.district ?? d.receiver.District,
              ward: d.receiver.ward ?? d.receiver.Ward,
          }
        : null;

    const transportInfo = d.transportInfo
        ? {
              transportId: d.transportInfo.transportId ?? d.transportInfo.TransportId,
              carrierName: d.transportInfo.carrierName ?? d.transportInfo.CarrierName,
              driverName: d.transportInfo.driverName ?? d.transportInfo.DriverName,
              driverPhone: d.transportInfo.driverPhone ?? d.transportInfo.DriverPhone,
              licensePlate: d.transportInfo.licensePlate ?? d.transportInfo.LicensePlate,
              note: d.transportInfo.note ?? d.transportInfo.Note,
          }
        : null;

    const approvals = (d.approvals || []).map((a) => ({
        approvalId: a.approvalId ?? a.ApprovalId,
        stageNo: a.stageNo ?? a.StageNo,
        decision: a.decision ?? a.Decision,
        reason: a.reason ?? a.Reason,
        actionBy: a.actionBy ?? a.ActionBy,
        actionByName: a.actionByName ?? a.ActionByName,
        actionAt: a.actionAt ?? a.ActionAt,
    }));

    return {
        gdnId: d.gdnId ?? d.GdnId,
        gdnCode: d.gdnCode ?? d.GdnCode,
        issueDate: d.issueDate ?? d.IssueDate,
        status: d.status ?? d.Status,
        isPaid: d.isPaid ?? d.IsPaid,
        paymentMethod: d.paymentMethod ?? d.PaymentMethod,
        releaseRequestId: d.releaseRequestId ?? d.ReleaseRequestId,
        releaseRequestCode: d.releaseRequestCode ?? d.ReleaseRequestCode,
        warehouseId: d.warehouseId ?? d.WarehouseId,
        warehouseName: d.warehouseName ?? d.WarehouseName,
        createdBy: d.createdBy ?? d.CreatedBy,
        createdByName: d.createdByName ?? d.CreatedByName,
        totalDeliveredQty: d.totalDeliveredQty ?? d.TotalDeliveredQty,
        totalDeliveredAmount: d.totalDeliveredAmount ?? d.TotalDeliveredAmount,
        shippingFee: d.shippingFee ?? d.ShippingFee,
        netAmount: d.netAmount ?? d.NetAmount,
        submittedAt: d.submittedAt ?? d.SubmittedAt,
        approvedAt: d.approvedAt ?? d.ApprovedAt,
        postedAt: d.postedAt ?? d.PostedAt,
        note: d.note ?? d.Note,
        requesterName: d.requesterName ?? d.RequesterName,
        requestDate: d.requestDate ?? d.RequestDate,
        expectedDate: d.expectedDate ?? d.ExpectedDate,
        lines,
        receiver,
        transportInfo,
        approvals,
    };
};

const getStatusMeta = (status) =>
    STATUS_META[String(status || '').toUpperCase()] ?? {
        label: status || '-',
        bg: 'rgba(107, 114, 128, 0.15)',
        color: '#4b5563',
    };

const DetailCard = ({ title, children }) => (
    <div className="info-section" style={{ margin: 0 }}>
        <div className="section-header-with-toggle">
            <h2 className="section-title">{title}</h2>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>{children}</div>
    </div>
);

const SummaryRow = ({ label, value, isTotal = false }) => (
    <div
        style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: isTotal ? '16px' : '14px',
            marginBottom: isTotal ? 0 : 8,
        }}
    >
        <span
            style={{
                color: isTotal ? '#1f2937' : '#475569',
                fontWeight: isTotal ? 700 : 600,
            }}
        >
            {label}
        </span>
        <span
            style={{
                color: isTotal ? '#0284c7' : '#64748b',
                fontWeight: isTotal ? 700 : 600,
                fontSize: isTotal ? '18px' : '14px',
            }}
        >
            {value}
        </span>
    </div>
);

export default function ViewGoodDeliveryNoteDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { toast, showToast, clearToast } = useToast();

    const [gdn, setGdn] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [approveDialogOpen, setApproveDialogOpen] = useState(false);
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
    const [confirmDeliveryDialogOpen, setConfirmDeliveryDialogOpen] = useState(false);

    const [approveReason, setApproveReason] = useState('');
    const [rejectReason, setRejectReason] = useState('');
    const [confirmDeliveryNote, setConfirmDeliveryNote] = useState('');

    const [evidenceFile, setEvidenceFile] = useState(null);
    const [evidencePreview, setEvidencePreview] = useState(null);

    const [processing, setProcessing] = useState(false);

    const userInfo = authService.getUser();
    const permissionRole = getPermissionRole(getRawRoleFromUser(userInfo));
    const currentStatus = String(gdn?.status || '').toUpperCase();

    const canApproveStage1 = currentStatus === 'PENDING_ACC' && permissionRole === 'ACCOUNTANTS';
    const canApproveStage2 = currentStatus === 'PENDING_DIR' && permissionRole === 'DIRECTOR';
    const canAct = canApproveStage1 || canApproveStage2;
    const canIssue = currentStatus === 'PENDING_ISSUE' && permissionRole === 'WAREHOUSE_KEEPER';
    const canConfirmDelivery =
        currentStatus === 'ISSUED' &&
        (permissionRole === 'ACCOUNTANTS' || permissionRole === 'DIRECTOR');

    const resetConfirmDeliveryState = () => {
        setConfirmDeliveryDialogOpen(false);
        setEvidenceFile(null);
        setEvidencePreview(null);
        setConfirmDeliveryNote('');
    };

    const fetchData = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        setError(null);
        try {
            const data = await getGoodsDeliveryNoteDetail(id);
            setGdn(normalize(data));
        } catch (err) {
            const msg =
                err?.response?.data?.message ||
                err?.message ||
                'Không tải được chi tiết phiếu xuất hàng';
            setError(msg);
            showToast(msg, 'error');
        } finally {
            setLoading(false);
        }
    }, [id, showToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleApprove = async () => {
        setProcessing(true);
        try {
            await approveGoodsDeliveryNote(gdn.gdnId, {
                isApproved: true,
                reason: approveReason.trim() || null,
            });
            showToast('Duyệt phiếu xuất kho thành công.', 'success');
            setApproveDialogOpen(false);
            setApproveReason('');
            fetchData();
        } catch (err) {
            const msg =
                err?.response?.data?.message ||
                err?.message ||
                'Không duyệt được phiếu xuất kho.';
            showToast(msg, 'error');
        } finally {
            setProcessing(false);
        }
    };

    const handleReject = async () => {
        if (!rejectReason.trim()) {
            showToast('Vui lòng nhập lý do từ chối.', 'warning');
            return;
        }

        setProcessing(true);
        try {
            await approveGoodsDeliveryNote(gdn.gdnId, {
                isApproved: false,
                reason: rejectReason.trim(),
            });
            showToast('Đã từ chối phiếu xuất kho.', 'success');
            setRejectDialogOpen(false);
            setRejectReason('');
            fetchData();
        } catch (err) {
            const msg =
                err?.response?.data?.message ||
                err?.message ||
                'Không thể từ chối phiếu xuất kho.';
            showToast(msg, 'error');
        } finally {
            setProcessing(false);
        }
    };

    const handleIssue = async () => {
        setProcessing(true);
        try {
            const lines = (gdn.lines || []).map((l) => ({
                gdnLineId: l.gdnLineId,
                actualQty: l.actualQty ?? 0,
            }));

            await issueGoodsDeliveryNote(gdn.gdnId, {
                isAllItemsFulfilled: true,
                lines,
                note: null,
            });

            showToast('Xuất kho thành công.', 'success');
            fetchData();
        } catch (err) {
            const msg =
                err?.response?.data?.message ||
                err?.message ||
                'Không thể xuất kho.';
            showToast(msg, 'error');
        } finally {
            setProcessing(false);
        }
    };

    const handleEvidenceChange = (e) => {
        const file = e.target.files?.[0] || null;
        setEvidenceFile(file);

        if (!file) {
            setEvidencePreview(null);
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => setEvidencePreview(reader.result);
        reader.readAsDataURL(file);
    };

    const handleConfirmDelivery = async () => {
        if (!evidenceFile) {
            showToast('Vui lòng chọn ảnh evidence trước khi xác nhận.', 'warning');
            return;
        }

        setProcessing(true);
        try {
            await confirmDeliveryGoodsDeliveryNote(gdn.gdnId, {
                evidenceFile,
                note: confirmDeliveryNote.trim() || null,
            });

            showToast('Hoàn thành phiếu xuất kho thành công.', 'success');
            resetConfirmDeliveryState();
            fetchData();
        } catch (err) {
            const msg =
                err?.response?.data?.message ||
                err?.message ||
                'Không thể hoàn thành phiếu xuất kho.';
            showToast(msg, 'error');
        } finally {
            setProcessing(false);
        }
    };

    const statusMeta = getStatusMeta(gdn?.status);
    const gdnLines = useMemo(() => gdn?.lines || [], [gdn?.lines]);

    const subtotal = useMemo(
        () => gdnLines.reduce((sum, line) => sum + toNumber(line.lineTotal), 0),
        [gdnLines]
    );
    const shippingFee = toNumber(gdn?.shippingFee);
    const grandTotal = subtotal + shippingFee;

    const handlePrint = () => {
        showToast('Chức năng in đang được phát triển.', 'info');
    };

    const ti = gdn?.transportInfo || {};
    const gdnReceiver = gdn?.receiver || {};
    const hasTransport = [ti.carrierName, ti.driverName, ti.driverPhone, ti.licensePlate].some(
        (v) => v && String(v).trim()
    );

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>⟳</div>
                    <div>Đang tải dữ liệu...</div>
                </div>
            </div>
        );
    }

    if (error || !gdn) {
        return (
            <div style={{ padding: 24, textAlign: 'center' }}>
                <div style={{ color: '#b91c1c', marginBottom: 16 }}>
                    {error || 'Không tìm thấy dữ liệu'}
                </div>
                <button onClick={() => navigate(-1)}>← Quay lại</button>
            </div>
        );
    }

    return (
        <div className="create-supplier-page">
            <div className="page-header">
                <div className="page-header-left">
                    <button type="button" onClick={() => navigate(-1)} className="back-button">
                        <ArrowLeft size={20} />
                        <span>Quay lại</span>
                    </button>
                </div>

                <div className="page-header-actions">
                    <button type="button" className="btn btn-primary" onClick={handlePrint}>
                        <Printer size={15} />
                        In phiếu
                    </button>

                    {canAct && (
                        <>
                            <button
                                type="button"
                                className="btn btn-danger"
                                disabled={processing}
                                onClick={() => setRejectDialogOpen(true)}
                            >
                                <XCircle size={15} />
                                Từ chối
                            </button>

                            <button
                                type="button"
                                className="btn btn-success"
                                disabled={processing}
                                onClick={() => setApproveDialogOpen(true)}
                            >
                                <CheckCircle size={15} />
                                Duyệt
                            </button>
                        </>
                    )}

                    {canIssue && (
                        <button
                            type="button"
                            className="btn btn-primary"
                            disabled={processing}
                            onClick={handleIssue}
                        >
                            <CheckCircle size={15} />
                            Xuất Kho
                        </button>
                    )}

                    {canConfirmDelivery && (
                        <button
                            type="button"
                            className="btn btn-success"
                            disabled={processing}
                            onClick={() => setConfirmDeliveryDialogOpen(true)}
                        >
                            <CheckCircle size={15} />
                            Hoàn thành phiếu xuất kho
                        </button>
                    )}
                </div>
            </div>

            <div className="form-card">
                <div className="form-wrapper">
                    <div className="form-card-intro">
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                flexWrap: 'wrap',
                            }}
                        >
                            <h1 className="page-title">Chi tiết phiếu xuất hàng</h1>
                            <span
                                style={{
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    padding: '3px 12px',
                                    borderRadius: '9999px',
                                    backgroundColor: statusMeta.bg,
                                    color: statusMeta.color,
                                    border: `1px solid ${statusMeta.color}30`,
                                }}
                            >
                                {statusMeta.label}
                            </span>
                        </div>

                        <p className="form-card-required-note">
                            Mã phiếu: <strong style={{ color: '#0284c7', fontSize: '15px' }}>{gdn.gdnCode}</strong>
                            &nbsp;&bull;&nbsp; Ngày xuất: <strong>{gdn.issueDate || '—'}</strong>
                            &nbsp;&bull;&nbsp; Kho: <strong>{gdn.warehouseName || '—'}</strong>
                        </p>
                    </div>

                    <div className="gdn-create-main-grid" style={{ height: '760px' }}>
                        <div
                            className="info-section"
                            style={{
                                margin: 0,
                                display: 'flex',
                                flexDirection: 'column',
                                height: '760px',
                            }}
                        >
                            <div className="section-header-with-toggle">
                                <h2 className="section-title">Chi tiết vật tư xuất</h2>
                            </div>

                            {!gdnLines.length ? (
                                <div
                                    style={{
                                        flex: 1,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        gap: '16px',
                                        padding: '60px 20px',
                                        color: '#9ca3af',
                                        textAlign: 'center',
                                    }}
                                >
                                    <Package size={64} strokeWidth={1.5} />
                                    <p style={{ fontSize: '16px', fontWeight: 500, margin: 0 }}>
                                        Chưa có vật tư trong phiếu xuất
                                    </p>
                                </div>
                            ) : (
                                <div
                                    className="table-container"
                                    style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}
                                >
                                    <table className="product-table">
                                        <thead>
                                            <tr>
                                                <th style={{ width: '40px', textAlign: 'center' }}>STT</th>
                                                <th style={{ minWidth: '260px' }}>Vật tư</th>
                                                <th style={{ width: '80px', textAlign: 'right' }}>SL YC</th>
                                                <th style={{ width: '80px', textAlign: 'right' }}>Đã cấp</th>
                                                <th style={{ width: '80px', textAlign: 'right' }}>Đã xuất</th>
                                                <th style={{ width: '80px', textAlign: 'right' }}>Còn xuất</th>
                                                <th style={{ width: '100px', textAlign: 'right' }}>SL thực xuất</th>
                                                <th style={{ width: '120px', textAlign: 'right' }}>Đơn giá</th>
                                                <th style={{ width: '130px', textAlign: 'right' }}>Thành tiền</th>
                                                <th style={{ width: '80px', textAlign: 'center' }}>Bản sao CC</th>
                                                <th style={{ width: '160px' }}>Ghi chú dòng</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {gdnLines.map((line, index) => (
                                                <tr key={line.gdnLineId || line.itemId || index}>
                                                    <td style={{ textAlign: 'center' }}>{index + 1}</td>
                                                    <td>
                                                        <div
                                                            style={{
                                                                display: 'flex',
                                                                gap: '12px',
                                                                alignItems: 'center',
                                                            }}
                                                        >
                                                            <div
                                                                style={{
                                                                    width: '40px',
                                                                    height: '40px',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    borderRadius: '6px',
                                                                    border: '1px solid #e5e7eb',
                                                                    backgroundColor: '#f3f4f6',
                                                                    flexShrink: 0,
                                                                }}
                                                            >
                                                                <Package size={20} color="#9ca3af" />
                                                            </div>
                                                            <div
                                                                style={{
                                                                    display: 'flex',
                                                                    flexDirection: 'column',
                                                                    gap: 2,
                                                                    minWidth: 0,
                                                                }}
                                                            >
                                                                <span
                                                                    style={{
                                                                        fontSize: 14,
                                                                        fontWeight: 500,
                                                                        color: '#0284c7',
                                                                    }}
                                                                >
                                                                    {line.itemName}
                                                                </span>
                                                                <span
                                                                    style={{
                                                                        fontSize: 12,
                                                                        color: '#6b7280',
                                                                        fontWeight: 600,
                                                                    }}
                                                                >
                                                                    Mã: {line.itemCode || '-'} • DVT: {line.uomName || '-'}
                                                                </span>
                                                                <span
                                                                    style={{
                                                                        fontSize: 12,
                                                                        color: '#6b7280',
                                                                    }}
                                                                >
                                                                    Tồn: {formatQuantity(line.availableQty)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td style={{ textAlign: 'right', fontWeight: 500 }}>
                                                        {formatQuantity(line.requestedQty)}
                                                    </td>
                                                    <td style={{ textAlign: 'right', fontWeight: 500 }}>
                                                        {formatQuantity(line.allocatedQty)}
                                                    </td>
                                                    <td style={{ textAlign: 'right', fontWeight: 500 }}>
                                                        {formatQuantity(line.issuedQty)}
                                                    </td>
                                                    <td
                                                        style={{
                                                            textAlign: 'right',
                                                            fontWeight: 700,
                                                            color: '#0f766e',
                                                        }}
                                                    >
                                                        {formatQuantity(line.remainingQty)}
                                                    </td>
                                                    <td
                                                        style={{
                                                            textAlign: 'right',
                                                            fontWeight: 600,
                                                            color: '#0284c7',
                                                        }}
                                                    >
                                                        {formatQuantity(line.actualQty)}
                                                    </td>
                                                    <td style={{ textAlign: 'right', fontWeight: 500 }}>
                                                        {formatCurrency(line.unitPrice)}
                                                    </td>
                                                    <td
                                                        style={{
                                                            textAlign: 'right',
                                                            fontWeight: 700,
                                                            color: '#0284c7',
                                                        }}
                                                    >
                                                        {formatCurrency(line.lineTotal)}
                                                    </td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        {line.requiresCertificateCopy ? (
                                                            <span
                                                                style={{
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    width: '20px',
                                                                    height: '20px',
                                                                    borderRadius: '4px',
                                                                    backgroundColor:
                                                                        'rgba(239, 68, 68, 0.12)',
                                                                    color: '#dc2626',
                                                                    fontSize: '12px',
                                                                    fontWeight: 700,
                                                                }}
                                                                title="Yêu cầu bản sao chứng chỉ"
                                                            >
                                                                ✓
                                                            </span>
                                                        ) : (
                                                            <span
                                                                style={{
                                                                    color: '#d1d5db',
                                                                    fontSize: '12px',
                                                                }}
                                                            >
                                                                —
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        {line.note ? (
                                                            <span
                                                                style={{
                                                                    fontSize: '13px',
                                                                    color: '#6b7280',
                                                                    display: 'block',
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis',
                                                                    whiteSpace: 'nowrap',
                                                                    maxWidth: '150px',
                                                                }}
                                                                title={line.note}
                                                            >
                                                                {line.note}
                                                            </span>
                                                        ) : (
                                                            <span
                                                                style={{
                                                                    color: '#d1d5db',
                                                                    fontSize: '13px',
                                                                }}
                                                            >
                                                                —
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '24px',
                                height: '760px',
                                overflowY: 'auto',
                            }}
                        >
                            <DetailCard title="Thông tin chung">
                                <div className="form-field">
                                    <label className="form-label">Mã phiếu xuất</label>
                                    <div
                                        style={{
                                            padding: '10px 12px',
                                            borderRadius: '8px',
                                            border: '2px solid #0284c7',
                                            backgroundColor: '#f0f9ff',
                                            fontSize: '15px',
                                            fontWeight: 700,
                                            color: '#0284c7',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                        }}
                                    >
                                        <FileText size={16} />
                                        {gdn.gdnCode}
                                    </div>
                                </div>

                                <div className="form-field">
                                    <label className="form-label">Yêu cầu xuất tham chiếu</label>
                                    <div
                                        style={{
                                            padding: '8px 12px',
                                            borderRadius: '8px',
                                            border: '1px solid #e5e7eb',
                                            backgroundColor: '#f0fdf4',
                                            fontSize: '14px',
                                            color: '#15803d',
                                            fontWeight: 600,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                        }}
                                    >
                                        {gdn.releaseRequestCode || '—'}
                                    </div>
                                </div>

                                <div className="form-field">
                                    <label className="form-label">Người tạo</label>
                                    <div className="input-wrapper">
                                        <div
                                            style={{
                                                padding: '8px 12px',
                                                borderRadius: '8px',
                                                border: '1px solid #e5e7eb',
                                                backgroundColor: '#f9fafb',
                                                fontSize: '14px',
                                                color: '#374151',
                                                minHeight: '36px',
                                                display: 'flex',
                                                alignItems: 'center',
                                            }}
                                        >
                                            {gdn.createdByName || '—'}
                                        </div>
                                    </div>
                                </div>

                                <div className="form-field">
                                    <label className="form-label">Ngày xuất hàng</label>
                                    <div className="input-wrapper">
                                        <div
                                            style={{
                                                padding: '8px 12px',
                                                borderRadius: '8px',
                                                border: '1px solid #e5e7eb',
                                                backgroundColor: '#f9fafb',
                                                fontSize: '14px',
                                                color: '#374151',
                                                minHeight: '36px',
                                                display: 'flex',
                                                alignItems: 'center',
                                            }}
                                        >
                                            {gdn.issueDate || '—'}
                                        </div>
                                    </div>
                                </div>

                                <div className="form-field">
                                    <label className="form-label">Kho xuất</label>
                                    <div className="input-wrapper">
                                        <div
                                            style={{
                                                padding: '8px 12px',
                                                borderRadius: '8px',
                                                border: '1px solid #e5e7eb',
                                                backgroundColor: '#f9fafb',
                                                fontSize: '14px',
                                                color: '#374151',
                                                minHeight: '36px',
                                                display: 'flex',
                                                alignItems: 'center',
                                            }}
                                        >
                                            {gdn.warehouseName || '—'}
                                        </div>
                                    </div>
                                </div>

                                <div className="form-field">
                                    <label className="form-label">Người yêu cầu</label>
                                    <div className="input-wrapper">
                                        <div
                                            style={{
                                                padding: '8px 12px',
                                                borderRadius: '8px',
                                                border: '1px solid #e5e7eb',
                                                backgroundColor: '#f9fafb',
                                                fontSize: '14px',
                                                color: '#374151',
                                                minHeight: '36px',
                                                display: 'flex',
                                                alignItems: 'center',
                                            }}
                                        >
                                            {gdn.requesterName || '—'}
                                        </div>
                                    </div>
                                </div>

                                <div className="form-field">
                                    <label className="form-label">Ngày yêu cầu</label>
                                    <div className="input-wrapper">
                                        <div
                                            style={{
                                                padding: '8px 12px',
                                                borderRadius: '8px',
                                                border: '1px solid #e5e7eb',
                                                backgroundColor: '#f9fafb',
                                                fontSize: '14px',
                                                color: '#374151',
                                                minHeight: '36px',
                                                display: 'flex',
                                                alignItems: 'center',
                                            }}
                                        >
                                            {gdn.requestDate || '—'}
                                        </div>
                                    </div>
                                </div>

                                <div className="form-field">
                                    <label className="form-label">Ngày dự kiến</label>
                                    <div className="input-wrapper">
                                        <div
                                            style={{
                                                padding: '8px 12px',
                                                borderRadius: '8px',
                                                border: '1px solid #e5e7eb',
                                                backgroundColor: '#f9fafb',
                                                fontSize: '14px',
                                                color: '#374151',
                                                minHeight: '36px',
                                                display: 'flex',
                                                alignItems: 'center',
                                            }}
                                        >
                                            {gdn.expectedDate || '—'}
                                        </div>
                                    </div>
                                </div>
                            </DetailCard>

                            <DetailCard title="Người nhận hàng">
                                {gdnReceiver.receiverName ? (
                                    <div
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '10px',
                                            fontSize: '14px',
                                            color: '#334155',
                                        }}
                                    >
                                        <div>
                                            <span style={{ fontWeight: 600 }}>Tên: </span>
                                            <span>{gdnReceiver.receiverName}</span>
                                        </div>

                                        {gdnReceiver.phone && (
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                }}
                                            >
                                                <Phone size={14} color="#6b7280" />
                                                <span>{gdnReceiver.phone}</span>
                                            </div>
                                        )}

                                        {gdnReceiver.companyName && (
                                            <div>
                                                <span style={{ fontWeight: 600 }}>Công ty: </span>
                                                <span>{gdnReceiver.companyName}</span>
                                            </div>
                                        )}

                                        {gdnReceiver.email && (
                                            <div>
                                                <span style={{ fontWeight: 600 }}>Email: </span>
                                                <span>{gdnReceiver.email}</span>
                                            </div>
                                        )}

                                        {(gdnReceiver.address ||
                                            gdnReceiver.ward ||
                                            gdnReceiver.district ||
                                            gdnReceiver.city) && (
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'start',
                                                    gap: '6px',
                                                }}
                                            >
                                                <MapPin
                                                    size={14}
                                                    color="#6b7280"
                                                    style={{ flexShrink: 0, marginTop: '2px' }}
                                                />
                                                <span>
                                                    {[
                                                        gdnReceiver.address,
                                                        gdnReceiver.ward,
                                                        gdnReceiver.district,
                                                        gdnReceiver.city,
                                                    ]
                                                        .filter(Boolean)
                                                        .join(', ')}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div
                                        style={{
                                            color: '#9ca3af',
                                            fontSize: '14px',
                                            fontStyle: 'italic',
                                        }}
                                    >
                                        Không có thông tin người nhận
                                    </div>
                                )}
                            </DetailCard>

                            <DetailCard title="Vận chuyển">
                                {hasTransport ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {ti.carrierName && (
                                            <div style={{ fontSize: '14px', color: '#374151' }}>
                                                <span style={{ fontWeight: 600 }}>Hãng vận chuyển: </span>
                                                <span>{ti.carrierName}</span>
                                            </div>
                                        )}

                                        {ti.driverName && (
                                            <div style={{ fontSize: '14px', color: '#374151' }}>
                                                <span style={{ fontWeight: 600 }}>Tài xế: </span>
                                                <span>{ti.driverName}</span>
                                            </div>
                                        )}

                                        {ti.driverPhone && (
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    fontSize: '14px',
                                                    color: '#374151',
                                                }}
                                            >
                                                <Phone size={14} color="#6b7280" />
                                                <span>{ti.driverPhone}</span>
                                            </div>
                                        )}

                                        {ti.licensePlate && (
                                            <div style={{ fontSize: '14px', color: '#374151' }}>
                                                <span style={{ fontWeight: 600 }}>Biển số xe: </span>
                                                <span>{ti.licensePlate}</span>
                                            </div>
                                        )}

                                        {ti.note && (
                                            <div style={{ fontSize: '14px', color: '#374151' }}>
                                                <span style={{ fontWeight: 600 }}>Ghi chú: </span>
                                                <span>{ti.note}</span>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div
                                        style={{
                                            color: '#9ca3af',
                                            fontSize: '14px',
                                            fontStyle: 'italic',
                                        }}
                                    >
                                        Không có thông tin vận chuyển
                                    </div>
                                )}
                            </DetailCard>

                            <DetailCard title="Tổng kết">
                                <SummaryRow
                                    label="Tổng SL thực xuất"
                                    value={formatQuantity(gdn.totalDeliveredQty || gdn.totalDeliveredQty)}
                                />
                                <SummaryRow label="Tiền hàng" value={formatCurrency(subtotal)} />
                                <SummaryRow label="Phí vận chuyển" value={formatCurrency(shippingFee)} />
                                <SummaryRow label="Tổng cộng" value={formatCurrency(grandTotal)} isTotal />
                            </DetailCard>

                            {gdn.note && (
                                <DetailCard title="Ghi chú">
                                    <div
                                        style={{
                                            padding: '10px 12px',
                                            borderRadius: '8px',
                                            border: '1px solid #e5e7eb',
                                            backgroundColor: '#f9fafb',
                                            fontSize: '14px',
                                            color: '#374151',
                                            whiteSpace: 'pre-wrap',
                                            lineHeight: 1.5,
                                        }}
                                    >
                                        {gdn.note}
                                    </div>
                                </DetailCard>
                            )}

                            {!!gdn.approvals?.length && (
                                <DetailCard title="Lịch sử duyệt">
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {gdn.approvals.map((approval, index) => (
                                            <div
                                                key={approval.approvalId || index}
                                                style={{
                                                    border: '1px solid #e5e7eb',
                                                    borderRadius: '8px',
                                                    padding: '10px 12px',
                                                    background: '#fff',
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        gap: '12px',
                                                        flexWrap: 'wrap',
                                                        marginBottom: '4px',
                                                    }}
                                                >
                                                    <strong style={{ color: '#1f2937' }}>
                                                        Bước {approval.stageNo || index + 1}
                                                    </strong>
                                                    <span style={{ color: '#6b7280', fontSize: '13px' }}>
                                                        {formatDateTime(approval.actionAt)}
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: '14px', color: '#374151' }}>
                                                    <div>
                                                        <strong>Người xử lý:</strong> {approval.actionByName || '—'}
                                                    </div>
                                                    <div>
                                                        <strong>Kết quả:</strong> {approval.decision || '—'}
                                                    </div>
                                                    {approval.reason && (
                                                        <div>
                                                            <strong>Lý do:</strong> {approval.reason}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </DetailCard>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}

            <Dialog
                open={approveDialogOpen}
                onClose={() => !processing && setApproveDialogOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle
                    sx={{
                        fontWeight: 600,
                        fontSize: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                    }}
                >
                    <CheckCircle size={20} color="#16a34a" />
                    Duyệt phiếu xuất kho
                </DialogTitle>

                <DialogContent>
                    <p style={{ margin: '8px 0 16px', fontSize: 14, color: '#374151' }}>
                        Bạn có chắc muốn duyệt phiếu xuất kho <strong>{gdn?.gdnCode}</strong>?
                    </p>

                    <textarea
                        value={approveReason}
                        onChange={(e) => setApproveReason(e.target.value)}
                        placeholder="Ghi chú (không bắt buộc)"
                        rows={3}
                        style={{
                            width: '100%',
                            resize: 'vertical',
                            padding: '10px 12px',
                            borderRadius: 8,
                            border: '1px solid #d1d5db',
                            fontSize: 14,
                            outline: 'none',
                        }}
                    />
                </DialogContent>

                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <button
                        type="button"
                        onClick={() => setApproveDialogOpen(false)}
                        className="btn btn-cancel"
                        disabled={processing}
                    >
                        Hủy
                    </button>
                    <button
                        type="button"
                        onClick={handleApprove}
                        className="btn btn-success"
                        disabled={processing}
                    >
                        {processing ? (
                            <>
                                <CheckCircle size={14} />
                                Đang xử lý...
                            </>
                        ) : (
                            <>
                                <CheckCircle size={14} />
                                Xác nhận duyệt
                            </>
                        )}
                    </button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={rejectDialogOpen}
                onClose={() => !processing && setRejectDialogOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle
                    sx={{
                        fontWeight: 600,
                        fontSize: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                    }}
                >
                    <XCircle size={20} color="#dc2626" />
                    Từ chối phiếu xuất kho
                </DialogTitle>

                <DialogContent>
                    <p style={{ margin: '8px 0 16px', fontSize: 14, color: '#374151' }}>
                        Vui lòng nhập lý do từ chối phiếu <strong>{gdn?.gdnCode}</strong>.
                    </p>

                    <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Nhập lý do từ chối..."
                        rows={4}
                        style={{
                            width: '100%',
                            resize: 'vertical',
                            padding: '10px 12px',
                            borderRadius: 8,
                            border: '1px solid #d1d5db',
                            fontSize: 14,
                            outline: 'none',
                        }}
                    />
                </DialogContent>

                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <button
                        type="button"
                        onClick={() => setRejectDialogOpen(false)}
                        className="btn btn-cancel"
                        disabled={processing}
                    >
                        Hủy
                    </button>
                    <button
                        type="button"
                        onClick={handleReject}
                        className="btn btn-danger"
                        disabled={processing}
                    >
                        {processing ? (
                            <>
                                <XCircle size={14} />
                                Đang xử lý...
                            </>
                        ) : (
                            <>
                                <XCircle size={14} />
                                Xác nhận từ chối
                            </>
                        )}
                    </button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={confirmDeliveryDialogOpen}
                onClose={() => !processing && resetConfirmDeliveryState()}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle
                    sx={{
                        fontWeight: 600,
                        fontSize: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                    }}
                >
                    <Truck size={20} color="#16a34a" />
                    Hoàn thành phiếu xuất kho
                </DialogTitle>

                <DialogContent>
                    <p style={{ margin: '8px 0 16px', fontSize: 14, color: '#374151' }}>
                        Cập nhật Evidence cho phiếu <strong>{gdn?.gdnCode}</strong> trước khi hoàn thành.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div>
                            <label
                                style={{
                                    display: 'block',
                                    fontSize: 13,
                                    fontWeight: 600,
                                    color: '#374151',
                                    marginBottom: 8,
                                }}
                            >
                                Ảnh Evidence <span style={{ color: '#dc2626' }}>*</span>
                            </label>

                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleEvidenceChange}
                                style={{ display: 'block', width: '100%' }}
                            />

                            {evidenceFile && (
                                <div
                                    style={{
                                        marginTop: 8,
                                        fontSize: 13,
                                        color: '#6b7280',
                                    }}
                                >
                                    Đã chọn: {evidenceFile.name}
                                </div>
                            )}
                        </div>

                        {evidencePreview && (
                            <div>
                                <div
                                    style={{
                                        fontSize: 13,
                                        fontWeight: 600,
                                        color: '#374151',
                                        marginBottom: 8,
                                    }}
                                >
                                    Xem trước
                                </div>
                                <div
                                    style={{
                                        border: '1px solid #e5e7eb',
                                        borderRadius: 10,
                                        padding: 8,
                                        background: '#f9fafb',
                                    }}
                                >
                                    <img
                                        src={evidencePreview}
                                        alt="Evidence preview"
                                        style={{
                                            width: '100%',
                                            maxHeight: 280,
                                            objectFit: 'contain',
                                            borderRadius: 8,
                                            display: 'block',
                                        }}
                                    />
                                </div>
                            </div>
                        )}

                        <div>
                            <label
                                style={{
                                    display: 'block',
                                    fontSize: 13,
                                    fontWeight: 600,
                                    color: '#374151',
                                    marginBottom: 8,
                                }}
                            >
                                Ghi chú
                            </label>

                            <textarea
                                value={confirmDeliveryNote}
                                onChange={(e) =>
                                    setConfirmDeliveryNote(e.target.value.slice(0, MAX_NOTE_LENGTH))
                                }
                                placeholder="Nhập ghi chú khi hoàn thành phiếu xuất kho..."
                                rows={4}
                                style={{
                                    width: '100%',
                                    resize: 'vertical',
                                    padding: '10px 12px',
                                    borderRadius: 8,
                                    border: '1px solid #d1d5db',
                                    fontSize: 14,
                                    outline: 'none',
                                }}
                            />

                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'flex-end',
                                    fontSize: 12,
                                    color: '#6b7280',
                                    marginTop: 4,
                                    fontWeight: 500,
                                }}
                            >
                                {confirmDeliveryNote.length}/{MAX_NOTE_LENGTH} ký tự
                            </div>
                        </div>
                    </div>
                </DialogContent>

                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <button
                        type="button"
                        onClick={resetConfirmDeliveryState}
                        className="btn btn-cancel"
                        disabled={processing}
                    >
                        Hủy
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirmDelivery}
                        className="btn btn-success"
                        disabled={processing}
                    >
                        {processing ? (
                            <>
                                <Truck size={14} />
                                Đang xử lý...
                            </>
                        ) : (
                            <>
                                <CheckCircle size={14} />
                                Xác nhận hoàn thành
                            </>
                        )}
                    </button>
                </DialogActions>
            </Dialog>
        </div>
    );
}