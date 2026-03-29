// Create Release Request
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Plus, X, MapPin, User, Send, Loader,
    Package, ImageIcon, Search, PackageOpen, Trash2,
} from 'lucide-react';
import Toast from '../../components/Toast/Toast';
import { useToast } from '../hooks/useToast';
import { getWarehouseList } from '../lib/warehouseService';
import { getReceivers } from '../lib/receiverService';
import { getItemsForDisplay } from '../lib/itemService';
import { createReleaseRequest } from '../lib/releaseRequestService';
import { getProvincesV2, getProvinceWardsDirectV2 } from '../lib/locationService';
import '../styles/CreateSupplier.css';

const MAX_NOTE = 250;

const fmtCurrency = (v) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(v) || 0);

export default function CreateReleaseRequest() {
    const navigate = useNavigate();
    const { toast, showToast, clearToast } = useToast();
    const [submitting, setSubmitting] = useState(false);

    // ── Master data ────────────────────────────────────────────────────────────
    const [warehouses, setWarehouses] = useState([]);
    const [receivers, setReceivers] = useState([]);
    const [items, setItems] = useState([]);

    // ── Form state ─────────────────────────────────────────────────────────────
    const [form, setForm] = useState({
        warehouseId: '',
        warehouseName: '',
        receiverId: '',
        receiverName: '',
        receiverPhone: '',
        receiverEmail: '',
        receiverNote: '',
        expectedDate: new Date().toISOString().slice(0, 10),
        note: '',
        address: '',
        provinceCode: '',
        wardCode: '',
    });

    // ── Lines ───────────────────────────────────────────────────────────────────
    const [lines, setLines] = useState([]);
    const [showSearch, setShowSearch] = useState(false);
    const [keyword, setKeyword] = useState('');
    const [selectedIds, setSelectedIds] = useState([]);

    // ── Province / Ward (v2 only) ───────────────────────────────────────────────
    const [provinces, setProvinces] = useState([]);
    const [provinceWards, setProvinceWards] = useState(null);

    // ── Load master data ────────────────────────────────────────────────────────
    useEffect(() => {
        getWarehouseList({ pageSize: 100 })
            .then(r => setWarehouses(r.items ?? []))
            .catch(() => showToast('Không tải được danh sách kho.', 'error'));

        getReceivers({ pageSize: 1000 })
            .then(r => setReceivers(r.items ?? []))
            .catch(() => showToast('Không tải được danh sách người nhận.', 'error'));

        getItemsForDisplay()
            .then(list => setItems(list ?? []))
            .catch(() => showToast('Không tải được danh sách vật tư.', 'error'));

        getProvincesV2()
            .then(list => setProvinces(list ?? []))
            .catch(() => { /* location optional */ });
    }, [showToast]);

    // ── Load wards when province changes ────────────────────────────────────────
    useEffect(() => {
        if (!form.provinceCode) { setProvinceWards(null); return; }
        getProvinceWardsDirectV2(form.provinceCode)
            .then(detail => setProvinceWards(detail))
            .catch(() => setProvinceWards(null));
        setForm(prev => ({ ...prev, wardCode: '' }));
    }, [form.provinceCode]);

    // ── Helpers ─────────────────────────────────────────────────────────────────
    const set = (name, value) => setForm(prev => ({ ...prev, [name]: value }));

    const handleWarehouseChange = (e) => {
        const val = e.target.value;
        const id = val === '' ? '' : Number(val);
        const found = id !== '' ? warehouses.find(w => (w.warehouseId ?? w.WarehouseId) === id) : null;
        setForm(prev => ({ ...prev, warehouseId: id, warehouseName: found?.warehouseName ?? '' }));
    };

    const handleReceiverChange = (e) => {
        const val = e.target.value;
        const id = val === '' ? '' : Number(val);
        const found = id !== '' ? receivers.find(r => (r.receiverId ?? r.ReceiverId) === id) : null;
        setForm(prev => ({
            ...prev,
            receiverId: id,
            receiverName: found?.receiverName ?? '',
            receiverPhone: found?.phone ?? '',
            receiverEmail: found?.email ?? '',
            receiverNote: found?.notes ?? '',
        }));
    };

    const filteredItems = useMemo(() => {
        if (!keyword.trim()) return [];
        const kw = keyword.toLowerCase();
        return items.filter(it =>
            (it.itemName ?? '').toLowerCase().includes(kw) ||
            (it.itemCode ?? '').toLowerCase().includes(kw)
        );
    }, [items, keyword]);

    const handleSelectItem = (item) => {
        const id = item.itemId ?? item.ItemId;
        if (lines.find(l => (l.itemId ?? l.ItemId) === id)) {
            showToast('Vật tư đã có trong danh sách!', 'warning');
            return;
        }
        setLines(prev => [...prev, {
            id: Date.now(),
            itemId: id,
            itemName: item.itemName ?? '',
            itemCode: item.itemCode ?? '',
            uomName: item.uomName ?? item.baseUomName ?? '',
            uomId: item.uomId ?? null,
            quantity: 1,
            note: '',
        }]);
        setKeyword(''); setShowSearch(false);
        showToast('Đã thêm vật tư', 'success');
    };

    const toggleItem = (id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const addSelected = () => {
        if (!selectedIds.length) { showToast('Chọn ít nhất 1 vật tư', 'warning'); return; }
        const toAdd = items.filter(it => selectedIds.includes(it.itemId ?? it.ItemId));
        const existing = new Set(lines.map(l => l.itemId ?? l.ItemId));
        const newLines = toAdd
            .filter(it => !existing.has(it.itemId ?? it.ItemId))
            .map(it => ({
                id: Date.now() + Math.random(),
                itemId: it.itemId ?? it.ItemId,
                itemName: it.itemName ?? '',
                itemCode: it.itemCode ?? '',
                uomName: it.uomName ?? it.baseUomName ?? '',
                uomId: it.uomId ?? null,
                quantity: 1,
                note: '',
            }));
        if (newLines.length) setLines(prev => [...prev, ...newLines]);
        setKeyword(''); setShowSearch(false); setSelectedIds([]);
        showToast(`Đã thêm ${newLines.length} vật tư`, 'success');
    };

    const updateLine = (index, field, value) =>
        setLines(prev => prev.map((l, i) => i === index ? { ...l, [field]: value } : l));

    const removeLine = (index) => setLines(prev => prev.filter((_, i) => i !== index));

    const totals = useMemo(() =>
        lines.reduce((s, l) => s + (Number(l.quantity) || 0), 0), [lines]
    );

    // ── Submit ─────────────────────────────────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.warehouseId) { showToast('Vui lòng chọn kho xuất.', 'error'); return; }
        if (!form.receiverId) { showToast('Vui lòng chọn người nhận.', 'error'); return; }
        if (!lines.length) { showToast('Vui lòng thêm ít nhất 1 vật tư.', 'error'); return; }

        setSubmitting(true);
        try {
            await createReleaseRequest({
                warehouseId: form.warehouseId,
                receiverId: form.receiverId,
                expectedDate: form.expectedDate || null,
                purpose: form.note || null,
                lines: lines.map(l => ({
                    itemId: l.itemId,
                    requestedQty: l.quantity,
                    uomId: l.uomId,
                    note: l.note || null,
                })),
            });
            showToast('Tạo yêu cầu xuất hàng thành công!', 'success');
            setTimeout(() => navigate('/good-delivery-notes'), 1500);
        } catch (err) {
            const msg = err?.message || err?.response?.data?.message || 'Tạo yêu cầu xuất hàng thất bại.';
            showToast(msg, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    // ─────────────────────────────────────────────────────────────────────────────
    return (
        <div className="create-supplier-page">
            {/* Header */}
            <div className="page-header">
                <div className="page-header-left">
                    <button type="button" onClick={() => navigate(-1)} className="back-button">
                        <ArrowLeft size={20} /><span>Quay lại</span>
                    </button>
                </div>
                <div className="page-header-actions">
                    <button type="button" onClick={() => navigate(-1)} className="btn btn-cancel" disabled={submitting}>
                        <X size={15} />Hủy
                    </button>
                    <button type="button" className="btn btn-primary" disabled={submitting} onClick={handleSubmit}>
                        {submitting
                            ? <><Loader size={15} className="spinner" />Đang xử lý...</>
                            : <><Send size={15} />Tạo Yêu Cầu Xuất Hàng</>
                        }
                    </button>
                </div>
            </div>

            {/* Form */}
            <div className="form-card">
                <form id="create-rr-form" className="form-wrapper">
                    <div className="form-card-intro">
                        <h1 className="page-title">Tạo yêu cầu xuất hàng</h1>
                        <p className="form-card-required-note">Các trường <span className="required-mark">*</span> là bắt buộc</p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>
                        {/* Left */}

                        {/* Vật tư */}
                        <div className="info-section" style={{ margin: 0 }}>
                            <div className="section-header-with-toggle">
                                <h2 className="section-title">Chi tiết vật tư</h2>
                                <button type="button" onClick={() => { setShowSearch(true); setKeyword(''); setSelectedIds([]); }}
                                    className="btn btn-sm" style={{ fontSize: '14px', fontWeight: 600 }}>
                                    <Plus size={16} />Thêm vật tư
                                </button>
                            </div>

                            {showSearch && (
                                <div style={{ marginBottom: 16, position: 'relative' }}>
                                    <div style={{ position: 'relative' }}>
                                        <Search size={20} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', zIndex: 1 }} />
                                        <input type="text" value={keyword} autoFocus
                                            onChange={e => { setKeyword(e.target.value); setSelectedIds([]); }}
                                            placeholder="Tìm theo tên hoặc mã vật tư..."
                                            style={{ width: '100%', padding: '12px 44px', border: '2px solid #2196F3', borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box', boxShadow: '0 0 0 4px rgba(33,150,243,0.1)' }} />
                                        <button type="button" onClick={() => setShowSearch(false)}
                                            style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, color: '#6b7280' }}>
                                            <X size={20} />
                                        </button>
                                    </div>

                                    {keyword && (
                                        <div style={{
                                            position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
                                            backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 10,
                                            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                                            maxHeight: 400, overflowY: 'auto', zIndex: 100,
                                        }}>
                                            {filteredItems.length === 0 ? (
                                                <div style={{ padding: 24, textAlign: 'center', color: '#9ca3af' }}>
                                                    <Package size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                                                    <p style={{ margin: 0, fontSize: 13 }}>Không tìm thấy vật tư nào</p>
                                                </div>
                                            ) : (
                                                <>
                                                    {filteredItems.map(item => (
                                                        <div key={item.itemId ?? item.ItemId}
                                                            style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
                                                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f9fafb'}
                                                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                                            onClick={() => handleSelectItem(item)}>
                                                            <input type="checkbox" checked={selectedIds.includes(item.itemId ?? item.ItemId)}
                                                                onChange={e => { e.stopPropagation(); toggleItem(item.itemId ?? item.ItemId); }}
                                                                onClick={e => e.stopPropagation()}
                                                                style={{ cursor: 'pointer', width: 16, height: 16, flexShrink: 0 }} />
                                                            <div style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, border: '1px solid #e5e7eb', backgroundColor: '#f3f4f6', flexShrink: 0 }}>
                                                                <ImageIcon size={20} color="#9ca3af" />
                                                            </div>
                                                            <div style={{ flex: 1 }}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                                                    <span style={{ fontSize: 14, fontWeight: 500, color: '#1f2937' }}>{item.itemName}</span>
                                                                    <span style={{ fontSize: 14, fontWeight: 600, color: '#2196F3', marginLeft: 12 }}>
                                                                        {fmtCurrency(item.latestPrice ?? 0)}
                                                                    </span>
                                                                </div>
                                                                <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#6b7280' }}>
                                                                    <span>Mã: {item.itemCode}</span>
                                                                    <span>• ĐVT: {item.uomName ?? item.baseUomName}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {selectedIds.length > 0 && (
                                                        <div style={{ padding: 12, borderTop: '2px solid #e5e7eb', backgroundColor: '#f9fafb', position: 'sticky', bottom: 0 }}>
                                                            <button type="button" onClick={addSelected}
                                                                className="btn btn-sm"
                                                                style={{ width: '100%', backgroundColor: '#2196F3', color: '#fff', border: 'none', fontWeight: 600 }}>
                                                                <Plus size={16} />Thêm {selectedIds.length} vật tư
                                                            </button>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {lines.length > 0 ? (
                                <div className="table-container">
                                    <table className="product-table">
                                        <thead>
                                            <tr>
                                                <th style={{ width: 40, textAlign: 'center' }}>STT</th>
                                                <th>Vật tư</th>
                                                <th style={{ width: 120, textAlign: 'right' }}>SL xuất</th>
                                                <th style={{ width: 60 }} />
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {lines.map((line, idx) => (
                                                <tr key={line.id}>
                                                    <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                                                    <td>
                                                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                                            <div style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, border: '1px solid #e5e7eb', backgroundColor: '#f3f4f6', flexShrink: 0 }}>
                                                                <ImageIcon size={20} color="#9ca3af" />
                                                            </div>
                                                            <div>
                                                                <div style={{ fontSize: 14, fontWeight: 500, color: '#2196F3' }}>{line.itemName}</div>
                                                                <div style={{ fontSize: 12, color: '#6b7280' }}>Mã: {line.itemCode} • ĐVT: {line.uomName}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <input type="number" value={line.quantity ?? ''}
                                                            onChange={e => updateLine(idx, 'quantity', Number(e.target.value))}
                                                            min="0" className="form-input" style={{ textAlign: 'right' }} />
                                                    </td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <button type="button" onClick={() => removeLine(idx)} className="btn-icon-only" style={{ color: '#ef4444' }}>
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '60px 20px', color: '#9ca3af' }}>
                                    <PackageOpen size={64} strokeWidth={1.5} />
                                    <p style={{ fontSize: 16, fontWeight: 500, margin: 0 }}>Chưa có vật tư nào</p>
                                    <p style={{ fontSize: 14, margin: 0 }}>Nhấn "Thêm vật tư" để bắt đầu</p>
                                </div>
                            )}
                        </div>

                        {/* Right */}

                        {/* Thông tin chung */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Thông tin chung</h2>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    <div className="form-field">
                                        <label className="form-label">Kho xuất <span className="required-mark">*</span></label>
                                        <div className="input-wrapper">
                                            <MapPin className="input-icon" size={16} />
                                            <select value={form.warehouseId} onChange={handleWarehouseChange} className="form-input" style={{ paddingLeft: 40 }}>
                                                <option value="">Chọn kho xuất</option>
                                                {warehouses.map(w => (
                                                    <option key={w.warehouseId ?? w.WarehouseId} value={w.warehouseId ?? w.WarehouseId}>
                                                        {w.warehouseName ?? w.WarehouseName}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="form-field">
                                        <label className="form-label">Ngày xuất dự kiến</label>
                                        <div className="input-wrapper">
                                            <Calendar className="input-icon" size={16} />
                                            <input type="date" value={form.expectedDate}
                                                onChange={e => set('expectedDate', e.target.value)} className="form-input" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Người nhận */}
                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Người nhận</h2>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    <div className="form-field">
                                        <label className="form-label">Người nhận <span className="required-mark">*</span></label>
                                        <div className="input-wrapper">
                                            <User className="input-icon" size={16} />
                                            <select value={form.receiverId} onChange={handleReceiverChange} className="form-input" style={{ paddingLeft: 40 }}>
                                                <option value="">Chọn người nhận</option>
                                                {receivers.map(r => (
                                                    <option key={r.receiverId ?? r.ReceiverId} value={r.receiverId ?? r.ReceiverId}>
                                                        {r.receiverName ?? r.ReceiverName}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {form.receiverId && (
                                        <>
                                            {form.receiverPhone && (
                                                <div className="form-field">
                                                    <label className="form-label">Số điện thoại</label>
                                                    <div className="input-wrapper">
                                                        <User className="input-icon" size={16} />
                                                        <input type="text" value={form.receiverPhone} readOnly className="form-input" style={{ backgroundColor: '#f5f5f5' }} />
                                                    </div>
                                                </div>
                                            )}
                                            <div className="form-field">
                                                <label className="form-label">Email</label>
                                                <div className="input-wrapper">
                                                    <User className="input-icon" size={16} />
                                                    <input type="email" value={form.receiverEmail || ''}
                                                        onChange={e => set('receiverEmail', e.target.value)} placeholder="Nhập email" className="form-input" />
                                                </div>
                                            </div>
                                            <div className="form-field">
                                                <label className="form-label">Ghi chú</label>
                                                <div className="input-wrapper">
                                                    <User className="input-icon" size={16} />
                                                    <input type="text" value={form.receiverNote || ''}
                                                        onChange={e => set('receiverNote', e.target.value)} placeholder="Nhập ghi chú" className="form-input" />
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
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    <div className="form-field">
                                        <label className="form-label">Tỉnh/Thành phố</label>
                                        <div className="input-wrapper">
                                            <MapPin className="input-icon" size={16} />
                                            <select value={form.provinceCode} onChange={e => set('provinceCode', e.target.value)} className="form-input" style={{ paddingLeft: 40 }}>
                                                <option value="">Chọn tỉnh/thành phố</option>
                                                {provinces.map(p => (
                                                    <option key={p.code} value={p.code}>{p.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="form-field">
                                        <label className="form-label">Phường/Xã</label>
                                        <div className="input-wrapper">
                                            <MapPin className="input-icon" size={16} />
                                            <select value={form.wardCode} onChange={e => set('wardCode', e.target.value)} className="form-input" style={{ paddingLeft: 40 }}
                                                disabled={!form.provinceCode}>
                                                <option value="">Chọn phường/xã</option>
                                                {(provinceWards?.wards ?? []).map(w => (
                                                    <option key={w.code} value={w.code}>{w.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="form-field">
                                        <label className="form-label">Địa chỉ cụ thể</label>
                                        <div className="input-wrapper">
                                            <MapPin className="input-icon" size={16} />
                                            <input type="text" value={form.address || ''}
                                                onChange={e => set('address', e.target.value)} placeholder="Số nhà, đường..." className="form-input" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Tổng quan */}
                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Tổng quan</h2>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                                        <span style={{ color: '#64748b' }}>Số vật tư:</span>
                                        <span style={{ fontWeight: 600 }}>{lines.length}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                                        <span style={{ color: '#64748b' }}>Tổng số lượng:</span>
                                        <span style={{ fontWeight: 600 }}>{totals.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Ghi chú */}
                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Ghi chú</h2>
                                </div>
                                <div className="form-field">
                                    <textarea name="note" value={form.note}
                                        onChange={e => { if (e.target.value.length <= MAX_NOTE) set('note', e.target.value); }}
                                        className="form-textarea" rows={4} placeholder="Nhập ghi chú (nếu có)"
                                        style={{ width: '100%', minHeight: 100 }} />
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4, fontSize: 12, color: form.note.length >= MAX_NOTE ? '#ef4444' : '#6b7280' }}>
                                        {form.note.length}/{MAX_NOTE}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </form>
            </div>

            {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}
        </div>
    );
}

// Inline Calendar icon since it's used but not imported from lucide
function Calendar({ size = 16, className, style }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className={className} style={style}>
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
    );
}
