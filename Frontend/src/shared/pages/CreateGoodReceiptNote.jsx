import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Tooltip from '@mui/material/Tooltip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import {
    ArrowLeft,
    Plus,
    X,
    MapPin,
    User,
    Save,
    Send,
    Loader,
    Calendar,
    Trash2,
    Package,
    FileText,
    ImageIcon,
    Search,
    Eye,
    Building2,
} from 'lucide-react';
import { getAllPurchaseOrdersForSelection, getPurchaseOrderDetail } from '../lib/purchaseOrderService';
import { getItemsForDisplay } from '../lib/itemService';
import Toast from '../../components/Toast/Toast';
import { useToast } from '../hooks/useToast';
import authService from '../lib/authService';
import '../styles/CreateSupplier.css';

const CreateGoodReceiptNote = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { toast, showToast, clearToast } = useToast();
    const [submitting, setSubmitting] = useState(false);
    const currentUser = authService.getUser();

    const [formData, setFormData] = useState({
        warehouseId: '',
        warehouseName: '',
        purchaseOrderCode: '',
        supplierId: '',
        supplierName: '',
        receiptDate: new Date().toISOString().slice(0, 10),
        creatorId: currentUser?.userId || '',
        creatorName: currentUser?.fullName || currentUser?.FullName || '',
        justification: '',
        discountType: 'percent',
        discount: 0,
        discountAmountFixed: 0,
        additionalCosts: [],
    });

    const MAX_JUSTIFICATION_LENGTH = 250;

    const [lines, setLines] = useState([]);
    const [selectedLineIds, setSelectedLineIds] = useState([]);
    const [showProductSearch, setShowProductSearch] = useState(false);
    const [searchKeyword, setSearchKeyword] = useState('');
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [selectedProductIds, setSelectedProductIds] = useState([]);
    const [imageErrors, setImageErrors] = useState({});
    const [errors, setErrors] = useState({});
    const [poDropdownOpen, setPoDropdownOpen] = useState(false);
    const [confirmImportPoOpen, setConfirmImportPoOpen] = useState(false);
    const [selectedPODetails, setSelectedPODetails] = useState(null);
    const [poImportLoading, setPoImportLoading] = useState(false);
    const poDropdownRef = useRef(null);

    // State và effect để load danh sách PO từ API
    const [poList, setPoList] = useState([]);
    const [poListLoading, setPoListLoading] = useState(true);
    const [poListError, setPoListError] = useState(null);

    // Load danh sách PO từ API
    useEffect(() => {
        const fetchPOList = async () => {
            setPoListLoading(true);
            setPoListError(null);
            try {
                const items = await getAllPurchaseOrdersForSelection('Approved');
                // Map dữ liệu từ API
                const mappedPOs = items.map(po => ({
                    poCode: po.poCode ?? po.PoCode ?? '',
                    supplierName: po.supplierName ?? po.SupplierName ?? '',
                    warehouseName: po.warehouseName ?? po.WarehouseName ?? '',
                    status: po.status ?? po.Status ?? '',
                    requestedDate: po.requestedDate ?? po.RequestedDate ?? '',
                    expectedDeliveryDate: po.expectedDeliveryDate ?? po.ExpectedDeliveryDate ?? '',
                    supplierId: po.supplierId ?? po.SupplierId ?? null,
                    warehouseId: po.warehouseId ?? po.WarehouseId ?? null,
                    poId: po.purchaseOrderId ?? po.PurchaseOrderId ?? null,
                    // Lines sẽ được lấy chi tiết khi chọn PO
                    lines: po.lines ?? po.Lines ?? [],
                }));
                setPoList(mappedPOs);
            } catch (err) {
                console.error('Lỗi load PO list:', err);
                setPoListError(err?.message || 'Không tải được danh sách đơn mua');
            } finally {
                setPoListLoading(false);
            }
        };
        fetchPOList();
    }, []);

    // Tìm PO theo mã - define BEFORE the useEffect that uses it
    const getPOByCode = useCallback((code) => {
        return poList.find(po => po.poCode === code);
    }, [poList]);

    // Handler khi xác nhận nhập từ PO - define BEFORE the useEffect that uses it
    const handleConfirmImportPO = async (poCodeOverride = null) => {
        const poCode = poCodeOverride || formData.purchaseOrderCode;
        if (!poCode) return;

        const po = getPOByCode(poCode);
        if (!po) {
            if (!poCodeOverride) {
                showToast('Không tìm thấy đơn mua hàng!', 'error');
                setConfirmImportPoOpen(false);
            }
            return;
        }

        setPoImportLoading(true);

        try {
            // Gọi API lấy chi tiết PO nếu chưa có lines
            let poDetail = po;
            if (!po.lines || po.lines.length === 0) {
                const detail = await getPurchaseOrderDetail(po.poId);
                if (detail) {
                    poDetail = {
                        ...po,
                        lines: detail.lines ?? detail.Lines ?? [],
                    };
                }
            }

            setSelectedPODetails(poDetail);
            setConfirmImportPoOpen(false);

            // Fill form data từ PO
            setFormData(prev => ({
                ...prev,
                supplierId: poDetail.supplierId ?? prev.supplierId,
                supplierName: poDetail.supplierName,
                warehouseId: poDetail.warehouseId ?? prev.warehouseId,
                warehouseName: poDetail.warehouseName,
            }));

            // Fill lines từ PO (chỉ những item chưa nhập đủ)
            const poLines = (poDetail.lines ?? [])
                .filter(line => (line.receivedQty ?? 0) < (line.orderedQty ?? 0))
                .map(line => ({
                    id: Date.now() + Math.random(),
                    itemId: line.itemId ?? line.ItemId,
                    itemName: line.itemName ?? line.ItemName ?? '',
                    itemSku: line.sku ?? line.Sku ?? '',
                    uom: line.uom ?? line.Uom ?? '',
                    orderedQty: line.orderedQty ?? line.OrderedQty ?? 0,
                    remainingQty: (line.orderedQty ?? 0) - (line.receivedQty ?? 0),
                    receivedQty: (line.orderedQty ?? 0) - (line.receivedQty ?? 0), // Mặc định nhập đủ số còn lại
                    unitPrice: line.unitPrice ?? line.UnitPrice ?? 0,
                    totalPrice: (line.unitPrice ?? line.UnitPrice ?? 0) * ((line.orderedQty ?? 0) - (line.receivedQty ?? 0)),
                    note: '',
                    hasCO: false,
                    hasCQ: false,
                }));

            setLines(prev => {
                // Merge với lines hiện tại, tránh trùng item
                const existingItemIds = new Set(prev.map(l => l.itemId));
                const newLines = poLines.filter(l => !existingItemIds.has(l.itemId));
                return [...prev, ...newLines];
            });

            showToast(`Đã nhập ${poLines.length} sản phẩm từ ${poDetail.poCode}`, 'success');
        } catch (err) {
            console.error('Lỗi khi import từ PO:', err);
            showToast(err?.message || 'Lỗi khi nhập từ đơn mua', 'error');
        } finally {
            setPoImportLoading(false);
        }
    };

    // Auto-fill từ query param poCode
    useEffect(() => {
        const poCodeFromUrl = searchParams.get('poCode');
        if (poCodeFromUrl && poList.length > 0) {
            const po = poList.find(p => p.poCode === poCodeFromUrl);
            if (po) {
                // Set formData
                setFormData(prev => ({
                    ...prev,
                    purchaseOrderCode: po.poCode,
                }));
                // Call handleConfirmImportPO - now it's defined before this useEffect
                handleConfirmImportPO(po.poCode);
            }
        }
    }, [searchParams, poList]); // Removed handleConfirmImportPO dependency

    // Xóa PO đã chọn
    const handleClearSelectedPO = () => {
        setSelectedPODetails(null);
        setFormData(prev => ({
            ...prev,
            purchaseOrderCode: '',
        }));
    };

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (poDropdownRef.current && !poDropdownRef.current.contains(e.target)) {
                setPoDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Load items from API when opening product search
    const [productList, setProductList] = useState([]);
    const [productListLoading, setProductListLoading] = useState(false);

    const loadProductList = useCallback(async () => {
        setProductListLoading(true);
        try {
            const items = await getItemsForDisplay();
            // Filter only active items and map to GRN format
            const mappedItems = (items ?? [])
                .filter(item => item.isActive !== false)
                .map(item => ({
                    id: item.itemId,
                    name: item.itemName,
                    sku: item.itemCode,
                    unitPrice: item.purchasePrice || 0,
                    uom: item.baseUomName || '',
                    image: null,
                }));
            setProductList(mappedItems);
        } catch (err) {
            console.error('Lỗi load danh sách sản phẩm:', err);
        } finally {
            setProductListLoading(false);
        }
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'justification' && value.length > MAX_JUSTIFICATION_LENGTH) return;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
    };

    const setDiscountType = (type) => {
        setFormData((prev) => ({ ...prev, discountType: type }));
    };

    const addAdditionalCost = () => {
        setFormData((prev) => ({
            ...prev,
            additionalCosts: [...(prev.additionalCosts || []), { id: Date.now(), name: '', amount: 0 }],
        }));
    };

    const removeAdditionalCost = (id) => {
        setFormData((prev) => ({
            ...prev,
            additionalCosts: (prev.additionalCosts || []).filter((c) => c.id !== id),
        }));
    };

    const updateAdditionalCost = (id, field, value) => {
        setFormData((prev) => ({
            ...prev,
            additionalCosts: (prev.additionalCosts || []).map((c) =>
                c.id === id ? { ...c, [field]: field === 'amount' ? Number(value) || 0 : value } : c
            ),
        }));
    };

    const handleSearchChange = (e) => {
        const keyword = e.target.value;
        setSearchKeyword(keyword);
        if (keyword.trim() === '') {
            setFilteredProducts([]);
            return;
        }
        const filtered = productList.filter(
            (product) =>
                product.name.toLowerCase().includes(keyword.toLowerCase()) ||
                product.sku.toLowerCase().includes(keyword.toLowerCase())
        );
        setFilteredProducts(filtered);
    };

    const handleImageError = (id) => {
        setImageErrors((prev) => ({ ...prev, [id]: true }));
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

    const handleSelectProduct = (product) => {
        const existingLine = lines.find((line) => line.itemId === product.id);
        if (existingLine) {
            showToast('Sản phẩm đã có trong danh sách!', 'warning');
            return;
        }
        const newLine = {
            id: Date.now(),
            itemId: product.id,
            itemName: product.name,
            itemImage: product.image,
            uom: product.uom ?? '',
            orderedQty: 1,
            receivedQty: 1,
            unitPrice: product.unitPrice,
            totalPrice: product.unitPrice,
            note: '',
        };
        setLines((prev) => [...prev, newLine]);
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
        const productsToAdd = productList.filter((p) => selectedProductIds.includes(p.id));
        const newLines = [];
        let duplicateCount = 0;
        productsToAdd.forEach((product) => {
            const existingLine = lines.find((line) => line.itemId === product.id);
            if (!existingLine) {
                newLines.push({
                    id: Date.now() + Math.random(),
                    itemId: product.id,
                    itemName: product.name,
                    itemImage: product.image,
                    uom: product.uom ?? '',
                    orderedQty: 1,
                    receivedQty: 1,
                    note: '',
                    hasCO: false,
                    hasCQ: false,
                });
            } else {
                duplicateCount++;
            }
        });
        if (newLines.length > 0) {
            setLines((prev) => [...prev, ...newLines]);
            showToast(`Đã thêm ${newLines.length} sản phẩm vào danh sách`, 'success');
        }
        if (duplicateCount > 0) {
            showToast(`${duplicateCount} sản phẩm đã có trong danh sách`, 'warning');
        }
        setSearchKeyword('');
        setFilteredProducts([]);
        setShowProductSearch(false);
        setSelectedProductIds([]);
    };

    const openProductSearch = () => {
        setShowProductSearch(true);
        setSearchKeyword('');
        setFilteredProducts([]);
        // Load product list if not already loaded
        if (productList.length === 0) {
            loadProductList();
        }
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

    const updateLine = (index, field, value) => {
        setLines((prev) =>
            prev.map((line, i) => {
                if (i !== index) return line;
                const updatedLine = { ...line, [field]: value };
                // Tự động tính totalPrice khi receivedQty hoặc unitPrice thay đổi
                if (field === 'receivedQty' || field === 'unitPrice') {
                    updatedLine.totalPrice = (Number(updatedLine.receivedQty) || 0) * (Number(updatedLine.unitPrice) || 0);
                }
                return updatedLine;
            })
        );
    };

    const removeLine = (index) => {
        setLines((prev) => prev.filter((_, i) => i !== index));
        setSelectedLineIds((prev) => prev.filter((id) => id !== lines[index].id));
    };

    const removeSelectedLines = () => {
        setLines((prev) => prev.filter((line) => !selectedLineIds.includes(line.id)));
        setSelectedLineIds([]);
    };

    const toggleLineSelection = (lineId) => {
        setSelectedLineIds((prev) =>
            prev.includes(lineId) ? prev.filter((id) => id !== lineId) : [...prev, lineId]
        );
    };

    const toggleSelectAll = () => {
        if (selectedLineIds.length === lines.length) {
            setSelectedLineIds([]);
        } else {
            setSelectedLineIds(lines.map((line) => line.id));
        }
    };

    const formatCurrency = (value) =>
        new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

    const totalQuantityOrdered = lines.reduce((sum, line) => sum + (Number(line.orderedQty) || 0), 0);
    const subtotal = lines.reduce(
        (sum, line) =>
            sum +
            (Number(line.totalPrice) || (Number(line.unitPrice) || 0) * (Number(line.receivedQty) || 0)),
        0
    );
    const discountAmount =
        formData.discountType === 'amount'
            ? Number(formData.discountAmountFixed) || 0
            : (subtotal * (Number(formData.discount) || 0)) / 100;
    const totalAdditionalCosts = (formData.additionalCosts || []).reduce(
        (sum, c) => sum + (Number(c.amount) || 0),
        0
    );
    const grandTotal = subtotal - discountAmount + totalAdditionalCosts;

    const validateForm = () => {
        const newErrors = {};
        if (!formData.warehouseName?.trim()) newErrors.warehouseName = 'Kho nhận là bắt buộc';
        const hasInvalidLine = lines.some(
            (line) => !line.itemName?.trim() || Number(line.receivedQty) <= 0
        );
        if (hasInvalidLine)
            newErrors.lines = 'Vui lòng điền đầy đủ thông tin sản phẩm (Tên, Số lượng nhập > 0)';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSaveDraft = async (e) => {
        e.preventDefault();
        if (!validateForm()) {
            showToast('Vui lòng kiểm tra lại thông tin!', 'error');
            return;
        }
        try {
            setSubmitting(true);
            showToast('Mock: Lưu nháp phiếu nhập kho thành công.', 'success');
            setTimeout(() => navigate('/good-receipt-notes'), 1500);
        } catch (error) {
            showToast(error?.message || 'Có lỗi xảy ra', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) {
            showToast('Vui lòng kiểm tra lại thông tin!', 'error');
            return;
        }
        try {
            setSubmitting(true);
            showToast('Mock: Xác nhận nhập kho thành công.', 'success');
            setTimeout(() => navigate('/good-receipt-notes'), 1500);
        } catch (error) {
            showToast(error?.message || 'Có lỗi xảy ra', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancel = () => navigate(-1);

    const canSubmit = useMemo(
        () =>
            Boolean(formData.warehouseName) &&
            lines.length > 0 &&
            !submitting &&
            !lines.some((l) => !l.itemName?.trim() || Number(l.receivedQty) <= 0),
        [formData.warehouseName, lines, submitting]
    );

    const submitTooltip = !formData.warehouseName
        ? 'Vui lòng chọn kho nhận'
        : lines.length === 0
          ? 'Vui lòng thêm ít nhất 1 sản phẩm'
          : '';

    // Lọc PO theo từ khóa
    const filteredPoCodes = useMemo(() => {
        const q = (formData.purchaseOrderCode || '').trim().toLowerCase();
        if (!q) return poList.map(po => po.poCode);
        return poList.filter(po => 
            po.poCode.toLowerCase().includes(q) || 
            po.supplierName.toLowerCase().includes(q)
        ).map(po => po.poCode);
    }, [formData.purchaseOrderCode, poList]);

    return (
        <div className="create-supplier-page">
            {/* Popup xác nhận nhập từ đơn mua hàng */}
            <Dialog
                open={confirmImportPoOpen}
                onClose={() => setConfirmImportPoOpen(false)}
                fullWidth
                maxWidth="sm"
                PaperProps={{
                    sx: {
                        width: '100%',
                        maxWidth: '420px',
                        borderRadius: '16px',
                        border: '1px solid var(--slate-200, #e5e7eb)',
                        boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)',
                        overflow: 'hidden',
                    },
                }}
            >
                <DialogTitle
                    sx={{
                        px: 3,
                        pt: 2.25,
                        pb: 1.75,
                        fontSize: '16px',
                        fontWeight: 600,
                        color: 'var(--slate-900, #111827)',
                        borderBottom: '1px solid var(--slate-200, #eef2f7)',
                    }}
                >
                    Xác nhận
                </DialogTitle>
                <DialogContent
                    sx={{
                        paddingLeft: '24px',
                        paddingRight: '24px',
                        paddingTop: '28px',
                        paddingBottom: '28px',
                        display: 'flex',
                        alignItems: 'center',
                        minHeight: 72,
                    }}
                >
                    <p
                        style={{
                            margin: 0,
                            fontSize: '14px',
                            color: 'var(--slate-700, #374151)',
                            lineHeight: 1.5,
                        }}
                    >
                        Bạn có chắc muốn nhập dữ liệu từ đơn mua hàng này?
                    </p>
                </DialogContent>
                <DialogActions
                    sx={{
                        px: 3,
                        py: 2,
                        gap: 1.5,
                        justifyContent: 'flex-end',
                        borderTop: '1px solid var(--slate-200, #eef2f7)',
                    }}
                >
                    <Button
                        onClick={() => setConfirmImportPoOpen(false)}
                        disableRipple
                        sx={{
                            minWidth: '72px',
                            height: 36,
                            borderRadius: '10px',
                            textTransform: 'none',
                            fontSize: '14px',
                            fontWeight: 600,
                            color: '#6b7280',
                            backgroundColor: 'transparent',
                            '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)', color: '#4b5563' },
                        }}
                    >
                        Hủy
                    </Button>
                    <Button
                        variant="contained"
                        disableRipple
                        disabled={poImportLoading}
                        onClick={async () => {
                            await handleConfirmImportPO();
                        }}
                        sx={{
                            minWidth: '88px',
                            height: 36,
                            borderRadius: '10px',
                            textTransform: 'none',
                            fontSize: '14px',
                            fontWeight: 600,
                            backgroundColor: '#0284c7',
                            boxShadow: '0 1px 3px rgba(2, 132, 199, 0.25)',
                            '&:hover': {
                                backgroundColor: '#0369a1',
                                boxShadow: '0 3px 8px rgba(2, 132, 199, 0.3)',
                            },
                            '&:disabled': {
                                backgroundColor: '#94a3b8',
                            },
                        }}
                    >
                        {poImportLoading ? (
                            <>
                                <Loader size={15} className="spinner" style={{ marginRight: '6px' }} />
                                Đang xử lý...
                            </>
                        ) : (
                            'Xác nhận'
                        )}
                    </Button>
                </DialogActions>
            </Dialog>

            <div className="page-header">
                <div className="page-header-left">
                    <button type="button" onClick={handleCancel} className="back-button">
                        <ArrowLeft size={20} />
                        <span>Quay lại</span>
                    </button>
                </div>
                <div className="page-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                        type="button"
                        onClick={handleCancel}
                        className="btn btn-cancel"
                        disabled={submitting}
                    >
                        <X size={15} />
                        Hủy
                    </button>
                    <button
                        type="button"
                        className="btn btn-draft"
                        disabled={submitting}
                        onClick={handleSaveDraft}
                    >
                        <Save size={15} />
                        Lưu nháp
                    </button>
                    <Tooltip title={!canSubmit && !submitting ? submitTooltip : ''} arrow placement="top">
                        <span style={{ display: 'inline-flex' }}>
                            <button
                                type="button"
                                className="btn btn-primary"
                                disabled={!canSubmit}
                                onClick={handleSubmit}
                                style={!canSubmit ? { pointerEvents: 'none' } : {}}
                            >
                                {submitting ? (
                                    <>
                                        <Loader size={15} className="spinner" />
                                        Đang xử lý...
                                    </>
                                ) : (
                                    <>
                                        <Send size={15} />
                                        Tạo & duyệt đơn
                                    </>
                                )}
                            </button>
                        </span>
                    </Tooltip>
                </div>
            </div>

            <div className="form-card">
                <form id="create-grn-form" className="form-wrapper">
                    <div className="form-card-intro">
                        <h1 className="page-title">Tạo phiếu nhập kho</h1>
                        <p className="form-card-required-note">
                            Các trường đánh dấu <span className="required-mark">*</span> là bắt buộc
                        </p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px', alignItems: 'start' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div className="info-section" style={{ margin: 0, minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
                            <div className="section-header-with-toggle">
                                <h2 className="section-title">Chi tiết sản phẩm</h2>
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
                            </div>

                            {errors.lines && (
                                <div className="error-message" style={{ marginBottom: '16px' }}>{errors.lines}</div>
                            )}

                            {showProductSearch && (
                                <div style={{ marginBottom: '16px', animation: 'slideDown 0.3s ease-out', position: 'relative' }}>
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
                                                <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af' }}>
                                                    <Package size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                                                    <p style={{ margin: 0, fontSize: '13px' }}>Không tìm thấy sản phẩm nào</p>
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
                                                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f9fafb')}
                                                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedProductIds.includes(product.id)}
                                                                onChange={(e) => {
                                                                    e.stopPropagation();
                                                                    toggleProductSelection(product.id);
                                                                }}
                                                                style={{ cursor: 'pointer', width: '16px', height: '16px', flexShrink: 0 }}
                                                            />
                                                            {isValidImageUrl(product.image) && !imageErrors[`product-${product.id}`] ? (
                                                                <img
                                                                    src={product.image}
                                                                    alt={product.name}
                                                                    onError={() => handleImageError(`product-${product.id}`)}
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
                                                            <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => handleSelectProduct(product)}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '4px' }}>
                                                                    <span style={{ fontSize: '14px', fontWeight: 500, color: '#1f2937' }}>{product.name}</span>
                                                                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#2196F3', marginLeft: '12px' }}>
                                                                        {formatCurrency(product.unitPrice)}
                                                                    </span>
                                                                </div>
                                                                <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#6b7280' }}>
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

                            {lines.length === 0 ? (
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
                                    }}
                                >
                                    <Package size={64} strokeWidth={1.5} />
                                    <p style={{ fontSize: '16px', fontWeight: 500, margin: 0 }}>Chưa có sản phẩm nào</p>
                                    <p style={{ fontSize: '14px', margin: 0 }}>Nhấn "Thêm sản phẩm" để bắt đầu</p>
                                </div>
                            ) : (
                                <div className="table-container" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                                    <table className="product-table">
                                        <thead>
                                            <tr>
                                                <th style={{ width: '40px' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={lines.length > 0 && selectedLineIds.length === lines.length}
                                                        onChange={toggleSelectAll}
                                                        style={{ cursor: 'pointer' }}
                                                    />
                                                </th>
                                                <th style={{ width: '40px' }}>STT</th>
                                                <th>Sản phẩm *</th>
                                                <th style={{ width: '100px' }}>SL đặt *</th>
                                                <th style={{ width: '100px' }}>SL nhập *</th>
                                                <th style={{ width: '70px', textAlign: 'center' }}>ĐVT</th>
                                                <th style={{ width: '80px', textAlign: 'center' }} title="Chứng chỉ xuất xứ (CO)">CO</th>
                                                <th style={{ width: '80px', textAlign: 'center' }} title="Chứng chỉ chất lượng (CQ)">CQ</th>
                                                <th style={{ width: '180px' }}>Ghi chú</th>
                                                <th style={{ width: '60px' }}></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {lines.map((line, index) => (
                                                <tr key={line.id}>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedLineIds.includes(line.id)}
                                                            onChange={() => toggleLineSelection(line.id)}
                                                            style={{ cursor: 'pointer' }}
                                                        />
                                                    </td>
                                                    <td style={{ textAlign: 'center' }}>{index + 1}</td>
                                                    <td>
                                                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
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
                                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: 1 }}>
                                                                <a
                                                                    href="#"
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                    }}
                                                                    style={{
                                                                        color: '#2196F3',
                                                                        textDecoration: 'none',
                                                                        fontSize: '14px',
                                                                        fontWeight: 500,
                                                                        flex: 1,
                                                                    }}
                                                                    onMouseEnter={(e) => (e.target.style.textDecoration = 'underline')}
                                                                    onMouseLeave={(e) => (e.target.style.textDecoration = 'none')}
                                                                >
                                                                    {line.itemName}
                                                                </a>
                                                                {line.itemSku && (
                                                                    <span style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 400 }}>
                                                                        {line.itemSku}
                                                                    </span>
                                                                )}
                                                                <button
                                                                    type="button"
                                                                    className="btn-icon-only"
                                                                    style={{ color: '#2196F3' }}
                                                                    title="Xem chi tiết sản phẩm"
                                                                >
                                                                    <Eye size={18} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="number"
                                                            value={line.orderedQty}
                                                            onChange={(e) => updateLine(index, 'orderedQty', Number(e.target.value))}
                                                            min="0"
                                                            className="form-input"
                                                            style={{ textAlign: 'right' }}
                                                        />
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="number"
                                                            value={line.receivedQty}
                                                            onChange={(e) => updateLine(index, 'receivedQty', Number(e.target.value))}
                                                            min="0"
                                                            className="form-input"
                                                            style={{ textAlign: 'right' }}
                                                        />
                                                    </td>
                                                    <td style={{ textAlign: 'center', verticalAlign: 'middle', fontSize: '14px', color: 'var(--slate-700)' }}>
                                                        {line.uom ?? '—'}
                                                    </td>
                                                    <td style={{ textAlign: 'center', verticalAlign: 'middle' }} title="Chứng chỉ xuất xứ (CO)">
                                                        <input
                                                            type="checkbox"
                                                            checked={!!line.hasCO}
                                                            readOnly
                                                            disabled
                                                            style={{ width: '18px', height: '18px', cursor: 'default', margin: 0 }}
                                                        />
                                                    </td>
                                                    <td style={{ textAlign: 'center', verticalAlign: 'middle' }} title="Chứng chỉ chất lượng (CQ)">
                                                        <input
                                                            type="checkbox"
                                                            checked={!!line.hasCQ}
                                                            readOnly
                                                            disabled
                                                            style={{ width: '18px', height: '18px', cursor: 'default', margin: 0 }}
                                                        />
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="text"
                                                            value={line.note}
                                                            onChange={(e) => updateLine(index, 'note', e.target.value)}
                                                            placeholder="Nhập ghi chú"
                                                            className="form-input"
                                                        />
                                                    </td>
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
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        <div className="info-section" style={{ margin: 0 }}>
                            <div className="section-header-with-toggle">
                                <h2 className="section-title">Nhà cung cấp</h2>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div className="form-field">
                                    <label htmlFor="supplierName" className="form-label">
                                        Nhà cung cấp
                                    </label>
                                    <div className="input-wrapper">
                                        <Building2 className="input-icon" size={16} />
                                        <input
                                            id="supplierName"
                                            type="text"
                                            name="supplierName"
                                            value={formData.supplierName || ''}
                                            onChange={handleChange}
                                            placeholder="Chọn hoặc nhập nhà cung cấp"
                                            className="form-input"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                        </div>

                        <div className="info-section" style={{ margin: 0 }}>
                            <div className="section-header-with-toggle">
                                <h2 className="section-title">Thông tin chung</h2>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div className="form-field">
                                    <label htmlFor="warehouseName" className="form-label">
                                        Kho nhận <span className="required-mark">*</span>
                                    </label>
                                    <div className="input-wrapper">
                                        <MapPin className="input-icon" size={16} />
                                        <input
                                            id="warehouseName"
                                            type="text"
                                            name="warehouseName"
                                            value={formData.warehouseName}
                                            onChange={handleChange}
                                            placeholder="Chọn kho nhận"
                                            className={`form-input ${errors.warehouseName ? 'error' : ''}`}
                                        />
                                    </div>
                                    {errors.warehouseName && (
                                        <span className="error-message">{errors.warehouseName}</span>
                                    )}
                                </div>
                                <div className="form-field">
                                    <label htmlFor="receiptDate" className="form-label">
                                        Ngày nhập dự kiến
                                    </label>
                                    <div className="input-wrapper">
                                        <Calendar className="input-icon" size={16} />
                                        <input
                                            id="receiptDate"
                                            type="date"
                                            name="receiptDate"
                                            value={formData.receiptDate}
                                            onChange={handleChange}
                                            className="form-input"
                                        />
                                    </div>
                                </div>
                                <div className="form-field" ref={poDropdownRef}>
                                    <label htmlFor="purchaseOrderCode" className="form-label">
                                        Đơn mua hàng tham chiếu
                                    </label>
                                    <div className="input-wrapper" style={{ position: 'relative' }}>
                                        <FileText className="input-icon" size={16} />
                                        <input
                                            id="purchaseOrderCode"
                                            type="text"
                                            name="purchaseOrderCode"
                                            value={formData.purchaseOrderCode}
                                            onChange={(e) => {
                                                handleChange(e);
                                                setPoDropdownOpen(true);
                                            }}
                                            onFocus={() => setPoDropdownOpen(true)}
                                            placeholder="Tìm hoặc chọn mã đơn mua"
                                            className="form-input"
                                            autoComplete="off"
                                        />
                                        {poDropdownOpen && (
                                            <ul
                                                className="form-input"
                                                style={{
                                                    position: 'absolute',
                                                    top: '100%',
                                                    left: 0,
                                                    right: 0,
                                                    marginTop: '4px',
                                                    maxHeight: '200px',
                                                    overflowY: 'auto',
                                                    listStyle: 'none',
                                                    padding: '8px 0',
                                                    zIndex: 10,
                                                    backgroundColor: '#fff',
                                                    border: '1px solid #d1d5db',
                                                    borderRadius: '8px',
                                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                                }}
                                            >
                                                {poListLoading ? (
                                                    <li style={{ padding: '8px 12px', color: '#6b7280', fontSize: '14px', textAlign: 'center' }}>
                                                        <Loader size={16} style={{ animation: 'spin 1s linear infinite', marginRight: '8px' }} />
                                                        Đang tải...
                                                    </li>
                                                ) : poListError ? (
                                                    <li style={{ padding: '8px 12px', color: '#ef4444', fontSize: '14px' }}>
                                                        {poListError}
                                                    </li>
                                                ) : filteredPoCodes.length === 0 ? (
                                                    <li style={{ padding: '8px 12px', color: '#6b7280', fontSize: '14px' }}>
                                                        Không có mã phù hợp
                                                    </li>
                                                ) : (
                                                    filteredPoCodes.map((code) => {
                                                        const po = getPOByCode(code);
                                                        return (
                                                            <li
                                                                key={code}
                                                                onClick={() => {
                                                                    setFormData((prev) => ({ ...prev, purchaseOrderCode: code }));
                                                                    setPoDropdownOpen(false);
                                                                }}
                                                                style={{
                                                                    padding: '8px 12px',
                                                                    cursor: 'pointer',
                                                                    fontSize: '14px',
                                                                }}
                                                                onMouseEnter={(e) => {
                                                                    e.currentTarget.style.backgroundColor = '#f3f4f6';
                                                                }}
                                                                onMouseLeave={(e) => {
                                                                    e.currentTarget.style.backgroundColor = 'transparent';
                                                                }}
                                                            >
                                                                <div style={{ fontWeight: 500, color: '#1f2937' }}>{code}</div>
                                                                {po && (
                                                                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                                                                        {po.supplierName} • {po.warehouseName}
                                                                    </div>
                                                                )}
                                                            </li>
                                                        );
                                                    })
                                                )}
                                            </ul>
                                        )}
                                    </div>
                                    {formData.purchaseOrderCode?.trim() && (
                                        <button
                                            type="button"
                                            className="btn btn-draft"
                                            onClick={() => setConfirmImportPoOpen(true)}
                                            style={{ marginTop: '10px' }}
                                        >
                                            Nhập từ mã đơn mua
                                        </button>
                                    )}
                                    
                                    {/* Hiển thị thông tin PO đã chọn */}
                                    {selectedPODetails !== null && selectedPODetails !== undefined && selectedPODetails.poCode && (
                                        <div 
                                            style={{ 
                                                marginTop: '12px', 
                                                padding: '12px', 
                                                backgroundColor: '#f0f9ff', 
                                                borderRadius: '8px',
                                                border: '1px solid #bae6fd'
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                                <div>
                                                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#0369a1' }}>
                                                        {selectedPODetails.poCode}
                                                    </div>
                                                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                                                        {selectedPODetails.supplierName}
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={handleClearSelectedPO}
                                                    style={{
                                                        background: 'transparent',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        padding: '4px',
                                                        color: '#64748b',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                    }}
                                                    title="Xóa"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                                                <div>
                                                    <span style={{ color: '#64748b' }}>Kho: </span>
                                                    <span style={{ fontWeight: 500, color: '#1e293b' }}>{selectedPODetails.warehouseName}</span>
                                                </div>
                                                <div>
                                                    <span style={{ color: '#64748b' }}>Ngày đặt: </span>
                                                    <span style={{ fontWeight: 500, color: '#1e293b' }}>{selectedPODetails.requestedDate}</span>
                                                </div>
                                                <div>
                                                    <span style={{ color: '#64748b' }}>Trạng thái: </span>
                                                    <span style={{ 
                                                        fontWeight: 500, 
                                                        color: selectedPODetails.status === 'Approved' ? '#10b981' : 
                                                               selectedPODetails.status === 'Pending' ? '#f59e0b' : '#ef4444' 
                                                    }}>
                                                        {selectedPODetails.status === 'Approved' ? 'Đã duyệt' : 
                                                         selectedPODetails.status === 'PENDING_ACC' ? 'Chờ duyệt' : 'Từ chối'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span style={{ color: '#64748b' }}>Sản phẩm: </span>
                                                    <span style={{ fontWeight: 500, color: '#1e293b' }}>{selectedPODetails.lines.length} items</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="form-field">
                                    <label htmlFor="creatorName" className="form-label">
                                        Người tạo
                                    </label>
                                    <div className="input-wrapper">
                                        <User className="input-icon" size={16} />
                                        <input
                                            id="creatorName"
                                            type="text"
                                            name="creatorName"
                                            value={formData.creatorName}
                                            readOnly
                                            className="form-input"
                                            style={{ backgroundColor: '#f5f5f5' }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px', alignItems: 'start' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Ghi chú</h2>
                                </div>
                                <div className="form-field">
                                    <label htmlFor="justification" className="form-label">
                                        Ghi chú / Lý do nhập kho
                                    </label>
                                    <textarea
                                        id="justification"
                                        name="justification"
                                        value={formData.justification}
                                        onChange={handleChange}
                                        placeholder="Nhập ghi chú (tối đa 250 ký tự)"
                                        rows={4}
                                        className="form-input"
                                        style={{ resize: 'vertical' }}
                                    />
                                    <div
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'flex-end',
                                            fontSize: '12px',
                                            color:
                                                formData.justification.length >= MAX_JUSTIFICATION_LENGTH
                                                    ? '#ef4444'
                                                    : '#6b7280',
                                            marginTop: '4px',
                                            fontWeight: 500,
                                        }}
                                    >
                                        {formData.justification.length}/{MAX_JUSTIFICATION_LENGTH} ký tự
                                    </div>
                                </div>
                            </div>

                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Tổng hợp đơn hàng</h2>
                                </div>
                                <div className="form-grid">
                                    <div className="form-field">
                                        <label className="form-label">Tổng số lượng đặt</label>
                                        <div style={{ padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '8px', fontWeight: 600 }}>
                                            {totalQuantityOrdered} sản phẩm
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
                                                        className={`btn btn-sm ${formData.discountType === 'amount' ? 'btn-primary' : 'btn-card-text'}`}
                                                        onClick={() => setDiscountType('amount')}
                                                    >
                                                        Số tiền
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className={`btn btn-sm ${formData.discountType === 'percent' ? 'btn-primary' : 'btn-card-text'}`}
                                                        onClick={() => setDiscountType('percent')}
                                                    >
                                                        %
                                                    </button>
                                                </div>
                                                {formData.discountType === 'percent' ? (
                                                    <input
                                                        type="number"
                                                        name="discount"
                                                        value={formData.discount}
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
                                                        value={formData.discountAmountFixed || ''}
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
                                                {(formData.additionalCosts || []).map((cost) => (
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
                                            {(formData.additionalCosts || []).filter((c) => (Number(c.amount) || 0) > 0).map((c) => (
                                                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                                                    <span>{c.name?.trim() ? c.name.trim() : 'Chi phí'}:</span>
                                                    <span style={{ color: '#10b981' }}>+ {formatCurrency(Number(c.amount) || 0)}</span>
                                                </div>
                                            ))}
                                            {(formData.additionalCosts || []).filter((c) => (Number(c.amount) || 0) > 0).length > 0 && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontWeight: 600 }}>
                                                    <span>Tổng chi phí:</span>
                                                    <span style={{ color: '#10b981' }}>+ {formatCurrency(totalAdditionalCosts)}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div
                                            style={{
                                                marginTop: '16px',
                                                padding: '20px',
                                                backgroundColor: '#e3f2fd',
                                                borderRadius: '12px',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                borderLeft: '4px solid #2196F3',
                                            }}
                                        >
                                            <span style={{ fontSize: '18px', fontWeight: 700, color: '#2196F3' }}>Tổng giá trị đơn:</span>
                                            <span style={{ fontSize: '24px', fontWeight: 700, color: '#2196F3' }}>{formatCurrency(grandTotal)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div />
                    </div>
                </form>
            </div>

            {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}
        </div>
    );
};

export default CreateGoodReceiptNote;
