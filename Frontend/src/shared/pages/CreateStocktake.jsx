import React, { useState, useMemo, useEffect } from 'react';
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
    ImageIcon,
} from 'lucide-react';
import Toast from '../../components/Toast/Toast';
import { useToast } from '../hooks/useToast';
import authService from '../lib/authService';
import { getWarehouseList } from '../lib/warehouseService';
import { getItemsForDisplay } from '../lib/itemService';
import { createStocktakeDraft } from '../lib/stocktakeService';
import '../styles/CreateSupplier.css';

// Warehouse list — loaded from API

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

    // ── API data: warehouses + items ──────────────────────────────────────
    const [warehouses, setWarehouses] = useState([]);
    const [items, setItems] = useState([]);
    const [loadingWarehouses, setLoadingWarehouses] = useState(true);
    const [loadingItems, setLoadingItems] = useState(true);

    useEffect(() => {
        getWarehouseList({ pageSize: 100 })
            .then((res) => setWarehouses(res.items ?? []))
            .catch(() => showToast('Không tải được danh sách kho.', 'error'))
            .finally(() => setLoadingWarehouses(false));

        getItemsForDisplay()
            .then((list) => setItems(list))
            .catch(() => showToast('Không tải được danh sách vật tư.', 'error'))
            .finally(() => setLoadingItems(false));
    }, [showToast]);

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

    // Product search
    const [showProductSearch, setShowProductSearch] = useState(false);
    const [searchKeyword, setSearchKeyword] = useState('');
    const [selectedProductIds, setSelectedProductIds] = useState([]);

    // Dropdown states
    const [warehouseQuery, setWarehouseQuery] = useState('');
    const [warehouseDropdownOpen, setWarehouseDropdownOpen] = useState(false);
    const [modeDropdownOpen, setModeDropdownOpen] = useState(false);

    const [errors, setErrors] = useState({});

    // Filtered data
    const filteredWarehouses = useMemo(() => {
        const q = warehouseQuery.trim().toLowerCase();
        if (!q) return warehouses;
        return warehouses.filter(w =>
            (w.warehouseName ?? '').toLowerCase().includes(q) ||
            (w.warehouseCode ?? '').toLowerCase().includes(q)
        );
    }, [warehouses, warehouseQuery]);

    const filteredProducts = useMemo(() => {
        const q = searchKeyword.trim().toLowerCase();
        if (!q) return items;
        return items.filter(p =>
            (p.itemName ?? '').toLowerCase().includes(q) ||
            (p.itemCode ?? '').toLowerCase().includes(q)
        );
    }, [items, searchKeyword]);

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
            warehouseId: warehouse.warehouseId,
            warehouseName: warehouse.warehouseName,
        }));
        setWarehouseQuery('');
        setWarehouseDropdownOpen(false);
        if (errors.warehouseId) {
            setErrors(prev => ({ ...prev, warehouseId: '' }));
        }

        // Auto-import all items from the selected warehouse
        const newLines = items.map(item => ({
            id: Date.now() + Math.random(),
            itemId: item.itemId,
            itemName: item.itemName,
            itemCode: item.itemCode,
            itemImage: item.itemImage ?? null,
            uom: item.baseUomName ?? '-',
            systemQty: item.onHandQty ?? 0,
            countedQty: '',
            variance: '',
            note: ''
        }));

        setLines(newLines);
        showToast(`Đã tự động thêm ${newLines.length} vật tư từ kho ${warehouse.warehouseName}`, 'success');
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
    };

    const closeProductSearch = () => {
        setShowProductSearch(false);
        setSearchKeyword('');
    };

    const handleSearchChange = (e) => {
        setSearchKeyword(e.target.value);
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
            setSelectedProductIds(filteredProducts.map(p => p.itemId));
        }
    };

    const handleAddSelectedProducts = () => {
        if (selectedProductIds.length === 0) {
            showToast('Vui lòng chọn ít nhất 1 vật tư!', 'warning');
            return;
        }

        const productsToAdd = filteredProducts.filter(p => selectedProductIds.includes(p.itemId));
        const newLines = [];
        const existingItemIds = lines.map(l => l.itemId);

        productsToAdd.forEach(product => {
            if (existingItemIds.includes(product.itemId)) {
                return;
            }
            newLines.push({
                id: Date.now() + Math.random(),
                itemId: product.itemId,
                itemName: product.itemName,
                itemCode: product.itemCode,
                itemImage: product.itemImage ?? null,
                uom: product.baseUomName ?? '-',
                systemQty: product.onHandQty ?? 0,
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

        try {
            setSubmitting(true);

            const payload = {
                warehouseId: formData.warehouseId,
                mode: formData.mode,
                plannedAt: formData.plannedAt,
                note: formData.note || null,
                status: 'DRAFT',
                lineItems: lines.map((line) => ({
                    itemId: line.itemId,
                    warehouseId: Number(formData.warehouseId),
                })),
            };

            await createStocktakeDraft(payload);
            showToast('Đã lưu nháp phiếu kiểm kê!', 'success');
            setTimeout(() => navigate('/inventory/stocktakes'), 1500);
        } catch (error) {
            const msg =
                error?.response?.data?.message ||
                error?.message ||
                'Có lỗi xảy ra khi tạo phiếu kiểm kê';
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

            const status = formData.mode === 'PERIODIC' ? 'APPROVED' : 'PENDING_APPROVAL';

            const payload = {
                warehouseId: Number(formData.warehouseId),
                plannedAt: formData.plannedAt,
                mode: formData.mode,
                note: formData.note || null,
                status,
                lineItems: lines.map((line) => ({
                    itemId: line.itemId,
                    warehouseId: Number(formData.warehouseId),
                })),
            };

            const created = await createStocktakeDraft(payload);
            showToast('Đã gửi duyệt phiếu kiểm kê!', 'success');
            setTimeout(() => navigate('/inventory/stocktakes'), 1500);
        } catch (error) {
            const msg =
                error?.response?.data?.message ||
                error?.message ||
                'Có lỗi xảy ra khi tạo phiếu kiểm kê';
            showToast(msg, 'error');
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
                        <h1 className="page-title">Tạo yêu cầu kiểm kê kho</h1>
                        <p className="form-card-required-note">
                            Các trường đánh dấu <span className="required-mark">*</span> là bắt buộc
                        </p>
                    </div>

                    {/* Layout 2 cột: Line items (trái) + Thông tin chung (phải) */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px', alignItems: 'start' }}>
                        {/* Trái: Danh sách vật tư + Ghi chú */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {/* 1. Danh sách vật tư */}
                            <div className="info-section" style={{ margin: 0, display: 'flex', flexDirection: 'column', minHeight: '300px' }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Danh sách vật tư kiểm kê</h2>
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
                                    <div className="table-container">
                                        <table className="product-table">
                                            <thead>
                                                <tr>
                                                    <th style={{ width: '40px', textAlign: 'center' }}>STT</th>
                                                    <th style={{ textAlign: 'left' }}>Vật tư</th>
                                                    <th style={{ width: '100px', textAlign: 'right' }}>SL hệ thống</th>
                                                    <th style={{ width: '60px' }}></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {lines.map((line, index) => (
                                                    <tr key={line.itemId ?? line.id ?? index}>
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
                                                    <li key="no-results" style={{ padding: '8px 12px', color: '#6b7280', fontSize: '14px' }}>Không có kho phù hợp</li>
                                                ) : (
                                                    filteredWarehouses.map(wh => (
                                                        <li key={wh.warehouseId} onClick={() => handleWarehouseSelect(wh)} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '14px' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                                                            {wh.warehouseName} ({wh.warehouseCode})
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
