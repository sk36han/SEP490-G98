// Create Release Request – Mock UI (giống CreateGoodReceiptNote)
import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Tooltip from '@mui/material/Tooltip';
import {
    ArrowLeft, Plus, X, MapPin, User, Send, Loader,
    Calendar, Package, ImageIcon, Search, PackageOpen, Trash2, Globe,
} from 'lucide-react';
import Toast from '../../components/Toast/Toast';
import { getProvinces, getProvinceWithWards, getProvincesV2, getProvinceWardsDirectV2 } from '../lib/locationService';
import '../styles/CreateSupplier.css';

const MAX_NOTE_LENGTH = 250;

const MOCK_WAREHOUSES = [
    { value: 1, label: 'Kho Hà Nội' },
    { value: 2, label: 'Kho TP.HCM' },
    { value: 3, label: 'Kho Đà Nẵng' },
    { value: 4, label: 'Kho Cần Thơ' },
];

const MOCK_RECEIVERS = [
    { value: 1, label: 'Trần Thị B',   phone: '0901 234 567', email: 'tranb@example.com', note: '' },
    { value: 2, label: 'Lê Văn C',      phone: '0902 345 678', email: 'levanc@example.com', note: '' },
    { value: 3, label: 'Hoàng Văn E',   phone: '0903 456 789', email: 'hoangve@example.com', note: '' },
    { value: 4, label: 'Đặng Thị F',    phone: '0904 567 890', email: 'dangtf@example.com', note: '' },
    { value: 5, label: 'Bùi Thị H',     phone: '0905 678 901', email: 'buith@example.com', note: '' },
    { value: 6, label: 'Đỗ Văn I',      phone: '0906 789 012', email: 'dovi@example.com', note: '' },
    { value: 7, label: 'Lý Văn L',      phone: '0907 890 123', email: 'lyvl@example.com', note: '' },
    { value: 8, label: 'Mai Thị M',     phone: '0908 901 234', email: 'maitm@example.com', note: '' },
    { value: 9, label: 'Phạm Thị P',    phone: '0909 012 345', email: 'phamtp@example.com', note: '' },
    { value: 10, label: 'Vũ Thị Q',     phone: '0910 123 456', email: 'vutq@example.com', note: '' },
    { value: 11, label: 'Nguyễn Thị S', phone: '0911 234 567', email: 'nguyents@example.com', note: '' },
    { value: 12, label: 'Chu Thị T',    phone: '0912 345 678', email: 'chutt@example.com', note: '' },
];

const MOCK_PRODUCTS = [
    { id: 1,  name: 'Bút bi Thiên Long TL-057',      sku: 'PEN-001',   uom: 'Cây',    price: 3500,  stockQty: 500 },
    { id: 2,  name: 'Vở note 5 chấm A5',            sku: 'NOTE-001',  uom: 'Quyển',  price: 22000, stockQty: 120 },
    { id: 3,  name: 'Bìa còng A4 10mm',             sku: 'COVER-001', uom: 'Cái',    price: 8500,  stockQty: 80 },
    { id: 4,  name: 'Giấy A4 Double A 80gsm',       sku: 'PAPER-001', uom: 'Ram',    price: 62000, stockQty: 45 },
    { id: 5,  name: 'Kẹp giấy 33mm (hộp 50 cái)',  sku: 'CLIP-001',  uom: 'Hộp',   price: 18000, stockQty: 200 },
    { id: 6,  name: 'Keo dán thiên long 15g',       sku: 'GLUE-001',  uom: 'Tuýp',   price: 7000,  stockQty: 350 },
    { id: 7,  name: 'Thước kẻ 30cm nhựa trong',     sku: 'RULER-001', uom: 'Cái',    price: 5000,  stockQty: 150 },
    { id: 8,  name: 'Tẩy thiên long 7122',           sku: 'ERASER-001', uom: 'Cái',   price: 4000,  stockQty: 400 },
];

const formatCurrency = (val) => {
    if (!val && val !== 0) return '—';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
};

