// View Release Request Detail
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeft, FileText, Package, MapPin, User,
    Phone, Mail, Briefcase, Calendar, Send, Edit, Loader, ImageIcon,
    CheckCircle, XCircle, Truck,
} from 'lucide-react';
import {
    Box, Typography, CircularProgress,
    Table, TableHead, TableBody, TableRow, TableCell,
    TableContainer, Paper,
    TextField,
} from '@mui/material';
import { ConfirmDialog } from '@ui/dialogs';
import { StatusBadge } from '@ui/badges';
import Toast from '../../components/Toast/Toast';
import { useToast } from '../hooks/useToast';
import authService from '../lib/authService';
import { getPermissionRole, getRawRoleFromUser, isWarehouseKeeper } from '../permissions/roleUtils';
import { getReleaseRequestDetail, submitReleaseRequest, approveReleaseRequest } from '../lib/releaseRequestService';
import { formatDateOnly as formatDate, formatDateTime } from '../lib/dateUtils';
import { canShowCreateGdnFromReleaseRequest } from '../utils/releaseRequestGdnUtils';
import '../styles/CreateSupplier.css';

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatAddress(address, ward, district, city) {
    const parts = [address, ward, district, city].filter(Boolean);
    return parts.length ? parts.join(', ') : '';
}

const toAbsoluteFileUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const apiBase = (import.meta?.env?.VITE_API_BASE_URL || 'http://localhost:5141/api').replace(/\/api\/?$/, '');
    return `${apiBase}${url.startsWith('/') ? '' : '/'}${url}`;
};

function findAttachmentByType(attachments, typeUpper) {
    if (!Array.isArray(attachments)) return null;
    return attachments.find((a) => String(a?.attachmentType || '').toUpperCase() === typeUpper) || null;
}

function ReleaseRequestAttachmentsCard({ attachments }) {
    const quotationAtt = findAttachmentByType(attachments, 'QUOTATION');
    // Backend lưu hợp đồng chính là 'CO' (CK_DAtt_AttType); bản cũ có thể là 'CONTRACT'.
    const contractAtt =
        findAttachmentByType(attachments, 'CO') || findAttachmentByType(attachments, 'CONTRACT');
    return (
        <div className="info-section" style={{ margin: 0, minWidth: 0, overflow: 'hidden' }}>
            <div className="section-header-with-toggle">
                <h2 className="section-title">
                    <FileText size={16} style={{ marginRight: 8, color: '#2196F3' }} />
                    Tệp đính kèm
                </h2>
            </div>
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    minWidth: 0,
                    width: '100%',
                    maxWidth: '100%',
                }}
            >
                <AttachmentFileRow
                    label="Báo giá:"
                    fileName={quotationAtt?.fileName}
                    fileUrl={quotationAtt?.fileUrl}
                />
                <AttachmentFileRow
                    label="Hợp đồng nguyên tắc:"
                    fileName={contractAtt?.fileName}
                    fileUrl={contractAtt?.fileUrl}
                />
            </Box>
        </div>
    );
}

/** Một dòng: nhãn + tên file (ellipsis), không đẩy tràn card */
function AttachmentFileRow({ label, fileName, fileUrl }) {
    const name = fileName?.trim() || 'Tệp đính kèm';
    const href = fileUrl ? toAbsoluteFileUrl(fileUrl) : '';
    const lineSx = {
        display: 'block',
        fontSize: 13,
        fontWeight: 500,
        minWidth: 0,
        maxWidth: '100%',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    };
    return (
        <Box sx={{ minWidth: 0, width: '100%' }}>
            <Typography
                component="div"
                sx={{ fontSize: 12, fontWeight: 600, color: '#64748b', mb: 0.5, letterSpacing: 0.2 }}
            >
                {label}
            </Typography>
            {href ? (
                <Typography
                    component="a"
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={name}
                    sx={{
                        ...lineSx,
                        color: '#2563eb',
                        textDecoration: 'none',
                        '&:hover': { textDecoration: 'underline' },
                    }}
                >
                    {name}
                </Typography>
            ) : name && name !== 'Tệp đính kèm' ? (
                <Typography title={name} sx={{ ...lineSx, color: '#374151' }}>
                    {name}
                </Typography>
            ) : (
                <Typography sx={{ fontSize: 13, color: '#9ca3af' }}>—</Typography>
            )}
        </Box>
    );
}

