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

    // Product search
    const [showProductSearch, setShowProductSearch] = useState(false);
    const [searchKeyword, setSearchKeyword] = useState('');
    const [products] = useState(MOCK_ITEMS);
    const [filteredProducts, setFilteredProducts] = useState(MOCK_ITEMS);

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

    const handleSelectProduct = (product) => {
        // Check if already exists
        const existingLine = lines.find(line => line.itemId === product.id);

        if (existingLine) {
            showToast('Vật tư đã có trong danh sách!', 'warning');
            return;
        }

        // Add new line
        const newLine = {
            id: Date.now(),
            itemId: product.id,
            itemName: product.name,
            itemCode: product.code,
            itemImage: product.image,
            uom: product.uom,
            systemQty: product.systemQty || 0,
            countedQty: '',
            varianceQty: '',
            note: ''
        };

        setLines(prev => [...prev, newLine]);
        setSearchKeyword('');
        setFilteredProducts(products);
        setShowProductSearch(false);
        showToast('Đã thêm vật tư vào danh sách', 'success');
    };

    const updateLine = (index, field, value) => {
        setLines(prev => prev.map((l, i) => {
            if (i === index) {
                const updated = { ...l, [field]: value };

                // Auto calculate variance
                if (field === 'systemQty' || field === 'countedQty') {
                    const sysQty = field === 'systemQty' ? parseFloat(value) || 0 : parseFloat(l.systemQty) || 0;
                    const cntQty = field === 'countedQty' ? parseFloat(value) || 0 : parseFloat(l.countedQty) || 0;
                    updated.varianceQty = cntQty - sysQty;
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
                            <div className="info-section" style={{ margin: 0, minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Danh sách vật tư kiểm kê</h2>
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
                                                    boxShadow: '0 0 0 4px rgba(33, 150, 243, 0.1)'
                                                }}
                                            />
                                            <button type="button" onClick={closeProductSearch} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', color: '#6b7280', zIndex: 1 }}>
                                                <X size={20} />
                                            </button>
                                        </div>

                                        {/* Dropdown Results */}
                                        {showProductSearch && (
                                            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', maxHeight: '400px', overflowY: 'auto', zIndex: 100, animation: 'fadeIn 0.2s ease-out' }}>
                                                <div style={{ padding: '10px 16px', borderBottom: '1px solid #f3f4f6', backgroundColor: '#f9fafb', fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>
                                                    {`${filteredProducts.length} vật tư`}
                                                </div>
                                                {filteredProducts.length === 0 ? (
                                                    <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af' }}>
                                                        <p style={{ margin: 0, fontSize: '13px' }}>Không tìm thấy vật tư</p>
                                                    </div>
                                                ) : (
                                                    filteredProducts.map(item => (
                                                        <div key={item.id} onClick={() => handleSelectProduct(item)} style={{ padding: '12px 16px', cursor: 'pointer', transition: 'background-color 0.15s', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: '12px' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}>
                                                            {isValidImageUrl(item.image) ? (
                                                                <img src={item.image} alt={item.name} style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #e5e7eb', flexShrink: 0 }} />
                                                            ) : (
                                                                <div style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', border: '1px solid #e5e7eb', backgroundColor: '#f3f4f6', flexShrink: 0 }}>
                                                                    <ImageIcon size={20} color="#9ca3af" />
                                                                </div>
                                                            )}
                                                            <div>
                                                                <div style={{ fontWeight: 500, color: '#111827', fontSize: '14px' }}>{item.name}</div>
                                                                <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                                                                    <span>Mã: {item.code}</span>
                                                                    <span>•</span>
                                                                    <span>ĐVT: {item.uom}</span>
                                                                    <span>•</span>
                                                                    <span>SL Hệ thống: {item.systemQty || 0}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Empty state when no warehouse selected */}
                                {!formData.warehouseId && lines.length === 0 && !showProductSearch && (
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '16px', padding: '60px 20px', color: '#9ca3af' }}>
                                        <Package size={64} strokeWidth={1.5} />
                                        <p style={{ fontSize: '16px', fontWeight: 500, margin: 0 }}>Vui lòng chọn kho cần kiểm kê sản phẩm trước khi thêm vật tư</p>
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
                                                    <th style={{ textAlign: 'left' }}>Vật tư </th>
                                                    <th style={{ width: '100px', textAlign: 'right' }}>SL hệ thống</th>
                                                    <th style={{ width: '100px', textAlign: 'right' }}>SL đã kiểm kê *</th>
                                                    <th style={{ width: '80px', textAlign: 'right' }}>Chênh lệch</th>
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
                                                                <div style={{ fontWeight: 500, color: '#111827', fontSize: '14px' }}>{line.itemName}</div>
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
                                                        <td style={{ textAlign: 'right', fontWeight: 600, color: line.varianceQty > 0 ? '#2196F3' : line.varianceQty < 0 ? '#dc2626' : '#16a34a' }}>
                                                            {line.varianceQty || 0}
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
                                    <label className="form-label">Ngày dự kiến kiểm kê <span className="required-mark">*</span></label>
                                    <div className="input-wrapper">
                                        <Calendar className="input-icon" size={16} />
                                        <input type="date" name="plannedAt" value={formData.plannedAt} onChange={handleChange} className={`form-input ${errors.plannedAt ? 'error' : ''}`} />
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
