// 1. React/External libraries
import React, { useState, useEffect, useMemo } from 'react';

// 2. React Router
import { useNavigate } from 'react-router-dom';

// 3. MUI Components
import Tooltip from '@mui/material/Tooltip';

// 4. Icons
import {
    ArrowLeft,
    Plus,
    X,
    Building2,
    MapPin,
    User,
    Save,
    Send,
    Loader,
    Calendar,
    Trash2,
    Eye,
    Package,
    Search,
    FileSpreadsheet,
    FileText,
    Paperclip
} from 'lucide-react';

// 5. Internal - Components
import Toast from '../../components/Toast/Toast';
import DiscountSection from '../components/PO/DiscountSection';
import ProductTable from '../components/PO/ProductTable';

// 6. Internal - Services
import authService from '../lib/authService';
import { getSuppliers } from '../lib/supplierService';
import { getWarehouseList } from '../lib/warehouseService';
import { getItemsForDisplay } from '../lib/itemService';
import { createPurchaseOrder, uploadPurchaseOrderAttachments } from '../lib/purchaseOrderService';

// 7. Internal - Hooks
import { useToast } from '../hooks/useToast';

// 8. Internal - Utils
import {
    formatCurrency,
    validatePOForm,
    calculatePOTotals,
    preparePOPayload,
    MAX_JUSTIFICATION_LENGTH,
    DISCOUNT_TYPES,
} from '../utils/purchaseOrderUtils';

// 9. Styles
import '../styles/CreatePurchaseOrder.css';
import '../styles/CreateSupplier.css';