/** Backend DocumentApprovals dùng APPROVE/REJECT; UI cũ so khớp APPROVED */
function isApprovalPositive(decision) {
    const d = (decision || '').toUpperCase();
    return d === 'APPROVE' || d === 'APPROVED';
}

// LifecycleChip — uses IssueFull/IssuePartial/IssuePending from StatusBadge
const LifecycleChip = ({ lifecycleStatus }) => (
    <StatusBadge status={lifecycleStatus} />
);

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
    /** TK (Thủ kho): không hiển thị tệp đính kèm, người nhận (và thông tin nhạy cảm liên quan). */
    const hideSensitiveForWarehouseKeeper = isWarehouseKeeper(permissionRole);
    const canApprove = data?.status === 'PENDING_ACC' && permissionRole === 'ACCOUNTANTS';
    // RR: status APPROVED + lifecycle Đang đợi xuất / Đã xuất một phần (IssuePending | IssuePartial)
    const canCreateGDN = canShowCreateGdnFromReleaseRequest({
        status: data?.status,
        lifecycleStatus: data?.lifecycleStatus,
        permissionRole,
    });

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
        <div className="create-supplier-page view-release-request-detail-page">
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
                                <StatusBadge status={data.status} />
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
                                    <InfoRow icon={Calendar} label="Gửi duyệt" value={formatDateTime(data.submittedAt)} />
                                    <InfoRow icon={Calendar} label="Duyệt (kế toán)" value={formatDateTime(data.approvedAt)} />
                                    <InfoRow icon={FileText} label="Xuất từng phần" value={data.isPartialDeliveryAllowed ? 'Cho phép' : 'Không'} />
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
                                                        <TableCell sx={{ fontWeight: 600, fontSize: 12, color: '#6b7280', py: 1.5, px: 2, borderBottom: '2px solid #e5e7eb', textAlign: 'right', width: 80 }}>Tồn khả dụng</TableCell>
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
                                                                            {line.packagingSpecName ? ` | Đóng gói: ${line.packagingSpecName}` : ''}
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

                                    <Box
                                        sx={{
                                            mt: 2.5,
                                            pt: lines.length > 0 ? 2.5 : 0,
                                            borderTop: lines.length > 0 ? '1px solid #e5e7eb' : 'none',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 1.25,
                                        }}
                                    >
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                                            <Typography sx={{ color: '#6b7280' }}>Tổng số lượng đã xuất:</Typography>
                                            <Typography sx={{ fontWeight: 600, color: '#7c3aed' }}>{summary.totalIssuedQty.toLocaleString()}</Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                                            <Typography sx={{ color: '#6b7280' }}>Tổng số lượng sẽ xuất:</Typography>
                                            <Typography sx={{ fontWeight: 600, color: '#2563eb' }}>{summary.totalWillIssueQty.toLocaleString()}</Typography>
                                        </Box>
                                        {summary.totalLineAmount > 0 ? (
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                                                <Typography sx={{ color: '#6b7280' }}>Tổng tiền Đơn Xuất:</Typography>
                                                <Typography sx={{ fontWeight: 700, color: '#dc2626', fontSize: '15px' }}>
                                                    {Number(summary.totalLineAmount).toLocaleString('vi-VN')} đ
                                                </Typography>
                                            </Box>
                                        ) : (
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                                                <Typography sx={{ color: '#6b7280' }}>Tổng tiền Đơn Xuất:</Typography>
                                                <Typography sx={{ fontWeight: 600, color: '#9ca3af' }}>-</Typography>
                                            </Box>
                                        )}
                                    </Box>
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
                                                        <TableCell sx={{ fontWeight: 600, fontSize: 12, color: '#6b7280', py: 1.5, px: 2, borderBottom: '2px solid #e5e7eb', textAlign: 'right', width: 100 }}>Giá vốn (đ)</TableCell>
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
                                                                    {line.packagingSpecName ? ` | Đóng gói: ${line.packagingSpecName}` : ''}
                                                                </Typography>
                                                            </TableCell>
                                                            <TableCell sx={{ px: 2, py: 1.5, fontSize: 13, textAlign: 'center', borderBottom: '1px solid #f3f4f6', color: '#6b7280' }}>
                                                                {line.uomName || '-'}
                                                            </TableCell>
                                                            <TableCell sx={{ px: 2, py: 1.5, fontSize: 13, textAlign: 'right', fontVariantNumeric: 'tabular-nums', borderBottom: '1px solid #f3f4f6', color: '#374151' }}>
                                                                {Number(line.costPrice) > 0 ? Number(line.costPrice).toLocaleString('vi-VN') : '-'}
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
                                                        <TableCell colSpan={4} sx={{ px: 2, py: 1.5, fontSize: 13, fontWeight: 700, color: '#92400e', textAlign: 'right' }}>
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

                            {/* Người nhận — ẩn với role TK */}
                            {!hideSensitiveForWarehouseKeeper && (
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
                                        {data.receiver?.notes && (
                                            <InfoRow icon={FileText} label="Ghi chú người nhận" value={data.receiver.notes} fullWidth />
                                        )}
                                    </Box>
                                </div>
                            )}

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

                            {/* Tệp đính kèm — ẩn với role TK */}
                            {!hideSensitiveForWarehouseKeeper && Array.isArray(data.attachments) && data.attachments.length > 0 && (
                                <ReleaseRequestAttachmentsCard attachments={data.attachments} />
                            )}

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
                                                <Box sx={{ width: 20, height: 20, borderRadius: '50%', bgcolor: isApprovalPositive(ap.decision) ? '#16a34a' : '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, mt: 0.3 }}>
                                                    {isApprovalPositive(ap.decision)
                                                        ? <CheckCircle size={12} color="#fff" />
                                                        : <XCircle size={12} color="#fff" />}
                                                </Box>
                                                <Box sx={{ flex: 1 }}>
                                                    <Typography sx={{ fontSize: 13, fontWeight: 500 }}>
                                                        {isApprovalPositive(ap.decision) ? 'Duyệt' : 'Từ chối'}
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

            <ConfirmDialog
                open={approveDialogOpen}
                onClose={() => !processing && setApproveDialogOpen(false)}
                onConfirm={handleApprove}
                title={<><CheckCircle size={20} color="#16a34a" style={{ marginRight: 8 }} />Duyệt yêu cầu xuất hàng</>}
                message={`Bạn có chắc muốn duyệt yêu cầu ${data?.releaseRequestCode}?`}
                content={
                    <TextField
                        label="Ghi chú (không bắt buộc)"
                        value={approveReason}
                        onChange={e => setApproveReason(e.target.value)}
                        fullWidth multiline rows={2}
                        placeholder="Nhập ghi chú nếu có..."
                        sx={{ mt: 1 }}
                    />
                }
                confirmText="Xác nhận duyệt"
                cancelText="Hủy"
                loading={processing}
                actions={
                    <>
                        <button type="button" onClick={() => setApproveDialogOpen(false)} className="btn btn-cancel" disabled={processing}>Hủy</button>
                        <button type="button" onClick={handleApprove} className="btn btn-success" disabled={processing}>
                            {processing ? <><Loader size={14} className="spinner" />Đang xử lý...</> : <><CheckCircle size={14} />Xác nhận duyệt</>}
                        </button>
                    </>
                }
            />

            <ConfirmDialog
                open={rejectDialogOpen}
                onClose={() => !processing && setRejectDialogOpen(false)}
                onConfirm={handleReject}
                title={<><XCircle size={20} color="#dc2626" style={{ marginRight: 8 }} />Từ chối yêu cầu xuất hàng</>}
                message={`Vui lòng nhập lý do từ chối yêu cầu ${data?.releaseRequestCode}.`}
                content={
                    <TextField
                        label="Lý do từ chối *"
                        value={rejectReason}
                        onChange={e => setRejectReason(e.target.value)}
                        fullWidth multiline rows={3}
                        required
                        placeholder="VD: Hàng không đủ số lượng trong kho..."
                        autoFocus
                        sx={{ mt: 1 }}
                    />
                }
                confirmText="Xác nhận từ chối"
                confirmDanger
                cancelText="Hủy"
                loading={processing}
                confirmDisabled={!rejectReason.trim()}
                actions={
                    <>
                        <button type="button" onClick={() => setRejectDialogOpen(false)} className="btn btn-cancel" disabled={processing}>Hủy</button>
                        <button type="button" onClick={handleReject} className="btn btn-danger" disabled={processing}>
                            {processing ? <><Loader size={14} className="spinner" />Đang xử lý...</> : <><XCircle size={14} />Xác nhận từ chối</>}
                        </button>
                    </>
                }
            />
        </div>
    );
}
