import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    getGoodsDeliveryNoteDetail,
    issueGoodsDeliveryNote,
    confirmDeliveryGoodsDeliveryNote,
} from '../lib/goodsDeliveryNoteService';
import { getReleaseRequestDetail } from '../lib/releaseRequestService';
import authService from '../lib/authService';
import { getPermissionRole, getRawRoleFromUser } from '../permissions/roleUtils';
import {
    ArrowLeft,
    FileText,
    Package,
    MapPin,
    Truck,
    Phone,
    Send,
    CheckCircle,
    XCircle,
    DollarSign,
    Printer,
} from 'lucide-react';
import { TextField } from '@mui/material';
import { Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { ConfirmDialog } from '@ui/dialogs';
import { StatusBadge } from '@ui/badges';
import { useToastContext } from '../../app/context/ToastContext';
import { formatDateOnly, formatDateTime } from '../lib/dateUtils';
import { notifyApiError, notifyApiSuccess } from '../lib/toastMessageMapper';
import '../styles/CreateSupplier.css';
import '../styles/ViewGoodDeliveryNoteDetail.css';

const MAX_REASON_LENGTH = 250;
const UNKNOWN_ACTOR = 'Chưa xác định';

const HISTORY_EVENT_META = {
    created: { color: '#4b5563', fallbackActor: 'Hệ thống' },
    submitted: { color: '#4b5563', fallbackActor: 'Hệ thống' },
    approved: { color: '#059669', fallbackActor: UNKNOWN_ACTOR },
    rejected: { color: '#dc2626', fallbackActor: UNKNOWN_ACTOR },
    pending: { color: '#9ca3af', fallbackActor: UNKNOWN_ACTOR },
    issued: { color: '#0284c7', fallbackActor: 'Kho' },
    completed: { color: '#16a34a', fallbackActor: UNKNOWN_ACTOR },
};

// ── Utils ──────────────────────────────────────────────────────────────────
const toNumber = (v, f = 0) => { const p = Number(v); return Number.isFinite(p) ? p : f; };
const formatCurrency = (v) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(toNumber(v));
const formatQuantity = (v) => toNumber(v).toLocaleString('vi-VN', { maximumFractionDigits: 3 });
const firstDefined = (...values) => values.find((value) => value != null);

// ── Sub-components ─────────────────────────────────────────────────────────
const SectionCard = ({ title, subtitle, children, rightSlot }) => (
    <div className="info-section" style={{ margin: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <div>
                <h2 className="section-title" style={{ marginBottom: subtitle ? 4 : 0 }}>{title}</h2>
                {subtitle && <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>{subtitle}</p>}
            </div>
            {rightSlot}
        </div>
        {children}
    </div>
);

const ReadonlyField = ({ label, value, icon: Icon }) => (
    <div className="form-field">
        <label className="form-label">{label}</label>
        <div className="input-wrapper">
            {Icon && <Icon className="input-icon" size={16} />}
            <input type="text" value={value ?? ''} readOnly className="form-input" style={{ backgroundColor: '#f5f5f5' }} />
        </div>
    </div>
);

const SummaryMetric = ({ label, value }) => (
    <div style={{ padding: '14px 16px', borderRadius: 12, border: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
        <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 6 }}>{label}</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#111827', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    </div>
);

const mapApprovalStep = (approval) => ({
    stageNo: approval.stageNo ?? approval.StageNo ?? 1,
    actionByName: approval.actionByName ?? approval.ActionByName ?? '',
    actionAt: approval.actionAt ?? approval.ActionAt ?? null,
    decision: approval.decision ?? approval.Decision ?? 'PENDING',
    reason: approval.reason ?? approval.Reason ?? '',
});

const normalizeDecision = (decision) => String(decision || 'PENDING').trim().toUpperCase();
const isDecisionApproved = (decision) => ['APPROVE', 'APPROVED'].includes(normalizeDecision(decision));
const isDecisionRejected = (decision) => ['REJECT', 'REJECTED'].includes(normalizeDecision(decision));

const buildReleaseRequestHistory = (rrData) => {
    if (!rrData) return [];
    const events = [];
    const rrApprovals = (rrData.approvals ?? rrData.Approvals ?? []).map(mapApprovalStep);
    const rrCreatedAt = firstDefined(rrData.createdAt, rrData.CreatedAt, null);
    const rrSubmittedAt = firstDefined(rrData.submittedAt, rrData.SubmittedAt, null);
    const rrCreatedBy = firstDefined(rrData.requestedByName, rrData.RequestedByName, rrData.createdByName, rrData.CreatedByName, '');

    if (rrCreatedAt) {
        events.push({
            type: 'created',
            title: 'Tạo yêu cầu xuất hàng',
            at: rrCreatedAt,
            actor: rrCreatedBy || HISTORY_EVENT_META.created.fallbackActor,
            note: rrData.releaseRequestCode ? `Mã RR: ${rrData.releaseRequestCode}` : '',
            flowOrder: 10,
        });
    }

    if (rrSubmittedAt) {
        events.push({
            type: 'submitted',
            title: 'Gửi duyệt yêu cầu xuất hàng',
            at: rrSubmittedAt,
            actor: rrCreatedBy || HISTORY_EVENT_META.submitted.fallbackActor,
            note: '',
            flowOrder: 20,
        });
    }

    rrApprovals.forEach((ap) => {
        if (!ap.actionAt) return;
        const approved = isDecisionApproved(ap.decision);
        const rejected = isDecisionRejected(ap.decision);
        events.push({
            type: approved ? 'approved' : rejected ? 'rejected' : 'pending',
            title: approved ? 'RR được duyệt' : rejected ? 'RR bị từ chối' : `RR xử lý bước ${ap.stageNo}`,
            at: ap.actionAt,
            actor: ap.actionByName || HISTORY_EVENT_META.pending.fallbackActor,
            note: ap.reason || '',
            flowOrder: 30,
        });
    });

    return events;
};

const buildGdnHistory = ({ data, approvals }) => {
    const events = [];
    const createdAt = firstDefined(data.createdAt, data.CreatedAt, null);
    const submittedAt = firstDefined(data.submittedAt, data.SubmittedAt, null);
    const createdByName = firstDefined(data.createdByName, data.CreatedByName, data.requesterName, data.RequesterName, '');

    if (createdAt) {
        events.push({
            type: 'created',
            title: 'Tạo phiếu xuất kho',
            at: createdAt,
            actor: createdByName || HISTORY_EVENT_META.created.fallbackActor,
            note: '',
            flowOrder: 40,
        });
    }

    if (submittedAt) {
        events.push({
            type: 'submitted',
            title: 'Gửi duyệt phiếu',
            at: submittedAt,
            actor: createdByName || HISTORY_EVENT_META.submitted.fallbackActor,
            note: '',
            flowOrder: 50,
        });
    }

    approvals.forEach((ap) => {
        if (!ap.actionAt) return;
        const approved = isDecisionApproved(ap.decision);
        const rejected = isDecisionRejected(ap.decision);
        const stageNo = Number(ap.stageNo || 0);
        let title = `Xử lý bước ${ap.stageNo}`;
        let type = 'pending';

        if (stageNo === 1 || stageNo === 2) {
            title = approved ? 'Duyệt phiếu xuất kho' : rejected ? 'Từ chối duyệt phiếu xuất kho' : `Xử lý bước ${ap.stageNo}`;
            type = approved ? 'approved' : rejected ? 'rejected' : 'pending';
        } else if (stageNo === 3) {
            title = 'Đã xuất kho';
            type = 'issued';
        } else if (stageNo === 4) {
            title = 'Xác nhận giấy xuất kho hoàn thành';
            type = approved ? 'completed' : rejected ? 'rejected' : 'completed';
        } else {
            type = approved ? 'approved' : rejected ? 'rejected' : 'pending';
            title = approved
                ? `Duyệt bước ${ap.stageNo}`
                : rejected
                ? `Từ chối bước ${ap.stageNo}`
                : `Xử lý bước ${ap.stageNo}`;
        }

        events.push({
            type,
            title,
            at: ap.actionAt,
            actor: ap.actionByName || HISTORY_EVENT_META.pending.fallbackActor,
            note: ap.reason || '',
            flowOrder: stageNo === 1 || stageNo === 2 ? 60 + stageNo : stageNo === 3 ? 80 : stageNo === 4 ? 90 : 70,
        });
    });

    return events
        .filter((event) => event.at);
};

const buildEmbeddedHistory = ({ data, approvals, rrData }) => {
    const rrEvents = buildReleaseRequestHistory(rrData);
    const gdnEvents = buildGdnHistory({ data, approvals });
    return [...rrEvents, ...gdnEvents]
        .filter((event) => event.at)
        .sort((a, b) => {
            const orderA = Number(a.flowOrder ?? 999);
            const orderB = Number(b.flowOrder ?? 999);
            if (orderA !== orderB) return orderA - orderB;
            const timeA = a?.at ? new Date(a.at).getTime() : 0;
            const timeB = b?.at ? new Date(b.at).getTime() : 0;
            return timeA - timeB;
        });
};

// ── Main Component ────────────────────────────────────────────────────────────
export default function ViewGoodDeliveryNoteDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showToast } = useToastContext();

    const [gdn, setGdn] = useState(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [dialogConfig, setDialogConfig] = useState({ open: false, type: null });
    const [reasonText, setReasonText] = useState('');
    const [evidenceFile, setEvidenceFile] = useState(null);
    const [trackingDialogOpen, setTrackingDialogOpen] = useState(false);

    const userInfo = authService.getUser();
    const permissionRole = getPermissionRole(getRawRoleFromUser(userInfo));
    const currentStatus = String(gdn?.status || '').toUpperCase();

    const canIssue = currentStatus === 'PENDING_ISSUE' && permissionRole === 'WAREHOUSE_KEEPER';
    const canConfirm = currentStatus === 'ISSUED' && (permissionRole === 'ACCOUNTANTS' || permissionRole === 'DIRECTOR');

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const data = await getGoodsDeliveryNoteDetail(id);
            if (data) {
                let rrData = null;
                const rrId = data.releaseRequestId ?? data.ReleaseRequestId ?? null;
                if (rrId != null) {
                    try {
                        rrData = await getReleaseRequestDetail(rrId);
                    } catch (rrError) {
                        console.warn('Không tải được lịch sử RR cho timeline tổng hợp:', rrError);
                    }
                }

                const rawLines = data.lines ?? [];
                const mappedLines = Array.isArray(rawLines)
                    ? rawLines.map((line, idx) => ({
                        /** ID dòng GDN — bắt buộc cho API issue; không dùng idx làm id (tránh gdnLineId = 0) */
                        gdnLineId: line.gdnLineId ?? line.GdnLineId ?? line.lineId ?? line.LineId ?? null,
                        id: line.gdnLineId ?? line.GdnLineId ?? line.lineId ?? line.LineId ?? `row-${idx}`,
                        itemId: line.itemId,
                        itemName: line.itemName ?? '',
                        itemCode: line.itemCode ?? '',
                        uomName: line.uomName ?? '',
                        requestedQty: toNumber(line.requestedQty),
                        actualQty: toNumber(line.actualQty),
                        unitPrice: toNumber(line.unitPrice),
                        lineTotal: toNumber(line.lineTotal),
                        lotId: line.lotId ?? null,
                        locationId: line.locationId ?? null,
                        locationCode: line.locationCode ?? '',
                    }))
                    : [];

                const approvals = (data.approvals ?? data.Approvals ?? []).map(mapApprovalStep);

                setGdn({
                    gdnId: data.gdnId ?? id,
                    gdnCode: data.gdnCode ?? '',
                    releaseRequestId: rrId,
                    warehouseName: data.warehouseName ?? '',
                    requesterName: data.requesterName ?? '',
                    releaseRequestCode: data.releaseRequestCode ?? '',
                    requestDate: formatDateOnly(data.requestDate ?? ''),
                    createdAt: formatDateTime(data.createdAt ?? data.CreatedAt ?? data.submittedAt ?? data.SubmittedAt ?? ''),
                    submittedAt: formatDateTime(data.submittedAt ?? data.SubmittedAt ?? ''),
                    status: data.status ?? '',
                    note: data.note || '',
                    receiverName: data.receiver?.receiverName ?? '',
                    receiverPhone: data.receiver?.phone ?? '',
                    receiverAddress: data.receiver?.address ?? '',
                    carrierName: data.transportInfo?.carrierName ?? '',
                    driverName: data.transportInfo?.driverName ?? '',
                    driverPhone: data.transportInfo?.driverPhone ?? '',
                    licensePlate: data.transportInfo?.licensePlate ?? '',
                    shippingFee: toNumber(data.shippingFee),
                    lines: mappedLines,
                    approvals,
                    history: buildEmbeddedHistory({ data, approvals, rrData }),
                });
            }
        } catch (err) {
            console.error('Lỗi tải GDN:', err);
            notifyApiError(showToast, err, 'Khong the tai du lieu phieu xuat kho');
        } finally {
            setLoading(false);
        }
    }, [id, showToast]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const subtotal = useMemo(() => (gdn?.lines || []).reduce((sum, l) => sum + l.lineTotal, 0), [gdn]);
    const grandTotal = subtotal + toNumber(gdn?.shippingFee);
    const totalQty = useMemo(() => (gdn?.lines || []).reduce((sum, l) => sum + l.actualQty, 0), [gdn]);

    const openDialog = (type) => {
        setReasonText('');
        setEvidenceFile(null);
        setDialogConfig({ open: true, type });
    };
    const closeDialog = () => {
        setDialogConfig({ open: false, type: null });
        setReasonText('');
        setEvidenceFile(null);
    };

    const handleAction = async () => {
        if (dialogConfig.type === 'reject' && !reasonText.trim()) {
            showToast('Vui lòng nhập lý do', 'warning');
            return;
        }
        if (dialogConfig.type === 'confirm' && !evidenceFile) {
            showToast('Vui lòng tải lên ảnh minh chứng trước khi hoàn thành phiếu', 'warning');
            return;
        }
        setProcessing(true);
        try {
            if (dialogConfig.type === 'issue') {
                // Luôn gửi actualQty theo từng dòng hiện có trên phiếu để tránh backend tự override = RequestedQty.
                const issueLines = (gdn?.lines ?? [])
                    .map((line) => ({
                        gdnLineId: Number(line.gdnLineId),
                        actualQty: toNumber(line.actualQty),
                    }))
                    .filter((line) => Number.isFinite(line.gdnLineId) && line.gdnLineId > 0);

                await issueGoodsDeliveryNote(gdn.gdnId, {
                    isAllItemsFulfilled: false,
                    lines: issueLines,
                    note: reasonText.trim() || null,
                });
                notifyApiSuccess(showToast, 'Xuất kho thành công');
            } else if (dialogConfig.type === 'confirm') {
                await confirmDeliveryGoodsDeliveryNote(gdn.gdnId, {
                    evidenceFile,
                    note: reasonText.trim() || undefined,
                });
                notifyApiSuccess(showToast, 'Hoàn thành phiếu xuất kho thành công');
            }
            closeDialog();
            fetchData();
        } catch (err) {
            console.error('Lỗi thao tác:', err);
            notifyApiError(showToast, err, 'Thao tac that bai');
        } finally {
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="create-supplier-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
                <div style={{ color: '#6b7280' }}>Đang tải dữ liệu...</div>
            </div>
        );
    }

    if (!gdn) {
        return (
            <div className="create-supplier-page" style={{ padding: 24 }}>
                <div style={{ textAlign: 'center', color: '#6b7280' }}>Không tìm thấy phiếu xuất kho</div>
            </div>
        );
    }

    const dialogTitles = {
        issue: 'Xác nhận xuất kho',
        confirm: 'Xác nhận hoàn thành phiếu',
    };

    return (
        <div className="create-supplier-page gdn-detail-page">
            {/* Header */}
            <div className="page-header">
                <div className="page-header-left">
                    <button type="button" onClick={() => navigate(-1)} className="back-button">
                        <ArrowLeft size={20} />
                        <span>Quay lại</span>
                    </button>
                </div>
                <div className="page-header-actions" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => showToast('Tính năng đang phát triển', 'info')}>
                        <Printer size={16} />
                        In phiếu
                    </button>
                    {canIssue && (
                        <button type="button" className="btn btn-primary" disabled={processing} onClick={() => openDialog('issue')}>
                            <CheckCircle size={16} />
                            Xác nhận xuất kho
                        </button>
                    )}
                    {canConfirm && (
                        <button type="button" className="btn btn-success" disabled={processing} onClick={() => openDialog('confirm')}>
                            <CheckCircle size={16} />
                            Hoàn thành phiếu
                        </button>
                    )}
                </div>
            </div>

            <div className="form-card">
                <div className="form-wrapper">
                    <div className="form-card-intro gdn-detail-intro">
                        <div className="gdn-detail-intro-row">
                            <div>
                                <h1 className="page-title">Chi tiết phiếu xuất kho</h1>
                                <p className="form-card-required-note" style={{ marginTop: 4 }}>
                                    <FileText size={14} style={{ verticalAlign: 'text-bottom', marginRight: 6, color: '#2563eb' }} />
                                    Mã phiếu: <strong>{gdn.gdnCode || '—'}</strong>
                                </p>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setTrackingDialogOpen(true)}>
                                    <FileText size={15} />Lịch sử Quy trình xuất kho
                                </button>
                                <StatusBadge status={currentStatus} />
                            </div>
                        </div>
                    </div>

                    {/* Main Grid */}
                    <div className="gdn-main-grid">
                        {/* LEFT Column */}
                        <div className="gdn-left-column">
                            <SectionCard title="Chi tiết vật tư xuất" subtitle="Danh sách vật tư và tóm tắt giá trị phiếu">
                                {gdn.lines.length === 0 ? (
                                    <div className="gdn-empty-state">Chưa có vật tư nào trong phiếu xuất kho.</div>
                                ) : (
                                    <div className="gdn-table-wrap">
                                        <table className="product-table">
                                            <thead>
                                                <tr>
                                                    <th style={{ width: 56, textAlign: 'center' }}>STT</th>
                                                    <th>Vật tư</th>
                                                    <th style={{ width: 170 }}>Vị trí / Lô</th>
                                                    <th style={{ width: 120, textAlign: 'right' }}>SL Yêu cầu</th>
                                                    <th style={{ width: 120, textAlign: 'right' }}>Thực xuất</th>
                                                    <th style={{ width: 130, textAlign: 'right' }}>Đơn giá</th>
                                                    <th style={{ width: 150, textAlign: 'right' }}>Thành tiền</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {gdn.lines.map((line, idx) => (
                                                    <tr key={line.id}>
                                                        <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                                                        <td>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                                <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{line.itemName || '-'}</span>
                                                                <span style={{ fontSize: 12, color: '#6b7280' }}>Mã: {line.itemCode || '-'} | ĐVT: {line.uomName || '-'}</span>
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                                <span style={{ fontSize: 13, fontWeight: 600, color: line.locationCode ? '#0f766e' : '#6b7280' }}>
                                                                    {line.locationCode || (line.locationId ? `#${line.locationId}` : '—')}
                                                                </span>
                                                                <span style={{ fontSize: 12, color: '#6b7280' }}>
                                                                    Lô: {line.lotId ?? '—'}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatQuantity(line.requestedQty)}</td>
                                                        <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: '#111827' }}>{formatQuantity(line.actualQty)}</td>
                                                        <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(line.unitPrice)}</td>
                                                        <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: '#2196F3' }}>{formatCurrency(line.lineTotal)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {gdn.lines.length > 0 && (
                                    <>
                                        <hr className="gdn-lines-summary-divider" />
                                        <h3 className="gdn-lines-summary-title">Tóm tắt phiếu</h3>
                                        <div className="gdn-summary-grid">
                                            <SummaryMetric label="Tổng số lượng" value={`${formatQuantity(totalQty)} sản phẩm`} />
                                            <SummaryMetric label="Tiền hàng" value={formatCurrency(subtotal)} />
                                        </div>
                                        <div style={{ marginTop: 12, padding: '14px 16px', borderRadius: 12, border: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, fontSize: 14, color: '#374151' }}>
                                                <span>Phí vận chuyển</span>
                                                <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(gdn.shippingFee)}</span>
                                            </div>
                                        </div>
                                        <div style={{ marginTop: 16, padding: '18px 16px', backgroundColor: '#e3f2fd', borderRadius: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, borderLeft: '4px solid #2196F3' }}>
                                            <span style={{ fontSize: 16, fontWeight: 700, color: '#2196F3' }}>Tổng cộng</span>
                                            <span style={{ fontSize: 22, fontWeight: 800, color: '#2196F3', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(grandTotal)}</span>
                                        </div>
                                    </>
                                )}
                            </SectionCard>
                        </div>

                        {/* RIGHT Column */}
                        <div className="gdn-right-column">
                            <SectionCard title="Thông tin phiếu xuất" subtitle="Thông tin chung của phiếu xuất kho">
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    <ReadonlyField label="Kho xuất" value={gdn.warehouseName || '-'} icon={MapPin} />
                                    <ReadonlyField label="Người yêu cầu" value={gdn.requesterName || '-'} icon={MapPin} />
                                    <ReadonlyField label="Ngày yêu cầu" value={gdn.requestDate || '-'} icon={MapPin} />
                                    <ReadonlyField label="Ngày tạo" value={gdn.createdAt || '-'} icon={MapPin} />
                                    <ReadonlyField label="Ngày gửi duyệt" value={gdn.submittedAt || '-'} icon={MapPin} />
                                    <ReadonlyField label="Yêu cầu xuất kho" value={gdn.releaseRequestCode || '-'} icon={FileText} />

                                    {/* Người nhận */}
                                    <div className="form-field">
                                        <label className="form-label">Người nhận hàng</label>
                                        <div style={{ padding: '12px 16px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: 6 }}>
                                            <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{gdn.receiverName || '-'}</div>
                                            <div style={{ fontSize: 13, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <Phone size={12} /> {gdn.receiverPhone || '-'}
                                            </div>
                                            <div style={{ fontSize: 13, color: '#6b7280' }}>{gdn.receiverAddress || '-'}</div>
                                        </div>
                                    </div>

                                    {/* Đơn vị vận chuyển */}
                                    {gdn.carrierName && (
                                        <div className="form-field">
                                            <label className="form-label">Đơn vị vận chuyển</label>
                                            <div style={{ padding: '12px 16px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{gdn.carrierName}</div>
                                                <div style={{ fontSize: 13, color: '#6b7280' }}>Tài xế: {gdn.driverName || '-'} — {gdn.driverPhone || '-'}</div>
                                                <div style={{ fontSize: 13, color: '#6b7280' }}>Biển số: {gdn.licensePlate || '-'}</div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </SectionCard>

                            <SectionCard title="Ghi chú" subtitle="Nội dung ghi chú của phiếu xuất kho">
                                <div className="gdn-note-box">{gdn.note?.trim() || 'Không có ghi chú.'}</div>
                            </SectionCard>

                        </div>
                    </div>
                </div>
            </div>

            <Dialog open={trackingDialogOpen} onClose={() => setTrackingDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Lịch sử Quy trình xuất kho</DialogTitle>
                <DialogContent dividers>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {gdn.history?.length ? gdn.history.map((event, i) => (
                            <div key={`${event.type}-${event.at}-${i}`} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                                <div style={{
                                    width: 20,
                                    height: 20,
                                    borderRadius: '50%',
                                    backgroundColor: event.type === 'rejected'
                                        ? '#dc2626'
                                        : event.type === 'issued'
                                            ? '#2563eb'
                                            : event.type === 'submitted'
                                                ? '#f59e0b'
                                                : event.type === 'completed'
                                                    ? '#16a34a'
                                                : '#16a34a',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                    marginTop: 2,
                                }}>
                                    {event.type === 'rejected'
                                        ? <XCircle size={12} color="#fff" />
                                        : event.type === 'issued'
                                            ? <Truck size={12} color="#fff" />
                                            : event.type === 'submitted'
                                                ? <Send size={12} color="#fff" />
                                                : event.type === 'completed'
                                                    ? <CheckCircle size={12} color="#fff" />
                                                : <CheckCircle size={12} color="#fff" />}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
                                        {event.title}
                                        {event.note ? <span style={{ fontWeight: 400, color: '#6b7280' }}> — {event.note}</span> : null}
                                    </div>
                                    <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
                                        {event.actor ? `${event.actor} • ` : ''}{event.at ? formatDateTime(event.at) : 'Đang cập nhật'}
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <div className="gdn-empty-state" style={{ padding: 0 }}>Chưa có lịch sử quy trình xuất kho.</div>
                        )}
                    </div>
                </DialogContent>
                <DialogActions>
                    <button type="button" className="btn btn-secondary" onClick={() => setTrackingDialogOpen(false)}>Đóng</button>
                </DialogActions>
            </Dialog>

            <ConfirmDialog
                open={dialogConfig.open}
                onClose={closeDialog}
                onConfirm={handleAction}
                title={dialogTitles[dialogConfig.type] || 'Xác nhận'}
                content={
                    dialogConfig.type !== 'issue' ? (
                        <>
                            <p style={{ marginBottom: 16, fontSize: 14, color: '#374151' }}>
                                {dialogConfig.type === 'approve'
                                    ? 'Bạn có chắc chắn muốn duyệt phiếu xuất kho này không?'
                                    : dialogConfig.type === 'reject'
                                    ? 'Bạn có chắc chắn muốn từ chối phiếu xuất kho này không?'
                                    : 'Bạn có chắc chắn muốn hoàn thành phiếu xuất kho này không?'}
                            </p>
                            {dialogConfig.type === 'confirm' && (
                                <TextField
                                    type="file"
                                    fullWidth
                                    disabled={processing}
                                    inputProps={{ accept: 'image/*,.pdf' }}
                                    onChange={(e) => {
                                        const file = e.target.files?.[0] ?? null;
                                        setEvidenceFile(file);
                                    }}
                                    helperText="Bắt buộc: tải lên ảnh/PDF phiếu xuất có chữ ký xác nhận."
                                    sx={{ mb: 1.5, '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                                />
                            )}
                            <TextField
                                label={dialogConfig.type === 'reject' ? 'Lý do' : 'Ghi chú'}
                                multiline rows={3}
                                fullWidth
                                value={reasonText}
                                onChange={(e) => setReasonText(e.target.value)}
                                disabled={processing}
                                inputProps={{ maxLength: MAX_REASON_LENGTH }}
                                placeholder={
                                    dialogConfig.type === 'reject'
                                        ? 'Nhập lý do từ chối'
                                        : dialogConfig.type === 'confirm'
                                        ? 'Nhập ghi chú (không bắt buộc)'
                                        : 'Nhập ghi chú (không bắt buộc)'
                                }
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                            />
                            <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: 12, color: reasonText.length >= MAX_REASON_LENGTH ? '#ef4444' : '#6b7280', marginTop: 4 }}>
                                {reasonText.length}/{MAX_REASON_LENGTH} ký tự
                            </div>
                        </>
                    ) : (
                        <p style={{ fontSize: 14, color: '#374151' }}>
                            Bạn có chắc chắn muốn xác nhận xuất kho cho phiếu này?
                        </p>
                    )
                }
                confirmText="Xác nhận"
                cancelText="Hủy"
                loading={processing}
                confirmDanger={dialogConfig.type === 'reject'}
                confirmDisabled={
                    processing
                    || (dialogConfig.type === 'reject' && !reasonText.trim())
                    || (dialogConfig.type === 'confirm' && !evidenceFile)
                }
            />
        </div>
    );
}
