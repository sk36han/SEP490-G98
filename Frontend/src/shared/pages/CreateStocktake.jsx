import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Plus,
    X,
    Loader,
    Save,
    Send,
    Warehouse,
    Package,
    Calendar,
    User,
    Trash2,
    Search,
    ImageIcon,
    CheckCircle,
} from 'lucide-react';
import Toast from '../../components/Toast/Toast';
import { useToast } from '../hooks/useToast';
import authService from '../lib/authService';
import '../styles/CreateSupplier.css';

// Mock data for warehouses
const MOCK_WAREHOUSES = [
    { id: 1, code: 'WH-HCM', name: 'Kho HCM' },
    { id: 2, code: 'WH-HN', name: 'Kho Hà Nội' },
    { id: 3, code: 'WH-DN', name: 'Kho Đà Nẵng' },
];

// Mock data for items
const MOCK_ITEMS = [
    { id: 1, code: 'ITEM-001', name: 'Vật tư A', uom: 'Cái', image: null, systemQty: 150 },
    { id: 2, code: 'ITEM-002', name: 'Vật tư B', uom: 'Cái', image: null, systemQty: 85 },
    { id: 3, code: 'ITEM-003', name: 'Vật tư C', uom: 'Kg', image: null, systemQty: 200 },
    { id: 4, code: 'ITEM-004', name: 'Vật tư D', uom: 'Thùng', image: null, systemQty: 50 },
    { id: 5, code: 'ITEM-005', name: 'Vật tư E', uom: 'Cái', image: null, systemQty: 120 },
];

const MODE_OPTIONS = [
    { value: 'PERIODIC', label: 'Định kỳ' },
    { value: 'ADHOC', label: 'Đột xuất' },
];

const MAX_NOTE_LENGTH = 250;

