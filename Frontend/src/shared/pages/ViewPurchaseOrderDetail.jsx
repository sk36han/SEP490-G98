import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Box,
    Card,
    CardContent,
    Button,
    Typography,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Chip,
    Stack,
    Tooltip,
    useTheme,
    useMediaQuery,
    CircularProgress,
    Alert,
    FormControlLabel,
    Checkbox,
    Popover,
    FormControl,
    Select,
    MenuItem,
} from '@mui/material';
import { Plus, Edit3, RefreshCw, Eye, Package, Filter, ArrowLeft, Save, Send, Loader, Trash2, X, CheckCircle, Clock, XCircle } from 'lucide-react';
import Toast from '../../components/Toast/Toast';
import { useToast } from '../hooks/useToast';
import authService from '../lib/authService';
import { getPermissionRole, getRawRoleFromUser } from '../permissions/roleUtils';
import { getPurchaseOrderDetail, approvePurchaseOrder, rejectPurchaseOrder } from '../lib/purchaseOrderService';
import { getItemsForDisplay } from '../lib/itemService';
import '../styles/CreateSupplier.css';

const ViewPurchaseOrderDetail = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { toast, showToast, clearToast } = useToast();
    const [submitting, setSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [confirmDialogType, setConfirmDialogType] = useState(null);

    const userInfo = authService.getUser();
    const permissionRole = getPermissionRole(getRawRoleFromUser(userInfo));
    const canEdit = permissionRole === 'SALE_SUPPORT' || permissionRole === 'WAREHOUSE_KEEPER';
    const canConfirm = permissionRole === 'ACCOUNTANTS';
    const [isEditing, setIsEditing] = useState(false);

    const MAX_JUSTIFICATION_LENGTH = 250;

    // Initial state - sẽ load từ API
    const [orderData, setOrderData] = useState({
        purchaseOrderId: null,
        orderCode: '',
        supplierName: '',
        supplierPhone: '',
        supplierEmail: '',
        supplierTaxCode: '',
        supplierAddressStreet: '',
        supplierAddressWard: '',
        supplierAddressDistrict: '',
        supplierAddressProvince: '',
        warehouseName: '',
        creatorName: '',
        responsiblePersonName: '',
        expectedReceiptDate: '',
        justification: '',
        discountType: 'percent',
        discount: 0,
        discountAmountFixed: 0,
        additionalCosts: [],
        approvalStatus: '',
        receivingStatus: '',
        createdAt: '',
        lines: [],
        history: []
    });

    const [newLine, setNewLine] = useState({
        itemId: '',
        itemName: '',
        orderedQty: 1,
        unitPrice: 0,
        note: ''
    });

    const [items, setItems] = useState([]);
    const [itemsLoading, setItemsLoading] = useState(false);
    const [itemDropdownOpen, setItemDropdownOpen] = useState(false);

    const [supplierQuery, setSupplierQuery] = useState('');
    const [supplierDropdownOpen, setSupplierDropdownOpen] = useState(false);
    const [employeeQuery, setEmployeeQuery] = useState('');
    const [employeeDropdownOpen, setEmployeeDropdownOpen] = useState(false);
    const [warehouseQuery, setWarehouseQuery] = useState('');
    const [warehouseDropdownOpen, setWarehouseDropdownOpen] = useState(false);

    // Load items for dropdown
    useEffect(() => {
        const fetchItems = async () => {
            setItemsLoading(true);
            try {
                const data = await getItemsForDisplay();
                setItems(data || []);
            } catch (err) {
                console.error('Lỗi load items:', err);
            } finally {
                setItemsLoading(false);
            }
        };
        fetchItems();
    }, []);

    // Load PO detail
    useEffect(() => {
        const fetchOrderDetail = async () => {
            if (!id) {
                setLoading(false);
                return;
            }
            setLoading(true);
            setError(null);
            try {
                const data = await getPurchaseOrderDetail(id);
                if (data) {
                    setOrderData({
                        purchaseOrderId: data.purchaseOrderId ?? data.purchaseOrderId,
                        orderCode: data.poCode ?? data.OrderCode ?? '',
                        supplierName: data.supplierName ?? data.SupplierName ?? '',
                        supplierPhone: data.supplierPhone ?? data.SupplierPhone ?? '',
                        supplierEmail: data.supplierEmail ?? data.SupplierEmail ?? '',
                        supplierTaxCode: data.supplierTaxCode ?? data.SupplierTaxCode ?? '',
                        supplierAddressStreet: data.supplierAddressStreet ?? data.SupplierAddressStreet ?? '',
                        supplierAddressWard: data.supplierAddressWard ?? data.SupplierAddressWard ?? '',
                        supplierAddressDistrict: data.supplierAddressDistrict ?? data.SupplierAddressDistrict ?? '',
                        supplierAddressProvince: data.supplierAddressProvince ?? data.SupplierAddressProvince ?? '',
                        warehouseName: data.warehouseName ?? data.WarehouseName ?? '',
                        creatorName: data.requestedBy || data.RequestedBy || '',
                        responsiblePersonName: data.responsiblePersonName || '',
                        expectedReceiptDate: data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate).toISOString().slice(0, 10) : '',
                        justification: data.justification || '',
                        // Handle all status types: DRAFT, PENDING, APPROVED, REJECTED
                        approvalStatus: (data.status || 'DRAFT').toUpperCase(),
                        receivingStatus: data.receivingStatus || 'Pending',
                        createdAt: data.createdAt ? new Date(data.createdAt).toISOString().slice(0, 10) : '',
                        lines: (data.lines || []).map((line, index) => ({
                            id: line.purchaseOrderLineId || line.PurchaseOrderLineId || index + 1,
                            itemId: line.itemId || line.ItemId || null,
                            itemName: line.itemName || line.ItemName || '',
                            itemImage: line.itemImage || null,
                            orderedQty: line.orderedQty || line.OrderedQty || 0,
                            receivedQty: line.receivedQty || line.ReceivedQty || 0,
                            unitPrice: line.unitPrice || line.UnitPrice || 0,
                            totalPrice: (line.orderedQty || line.OrderedQty || 0) * (line.unitPrice || line.UnitPrice || 0),
                            uom: line.uomName || line.UomName || '',
                            hasCO: line.requiresCocq || false,
                            hasCQ: false,
                            note: line.note || ''
                        })),
                        history: []
                    });
                }
            } catch (error) {
                console.error('Lỗi khi tải chi tiết đơn mua:', error);
                showToast('Không thể tải thông tin đơn mua', 'error');
            } finally {
                setLoading(false);
            }
        };

        fetchOrderDetail();
    }, [id]);

    const filteredItems = useMemo(() => {
        const q = (newLine.itemName || '').trim().toLowerCase();
        if (!q) return items.slice(0, 20);
        return items.filter(item =>
            (item.itemName || '').toLowerCase().includes(q) ||
            (item.itemCode || '').toLowerCase().includes(q)
        ).slice(0, 20);
    }, [newLine.itemName, items]);

    const formatCurrency = (value) =>
        new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);

    const STATUS_MAP = {
        'DRAFT': { label: 'Bản nháp', color: '#6b7280', bgColor: '#f3f4f6' },
        'PENDING': { label: 'Chờ duyệt', color: '#f59e0b', bgColor: '#fef3c7' },
        'PENDING_ACC': { label: 'Chờ duyệt', color: '#f59e0b', bgColor: '#fef3c7' },
        'APPROVED': { label: 'Đã duyệt', color: '#10b981', bgColor: '#d1fae5' },
        'REJECTED': { label: 'Từ chối', color: '#ef4444', bgColor: '#fee2e2' },
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        
        if (name === 'justification' && value.length > MAX_JUSTIFICATION_LENGTH) {
            return;
        }
        
        setOrderData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleNewLineChange = (e) => {
        const { name, value } = e.target;
        setNewLine(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleAddLine = () => {
        if (!newLine.itemId || !newLine.orderedQty) return;
        
        const selectedItem = items.find(i => i.itemId === newLine.itemId);
        const newItemLine = {
            id: Date.now(),
            itemId: newLine.itemId,
            itemName: selectedItem?.itemName || newLine.itemName,
            orderedQty: Number(newLine.orderedQty),
            unitPrice: Number(newLine.unitPrice) || 0,
            totalPrice: (Number(newLine.orderedQty) || 0) * (Number(newLine.unitPrice) || 0),
            note: newLine.note,
            receivedQty: 0,
            hasCO: false,
            hasCQ: false
        };
        
        setOrderData(prev => ({
            ...prev,
            lines: [...prev.lines, newItemLine]
        }));
        
        setNewLine({
            itemId: '',
            itemName: '',
            orderedQty: 1,
            unitPrice: 0,
            note: ''
        });
    };

    const handleRemoveLine = (index) => {
        setOrderData(prev => ({
            ...prev,
            lines: prev.lines.filter((_, i) => i !== index)
        }));
    };

    const subtotal = orderData.lines.reduce((sum, line) => sum + (line.totalPrice || 0), 0);
    const discountAmount = orderData.discountType === 'amount' 
        ? (orderData.discountAmountFixed || 0)
        : (subtotal * (orderData.discount || 0)) / 100;
    const grandTotal = subtotal - discountAmount;

    const openConfirmDialog = (type) => {
        setConfirmDialogType(type);
        setConfirmDialogOpen(true);
    };

    const closeConfirmDialog = () => {
        setConfirmDialogOpen(false);
        setConfirmDialogType(null);
    };

    const canConfirmAction = orderData.approvalStatus?.toUpperCase() === 'PENDING_ACC';

    const handleConfirmAction = async () => {
        if (!canConfirmAction) return;
        
        setSubmitting(true);
        try {
            if (confirmDialogType === 'approve') {
                await approvePurchaseOrder(orderData.purchaseOrderId, {
                    approvalStatus: 'Approved',
                });
            } else {
                await rejectPurchaseOrder(orderData.purchaseOrderId, {
                    approvalStatus: 'Rejected',
                });
            }
            showToast(confirmDialogType === 'approve' ? 'Đã duyệt đơn mua hàng.' : 'Đã từ chối đơn mua hàng.', 'success');
            closeConfirmDialog();
            // Reload data
            const data = await getPurchaseOrderDetail(id);
            if (data) {
                setOrderData(prev => ({
                    ...prev,
                    approvalStatus: (data.status || '').toUpperCase()
                }));
            }
        } catch (err) {
            showToast(err?.response?.data?.message || err?.message || 'Có lỗi xảy ra.', 'error');
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
                        border: '1px solid var(--slate-200, #e5e7eb)',
                        boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)',
                    },
                }}
            >
                <DialogTitle sx={{ px: 3, pt: 2.5, pb: 1.5, fontSize: '18px', fontWeight: 600 }}>
                    {confirmDialogType === 'approve' ? 'Xác nhận duyệt đơn' : 'Xác nhận hủy đơn'}
                </DialogTitle>
                <DialogContent sx={{ px: 3, pb: 2 }}>
                    <p style={{ margin: 0, fontSize: '14px', color: '#374151', lineHeight: 1.6 }}>
                        {confirmDialogType === 'approve' 
                            ? 'Bạn có chắc chắn muốn duyệt đơn mua hàng này? Sau khi duyệt, đơn hàng sẽ được chuyển sang trạng thái đã duyệt.'
                            : 'Bạn có chắc chắn muốn hủy/từ chối đơn mua hàng này? Sau khi hủy, đơn hàng sẽ không thể tiếp tục xử lý.'}
                    </p>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5, gap: 1.5 }}>
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
                            {permissionRole === 'ACCOUNTANTS' && orderData.approvalStatus && orderData.approvalStatus.toUpperCase() === 'PENDING_ACC' && (
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
                            {canEdit && (
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={() => setIsEditing(true)}
                                >
                                    <Edit3 size={16} className="btn-icon" />
                                    Chỉnh sửa
                                </button>
                            )}
                        </>
                    ) : (
                        <>
                            <button
                                type="button"
                                className="btn btn-cancel"
                                onClick={() => setIsEditing(false)}
                            >
                                <X size={16} />
                                Hủy
                            </button>
                            <button
                                type="button"
                                className="btn btn-primary"
                            >
                                <Save size={16} className="btn-icon" />
                                Lưu
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="form-card">
                <form className="form-wrapper">
                    <div className="form-card-intro">
                        <h1 className="page-title">
                            Chi tiết đơn mua hàng
                            {orderData.approvalStatus && STATUS_MAP[orderData.approvalStatus] && (
                                <Chip 
                                    label={STATUS_MAP[orderData.approvalStatus].label}
                                    size="small"
                                    sx={{ 
                                        ml: 2,
                                        backgroundColor: STATUS_MAP[orderData.approvalStatus].bgColor,
                                        color: STATUS_MAP[orderData.approvalStatus].color,
                                        fontWeight: 600,
                                        fontSize: '12px'
                                    }}
                                />
                            )}
                        </h1>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px', alignItems: 'start' }}>
                        {/* Left column - Products */}
                        <div className="info-section" style={{ margin: 0 }}>
                            <div className="section-header-with-toggle">
                                <h2 className="section-title">Danh sách sản phẩm</h2>
                            </div>

                            {orderData.lines.length === 0 ? (
                                <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
                                    <Package size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                                    <p>Chưa có sản phẩm nào</p>
                                </div>
                            ) : (
                                <div className="table-container" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                                    <table className="product-table">
                                        <thead>
                                            <tr>
                                                <th>STT</th>
                                                <th>Sản phẩm</th>
                                                <th>SL đặt</th>
                                                <th>SL nhập</th>
                                                <th>Đơn giá</th>
                                                <th>Thành tiền</th>
                                                <th>Ghi chú</th>
                                                {isEditing && <th></th>}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {orderData.lines.map((line, index) => (
                                                <tr key={line.id}>
                                                    <td>{index + 1}</td>
                                                    <td>{line.itemName}</td>
                                                    <td>{line.orderedQty}</td>
                                                    <td>{line.receivedQty}</td>
                                                    <td>{formatCurrency(line.unitPrice)}</td>
                                                    <td>{formatCurrency(line.totalPrice)}</td>
                                                    <td>{line.note || '—'}</td>
                                                    {isEditing && (
                                                        <td>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveLine(index)}
                                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </td>
                                                    )}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {isEditing && (
                                <div style={{ marginTop: '16px', padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                                    <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600 }}>Thêm sản phẩm</h4>
                                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                        <select
                                            name="itemId"
                                            value={newLine.itemId}
                                            onChange={handleNewLineChange}
                                            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #d1d5db', minWidth: '200px' }}
                                        >
                                            <option value="">Chọn sản phẩm</option>
                                            {items.map(item => (
                                                <option key={item.itemId} value={item.itemId}>{item.itemName}</option>
                                            ))}
                                        </select>
                                        <input
                                            type="number"
                                            name="orderedQty"
                                            value={newLine.orderedQty}
                                            onChange={handleNewLineChange}
                                            placeholder="Số lượng"
                                            min="1"
                                            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #d1d5db', width: '100px' }}
                                        />
                                        <input
                                            type="number"
                                            name="unitPrice"
                                            value={newLine.unitPrice}
                                            onChange={handleNewLineChange}
                                            placeholder="Đơn giá"
                                            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #d1d5db', width: '120px' }}
                                        />
                                        <input
                                            type="text"
                                            name="note"
                                            value={newLine.note}
                                            onChange={handleNewLineChange}
                                            placeholder="Ghi chú"
                                            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #d1d5db', flex: 1 }}
                                        />
                                        <button
                                            type="button"
                                            onClick={handleAddLine}
                                            className="btn btn-primary"
                                            style={{ padding: '8px 16px' }}
                                        >
                                            <Plus size={16} />
                                            Thêm
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right column - Info */}
                        <div className="info-section" style={{ margin: 0 }}>
                            <div className="section-header-with-toggle">
                                <h2 className="section-title">Thông tin đơn hàng</h2>
                            </div>

                            <div className="form-grid">
                                <div className="form-field">
                                    <label className="form-label">Mã đơn</label>
                                    <div className="form-value">{orderData.orderCode || '—'}</div>
                                </div>

                                <div className="form-field">
                                    <label className="form-label">Ngày tạo</label>
                                    <div className="form-value">{orderData.createdAt || '—'}</div>
                                </div>

                                <div className="form-field">
                                    <label className="form-label">Nhà cung cấp</label>
                                    <div className="form-value">{orderData.supplierName || '—'}</div>
                                </div>

                                <div className="form-field">
                                    <label className="form-label">Kho nhận</label>
                                    <div className="form-value">{orderData.warehouseName || '—'}</div>
                                </div>

                                <div className="form-field">
                                    <label className="form-label">Người tạo</label>
                                    <div className="form-value">{orderData.creatorName || '—'}</div>
                                </div>

                                <div className="form-field">
                                    <label className="form-label">Ngày nhận dự kiến</label>
                                    <div className="form-value">{orderData.expectedReceiptDate || '—'}</div>
                                </div>

                                <div className="form-field span-2">
                                    <label className="form-label">Lý do / Ghi chú</label>
                                    <div className="form-value">{orderData.justification || '—'}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Summary */}
                    <div style={{ marginTop: '24px', padding: '20px', backgroundColor: '#f0f9ff', borderRadius: '12px', borderLeft: '4px solid #2196F3' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ color: '#64748b' }}>Tạm tính:</span>
                            <span style={{ fontWeight: 600 }}>{formatCurrency(subtotal)}</span>
                        </div>
                        {orderData.discount > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <span style={{ color: '#64748b' }}>Chiết khấu ({orderData.discountType === 'percent' ? `${orderData.discount}%` : ''}):</span>
                                <span style={{ fontWeight: 600, color: '#ef4444' }}>- {formatCurrency(discountAmount)}</span>
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #d1d5db' }}>
                            <span style={{ fontSize: '18px', fontWeight: 700, color: '#2196F3' }}>Tổng cộng:</span>
                            <span style={{ fontSize: '24px', fontWeight: 700, color: '#2196F3' }}>{formatCurrency(grandTotal)}</span>
                        </div>
                    </div>
                </form>
            </div>

            {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}
        </div>
    );
};

export default ViewPurchaseOrderDetail;
