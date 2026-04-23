import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    getGoodsDeliveryNoteDetail,
    approveGoodsDeliveryNote,
    issueGoodsDeliveryNote,
} from '../lib/goodsDeliveryNoteService';
import authService from '../lib/authService';
import { getPermissionRole, getRawRoleFromUser } from '../permissions/roleUtils';
import {
    ArrowLeft,
    FileText,
    Package,
    MapPin,
    Truck,
    Phone,
    CheckCircle,
    XCircle,
    History,
    DollarSign,
    Printer,
} from 'lucide-react';
import { TextField } from '@mui/material';
import { ConfirmDialog } from '@ui/dialogs';
import { StatusBadge } from '@ui/badges';
import { useToastContext } from '../../app/context/ToastContext';
import '../styles/CreateSupplier.css';
import '../styles/ViewGoodDeliveryNoteDetail.css';

const MAX_REASON_LENGTH = 250;

// ── Utils ──────────────────────────────────────────────────────────────────
const toNumber = (v, f = 0) => { const p = Number(v); return Number.isFinite(p) ? p : f; };
const formatCurrency = (v) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(toNumber(v));
const formatQuantity = (v) => toNumber(v).toLocaleString('vi-VN', { maximumFractionDigits: 3 });
const formatDateTime = (v) => v ? new Date(v).toLocaleString('vi-VN') : '—';
const formatDateOnly = (v) => v ? new Date(v).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

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