const CreatePurchaseOrder = () => {
    const navigate = useNavigate();
    const { toast, showToast, clearToast } = useToast();
    const [submitting, setSubmitting] = useState(false);
    const currentUser = authService.getUser();

    // Helper function để map item từ API
    const mapItemFromAPI = (it) => ({
        id: it.itemId,
        name: it.itemName ?? '',
        sku: it.itemCode ?? '',
        unitPrice: Number(it.purchasePrice ?? 0),
        uom: it.baseUomName || it.uomName || '',
        image: it.imageUrl || null,
        hasCO: !!(it.requiresCo || it.requiresCO),
        hasCQ: !!(it.requiresCq || it.requiresCQ),
    });
    
    const [formData, setFormData] = useState({
        supplierId: '',
        supplierName: '',
        supplierPhone: '',
        supplierEmail: '',
        supplierTaxCode: '',
        supplierAddressStreet: '',
        supplierAddressWard: '',
        supplierAddressDistrict: '',
        supplierAddressProvince: '',
        warehouseId: '',
        warehouseName: '',
        creatorId: currentUser?.userId || '',
        creatorName: currentUser?.fullName || currentUser?.FullName || '',
        expectedReceiptDate: '',
        justification: '',
        discountType: 'percent',
        discount: 0,
        discountAmountFixed: 0,
        additionalCosts: [],
    });
    
    const [lines, setLines] = useState([]);
    const [selectedLineIds, setSelectedLineIds] = useState([]);
    const [showProductSearch, setShowProductSearch] = useState(false);
    const [searchKeyword, setSearchKeyword] = useState('');
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [selectedProductIds, setSelectedProductIds] = useState([]);
    const [imageErrors, setImageErrors] = useState({});

    // Data từ API
    const [suppliers, setSuppliers] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [products, setProducts] = useState([]);
    const [productsLoading, setProductsLoading] = useState(false);
    const [productsError, setProductsError] = useState(null);

    const [errors, setErrors] = useState({});
    const [quotationFile, setQuotationFile] = useState(null);
    const [contractAppendixFile, setContractAppendixFile] = useState(null);

    const [supplierQuery, setSupplierQuery] = useState('');
    const [supplierDropdownOpen, setSupplierDropdownOpen] = useState(false);
    const [warehouseQuery, setWarehouseQuery] = useState('');
    const [warehouseDropdownOpen, setWarehouseDropdownOpen] = useState(false);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                // Suppliers
                const supRes = await getSuppliers({ page: 1, pageSize: 100 });
                const supItems = Array.isArray(supRes?.items) ? supRes.items : [];
                const mappedSuppliers = supItems.map((s) => ({
                    id: s.supplierId,
                    name: s.supplierName ?? '',
                    phone: s.phone ?? '',
                    email: s.email ?? '',
                    taxCode: s.taxCode ?? '',
                    addressText: s.address ?? '',
                    city: s.city ?? '',
                    ward: s.ward ?? '',
                }));

                // Warehouses
                const whRes = await getWarehouseList({ pageNumber: 1, pageSize: 100 });
                const mappedWarehouses = (Array.isArray(whRes?.items) ? whRes.items : []).map((w) => ({
                    id: w.warehouseId,
                    name: w.warehouseName ?? '',
                }));

                // Items for search - with loading state
                setProductsLoading(true);
                try {
                    const itemList = await getItemsForDisplay();
                    const mappedProducts = (Array.isArray(itemList) ? itemList : [])
                        .filter(Boolean)
                        .map((it) => ({
                            id: it.itemId,
                            name: it.itemName ?? '',
                            sku: it.itemCode ?? '',
                            unitPrice: Number(it.purchasePrice ?? 0),
                            uom: it.baseUomName || it.uomName || '',
                            image: it.imageUrl || null,
                            hasCO: !!(it.requiresCO || it.requiresCo),
                            hasCQ: !!(it.requiresCQ || it.requiresCq),
                        }));
                    setProducts(mappedProducts);
                    setProductsError(null);
                } catch (err) {
                    console.error('Error fetching items:', err);
                    setProductsError('Không thể tải danh sách vật tư');
                } finally {
                    setProductsLoading(false);
                }

                if (!mounted) return;
                setSuppliers(mappedSuppliers);
                setWarehouses(mappedWarehouses);
            } catch (err) {
                if (!mounted) return;
                showToast(err?.message || 'Không thể tải dữ liệu (nhà cung cấp/kho/vật tư).', 'error');
            }
        })();
        return () => { mounted = false; };
    }, [showToast]);

    const filteredSuppliers = useMemo(() => {
        const q = supplierQuery.trim().toLowerCase();
        if (!q) return suppliers;
        return suppliers.filter((s) => (s.name || '').toLowerCase().includes(q) || String(s.id).toLowerCase().includes(q));
    }, [supplierQuery, suppliers]);

    const filteredWarehouses = useMemo(() => {
        const q = warehouseQuery.trim().toLowerCase();
        if (!q) return warehouses;
        return warehouses.filter((w) => (w.name || '').toLowerCase().includes(q) || String(w.id).toLowerCase().includes(q));
    }, [warehouseQuery, warehouses]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        
        // Giới hạn 250 ký tự cho trường justification
        if (name === 'justification' && value.length > MAX_JUSTIFICATION_LENGTH) {
            return;
        }
        
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const setDiscountType = (type) => {
        setFormData(prev => ({ ...prev, discountType: type }));
    };

    const handleSearchChange = (e) => {
        const keyword = e.target.value;
        setSearchKeyword(keyword);

        if (keyword.trim() === '') {
            // When search is empty, show all products
            setFilteredProducts(products);
            return;
        }

        // Filter products theo tên hoặc mã SKU
        const filtered = products.filter(product =>
            (product.name || '').toLowerCase().includes(keyword.toLowerCase()) ||
            (product.sku || '').toLowerCase().includes(keyword.toLowerCase())
        );
        setFilteredProducts(filtered);
    };

    const handleImageError = (id) => {
        setImageErrors(prev => ({ ...prev, [id]: true }));
    };

    const isValidImageUrl = (url) => {
        if (!url || typeof url !== 'string') return false;
        // Kiểm tra URL có phải là string và có format hợp lệ
        try {
            const urlObj = new URL(url);
            return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
        } catch {
            return false;
        }
    };

    const handleSelectProduct = (product) => {
        // Check xem sản phẩm đã tồn tại trong bảng chưa
        const existingLine = lines.find(line => line.itemId === product.id);
        
        if (existingLine) {
            showToast('Sản phẩm đã có trong danh sách!', 'warning');
            return;
        }
        
        // Thêm sản phẩm vào bảng
        const newLine = {
            id: Date.now(),
            itemId: product.id,
            itemName: product.name,
            itemImage: product.image,
            orderedQty: 1,
            unitPrice: product.unitPrice,
            totalPrice: product.unitPrice,
            hasCO: !!(product.hasCO),
            hasCQ: !!(product.hasCQ),
            note: ''
        };
        
        setLines(prev => [...prev, newLine]);
        
        // Reset search
        setSearchKeyword('');
        setFilteredProducts([]);
        setShowProductSearch(false);
        setSelectedProductIds([]);
        
        showToast('Đã thêm sản phẩm vào danh sách', 'success');
    };

    const toggleProductSelection = (productId) => {
        setSelectedProductIds(prev => 
            prev.includes(productId) 
                ? prev.filter(id => id !== productId)
                : [...prev, productId]
        );
    };

    const addSelectedProducts = () => {
        if (selectedProductIds.length === 0) {
            showToast('Vui lòng chọn ít nhất 1 sản phẩm', 'warning');
            return;
        }

        const productsToAdd = products.filter(p => selectedProductIds.includes(p.id));
        const newLines = [];
        let duplicateCount = 0;

        productsToAdd.forEach(product => {
            const existingLine = lines.find(line => line.itemId === product.id);
            if (!existingLine) {
                newLines.push({
                    id: Date.now() + Math.random(),
                    itemId: product.id,
                    itemName: product.name,
                    itemImage: product.image,
                    orderedQty: 1,
                    unitPrice: product.unitPrice,
                    totalPrice: product.unitPrice,
                    hasCO: !!(product.hasCO || product.requiresCO || product.requiresCo),
                    hasCQ: !!(product.hasCQ || product.requiresCQ || product.requiresCq),
                    note: ''
                });
            } else {
                duplicateCount++;
            }
        });

        if (newLines.length > 0) {
            setLines(prev => [...prev, ...newLines]);
            showToast(`Đã thêm ${newLines.length} sản phẩm vào danh sách`, 'success');
        }

        if (duplicateCount > 0) {
            showToast(`${duplicateCount} sản phẩm đã có trong danh sách`, 'warning');
        }

        // Reset
        setSearchKeyword('');
        setFilteredProducts([]);
        setShowProductSearch(false);
        setSelectedProductIds([]);
    };

    const openProductSearch = () => {
        setShowProductSearch(true);
        setSearchKeyword('');

        // If products already loaded, show all
        if (products.length > 0) {
            setFilteredProducts(products);
        } else if (!productsLoading && !productsError) {
            // First time: fetch items
            setProductsLoading(true);
            setProductsError(null);
            getItemsForDisplay()
                .then(itemList => {
                    const mapped = (Array.isArray(itemList) ? itemList : [])
                        .filter(Boolean)
                        .map(it => ({
                            id: it.itemId,
                            name: it.itemName ?? '',
                            sku: it.itemCode ?? '',
                            unitPrice: Number(it.purchasePrice ?? 0),
                            uom: it.baseUomName || it.uomName || '',
                            image: it.imageUrl || null,
                            hasCO: !!(it.requiresCo || it.requiresCO),
                            hasCQ: !!(it.requiresCq || it.requiresCQ),
                        }));
                    setProducts(mapped);
                    setFilteredProducts(mapped);
                })
                .catch(err => {
                    console.error('Error fetching items:', err);
                    setProductsError('Không thể tải danh sách vật tư. Vui lòng thử lại.');
                })
                .finally(() => {
                    setProductsLoading(false);
                });
        }
    };

    const closeProductSearch = () => {
        setShowProductSearch(false);
        setSearchKeyword('');
        setFilteredProducts([]);
        setSelectedProductIds([]);
    };

    const handleSearchFocus = () => {
        // When user focuses on search bar:
        // 1. If products already loaded → show all products
        // 2. If products is empty (first time) → trigger API fetch
        if (products.length > 0) {
            setFilteredProducts(products);
        } else if (!productsLoading && !productsError) {
            // First time: fetch items
            setProductsLoading(true);
            setProductsError(null);
            getItemsForDisplay()
                .then(itemList => {
                    const mapped = (Array.isArray(itemList) ? itemList : [])
                        .filter(Boolean)
                        .map(it => ({
                            id: it.itemId,
                            name: it.itemName ?? '',
                            sku: it.itemCode ?? '',
                            unitPrice: Number(it.purchasePrice ?? 0),
                            uom: it.baseUomName || it.uomName || '',
                            image: it.imageUrl || null,
                            hasCO: !!(it.requiresCo || it.requiresCO),
                            hasCQ: !!(it.requiresCq || it.requiresCQ),
                        }));
                    setProducts(mapped);
                    setFilteredProducts(mapped);
                })
                .catch(err => {
                    console.error('Error fetching items:', err);
                    setProductsError('Không thể tải danh sách vật tư. Vui lòng thử lại.');
                })
                .finally(() => {
                    setProductsLoading(false);
                });
        }
    };

    const addLine = () => {
        openProductSearch();
    };

    const updateLine = (index, field, value) => {
        setLines((prev) => prev.map((l, i) => {
            if (i === index) {
                const updated = { ...l, [field]: value };
                if (field === 'orderedQty' || field === 'unitPrice') {
                    updated.totalPrice = (Number(updated.orderedQty) || 0) * (Number(updated.unitPrice) || 0);
                }
                return updated;
            }
            return l;
        }));
    };

    const removeLine = (index) => {
        setLines((prev) => prev.filter((_, i) => i !== index));
    };

    const toggleLineSelection = (lineId) => {
        setSelectedLineIds(prev => 
            prev.includes(lineId) 
                ? prev.filter(id => id !== lineId)
                : [...prev, lineId]
        );
    };

    const toggleSelectAll = () => {
        if (selectedLineIds.length === lines.length) {
            setSelectedLineIds([]);
        } else {
            setSelectedLineIds(lines.map(line => line.id));
        }
    };

    const removeSelectedLines = () => {
        if (selectedLineIds.length === 0) return;
        setLines(prev => prev.filter(line => !selectedLineIds.includes(line.id)));
        setSelectedLineIds([]);
    };

    const totals = useMemo(() => calculatePOTotals(lines, formData), [lines, formData]);
    const { totalQuantity, subtotal, discountAmount, grandTotal } = totals;

    const validateForm = () => {
        const result = validatePOForm(formData, lines);
        setErrors(result.errors);
        return result.isValid;
    };

    const validateFormDraft = () => {
        const result = validatePOForm(formData, lines, true);
        setErrors(result.errors);
        return result.isValid;
    };

    const handleSaveDraft = async (e) => {
        e.preventDefault();

        if (!validateFormDraft()) {
            showToast('Vui lòng kiểm tra lại thông tin!', 'error');
            return;
        }

        try {
            setSubmitting(true);
            const payload = preparePOPayload(formData, lines, discountAmount, 'DRAFT');
            const res = await createPurchaseOrder(payload);
            let uploadWarning = '';
            if (res?.purchaseOrderId && (quotationFile || contractAppendixFile)) {
                try {
                    await uploadPurchaseOrderAttachments(res.purchaseOrderId, {
                        quotationFile,
                        contractAppendixFile,
                    });
                } catch (uploadError) {
                    const data = uploadError?.response?.data;
                    const message = data?.message || uploadError?.message || 'Không thể tải tệp đính kèm.';
                    uploadWarning = message;
                }
            }
            showToast(
                uploadWarning
                    ? `Tạo đơn mua hàng thành công${res?.poCode ? ` (${res.poCode})` : ''}, nhưng upload file lỗi: ${uploadWarning}`
                    : `Tạo đơn mua hàng thành công${res?.poCode ? ` (${res.poCode})` : ''}.`,
                uploadWarning ? 'warning' : 'success'
            );
            setTimeout(() => navigate('/purchase-orders'), 1500);
        } catch (error) {
            const msg = error?.response?.data?.message ?? error?.message ?? 'Có lỗi xảy ra';
            showToast(msg, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleSubmitForApproval = async (e) => {
        e.preventDefault();

        if (!quotationFile || !contractAppendixFile) {
            showToast('Vui lòng tải lên đủ 2 tệp: File báo giá và Phụ lục hợp đồng trước khi gửi duyệt.', 'error');
            return;
        }

        if (!validateForm()) {
            showToast('Vui lòng kiểm tra lại thông tin!', 'error');
            return;
        }

        try {
            setSubmitting(true);
            const payload = preparePOPayload(formData, lines, discountAmount, 'PENDING_ACC');
            const res = await createPurchaseOrder(payload);
            let uploadWarning = '';
            if (res?.purchaseOrderId && (quotationFile || contractAppendixFile)) {
                try {
                    await uploadPurchaseOrderAttachments(res.purchaseOrderId, {
                        quotationFile,
                        contractAppendixFile,
                    });
                } catch (uploadError) {
                    const data = uploadError?.response?.data;
                    const message = data?.message || uploadError?.message || 'Không thể tải tệp đính kèm.';
                    uploadWarning = message;
                }
            }
            showToast(
                uploadWarning
                    ? `Tạo đơn mua hàng thành công${res?.poCode ? ` (${res.poCode})` : ''}, nhưng upload file lỗi: ${uploadWarning}`
                    : `Tạo đơn mua hàng thành công${res?.poCode ? ` (${res.poCode})` : ''}.`,
                uploadWarning ? 'warning' : 'success'
            );
            setTimeout(() => navigate('/purchase-orders'), 1500);
        } catch (error) {
            const msg = error?.response?.data?.message ?? error?.message ?? 'Có lỗi xảy ra';
            showToast(msg, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancel = () => {
        navigate(-1);
    };

    // Điều kiện cho phép Gửi duyệt
    const canSubmit = useMemo(() => {
        return (
            Boolean(formData.supplierId) &&
            Boolean(formData.warehouseId) &&
            lines.length > 0 &&
            Boolean(quotationFile) &&
            Boolean(contractAppendixFile) &&
            !submitting
        );
    }, [formData.supplierId, formData.warehouseId, lines, quotationFile, contractAppendixFile, submitting]);

    const submitTooltip = !formData.supplierId
        ? 'Vui lòng chọn nhà cung cấp'
        : !formData.warehouseId
        ? 'Vui lòng chọn kho nhận'
        : lines.length === 0
        ? 'Vui lòng thêm ít nhất 1 sản phẩm'
        : !quotationFile
        ? 'Vui lòng tải lên File báo giá'
        : !contractAppendixFile
        ? 'Vui lòng tải lên Phụ lục hợp đồng'
        : '';

    return (
        <div className="create-supplier-page">
            {/* Header */}
            <div className="page-header">
                <div className="page-header-left">
                    <button type="button" onClick={handleCancel} className="back-button">
                        <ArrowLeft size={20} />
                        <span>Quay lại</span>
                    </button>
                </div>
                <div className="page-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Hủy — ghost */}
                    <button
                        type="button"
                        onClick={handleCancel}
                        className="btn btn-cancel"
                        disabled={submitting}
                    >
                        <X size={15} />
                        Hủy
                    </button>

                    {/* Lưu nháp — muted ocean outline */}
                    <button
                        type="button"
                        className="btn btn-draft"
                        disabled={submitting}
                        onClick={handleSaveDraft}
                    >
                        <Save size={15} />
                        Lưu nháp
                    </button>

                    {/* Gửi duyệt — primary with tooltip when disabled */}
                    <Tooltip
                        title={!canSubmit && !submitting ? submitTooltip : ''}
                        arrow
                        placement="top"
                    >
                        <span style={{ display: 'inline-flex' }}>
                            <button
                                type="button"
                                className="btn btn-primary"
                                disabled={!canSubmit}
                                onClick={handleSubmitForApproval}
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
                                        Gửi duyệt
                                    </>
                                )}
                            </button>
                        </span>
                    </Tooltip>
                </div>
            </div>

            {/* Form Card */}
            <div className="form-card">
                <form id="create-po-form" className="form-wrapper">
                    {/* Intro */}
                    <div className="form-card-intro">
                        <h1 className="page-title">Tạo đơn mua hàng</h1>
                        <p className="form-card-required-note">
                            Các trường đánh dấu <span className="required-mark">*</span> là bắt buộc
                        </p>
                    </div>

                    {/* Layout 2 cột: Chi tiết sản phẩm (trái) + Nhân viên (phải) */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px', alignItems: 'start' }}>
                        {/* 1. Chi tiết sản phẩm (Trái) */}
                        <ProductTable
                            lines={lines}
                            selectedLineIds={selectedLineIds}
                            showProductSearch={showProductSearch}
                            setShowProductSearch={setShowProductSearch}
                            searchKeyword={searchKeyword}
                            setSearchKeyword={setSearchKeyword}
                            filteredProducts={filteredProducts}
                            selectedProductIds={selectedProductIds}
                            imageErrors={imageErrors}
                            errors={errors}
                            productsLoading={productsLoading}
                            productsError={productsError}
                            formatCurrency={formatCurrency}
                            isValidImageUrl={isValidImageUrl}
                            handleImageError={handleImageError}
                            handleSelectProduct={handleSelectProduct}
                            toggleProductSelection={toggleProductSelection}
                            addSelectedProducts={addSelectedProducts}
                            handleSearchChange={handleSearchChange}
                            closeProductSearch={closeProductSearch}
                            addLine={addLine}
                            removeLine={removeLine}
                            updateLine={updateLine}
                            removeSelectedLines={removeSelectedLines}
                            toggleLineSelection={toggleLineSelection}
                            toggleSelectAll={toggleSelectAll}
                            getItemsForDisplay={getItemsForDisplay}
                            setProducts={setProducts}
                            setProductsError={setProductsError}
                            setFilteredProducts={setFilteredProducts}
                            products={products}
                        />

                        {/* 2. Nhân viên (Phải) */}
                        <div className="info-section" style={{ margin: 0 }}>
                            <div className="section-header-with-toggle">
                                <h2 className="section-title">Thông tin chung</h2>
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {/* Nhân viên tạo */}
                                <div className="form-field">
                                    <label htmlFor="creatorName" className="form-label">
                                        Nhân viên tạo
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

                                {/* Kho nhận - search select mock */}
                                <div className="form-field">
                                    <label htmlFor="warehouseName" className="form-label">
                                        Kho nhận <span className="required-mark">*</span>
                                    </label>
                                    <div className="input-wrapper" style={{ position: 'relative' }}>
                                        <MapPin className="input-icon" size={16} />
                                        <input
                                            id="warehouseName"
                                            type="text"
                                            name="warehouseName"
                                            value={warehouseQuery || formData.warehouseName}
                                            onChange={(e) => {
                                                setWarehouseQuery(e.target.value);
                                                setWarehouseDropdownOpen(true);
                                            }}
                                            onFocus={() => setWarehouseDropdownOpen(true)}
                                            placeholder="Tìm hoặc chọn kho nhận"
                                            className={`form-input ${errors.warehouseName ? 'error' : ''}`}
                                            autoComplete="off"
                                        />
                                        {warehouseDropdownOpen && (
                                            <ul
                                                className="form-input"
                                                style={{
                                                    position: 'absolute',
                                                    top: '100%',
                                                    left: 0,
                                                    right: 0,
                                                    marginTop: '4px',
                                                    maxHeight: '220px',
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
                                                {filteredWarehouses.length === 0 ? (
                                                    <li
                                                        style={{
                                                            padding: '8px 12px',
                                                            color: '#6b7280',
                                                            fontSize: '14px',
                                                        }}
                                                    >
                                                        Không có kho phù hợp
                                                    </li>
                                                ) : (
                                                    filteredWarehouses.map((wh) => (
                                                        <li
                                                            key={wh.id}
                                                            onClick={() => {
                                                                setFormData((prev) => ({
                                                                    ...prev,
                                                                    warehouseId: wh.id,
                                                                    warehouseName: wh.name,
                                                                }));
                                                                setWarehouseQuery(wh.name);
                                                                setWarehouseDropdownOpen(false);
                                                                if (errors.warehouseName) {
                                                                    setErrors((prev) => ({
                                                                        ...prev,
                                                                        warehouseName: '',
                                                                    }));
                                                                }
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
                                                            {wh.name} ({wh.id})
                                                        </li>
                                                    ))
                                                )}
                                            </ul>
                                        )}
                                    </div>
                                    {errors.warehouseName && (
                                        <span className="error-message">{errors.warehouseName}</span>
                                    )}
                                </div>

                                {/* Ngày dự kiến nhập */}
                                <div className="form-field">
                                    <label htmlFor="expectedReceiptDate" className="form-label">
                                        Ngày nhập dự kiến 
                                    </label>
                                    <div className="input-wrapper">
                                        <Calendar className="input-icon" size={16} />
                                        <input
                                            id="expectedReceiptDate"
                                            type="date"
                                            name="expectedReceiptDate"
                                            value={formData.expectedReceiptDate}
                                            onChange={handleChange}
                                            className={`form-input ${errors.expectedReceiptDate ? 'error' : ''}`}
                                        />
                                    </div>
                                    {errors.expectedReceiptDate && (
                                        <span className="error-message">{errors.expectedReceiptDate}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Layout 2 cột: Nhà cung cấp + Ghi chú + Tổng hợp (trái, cùng chiều ngang với Chi tiết sản phẩm) */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px', alignItems: 'start' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {/* 3. Nhà cung cấp - search select mock + chi tiết NCC */}
                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Nhà cung cấp</h2>
                                </div>
                                <div className="form-field">
                                    <label htmlFor="supplierName" className="form-label">
                                        Nhà cung cấp <span className="required-mark">*</span>
                                    </label>
                                    <div className="input-wrapper" style={{ position: 'relative' }}>
                                        <Building2 className="input-icon" size={16} />
                                        <input
                                            id="supplierName"
                                            type="text"
                                            name="supplierName"
                                            value={supplierQuery || formData.supplierName}
                                            onChange={(e) => {
                                                setSupplierQuery(e.target.value);
                                                setSupplierDropdownOpen(true);
                                            }}
                                            onFocus={() => setSupplierDropdownOpen(true)}
                                            placeholder="Tìm hoặc chọn nhà cung cấp"
                                            className={`form-input ${errors.supplierName ? 'error' : ''}`}
                                            autoComplete="off"
                                        />
                                        {supplierDropdownOpen && (
                                            <ul
                                                className="form-input"
                                                style={{
                                                    position: 'absolute',
                                                    top: '100%',
                                                    left: 0,
                                                    right: 0,
                                                    marginTop: '4px',
                                                    maxHeight: '220px',
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
                                                {filteredSuppliers.length === 0 ? (
                                                    <li
                                                        style={{
                                                            padding: '8px 12px',
                                                            color: '#6b7280',
                                                            fontSize: '14px',
                                                        }}
                                                    >
                                                        Không có nhà cung cấp phù hợp
                                                    </li>
                                                ) : (
            filteredSuppliers.map((sup) => (
                                                        <li
                                                            key={sup.id}
                                                            onClick={() => {
                                                                setFormData((prev) => ({
                                                                    ...prev,
                                                                    supplierId: sup.id,
                                                                    supplierName: sup.name,
                                                                    supplierPhone: sup.phone,
                                                                    supplierEmail: sup.email,
                                                                    supplierTaxCode: sup.taxCode,
                                                                    supplierAddressStreet: sup.addressText || '',
                                                                    supplierAddressWard: sup.ward || '',
                                                                    supplierAddressDistrict: '',
                                                                    supplierAddressProvince: sup.city || '',
                                                                }));
                                                                setSupplierQuery(sup.name);
                                                                setSupplierDropdownOpen(false);
                                                                if (errors.supplierName) {
                                                                    setErrors((prev) => ({
                                                                        ...prev,
                                                                        supplierName: '',
                                                                    }));
                                                                }
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
                                                            {sup.name} ({sup.id})
                                                        </li>
                                                    ))
                                                )}
                                            </ul>
                                        )}
                                    </div>
                                    {errors.supplierName && (
                                        <span className="error-message">{errors.supplierName}</span>
                                    )}
                                </div>

                                {/* Chi tiết nhà cung cấp (mock) */}
                                {formData.supplierId && (
                                    <div
                                        style={{
                                            marginTop: '16px',
                                            padding: '12px 14px',
                                            borderRadius: '10px',
                                            backgroundColor: '#f9fafb',
                                            border: '1px solid #e5e7eb',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 6,
                                            fontSize: 13,
                                            color: '#374151',
                                        }}
                                    >
                                        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>
                                            Chi tiết nhà cung cấp
                                        </div>
                                        <div>
                                            <span style={{ fontWeight: 500 }}>Tên NCC: </span>
                                            <span>{formData.supplierName || '-'}</span>
                                        </div>
                                        <div>
                                            <span style={{ fontWeight: 500 }}>SĐT: </span>
                                            <span>{formData.supplierPhone || '-'}</span>
                                        </div>
                                        <div>
                                            <span style={{ fontWeight: 500 }}>Email: </span>
                                            <span>{formData.supplierEmail || '-'}</span>
                                        </div>
                                        <div>
                                            <span style={{ fontWeight: 500 }}>Mã số thuế: </span>
                                            <span>{formData.supplierTaxCode || '-'}</span>
                                        </div>
                                        <div
                                            style={{
                                                display: 'grid',
                                                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                                                gap: 8,
                                                marginTop: 4,
                                            }}
                                        >
                                            <div>
                                                <div
                                                    style={{
                                                        fontSize: 12,
                                                        color: '#6b7280',
                                                        marginBottom: 2,
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    Tỉnh/Thành phố
                                                </div>
                                                <div
                                                    style={{
                                                        padding: '6px 10px',
                                                        borderRadius: 8,
                                                        border: '1px solid #e5e7eb',
                                                        backgroundColor: '#f9fafb',
                                                        minHeight: 32,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                    }}
                                                >
                                                    {formData.supplierAddressProvince || '—'}
                                                </div>
                                            </div>
                                            <div>
                                                <div
                                                    style={{
                                                        fontSize: 12,
                                                        color: '#6b7280',
                                                        marginBottom: 2,
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    Quận/Huyện
                                                </div>
                                                <div
                                                    style={{
                                                        padding: '6px 10px',
                                                        borderRadius: 8,
                                                        border: '1px solid #e5e7eb',
                                                        backgroundColor: '#f9fafb',
                                                        minHeight: 32,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                    }}
                                                >
                                                    {formData.supplierAddressDistrict || '—'}
                                                </div>
                                            </div>
                                            <div>
                                                <div
                                                    style={{
                                                        fontSize: 12,
                                                        color: '#6b7280',
                                                        marginBottom: 2,
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    Phường/Xã
                                                </div>
                                                <div
                                                    style={{
                                                        padding: '6px 10px',
                                                        borderRadius: 8,
                                                        border: '1px solid #e5e7eb',
                                                        backgroundColor: '#f9fafb',
                                                        minHeight: 32,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                    }}
                                                >
                                                    {formData.supplierAddressWard || '—'}
                                                </div>
                                            </div>
                                            <div>
                                                <div
                                                    style={{
                                                        fontSize: 12,
                                                        color: '#6b7280',
                                                        marginBottom: 2,
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    Địa chỉ cụ thể
                                                </div>
                                                <div
                                                    style={{
                                                        padding: '6px 10px',
                                                        borderRadius: 8,
                                                        border: '1px solid #e5e7eb',
                                                        backgroundColor: '#f9fafb',
                                                        minHeight: 32,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                    }}
                                                >
                                                    {formData.supplierAddressStreet || '—'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* 4. Ghi chú */}
                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Ghi chú</h2>
                                </div>
                                <div className="form-field">
                                    <label htmlFor="justification" className="form-label">
                                        Ghi chú / Lý do đặt hàng
                                    </label>
                                    <textarea
                                        id="justification"
                                        name="justification"
                                        value={formData.justification}
                                        onChange={handleChange}
                                        placeholder="Nhập lý do đặt hàng hoặc ghi chú bổ sung (tối đa 250 ký tự)"
                                        rows={4}
                                        className="form-input"
                                        style={{ resize: 'vertical' }}
                                    />
                                    <div style={{ 
                                        display: 'flex', 
                                        justifyContent: 'flex-end', 
                                        fontSize: '12px', 
                                        color: formData.justification.length >= MAX_JUSTIFICATION_LENGTH ? '#ef4444' : '#6b7280',
                                        marginTop: '4px',
                                        fontWeight: 500
                                    }}>
                                        {formData.justification.length}/{MAX_JUSTIFICATION_LENGTH} ký tự
                                    </div>
                                </div>
                            </div>

                            {/* 5. File/Image đính kèm */}
                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Tệp đính kèm</h2>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <div className="form-field">
                                        <label htmlFor="po-quotation-file" className="form-label">
                                            File báo giá
                                        </label>
                                        <div className="input-wrapper">
                                            <FileSpreadsheet className="input-icon" size={16} />
                                            <input
                                                id="po-quotation-file"
                                                type="file"
                                                className="form-input"
                                                onChange={(e) => setQuotationFile(e.target.files?.[0] || null)}
                                            />
                                        </div>
                                        {quotationFile && (
                                            <div style={{ marginTop: 6, fontSize: 12, color: '#4b5563' }}>
                                                Đã chọn: {quotationFile.name}
                                            </div>
                                        )}
                                    </div>

                                    <div className="form-field">
                                        <label htmlFor="po-contract-appendix-file" className="form-label">
                                            Phụ lục hợp đồng
                                        </label>
                                        <div className="input-wrapper">
                                            <FileText className="input-icon" size={16} />
                                            <input
                                                id="po-contract-appendix-file"
                                                type="file"
                                                className="form-input"
                                                onChange={(e) => setContractAppendixFile(e.target.files?.[0] || null)}
                                            />
                                        </div>
                                        {contractAppendixFile && (
                                            <div style={{ marginTop: 6, fontSize: 12, color: '#4b5563' }}>
                                                Đã chọn: {contractAppendixFile.name}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* 6. Tổng hợp — UI giống ViewPurchaseOrderDetail */}
                            <DiscountSection
                                formData={formData}
                                errors={errors}
                                discountType={formData.discountType}
                                setDiscountType={setDiscountType}
                                subtotal={subtotal}
                                discountAmount={discountAmount}
                                grandTotal={grandTotal}
                                totalQuantity={totalQuantity}
                                formatCurrency={formatCurrency}
                                handleChange={handleChange}
                            />
                        </div>
                        <div />
                    </div>
                </form>
            </div>

            {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}
        </div>
    );
};

export default CreatePurchaseOrder;
