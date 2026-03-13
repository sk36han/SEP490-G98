import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Tooltip from '@mui/material/Tooltip';
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
    ImageIcon
} from 'lucide-react';
import Toast from '../../components/Toast/Toast';
import { useToast } from '../hooks/useToast';
import authService from '../lib/authService';
import { getSuppliers } from '../lib/supplierService';
import { getWarehouseList } from '../lib/warehouseService';
import { getItemsForDisplay } from '../lib/itemService';
import { createPurchaseOrder } from '../lib/purchaseOrderService';
import { getAccountants } from '../lib/userService';
import '../styles/CreateSupplier.css';

const CreatePurchaseOrder = () => {
    const navigate = useNavigate();
    const { toast, showToast, clearToast } = useToast();
    const [submitting, setSubmitting] = useState(false);
    const currentUser = authService.getUser();
    
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
        responsiblePersonId: '',
        responsiblePersonName: '',
        expectedReceiptDate: '',
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

    // Data từ API
    const [suppliers, setSuppliers] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [products, setProducts] = useState([]);
    const [productsLoading, setProductsLoading] = useState(false);
    const [productsError, setProductsError] = useState(null);
    const [accountants, setAccountants] = useState([]);

    const [errors, setErrors] = useState({});

    const [supplierQuery, setSupplierQuery] = useState('');
    const [supplierDropdownOpen, setSupplierDropdownOpen] = useState(false);
    const [employeeQuery, setEmployeeQuery] = useState('');
    const [employeeDropdownOpen, setEmployeeDropdownOpen] = useState(false);
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
                            uom: it.uomName || '',
                            image: it.imageUrl || null,
                        }));
                    setProducts(mappedProducts);
                    setProductsError(null);
                } catch (err) {
                    console.error('Error fetching items:', err);
                    setProductsError('Không thể tải danh sách vật tư');
                } finally {
                    setProductsLoading(false);
                }

                // Accountants (nhân viên kế toán)
                const accountantList = await getAccountants();

                if (!mounted) return;
                setSuppliers(mappedSuppliers);
                setWarehouses(mappedWarehouses);
                setAccountants(accountantList);
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

    const filteredEmployees = useMemo(() => {
        const q = employeeQuery.trim().toLowerCase();
        if (!q) return accountants;
        return accountants.filter((e) =>
            (e.fullName || '').toLowerCase().includes(q) ||
            (e.username || '').toLowerCase().includes(q) ||
            (e.email || '').toLowerCase().includes(q)
        );
    }, [employeeQuery, accountants]);

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

    const _addAdditionalCost = () => {
        setFormData(prev => ({
            ...prev,
            additionalCosts: [
                ...(prev.additionalCosts || []),
                { id: Date.now(), name: '', amount: 0 }
            ]
        }));
    };

    const _removeAdditionalCost = (id) => {
        setFormData(prev => ({
            ...prev,
            additionalCosts: (prev.additionalCosts || []).filter(c => c.id !== id)
        }));
    };

    const _updateAdditionalCost = (id, field, value) => {
        setFormData(prev => ({
            ...prev,
            additionalCosts: (prev.additionalCosts || []).map(c =>
                c.id === id ? { ...c, [field]: field === 'amount' ? (Number(value) || 0) : value } : c
            )
        }));
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
            hasCO: false,
            hasCQ: false,
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
                    hasCO: false,
                    hasCQ: false,
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
                            uom: it.uomName || '',
                            image: it.imageUrl || null,
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
                            uom: it.uomName || '',
                            image: it.imageUrl || null,
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

    const totalQuantity = lines.reduce((sum, line) => sum + (Number(line.orderedQty) || 0), 0);
    const subtotal = lines.reduce((sum, line) => sum + (Number(line.totalPrice) || 0), 0);
    const discountAmount = formData.discountType === 'amount'
        ? (Number(formData.discountAmountFixed) || 0)
        : (subtotal * (Number(formData.discount) || 0)) / 100;
    const totalAdditionalCosts = (formData.additionalCosts || []).reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
    const grandTotal = subtotal - discountAmount + totalAdditionalCosts;

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
    };

    const validateForm = () => {
        const newErrors = {};

        // Validate ngày nhập dự kiến
        if (!formData.expectedReceiptDate) {
            newErrors.expectedReceiptDate = 'Ngày nhập dự kiến là bắt buộc';
        } else {
            const receiptDate = new Date(formData.expectedReceiptDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            receiptDate.setHours(0, 0, 0, 0);

            if (receiptDate < today) {
                newErrors.expectedReceiptDate = 'Ngày nhập dự kiến không được trong quá khứ';
            }
        }

        if (!formData.supplierName.trim()) {
            newErrors.supplierName = 'Nhà cung cấp là bắt buộc';
        }

        if (!formData.warehouseName.trim()) {
            newErrors.warehouseName = 'Kho nhận là bắt buộc';
        }

        if (lines.length === 0) {
            newErrors.lines = 'Vui lòng thêm ít nhất 1 sản phẩm';
        } else {
            const hasInvalidLine = lines.some(line => {
                const itemIdNumber = Number(line.itemId);
                return (
                    !line.itemName.trim() ||
                    !line.itemId ||
                    Number.isNaN(itemIdNumber) ||
                    itemIdNumber <= 0 ||
                    Number(line.orderedQty) <= 0
                );
            });
            
            if (hasInvalidLine) {
                newErrors.lines = 'Vui lòng điền đầy đủ thông tin sản phẩm (chọn vật tư, Tên, Số lượng > 0)';
            }
        }

        if (formData.discountType === 'percent') {
            const v = Number(formData.discount);
            if (isNaN(v) || v < 0 || v > 100) {
                newErrors.discount = 'Chiết khấu (%) phải từ 0 đến 100';
            }
        } else {
            const v = Number(formData.discountAmountFixed);
            if (isNaN(v) || v < 0) {
                newErrors.discountAmountFixed = 'Chiết khấu (số tiền) phải lớn hơn hoặc bằng 0';
            }
        }

        const costs = formData.additionalCosts || [];
        for (let i = 0; i < costs.length; i++) {
            const amount = Number(costs[i].amount) || 0;
            const name = (costs[i].name || '').trim();
            if (amount > 0 && !name) {
                newErrors.additionalCosts = `Dòng chi phí thứ ${i + 1}: nhập tên chi phí khi có số tiền`;
                break;
            }
            if (amount < 0) {
                newErrors.additionalCosts = `Dòng chi phí thứ ${i + 1}: số tiền phải ≥ 0`;
                break;
            }
        }

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
            const supplierId = Number(formData.supplierId);
            const warehouseId = Number(formData.warehouseId);
            const responsibleUserId = formData.responsiblePersonId !== '' && !Number.isNaN(Number(formData.responsiblePersonId))
                ? Number(formData.responsiblePersonId)
                : null;
            const payload = {
                supplierId,
                warehouseId,
                responsibleUserId,
                expectedDeliveryDate: formData.expectedReceiptDate ? String(formData.expectedReceiptDate) : null,
                justification: (formData.justification || '').trim() || null,
                discountAmount: Number(discountAmount) || 0,
                lines: lines.map((l) => ({
                    itemId: Number(l.itemId),
                    orderedQty: Number(l.orderedQty) || 0,
                    unitPrice: Number(l.unitPrice) || 0,
                    note: (l.note || '').trim() || null,
                })),
            };
            const res = await createPurchaseOrder(payload);
            showToast(`Tạo đơn mua hàng thành công${res?.poCode ? ` (${res.poCode})` : ''}.`, 'success');
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

        if (!validateForm()) {
            showToast('Vui lòng kiểm tra lại thông tin!', 'error');
            return;
        }

        try {
            setSubmitting(true);
            const supplierId = Number(formData.supplierId);
            const warehouseId = Number(formData.warehouseId);
            const responsibleUserId = formData.responsiblePersonId !== '' && !Number.isNaN(Number(formData.responsiblePersonId))
                ? Number(formData.responsiblePersonId)
                : null;
            const payload = {
                supplierId,
                warehouseId,
                responsibleUserId,
                expectedDeliveryDate: formData.expectedReceiptDate ? String(formData.expectedReceiptDate) : null,
                justification: (formData.justification || '').trim() || null,
                discountAmount: Number(discountAmount) || 0,
                status: 'PENDING_ACC',
                lines: lines.map((l) => ({
                    itemId: Number(l.itemId),
                    orderedQty: Number(l.orderedQty) || 0,
                    unitPrice: Number(l.unitPrice) || 0,
                    note: (l.note || '').trim() || null,
                })),
            };
            const res = await createPurchaseOrder(payload);
            showToast(`Tạo đơn mua hàng thành công${res?.poCode ? ` (${res.poCode})` : ''}.`, 'success');
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
            !submitting
        );
    }, [formData.supplierId, formData.warehouseId, lines, submitting]);

    const submitTooltip = !formData.supplierId
        ? 'Vui lòng chọn nhà cung cấp'
        : !formData.warehouseId
        ? 'Vui lòng chọn kho nhận'
        : lines.length === 0
        ? 'Vui lòng thêm ít nhất 1 sản phẩm'
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
                        <div className="info-section" style={{ margin: 0, minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
                            <div className="section-header-with-toggle">
                                <h2 className="section-title">Chi tiết vật tư</h2>
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
                                                border: 'none'
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
                                        Thêm vật tư
                                    </button>
                                </div>
                            </div>
                            
                            {errors.lines && (
                                <div className="error-message" style={{ marginBottom: '16px' }}>{errors.lines}</div>
                            )}

                            {/* Search Bar với Animation */}
                            {showProductSearch && (
                                <div style={{
                                    marginBottom: '16px',
                                    animation: 'slideDown 0.3s ease-out',
                                    position: 'relative'
                                }}>
                                    <div style={{ position: 'relative' }}>
                                        <Search 
                                            size={20} 
                                            style={{ 
                                                position: 'absolute', 
                                                left: '12px', 
                                                top: '50%', 
                                                transform: 'translateY(-50%)',
                                                color: '#9ca3af',
                                                zIndex: 1
                                            }} 
                                        />
                                        <input
                                            type="text"
                                            value={searchKeyword}
                                            onChange={handleSearchChange}
                                            onFocus={handleSearchFocus}
                                            placeholder="Tìm kiếm theo tên vật tư..."
                                            autoFocus
                                            style={{
                                                width: '100%',
                                                padding: '12px 44px 12px 44px',
                                                border: '2px solid #2196F3',
                                                borderRadius: '10px',
                                                fontSize: '14px',
                                                outline: 'none',
                                                boxSizing: 'border-box',
                                                boxShadow: '0 0 0 4px rgba(33, 150, 243, 0.1)'
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
                                                zIndex: 1
                                            }}
                                        >
                                            <X size={20} />
                                        </button>
                                    </div>

                                    {/* Dropdown Results - Show when search is open */}
                                    {showProductSearch && (
                                        <div style={{
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
                                            animation: 'fadeIn 0.2s ease-out'
                                        }}>
                                            {/* Header with count */}
                                            <div style={{
                                                padding: '10px 16px',
                                                borderBottom: '1px solid #f3f4f6',
                                                backgroundColor: '#f9fafb',
                                                fontSize: '12px',
                                                color: '#6b7280',
                                                fontWeight: 500
                                            }}>
                                                {productsLoading ? 'Đang tải...' : `${filteredProducts.length} vật tư`}
                                            </div>

                                            {/* Loading State */}
                                            {productsLoading ? (
                                                <div style={{
                                                    padding: '24px',
                                                    textAlign: 'center',
                                                    color: '#9ca3af'
                                                }}>
                                                    <Loader size={24} className="spinner" style={{ margin: '0 auto 8px', animation: 'spin 1s linear infinite' }} />
                                                    <p style={{ margin: 0, fontSize: '13px' }}>Đang tải danh sách vật tư...</p>
                                                </div>
                                            ) : productsError ? (
                                                /* Error State */
                                                <div style={{
                                                    padding: '24px',
                                                    textAlign: 'center'
                                                }}>
                                                    <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#ef4444' }}>{productsError}</p>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            // Trigger reload
                                                            setProducts([]);
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
                                                                            uom: it.uomName || '',
                                                                            image: it.imageUrl || null,
                                                                        }));
                                                                    setProducts(mapped);
                                                                    setFilteredProducts(mapped);
                                                                })
                                                                .catch(err => {
                                                                    setProductsError('Không thể tải danh sách vật tư');
                                                                });
                                                        }}
                                                        style={{
                                                            padding: '8px 16px',
                                                            backgroundColor: '#3b82f6',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: '6px',
                                                            cursor: 'pointer',
                                                            fontSize: '13px',
                                                            fontWeight: 500
                                                        }}
                                                    >
                                                        Thử lại
                                                    </button>
                                                </div>
                                            ) : filteredProducts.length === 0 ? (
                                                /* Empty State */
                                                <div style={{
                                                    padding: '24px',
                                                    textAlign: 'center',
                                                    color: '#9ca3af'
                                                }}>
                                                    <Package size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                                                    <p style={{ margin: 0, fontSize: '13px' }}>
                                                        {searchKeyword ? `Không tìm thấy vật tư nào matching "${searchKeyword}"` : 'Không có vật tư nào trong hệ thống'}
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
                                                                gap: '12px'
                                                            }}
                                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                                        >
                                                            {/* Checkbox */}
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedProductIds.includes(product.id)}
                                                                onChange={(e) => {
                                                                    e.stopPropagation();
                                                                    toggleProductSelection(product.id);
                                                                }}
                                                                style={{ 
                                                                    cursor: 'pointer',
                                                                    width: '16px',
                                                                    height: '16px',
                                                                    flexShrink: 0
                                                                }}
                                                            />
                                                            
                                                            {/* Ảnh sản phẩm hoặc Icon mặc định */}
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
                                                            
                                                            {/* Thông tin sản phẩm */}
                                                            <div 
                                                                style={{ flex: 1, cursor: 'pointer' }}
                                                                onClick={() => handleSelectProduct(product)}
                                                            >
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '4px' }}>
                                                                    <span style={{ fontSize: '14px', fontWeight: 500, color: '#1f2937' }}>
                                                                        {product.name}
                                                                    </span>
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
                                                    
                                                    {/* Nút thêm sản phẩm đã chọn */}
                                                    {selectedProductIds.length > 0 && (
                                                        <div style={{
                                                            padding: '12px 16px',
                                                            borderTop: '2px solid #e5e7eb',
                                                            backgroundColor: '#f9fafb',
                                                            position: 'sticky',
                                                            bottom: 0
                                                        }}>
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
                                                                    justifyContent: 'center'
                                                                }}
                                                            >
                                                                <Plus size={16} />
                                                                Thêm {selectedProductIds.length} vật tư
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
                                <div style={{ 
                                    flex: 1, 
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    justifyContent: 'center', 
                                    alignItems: 'center',
                                    gap: '16px',
                                    padding: '60px 20px',
                                    color: '#9ca3af'
                                }}>
                                    <Package size={64} strokeWidth={1.5} />
                                    <p style={{ fontSize: '16px', fontWeight: 500, margin: 0 }}>Chưa có vật tư nào</p>
                                    <p style={{ fontSize: '14px', margin: 0 }}>Nhấn "Thêm vật tư" để bắt đầu</p>
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
                                                <th style={{ width: '40px', textAlign: 'center' }}>STT</th>
                                                <th style={{ textAlign: 'left' }}>Tên vật tư *</th>
                                                <th style={{ width: '100px', textAlign: 'right' }}>SL đặt *</th>
                                                <th style={{ width: '120px', textAlign: 'center' }}>Đơn giá</th>
                                                <th style={{ width: '140px', textAlign: 'center' }}>Thành tiền</th>
                                                <th style={{ width: '80px', textAlign: 'center' }} title="Chứng chỉ xuất xứ (CO)">CO</th>
                                                <th style={{ width: '80px', textAlign: 'center' }} title="Chứng chỉ chất lượng (CQ)">CQ</th>
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
                                                    <td>
                                                        <input
                                                            type="number"
                                                            value={line.orderedQty}
                                                            onChange={(e) => updateLine(index, 'orderedQty', Number(e.target.value))}
                                                            min="1"
                                                            className="form-input"
                                                            style={{ textAlign: 'center' }}
                                                        />
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="number"
                                                            value={line.unitPrice}
                                                            onChange={(e) => updateLine(index, 'unitPrice', Number(e.target.value))}
                                                            min="0"
                                                            className="form-input"
                                                            style={{ textAlign: 'center' }}
                                                            placeholder="0"
                                                        />
                                                    </td>
                                                    <td style={{ textAlign: 'center', fontWeight: 600, color: '#2196F3' }}>
                                                        {formatCurrency(line.totalPrice)}
                                                    </td>
                                                    <td style={{ textAlign: 'center', verticalAlign: 'middle' }} title="Chứng chỉ xuất xứ (CO)">
                                                        <input
                                                            type="checkbox"
                                                            checked={!!line.hasCO}
                                                            readOnly
                                                            disabled
                                                            style={{ width: 18, height: 18, cursor: 'default', margin: 0 }}
                                                        />
                                                    </td>
                                                    <td style={{ textAlign: 'center', verticalAlign: 'middle' }} title="Chứng chỉ chất lượng (CQ)">
                                                        <input
                                                            type="checkbox"
                                                            checked={!!line.hasCQ}
                                                            readOnly
                                                            disabled
                                                            style={{ width: 18, height: 18, cursor: 'default', margin: 0 }}
                                                        />
                                                    </td>
                                                    <td
                                                        style={{
                                                            textAlign: 'center',
                                                            verticalAlign: 'middle',
                                                        }}
                                                    >
                                                        <div
                                                            style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                gap: 8,
                                                            }}
                                                        >
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
                                                            <button
                                                                type="button"
                                                                onClick={() => removeLine(index)}
                                                                className="btn-icon-only"
                                                                style={{ color: '#ef4444' }}
                                                                title="Xóa dòng"
                                                            >
                                                                <Trash2 size={18} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

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

                                {/* Nhân viên phụ trách - search select mock */}
                                <div className="form-field">
                                    <label htmlFor="responsiblePersonName" className="form-label">
                                        Nhân viên phụ trách
                                    </label>
                                    <div className="input-wrapper" style={{ position: 'relative' }}>
                                        <User className="input-icon" size={16} />
                                        <input
                                            id="responsiblePersonName"
                                            type="text"
                                            name="responsiblePersonName"
                                            value={employeeQuery || formData.responsiblePersonName}
                                            onChange={(e) => {
                                                setEmployeeQuery(e.target.value);
                                                setEmployeeDropdownOpen(true);
                                            }}
                                            onFocus={() => setEmployeeDropdownOpen(true)}
                                            placeholder="Tìm hoặc chọn nhân viên"
                                            className="form-input"
                                            autoComplete="off"
                                        />
                                        {employeeDropdownOpen && (
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
                                                {filteredEmployees.length === 0 ? (
                                                    <li
                                                        style={{
                                                            padding: '8px 12px',
                                                            color: '#6b7280',
                                                            fontSize: '14px',
                                                        }}
                                                    >
                                                        Không có nhân viên phù hợp
                                                    </li>
                                                ) : (
                                                    filteredEmployees.map((emp) => (
                                                        <li
                                                            key={emp.username || emp.email || emp.fullName}
                                                            onClick={() => {
                                                                setFormData((prev) => ({
                                                                    ...prev,
                                                                    responsiblePersonId: emp.username || emp.email || '',
                                                                    responsiblePersonName: emp.fullName || emp.username || emp.email || '',
                                                                }));
                                                                setEmployeeQuery(emp.fullName || emp.username || emp.email || '');
                                                                setEmployeeDropdownOpen(false);
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
                                                            {emp.fullName || emp.username || emp.email}
                                                        </li>
                                                    ))
                                                )}
                                            </ul>
                                        )}
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
                            // Map theo dữ liệu thật từ API: Address + City + Ward
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

                            {/* 5. Tổng hợp — UI giống ViewPurchaseOrderDetail */}
                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Tổng hợp đơn hàng</h2>
                                </div>
                                
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
                                                        className={`form-input ${errors.discount ? 'error' : ''}`}
                                                        placeholder="0–100"
                                                    />
                                                ) : (
                                                    <input
                                                        type="number"
                                                        name="discountAmountFixed"
                                                        value={formData.discountAmountFixed || ''}
                                                        onChange={handleChange}
                                                        min="0"
                                                        className={`form-input ${errors.discountAmountFixed ? 'error' : ''}`}
                                                        placeholder="Nhập số tiền (VND)"
                                                    />
                                                )}
                                                {errors.discount && (
                                                    <span className="error-message">{errors.discount}</span>
                                                )}
                                                {errors.discountAmountFixed && (
                                                    <span className="error-message">{errors.discountAmountFixed}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="form-field span-2" style={{ gridColumn: '1 / -1' }}>
                                        <div style={{ fontSize: '13px', color: '#666' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span style={{ fontWeight: 600 }}>Chiết khấu:</span>
                                                <span style={{ color: '#ef4444' }}>- {formatCurrency(discountAmount)}</span>
                                            </div>
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

export default CreatePurchaseOrder;
