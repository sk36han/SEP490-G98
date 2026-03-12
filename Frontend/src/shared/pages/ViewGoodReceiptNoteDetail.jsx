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
    ImageIcon,
    Eye,
    Package,
    CheckCircle,
    XCircle,
    Clock,
    X,
    Edit,
    Save,
    Loader,
    Plus,
    Search,
    Trash2,
} from 'lucide-react';
import Toast from '../../components/Toast/Toast';
import { useToast } from '../hooks/useToast';
import '../styles/CreateSupplier.css';

const MAX_REASON_LENGTH = 250;

const formatCurrency = (value) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value) || 0);

// Tham khảo style trạng thái từ ViewGoodReceiptNotesList
const STATUS_STYLE = {
    Draft: { bgColor: 'rgba(107,114,128,0.15)', label: 'Nháp', dot: '•', color: '#4b5563' },
    Submitted: { bgColor: 'rgba(59,130,246,0.15)', label: 'Đã gửi duyệt', dot: '•', color: '#1d4ed8' },
    Approved: { bgColor: 'rgba(16,185,129,0.18)', label: 'Đã duyệt', dot: '•', color: '#047857' },
    Rejected: { bgColor: 'rgba(239,68,68,0.15)', label: 'Từ chối', dot: '•', color: '#b91c1c' },
    Posted: { bgColor: 'rgba(139,92,246,0.15)', label: 'Đã ghi sổ', dot: '•', color: '#6d28d9' },
};

const RECEIVING_STATUS_STYLE = {
    NotStarted: { bgColor: 'rgba(107,114,128,0.15)', label: 'Chưa nhập', dot: '•', color: '#4b5563' },
    Partial: { bgColor: 'rgba(251,191,36,0.20)', label: 'Nhập một phần', dot: '•', color: '#b45309' },
    Completed: { bgColor: 'rgba(16,185,129,0.18)', label: 'Đã nhập đủ', dot: '•', color: '#047857' },
};