export default function CreateReleaseRequest() {
    const navigate = useNavigate();
    const [toast, setToast] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [useNewAddress, setUseNewAddress] = useState(false);

    const currentUser = { fullName: 'Nguyễn Văn A', userId: 1 };

    const [formData, setFormData] = useState({
        warehouseId: '',
        warehouseName: '',
        receiverId: '',
        receiverName: '',
        receiverPhone: '',
        receiverEmail: '',
        receiverNote: '',
        expectedExportDate: new Date().toISOString().slice(0, 10),
        creatorName: currentUser.fullName,
        note: '',
        address: '',
        country: 'Việt Nam',
        provinceCode: '',
        districtCode: '',
        wardCode: '',
    });

    // Address state - v1 (trước sát nhập)
    const [provinces, setProvinces] = useState([]);
    const [provinceDetail, setProvinceDetail] = useState(null);
    const [loadingProvinces, setLoadingProvinces] = useState(false);
    const [loadingWards, setLoadingWards] = useState(false);

    // Address state - v2 (sau sát nhập)
    const [provincesV2, setProvincesV2] = useState([]);
    const [loadingProvincesV2, setLoadingProvincesV2] = useState(false);
    const [loadingWardsV2, setLoadingWardsV2] = useState(false);
    const [provinceWardsV2, setProvinceWardsV2] = useState(null);

    // Computed
    const districtOptions = provinceDetail?.districts || [];
    const selectedDistrict = districtOptions.find(d => String(d.code) === formData.districtCode);
    const wardOptions = useNewAddress
        ? (provinceWardsV2?.wards || [])
        : (selectedDistrict?.wards || []);

    // Lines state
    const [lines, setLines] = useState([]);
    const [showProductSearch, setShowProductSearch] = useState(false);
    const [searchKeyword, setSearchKeyword] = useState('');
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [selectedProductIds, setSelectedProductIds] = useState([]);
    const [imageErrors, setImageErrors] = useState({});

    const showToast = (message, type = 'info') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'note' && value.length > MAX_NOTE_LENGTH) return;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleWarehouseChange = (e) => {
        const id = Number(e.target.value);
        const found = MOCK_WAREHOUSES.find((w) => w.value === id);
        setFormData((prev) => ({
            ...prev,
            warehouseId: id,
            warehouseName: found?.label ?? '',
        }));
    };

    const handleReceiverChange = (e) => {
        const id = Number(e.target.value);
        const found = MOCK_RECEIVERS.find((r) => r.value === id);
        setFormData((prev) => ({
            ...prev,
            receiverId: id,
            receiverName: found?.label ?? '',
            receiverPhone: found?.phone ?? '',
            receiverEmail: found?.email ?? '',
            receiverNote: found?.note ?? '',
        }));
    };

    // ── Address API calls (v1 – trước sát nhập) ───────────────────────────────
    useEffect(() => {
        let cancelled = false;
        setLoadingProvinces(true);
        getProvinces()
            .then(list => { if (!cancelled) setProvinces(list || []); })
            .catch(err => { if (!cancelled) console.error('Failed to load provinces', err); })
            .finally(() => { if (!cancelled) setLoadingProvinces(false); });
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        if (!formData.provinceCode || useNewAddress) { setProvinceDetail(null); return; }
        let cancelled = false;
        setLoadingWards(true);
        getProvinceWithWards(formData.provinceCode)
            .then(detail => { if (!cancelled && detail) setProvinceDetail(detail); })
            .catch(err => { if (!cancelled) { console.error('Failed to load districts/wards', err); setProvinceDetail(null); } })
            .finally(() => { if (!cancelled) setLoadingWards(false); });
        setFormData(prev => ({ ...prev, districtCode: '', wardCode: '' }));
        return () => { cancelled = true; };
    }, [formData.provinceCode, useNewAddress]);

    useEffect(() => {
        if (!useNewAddress) { setFormData(prev => ({ ...prev, wardCode: '' })); }
    }, [formData.districtCode, useNewAddress]);

    // ── Address API calls (v2 – sau sát nhập) ─────────────────────────────────
    useEffect(() => {
        let cancelled = false;
        setLoadingProvincesV2(true);
        getProvincesV2()
            .then(list => { if (!cancelled) setProvincesV2(list || []); })
            .catch(err => { if (!cancelled) console.error('Failed to load provinces v2', err); })
            .finally(() => { if (!cancelled) setLoadingProvincesV2(false); });
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        if (!formData.provinceCode || !useNewAddress) { setProvinceWardsV2(null); return; }
        let cancelled = false;
        setLoadingWardsV2(true);
        getProvinceWardsDirectV2(formData.provinceCode)
            .then(detail => { if (!cancelled && detail) setProvinceWardsV2(detail); })
            .catch(err => { if (!cancelled) { console.error('Failed to load wards v2', err); setProvinceWardsV2(null); } })
            .finally(() => { if (!cancelled) setLoadingWardsV2(false); });
        setFormData(prev => ({ ...prev, wardCode: '' }));
        return () => { cancelled = true; };
    }, [formData.provinceCode, useNewAddress]);

    const handleSearchChange = (e) => {
        const keyword = e.target.value;
        setSearchKeyword(keyword);
        if (keyword.trim() === '') { setFilteredProducts([]); return; }
        const filtered = MOCK_PRODUCTS.filter(
            (p) => p.name.toLowerCase().includes(keyword.toLowerCase()) || p.sku.toLowerCase().includes(keyword.toLowerCase())
        );
        setFilteredProducts(filtered);
    };

    const isValidImageUrl = (url) => {
        if (!url || typeof url !== 'string') return false;
        try { new URL(url); return true; } catch { return false; }
    };

    const handleImageError = (id) => setImageErrors((prev) => ({ ...prev, [id]: true }));

    const handleSelectProduct = (product) => {
        if (lines.find((l) => l.itemId === product.id)) {
            showToast('Vật tư đã có trong danh sách!', 'warning');
            return;
        }
        setLines((prev) => [...prev, {
            id: Date.now(),
            itemId: product.id,
            itemName: product.name,
            itemSku: product.sku,
            itemImage: null,
            uom: product.uom,
            stockQty: product.stockQty ?? 0,
            quantity: 1,
            note: '',
        }]);
        setSearchKeyword(''); setFilteredProducts([]); setShowProductSearch(false);
        showToast('Đã thêm vật tư', 'success');
    };

    const toggleProductSelection = (id) => {
        setSelectedProductIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
    };

    const addSelectedProducts = () => {
        if (selectedProductIds.length === 0) { showToast('Chọn ít nhất 1 vật tư', 'warning'); return; }
        const productsToAdd = MOCK_PRODUCTS.filter((p) => selectedProductIds.includes(p.id));
        const newLines = [];
        productsToAdd.forEach((p) => {
            if (!lines.find((l) => l.itemId === p.id)) {
                newLines.push({ id: Date.now() + Math.random(), itemId: p.id, itemName: p.name, itemSku: p.sku, itemImage: null, uom: p.uom, stockQty: p.stockQty ?? 0, quantity: 1, note: '' });
            }
        });
        if (newLines.length > 0) setLines((prev) => [...prev, ...newLines]);
        setSearchKeyword(''); setFilteredProducts([]); setShowProductSearch(false); setSelectedProductIds([]);
        showToast(`Đã thêm ${newLines.length} vật tư`, 'success');
    };

    const openProductSearch = () => { setShowProductSearch(true); setSearchKeyword(''); setFilteredProducts([]); };
    const closeProductSearch = () => { setShowProductSearch(false); setSearchKeyword(''); setFilteredProducts([]); setSelectedProductIds([]); };
    const addLine = () => openProductSearch();

    const updateLine = (index, field, value) => {
        setLines((prev) => prev.map((l, i) => i === index ? { ...l, [field]: value } : l));
    };

    const removeLine = (index) => {
        setLines((prev) => prev.filter((_, i) => i !== index));
    };

    const totals = useMemo(() => {
        const totalQty = lines.reduce((sum, l) => sum + (Number(l.quantity) || 0), 0);
        return { totalQty };
    }, [lines]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.warehouseName) { showToast('Vui lòng chọn kho xuất', 'error'); return; }
        if (!formData.receiverName) { showToast('Vui lòng chọn người nhận', 'error'); return; }
        if (lines.length === 0) { showToast('Vui lòng thêm ít nhất 1 vật tư', 'error'); return; }
        setSubmitting(true);
        setTimeout(() => {
            showToast('Tạo yêu cầu xuất hàng thành công!', 'success');
            setSubmitting(false);
            setTimeout(() => navigate('/good-delivery-notes'), 1500);
        }, 1000);
    };

    const handleCancel = () => navigate(-1);

    return (
        <div className="create-supplier-page">
            {/* ── Header ── */}
            <div className="page-header">
                <div className="page-header-left">
                    <button type="button" onClick={handleCancel} className="back-button">
                        <ArrowLeft size={20} />
                        <span>Quay lại</span>
                    </button>
                </div>
                <div className="page-header-actions">
                    <button type="button" onClick={handleCancel} className="btn btn-cancel" disabled={submitting}>
                        <X size={15} />Hủy
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary"
                        disabled={submitting}
                        onClick={handleSubmit}
                    >
                        {submitting ? (
                            <><Loader size={15} className="spinner" />Đang xử lý...</>
                        ) : (
                            <><Send size={15} />Tạo Yêu Cầu Xuất Hàng</>
                        )}
                    </button>
                </div>
            </div>

            {/* ── Form Card ── */}
            <div className="form-card">
                <form id="create-rr-form" className="form-wrapper">
                    <div className="form-card-intro">
                        <h1 className="page-title">Tạo yêu cầu xuất hàng</h1>
                        <p className="form-card-required-note">Các trường đánh dấu <span className="required-mark">*</span> là bắt buộc</p>
                    </div>

                    {/* Grid: Products (left) + Info (right) */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px', alignItems: 'start' }}>
                        {/* Left column */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                            {/* Product Detail Section */}
                            <div className="info-section" style={{ margin: 0, display: 'flex', flexDirection: 'column' }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Chi tiết vật tư</h2>
                                    <button type="button" onClick={addLine} className="btn btn-sm" style={{ fontSize: '14px', fontWeight: 600 }}>
                                        <Plus size={16} />Thêm vật tư
                                    </button>
                                </div>

                                {/* Product Search */}
                                {showProductSearch && (
                                    <div style={{ marginBottom: '16px', animation: 'slideDown 0.3s ease-out', position: 'relative' }}>
                                        <div style={{ position: 'relative' }}>
                                            <Search size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', zIndex: 1 }} />
                                            <input
                                                type="text"
                                                value={searchKeyword}
                                                onChange={handleSearchChange}
                                                placeholder="Tìm kiếm theo tên hoặc mã SKU..."
                                                autoFocus
                                                style={{
                                                    width: '100%', padding: '12px 44px 12px 44px',
                                                    border: '2px solid #2196F3', borderRadius: '10px', fontSize: '14px',
                                                    outline: 'none', boxSizing: 'border-box',
                                                    boxShadow: '0 0 0 4px rgba(33, 150, 243, 0.1)',
                                                }}
                                            />
                                            <button type="button" onClick={closeProductSearch}
                                                style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', color: '#6b7280', zIndex: 1 }}>
                                                <X size={20} />
                                            </button>
                                        </div>
                                        {searchKeyword !== '' && (
                                            <div style={{
                                                position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px',
                                                backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '10px',
                                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                                maxHeight: '400px', overflowY: 'auto', zIndex: 100,
                                                animation: 'fadeIn 0.2s ease-out',
                                            }}>
                                                {filteredProducts.length === 0 ? (
                                                    <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af' }}>
                                                        <Package size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                                                        <p style={{ margin: 0, fontSize: '13px' }}>Không tìm thấy vật tư nào</p>
                                                    </div>
                                                ) : (
                                                    <>
                                                        {filteredProducts.map((product) => (
                                                            <div key={product.id}
                                                                style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6', transition: 'background-color 0.15s', display: 'flex', alignItems: 'center', gap: '12px' }}
                                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                                                                <input type="checkbox" checked={selectedProductIds.includes(product.id)}
                                                                    onChange={(e) => { e.stopPropagation(); toggleProductSelection(product.id); }}
                                                                    style={{ cursor: 'pointer', width: '16px', height: '16px', flexShrink: 0 }} />
                                                                <div style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', border: '1px solid #e5e7eb', backgroundColor: '#f3f4f6', flexShrink: 0 }}>
                                                                    <ImageIcon size={20} color="#9ca3af" />
                                                                </div>
                                                                <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => handleSelectProduct(product)}>
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '4px' }}>
                                                                        <span style={{ fontSize: '14px', fontWeight: 500, color: '#1f2937' }}>{product.name}</span>
                                                                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#2196F3', marginLeft: '12px' }}>
                                                                            {formatCurrency(product.price)}
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
                                                            <div style={{ padding: '12px 16px', borderTop: '2px solid #e5e7eb', backgroundColor: '#f9fafb', position: 'sticky', bottom: 0 }}>
                                                                <button type="button" onClick={addSelectedProducts}
                                                                    className="btn btn-sm"
                                                                    style={{ width: '100%', backgroundColor: '#2196F3', color: 'white', border: 'none', fontWeight: 600, justifyContent: 'center' }}>
                                                                    <Plus size={16} />Thêm {selectedProductIds.length} vật tư
                                                                </button>
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {lines.length > 0 && (
                                    <div className="table-container">
                                        <table className="product-table">
                                            <thead>
                                                <tr>
                                                    <th style={{ width: '40px', textAlign: 'center' }}>STT</th>
                                                    <th style={{ textAlign: 'left' }}>Vật tư</th>
                                                    <th style={{ width: '100px', textAlign: 'right' }}>Tồn kho</th>
                                                    <th style={{ width: '120px', textAlign: 'right' }}>SL xuất</th>
                                                    <th style={{ width: '60px' }}></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {lines.map((line, index) => (
                                                    <tr key={line.id}>
                                                        <td style={{ textAlign: 'center' }}>{index + 1}</td>
                                                        <td>
                                                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                                                <div style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', border: '1px solid #e5e7eb', backgroundColor: '#f3f4f6', flexShrink: 0 }}>
                                                                    <ImageIcon size={20} color="#9ca3af" />
                                                                </div>
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                                    <a
                                                                        href="#"
                                                                        onClick={(e) => { e.preventDefault(); }}
                                                                        style={{
                                                                            color: '#2196F3',
                                                                            textDecoration: 'none',
                                                                            fontSize: 14,
                                                                            fontWeight: 500,
                                                                        }}
                                                                        onMouseEnter={(e) => { e.target.style.textDecoration = 'underline'; }}
                                                                        onMouseLeave={(e) => { e.target.style.textDecoration = 'none'; }}
                                                                    >
                                                                        {line.itemName}
                                                                    </a>
                                                                    <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>
                                                                        Mã: {line.itemSku} • ĐVT: {line.uom}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <div style={{ textAlign: 'right', paddingRight: '8px', fontWeight: 500, color: '#374151' }}>
                                                                {line.stockQty?.toLocaleString() ?? '—'}
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <input
                                                                type="number"
                                                                value={line.quantity != null ? line.quantity : ''}
                                                                onChange={(e) => updateLine(index, 'quantity', Number(e.target.value))}
                                                                min="0"
                                                                className="form-input"
                                                                style={{ textAlign: 'right' }}
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

                                {/* Empty state */}
                                {lines.length === 0 && (
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '16px', padding: '60px 20px', color: '#9ca3af' }}>
                                        <PackageOpen size={64} strokeWidth={1.5} />
                                        <p style={{ fontSize: '16px', fontWeight: 500, margin: 0 }}>Chưa có vật tư nào</p>
                                        <p style={{ fontSize: '14px', margin: 0 }}>Nhấn "Thêm vật tư" để bắt đầu</p>
                                    </div>
                                )}
                            </div>

                            {/* Người nhận */}
                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Người nhận</h2>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div className="form-field">
                                        <label className="form-label">Người nhận <span className="required-mark">*</span></label>
                                        <div className="input-wrapper">
                                            <User className="input-icon" size={16} />
                                            <select name="receiverId" value={formData.receiverId} onChange={handleReceiverChange}
                                                className="form-input" style={{ paddingLeft: '40px' }}>
                                                <option value="">Chọn người nhận</option>
                                                {MOCK_RECEIVERS.map((r) => (
                                                    <option key={r.value} value={r.value}>{r.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {formData.receiverId && (
                                        <>
                                            {formData.receiverPhone && (
                                                <div className="form-field">
                                                    <label className="form-label">Số điện thoại</label>
                                                    <div className="input-wrapper">
                                                        <User className="input-icon" size={16} />
                                                        <input type="text" value={formData.receiverPhone} readOnly
                                                            className="form-input" style={{ backgroundColor: '#f5f5f5' }} />
                                                    </div>
                                                </div>
                                            )}

                                            <div className="form-field">
                                                <label className="form-label">Email</label>
                                                <div className="input-wrapper">
                                                    <User className="input-icon" size={16} />
                                                    <input type="email" name="receiverEmail" value={formData.receiverEmail || ''} onChange={handleChange}
                                                        placeholder="Nhập email người nhận" className="form-input" />
                                                </div>
                                            </div>

                                            <div className="form-field">
                                                <label className="form-label">Ghi chú</label>
                                                <div className="input-wrapper">
                                                    <User className="input-icon" size={16} />
                                                    <input type="text" name="receiverNote" value={formData.receiverNote || ''} onChange={handleChange}
                                                        placeholder="Nhập ghi chú" className="form-input" />
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Địa chỉ */}
                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Địa chỉ</h2>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    {/* Quốc gia */}
                                    <div className="form-field">
                                        <label className="form-label">Quốc gia</label>
                                        <div className="input-wrapper">
                                            <Globe className="input-icon" size={16} />
                                            <select
                                                id="country"
                                                name="country"
                                                value={formData.country}
                                                onChange={handleChange}
                                                className="form-input"
                                            >
                                                <option value="Việt Nam">Việt Nam</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Toggle: Địa chỉ sau sát nhập */}
                                    <div className="form-field" style={{ display: 'flex', alignItems: 'center' }}>
                                        <Tooltip title="Loại cấu trúc địa chỉ 2 cấp sau sát nhập" placement="top" arrow>
                                            <label className="toggle-container" style={{ margin: 0, cursor: 'pointer' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={useNewAddress}
                                                    onChange={(e) => setUseNewAddress(e.target.checked)}
                                                    className="toggle-checkbox"
                                                />
                                                <span className="toggle-slider"></span>
                                                <span className="toggle-label">Địa chỉ sau sát nhập</span>
                                            </label>
                                        </Tooltip>
                                    </div>

                                    {/* Tỉnh/Thành phố */}
                                    <div className="form-field">
                                        <label className="form-label">Tỉnh/Thành phố</label>
                                        <div className="input-wrapper">
                                            <MapPin className="input-icon" size={16} />
                                            <select
                                                id="provinceCode"
                                                name="provinceCode"
                                                value={formData.provinceCode}
                                                onChange={handleChange}
                                                className="form-input"
                                                disabled={useNewAddress ? loadingProvincesV2 : loadingProvinces}
                                            >
                                                <option value="">
                                                    {useNewAddress
                                                        ? (loadingProvincesV2 ? 'Đang tải...' : 'Chọn tỉnh/thành phố')
                                                        : (loadingProvinces ? 'Đang tải...' : 'Chọn tỉnh/thành phố')}
                                                </option>
                                                {(useNewAddress ? provincesV2 : provinces).map(province => (
                                                    <option key={province.code} value={province.code}>
                                                        {province.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Quận/Huyện – chỉ hiện khi KHÔNG bật toggle */}
                                    {!useNewAddress && (
                                        <div className="form-field">
                                            <label className="form-label">Quận/Huyện</label>
                                            <div className="input-wrapper">
                                                <MapPin className="input-icon" size={16} />
                                                <select
                                                    id="districtCode"
                                                    name="districtCode"
                                                    value={formData.districtCode}
                                                    onChange={handleChange}
                                                    className="form-input"
                                                    disabled={!formData.provinceCode || loadingWards}
                                                >
                                                    <option value="">
                                                        {loadingWards ? 'Đang tải...' : 'Chọn quận/huyện'}
                                                    </option>
                                                    {districtOptions.map(district => (
                                                        <option key={district.code} value={district.code}>
                                                            {district.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    )}

                                    {/* Phường/Xã */}
                                    <div className="form-field">
                                        <label className="form-label">Phường/Xã</label>
                                        <div className="input-wrapper">
                                            <MapPin className="input-icon" size={16} />
                                            <select
                                                id="wardCode"
                                                name="wardCode"
                                                value={formData.wardCode}
                                                onChange={handleChange}
                                                className="form-input"
                                                disabled={!formData.provinceCode || (useNewAddress ? loadingWardsV2 : loadingWards) || (!useNewAddress && !formData.districtCode)}
                                            >
                                                <option value="">
                                                    {useNewAddress
                                                        ? (loadingWardsV2 ? 'Đang tải...' : 'Chọn phường/xã')
                                                        : (loadingWards ? 'Đang tải...' : 'Chọn phường/xã')}
                                                </option>
                                                {wardOptions.map(ward => (
                                                    <option key={ward.code} value={ward.code}>
                                                        {ward.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Địa chỉ cụ thể */}
                                    <div className="form-field" style={{ gridColumn: 'span 2' }}>
                                        <label className="form-label">Địa chỉ cụ thể</label>
                                        <div className="input-wrapper">
                                            <MapPin className="input-icon" size={16} />
                                            <input
                                                id="address"
                                                type="text"
                                                name="address"
                                                value={formData.address || ''}
                                                onChange={handleChange}
                                                placeholder="Nhập địa chỉ cụ thể"
                                                className="form-input"
                                                autoComplete="street-address"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Ghi chú */}
                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Ghi chú</h2>
                                </div>
                                <div className="form-field">
                                    <textarea
                                        name="note"
                                        value={formData.note}
                                        onChange={handleChange}
                                        className="form-textarea"
                                        rows={4}
                                        placeholder="Nhập ghi chú (nếu có)"
                                        style={{ width: '100%', minHeight: '100px' }}
                                    />
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px', fontSize: '12px', color: formData.note.length >= MAX_NOTE_LENGTH ? '#ef4444' : '#6b7280' }}>
                                        {formData.note.length}/{MAX_NOTE_LENGTH} ký tự
                                    </div>
                                </div>
                            </div>

                            {/* Tổng quan */}
                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Tổng quan</h2>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                        <span style={{ color: '#64748b' }}>Số vật tư:</span>
                                        <span style={{ fontWeight: 600, color: '#1e293b' }}>{lines.length}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                        <span style={{ color: '#64748b' }}>Tổng số lượng:</span>
                                        <span style={{ fontWeight: 600, color: '#1e293b' }}>{totals.totalQty.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right column */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                            {/* Thông tin chung */}
                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Thông tin chung</h2>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div className="form-field">
                                        <label className="form-label">Kho xuất <span className="required-mark">*</span></label>
                                        <div className="input-wrapper">
                                            <MapPin className="input-icon" size={16} />
                                            <select name="warehouseId" value={formData.warehouseId} onChange={handleWarehouseChange}
                                                className="form-input" style={{ paddingLeft: '40px' }}>
                                                <option value="">Chọn kho xuất</option>
                                                {MOCK_WAREHOUSES.map((w) => (
                                                    <option key={w.value} value={w.value}>{w.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="form-field">
                                        <label className="form-label">Ngày xuất dự kiến</label>
                                        <div className="input-wrapper">
                                            <Calendar className="input-icon" size={16} />
                                            <input type="date" name="expectedExportDate" value={formData.expectedExportDate}
                                                onChange={handleChange} className="form-input" />
                                        </div>
                                    </div>

                                    <div className="form-field">
                                        <label className="form-label">Người tạo</label>
                                        <div className="input-wrapper">
                                            <User className="input-icon" size={16} />
                                            <input type="text" name="creatorName" value={formData.creatorName}
                                                readOnly className="form-input" style={{ backgroundColor: '#f5f5f5' }} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </form>
            </div>

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
}
