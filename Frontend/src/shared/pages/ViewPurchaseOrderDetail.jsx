import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Switch,
    TextField,
    Collapse,
    Box,
} from '@mui/material';
import {
    ArrowLeft,
    Building2,
    MapPin,
    User,
    Calendar,
    Package,
    Eye,
    ImageIcon,
    Edit,
    CheckCircle,
    XCircle,
    Clock,
    FileText,
    Save,
    X,
    Loader
} from 'lucide-react';
import Toast from '../../components/Toast/Toast';
import { useToast } from '../hooks/useToast';
import authService from '../lib/authService';
import { getPermissionRole, getRawRoleFromUser } from '../permissions/roleUtils';
import '../styles/CreateSupplier.css';

const MAX_REASON_LENGTH = 250;

const ViewPurchaseOrderDetail = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { toast, showToast, clearToast } = useToast();
    const permissionRole = getPermissionRole(getRawRoleFromUser(authService.getUser()));
    const [loading, setLoading] = useState(true);
    const [imageErrors, setImageErrors] = useState({});
    const [isEditing, setIsEditing] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [confirmDialogType, setConfirmDialogType] = useState('approve'); // 'approve' | 'reject'
    const [includeReason, setIncludeReason] = useState(false);
    const [reasonText, setReasonText] = useState('');

    const MAX_JUSTIFICATION_LENGTH = 250;

    // Mock data - sau này sẽ load từ API
    const [orderData, setOrderData] = useState({
        purchaseOrderId: 1,
        orderCode: 'PO-2025-001',
        supplierName: 'Công ty TNHH ABC',
        warehouseName: 'Kho Hà Nội',
        creatorName: 'Nguyễn Văn A',
        responsiblePersonName: 'Trần Thị B',
        expectedReceiptDate: '2025-03-15',
        justification: 'Đặt hàng bổ sung tồn kho cho quý 1/2025',
        discountType: 'percent', // 'percent' | 'amount'
        discount: 5,
        discountAmountFixed: 0,
        additionalCosts: [], // [{ id, name, amount }]
        approvalStatus: 'Approved', // Pending, Approved, Rejected
        receivingStatus: 'Partial', // Pending, Partial, Completed
        createdAt: '2025-03-01',
        lines: [
            {
                id: 1,
                itemId: 1,
                itemName: 'Laptop Dell XPS 13',
                itemImage: 'https://via.placeholder.com/40',
                orderedQty: 10,
                receivedQty: 5,
                unitPrice: 25000000,
                totalPrice: 250000000,
                note: 'Cần giao trước ngày 15/3'
            },
            {
                id: 2,
                itemId: 2,
                itemName: 'Màn hình LG 27 inch',
                itemImage: null,
                orderedQty: 20,
                receivedQty: 20,
                unitPrice: 5000000,
                totalPrice: 100000000,
                note: ''
            },
            {
                id: 3,
                itemId: 3,
                itemName: 'Bàn phím cơ Keychron',
                itemImage: 'https://via.placeholder.com/40',
                orderedQty: 15,
                receivedQty: 0,
                unitPrice: 2000000,
                totalPrice: 30000000,
                note: 'Ưu tiên giao sớm'
            },
            {
                id: 4,
                itemId: 4,
                itemName: 'Chuột Logitech MX Master 3',
                itemImage: 'https://via.placeholder.com/40',
                orderedQty: 25,
                receivedQty: 15,
                unitPrice: 1500000,
                totalPrice: 37500000,
                note: ''
            },
            {
                id: 5,
                itemId: 5,
                itemName: 'Tai nghe Sony WH-1000XM4',
                itemImage: null,
                orderedQty: 12,
                receivedQty: 12,
                unitPrice: 7000000,
                totalPrice: 84000000,
                note: 'Đã nhập đủ'
            },
            {
                id: 6,
                itemId: 6,
                itemName: 'Webcam Logitech C920',
                itemImage: 'https://via.placeholder.com/40',
                orderedQty: 30,
                receivedQty: 10,
                unitPrice: 1800000,
                totalPrice: 54000000,
                note: 'Còn thiếu 20 cái'
            },
            {
                id: 7,
                itemId: 7,
                itemName: 'USB Hub Anker 7-Port',
                itemImage: null,
                orderedQty: 40,
                receivedQty: 0,
                unitPrice: 500000,
                totalPrice: 20000000,
                note: 'Chưa nhập'
            },
            {
                id: 8,
                itemId: 8,
                itemName: 'Đế tản nhiệt laptop Cooler Master',
                itemImage: 'https://via.placeholder.com/40',
                orderedQty: 18,
                receivedQty: 18,
                unitPrice: 800000,
                totalPrice: 14400000,
                note: ''
            },
            {
                id: 9,
                itemId: 9,
                itemName: 'Ổ cứng SSD Samsung 1TB',
                itemImage: 'https://via.placeholder.com/40',
                orderedQty: 50,
                receivedQty: 25,
                unitPrice: 2500000,
                totalPrice: 125000000,
                note: 'Nhập từng đợt'
            },
            {
                id: 10,
                itemId: 10,
                itemName: 'RAM Corsair 16GB DDR4',
                itemImage: null,
                orderedQty: 35,
                receivedQty: 35,
                unitPrice: 1200000,
                totalPrice: 42000000,
                note: 'Hoàn thành'
            },
            {
                id: 11,
                itemId: 11,
                itemName: 'Cable HDMI 2.1 - 2m',
                itemImage: 'https://via.placeholder.com/40',
                orderedQty: 100,
                receivedQty: 50,
                unitPrice: 150000,
                totalPrice: 15000000,
                note: 'Giao nốt 50 cái'
            },
            {
                id: 12,
                itemId: 12,
                itemName: 'Loa Bluetooth JBL Flip 5',
                itemImage: null,
                orderedQty: 22,
                receivedQty: 0,
                unitPrice: 2200000,
                totalPrice: 48400000,
                note: 'Đang chờ hàng về'
            },
            {
                id: 13,
                itemId: 13,
                itemName: 'Bộ chuyển đổi USB-C Hub',
                itemImage: 'https://via.placeholder.com/40',
                orderedQty: 45,
                receivedQty: 22,
                unitPrice: 650000,
                totalPrice: 29250000,
                note: 'Còn thiếu 23 cái'
            },
            {
                id: 14,
                itemId: 14,
                itemName: 'Micro không dây Rode Wireless Go',
                itemImage: 'https://via.placeholder.com/40',
                orderedQty: 8,
                receivedQty: 8,
                unitPrice: 5500000,
                totalPrice: 44000000,
                note: ''
            },
            {
                id: 15,
                itemId: 15,
                itemName: 'Đèn LED ring light 18 inch',
                itemImage: null,
                orderedQty: 16,
                receivedQty: 5,
                unitPrice: 1100000,
                totalPrice: 17600000,
                note: 'Đợt 1: 5 cái'
            }
        ],
        history: [
            { time: '14:30', phone: '0866563616', action: 'Đã phê duyệt đơn hàng', date: '2025-03-02' },
            { time: '10:15', phone: '0866563616', action: 'Gửi yêu cầu phê duyệt', date: '2025-03-01' },
            { time: '09:00', phone: '0866563616', action: 'Thêm mới đơn nhập hàng PO-2025-001', date: '2025-03-01' }
        ]
    });

    useEffect(() => {
        // Mock load data
        setTimeout(() => {
            setLoading(false);
        }, 500);
    }, [id]);

    const handleImageError = (id) => {
        setImageErrors(prev => ({ ...prev, [id]: true }));
    };

    const isValidImageUrl = (url) => {
        if (!url || typeof url !== 'string') return false;
        try {
            const urlObj = new URL(url);
            return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
        } catch {
            return false;
        }
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
    };

    const totalQuantity = orderData.lines.reduce((sum, line) => sum + (Number(line.orderedQty) || 0), 0);
    const subtotal = orderData.lines.reduce((sum, line) => sum + (Number(line.totalPrice) || 0), 0);
    const discountAmount = orderData.discountType === 'amount'
        ? (Number(orderData.discountAmountFixed) || 0)
        : (subtotal * (Number(orderData.discount) || 0)) / 100;
    const totalAdditionalCosts = (orderData.additionalCosts || []).reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
    const grandTotal = subtotal - discountAmount + totalAdditionalCosts;

    const getApprovalStatusStyle = (status) => {
        const styles = {
            'Pending': { label: 'Chờ duyệt', color: '#f59e0b', bgColor: '#fef3c7' },
            'Approved': { label: 'Đã duyệt', color: '#10b981', bgColor: '#d1fae5' },
            'Rejected': { label: 'Từ chối', color: '#ef4444', bgColor: '#fee2e2' }
        };
        return styles[status] || { label: status, color: '#6b7280', bgColor: '#f3f4f6' };
    };

    const getReceivingStatusStyle = (status) => {
        const styles = {
            'Pending': { label: 'Chờ nhập', color: '#f59e0b', bgColor: '#fef3c7' },
            'Partial': { label: 'Nhập một phần', color: '#3b82f6', bgColor: '#dbeafe' },
            'Completed': { label: 'Hoàn thành', color: '#10b981', bgColor: '#d1fae5' }
        };
        return styles[status] || { label: status, color: '#6b7280', bgColor: '#f3f4f6' };
    };

    const approvalStyle = getApprovalStatusStyle(orderData.approvalStatus);
    const receivingStyle = getReceivingStatusStyle(orderData.receivingStatus);

    const handleChange = (e) => {
        const { name, value } = e.target;
        
        // Giới hạn 250 ký tự cho trường justification
        if (name === 'justification' && value.length > MAX_JUSTIFICATION_LENGTH) {
            return;
        }
        
        setOrderData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const setDiscountType = (type) => {
        setOrderData(prev => ({ ...prev, discountType: type }));
    };

    const addAdditionalCost = () => {
        setOrderData(prev => ({
            ...prev,
            additionalCosts: [
                ...(prev.additionalCosts || []),
                { id: Date.now(), name: '', amount: 0 }
            ]
        }));
    };

    const removeAdditionalCost = (id) => {
        setOrderData(prev => ({
            ...prev,
            additionalCosts: (prev.additionalCosts || []).filter(c => c.id !== id)
        }));
    };

    const updateAdditionalCost = (id, field, value) => {
        setOrderData(prev => ({
            ...prev,
            additionalCosts: (prev.additionalCosts || []).map(c =>
                c.id === id ? { ...c, [field]: field === 'amount' ? (Number(value) || 0) : value } : c
            )
        }));
    };

    const updateLine = (index, field, value) => {
        setOrderData(prev => ({
            ...prev,
            lines: prev.lines.map((line, i) => {
                if (i === index) {
                    const updated = { ...line, [field]: value };
                    if (field === 'orderedQty' || field === 'unitPrice') {
                        updated.totalPrice = (Number(updated.orderedQty) || 0) * (Number(updated.unitPrice) || 0);
                    }
                    return updated;
                }
                return line;
            })
        }));
    };

    const validateOrderSummary = () => {
        if (orderData.discountType === 'percent') {
            const v = Number(orderData.discount);
            if (isNaN(v) || v < 0 || v > 100) {
                showToast('Chiết khấu (%) phải từ 0 đến 100.', 'error');
                return false;
            }
        } else {
            const v = Number(orderData.discountAmountFixed);
            if (isNaN(v) || v < 0) {
                showToast('Chiết khấu (số tiền) phải lớn hơn hoặc bằng 0.', 'error');
                return false;
            }
        }
        const costs = orderData.additionalCosts || [];
        for (let i = 0; i < costs.length; i++) {
            const amount = Number(costs[i].amount) || 0;
            const name = (costs[i].name || '').trim();
            if (amount > 0 && !name) {
                showToast(`Dòng chi phí thứ ${i + 1}: nhập tên chi phí khi có số tiền.`, 'error');
                return false;
            }
            if (amount < 0) {
                showToast(`Dòng chi phí thứ ${i + 1}: số tiền phải lớn hơn hoặc bằng 0.`, 'error');
                return false;
            }
        }
        return true;
    };

    const handleSave = async () => {
        if (!validateOrderSummary()) return;
        try {
            setSubmitting(true);
            // Mock API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            showToast('Cập nhật đơn mua hàng thành công!', 'success');
            setIsEditing(false);
        } catch (error) {
            showToast(error.message || 'Có lỗi xảy ra', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancel = () => {
        setIsEditing(false);
        // Reload data
        setLoading(true);
        setTimeout(() => setLoading(false), 500);
    };

    const openConfirmDialog = (type) => {
        setConfirmDialogType(type);
        setIncludeReason(false);
        setReasonText('');
        setConfirmDialogOpen(true);
    };
    const closeConfirmDialog = () => {
        if (submitting) return;
        setConfirmDialogOpen(false);
        setIncludeReason(false);
        setReasonText('');
    };
    const handleReasonChange = (e) => {
        setReasonText(e.target.value.slice(0, MAX_REASON_LENGTH));
    };
    const canConfirmAction = !submitting;

    const handleConfirmAction = async () => {
        if (!canConfirmAction) return;
        try {
            setSubmitting(true);
            await new Promise((r) => setTimeout(r, 600));
            const reason = includeReason ? reasonText.trim() : '';
            const isApprove = confirmDialogType === 'approve';
            setOrderData((prev) => ({
                ...prev,
                approvalStatus: isApprove ? 'Approved' : 'Rejected',
            }));
            showToast(isApprove ? 'Đã duyệt đơn mua hàng.' : 'Đã hủy đơn mua hàng.', 'success');
            closeConfirmDialog();
        } catch (e) {
            showToast(e?.message || 'Có lỗi xảy ra', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleApprove = () => openConfirmDialog('approve');
    const handleReject = () => openConfirmDialog('reject');

    if (loading) {
        return (
            <div className="create-supplier-page">
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                    <div style={{ fontSize: '16px', color: '#6b7280' }}>Đang tải dữ liệu...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="create-supplier-page">
            {/* Popup xác nhận Duyệt đơn / Hủy đơn */}
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
                <DialogTitle
                    sx={{
                        px: 3,
                        pt: 2.25,
                        pb: 1.75,
                        fontSize: '14px',
                        fontWeight: 700,
                        color: '#111827',
                        borderBottom: '1px solid #eef2f7',
                    }}
                >
                    {confirmDialogType === 'approve' ? 'Xác nhận duyệt đơn' : 'Xác nhận hủy đơn'}
                </DialogTitle>

                <DialogContent
                    sx={{
                        px: 3,
                        pt: 3.5,
                        pb: 2.5,
                    }}
                >
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            py: 1.5,
                            mb: includeReason ? 1.5 : 0,
                            pl: 0.5,
                        }}
                    >
                        <Switch
                            checked={includeReason}
                            onChange={(e) => setIncludeReason(e.target.checked)}
                            size="small"
                            sx={{
                                mr: 1,
                                width: 40,
                                height: 24,
                                p: 0,
                                display: 'flex',
                                '& .MuiSwitch-switchBase': {
                                    p: '3px',
                                    '&.Mui-checked': {
                                        transform: 'translateX(16px)',
                                        color: '#ffffff',
                                        '& + .MuiSwitch-track': {
                                            backgroundColor: '#0ea5e9',
                                            opacity: 1,
                                        },
                                    },
                                },
                                '& .MuiSwitch-thumb': {
                                    width: 18,
                                    height: 18,
                                    boxShadow: 'none',
                                },
                                '& .MuiSwitch-track': {
                                    borderRadius: 12,
                                    backgroundColor: '#cfefff',
                                    opacity: 1,
                                },
                            }}
                        />

                        <Box
                            component="span"
                            sx={{
                                fontSize: '14px',
                                fontWeight: 500,
                                color: '#374151',
                                userSelect: 'none',
                            }}
                        >
                            Kèm lý do
                        </Box>
                    </Box>

                    <Collapse in={includeReason} timeout={200}>
                        <Box>
                            <TextField
                                fullWidth
                                multiline
                                minRows={3}
                                maxRows={5}
                                value={reasonText}
                                onChange={handleReasonChange}
                                placeholder="Nhập lý do (tùy chọn)"
                                variant="outlined"
                                inputProps={{ maxLength: MAX_REASON_LENGTH }}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        alignItems: 'flex-start',
                                        backgroundColor: '#f3f4f6',
                                        borderRadius: '12px',
                                        '& fieldset': {
                                            border: '1px solid transparent',
                                        },
                                        '&:hover fieldset': {
                                            border: '1px solid transparent',
                                        },
                                        '&.Mui-focused fieldset': {
                                            border: '1px solid #d1d5db',
                                        },
                                        '& textarea': {
                                            padding: '16px 18px !important',
                                            fontSize: '14px',
                                            lineHeight: 1.5,
                                            color: '#111827',
                                        },
                                    },
                                    '& .MuiInputBase-input::placeholder': {
                                        color: '#9ca3af',
                                        opacity: 1,
                                    },
                                }}
                            />

                            <Box
                                sx={{
                                    mt: 0.75,
                                    textAlign: 'right',
                                    fontSize: '12px',
                                    color: '#6b7280',
                                    lineHeight: 1,
                                }}
                            >
                                {reasonText.length}/{MAX_REASON_LENGTH}
                            </Box>
                        </Box>
                    </Collapse>
                </DialogContent>

                <DialogActions
                    sx={{
                        px: 3,
                        py: 2,
                        gap: 1.5,
                        justifyContent: 'flex-end',
                        borderTop: '1px solid #eef2f7',
                    }}
                >
                    <Button
                        onClick={closeConfirmDialog}
                        disabled={submitting}
                        disableRipple
                        sx={{
                            minWidth: '72px',
                            height: 40,
                            px: 1,
                            borderRadius: '10px',
                            textTransform: 'none',
                            fontSize: '14px',
                            fontWeight: 600,
                            color: '#6b7280',
                            backgroundColor: 'transparent',
                            boxShadow: 'none',
                            '&:hover': {
                                backgroundColor: 'transparent',
                                color: '#4b5563',
                                boxShadow: 'none',
                            },
                        }}
                    >
                        Hủy
                    </Button>
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
                            '&:hover': {
                                backgroundColor: confirmDialogType === 'approve' ? '#0284c7' : '#dc2626',
                                boxShadow: 'none',
                            },
                            '&:disabled': {
                                backgroundColor: '#bae6fd',
                                color: '#ffffff',
                            },
                        }}
                    >
                        {submitting ? 'Đang xử lý...' : 'Xác nhận'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Header */}
            <div className="page-header">
                <div className="page-header-left">
                    <button type="button" onClick={() => navigate(-1)} className="back-button">
                        <ArrowLeft size={20} />
                        <span>Quay lại</span>
                    </button>
                </div>
                <div className="page-header-actions">
                    {!isEditing ? (
                        <>
                            {permissionRole === 'ACCOUNTANTS' && (
                                <>
                                    <button
                                        type="button"
                                        className="btn btn-cancel"
                                        disabled={submitting}
                                        onClick={handleReject}
                                    >
                                        <XCircle size={16} className="btn-icon" />
                                        Hủy đơn
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-primary"
                                        disabled={submitting}
                                        onClick={handleApprove}
                                    >
                                        <CheckCircle size={16} className="btn-icon" />
                                        Duyệt đơn
                                    </button>
                                </>
                            )}
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setIsEditing(true)}
                            >
                                <Edit size={16} className="btn-icon" />
                                Chỉnh sửa
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                type="button"
                                onClick={handleCancel}
                                className="btn btn-cancel"
                                disabled={submitting}
                            >
                                <X size={16} className="btn-icon" />
                                Hủy
                            </button>
                            <button
                                type="button"
                                className="btn btn-primary"
                                disabled={submitting}
                                onClick={handleSave}
                            >
                                {submitting ? (
                                    <>
                                        <Loader size={16} className="btn-icon spinner" />
                                        Đang lưu...
                                    </>
                                ) : (
                                    <>
                                        <Save size={16} className="btn-icon" />
                                        Lưu thay đổi
                                    </>
                                )}
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Form Card */}
            <div className="form-card">
                <div className="form-wrapper">
                    {/* Intro */}
                    <div className="form-card-intro">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                            <div>
                                <h1 className="page-title">Chi tiết đơn mua hàng</h1>
                                <p style={{ fontSize: '14px', color: '#6b7280', margin: '8px 0 0 0' }}>
                                    Mã đơn: <span style={{ fontWeight: 600, color: '#2196F3' }}>{orderData.orderCode}</span>
                                </p>
                            </div>
                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                <div style={{
                                    padding: '8px 16px',
                                    borderRadius: '20px',
                                    backgroundColor: approvalStyle.bgColor,
                                    color: approvalStyle.color,
                                    fontWeight: 600,
                                    fontSize: '13px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}>
                                    {orderData.approvalStatus === 'Approved' && <CheckCircle size={16} />}
                                    {orderData.approvalStatus === 'Rejected' && <XCircle size={16} />}
                                    {orderData.approvalStatus === 'Pending' && <Clock size={16} />}
                                    {approvalStyle.label}
                                </div>
                                <div style={{
                                    padding: '8px 16px',
                                    borderRadius: '20px',
                                    backgroundColor: receivingStyle.bgColor,
                                    color: receivingStyle.color,
                                    fontWeight: 600,
                                    fontSize: '13px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}>
                                    {orderData.receivingStatus === 'Completed' && <CheckCircle size={16} />}
                                    {orderData.receivingStatus === 'Partial' && <Clock size={16} />}
                                    {orderData.receivingStatus === 'Pending' && <Clock size={16} />}
                                    {receivingStyle.label}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Layout 2 cột: Chi tiết sản phẩm (trái) + Thông tin chung (phải) */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px', alignItems: 'flex-start' }}>
                        {/* 1. Chi tiết sản phẩm (Trái) */}
                        <div className="info-section" style={{ margin: 0, display: 'flex', flexDirection: 'column' }}>
                            <div className="section-header-with-toggle">
                                <h2 className="section-title">Chi tiết sản phẩm</h2>
                            </div>

                            <div className="table-container" style={{ flex: 1, overflowY: 'auto', maxHeight: '500px' }}>
                                <table className="product-table">
                                    <thead>
                                        <tr>
                                            <th style={{ width: '40px' }}>STT</th>
                                            <th>Sản phẩm</th>
                                            <th style={{ width: '80px', textAlign: 'center' }}>ĐVT</th>
                                            <th style={{ width: '100px' }}>SL đặt</th>
                                            <th style={{ width: '120px' }}>Đơn giá</th>
                                            <th style={{ width: '140px' }}>Thành tiền</th>
                                            <th style={{ width: '180px' }}>Ghi chú</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {orderData.lines.map((line, index) => {
                                            return (
                                                <tr key={line.id}>
                                                    <td style={{ textAlign: 'center' }}>{index + 1}</td>
                                                    <td>
                                                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                                            {/* Ảnh hoặc Icon sản phẩm */}
                                                            {isValidImageUrl(line.itemImage) && !imageErrors[`line-${line.id}`] ? (
                                                                <img 
                                                                    src={line.itemImage} 
                                                                    alt={line.itemName}
                                                                    onError={() => handleImageError(`line-${line.id}`)}
                                                                    style={{
                                                                        width: '40px',
                                                                        height: '40px',
                                                                        objectFit: 'cover',
                                                                        borderRadius: '6px',
                                                                        border: '1px solid #e5e7eb',
                                                                        flexShrink: 0
                                                                    }}
                                                                />
                                                            ) : (
                                                                <div style={{
                                                                    width: '40px',
                                                                    height: '40px',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    borderRadius: '6px',
                                                                    border: '1px solid #e5e7eb',
                                                                    backgroundColor: '#f3f4f6',
                                                                    flexShrink: 0
                                                                }}>
                                                                    <ImageIcon size={20} color="#9ca3af" />
                                                                </div>
                                                            )}
                                                            
                                                            {/* Tên sản phẩm và icon Eye */}
                                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: 1 }}>
                                                                <a
                                                                    href="#"
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        console.log('View product detail:', line.itemId);
                                                                    }}
                                                                    style={{
                                                                        color: '#2196F3',
                                                                        textDecoration: 'none',
                                                                        fontSize: '14px',
                                                                        fontWeight: 500,
                                                                        flex: 1
                                                                    }}
                                                                    onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                                                                    onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                                                                >
                                                                    {line.itemName}
                                                                </a>
                                                                <button
                                                                    type="button"
                                                                    className="btn-icon-only"
                                                                    style={{ color: '#2196F3' }}
                                                                    title="Xem chi tiết sản phẩm"
                                                                    onClick={() => {
                                                                        console.log('View product detail:', line.itemId);
                                                                    }}
                                                                >
                                                                    <Eye size={18} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td
                                                        style={{
                                                            textAlign: 'center',
                                                            verticalAlign: 'middle',
                                                            fontSize: 14,
                                                            color: '#374151',
                                                        }}
                                                    >
                                                        {line.uom || '—'}
                                                    </td>
                                                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                                                        {isEditing ? (
                                                            <input
                                                                type="number"
                                                                value={line.orderedQty}
                                                                onChange={(e) => updateLine(index, 'orderedQty', Number(e.target.value))}
                                                                min="1"
                                                                className="form-input"
                                                                style={{ textAlign: 'right', width: '100%' }}
                                                            />
                                                        ) : (
                                                            line.orderedQty
                                                        )}
                                                    </td>
                                                    <td style={{ textAlign: 'right' }}>
                                                        {isEditing ? (
                                                            <input
                                                                type="number"
                                                                value={line.unitPrice}
                                                                onChange={(e) => updateLine(index, 'unitPrice', Number(e.target.value))}
                                                                min="0"
                                                                className="form-input"
                                                                style={{ textAlign: 'right', width: '100%' }}
                                                            />
                                                        ) : (
                                                            formatCurrency(line.unitPrice)
                                                        )}
                                                    </td>
                                                    <td style={{ textAlign: 'right', fontWeight: 600, color: '#2196F3' }}>
                                                        {formatCurrency(line.totalPrice)}
                                                    </td>
                                                    <td style={{ fontSize: '13px', color: '#6b7280' }}>
                                                        {isEditing ? (
                                                            <input
                                                                type="text"
                                                                value={line.note}
                                                                onChange={(e) => updateLine(index, 'note', e.target.value)}
                                                                placeholder="Nhập ghi chú"
                                                                className="form-input"
                                                                style={{ width: '100%' }}
                                                            />
                                                        ) : (
                                                            line.note || '-'
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* 2. Nhân viên (Phải) */}
                        <div className="info-section" style={{ margin: 0 }}>
                            <div className="section-header-with-toggle">
                                <h2 className="section-title">Thông tin chung</h2>
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {/* Nhân viên tạo */}
                                <div className="form-field">
                                    <label className="form-label">Nhân viên tạo</label>
                                    <div className="input-wrapper">
                                        <User className="input-icon" size={16} />
                                        <input
                                            type="text"
                                            value={orderData.creatorName}
                                            readOnly
                                            className="form-input"
                                            style={{ backgroundColor: '#f5f5f5' }}
                                        />
                                    </div>
                                </div>

                                {/* Nhân viên phụ trách */}
                                <div className="form-field">
                                    <label className="form-label">Nhân viên phụ trách</label>
                                    <div className="input-wrapper">
                                        <User className="input-icon" size={16} />
                                        <input
                                            type="text"
                                            name="responsiblePersonName"
                                            value={orderData.responsiblePersonName || ''}
                                            onChange={handleChange}
                                            readOnly={!isEditing}
                                            className="form-input"
                                            style={{ backgroundColor: isEditing ? 'white' : '#f5f5f5' }}
                                            placeholder={isEditing ? "Chọn nhân viên phụ trách" : "-"}
                                        />
                                    </div>
                                </div>

                                {/* Kho nhận */}
                                <div className="form-field">
                                    <label className="form-label">Kho nhận</label>
                                    <div className="input-wrapper">
                                        <MapPin className="input-icon" size={16} />
                                        <input
                                            type="text"
                                            name="warehouseName"
                                            value={orderData.warehouseName}
                                            onChange={handleChange}
                                            readOnly={!isEditing}
                                            className="form-input"
                                            style={{ backgroundColor: isEditing ? 'white' : '#f5f5f5' }}
                                        />
                                    </div>
                                </div>

                                {/* Ngày dự kiến nhập */}
                                <div className="form-field">
                                    <label className="form-label">Ngày nhập dự kiến</label>
                                    <div className="input-wrapper">
                                        <Calendar className="input-icon" size={16} />
                                        <input
                                            type={isEditing ? "date" : "text"}
                                            name="expectedReceiptDate"
                                            value={isEditing ? orderData.expectedReceiptDate : new Date(orderData.expectedReceiptDate).toLocaleDateString('vi-VN')}
                                            onChange={handleChange}
                                            readOnly={!isEditing}
                                            className="form-input"
                                            style={{ backgroundColor: isEditing ? 'white' : '#f5f5f5' }}
                                        />
                                    </div>
                                </div>

                                {/* Ngày tạo */}
                                <div className="form-field">
                                    <label className="form-label">Ngày tạo</label>
                                    <div className="input-wrapper">
                                        <Calendar className="input-icon" size={16} />
                                        <input
                                            type="text"
                                            value={new Date(orderData.createdAt).toLocaleDateString('vi-VN')}
                                            readOnly
                                            className="form-input"
                                            style={{ backgroundColor: '#f5f5f5' }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Layout 2 cột: (Nhà cung cấp + Ghi chú + Tổng hợp) (trái), Lịch sử (phải) */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px', alignItems: 'start' }}>
                        {/* Cột trái: Nhà cung cấp + Ghi chú + Tổng hợp */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {/* 3. Nhà cung cấp */}
                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Nhà cung cấp</h2>
                                </div>
                                <div className="form-field">
                                    <label className="form-label">Nhà cung cấp</label>
                                    <div className="input-wrapper">
                                        <Building2 className="input-icon" size={16} />
                                        <input
                                            type="text"
                                            name="supplierName"
                                            value={orderData.supplierName}
                                            onChange={handleChange}
                                            readOnly={!isEditing}
                                            className="form-input"
                                            style={{ backgroundColor: isEditing ? 'white' : '#f5f5f5' }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* 4. Ghi chú */}
                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Ghi chú</h2>
                                </div>
                                <div className="form-field">
                                    <label className="form-label">Ghi chú / Lý do đặt hàng</label>
                                    <textarea
                                        name="justification"
                                        value={orderData.justification || ''}
                                        onChange={handleChange}
                                        readOnly={!isEditing}
                                        rows={4}
                                        className="form-input"
                                        placeholder={isEditing ? "Nhập ghi chú / lý do đặt hàng" : ""}
                                        style={{ resize: 'vertical', backgroundColor: isEditing ? 'white' : '#f5f5f5' }}
                                    />
                                    {isEditing && (
                                        <div style={{ 
                                            display: 'flex', 
                                            justifyContent: 'flex-end', 
                                            fontSize: '12px', 
                                            color: orderData.justification.length >= MAX_JUSTIFICATION_LENGTH ? '#ef4444' : '#6b7280',
                                            marginTop: '4px',
                                            fontWeight: 500
                                        }}>
                                            {orderData.justification.length}/{MAX_JUSTIFICATION_LENGTH} ký tự
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 5. Tổng hợp */}
                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Tổng hợp đơn hàng</h2>
                                </div>
                                
                                {isEditing ? (
                                    /* Khi chỉnh sửa: dùng đúng UI Tổng hợp đơn hàng của CreatePurchaseOrder */
                                    <div className="form-grid">
                                        <div className="form-field">
                                            <label className="form-label">Tổng số lượng đặt</label>
                                            <div style={{ padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '8px', fontWeight: 600 }}>
                                                {totalQuantity} sản phẩm
                                            </div>
                                        </div>

                                        <div className="form-field">
                                            <label className="form-label">Tạm tính</label>
                                            <div style={{ padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '8px', fontWeight: 600 }}>
                                                {formatCurrency(subtotal)}
                                            </div>
                                        </div>

                                        <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>
                                            <div className="form-field">
                                                <label className="form-label">Chiết khấu</label>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                        <button
                                                            type="button"
                                                            className={`btn btn-sm ${orderData.discountType === 'amount' ? 'btn-primary' : 'btn-card-text'}`}
                                                            onClick={() => setDiscountType('amount')}
                                                        >
                                                            Số tiền
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className={`btn btn-sm ${orderData.discountType === 'percent' ? 'btn-primary' : 'btn-card-text'}`}
                                                            onClick={() => setDiscountType('percent')}
                                                        >
                                                            %
                                                        </button>
                                                    </div>
                                                    {orderData.discountType === 'percent' ? (
                                                        <input
                                                            type="number"
                                                            name="discount"
                                                            value={orderData.discount}
                                                            onChange={handleChange}
                                                            min="0"
                                                            max="100"
                                                            className="form-input"
                                                            placeholder="0–100"
                                                        />
                                                    ) : (
                                                        <input
                                                            type="number"
                                                            name="discountAmountFixed"
                                                            value={orderData.discountAmountFixed || ''}
                                                            onChange={handleChange}
                                                            min="0"
                                                            className="form-input"
                                                            placeholder="Nhập số tiền (VND)"
                                                        />
                                                    )}
                                                </div>
                                            </div>

                                            <div className="form-field">
                                                <label className="form-label">Chi phí</label>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                    {(orderData.additionalCosts || []).map((cost) => (
                                                        <div key={cost.id} style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                                            <input
                                                                type="text"
                                                                value={cost.name}
                                                                onChange={(e) => updateAdditionalCost(cost.id, 'name', e.target.value)}
                                                                placeholder="Tên"
                                                                className="form-input"
                                                                style={{ flex: '1 1 100px', minWidth: 0 }}
                                                            />
                                                            <input
                                                                type="number"
                                                                value={cost.amount || ''}
                                                                onChange={(e) => updateAdditionalCost(cost.id, 'amount', e.target.value)}
                                                                placeholder="Số tiền"
                                                                className="form-input"
                                                                style={{ width: '120px' }}
                                                                min="0"
                                                            />
                                                            <button
                                                                type="button"
                                                                className="btn btn-sm btn-cancel"
                                                                onClick={() => removeAdditionalCost(cost.id)}
                                                                style={{ color: '#ef4444' }}
                                                            >
                                                                Xóa
                                                            </button>
                                                        </div>
                                                    ))}
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-card-text"
                                                        onClick={addAdditionalCost}
                                                        style={{ alignSelf: 'flex-start' }}
                                                    >
                                                        + Thêm chi phí
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="form-field span-2" style={{ gridColumn: '1 / -1' }}>
                                            <div style={{ fontSize: '13px', color: '#666' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span style={{ fontWeight: 600 }}>Chiết khấu:</span>
                                                    <span style={{ color: '#ef4444' }}>- {formatCurrency(discountAmount)}</span>
                                                </div>
                                                {(orderData.additionalCosts || []).filter(c => (Number(c.amount) || 0) > 0).map((c) => (
                                                    <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                                                        <span>{c.name && c.name.trim() ? c.name.trim() : 'Chi phí'}:</span>
                                                        <span style={{ color: '#10b981' }}>+ {formatCurrency(Number(c.amount) || 0)}</span>
                                                    </div>
                                                ))}
                                                {(orderData.additionalCosts || []).filter(c => (Number(c.amount) || 0) > 0).length > 0 && (
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontWeight: 600 }}>
                                                        <span>Chi phí:</span>
                                                        <span style={{ color: '#10b981' }}>+ {formatCurrency(totalAdditionalCosts)}</span>
                                                    </div>
                                                )}
                                            </div>

                                            <div style={{ 
                                                marginTop: '16px',
                                                padding: '20px', 
                                                backgroundColor: '#e3f2fd', 
                                                borderRadius: '12px', 
                                                display: 'flex', 
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                borderLeft: '4px solid #2196F3'
                                            }}>
                                                <span style={{ fontSize: '18px', fontWeight: 700, color: '#2196F3' }}>
                                                    Tổng giá trị đơn:
                                                </span>
                                                <span style={{ fontSize: '24px', fontWeight: 700, color: '#2196F3' }}>
                                                    {formatCurrency(grandTotal)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    /* Khi chỉ xem: layout đơn giản, không có input/bút chọn loại chiết khấu */
                                    <div className="form-grid">
                                        <div className="form-field">
                                            <label className="form-label">Tổng số lượng đặt</label>
                                            <div style={{ padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '8px', fontWeight: 600 }}>
                                                {totalQuantity} sản phẩm
                                            </div>
                                        </div>

                                        <div className="form-field">
                                            <label className="form-label">Tạm tính</label>
                                            <div style={{ padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '8px', fontWeight: 600 }}>
                                                {formatCurrency(subtotal)}
                                            </div>
                                        </div>

                                        <div className="form-field span-2">
                                            <label className="form-label">Chi phí</label>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                {(orderData.additionalCosts || []).filter(c => (Number(c.amount) || 0) > 0).map((c) => (
                                                    <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                                        <span>{c.name && c.name.trim() ? c.name.trim() : 'Chi phí'}:</span>
                                                        <span style={{ color: '#10b981', fontWeight: 500 }}>
                                                            + {formatCurrency(Number(c.amount) || 0)}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="form-field span-2">
                                            <div style={{ fontSize: '13px', color: '#666' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span style={{ fontWeight: 600 }}>Chiết khấu:</span>
                                                    <span style={{ color: '#ef4444' }}>- {formatCurrency(discountAmount)}</span>
                                                </div>
                                                {(orderData.additionalCosts || []).filter(c => (Number(c.amount) || 0) > 0).length > 0 && (
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontWeight: 600 }}>
                                                        <span>Chi phí:</span>
                                                        <span style={{ color: '#10b981' }}>+ {formatCurrency(totalAdditionalCosts)}</span>
                                                    </div>
                                                )}
                                            </div>

                                            <div style={{ 
                                                marginTop: '16px',
                                                padding: '20px', 
                                                backgroundColor: '#e3f2fd', 
                                                borderRadius: '12px', 
                                                display: 'flex', 
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                borderLeft: '4px solid #2196F3'
                                            }}>
                                                <span style={{ fontSize: '18px', fontWeight: 700, color: '#2196F3' }}>
                                                    Tổng giá trị đơn:
                                                </span>
                                                <span style={{ fontSize: '24px', fontWeight: 700, color: '#2196F3' }}>
                                                    {formatCurrency(grandTotal)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Cột phải: Lịch sử đơn đặt hàng nhập */}
                        <div className="info-section" style={{ margin: 0 }}>
                            <div className="section-header-with-toggle">
                                <h2 className="section-title">Lịch sử đơn đặt hàng nhập</h2>
                            </div>
                            
                            <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {orderData.history.map((item, index) => (
                                        <div key={index} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                            <div style={{ 
                                                width: '10px', 
                                                height: '10px', 
                                                borderRadius: '50%', 
                                                backgroundColor: index === 0 ? '#2196F3' : '#9ca3af',
                                                marginTop: '6px',
                                                flexShrink: 0
                                            }}></div>
                                            <div style={{ 
                                                flex: 1, 
                                                borderLeft: index < orderData.history.length - 1 ? '2px solid #e5e7eb' : 'none',
                                                paddingLeft: '16px', 
                                                paddingBottom: index < orderData.history.length - 1 ? '12px' : '0'
                                            }}>
                                                <div style={{ 
                                                    display: 'flex', 
                                                    justifyContent: 'space-between', 
                                                    marginBottom: '8px',
                                                    flexWrap: 'wrap',
                                                    gap: '8px'
                                                }}>
                                                    <span style={{ fontSize: '13px', color: '#6b7280' }}>{item.time}</span>
                                                    <span style={{ fontSize: '13px', color: '#6b7280' }}>{item.phone}</span>
                                                    <span style={{ fontSize: '13px', color: '#2196F3', fontWeight: 600 }}>
                                                        {item.action}
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: '13px', color: '#6b7280' }}>{item.date}</div>
                                            </div>
                                        </div>
                                    ))}
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