const ViewGoodReceiptNoteDetail = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { toast, showToast, clearToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [imageErrors, setImageErrors] = useState({});
    const [isEditing, setIsEditing] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [selectedLineIds, setSelectedLineIds] = useState([]);
    const [showProductSearch, setShowProductSearch] = useState(false);
    const [searchKeyword, setSearchKeyword] = useState('');
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [selectedProductIds, setSelectedProductIds] = useState([]);
    const [errors, setErrors] = useState({});

    // Mock data – sau này sẽ thay bằng API theo id
    const [grnData, setGrnData] = useState(null);
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [confirmDialogType, setConfirmDialogType] = useState('approve'); // 'approve' | 'reject'
    const [includeReason, setIncludeReason] = useState(false);
    const [reasonText, setReasonText] = useState('');

    useEffect(() => {
        // Giả lập gọi API
        setLoading(true);
        setTimeout(() => {
            setGrnData({
                grnId: id || 1,
                grnCode: 'GRN-2025-001',
                referencePoCode: 'PO-2025-001',
                warehouseName: 'Kho Hà Nội',
                supplierName: 'Công ty TNHH ABC',
                receiptDate: '2025-02-10',
                creatorName: 'Nguyễn Văn A',
                createdAt: '2025-02-09 08:00',
                status: 'Approved',
                receivingStatus: 'Completed',
                note: 'Phiếu nhập kho cho đơn mua PO-2025-001, đã kiểm tra số lượng và chất lượng.',
                discountType: 'percent',
                discount: 5,
                discountAmountFixed: 0,
                additionalCosts: [
                    { id: 1, name: 'Phí vận chuyển', amount: 2000000 },
                ],
                lines: [
                    {
                        id: 1,
                        itemName: 'Laptop Dell XPS 13',
                        itemImage: 'https://via.placeholder.com/40',
                        uom: 'Cái',
                        orderedQty: 10,
                        receivedQty: 10,
                        unitPrice: 25000000,
                        hasCO: true,
                        hasCQ: true,
                        note: 'Hàng nguyên seal, đủ phụ kiện.',
                    },
                    {
                        id: 2,
                        itemName: 'Màn hình LG 27 inch',
                        itemImage: null,
                        uom: 'Cái',
                        orderedQty: 5,
                        receivedQty: 5,
                        unitPrice: 5000000,
                        hasCO: false,
                        hasCQ: true,
                        note: '',
                    },
                    {
                        id: 3,
                        itemName: 'Bàn phím cơ Keychron',
                        itemImage: 'https://via.placeholder.com/40',
                        uom: 'Cái',
                        orderedQty: 15,
                        receivedQty: 14,
                        unitPrice: 2000000,
                        hasCO: true,
                        hasCQ: false,
                        note: 'Thiếu 1 cái, nhà cung cấp sẽ giao bù.',
                    },
                    {
                        id: 4,
                        itemName: 'Chuột Logitech MX Master 3',
                        itemImage: 'https://via.placeholder.com/40',
                        uom: 'Cái',
                        orderedQty: 8,
                        receivedQty: 8,
                        unitPrice: 1500000,
                        hasCO: true,
                        hasCQ: true,
                        note: '',
                    },
                    {
                        id: 5,
                        itemName: 'Tai nghe Sony WH-1000XM4',
                        itemImage: null,
                        uom: 'Cái',
                        orderedQty: 6,
                        receivedQty: 6,
                        unitPrice: 7000000,
                        hasCO: false,
                        hasCQ: true,
                        note: 'Đã test chất lượng OK.',
                    },
                    {
                        id: 6,
                        itemName: 'Webcam Logitech C920',
                        itemImage: 'https://via.placeholder.com/40',
                        uom: 'Cái',
                        orderedQty: 12,
                        receivedQty: 10,
                        unitPrice: 1500000,
                        hasCO: true,
                        hasCQ: false,
                        note: 'Còn thiếu 2 cái sẽ nhập đợt sau.',
                    },
                    {
                        id: 7,
                        itemName: 'Ổ cứng SSD Samsung 1TB',
                        itemImage: 'https://via.placeholder.com/40',
                        uom: 'Cái',
                        orderedQty: 20,
                        receivedQty: 10,
                        unitPrice: 1800000,
                        hasCO: true,
                        hasCQ: true,
                        note: 'Nhập từng đợt theo kế hoạch.',
                    },
                    {
                        id: 8,
                        itemName: 'RAM Corsair 16GB DDR4',
                        itemImage: null,
                        uom: 'Thanh',
                        orderedQty: 24,
                        receivedQty: 24,
                        unitPrice: 1200000,
                        hasCO: false,
                        hasCQ: true,
                        note: '',
                    },
                    {
                        id: 9,
                        itemName: 'Đế tản nhiệt laptop Cooler Master',
                        itemImage: 'https://via.placeholder.com/40',
                        uom: 'Cái',
                        orderedQty: 18,
                        receivedQty: 18,
                        unitPrice: 900000,
                        hasCO: true,
                        hasCQ: false,
                        note: '',
                    },
                    {
                        id: 10,
                        itemName: 'Loa Bluetooth JBL Flip 5',
                        itemImage: null,
                        uom: 'Cái',
                        orderedQty: 10,
                        receivedQty: 5,
                        unitPrice: 2500000,
                        hasCO: false,
                        hasCQ: false,
                        note: 'Đã nhận 1/2 số lượng.',
                    },
                    {
                        id: 11,
                        itemName: 'Cáp HDMI 2.1 - 2m',
                        itemImage: 'https://via.placeholder.com/40',
                        uom: 'Sợi',
                        orderedQty: 50,
                        receivedQty: 50,
                        unitPrice: 300000,
                        hasCO: false,
                        hasCQ: false,
                        note: '',
                    },
                    {
                        id: 12,
                        itemName: 'USB Hub Anker 7-Port',
                        itemImage: null,
                        uom: 'Cái',
                        orderedQty: 30,
                        receivedQty: 20,
                        unitPrice: 800000,
                        hasCO: true,
                        hasCQ: false,
                        note: 'Thiếu 10 cái, NCC cam kết giao bù.',
                    },
                ],
                history: [
                    { time: '14:30', phone: '0901234567', action: 'Đã duyệt phiếu nhập kho', date: '2025-02-10' },
                    { time: '10:15', phone: '0901234567', action: 'Gửi yêu cầu duyệt phiếu', date: '2025-02-09' },
                    { time: '09:00', phone: '0901234567', action: 'Tạo mới phiếu nhập kho GRN-2025-001', date: '2025-02-09' }
                ]
            });
            setLoading(false);
        }, 300);
    }, [id]);

    const isValidImageUrl = (url) => {
        if (!url || typeof url !== 'string') return false;
        try {
            const u = new URL(url);
            return u.protocol === 'http:' || u.protocol === 'https:';
        } catch {
            return false;
        }
    };

    const handleImageError = (id) => {
        setImageErrors((prev) => ({ ...prev, [id]: true }));
    };

    // Mock danh sách sản phẩm – đồng bộ UI/UX với trang tạo mới
    const MOCK_PRODUCTS = [
        { id: 1, name: 'Sản phẩm A', sku: 'SP001', unitPrice: 100000, uom: 'Cái', image: null },
        { id: 2, name: 'Sản phẩm B', sku: 'SP002', unitPrice: 150000, uom: 'Hộp', image: 'https://via.placeholder.com/40' },
        { id: 3, name: 'Sản phẩm C', sku: 'SP003', unitPrice: 200000, uom: 'Cái', image: null },
        { id: 4, name: 'Laptop Dell XPS 13', sku: 'SP004', unitPrice: 25000000, uom: 'Cái', image: 'https://via.placeholder.com/40' },
        { id: 5, name: 'Màn hình LG 27 inch', sku: 'SP005', unitPrice: 5000000, uom: 'Cái', image: null },
        { id: 6, name: 'Bàn phím cơ Keychron', sku: 'SP006', unitPrice: 2000000, uom: 'Cái', image: 'https://via.placeholder.com/40' },
        { id: 7, name: 'Chuột Logitech MX Master', sku: 'SP007', unitPrice: 1500000, uom: 'Cái', image: null },
        { id: 8, name: 'Tai nghe Sony WH-1000XM4', sku: 'SP008', unitPrice: 7000000, uom: 'Cái', image: 'https://via.placeholder.com/40' },
    ];

    const updateLine = (index, field, value) => {
        setGrnData((prev) => {
            if (!prev) return prev;
            const nextLines = prev.lines.map((line, i) =>
                i === index ? { ...line, [field]: value } : line
            );
            return { ...prev, lines: nextLines };
        });
    };

    const handleSearchChange = (e) => {
        const keyword = e.target.value;
        setSearchKeyword(keyword);
        if (keyword.trim() === '') {
            setFilteredProducts([]);
            return;
        }
        const filtered = MOCK_PRODUCTS.filter(
            (product) =>
                product.name.toLowerCase().includes(keyword.toLowerCase()) ||
                product.sku.toLowerCase().includes(keyword.toLowerCase())
        );
        setFilteredProducts(filtered);
    };

    const handleSelectProduct = (product) => {
        setGrnData((prev) => {
            if (!prev) return prev;

            const newLine = {
                id: Date.now(),
                itemId: product.id,
                itemName: product.name,
                itemImage: product.image,
                uom: product.uom ?? '',
                orderedQty: 1,
                receivedQty: 1,
                hasCO: false,
                hasCQ: false,
                note: '',
            };

            return {
                ...prev,
                lines: [...prev.lines, newLine],
            };
        });

        setSearchKeyword('');
        setFilteredProducts([]);
        setShowProductSearch(false);
        setSelectedProductIds([]);
        showToast('Đã thêm sản phẩm vào danh sách', 'success');
    };

    const toggleProductSelection = (productId) => {
        setSelectedProductIds((prev) =>
            prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
        );
    };

    const addSelectedProducts = () => {
        if (selectedProductIds.length === 0) {
            showToast('Vui lòng chọn ít nhất 1 sản phẩm', 'warning');
            return;
        }

        const productsToAdd = MOCK_PRODUCTS.filter((p) => selectedProductIds.includes(p.id));

        setGrnData((prev) => {
            if (!prev) return prev;

            const newLines = productsToAdd.map((product) => ({
                id: Date.now() + Math.random(),
                itemId: product.id,
                itemName: product.name,
                itemImage: product.image,
                uom: product.uom ?? '',
                orderedQty: 1,
                receivedQty: 1,
                hasCO: false,
                hasCQ: false,
                note: '',
            }));

            return {
                ...prev,
                lines: [...prev.lines, ...newLines],
            };
        });

        showToast(`Đã thêm ${productsToAdd.length} sản phẩm vào danh sách`, 'success');
        setSearchKeyword('');
        setFilteredProducts([]);
        setShowProductSearch(false);
        setSelectedProductIds([]);
    };

    const openProductSearch = () => {
        setShowProductSearch(true);
        setSearchKeyword('');
        setFilteredProducts([]);
    };

    const closeProductSearch = () => {
        setShowProductSearch(false);
        setSearchKeyword('');
        setFilteredProducts([]);
        setSelectedProductIds([]);
    };

    const addLine = () => {
        openProductSearch();
    };

    const removeLine = (index) => {
        setGrnData((prev) => {
            if (!prev) return prev;
            const targetId = prev.lines[index]?.id;
            const nextLines = prev.lines.filter((_, i) => i !== index);
            setSelectedLineIds((prevSelected) =>
                targetId ? prevSelected.filter((id) => id !== targetId) : prevSelected
            );
            return { ...prev, lines: nextLines };
        });
    };

    const removeSelectedLines = () => {
        if (!selectedLineIds.length) return;
        setGrnData((prev) =>
            prev
                ? {
                      ...prev,
                      lines: prev.lines.filter((line) => !selectedLineIds.includes(line.id)),
                  }
                : prev
        );
        setSelectedLineIds([]);
    };

    const toggleLineSelection = (lineId) => {
        setSelectedLineIds((prev) =>
            prev.includes(lineId) ? prev.filter((id) => id !== lineId) : [...prev, lineId]
        );
    };

    const toggleSelectAll = () => {
        if (!grnData?.lines?.length) return;
        if (selectedLineIds.length === grnData.lines.length) {
            setSelectedLineIds([]);
        } else {
            setSelectedLineIds(grnData.lines.map((line) => line.id));
        }
    };

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
            await new Promise((r) => setTimeout(r, 600));
            const reason = includeReason ? reasonText.trim() : '';
            const isApprove = confirmDialogType === 'approve';
            setGrnData((prev) => ({
                ...prev,
                status: isApprove ? 'Approved' : 'Rejected',
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
            showToast('Có lỗi xảy ra.', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleApprove = () => openConfirmDialog('approve');
    const handleReject = () => openConfirmDialog('reject');

    const canConfirmAction = !submitting && (!includeReason || reasonText.trim().length > 0);

    const handleToggleEdit = () => {
        setIsEditing((prev) => !prev);
    };

    const setDiscountType = (type) => {
        setGrnData((prev) => (prev ? { ...prev, discountType: type } : prev));
    };

    const addAdditionalCost = () => {
        setGrnData((prev) =>
            prev
                ? {
                      ...prev,
                      additionalCosts: [
                          ...(prev.additionalCosts || []),
                          { id: Date.now(), name: '', amount: 0 },
                      ],
                  }
                : prev
        );
    };

    const removeAdditionalCost = (id) => {
        setGrnData((prev) =>
            prev
                ? {
                      ...prev,
                      additionalCosts: (prev.additionalCosts || []).filter((c) => c.id !== id),
                  }
                : prev
        );
    };

    const updateAdditionalCost = (id, field, value) => {
        setGrnData((prev) =>
            prev
                ? {
                      ...prev,
                      additionalCosts: (prev.additionalCosts || []).map((c) =>
                          c.id === id
                              ? {
                                    ...c,
                                    [field]: field === 'amount' ? Number(value) || 0 : value,
                                }
                              : c
                      ),
                  }
                : prev
        );
    };

    if (loading || !grnData) {
        return (
            <div className="create-supplier-page">
                <div className="page-header">
                    <div className="page-header-left">
                        <button type="button" onClick={handleBack} className="back-button">
                            <ArrowLeft size={20} />
                            <span>Quay lại</span>
                        </button>
                    </div>
                </div>
                <div className="form-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
                    <span style={{ fontSize: 14, color: '#6b7280' }}>Đang tải chi tiết phiếu nhập kho...</span>
                </div>
            </div>
        );
    }

    const totalQuantityOrdered = grnData.lines.reduce(
        (sum, line) => sum + (Number(line.orderedQty) || 0),
        0
    );
    const totalReceivedQty = grnData.lines.reduce(
        (sum, line) => sum + (Number(line.receivedQty) || 0),
        0
    );
    const subtotal = grnData.lines.reduce(
        (sum, line) =>
            sum + (Number(line.receivedQty) || 0) * (Number(line.unitPrice) || 0),
        0
    );
    const discountAmount =
        grnData.discountType === 'amount'
            ? Number(grnData.discountAmountFixed) || 0
            : (subtotal * (Number(grnData.discount) || 0)) / 100;
    const totalAdditionalCosts = (grnData.additionalCosts || []).reduce(
        (sum, c) => sum + (Number(c.amount) || 0),
        0
    );
    const grandTotal = subtotal - discountAmount + totalAdditionalCosts;

    const statusStyle = STATUS_STYLE[grnData.status] ?? {
        bgColor: 'rgba(107,114,128,0.15)',
        label: grnData.status ?? '-',
        dot: '•',
        color: '#4b5563',
    };
    const receivingStatusStyle = RECEIVING_STATUS_STYLE[grnData.receivingStatus] ?? {
        bgColor: 'rgba(107,114,128,0.15)',
        label: grnData.receivingStatus ?? '-',
        dot: '•',
        color: '#4b5563',
    };

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
                <DialogTitle sx={{ fontWeight: 700, color: '#111827', borderBottom: '1px solid #eef2f7' }}>
                    {confirmDialogType === 'approve' ? 'Xác nhận duyệt đơn' : 'Xác nhận hủy đơn'}
                </DialogTitle>
                <DialogContent sx={{ px: 3, py: 2 }}>
                    <div style={{ marginBottom: '16px' }}>
                        <span style={{ fontSize: '14px', color: '#4b5563' }}>
                            {confirmDialogType === 'approve'
                                ? 'Bạn có chắc chắn muốn duyệt phiếu nhập kho này không?'
                                : 'Bạn có chắc chắn muốn hủy phiếu nhập kho này không?'}
                        </span>
                    </div>
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
                    {!isEditing ? (
                        <>
                            <button
                                type="button"
                                className="btn btn-cancel"
                                disabled={submitting}
                                onClick={handleReject}
                            >
                                <X size={15} />
                                Hủy đơn
                            </button>
                            {(grnData?.status === 'Approved' || grnData?.status === 'Posted') && (
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => navigate(`/purchase-return/create?grnId=${grnData?.grnId}&grnCode=${grnData?.grnCode}`)}
                                    disabled={submitting}
                                    style={{ backgroundColor: '#f59e0b', borderColor: '#f59e0b', color: '#fff' }}
                                >
                                    <Package size={16} className="btn-icon" />
                                    Trả hàng
                                </button>
                            )}
                            <button
                                type="button"
                                className="btn btn-primary"
                                disabled={submitting}
                                onClick={handleApprove}
                            >
                                <CheckCircle size={16} className="btn-icon" />
                                Duyệt đơn
                            </button>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={handleToggleEdit}
                                disabled={submitting}
                            >
                                <Edit size={16} className="btn-icon" />
                                Chỉnh sửa
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                type="button"
                                onClick={handleToggleEdit}
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
                                onClick={() => {
                                    setSubmitting(true);
                                    setTimeout(() => {
                                        showToast('Mock: Lưu chỉnh sửa phiếu nhập kho.', 'success');
                                        setSubmitting(false);
                                        setIsEditing(false);
                                    }, 600);
                                }}
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

            <div className="form-card">
                <div className="form-wrapper">
                    <div className="form-card-intro">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                            <div>
                                <h1 className="page-title">Chi tiết phiếu nhập kho</h1>
                                <p style={{ fontSize: '14px', color: '#6b7280', margin: '8px 0 0 0' }}>
                                    Mã phiếu:{' '}
                                    <span style={{ fontWeight: 600, color: '#2196F3' }}>{grnData.grnCode}</span>
                                </p>
                            </div>
                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
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
                                    {grnData.status === 'Approved' && <CheckCircle size={16} />}
                                    {grnData.status === 'Rejected' && <XCircle size={16} />}
                                    {grnData.status === 'Submitted' && <Clock size={16} />}
                                    {grnData.status === 'Draft' && <Clock size={16} />}
                                    {statusStyle.label}
                                </div>
                                <div
                                    style={{
                                        padding: '8px 16px',
                                        borderRadius: 20,
                                        backgroundColor: receivingStatusStyle.bgColor,
                                        color: receivingStatusStyle.color,
                                        fontWeight: 600,
                                        fontSize: '13px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                    }}
                                >
                                    {grnData.receivingStatus === 'Completed' && <CheckCircle size={16} />}
                                    {grnData.receivingStatus === 'Partial' && <Clock size={16} />}
                                    {grnData.receivingStatus === 'NotStarted' && <Clock size={16} />}
                                    {receivingStatusStyle.label}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bố cục giống ViewPurchaseOrderDetail:
                        - Hàng 1: Trái = Chi tiết sản phẩm, Phải = Thông tin phiếu + Thông tin chung
                        - Hàng 2: Trái = Nhà cung cấp + Ghi chú + Tổng hợp, Phải = placeholder lịch sử */}
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 350px',
                            gap: '24px',
                            alignItems: 'flex-start',
                        }}
                    >
                        {/* Trái: Chi tiết sản phẩm nhập */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <div className="info-section" style={{ margin: 0, display: 'flex', flexDirection: 'column' }}>
                            <div className="section-header-with-toggle">
                                <h2 className="section-title">Chi tiết sản phẩm nhập</h2>
                                {isEditing && (
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        {selectedLineIds.length > 0 && (
                                            <button
                                                type="button"
                                                onClick={removeSelectedLines}
                                                className="btn btn-sm"
                                                style={{
                                                    fontWeight: 600,
                                                    backgroundColor: '#ef4444',
                                                    color: 'white',
                                                    border: 'none',
                                                }}
                                            >
                                                <Trash2 size={16} />
                                                Xóa ({selectedLineIds.length})
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={addLine}
                                            className="btn btn-sm"
                                            style={{ fontSize: '14px', fontWeight: 600 }}
                                        >
                                            <Plus size={16} />
                                            Thêm sản phẩm
                                        </button>
                                    </div>
                                )}
                            </div>

                            {errors.lines && (
                                <div className="error-message" style={{ marginBottom: '16px' }}>
                                    {errors.lines}
                                </div>
                            )}

                            {isEditing && showProductSearch && (
                                <div
                                    style={{
                                        marginBottom: '16px',
                                        animation: 'slideDown 0.3s ease-out',
                                        position: 'relative',
                                    }}
                                >
                                    <div style={{ position: 'relative' }}>
                                        <Search
                                            size={20}
                                            style={{
                                                position: 'absolute',
                                                left: '12px',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                color: '#9ca3af',
                                                zIndex: 1,
                                            }}
                                        />
                                        <input
                                            type="text"
                                            value={searchKeyword}
                                            onChange={handleSearchChange}
                                            placeholder="Tìm kiếm theo tên hoặc mã SKU..."
                                            autoFocus
                                            style={{
                                                width: '100%',
                                                padding: '12px 44px 12px 44px',
                                                border: '2px solid #2196F3',
                                                borderRadius: '10px',
                                                fontSize: '14px',
                                                outline: 'none',
                                                boxSizing: 'border-box',
                                                boxShadow: '0 0 0 4px rgba(33, 150, 243, 0.1)',
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={closeProductSearch}
                                            style={{
                                                position: 'absolute',
                                                right: '8px',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                background: 'transparent',
                                                border: 'none',
                                                cursor: 'pointer',
                                                padding: '4px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                color: '#6b7280',
                                                zIndex: 1,
                                            }}
                                        >
                                            <X size={20} />
                                        </button>
                                    </div>
                                    {searchKeyword !== '' && (
                                        <div
                                            style={{
                                                position: 'absolute',
                                                top: '100%',
                                                left: 0,
                                                right: 0,
                                                marginTop: '4px',
                                                backgroundColor: 'white',
                                                border: '1px solid #e5e7eb',
                                                borderRadius: '10px',
                                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                                maxHeight: '400px',
                                                overflowY: 'auto',
                                                zIndex: 100,
                                                animation: 'fadeIn 0.2s ease-out',
                                            }}
                                        >
                                            {filteredProducts.length === 0 ? (
                                                <div
                                                    style={{
                                                        padding: '24px',
                                                        textAlign: 'center',
                                                        color: '#9ca3af',
                                                    }}
                                                >
                                                    <Package
                                                        size={32}
                                                        style={{ margin: '0 auto 8px', opacity: 0.5 }}
                                                    />
                                                    <p style={{ margin: 0, fontSize: '13px' }}>
                                                        Không tìm thấy sản phẩm nào
                                                    </p>
                                                </div>
                                            ) : (
                                                <>
                                                    {filteredProducts.map((product) => (
                                                        <div
                                                            key={product.id}
                                                            style={{
                                                                padding: '12px 16px',
                                                                borderBottom: '1px solid #f3f4f6',
                                                                transition: 'background-color 0.15s',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '12px',
                                                            }}
                                                            onMouseEnter={(e) =>
                                                                (e.currentTarget.style.backgroundColor =
                                                                    '#f9fafb')
                                                            }
                                                            onMouseLeave={(e) =>
                                                                (e.currentTarget.style.backgroundColor =
                                                                    'transparent')
                                                            }
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedProductIds.includes(
                                                                    product.id
                                                                )}
                                                                onChange={(e) => {
                                                                    e.stopPropagation();
                                                                    toggleProductSelection(product.id);
                                                                }}
                                                                style={{
                                                                    cursor: 'pointer',
                                                                    width: '16px',
                                                                    height: '16px',
                                                                    flexShrink: 0,
                                                                }}
                                                            />
                                                            {isValidImageUrl(product.image) &&
                                                            !imageErrors[`product-${product.id}`] ? (
                                                                <img
                                                                    src={product.image}
                                                                    alt={product.name}
                                                                    onError={() =>
                                                                        handleImageError(
                                                                            `product-${product.id}`
                                                                        )
                                                                    }
                                                                    style={{
                                                                        width: '40px',
                                                                        height: '40px',
                                                                        objectFit: 'cover',
                                                                        borderRadius: '6px',
                                                                        border: '1px solid #e5e7eb',
                                                                        flexShrink: 0,
                                                                    }}
                                                                />
                                                            ) : (
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
                                                                    <ImageIcon size={20} color="#9ca3af" />
                                                                </div>
                                                            )}
                                                            <div
                                                                style={{ flex: 1, cursor: 'pointer' }}
                                                                onClick={() =>
                                                                    handleSelectProduct(product)
                                                                }
                                                            >
                                                                <div
                                                                    style={{
                                                                        display: 'flex',
                                                                        justifyContent: 'space-between',
                                                                        alignItems: 'start',
                                                                        marginBottom: '4px',
                                                                    }}
                                                                >
                                                                    <span
                                                                        style={{
                                                                            fontSize: '14px',
                                                                            fontWeight: 500,
                                                                            color: '#1f2937',
                                                                        }}
                                                                    >
                                                                        {product.name}
                                                                    </span>
                                                                    <span
                                                                        style={{
                                                                            fontSize: '14px',
                                                                            fontWeight: 600,
                                                                            color: '#2196F3',
                                                                            marginLeft: '12px',
                                                                        }}
                                                                    >
                                                                        {formatCurrency(
                                                                            product.unitPrice
                                                                        )}
                                                                    </span>
                                                                </div>
                                                                <div
                                                                    style={{
                                                                        display: 'flex',
                                                                        gap: '12px',
                                                                        fontSize: '12px',
                                                                        color: '#6b7280',
                                                                    }}
                                                                >
                                                                    <span>Mã: {product.sku}</span>
                                                                    <span>•</span>
                                                                    <span>ĐVT: {product.uom}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {selectedProductIds.length > 0 && (
                                                        <div
                                                            style={{
                                                                padding: '12px 16px',
                                                                borderTop: '2px solid #e5e7eb',
                                                                backgroundColor: '#f9fafb',
                                                                position: 'sticky',
                                                                bottom: 0,
                                                            }}
                                                        >
                                                            <button
                                                                type="button"
                                                                onClick={addSelectedProducts}
                                                                className="btn btn-sm"
                                                                style={{
                                                                    width: '100%',
                                                                    backgroundColor: '#2196F3',
                                                                    color: 'white',
                                                                    border: 'none',
                                                                    fontWeight: 600,
                                                                    justifyContent: 'center',
                                                                }}
                                                            >
                                                                <Plus size={16} />
                                                                Thêm {selectedProductIds.length} sản phẩm
                                                            </button>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {grnData.lines.length === 0 ? (
                                <div
                                    style={{
                                        padding: isEditing ? '60px 20px' : '24px 12px',
                                        textAlign: 'center',
                                        color: '#6b7280',
                                        fontSize: isEditing ? 16 : 14,
                                    }}
                                >
                                    {isEditing ? (
                                        <>
                                            <Package size={64} strokeWidth={1.5} />
                                            <p
                                                style={{
                                                    fontSize: '16px',
                                                    fontWeight: 500,
                                                    margin: '8px 0 0',
                                                }}
                                            >
                                                Chưa có sản phẩm nào
                                            </p>
                                            <p style={{ fontSize: '14px', margin: 0 }}>
                                                Nhấn &quot;Thêm sản phẩm&quot; để bắt đầu
                                            </p>
                                        </>
                                    ) : (
                                        'Chưa có sản phẩm nào trong phiếu nhập kho.'
                                    )}
                                </div>
                            ) : (
                                <div
                                    className="table-container"
                                    style={{ flex: 1, maxHeight: '500px', overflowY: 'auto' }}
                                >
                                    <table className="product-table">
                                        <thead>
                                            <tr>
                                                {isEditing && (
                                                    <th style={{ width: '40px' }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={
                                                                grnData.lines.length > 0 &&
                                                                selectedLineIds.length ===
                                                                    grnData.lines.length
                                                            }
                                                            onChange={toggleSelectAll}
                                                            style={{ cursor: 'pointer' }}
                                                        />
                                                    </th>
                                                )}
                                                <th style={{ width: '40px' }}>STT</th>
                                                <th>Sản phẩm</th>
                                                <th style={{ width: '110px' }}>SL đặt</th>
                                                <th style={{ width: '110px' }}>SL nhập</th>
                                                <th style={{ width: '130px' }}>Đơn giá</th>
                                                <th style={{ width: '150px' }}>Thành tiền</th>
                                                <th style={{ width: '80px', textAlign: 'center' }}>CO</th>
                                                <th style={{ width: '80px', textAlign: 'center' }}>CQ</th>
                                                {isEditing && <th style={{ width: '60px' }}></th>}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {grnData.lines.map((line, index) => (
                                                <tr key={line.id}>
                                                    {isEditing && (
                                                        <td style={{ textAlign: 'center' }}>
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedLineIds.includes(line.id)}
                                                                onChange={() =>
                                                                    toggleLineSelection(line.id)
                                                                }
                                                                style={{ cursor: 'pointer' }}
                                                            />
                                                        </td>
                                                    )}
                                                    <td style={{ textAlign: 'center' }}>{index + 1}</td>
                                                    <td>
                                                        <div
                                                            style={{
                                                                display: 'flex',
                                                                gap: 12,
                                                                alignItems: 'center',
                                                            }}
                                                        >
                                                            {isValidImageUrl(line.itemImage) &&
                                                            !imageErrors[`line-${line.id}`] ? (
                                                                <img
                                                                    src={line.itemImage}
                                                                    alt={line.itemName}
                                                                    onError={() =>
                                                                        handleImageError(
                                                                            `line-${line.id}`
                                                                        )
                                                                    }
                                                                    style={{
                                                                        width: 40,
                                                                        height: 40,
                                                                        objectFit: 'cover',
                                                                        borderRadius: 6,
                                                                        border: '1px solid #e5e7eb',
                                                                        flexShrink: 0,
                                                                    }}
                                                                />
                                                            ) : (
                                                                <div
                                                                    style={{
                                                                        width: 40,
                                                                        height: 40,
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        borderRadius: 6,
                                                                        border: '1px solid #e5e7eb',
                                                                        backgroundColor: '#f3f4f6',
                                                                        flexShrink: 0,
                                                                    }}
                                                                >
                                                                    <ImageIcon size={20} color="#9ca3af" />
                                                                </div>
                                                            )}
                                                            <div
                                                                style={{
                                                                    display: 'flex',
                                                                    flexDirection: 'column',
                                                                    gap: 2,
                                                                    flex: 1,
                                                                }}
                                                            >
                                                                <div
                                                                    style={{
                                                                        display: 'flex',
                                                                        gap: 8,
                                                                        alignItems: 'center',
                                                                    }}
                                                                >
                                                                    <a
                                                                        href="#"
                                                                        onClick={(e) => {
                                                                            e.preventDefault();
                                                                            // TODO: mở chi tiết sản phẩm khi có trang riêng
                                                                        }}
                                                                        style={{
                                                                            color: '#2196F3',
                                                                            textDecoration: 'none',
                                                                            fontSize: 14,
                                                                            fontWeight: 500,
                                                                            flex: 1,
                                                                        }}
                                                                        onMouseEnter={(e) => {
                                                                            e.target.style.textDecoration =
                                                                                'underline';
                                                                        }}
                                                                        onMouseLeave={(e) => {
                                                                            e.target.style.textDecoration =
                                                                                'none';
                                                                        }}
                                                                    >
                                                                        {line.itemName}
                                                                    </a>
                                                                    <button
                                                                        type="button"
                                                                        className="btn-icon-only"
                                                                        style={{ color: '#2196F3' }}
                                                                        title="Xem chi tiết sản phẩm"
                                                                    >
                                                                        <Eye size={18} />
                                                                    </button>
                                                                </div>
                                                                <div
                                                                    style={{
                                                                        fontSize: 12,
                                                                        color: '#6b7280',
                                                                        fontWeight: 600,
                                                                    }}
                                                                >
                                                                    ĐVT: {line.uom || '—'}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    {/* SL đặt, SL nhập, Đơn giá, Thành tiền */}
                                                    <td
                                                        style={{
                                                            textAlign: 'right',
                                                            fontVariantNumeric: 'tabular-nums',
                                                        }}
                                                    >
                                                        {isEditing ? (
                                                            <input
                                                                type="number"
                                                                value={line.orderedQty}
                                                                min="0"
                                                                onChange={(e) =>
                                                                    updateLine(
                                                                        index,
                                                                        'orderedQty',
                                                                        Number(e.target.value)
                                                                    )
                                                                }
                                                                className="form-input"
                                                                style={{
                                                                    textAlign: 'right',
                                                                    width: '100%',
                                                                }}
                                                            />
                                                        ) : (
                                                            Number(line.orderedQty) || 0
                                                        )}
                                                    </td>
                                                    <td
                                                        style={{
                                                            textAlign: 'right',
                                                            fontVariantNumeric: 'tabular-nums',
                                                            fontWeight: 600,
                                                        }}
                                                    >
                                                        {isEditing ? (
                                                            <input
                                                                type="number"
                                                                value={line.receivedQty}
                                                                min="0"
                                                                onChange={(e) =>
                                                                    updateLine(
                                                                        index,
                                                                        'receivedQty',
                                                                        Number(e.target.value)
                                                                    )
                                                                }
                                                                className="form-input"
                                                                style={{
                                                                    textAlign: 'right',
                                                                    width: '100%',
                                                                }}
                                                            />
                                                        ) : (
                                                            Number(line.receivedQty) || 0
                                                        )}
                                                    </td>
                                                    <td
                                                        style={{
                                                            textAlign: 'right',
                                                            fontVariantNumeric: 'tabular-nums',
                                                        }}
                                                    >
                                                        {isEditing ? (
                                                            <input
                                                                type="number"
                                                                value={line.unitPrice || ''}
                                                                min="0"
                                                                onChange={(e) =>
                                                                    updateLine(
                                                                        index,
                                                                        'unitPrice',
                                                                        Number(e.target.value)
                                                                    )
                                                                }
                                                                className="form-input"
                                                                style={{
                                                                    textAlign: 'right',
                                                                    width: '100%',
                                                                }}
                                                            />
                                                        ) : (
                                                            formatCurrency(
                                                                Number(line.unitPrice) || 0
                                                            )
                                                        )}
                                                    </td>
                                                    <td
                                                        style={{
                                                            textAlign: 'right',
                                                            fontVariantNumeric: 'tabular-nums',
                                                            fontWeight: 600,
                                                            color: '#2196F3',
                                                        }}
                                                    >
                                                        {formatCurrency(
                                                            (Number(line.unitPrice) || 0) *
                                                                (Number(line.receivedQty) || 0)
                                                        )}
                                                    </td>
                                                    <td
                                                        style={{
                                                            textAlign: 'center',
                                                            verticalAlign: 'middle',
                                                        }}
                                                        title="Chứng chỉ xuất xứ (CO)"
                                                    >
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
                                                    <td
                                                        style={{
                                                            textAlign: 'center',
                                                            verticalAlign: 'middle',
                                                        }}
                                                        title="Chứng chỉ chất lượng (CQ)"
                                                    >
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
                                                    {isEditing && (
                                                        <td style={{ textAlign: 'center' }}>
                                                            <button
                                                                type="button"
                                                                onClick={() => removeLine(index)}
                                                                className="btn-icon-only"
                                                                style={{ color: '#ef4444' }}
                                                            >
                                                                <Trash2 size={18} />
                                                            </button>
                                                        </td>
                                                    )}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                        </div>       
                        {/* Phải: Thông tin chung + Lịch sử phiếu nhập */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {/* Thông tin chung */}
                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Thông tin chung</h2>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div className="form-field">
                                        <label className="form-label">Nhân viên tạo</label>
                                        <div className="input-wrapper">
                                            <User className="input-icon" size={16} />
                                            <input
                                                type="text"
                                                value={grnData.creatorName}
                                                readOnly
                                                className="form-input"
                                                style={{ backgroundColor: '#f5f5f5' }}
                                            />
                                        </div>
                                    </div>
                                    <div className="form-field">
                                        <label className="form-label">Kho nhập</label>
                                        <div className="input-wrapper">
                                            <MapPin className="input-icon" size={16} />
                                            <input
                                                type="text"
                                                value={grnData.warehouseName}
                                                readOnly
                                                className="form-input"
                                                style={{ backgroundColor: '#f5f5f5' }}
                                            />
                                        </div>
                                    </div>
                                    <div className="form-field">
                                        <label className="form-label">Ngày nhập dự kiến</label>
                                        <div className="input-wrapper">
                                            <Calendar className="input-icon" size={16} />
                                            <input
                                                type="text"
                                                value={grnData.receiptDate}
                                                readOnly
                                                className="form-input"
                                                style={{ backgroundColor: '#f5f5f5' }}
                                            />
                                        </div>
                                    </div>
                                    <div className="form-field">
                                        <label className="form-label">Ngày tạo</label>
                                        <div className="input-wrapper">
                                            <Calendar className="input-icon" size={16} />
                                            <input
                                                type="text"
                                                value={grnData.createdAt}
                                                readOnly
                                                className="form-input"
                                                style={{ backgroundColor: '#f5f5f5' }}
                                            />
                                        </div>
                                    </div>
                                    <div className="form-field">
                                        <label className="form-label">Đơn mua tham chiếu</label>
                                        <div className="input-wrapper">
                                            <FileText className="input-icon" size={16} />
                                            <input
                                                type="text"
                                                value={grnData.referencePoCode || ''}
                                                readOnly
                                                className="form-input"
                                                style={{ backgroundColor: '#f5f5f5' }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Lịch sử phiếu nhập */}
                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Lịch sử phiếu nhập</h2>
                                </div>
                                <div
                                    style={{
                                        padding: '16px',
                                        backgroundColor: '#f9fafb',
                                        borderRadius: '8px',
                                        border: '1px solid #e5e7eb',
                                    }}
                                >
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {grnData.history.map((item, index) => (
                                            <div key={index} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                                <div
                                                    style={{
                                                        width: '10px',
                                                        height: '10px',
                                                        borderRadius: '50%',
                                                        backgroundColor: index === 0 ? '#2196F3' : '#9ca3af',
                                                        marginTop: '6px',
                                                        flexShrink: 0,
                                                    }}
                                                ></div>
                                                <div
                                                    style={{
                                                        flex: 1,
                                                        borderLeft: index < grnData.history.length - 1 ? '2px solid #e5e7eb' : 'none',
                                                        paddingLeft: '16px',
                                                        paddingBottom: index < grnData.history.length - 1 ? '12px' : '0',
                                                    }}
                                                >
                                                    <div style={{ fontSize: '13px', fontWeight: 500, color: '#111827', marginBottom: '2px' }}>
                                                        {item.action}
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                        <span style={{ fontSize: '12px', color: '#6b7280' }}>{item.date}</span>
                                                        <span style={{ fontSize: '12px', color: '#9ca3af' }}>•</span>
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

                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 350px',
                            gap: '24px',
                            alignItems: 'start',
                            marginTop: 24,
                        }}
                    >
                        {/* Cột trái: Nhà cung cấp + Ghi chú + Tổng hợp phiếu nhập */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Nhà cung cấp</h2>
                                </div>
                                <div className="form-field">
                                    <label className="form-label">Nhà cung cấp</label>
                                    <div className="input-wrapper">
                                        <Package className="input-icon" size={16} />
                                        <input
                                            type="text"
                                            value={grnData.supplierName}
                                            readOnly
                                            className="form-input"
                                            style={{ backgroundColor: '#f5f5f5' }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Ghi chú</h2>
                                </div>
                                <div className="form-field">
                                    <label className="form-label">Ghi chú / Lý do nhập kho</label>
                                    <textarea
                                        value={grnData.note || ''}
                                        readOnly
                                        rows={4}
                                        className="form-input"
                                        style={{ resize: 'vertical', backgroundColor: '#f5f5f5' }}
                                    />
                                </div>
                            </div>

                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Tổng hợp đơn hàng</h2>
                                </div>
                                {isEditing ? (
                                    <div className="form-grid">
                                        <div className="form-field">
                                            <label className="form-label">Tổng số lượng đặt</label>
                                            <div
                                                style={{
                                                    padding: '10px',
                                                    backgroundColor: '#f5f5f5',
                                                    borderRadius: 8,
                                                    fontWeight: 600,
                                                    fontVariantNumeric: 'tabular-nums',
                                                }}
                                            >
                                                {totalQuantityOrdered} sản phẩm
                                            </div>
                                        </div>
                                        <div className="form-field">
                                            <label className="form-label">Tạm tính</label>
                                            <div
                                                style={{
                                                    padding: '10px',
                                                    backgroundColor: '#f5f5f5',
                                                    borderRadius: 8,
                                                    fontWeight: 600,
                                                    fontVariantNumeric: 'tabular-nums',
                                                }}
                                            >
                                                {formatCurrency(subtotal)}
                                            </div>
                                        </div>
                                        <div
                                            style={{
                                                gridColumn: '1 / -1',
                                                display: 'grid',
                                                gridTemplateColumns: '1fr 1fr',
                                                gap: '24px',
                                                alignItems: 'start',
                                            }}
                                        >
                                            <div className="form-field">
                                                <label className="form-label">Chiết khấu</label>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                        <button
                                                            type="button"
                                                            className={`btn btn-sm ${
                                                                grnData.discountType === 'amount'
                                                                    ? 'btn-primary'
                                                                    : 'btn-card-text'
                                                            }`}
                                                            onClick={() => setDiscountType('amount')}
                                                        >
                                                            Số tiền
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className={`btn btn-sm ${
                                                                grnData.discountType === 'percent'
                                                                    ? 'btn-primary'
                                                                    : 'btn-card-text'
                                                            }`}
                                                            onClick={() => setDiscountType('percent')}
                                                        >
                                                            %
                                                        </button>
                                                    </div>
                                                    {grnData.discountType === 'percent' ? (
                                                        <input
                                                            type="number"
                                                            name="discount"
                                                            value={grnData.discount}
                                                            onChange={(e) =>
                                                                setGrnData((prev) =>
                                                                    prev
                                                                        ? {
                                                                              ...prev,
                                                                              discount: Number(e.target.value) || 0,
                                                                          }
                                                                        : prev
                                                                )
                                                            }
                                                            min="0"
                                                            max="100"
                                                            className="form-input"
                                                            placeholder="0–100"
                                                        />
                                                    ) : (
                                                        <input
                                                            type="number"
                                                            name="discountAmountFixed"
                                                            value={grnData.discountAmountFixed || ''}
                                                            onChange={(e) =>
                                                                setGrnData((prev) =>
                                                                    prev
                                                                        ? {
                                                                              ...prev,
                                                                              discountAmountFixed:
                                                                                  Number(e.target.value) || 0,
                                                                          }
                                                                        : prev
                                                                )
                                                            }
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
                                                    {(grnData.additionalCosts || []).map((cost) => (
                                                        <div
                                                            key={cost.id}
                                                            style={{
                                                                display: 'flex',
                                                                gap: '8px',
                                                                alignItems: 'center',
                                                                flexWrap: 'wrap',
                                                            }}
                                                        >
                                                            <input
                                                                type="text"
                                                                value={cost.name}
                                                                onChange={(e) =>
                                                                    updateAdditionalCost(
                                                                        cost.id,
                                                                        'name',
                                                                        e.target.value
                                                                    )
                                                                }
                                                                placeholder="Tên"
                                                                className="form-input"
                                                                style={{ flex: '1 1 100px', minWidth: 0 }}
                                                            />
                                                            <input
                                                                type="number"
                                                                value={cost.amount || ''}
                                                                onChange={(e) =>
                                                                    updateAdditionalCost(
                                                                        cost.id,
                                                                        'amount',
                                                                        e.target.value
                                                                    )
                                                                }
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
                                            <div style={{ fontSize: 13, color: '#666' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span style={{ fontWeight: 600 }}>Chiết khấu:</span>
                                                    <span style={{ color: '#ef4444' }}>
                                                        - {formatCurrency(discountAmount)}
                                                    </span>
                                                </div>
                                                {(grnData.additionalCosts || []).filter((c) => (Number(c.amount) || 0) > 0).map((c) => (
                                                        <div
                                                            key={c.id}
                                                            style={{
                                                                display: 'flex',
                                                                justifyContent: 'space-between',
                                                                marginTop: 6,
                                                            }}
                                                        >
                                                            <span>
                                                                {c.name && c.name.trim() ? c.name.trim() : 'Chi phí'}:
                                                            </span>
                                                            <span style={{ color: '#10b981' }}>
                                                                + {formatCurrency(Number(c.amount) || 0)}
                                                            </span>
                                                        </div>
                                                    ))}
                                                {(grnData.additionalCosts || []).filter((c) => Number(c.amount) > 0).length > 0 && (
                                                    <div
                                                        style={{
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            marginTop: 6,
                                                            fontWeight: 600,
                                                        }}
                                                    >
                                                        <span>Tổng chi phí:</span>
                                                        <span style={{ color: '#10b981' }}>
                                                            + {formatCurrency(totalAdditionalCosts)}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            <div
                                                style={{
                                                    marginTop: 16,
                                                    padding: '20px',
                                                    backgroundColor: '#e3f2fd',
                                                    borderRadius: 12,
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    borderLeft: '4px solid #2196F3',
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        fontSize: 18,
                                                        fontWeight: 700,
                                                        color: '#2196F3',
                                                    }}
                                                >
                                                    Tổng giá trị đơn:
                                                </span>
                                                <span
                                                    style={{
                                                        fontSize: 22,
                                                        fontWeight: 700,
                                                        color: '#2196F3',
                                                        fontVariantNumeric: 'tabular-nums',
                                                    }}
                                                >
                                                    {formatCurrency(grandTotal)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="form-grid">
                                        <div className="form-field">
                                            <label className="form-label">Tổng số lượng đặt</label>
                                            <div
                                                style={{
                                                    padding: '10px',
                                                    backgroundColor: '#f5f5f5',
                                                    borderRadius: 8,
                                                    fontWeight: 600,
                                                    fontVariantNumeric: 'tabular-nums',
                                                }}
                                            >
                                                {totalQuantityOrdered} sản phẩm
                                            </div>
                                        </div>
                                        <div className="form-field">
                                            <label className="form-label">Tạm tính</label>
                                            <div
                                                style={{
                                                    padding: '10px',
                                                    backgroundColor: '#f5f5f5',
                                                    borderRadius: 8,
                                                    fontWeight: 600,
                                                    fontVariantNumeric: 'tabular-nums',
                                                }}
                                            >
                                                {formatCurrency(subtotal)}
                                            </div>
                                        </div>

                                        {/* Chi phí: chỉ liệt kê từng dòng chi phí con */}
                                        <div className="form-field span-2">
                                            <label className="form-label">Chi phí</label>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                                                {(grnData.additionalCosts || []).filter((c) => (Number(c.amount) || 0) > 0).map((c) => (
                                                        <div
                                                            key={c.id}
                                                            style={{
                                                                display: 'flex',
                                                                justifyContent: 'space-between',
                                                                fontSize: 13,
                                                            }}
                                                        >
                                                            <span>
                                                                {c.name && c.name.trim() ? c.name.trim() : 'Chi phí'}:
                                                            </span>
                                                            <span style={{ color: '#10b981', fontWeight: 500 }}>
                                                                + {formatCurrency(Number(c.amount) || 0)}
                                                            </span>
                                                        </div>
                                                    ))}
                                            </div>
                                        </div>

                                        {/* Khối tóm tắt Chiết khấu + Chi phí tổng và Tổng giá trị đơn */}
                                        <div className="form-field span-2">
                                            <div style={{ fontSize: 13, color: '#666' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span style={{ fontWeight: 600 }}>Chiết khấu:</span>
                                                    <span style={{ color: '#ef4444' }}>
                                                        - {formatCurrency(discountAmount)}
                                                    </span>
                                                </div>
                                                {totalAdditionalCosts > 0 && (
                                                    <div
                                                        style={{
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            marginTop: 6,
                                                            fontWeight: 600,
                                                        }}
                                                    >
                                                        <span>Tổng chi phí:</span>
                                                        <span style={{ color: '#10b981' }}>
                                                            + {formatCurrency(totalAdditionalCosts)}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            <div
                                                style={{
                                                    marginTop: 16,
                                                    padding: '20px',
                                                    backgroundColor: '#e3f2fd',
                                                    borderRadius: 12,
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    borderLeft: '4px solid #2196F3',
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        fontSize: 18,
                                                        fontWeight: 700,
                                                        color: '#2196F3',
                                                    }}
                                                >
                                                    Tổng giá trị đơn:
                                                </span>
                                                <span
                                                    style={{
                                                        fontSize: 22,
                                                        fontWeight: 700,
                                                        color: '#2196F3',
                                                        fontVariantNumeric: 'tabular-nums',
                                                    }}
                                                >
                                                    {formatCurrency(grandTotal)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Cột phải: placeholder để giữ layout đồng nhất */}
                        <div style={{ margin: 0 }} />
                    </div>
                </div>
            </div>
            {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}
        </div>
    );
};

export default ViewGoodReceiptNoteDetail;