const CreateStocktake = () => {
    const navigate = useNavigate();
    const { toast, showToast, clearToast } = useToast();
    const [submitting, setSubmitting] = useState(false);
    const currentUser = authService.getUser();

    // Form data
    const [formData, setFormData] = useState({
        warehouseId: '',
        warehouseName: '',
        mode: '',
        modeLabel: '',
        plannedAt: '',
        note: '',
        creatorName: currentUser?.fullName || currentUser?.FullName || 'Người dùng hiện tại',
    });

    // Lines data
    const [lines, setLines] = useState([]);
    const [selectedLineIds, setSelectedLineIds] = useState([]);

    // Variance filter state
    const [varianceFilter, setVarianceFilter] = useState('all'); // 'all' | 'negative' | 'positive' | 'sufficient'
    const [lineSearchKeyword, setLineSearchKeyword] = useState('');
    const [pendingMarkSufficient, setPendingMarkSufficient] = useState(false);

    // Product search - checkbox select
    const [showProductSearch, setShowProductSearch] = useState(false);
    const [searchKeyword, setSearchKeyword] = useState('');
    const [products] = useState(MOCK_ITEMS);
    const [filteredProducts, setFilteredProducts] = useState(MOCK_ITEMS);
    const [selectedProductIds, setSelectedProductIds] = useState([]);

    // Dropdown states
    const [warehouseQuery, setWarehouseQuery] = useState('');
    const [warehouseDropdownOpen, setWarehouseDropdownOpen] = useState(false);
    const [modeDropdownOpen, setModeDropdownOpen] = useState(false);

    const [errors, setErrors] = useState({});

    // Filtered data
    const filteredWarehouses = useMemo(() => {
        const q = warehouseQuery.trim().toLowerCase();
        if (!q) return MOCK_WAREHOUSES;
        return MOCK_WAREHOUSES.filter(w =>
            w.name.toLowerCase().includes(q) || w.code.toLowerCase().includes(q)
        );
    }, [warehouseQuery]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        // Giới hạn 250 ký tự cho trường note
        if (name === 'note' && value.length > MAX_NOTE_LENGTH) {
            return;
        }
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleWarehouseSelect = (warehouse) => {
        setFormData(prev => ({
            ...prev,
            warehouseId: warehouse.id,
            warehouseName: warehouse.name,
        }));
        setWarehouseQuery('');
        setWarehouseDropdownOpen(false);
        if (errors.warehouseId) {
            setErrors(prev => ({ ...prev, warehouseId: '' }));
        }

        // Auto-import all items from the selected warehouse
        const newLines = products.map(product => ({
            id: Date.now() + Math.random(),
            itemId: product.id,
            itemName: product.name,
            itemCode: product.code,
            itemImage: product.image,
            uom: product.uom,
            systemQty: product.systemQty || 0,
            countedQty: '',
            variance: '',
            note: ''
        }));

        setLines(newLines);
        showToast(`Đã tự động thêm ${newLines.length} vật tư từ kho ${warehouse.name}`, 'success');
    };

    const handleModeSelect = (mode) => {
        setFormData(prev => ({
            ...prev,
            mode: mode.value,
            modeLabel: mode.label,
        }));
        setModeDropdownOpen(false);
        if (errors.mode) {
            setErrors(prev => ({ ...prev, mode: '' }));
        }
    };

    // Product search handlers
    const openProductSearch = () => {
        setShowProductSearch(true);
        setSearchKeyword('');
        setFilteredProducts(products);
    };

    const closeProductSearch = () => {
        setShowProductSearch(false);
        setSearchKeyword('');
    };

    const handleSearchChange = (e) => {
        const keyword = e.target.value;
        setSearchKeyword(keyword);

        if (keyword.trim() === '') {
            setFilteredProducts(products);
            return;
        }

        const filtered = products.filter(product =>
            (product.name || '').toLowerCase().includes(keyword.toLowerCase()) ||
            (product.code || '').toLowerCase().includes(keyword.toLowerCase())
        );
        setFilteredProducts(filtered);
    };

    // Checkbox selection for products
    const toggleProductSelection = (productId) => {
        setSelectedProductIds(prev =>
            prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]
        );
    };

    const toggleSelectAllProducts = () => {
        if (selectedProductIds.length === filteredProducts.length) {
            setSelectedProductIds([]);
        } else {
            setSelectedProductIds(filteredProducts.map(p => p.id));
        }
    };

    const handleAddSelectedProducts = () => {
        if (selectedProductIds.length === 0) {
            showToast('Vui lòng chọn ít nhất 1 vật tư!', 'warning');
            return;
        }

        const productsToAdd = products.filter(p => selectedProductIds.includes(p.id));
        const newLines = [];
        const existingItemIds = lines.map(l => l.itemId);

        productsToAdd.forEach(product => {
            if (existingItemIds.includes(product.id)) {
                return;
            }
            newLines.push({
                id: Date.now() + Math.random(),
                itemId: product.id,
                itemName: product.name,
                itemCode: product.code,
                itemImage: product.image,
                uom: product.uom,
                systemQty: product.systemQty || 0,
                countedQty: '',
                varianceQty: '',
                note: ''
            });
        });

        if (newLines.length > 0) {
            setLines(prev => [...prev, ...newLines]);
            showToast(`Đã thêm ${newLines.length} vật tư vào danh sách`, 'success');
        }

        setSelectedProductIds([]);
        setShowProductSearch(false);
        setSearchKeyword('');
    };


    const updateLine = (lineId, field, value) => {
        setLines(prev => prev.map(line => {
            if (line.id !== lineId) return line;
            const updated = { ...line, [field]: value };

            // Auto calculate variance
            if (field === 'systemQty' || field === 'countedQty') {
                const sysQty = parseFloat(updated.systemQty) || 0;
                const cntQty = parseFloat(updated.countedQty) || 0;
                updated.varianceQty = cntQty - sysQty;
            }

            return updated;
        }));
    };

    const removeLine = (lineId) => {
        setLines(prev => prev.filter(line => line.id !== lineId));
        setSelectedLineIds(prev => prev.filter(id => id !== lineId));
    };

    const toggleLineSelection = (lineId) => {
        setSelectedLineIds(prev =>
            prev.includes(lineId) ? prev.filter(id => id !== lineId) : [...prev, lineId]
        );
    };

    const toggleSelectAll = () => {
        const emptyIds = filteredLines.filter(l => l.countedQty === '' || l.countedQty === null || l.countedQty === undefined).map(l => l.id);
        if (selectedLineIds.length === emptyIds.length && emptyIds.every(id => selectedLineIds.includes(id))) {
            setSelectedLineIds([]);
        } else {
            setSelectedLineIds(emptyIds);
        }
    };

    const handleMarkAllSufficient = () => {
        if (selectedLineIds.length === 0) return;
        setPendingMarkSufficient(true);
    };

    const confirmMarkSufficient = () => {
        setLines(prev => prev.map(line => {
            if (!selectedLineIds.includes(line.id)) return line;
            return { ...line, countedQty: line.systemQty, varianceQty: 0 };
        }));
        setSelectedLineIds([]);
        setPendingMarkSufficient(false);
    };

    const cancelMarkSufficient = () => {
        setPendingMarkSufficient(false);
    };

    const removeSelectedLines = () => {
        if (selectedLineIds.length === 0) return;
        setLines(prev => prev.filter(line => !selectedLineIds.includes(line.id)));
        setSelectedLineIds([]);
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.warehouseId) {
            newErrors.warehouseId = 'Kho là bắt buộc';
        }

        if (!formData.mode) {
            newErrors.mode = 'Hình thức là bắt buộc';
        }

        if (!formData.plannedAt) {
            newErrors.plannedAt = 'Ngày dự kiến là bắt buộc';
        }

        if (lines.length === 0) {
            newErrors.lines = 'Vui lòng thêm ít nhất 1 vật tư';
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

            const payload = {
                warehouseId: formData.warehouseId,
                mode: formData.mode,
                plannedAt: formData.plannedAt,
                note: formData.note || null,
                lines: lines.map(line => ({
                    itemId: line.itemId,
                    systemQtySnapshot: parseFloat(line.systemQty) || 0,
                    countedQty: line.countedQty ? parseFloat(line.countedQty) : null,
                    varianceQty: line.varianceQty || 0,
                    note: line.note || null,
                })),
            };

            console.log('Creating stocktake (draft):', payload);
            await new Promise(resolve => setTimeout(resolve, 1000));

            showToast('Tạo phiếu kiểm kê thành công!', 'success');
            setTimeout(() => navigate('/inventory/stocktakes'), 1500);
        } catch (error) {
            console.error('Error:', error);
            showToast('Có lỗi xảy ra khi tạo phiếu kiểm kê', 'error');
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

            const payload = {
                warehouseId: formData.warehouseId,
                mode: formData.mode,
                plannedAt: formData.plannedAt,
                note: formData.note || null,
                status: 'PENDING_APPROVAL',
                lines: lines.map(line => ({
                    itemId: line.itemId,
                    systemQtySnapshot: parseFloat(line.systemQty) || 0,
                    countedQty: line.countedQty ? parseFloat(line.countedQty) : null,
                    varianceQty: line.varianceQty || 0,
                    note: line.note || null,
                })),
            };

            console.log('Creating stocktake (for approval):', payload);
            await new Promise(resolve => setTimeout(resolve, 1000));

            showToast('Tạo phiếu kiểm kê thành công!', 'success');
            setTimeout(() => navigate('/inventory/stocktakes'), 1500);
        } catch (error) {
            console.error('Error:', error);
            showToast('Có lỗi xảy ra khi tạo phiếu kiểm kê', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancel = () => {
        navigate(-1);
    };

    // Filtered lines based on variance filter and search
    const filteredLines = useMemo(() => {
        let result = lines || [];

        // Apply variance filter
        if (varianceFilter === 'negative') {
            result = result.filter(l => l.varianceQty < 0);
        } else if (varianceFilter === 'positive') {
            result = result.filter(l => l.varianceQty > 0);
        } else if (varianceFilter === 'sufficient') {
            result = result.filter(l => l.countedQty !== null && l.countedQty !== undefined && l.countedQty !== '' && l.varianceQty === 0);
        }

        // Apply search filter
        if (lineSearchKeyword.trim()) {
            const kw = lineSearchKeyword.toLowerCase();
            result = result.filter(line =>
                line.itemName?.toLowerCase().includes(kw) ||
                line.itemCode?.toLowerCase().includes(kw)
            );
        }

        // Sort: selected first, then Thiếu -> Thừa -> Đủ -> Null
        result = [...result].sort((a, b) => {
            const aSelected = selectedLineIds.includes(a.id);
            const bSelected = selectedLineIds.includes(b.id);
            if (aSelected && !bSelected) return -1;
            if (!aSelected && bSelected) return 1;

            const getSortOrder = (line) => {
                const hasValue = line.countedQty !== null && line.countedQty !== undefined && line.countedQty !== '';
                if (!hasValue) return 4;
                const v = line.varianceQty || 0;
                if (v === 0) return 3;
                if (v < 0) return 1;
                return 2;
            };

            const orderA = getSortOrder(a);
            const orderB = getSortOrder(b);
            if (orderA !== orderB) return orderA - orderB;

            const vA = a.varianceQty || 0;
            const vB = b.varianceQty || 0;
            return vA - vB;
        });

        return result;
    }, [lines, varianceFilter, lineSearchKeyword, selectedLineIds]);

    // Calculate summary
    const summary = useMemo(() => {
        if (!lines || lines.length === 0) {
            return { totalItems: 0, totalSystemQty: 0, totalCountedQty: 0, totalVariance: 0, totalCounted: 0 };
        }

        const hasValue = (val) => val !== null && val !== undefined && val !== '';

        const totalSystemQty = lines.reduce((sum, line) => sum + (line.systemQty || 0), 0);
        const countedLines = lines.filter(l => hasValue(l.countedQty));
        const totalCountedQty = countedLines.reduce((sum, line) => sum + (parseFloat(line.countedQty) || 0), 0);
        const totalVariance = countedLines.reduce((sum, line) => sum + (line.varianceQty || 0), 0);

        return {
            totalItems: lines.length,
            totalSystemQty,
            totalCountedQty,
            totalVariance,
            totalCounted: countedLines.length
        };
    }, [lines]);

    // Validation for submit button
    const canSubmit = useMemo(() => {
        return (
            Boolean(formData.warehouseId) &&
            Boolean(formData.mode) &&
            Boolean(formData.plannedAt) &&
            lines.length > 0 &&
            !submitting
        );
    }, [formData, lines, submitting]);

    const isValidImageUrl = (url) => {
        if (!url || typeof url !== 'string') return false;
        try {
            const urlObj = new URL(url);
            return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
        } catch {
            return false;
        }
    };

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
                    <button type="button" onClick={handleCancel} className="btn btn-cancel" disabled={submitting}>
                        <X size={15} />
                        Hủy
                    </button>
                    <button type="button" className="btn btn-draft" disabled={submitting} onClick={handleSaveDraft}>
                        <Save size={15} />
                        Lưu nháp
                    </button>
                    <button type="button" className="btn btn-primary" disabled={!canSubmit} onClick={handleSubmitForApproval}>
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
                </div>
            </div>

            {/* Form Card */}
            <div className="form-card">
                <form className="form-wrapper">
                    {/* Intro */}
                    <div className="form-card-intro">
                        <h1 className="page-title">Tạo phiếu kiểm kê kho</h1>
                        <p className="form-card-required-note">
                            Các trường đánh dấu <span className="required-mark">*</span> là bắt buộc
                        </p>
                    </div>

                    {/* Layout 2 cột: Line items (trái) + Thông tin chung (phải) */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px', alignItems: 'start' }}>
                        {/* Trái: Danh sách vật tư + Ghi chú */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {/* 1. Danh sách vật tư */}
                            <div className="info-section" style={{ margin: 0, display: 'flex', flexDirection: 'column', minHeight: '600px' }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Danh sách vật tư kiểm kê</h2>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        {selectedLineIds.length > 0 && !pendingMarkSufficient && (
                                            <button type="button" onClick={handleMarkAllSufficient} className="btn btn-sm btn-card-text" style={{ fontSize: '12px', height: '32px', padding: '0 12px' }} title="Đánh dấu tất cả những sản phẩm chưa điền.">
                                                <CheckCircle size={14} />
                                                Đánh dấu tất cả là đã đủ
                                            </button>
                                        )}
                                        {pendingMarkSufficient && (
                                            <>
                                                <button type="button" onClick={cancelMarkSufficient} className="btn btn-sm btn-card-text" style={{ fontSize: '12px', height: '32px', padding: '0 12px' }}>
                                                    Hủy
                                                </button>
                                                <button type="button" onClick={confirmMarkSufficient} className="btn btn-sm" style={{ fontSize: '12px', height: '32px', padding: '0 12px', backgroundColor: '#16a34a', color: 'white', border: 'none' }}>
                                                    Xác nhận
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Variance Filter + Search Row */}
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
                                    {/* Search Input */}
                                    <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '180px' }}>
                                        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
                                        <input
                                            type="text"
                                            value={lineSearchKeyword}
                                            onChange={(e) => setLineSearchKeyword(e.target.value)}
                                            placeholder="Tìm vật tư theo tên, mã..."
                                            className="form-input line-search-input"
                                        />
                                        {lineSearchKeyword && (
                                            <button
                                                type="button"
                                                onClick={() => setLineSearchKeyword('')}
                                                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center', color: '#9ca3af' }}
                                            >
                                                <X size={16} />
                                            </button>
                                        )}
                                    </div>

                                    {/* Variance Filter Chips */}
                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                                        <button
                                            type="button"
                                            onClick={() => setVarianceFilter('all')}
                                            className={`variance-chip ${varianceFilter === 'all' ? 'active' : ''}`}
                                            data-variance="all"
                                        >
                                            Tất cả
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setVarianceFilter('negative')}
                                            className={`variance-chip ${varianceFilter === 'negative' ? 'active' : ''}`}
                                            data-variance="negative"
                                        >
                                            Thiếu
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setVarianceFilter('positive')}
                                            className={`variance-chip ${varianceFilter === 'positive' ? 'active' : ''}`}
                                            data-variance="positive"
                                        >
                                            Thừa
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setVarianceFilter('sufficient')}
                                            className={`variance-chip ${varianceFilter === 'sufficient' ? 'active' : ''}`}
                                            data-variance="sufficient"
                                        >
                                            Đủ
                                        </button>
                                    </div>
                                </div>

                                {errors.lines && (
                                    <div className="error-message" style={{ marginBottom: '16px' }}>{errors.lines}</div>
                                )}

                                {/* Empty state when no warehouse selected */}
                                {!formData.warehouseId && lines.length === 0 && (
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '16px', padding: '60px 20px', color: '#9ca3af' }}>
                                        <Package size={64} strokeWidth={1.5} />
                                        <p style={{ fontSize: '16px', fontWeight: 500, margin: 0 }}>Vui lòng chọn kho cần kiểm kê</p>
                                        <p style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: '#ef4444' }}>Chọn kho ở bên phải để tự động tải vật tư</p>
                                    </div>
                                )}

                                {/* Empty state - no lines */}
                                {(formData.warehouseId && lines.length === 0) && (
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '16px', padding: '60px 20px', color: '#9ca3af' }}>
                                        <Package size={64} strokeWidth={1.5} />
                                        <p style={{ fontSize: '16px', fontWeight: 500, margin: 0 }}>Chưa có vật tư nào</p>
                                    </div>
                                )}

                                {/* Lines table */}
                                {lines.length > 0 && (
                                    <div className="table-container" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                                        <table className="product-table">
                                            <thead>
                                                <tr>
                                                    <th style={{ width: '60px', textAlign: 'center' }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedLineIds.length === filteredLines.length && filteredLines.length > 0}
                                                            onChange={toggleSelectAll}
                                                            style={{ cursor: 'pointer' }}
                                                            title="Đánh dấu tất cả những sản phẩm chưa điền."
                                                        />
                                                    </th>
                                                    <th style={{ width: '40px', textAlign: 'center' }}>STT</th>
                                                    <th style={{ textAlign: 'left' }}>Vật tư</th>
                                                    <th style={{ width: '100px', textAlign: 'right' }}>SL hệ thống</th>
                                                    <th style={{ width: '100px', textAlign: 'right' }}>SL đã kiểm kê</th>
                                                    <th style={{ width: '80px', textAlign: 'right' }}>Chênh lệch</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredLines.map((line, index) => (
                                                    <tr key={line.id}>
                                                        <td style={{ textAlign: 'center' }}>
                                                            <input type="checkbox" checked={selectedLineIds.includes(line.id)} onChange={() => toggleLineSelection(line.id)} style={{ cursor: 'pointer' }} />
                                                        </td>
                                                        <td style={{ textAlign: 'center' }}>{index + 1}</td>
                                                        <td>
                                                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                                                {isValidImageUrl(line.itemImage) ? (
                                                                    <img src={line.itemImage} alt={line.itemName} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #e5e7eb', flexShrink: 0 }} />
                                                                ) : (
                                                                    <div style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', border: '1px solid #e5e7eb', backgroundColor: '#f3f4f6', flexShrink: 0 }}>
                                                                        <ImageIcon size={20} color="#9ca3af" />
                                                                    </div>
                                                                )}
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                                    <a
                                                                        href="#"
                                                                        onClick={(e) => {
                                                                            e.preventDefault();
                                                                            navigate(`/items/${line.itemId}`);
                                                                        }}
                                                                        style={{
                                                                            color: '#2196F3',
                                                                            textDecoration: 'none',
                                                                            fontSize: 14,
                                                                            fontWeight: 500,
                                                                        }}
                                                                        onMouseEnter={(e) => {
                                                                            e.target.style.textDecoration = 'underline';
                                                                        }}
                                                                        onMouseLeave={(e) => {
                                                                            e.target.style.textDecoration = 'none';
                                                                        }}
                                                                    >
                                                                        {line.itemName}
                                                                    </a>
                                                                    <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>
                                                                        Mã: {line.itemCode} • ĐVT: {line.uom}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <div style={{ textAlign: 'right', paddingRight: '8px', fontWeight: 500, color: '#374151' }}>
                                                                {line.systemQty || 0}
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <input type="number" value={line.countedQty ?? ''} onChange={(e) => updateLine(line.id, 'countedQty', e.target.value)} className="form-input" style={{ textAlign: 'right', fontSize: '13px', width: '100%' }} placeholder="0" />
                                                        </td>
                                                        <td style={{ textAlign: 'right', fontWeight: 600, color: (line.countedQty === null || line.countedQty === undefined || line.countedQty === '') ? '#9ca3af' : line.varianceQty > 0 ? '#2196F3' : line.varianceQty < 0 ? '#dc2626' : '#16a34a' }}>
                                                            {line.countedQty === null || line.countedQty === undefined || line.countedQty === '' ? '-' : line.varianceQty || 0}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            {/* 2. Ghi chú */}
                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Ghi chú</h2>
                                </div>
                                <div className="form-field">
                                    <textarea name="note" value={formData.note} onChange={handleChange} className="form-textarea" rows={4} placeholder="Nhập ghi chú (nếu có)" style={{ width: '100%', minHeight: '100px' }} />
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px', fontSize: '12px', color: formData.note.length >= MAX_NOTE_LENGTH ? '#ef4444' : '#6b7280' }}>
                                        {formData.note.length}/{MAX_NOTE_LENGTH} ký tự
                                    </div>
                                </div>
                            </div>

                            {/* 3. Tổng kết */}
                            {lines.length > 0 && (
                                <div className="info-section" style={{ margin: 0 }}>
                                    <div className="section-header-with-toggle">
                                        <h2 className="section-title">Tổng kết phiếu kiểm kê kho</h2>
                                    </div>
                                    <div style={{ padding: '20px', backgroundColor: '#f0f9ff', borderRadius: '12px', borderLeft: '4px solid #2196F3' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <span style={{ color: '#64748b' }}>Tổng số vật tư:</span>
                                            <span style={{ fontWeight: 600 }}>{summary.totalItems}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <span style={{ color: '#64748b' }}>Đã kiểm kê:</span>
                                            <span style={{ fontWeight: 600 }}>{summary.totalCounted} / {summary.totalItems}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <span style={{ color: '#64748b' }}>Tổng số lượng hệ thống:</span>
                                            <span style={{ fontWeight: 600 }}>{summary.totalSystemQty}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <span style={{ color: '#64748b' }}>Tổng số lượng kiểm kê:</span>
                                            <span style={{ fontWeight: 600 }}>{summary.totalCountedQty}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #d1d5db' }}>
                                            <span style={{ fontSize: '18px', fontWeight: 700, color: summary.totalVariance > 0 ? '#2196F3' : summary.totalVariance < 0 ? '#dc2626' : '#16a34a' }}>
                                                Tổng chênh lệch:
                                            </span>
                                            <span style={{ fontSize: '24px', fontWeight: 700, color: summary.totalVariance > 0 ? '#2196F3' : summary.totalVariance < 0 ? '#dc2626' : '#16a34a' }}>
                                                {summary.totalVariance > 0 ? '+' : ''}{summary.totalVariance}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Phải: Thông tin chung */}
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
                                        <input type="text" value={formData.creatorName} readOnly className="form-input" style={{ backgroundColor: '#f5f5f5' }} />
                                    </div>
                                </div>

                                {/* Kho */}
                                <div className="form-field">
                                    <label className="form-label">Kho <span className="required-mark">*</span></label>
                                    <div className="input-wrapper" style={{ position: 'relative' }}>
                                        <Warehouse className="input-icon" size={16} />
                                        <input type="text" value={warehouseQuery || formData.warehouseName} onChange={(e) => { setWarehouseQuery(e.target.value); setWarehouseDropdownOpen(true); }} onFocus={() => setWarehouseDropdownOpen(true)} placeholder="Tìm hoặc chọn kho" className={`form-input ${errors.warehouseId ? 'error' : ''}`} autoComplete="off" />
                                        {warehouseDropdownOpen && (
                                            <ul className="form-input" style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', maxHeight: '220px', overflowY: 'auto', listStyle: 'none', padding: '8px 0', zIndex: 10, backgroundColor: '#fff', border: '1px solid #d1d5db', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                                                {filteredWarehouses.length === 0 ? (
                                                    <li style={{ padding: '8px 12px', color: '#6b7280', fontSize: '14px' }}>Không có kho phù hợp</li>
                                                ) : (
                                                    filteredWarehouses.map(wh => (
                                                        <li key={wh.id} onClick={() => handleWarehouseSelect(wh)} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '14px' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                                                            {wh.name} ({wh.code})
                                                        </li>
                                                    ))
                                                )}
                                            </ul>
                                        )}
                                    </div>
                                    {errors.warehouseId && <span className="error-message">{errors.warehouseId}</span>}
                                </div>

                                {/* Hình thức */}
                                <div className="form-field">
                                    <label className="form-label">Hình thức <span className="required-mark">*</span></label>
                                    <div className="input-wrapper" style={{ position: 'relative' }}>
                                        <div className="input-icon" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }}>
                                            <Package size={16} />
                                        </div>
                                        <input type="text" value={formData.modeLabel || ''} onChange={(e) => { setFormData(prev => ({ ...prev, mode: e.target.value })); setModeDropdownOpen(true); }} onFocus={() => setModeDropdownOpen(true)} placeholder="Chọn hình thức" className={`form-input ${errors.mode ? 'error' : ''}`} style={{ paddingLeft: '36px' }} autoComplete="off" />
                                        {modeDropdownOpen && (
                                            <ul className="form-input" style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', maxHeight: '150px', overflowY: 'auto', listStyle: 'none', padding: '8px 0', zIndex: 10, backgroundColor: '#fff', border: '1px solid #d1d5db', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                                                {MODE_OPTIONS.map(mode => (
                                                    <li key={mode.value} onClick={() => handleModeSelect(mode)} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '14px' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                                                        {mode.label}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                    {errors.mode && <span className="error-message">{errors.mode}</span>}
                                </div>

                                {/* Ngày dự kiến */}
                                <div className="form-field">
                                    <label className="form-label">Ngày giờ dự kiến kiểm kê <span className="required-mark">*</span></label>
                                    <div className="input-wrapper">
                                        <Calendar className="input-icon" size={16} />
                                        <input type="datetime-local" name="plannedAt" value={formData.plannedAt} onChange={handleChange} className={`form-input ${errors.plannedAt ? 'error' : ''}`} />
                                    </div>
                                    {errors.plannedAt && <span className="error-message">{errors.plannedAt}</span>}
                                </div>
                            </div>
                        </div>
                    </div>
                </form>
            </div>

            {/* Toast Notification */}
            {toast && (
                <Toast message={toast.message} type={toast.type} onClose={clearToast} />
            )}
        </div>
    );
};

export default CreateStocktake;
