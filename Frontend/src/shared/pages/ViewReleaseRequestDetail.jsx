// View Release Request Detail
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeft, FileText, Package, MapPin, User,
    Phone, Mail, Briefcase, Calendar, Send, Edit, Loader, ImageIcon,
    CheckCircle, XCircle, Truck,
} from 'lucide-react';
import {
    Box, Typography, Chip, CircularProgress,
    Table, TableHead, TableBody, TableRow, TableCell,
    TableContainer, Paper,
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField,
} from '@mui/material';
import Toast from '../../components/Toast/Toast';
import { useToast } from '../hooks/useToast';
import authService from '../lib/authService';
import { getPermissionRole, getRawRoleFromUser } from '../permissions/roleUtils';
import { getReleaseRequestDetail, submitReleaseRequest, approveReleaseRequest } from '../lib/releaseRequestService';
import '../styles/CreateSupplier.css';

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr + (dateStr.endsWith('Z') ? '' : 'Z'));
    if (Number.isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString('vi-VN');
}

function formatDateTime(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr + (dateStr.endsWith('Z') ? '' : 'Z'));
    if (Number.isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function formatAddress(address, ward, district, city) {
    const parts = [address, ward, district, city].filter(Boolean);
    return parts.length ? parts.join(', ') : '';
}

const STATUS_STYLE = {
    DRAFT:        { bg: 'rgba(107,114,128,0.15)', color: '#374151', label: 'Nháp' },
    PENDING_ACC:  { bg: 'rgba(251,191,36,0.20)', color: '#92400e', label: 'Chờ duyệt' },
    APPROVED:     { bg: 'rgba(16,185,129,0.18)', color: '#065f46', label: 'Đã duyệt' },
    REJECTED:     { bg: 'rgba(239,68,68,0.15)',  color: '#991b1b', label: 'Từ chối' },
    CANCELLED:    { bg: 'rgba(239,68,68,0.12)',  color: '#7f1d1d', label: 'Đã hủy' },
};

const LIFECYCLE_STYLE = {
    IssueFull:    { bg: 'rgba(16,185,129,0.15)', color: '#065f46', label: 'Xuất đủ hàng' },
    IssuePartial: { bg: 'rgba(251,191,36,0.20)', color: '#92400e', label: 'Xuất 1 phần hàng' },
    IssuePending: { bg: 'rgba(59,130,246,0.15)', color: '#1e40af', label: 'Đang đợi xuất hàng' },
};

const StatusChip = ({ status }) => {
    const s = STATUS_STYLE[status?.toUpperCase()] ?? { bg: 'rgba(107,114,128,0.15)', color: '#374151', label: status ?? '-' };
    return (
        <Chip label={s.label} size="small"
            sx={{ fontWeight: 500, fontSize: '12px', borderRadius: '999px', height: 26,
                minWidth: 100, bgcolor: s.bg, color: s.color, border: 'none',
                '& .MuiChip-label': { px: 1.5, py: 0, textAlign: 'left', display: 'block', width: '100%' } }}
        />
    );
};

const LifecycleChip = ({ lifecycleStatus }) => {
    const s = LIFECYCLE_STYLE[lifecycleStatus] ?? { bg: 'rgba(107,114,128,0.10)', color: '#374151', label: lifecycleStatus ?? '-' };
    return (
        <Chip label={s.label} size="small"
            sx={{ fontWeight: 500, fontSize: '12px', borderRadius: '999px', height: 26,
                minWidth: 130, bgcolor: s.bg, color: s.color, border: 'none',
                '& .MuiChip-label': { px: 1.5, py: 0, textAlign: 'left', display: 'block', width: '100%' } }}
        />
    );
};

const InfoRow = ({ icon: Icon, label, value, fullWidth }) => (
    <Box sx={{ display: 'flex', alignItems: fullWidth ? 'flex-start' : 'center', gap: 1.5, minHeight: 36 }}>
        {Icon && <Icon size={15} style={{ color: '#9ca3af', flexShrink: 0, marginTop: 2 }} />}
        <Box sx={{ minWidth: 0, flex: fullWidth ? 1 : 'none' }}>
            <Typography component="span" sx={{ fontSize: '12px', color: '#9ca3af', display: 'block', lineHeight: 1.3 }}>
                {label}
            </Typography>
            <Typography component="span" sx={{ fontSize: '13px', color: '#111827', fontWeight: 500, lineHeight: 1.4, wordBreak: 'break-word' }}>
                {value || <Typography component="span" sx={{ color: '#d1d5db', fontStyle: 'italic' }}>-</Typography>}
            </Typography>
        </Box>
    </Box>
);

// ─── Main Component ─────────────────────────────────────────────────────────

export default function ViewReleaseRequestDetail() {
    const navigate = useNavigate();
    const { id } = useParams();
    const { toast, showToast, clearToast } = useToast();

    const [data, setData] = useState(null);
    const [lines, setLines] = useState([]);
    const [approvals, setApprovals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState('items'); // 'items' | 'amount'

    // Approve / Reject
    const [approveDialogOpen, setApproveDialogOpen] = useState(false);
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
    const [approveReason, setApproveReason] = useState('');
    const [rejectReason, setRejectReason] = useState('');
    const [processing, setProcessing] = useState(false);

    const fetchDetail = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        try {
            const result = await getReleaseRequestDetail(id);
            if (!result) {
                showToast('Không tìm thấy yêu cầu xuất hàng.', 'error');
                navigate('/release-request');
                return;
            }
            setData(result);
            setLines(result.lines ?? []);
            setApprovals(result.approvals ?? []);
        } catch (err) {
            const msg = err?.message || err?.response?.data?.message || 'Không tải được chi tiết yêu cầu xuất hàng.';
            showToast(msg, 'error');
        } finally {
            setLoading(false);
        }
    }, [id, navigate, showToast]);

    useEffect(() => { fetchDetail(); }, [fetchDetail]);

    const handleSubmit = async () => {
        if (!data) return;
        setSubmitting(true);
        try {
            await submitReleaseRequest(data.releaseRequestId);
            showToast('Gửi yêu cầu duyệt thành công!', 'success');
            fetchDetail();
        } catch (err) {
            const msg = err?.message || err?.response?.data?.message || 'Gửi yêu cầu thất bại.';
            showToast(msg, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const canSubmit = data?.status === 'DRAFT';
    const canEdit = data?.status === 'DRAFT';

    // Kế toán có thể duyệt / từ chối yêu cầu đang chờ duyệt
    const userInfo = authService.getUser();
    const permissionRole = getPermissionRole(getRawRoleFromUser(userInfo));
    const canApprove = data?.status === 'PENDING_ACC' && permissionRole === 'ACCOUNTANTS';
    // Chỉ hiện nút tạo phiếu xuất kho khi:
    // - Release Request đã được duyệt (APPROVED)
    // - VÀ lifecycle status là "Đang đợi xuất hàng" (IssuePending) HOẶC "Xuất một phần" (IssuePartial)
    // - VÀ role là THỦ KHO
    const canCreateGDN =
        data?.status === 'APPROVED' &&
        permissionRole === 'WAREHOUSE_KEEPER' &&
        ['IssuePending', 'IssuePartial'].includes(data?.lifecycleStatus);

    const handleCreateGDN = () => {
        navigate(`/good-delivery-notes/create?releaseRequestId=${data.releaseRequestId}`);
    };

    const handleApprove = async () => {
        setProcessing(true);
        try {
            await approveReleaseRequest(data.releaseRequestId, {
                isApproved: true,
                reason: approveReason.trim() || null,
            });
            showToast('Duyệt yêu cầu xuất hàng thành công!', 'success');
            setApproveDialogOpen(false);
            setApproveReason('');
            fetchDetail();
        } catch (err) {
            const msg = err?.message || err?.response?.data?.message || 'Duyệt thất bại.';
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
            await approveReleaseRequest(data.releaseRequestId, {
                isApproved: false,
                reason: rejectReason.trim(),
            });
            showToast('Đã từ chối yêu cầu xuất hàng.', 'success');
            setRejectDialogOpen(false);
            setRejectReason('');
            fetchDetail();
        } catch (err) {
            const msg = err?.message || err?.response?.data?.message || 'Từ chối thất bại.';
            showToast(msg, 'error');
        } finally {
            setProcessing(false);
        }
    };

    const summary = {
        totalItems: lines.length,
        totalRequestedQty: lines.reduce((s, l) => s + (Number(l.requestedQty) || 0), 0),
        totalApprovedQty: lines.reduce((s, l) => s + (Number(l.approvedQty) || 0), 0),
        totalAllocatedQty: lines.reduce((s, l) => s + (Number(l.allocatedQty) || 0), 0),
        totalIssuedQty: lines.reduce((s, l) => s + (Number(l.issuedQty) || 0), 0),
        totalLineAmount: lines.reduce((s, l) => s + (Number(l.lineTotal) || 0), 0),
        totalWillIssueQty: lines.reduce((s, l) => s + (Number(l.approvedQty) || 0), 0),
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (!data) return null;

    return (
        <div className="create-supplier-page">
            {/* Header */}
            <div className="page-header">
                <div className="page-header-left">
                    <button type="button" onClick={() => navigate('/release-request')} className="back-button">
                        <ArrowLeft size={20} /><span>Quay lại</span>
                    </button>
                </div>
                <div className="page-header-actions">
                    {canApprove && (
                        <>
                            <button type="button" className="btn btn-danger" disabled={processing} onClick={() => setRejectDialogOpen(true)}>
                                <XCircle size={15} />Từ chối
                            </button>
                            <button type="button" className="btn btn-success" disabled={processing} onClick={() => setApproveDialogOpen(true)}>
                                <CheckCircle size={15} />Duyệt
                            </button>
                        </>
                    )}
                    {canCreateGDN && (
                        <button type="button" className="btn btn-primary" onClick={handleCreateGDN}>
                            <Truck size={15} />Tạo Phiếu Xuất Kho
                        </button>
                    )}
                    {canEdit && (
                        <button type="button" className="btn btn-secondary" onClick={() => navigate(`/release-request/${id}/edit`)}>
                            <Edit size={15} />Chỉnh sửa
                        </button>
                    )}
                    {canSubmit && (
                        <button type="button" className="btn btn-primary" disabled={submitting} onClick={handleSubmit}>
                            {submitting ? (
                                <><Loader size={15} className="spinner" />Đang gửi...</>
                            ) : (
                                <><Send size={15} />Gửi duyệt</>
                            )}
                        </button>
                    )}
                </div>
            </div>

            <div className="form-card">
                <form className="form-wrapper">
                    {/* Page title */}
                    <div className="form-card-intro">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box>
                                <h1 className="page-title">Chi tiết yêu cầu xuất hàng</h1>
                                <p className="form-card-required-note" style={{ marginTop: 4 }}>
                                    Ma: <strong>{data.releaseRequestCode}</strong>
                                </p>
                            </Box>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                <StatusChip status={data.status} />
                                {data.lifecycleStatus && <LifecycleChip lifecycleStatus={data.lifecycleStatus} />}
                            </Box>
                        </Box>
                    </div>

                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 3, alignItems: 'start' }}>

                        {/* LEFT: Lines + Tabs */}
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

                            {/* Tab header */}
                            <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #e5e7eb' }}>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('items')}
                                    style={{
                                        padding: '10px 20px',
                                        background: 'none',
                                        border: 'none',
                                        borderBottom: activeTab === 'items' ? '2px solid #2196F3' : '2px solid transparent',
                                        color: activeTab === 'items' ? '#2196F3' : '#6b7280',
                                        fontWeight: activeTab === 'items' ? 600 : 500,
                                        fontSize: '14px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        marginBottom: -2,
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    <Package size={16} />
                                    Vật tư ({lines.length})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('amount')}
                                    style={{
                                        padding: '10px 20px',
                                        background: 'none',
                                        border: 'none',
                                        borderBottom: activeTab === 'amount' ? '2px solid #2196F3' : '2px solid transparent',
                                        color: activeTab === 'amount' ? '#2196F3' : '#6b7280',
                                        fontWeight: activeTab === 'amount' ? 600 : 500,
                                        fontSize: '14px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        marginBottom: -2,
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    Tổng tiền
                                </button>
                            </div>

                            {/* Thong tin kho & ngay */}
                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">
                                        <MapPin size={16} style={{ marginRight: 8, color: '#2196F3' }} />
                                        Kho xuat & Ngay
                                    </h2>
                                </div>
                                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                                    <InfoRow icon={MapPin} label="Kho xuất" value={data.warehouseName} />
                                    <InfoRow icon={Calendar} label="Ngày xuất dự kiến" value={formatDate(data.expectedDate)} />
                                    <InfoRow icon={Calendar} label="Ngày yêu cầu" value={formatDate(data.requestedDate)} />
                                    <InfoRow icon={Calendar} label="Ngày tạo" value={formatDateTime(data.createdAt)} />
                                    <InfoRow icon={FileText} label="Lý do xuất" value={data.purpose} fullWidth />
                                </Box>
                            </div>

                            {/* ── Tab: Vật tư ─────────────────────────────────── */}
                            {activeTab === 'items' && (
                                <div className="info-section" style={{ margin: 0 }}>
                                    <div className="section-header-with-toggle">
                                        <h2 className="section-title">
                                            <Package size={16} style={{ marginRight: 8, color: '#2196F3' }} />
                                            Vật tư yêu cầu xuất
                                        </h2>
                                        <span style={{ fontSize: 13, color: '#6b7280', fontWeight: 400 }}>
                                            {lines.length} vật tư
                                        </span>
                                    </div>

                                    {lines.length === 0 ? (
                                        <Box sx={{ py: 4, textAlign: 'center', color: '#9ca3af' }}>
                                            <Package size={40} style={{ opacity: 0.4, margin: '0 auto 8px' }} />
                                            <Typography sx={{ fontSize: 13 }}>Chưa có vật tư nào</Typography>
                                        </Box>
                                    ) : (
                                        <TableContainer component={Paper} elevation={0}
                                            sx={{ border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
                                            <Table size="small">
                                                <TableHead>
                                                    <TableRow sx={{ bgcolor: '#fafafa' }}>
                                                        <TableCell sx={{ fontWeight: 600, fontSize: 12, color: '#6b7280', py: 1.5, px: 2, borderBottom: '2px solid #e5e7eb', width: 50, textAlign: 'center' }}>STT</TableCell>
                                                        <TableCell sx={{ fontWeight: 600, fontSize: 12, color: '#6b7280', py: 1.5, px: 2, borderBottom: '2px solid #e5e7eb' }}>Vật tư</TableCell>
                                                        <TableCell sx={{ fontWeight: 600, fontSize: 12, color: '#6b7280', py: 1.5, px: 2, borderBottom: '2px solid #e5e7eb', textAlign: 'right', width: 80 }}>Tồn kho</TableCell>
                                                        <TableCell sx={{ fontWeight: 600, fontSize: 12, color: '#6b7280', py: 1.5, px: 2, borderBottom: '2px solid #e5e7eb', textAlign: 'right', width: 90 }}>SL yêu cầu</TableCell>
                                                        <TableCell sx={{ fontWeight: 600, fontSize: 12, color: '#6b7280', py: 1.5, px: 2, borderBottom: '2px solid #e5e7eb', textAlign: 'right', width: 90 }}>SL duyệt</TableCell>
                                                        <TableCell sx={{ fontWeight: 600, fontSize: 12, color: '#6b7280', py: 1.5, px: 2, borderBottom: '2px solid #e5e7eb', textAlign: 'right', width: 90 }}>SL phân bổ</TableCell>
                                                        <TableCell sx={{ fontWeight: 600, fontSize: 12, color: '#6b7280', py: 1.5, px: 2, borderBottom: '2px solid #e5e7eb', textAlign: 'right', width: 90 }}>SL đã xuất</TableCell>
                                                        <TableCell sx={{ fontWeight: 600, fontSize: 12, color: '#6b7280', py: 1.5, px: 2, borderBottom: '2px solid #e5e7eb', width: 80 }}>Ghi chú</TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {lines.map((line, idx) => (
                                                        <TableRow key={line.releaseRequestLineId ?? idx}
                                                            sx={{ '&:last-child td': { borderBottom: 0 }, '&:hover': { bgcolor: '#fafafa' } }}>
                                                            <TableCell sx={{ px: 2, py: 1.5, fontSize: 13, textAlign: 'center', borderBottom: '1px solid #f3f4f6' }}>
                                                                {idx + 1}
                                                            </TableCell>
                                                            <TableCell sx={{ px: 2, py: 1.5, fontSize: 13, borderBottom: '1px solid #f3f4f6' }}>
                                                                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                                                                    <Box sx={{
                                                                        width: 36, height: 36, display: 'flex', alignItems: 'center',
                                                                        justifyContent: 'center', borderRadius: 6,
                                                                        border: '1px solid #e5e7eb', bgcolor: '#f3f4f6', flexShrink: 0
                                                                    }}>
                                                                        <ImageIcon size={18} color="#9ca3af" />
                                                                    </Box>
                                                                    <Box>
                                                                        <Typography sx={{ fontSize: 13, fontWeight: 500, color: '#1f2937' }}>
                                                                            {line.itemName}
                                                                        </Typography>
                                                                        <Typography sx={{ fontSize: 11, color: '#6b7280' }}>
                                                                            Mã: {line.itemCode} | ĐVT: {line.uomName}
                                                                        </Typography>
                                                                    </Box>
                                                                </Box>
                                                            </TableCell>
                                                            <TableCell sx={{ px: 2, py: 1.5, fontSize: 13, textAlign: 'right', fontVariantNumeric: 'tabular-nums', borderBottom: '1px solid #f3f4f6', color: Number(line.stockQty) === 0 ? '#dc2626' : '#111827', fontWeight: 500 }}>
                                                                {(Number(line.stockQty) || 0).toLocaleString()}
                                                            </TableCell>
                                                            <TableCell sx={{ px: 2, py: 1.5, fontSize: 13, textAlign: 'right', fontVariantNumeric: 'tabular-nums', borderBottom: '1px solid #f3f4f6' }}>
                                                                {(Number(line.requestedQty) || 0).toLocaleString()}
                                                            </TableCell>
                                                            <TableCell sx={{ px: 2, py: 1.5, fontSize: 13, textAlign: 'right', fontVariantNumeric: 'tabular-nums', borderBottom: '1px solid #f3f4f6', color: '#059669', fontWeight: 500 }}>
                                                                {(Number(line.approvedQty) || 0).toLocaleString()}
                                                            </TableCell>
                                                            <TableCell sx={{ px: 2, py: 1.5, fontSize: 13, textAlign: 'right', fontVariantNumeric: 'tabular-nums', borderBottom: '1px solid #f3f4f6', color: '#2563eb' }}>
                                                                {(Number(line.allocatedQty) || 0).toLocaleString()}
                                                            </TableCell>
                                                            <TableCell sx={{ px: 2, py: 1.5, fontSize: 13, textAlign: 'right', fontVariantNumeric: 'tabular-nums', borderBottom: '1px solid #f3f4f6', color: '#7c3aed' }}>
                                                                {(Number(line.issuedQty) || 0).toLocaleString()}
                                                            </TableCell>
                                                            <TableCell sx={{ px: 2, py: 1.5, fontSize: 12, color: '#6b7280', borderBottom: '1px solid #f3f4f6', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={line.note}>
                                                                {line.note || '-'}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    )}
                                </div>
                            )}

                            {/* ── Tab: Tổng tiền ─────────────────────────────────── */}
                            {activeTab === 'amount' && (
                                <div className="info-section" style={{ margin: 0 }}>
                                    <div className="section-header-with-toggle">
                                        <h2 className="section-title">
                                            <Package size={16} style={{ marginRight: 8, color: '#2196F3' }} />
                                            Tổng tiền yêu cầu xuất
                                        </h2>
                                        <span style={{ fontSize: 13, color: '#6b7280', fontWeight: 400 }}>
                                            {lines.length} vật tư
                                        </span>
                                    </div>

                                    {lines.length === 0 ? (
                                        <Box sx={{ py: 4, textAlign: 'center', color: '#9ca3af' }}>
                                            <Package size={40} style={{ opacity: 0.4, margin: '0 auto 8px' }} />
                                            <Typography sx={{ fontSize: 13 }}>Chưa có vật tư nào</Typography>
                                        </Box>
                                    ) : (
                                        <TableContainer component={Paper} elevation={0}
                                            sx={{ border: '1px solid #e5e7eb', borderRadius: '12px', overflow: 'hidden' }}>
                                            <Table size="small">
                                                <TableHead>
                                                    <TableRow sx={{ bgcolor: '#fafafa' }}>
                                                        <TableCell sx={{ fontWeight: 600, fontSize: 12, color: '#6b7280', py: 1.5, px: 2, borderBottom: '2px solid #e5e7eb', width: 50, textAlign: 'center' }}>STT</TableCell>
                                                        <TableCell sx={{ fontWeight: 600, fontSize: 12, color: '#6b7280', py: 1.5, px: 2, borderBottom: '2px solid #e5e7eb' }}>Vật tư</TableCell>
                                                        <TableCell sx={{ fontWeight: 600, fontSize: 12, color: '#6b7280', py: 1.5, px: 2, borderBottom: '2px solid #e5e7eb', textAlign: 'center', width: 60 }}>ĐVT</TableCell>
                                                        <TableCell sx={{ fontWeight: 600, fontSize: 12, color: '#6b7280', py: 1.5, px: 2, borderBottom: '2px solid #e5e7eb', textAlign: 'right', width: 90 }}>SL sẽ xuất</TableCell>
                                                        <TableCell sx={{ fontWeight: 600, fontSize: 12, color: '#6b7280', py: 1.5, px: 2, borderBottom: '2px solid #e5e7eb', textAlign: 'right', width: 110 }}>Đơn giá (đ)</TableCell>
                                                        <TableCell sx={{ fontWeight: 600, fontSize: 12, color: '#6b7280', py: 1.5, px: 2, borderBottom: '2px solid #e5e7eb', textAlign: 'right', width: 120 }}>Thành tiền (đ)</TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {lines.map((line, idx) => (
                                                        <TableRow key={line.releaseRequestLineId ?? idx}
                                                            sx={{ '&:last-child td': { borderBottom: 0 }, '&:hover': { bgcolor: '#fafafa' } }}>
                                                            <TableCell sx={{ px: 2, py: 1.5, fontSize: 13, textAlign: 'center', borderBottom: '1px solid #f3f4f6' }}>
                                                                {idx + 1}
                                                            </TableCell>
                                                            <TableCell sx={{ px: 2, py: 1.5, fontSize: 13, borderBottom: '1px solid #f3f4f6' }}>
                                                                <Typography sx={{ fontSize: 13, fontWeight: 500, color: '#1f2937' }}>
                                                                    {line.itemName}
                                                                </Typography>
                                                                <Typography sx={{ fontSize: 11, color: '#6b7280' }}>
                                                                    Mã: {line.itemCode}
                                                                </Typography>
                                                            </TableCell>
                                                            <TableCell sx={{ px: 2, py: 1.5, fontSize: 13, textAlign: 'center', borderBottom: '1px solid #f3f4f6', color: '#6b7280' }}>
                                                                {line.uomName || '-'}
                                                            </TableCell>
                                                            <TableCell sx={{ px: 2, py: 1.5, fontSize: 13, textAlign: 'right', fontVariantNumeric: 'tabular-nums', borderBottom: '1px solid #f3f4f6', color: '#2563eb', fontWeight: 600 }}>
                                                                {(Number(line.approvedQty) || 0).toLocaleString()}
                                                            </TableCell>
                                                            <TableCell sx={{ px: 2, py: 1.5, fontSize: 13, textAlign: 'right', fontVariantNumeric: 'tabular-nums', borderBottom: '1px solid #f3f4f6', color: '#374151' }}>
                                                                {line.unitPrice ? Number(line.unitPrice).toLocaleString('vi-VN') : '-'}
                                                            </TableCell>
                                                            <TableCell sx={{ px: 2, py: 1.5, fontSize: 13, textAlign: 'right', fontVariantNumeric: 'tabular-nums', borderBottom: '1px solid #f3f4f6', color: '#dc2626', fontWeight: 600 }}>
                                                                {line.lineTotal ? Number(line.lineTotal).toLocaleString('vi-VN') : '-'}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                    {/* TỔNG CỘNG */}
                                                    <TableRow sx={{ bgcolor: '#fef3c7', '& td': { borderBottom: 0 } }}>
                                                        <TableCell colSpan={3} sx={{ px: 2, py: 1.5, fontSize: 13, fontWeight: 700, color: '#92400e', textAlign: 'right' }}>
                                                            TỔNG CỘNG
                                                        </TableCell>
                                                        <TableCell sx={{ px: 2, py: 1.5, fontSize: 13, textAlign: 'right', fontWeight: 700, color: '#2563eb' }}>
                                                            {summary.totalWillIssueQty.toLocaleString()}
                                                        </TableCell>
                                                        <TableCell sx={{ px: 2, py: 1.5, fontSize: 13, borderBottom: '1px solid #f3f4f6' }} />
                                                        <TableCell sx={{ px: 2, py: 1.5, fontSize: 13, textAlign: 'right', fontWeight: 700, color: '#dc2626' }}>
                                                            {summary.totalLineAmount > 0 ? Number(summary.totalLineAmount).toLocaleString('vi-VN') : '-'}
                                                        </TableCell>
                                                    </TableRow>
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    )}
                                </div>
                            )}

                            {/* Ghi chú */}
                            {data.note && (
                                <div className="info-section" style={{ margin: 0 }}>
                                    <div className="section-header-with-toggle">
                                        <h2 className="section-title">Ghi chú</h2>
                                    </div>
                                    <Typography sx={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>
                                        {data.note}
                                    </Typography>
                                </div>
                            )}
                        </Box>

                        {/* RIGHT: Info */}
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

                            {/* Người yêu cầu */}
                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">
                                        <User size={16} style={{ marginRight: 8, color: '#2196F3' }} />
                                        Người yêu cầu
                                    </h2>
                                </div>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                    <InfoRow label="Nhân viên" value={data.requestedByName} />
                                    <InfoRow label="Công ty" value={data.companyName} />
                                </Box>
                            </div>

                            {/* Người nhận */}
                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">
                                        <User size={16} style={{ marginRight: 8, color: '#2196F3' }} />
                                        Người nhận
                                    </h2>
                                </div>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                    <InfoRow label="Tên người nhận" value={data.receiverName} />
                                    <InfoRow icon={Phone} label="Số điện thoại" value={data.receiverPhone} />
                                    <InfoRow icon={Mail} label="Email" value={data.receiverEmail} />
                                    {data.receiverPosition && (
                                        <InfoRow icon={Briefcase} label="Chức vụ" value={data.receiverPosition} />
                                    )}
                                </Box>
                            </div>

                            {/* Địa chỉ giao hàng */}
                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">
                                        <MapPin size={16} style={{ marginRight: 8, color: '#2196F3' }} />
                                        Địa chỉ giao hàng
                                    </h2>
                                </div>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                    <InfoRow label="Địa chỉ" value={formatAddress(data.address, data.ward, data.district, data.city)} fullWidth />
                                </Box>
                            </div>

                            {/* Tổng kết */}
                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Tổng kết</h2>
                                </div>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                                        <Typography sx={{ color: '#6b7280' }}>Tổng vật tư:</Typography>
                                        <Typography sx={{ fontWeight: 600, color: '#111827' }}>{summary.totalItems}</Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                                        <Typography sx={{ color: '#6b7280' }}>Tổng SL yêu cầu:</Typography>
                                        <Typography sx={{ fontWeight: 600, color: '#111827' }}>{summary.totalRequestedQty.toLocaleString()}</Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                                        <Typography sx={{ color: '#6b7280' }}>Tổng SL duyệt:</Typography>
                                        <Typography sx={{ fontWeight: 600, color: '#059669' }}>{summary.totalApprovedQty.toLocaleString()}</Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                                        <Typography sx={{ color: '#6b7280' }}>Tổng SL phân bổ:</Typography>
                                        <Typography sx={{ fontWeight: 600, color: '#2563eb' }}>{summary.totalAllocatedQty.toLocaleString()}</Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                                        <Typography sx={{ color: '#6b7280' }}>Tổng SL đã xuất:</Typography>
                                        <Typography sx={{ fontWeight: 600, color: '#7c3aed' }}>{summary.totalIssuedQty.toLocaleString()}</Typography>
                                    </Box>
                                </Box>
                            </div>

                            {/* Tổng tiền */}
                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Tổng tiền</h2>
                                </div>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                                        <Typography sx={{ color: '#6b7280' }}>SL sẽ xuất:</Typography>
                                        <Typography sx={{ fontWeight: 600, color: '#2563eb' }}>{summary.totalWillIssueQty.toLocaleString()}</Typography>
                                    </Box>
                                    {summary.totalLineAmount > 0 ? (
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                                            <Typography sx={{ color: '#6b7280' }}>Tổng tiền RR:</Typography>
                                            <Typography sx={{ fontWeight: 700, color: '#dc2626', fontSize: '15px' }}>
                                                {Number(summary.totalLineAmount).toLocaleString('vi-VN')} đ
                                            </Typography>
                                        </Box>
                                    ) : (
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                                            <Typography sx={{ color: '#6b7280' }}>Tổng tiền RR:</Typography>
                                            <Typography sx={{ fontWeight: 600, color: '#9ca3af' }}>-</Typography>
                                        </Box>
                                    )}
                                </Box>
                            </div>

                            {/* Lịch sử duyệt */}
                            {approvals.length > 0 && (
                                <div className="info-section" style={{ margin: 0 }}>
                                    <div className="section-header-with-toggle">
                                        <h2 className="section-title">
                                            <FileText size={16} style={{ marginRight: 8, color: '#2196F3' }} />
                                            Lịch sử duyệt
                                        </h2>
                                    </div>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        {approvals.map((ap, i) => (
                                            <Box key={ap.approvalId ?? i} sx={{ display: 'flex', gap: 1.5, fontSize: 13 }}>
                                                <Box sx={{ width: 20, height: 20, borderRadius: '50%', bgcolor: ap.decision === 'APPROVED' ? '#16a34a' : '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, mt: 0.3 }}>
                                                    {ap.decision === 'APPROVED'
                                                        ? <CheckCircle size={12} color="#fff" />
                                                        : <XCircle size={12} color="#fff" />}
                                                </Box>
                                                <Box sx={{ flex: 1 }}>
                                                    <Typography sx={{ fontSize: 13, fontWeight: 500 }}>
                                                        {ap.decision === 'APPROVED' ? 'Duyệt' : 'Từ chối'}
                                                        {ap.reason && <Typography component="span" sx={{ fontWeight: 400, color: '#6b7280' }}> — {ap.reason}</Typography>}
                                                    </Typography>
                                                    <Typography sx={{ fontSize: 11, color: '#9ca3af' }}>
                                                        {ap.actionByName} • {formatDateTime(ap.actionAt)}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        ))}
                                    </Box>
                                </div>
                            )}
                        </Box>
                    </Box>
                </form>
            </div>

            {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}

            {/* Dialog: Duyệt */}
            <Dialog open={approveDialogOpen} onClose={() => !processing && setApproveDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 600, fontSize: '16px', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckCircle size={20} color="#16a34a" />Duyệt yêu cầu xuất hàng
                </DialogTitle>
                <DialogContent>
                    <Typography sx={{ mb: 2, fontSize: 14, color: '#374151' }}>
                        Bạn có chắc muốn duyệt yêu cầu <strong>{data?.releaseRequestCode}</strong>?
                    </Typography>
                    <TextField
                        label="Ghi chú (không bắt buộc)"
                        value={approveReason}
                        onChange={e => setApproveReason(e.target.value)}
                        fullWidth multiline rows={2}
                        placeholder="Nhập ghi chú nếu có..."
                    />
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <button type="button" onClick={() => setApproveDialogOpen(false)} className="btn btn-cancel" disabled={processing}>Hủy</button>
                    <button type="button" onClick={handleApprove} className="btn btn-success" disabled={processing}>
                        {processing ? <><Loader size={14} className="spinner" />Đang xử lý...</> : <><CheckCircle size={14} />Xác nhận duyệt</>}
                    </button>
                </DialogActions>
            </Dialog>

            {/* Dialog: Từ chối */}
            <Dialog open={rejectDialogOpen} onClose={() => !processing && setRejectDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 600, fontSize: '16px', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <XCircle size={20} color="#dc2626" />Từ chối yêu cầu xuất hàng
                </DialogTitle>
                <DialogContent>
                    <Typography sx={{ mb: 2, fontSize: 14, color: '#374151' }}>
                        Vui lòng nhập lý do từ chối yêu cầu <strong>{data?.releaseRequestCode}</strong>.
                    </Typography>
                    <TextField
                        label="Lý do từ chối *"
                        value={rejectReason}
                        onChange={e => setRejectReason(e.target.value)}
                        fullWidth multiline rows={3}
                        required
                        placeholder="VD: Hàng không đủ số lượng trong kho..."
                        autoFocus
                    />
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <button type="button" onClick={() => setRejectDialogOpen(false)} className="btn btn-cancel" disabled={processing}>Hủy</button>
                    <button type="button" onClick={handleReject} className="btn btn-danger" disabled={processing}>
                        {processing ? <><Loader size={14} className="spinner" />Đang xử lý...</> : <><XCircle size={14} />Xác nhận từ chối</>}
                    </button>
                </DialogActions>
            </Dialog>
        </div>
    );
}
