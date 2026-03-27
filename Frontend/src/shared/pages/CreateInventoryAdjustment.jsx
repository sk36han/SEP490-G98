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
    FileText,
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

// Mock data for stocktakes
const MOCK_STOCKTAKES = [
    { id: 1, code: 'STK-0001', name: 'Kiểm kê tháng 2 kho HCM', warehouseName: 'Kho HCM' },
    { id: 2, code: 'STK-0002', name: 'Kiểm kê đột xuất kho Hà Nội', warehouseName: 'Kho Hà Nội' },
    { id: 3, code: 'STK-0003', name: 'Kiểm kê định kỳ kho Đà Nẵng', warehouseName: 'Kho Đà Nẵng' },
];

// Mock data for items
const MOCK_ITEMS = [
    { id: 1, code: 'ITEM-001', name: 'Vật tư A', uom: 'Cái', image: null, systemQty: 150 },
    { id: 2, code: 'ITEM-002', name: 'Vật tư B', uom: 'Cái', image: null, systemQty: 85 },
    { id: 3, code: 'ITEM-003', name: 'Vật tư C', uom: 'Kg', image: null, systemQty: 200 },
    { id: 4, code: 'ITEM-004', name: 'Vật tư D', uom: 'Thùng', image: null, systemQty: 50 },
    { id: 5, code: 'ITEM-005', name: 'Vật tư E', uom: 'Cái', image: null, systemQty: 120 },
    { id: 6, code: 'ITEM-006', name: 'Vật tư F', uom: 'Bộ', image: null, systemQty: 75 },
    { id: 7, code: 'ITEM-007', name: 'Vật tư G', uom: ' mét', image: null, systemQty: 300 },
    { id: 8, code: 'ITEM-008', name: 'Vật tư H', uom: 'Cái', image: null, systemQty: 45 },
    { id: 9, code: 'ITEM-009', name: 'Vật tư I', uom: 'Hộp', image: null, systemQty: 180 },
    { id: 10, code: 'ITEM-010', name: 'Vật tư J', uom: 'Cái', image: null, systemQty: 95 },
    { id: 11, code: 'ITEM-011', name: 'Vật tư K', uom: 'Kg', image: null, systemQty: 250 },
    { id: 12, code: 'ITEM-012', name: 'Vật tư L', uom: 'Thùng', image: null, systemQty: 60 },
    { id: 13, code: 'ITEM-013', name: 'Vật tư M', uom: 'Cái', image: null, systemQty: 130 },
    { id: 14, code: 'ITEM-014', name: 'Vật tư N', uom: 'Bộ', image: null, systemQty: 88 },
    { id: 15, code: 'ITEM-015', name: 'Vật tư O', uom: ' mét', image: null, systemQty: 420 },
    { id: 16, code: 'ITEM-016', name: 'Vật tư P', uom: 'Cái', image: null, systemQty: 67 },
    { id: 17, code: 'ITEM-017', name: 'Vật tư Q', uom: 'Hộp', image: null, systemQty: 210 },
    { id: 18, code: 'ITEM-018', name: 'Vật tư R', uom: 'Cái', image: null, systemQty: 155 },
    { id: 19, code: 'ITEM-019', name: 'Vật tư S', uom: 'Kg', image: null, systemQty: 310 },
    { id: 20, code: 'ITEM-020', name: 'Vật tư T', uom: 'Thùng', image: null, systemQty: 42 },
];

const MAX_REASON_LENGTH = 250;