const ApprovalStep = ({ step, isLast }) => (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{
            width: 10, height: 10, borderRadius: '50%', marginTop: 6, flexShrink: 0,
            backgroundColor: step.decision === 'APPROVED' ? '#059669' : step.decision === 'REJECTED' ? '#dc2626' : '#9ca3af',
        }} />
        <div style={{
            flex: 1,
            paddingLeft: 16,
            paddingBottom: isLast ? 0 : 16,
            borderLeft: isLast ? 'none' : '2px solid #e5e7eb',
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
                    Bước {step.stageNo}: {step.actionByName}
                </div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>{formatDateTime(step.actionAt)}</div>
            </div>
            <div style={{ fontSize: 13, color: '#374151', marginTop: 4 }}>
                Kết quả:{' '}
                <span style={{
                    fontWeight: 600,
                    color: step.decision === 'APPROVED' ? '#059669' : step.decision === 'REJECTED' ? '#dc2626' : '#d97706',
                }}>
                    {step.decision === 'APPROVED' ? '✓ Duyệt' : step.decision === 'REJECTED' ? '✗ Từ chối' : '⏳ Chờ'}
                </span>
            </div>
            {step.reason && (
                <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4, fontStyle: 'italic' }}>"{step.reason}"</div>
            )}
        </div>
    </div>
);

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

    const userInfo = authService.getUser();
    const permissionRole = getPermissionRole(getRawRoleFromUser(userInfo));
    const currentStatus = String(gdn?.status || '').toUpperCase();

    const canAct = (currentStatus === 'PENDING_ACC' && permissionRole === 'ACCOUNTANTS') ||
        (currentStatus === 'PENDING_DIR' && permissionRole === 'DIRECTOR');
    const canIssue = currentStatus === 'PENDING_ISSUE' && permissionRole === 'WAREHOUSE_KEEPER';
    const canConfirm = currentStatus === 'ISSUED' && (permissionRole === 'ACCOUNTANTS' || permissionRole === 'DIRECTOR');

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const data = await getGoodsDeliveryNoteDetail(id);
            if (data) {
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

                setGdn({
                    gdnId: data.gdnId ?? id,
                    gdnCode: data.gdnCode ?? '',
                    warehouseName: data.warehouseName ?? '',
                    requesterName: data.requesterName ?? '',
                    releaseRequestCode: data.releaseRequestCode ?? '',
                    requestDate: formatDateOnly(data.requestDate ?? ''),
                    submittedAt: formatDateTime(data.submittedAt ?? ''),
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
                    approvals: (data.approvals ?? []).map((ap) => ({
                        stageNo: ap.stageNo ?? 1,
                        actionByName: ap.actionByName ?? '',
                        actionAt: formatDateTime(ap.actionAt ?? ''),
                        decision: ap.decision ?? 'PENDING',
                        reason: ap.reason ?? '',
                    })),
                });
            }
        } catch (err) {
            console.error('Lỗi tải GDN:', err);
            showToast(err?.response?.data?.message || err?.message || 'Không thể tải dữ liệu phiếu xuất kho', 'error');
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
        setDialogConfig({ open: true, type });
    };
    const closeDialog = () => {
        setDialogConfig({ open: false, type: null });
        setReasonText('');
    };

    const handleAction = async () => {
        if ((dialogConfig.type === 'reject' || dialogConfig.type === 'confirm') && !reasonText.trim()) {
            showToast('Vui lòng nhập lý do', 'warning');
            return;
        }
        setProcessing(true);
        try {
            if (dialogConfig.type === 'approve') {
                await approveGoodsDeliveryNote(gdn.gdnId, { isApproved: true, reason: reasonText.trim() });
                showToast('Đã duyệt phiếu xuất kho', 'success');
            } else if (dialogConfig.type === 'reject') {
                await approveGoodsDeliveryNote(gdn.gdnId, { isApproved: false, reason: reasonText.trim() });
                showToast('Đã từ chối phiếu xuất kho', 'success');
            } else if (dialogConfig.type === 'issue') {
                // Đủ hàng: chỉ IsAllItemsFulfilled — backend tự gán ActualQty = RequestedQty từng dòng (IssueGDNAsync)
                await issueGoodsDeliveryNote(gdn.gdnId, {
                    isAllItemsFulfilled: true,
                    note: reasonText.trim() || null,
                });
                showToast('Xuất kho thành công', 'success');
            }
            closeDialog();
            fetchData();
        } catch (err) {
            console.error('Lỗi thao tác:', err);
            showToast(err?.response?.data?.message || err?.message || 'Thao tác thất bại', 'error');
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
        approve: 'Xác nhận duyệt phiếu',
        reject: 'Xác nhận từ chối phiếu',
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
                    {canAct && (
                        <>
                            <button type="button" className="btn btn-cancel" disabled={processing} onClick={() => openDialog('reject')}>
                                <XCircle size={15} />
                                Từ chối
                            </button>
                            <button type="button" className="btn btn-primary" disabled={processing} onClick={() => openDialog('approve')}>
                                <CheckCircle size={16} />
                                Duyệt phiếu
                            </button>
                        </>
                    )}
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
                            <StatusBadge status={currentStatus} />
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
                                    <ReadonlyField label="Ngày tạo" value={gdn.submittedAt || '-'} icon={MapPin} />
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

                            <SectionCard title="Lịch sử phê duyệt" subtitle="Các mốc phê duyệt của phiếu">
                                <div style={{ padding: 16, backgroundColor: '#f9fafb', borderRadius: 12, border: '1px solid #e5e7eb' }}>
                                    {gdn.approvals?.length ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                                            {gdn.approvals.map((ap, i) => (
                                                <ApprovalStep key={i} step={ap} isLast={i === gdn.approvals.length - 1} />
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="gdn-empty-state" style={{ padding: 0 }}>Chưa có lịch sử phê duyệt.</div>
                                    )}
                                </div>
                            </SectionCard>
                        </div>
                    </div>
                </div>
            </div>

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
                            <TextField
                                label="Lý do"
                                multiline rows={3}
                                fullWidth
                                value={reasonText}
                                onChange={(e) => setReasonText(e.target.value)}
                                disabled={processing}
                                inputProps={{ maxLength: MAX_REASON_LENGTH }}
                                placeholder={dialogConfig.type === 'approve' ? 'Nhập ghi chú (không bắt buộc)' : 'Nhập lý do từ chối'}
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
                confirmDisabled={processing || (dialogConfig.type !== 'issue' && !reasonText.trim())}
            />
        </div>
    );
}