const CreateInventoryAdjustment = () => {
    const navigate = useNavigate();
    const { toast, showToast, clearToast } = useToast();
    const [submitting, setSubmitting] = useState(false);
    const currentUser = authService.getUser();

    // Form data
    const [formData, setFormData] = useState({
        warehouseId: '',
        warehouseName: '',
        stocktakeId: '',
        stocktakeCode: '',
        adjustmentCode: 'ADJ-AUTO',
        status: 'Nháp',
        reason: '',
        creatorName: currentUser?.fullName || currentUser?.FullName || 'Người dùng hiện tại',
    });

    // Lines data
    const [lines, setLines] = useState([]);
    const [selectedLineIds, setSelectedLineIds] = useState([]);

    // Product search - checkbox select
    const [showProductSearch, setShowProductSearch] = useState(false);
    const [searchKeyword, setSearchKeyword] = useState('');
    const [products] = useState(MOCK_ITEMS);
    const [filteredProducts, setFilteredProducts] = useState(MOCK_ITEMS);
    const [selectedProductIds, setSelectedProductIds] = useState([]);

    // Dropdown states
    const [warehouseQuery, setWarehouseQuery] = useState('');
    const [warehouseDropdownOpen, setWarehouseDropdownOpen] = useState(false);
    const [stocktakeQuery, setStocktakeQuery] = useState('');
    const [stocktakeDropdownOpen, setStocktakeDropdownOpen] = useState(false);

    const [errors, setErrors] = useState({});

    // Mouse hover handlers for dropdown items
    const handleMouseEnter = (e) => {
        e.currentTarget.style.backgroundColor = '#f3f4f6';
    };

    const handleMouseLeave = (e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
    };

    // Filtered data
    const filteredWarehouses = useMemo(() => {
        const q = warehouseQuery.trim().toLowerCase();
        if (!q) return MOCK_WAREHOUSES;
        return MOCK_WAREHOUSES.filter(w =>
            w.name.toLowerCase().includes(q) || w.code.toLowerCase().includes(q)
        );
    }, [warehouseQuery]);

    const filteredStocktakes = useMemo(() => {
        const q = stocktakeQuery.trim().toLowerCase();
        if (!q) return MOCK_STOCKTAKES;
        return MOCK_STOCKTAKES.filter(s =>
            s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q)
        );
    }, [stocktakeQuery]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        // Giới hạn 250 ký tự cho trường reason
        if (name === 'reason' && value.length > MAX_REASON_LENGTH) {
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
    };

    const handleStocktakeSelect = (stocktake) => {
        setFormData(prev => ({
            ...prev,
            stocktakeId: stocktake.id,
            stocktakeCode: stocktake.code,
        }));
        setStocktakeQuery('');
        setStocktakeDropdownOpen(false);
        if (errors.stocktakeId) {
            setErrors(prev => ({ ...prev, stocktakeId: '' }));
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
                qtyChange: '',
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

    const updateLine = (index, field, value) => {
        setLines(prev => prev.map((l, i) => {
            if (i === index) {
                const updated = { ...l, [field]: value };

                // Auto calculate qtyChange
                if (field === 'systemQty' || field === 'countedQty') {
                    const sysQty = field === 'systemQty' ? parseFloat(value) || 0 : parseFloat(l.systemQty) || 0;
                    const cntQty = field === 'countedQty' ? parseFloat(value) || 0 : parseFloat(l.countedQty) || 0;
                    updated.qtyChange = cntQty - sysQty;
                }

                return updated;
            }
            return l;
        }));
    };

    const removeLine = (index) => {
        setLines(prev => prev.filter((_, i) => i !== index));
    };

    const toggleLineSelection = (lineId) => {
        setSelectedLineIds(prev =>
            prev.includes(lineId) ? prev.filter(id => id !== lineId) : [...prev, lineId]
        );
    };

    const toggleSelectAll = () => {
        if (selectedLineIds.length === lines.length) {
            setSelectedLineIds([]);
        } else {
            setSelectedLineIds(lines.map(l => l.id));
        }
    };

    const removeSelectedLines = () => {
        if (selectedLineIds.length === 0) return;
        const newLines = lines.filter(line => !selectedLineIds.includes(line.id));
        setLines(newLines);
        setSelectedLineIds([]);
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.warehouseId) {
            newErrors.warehouseId = 'Kho là bắt buộc';
        }

        if (!formData.stocktakeId) {
            newErrors.stocktakeId = 'Phiếu kiểm kê là bắt buộc';
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
            console.log('Creating inventory adjustment (draft):', { formData, lines });
            await new Promise(resolve => setTimeout(resolve, 1000));
            showToast('Tạo phiếu điều chỉnh thành công!', 'success');
            setTimeout(() => navigate('/inventory/adjustments'), 1500);
        } catch (error) {
            console.error('Error:', error);
            showToast('Có lỗi xảy ra khi tạo phiếu điều chỉnh', 'error');
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
            console.log('Creating inventory adjustment (for approval):', { formData, lines });
            await new Promise(resolve => setTimeout(resolve, 1000));
            showToast('Tạo phiếu điều chỉnh thành công!', 'success');
            setTimeout(() => navigate('/inventory/adjustments'), 1500);
        } catch (error) {
            console.error('Error:', error);
            showToast('Có lỗi xảy ra khi tạo phiếu điều chỉnh', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancel = () => {
        navigate(-1);
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
                    <button type="button" className="btn btn-primary" disabled={submitting} onClick={handleSubmitForApproval}>
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
                        <h1 className="page-title">Tạo phiếu điều chỉnh tồn kho</h1>
                        <p className="form-card-required-note">
                            Các trường đánh dấu <span className="required-mark">*</span> là bắt buộc
                        </p>
                    </div>

                    {/* Layout 2 cột: Line items (trái) + Thông tin chung (phải) */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px', alignItems: 'start' }}>
                        {/* Trái: Danh sách vật tư + Lý do */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {/* 1. Danh sách vật tư điều chỉnh */}
                            <div className="info-section" style={{ margin: 0, minHeight: '600px', display: 'flex', flexDirection: 'column' }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Danh sách vật tư điều chỉnh</h2>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        {selectedLineIds.length > 0 && (
                                            <button type="button" onClick={removeSelectedLines} className="btn btn-sm" style={{ fontWeight: 600, backgroundColor: '#ef4444', color: 'white', border: 'none' }}>
                                                <Trash2 size={16} />
                                                Xóa ({selectedLineIds.length})
                                            </button>
                                        )}
                                        <button type="button" onClick={openProductSearch} className="btn btn-sm" style={{ fontSize: '14px', fontWeight: 600 }}>
                                            <Plus size={16} />
                                            Thêm vật tư
                                        </button>
                                    </div>
                                </div>

                                {errors.lines && (
                                    <div className="error-message" style={{ marginBottom: '16px' }}>{errors.lines}</div>
                                )}

                                {/* Search Bar with Animation */}
                                {showProductSearch && (
                                    <div style={{ marginBottom: '16px', animation: 'slideDown 0.3s ease-out', position: 'relative' }}>
                                        <div style={{ position: 'relative' }}>
                                            <Search size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', zIndex: 1 }} />
                                            <input
                                                type="text"
                                                value={searchKeyword}
                                                onChange={handleSearchChange}
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
                                                }}
                                            />
                                            <button type="button" onClick={closeProductSearch} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', color: '#6b7280', zIndex: 1 }}>
                                                <X size={20} />
                                            </button>
                                        </div>

                                        {/* Dropdown Results with Checkbox */}
                                        {showProductSearch && (
                                            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', maxHeight: '400px', overflowY: 'auto', zIndex: 100 }}>
                                                <div style={{ padding: '10px 16px', borderBottom: '1px solid #f3f4f6', backgroundColor: '#f9fafb', fontSize: '12px', color: '#6b7280', fontWeight: 500, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span>{`${filteredProducts.length} vật tư`}</span>
                                                    {selectedProductIds.length > 0 && (
                                                        <span style={{ color: '#2196F3', fontWeight: 600 }}>Đã chọn: {selectedProductIds.length}</span>
                                                    )}
                                                </div>
                                                <div style={{ padding: '8px 0', borderBottom: '1px solid #e5e7eb' }}>
                                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px', fontWeight: 500, color: '#374151' }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={filteredProducts.length > 0 && selectedProductIds.length === filteredProducts.length}
                                                            onChange={toggleSelectAllProducts}
                                                            style={{ cursor: 'pointer' }}
                                                        />
                                                        Chọn tất cả
                                                    </label>
                                                </div>
                                                {filteredProducts.length === 0 ? (
                                                    <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af' }}>
                                                        <p style={{ margin: 0, fontSize: '13px' }}>Không tìm thấy vật tư</p>
                                                    </div>
                                                ) : filteredProducts.map(item => {
                                                    return (
                                                        <div key={item.id} style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                            <input type="checkbox" checked={selectedProductIds.includes(item.id)} onChange={() => toggleProductSelection(item.id)} style={{ cursor: 'pointer', flexShrink: 0 }} />
                                                            {isValidImageUrl(item.image) ? (
                                                                <img src={item.image} alt={item.name} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #e5e7eb', flexShrink: 0 }} />
                                                            ) : (
                                                                <div style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', border: '1px solid #e5e7eb', backgroundColor: '#f3f4f6', flexShrink: 0 }}>
                                                                    <ImageIcon size={20} color="#9ca3af" />
                                                                </div>
                                                            )}
                                                            <div>
                                                                <div style={{ fontWeight: 500, color: '#111827', fontSize: '14px' }}>{item.name}</div>
                                                                <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#6b7280' }}>
                                                                    <span>Mã: {item.code}</span>
                                                                    <span style={{ color: '#9ca3af' }}>-</span>
                                                                    <span>ĐVT: {item.uom}</span>
                                                                    <span style={{ color: '#9ca3af' }}>-</span>
                                                                    <span>SL: {item.systemQty || 0}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                {selectedProductIds.length > 0 && (
                                                    <div style={{ padding: '12px 16px', borderTop: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                                                        <button type="button" onClick={handleAddSelectedProducts} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                                                            Thêm {selectedProductIds.length} sản phẩm
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Empty state when no warehouse selected */}
                                {!formData.warehouseId && lines.length === 0 && !showProductSearch && (
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '16px', padding: '60px 20px', color: '#9ca3af' }}>
                                        <Package size={64} strokeWidth={1.5} />
                                        <p style={{ fontSize: '16px', fontWeight: 500, margin: 0 }}>Vui lòng chọn kho trước khi thêm vật tư</p>
                                        <p style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: '#ef4444' }}>Chọn kho ở bên phải trước</p>
                                    </div>
                                )}

                                {/* Empty state when warehouse selected but no lines */}
                                {formData.warehouseId && lines.length === 0 && !showProductSearch && (
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '16px', padding: '60px 20px', color: '#9ca3af' }}>
                                        <Package size={64} strokeWidth={1.5} />
                                        <p style={{ fontSize: '16px', fontWeight: 500, margin: 0 }}>Chưa có vật tư nào</p>
                                        <p style={{ fontSize: '14px', margin: 0 }}>Nhấn "Thêm vật tư" để bắt đầu</p>
                                    </div>
                                )}

                                {/* Lines table */}
                                {lines.length > 0 && (
                                    <div className="table-container" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                                        <table className="product-table">
                                            <thead>
                                                <tr>
                                                    <th style={{ width: '40px' }}>
                                                        <input type="checkbox" checked={lines.length > 0 && selectedLineIds.length === lines.length} onChange={toggleSelectAll} style={{ cursor: 'pointer' }} />
                                                    </th>
                                                    <th style={{ width: '40px', textAlign: 'center' }}>STT</th>
                                                    <th style={{ textAlign: 'left' }}>Vật tư</th>
                                                    <th style={{ width: '100px', textAlign: 'right' }}>SL hệ thống</th>
                                                    <th style={{ width: '120px', textAlign: 'right' }}>SL thực tế *</th>
                                                    <th style={{ width: '100px', textAlign: 'right' }}>Chênh lệch</th>
                                                    <th style={{ width: '150px', textAlign: 'left' }}>Ghi chú</th>
                                                    <th style={{ width: '60px' }}></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {lines.map((line, index) => (
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
                                                                <div>
                                                                    <div style={{ fontWeight: 500, color: '#111827', fontSize: '14px' }}>{line.itemName}</div>
                                                                    <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>Mã: {line.itemCode} - ĐVT: {line.uom}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <div style={{ textAlign: 'right', paddingRight: '8px', fontWeight: 500, color: '#374151' }}>
                                                                {line.systemQty || 0}
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <input type="number" value={line.countedQty} onChange={(e) => updateLine(index, 'countedQty', e.target.value)} className="form-input" style={{ textAlign: 'right', fontSize: '13px' }} placeholder="0" />
                                                        </td>
                                                        <td style={{ textAlign: 'right', fontWeight: 600, color: line.qtyChange > 0 ? '#2196F3' : line.qtyChange < 0 ? '#dc2626' : '#16a34a' }}>
                                                            {line.qtyChange || 0}
                                                        </td>
                                                        <td>
                                                            <input type="text" value={line.note} onChange={(e) => updateLine(index, 'note', e.target.value)} className="form-input" style={{ fontSize: '13px' }} placeholder="Ghi chú..." />
                                                        </td>
                                                        <td>
                                                            <button type="button" className="btn-icon-only" onClick={() => removeLine(index)} style={{ color: '#ef4444' }}>
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

                            {/* 2. Lý do điều chỉnh */}
                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Lý do điều chỉnh</h2>
                                </div>
                                <div className="form-field">
                                    <textarea name="reason" value={formData.reason} onChange={handleChange} className="form-textarea" rows={4} placeholder="Nhập lý do điều chỉnh (nếu có)" style={{ width: '100%', minHeight: '100px' }} />
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px', fontSize: '12px', color: formData.reason.length >= MAX_REASON_LENGTH ? '#ef4444' : '#6b7280' }}>
                                        {formData.reason.length}/{MAX_REASON_LENGTH} ký tự
                                    </div>
                                </div>
                            </div>
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
                                                        <li key={wh.id} onClick={() => handleWarehouseSelect(wh)} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '14px' }} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
                                                            {wh.name} ({wh.code})
                                                        </li>
                                                    ))
                                                )}
                                            </ul>
                                        )}
                                    </div>
                                    {errors.warehouseId && <span className="error-message">{errors.warehouseId}</span>}
                                </div>

                                {/* Phiếu kiểm kê liên quan */}
                                <div className="form-field">
                                    <label className="form-label">Phiếu kiểm kê liên quan <span className="required-mark">*</span></label>
                                    <div className="input-wrapper" style={{ position: 'relative' }}>
                                        <FileText className="input-icon" size={16} />
                                        <input type="text" value={stocktakeQuery || formData.stocktakeCode} onChange={(e) => { setStocktakeQuery(e.target.value); setStocktakeDropdownOpen(true); }} onFocus={() => setStocktakeDropdownOpen(true)} placeholder="Tìm hoặc chọn phiếu kiểm kê" className={`form-input ${errors.stocktakeId ? 'error' : ''}`} autoComplete="off" />
                                        {stocktakeDropdownOpen && (
                                            <ul className="form-input" style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', maxHeight: '220px', overflowY: 'auto', listStyle: 'none', padding: '8px 0', zIndex: 10, backgroundColor: '#fff', border: '1px solid #d1d5db', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                                                {filteredStocktakes.length === 0 ? (
                                                    <li style={{ padding: '8px 12px', color: '#6b7280', fontSize: '14px' }}>Không có phiếu kiểm kê phù hợp</li>
                                                ) : (
                                                    filteredStocktakes.map(st => (
                                                        <li key={st.id} onClick={() => handleStocktakeSelect(st)} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '14px' }} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
                                                            {st.code} - {st.name}
                                                        </li>
                                                    ))
                                                )}
                                            </ul>
                                        )}
                                    </div>
                                    {errors.stocktakeId && <span className="error-message">{errors.stocktakeId}</span>}
                                </div>

                                {/* Mã phiếu điều chỉnh */}
                                <div className="form-field">
                                    <label className="form-label">Mã phiếu điều chỉnh</label>
                                    <div className="input-wrapper">
                                        <FileText className="input-icon" size={16} />
                                        <input type="text" value={formData.adjustmentCode} readOnly className="form-input" style={{ backgroundColor: '#f5f5f5', color: '#6b7280', fontStyle: 'italic' }} placeholder="Tự sinh sau khi lưu" />
                                    </div>
                                </div>

                                {/* Trạng thái */}
                                <div className="form-field">
                                    <label className="form-label">Trạng thái</label>
                                    <div className="input-wrapper">
                                        <Package className="input-icon" size={16} />
                                        <input type="text" value={formData.status} readOnly className="form-input" style={{ backgroundColor: '#f5f5f5' }} />
                                    </div>
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

export default CreateInventoryAdjustment;
