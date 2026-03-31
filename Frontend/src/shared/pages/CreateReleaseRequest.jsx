// Create Release Request
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, X, MapPin, User, Send, Loader, Package, ImageIcon, Search, PackageOpen, Trash2 } from 'lucide-react';
import Toast from '../../components/Toast/Toast';
import { useToast } from '../hooks/useToast';
import { getWarehouseList } from '../lib/warehouseService';
import { getReceivers } from '../lib/receiverService';
import { getItemsForDisplay } from '../lib/itemService';
import { createReleaseRequest } from '../lib/releaseRequestService';
import { getProvincesV2, getProvinceWardsDirectV2 } from '../lib/locationService';
import '../styles/CreateSupplier.css';

const MAX_NOTE = 250;

export default function CreateReleaseRequest() {
    const navigate = useNavigate();
    const { toast, showToast, clearToast } = useToast();
    const [submitting, setSubmitting] = useState(false);

    const [warehouses, setWarehouses] = useState([]);
    const [receivers, setReceivers] = useState([]);
    const [items, setItems] = useState([]);

    const [form, setForm] = useState({
        warehouseId: '', warehouseName: '', receiverId: '', receiverName: '',
        receiverPhone: '', receiverEmail: '', receiverNote: '',
        expectedDate: new Date().toISOString().slice(0, 10),
        note: '', purpose: '', address: '', provinceCode: '', wardCode: '',
    });

    const [lineItems, setLineItems] = useState([]);
    const [showSearch, setShowSearch] = useState(false);
    const [keyword, setKeyword] = useState('');
    const [selectedIds, setSelectedIds] = useState([]);

    const [provinces, setProvinces] = useState([]);
    const [provinceWards, setProvinceWards] = useState(null);

    useEffect(() => {
        getWarehouseList({ pageSize: 100 })
            .then(r => setWarehouses(r.items ?? []))
            .catch(() => showToast('Khong tai duoc danh sach kho.', 'error'));
        getReceivers({ pageSize: 1000 })
            .then(r => setReceivers(r.items ?? []))
            .catch(() => showToast('Khong tai duoc danh sach nguoi nhan.', 'error'));
        getItemsForDisplay()
            .then(list => setItems(list ?? []))
            .catch(() => showToast('Khong tai duoc danh sach vat tu.', 'error'));
        getProvincesV2()
            .then(list => setProvinces(list ?? []))
            .catch(() => {});
    }, [showToast]);

    useEffect(() => {
        if (!form.provinceCode) { setProvinceWards(null); return; }
        getProvinceWardsDirectV2(form.provinceCode)
            .then(detail => setProvinceWards(detail))
            .catch(() => setProvinceWards(null));
        setForm(prev => ({ ...prev, wardCode: '' }));
    }, [form.provinceCode]);

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
            ...prev, receiverId: id, receiverName: found?.receiverName ?? '',
            receiverPhone: found?.phone ?? '', receiverEmail: found?.email ?? '',
            receiverNote: found?.notes ?? '',
        }));
    };

    const filteredItems = useMemo(() => {
        if (!form.warehouseId) return [];
        if (!keyword.trim()) return items.filter(it => (it.onHandQty ?? 0) > 0);
        const kw = keyword.toLowerCase();
        return items.filter(it =>
            ((it.onHandQty ?? 0) > 0) &&
            ((it.itemName ?? '').toLowerCase().includes(kw) || (it.itemCode ?? '').toLowerCase().includes(kw))
        );
    }, [items, keyword, form.warehouseId]);

    const handleSelectItem = (item) => {
        const id = item.itemId ?? item.ItemId;
        if (lineItems.find(l => (l.itemId ?? l.ItemId) === id)) {
            showToast('Vat tu da co trong danh sach!', 'warning'); return;
        }
        setLineItems(prev => [...prev, {
            id: Date.now(), itemId: id, itemName: item.itemName ?? '', itemCode: item.itemCode ?? '',
            uomName: item.uomName ?? item.baseUomName ?? '', uomId: item.uomId ?? null,
            availableQty: item.onHandQty ?? 0, quantity: 1, note: '',
        }]);
        setKeyword(''); setShowSearch(false);
        showToast('Da them vat tu', 'success');
    };

    const toggleItem = (id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const addSelected = () => {
        if (!selectedIds.length) { showToast('Chon it nhat 1 vat tu', 'warning'); return; }
        const toAdd = items.filter(it => selectedIds.includes(it.itemId ?? it.ItemId));
        const existing = new Set(lineItems.map(l => l.itemId ?? l.ItemId));
        const newLines = toAdd.filter(it => !existing.has(it.itemId ?? it.ItemId)).map(it => ({
            id: Date.now() + Math.random(), itemId: it.itemId ?? it.ItemId,
            itemName: it.itemName ?? '', itemCode: it.itemCode ?? '',
            uomName: it.uomName ?? it.baseUomName ?? '', uomId: it.uomId ?? null,
            availableQty: it.onHandQty ?? 0, quantity: 1, note: '',
        }));
        if (newLines.length) setLineItems(prev => [...prev, ...newLines]);
        setKeyword(''); setShowSearch(false); setSelectedIds([]);
        showToast('Da them ' + newLines.length + ' vat tu', 'success');
    };

    const updateLine = (index, field, value) =>
        setLineItems(prev => prev.map((l, i) => i === index ? { ...l, [field]: value } : l));

    const removeLine = (index) => setLineItems(prev => prev.filter((_, i) => i !== index));

    const totals = useMemo(() => lineItems.reduce((s, l) => s + (Number(l.quantity) || 0), 0), [lineItems]);

    const canSubmit = useMemo(() =>
        Boolean(form.receiverId) && Boolean(form.warehouseId) && Boolean(form.purpose) && lineItems.length > 0,
        [form, lineItems]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.receiverId) { showToast('Vui long chon nguoi nhan.', 'error'); return; }
        if (!form.warehouseId) { showToast('Vui long chon kho xuat.', 'error'); return; }
        if (!form.purpose) { showToast('Vui long nhap ly do xuat hang.', 'error'); return; }
        if (!lineItems.length) { showToast('Vui long them it nhat 1 vat tu.', 'error'); return; }
        setSubmitting(true);
        try {
            await createReleaseRequest({
                warehouseId: form.warehouseId, receiverId: form.receiverId,
                expectedDate: form.expectedDate || null, purpose: form.purpose || null,
                lines: lineItems.map(l => ({ itemId: l.itemId, requestedQty: l.quantity, uomId: l.uomId, note: l.note || null })),
            });
            showToast('Tao yeu cau xuat hang thanh cong!', 'success');
            setTimeout(() => navigate('/good-delivery-notes'), 1500);
        } catch (err) {
            const msg = err?.message || err?.response?.data?.message || 'Tao yeu cau xuat hang that bai.';
            showToast(msg, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="create-supplier-page">
            <div className="page-header">
                <div className="page-header-left">
                    <button type="button" onClick={() => navigate(-1)} className="back-button">
                        <ArrowLeft size={20} /><span>Quay lai</span>
                    </button>
                </div>
                <div className="page-header-actions">
                    <button type="button" onClick={() => navigate(-1)} className="btn btn-cancel" disabled={submitting}><X size={15} />Huy</button>
                    <button type="button" className="btn btn-primary" disabled={!canSubmit || submitting} onClick={handleSubmit}>
                        {submitting ? <><Loader size={15} className="spinner" />Dang xu ly...</> : <><Send size={15} />Tao Yeu Cau Xuat Hang</>}
                    </button>
                </div>
            </div>

            <div className="form-card">
                <form id="create-rr-form" className="form-wrapper">
                    <div className="form-card-intro">
                        <h1 className="page-title">Tao yeu cau xuat hang</h1>
                        <p className="form-card-required-note">Cac truong <span className="required-mark">*</span> la bat buoc</p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24, alignItems: 'start' }}>

                        {/* LEFT: Nguoi nhan + Kho + Items */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

                            {/* 1. Nguoi nhan */}
                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Nguoi nhan</h2>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    <div className="form-field">
                                        <label className="form-label">Nguoi nhan <span className="required-mark">*</span></label>
                                        <div className="input-wrapper">
                                            <User className="input-icon" size={16} />
                                            <select value={form.receiverId} onChange={handleReceiverChange} className="form-input" style={{ paddingLeft: 40 }}>
                                                <option value="">Chon nguoi nhan</option>
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
                                                    <label className="form-label">So dien thoai</label>
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
                                                        onChange={e => set('receiverEmail', e.target.value)} placeholder="Nhap email" className="form-input" />
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* 2. Kho xuat + Ngay xuat + Ly do */}
                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Thong tin xuat hang</h2>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    <div className="form-field">
                                        <label className="form-label">Kho xuat <span className="required-mark">*</span></label>
                                        <div className="input-wrapper">
                                            <MapPin className="input-icon" size={16} />
                                            <select value={form.warehouseId} onChange={handleWarehouseChange} className="form-input" style={{ paddingLeft: 40 }}>
                                                <option value="">Chon kho xuat</option>
                                                {warehouses.map(w => (
                                                    <option key={w.warehouseId ?? w.WarehouseId} value={w.warehouseId ?? w.WarehouseId}>
                                                        {w.warehouseName ?? w.WarehouseName}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="form-field">
                                        <label className="form-label">Ngay xuat du kien</label>
                                        <div className="input-wrapper">
                                            <Calendar className="input-icon" size={16} />
                                            <input type="date" value={form.expectedDate}
                                                onChange={e => set('expectedDate', e.target.value)} className="form-input" />
                                        </div>
                                    </div>
                                    <div className="form-field">
                                        <label className="form-label">Ly do xuat hang <span className="required-mark">*</span></label>
                                        <div className="input-wrapper">
                                            <Package className="input-icon" size={16} />
                                            <input type="text" value={form.purpose || ''}
                                                onChange={e => set('purpose', e.target.value)}
                                                placeholder="VD: Ban hang, Tra hang, Xuat kho..." className="form-input" style={{ paddingLeft: 40 }} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 3. Chi tiet vat tu */}
                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Chi tiet vat tu</h2>
                                    {form.warehouseId && (
                                        <button type="button" onClick={() => { setShowSearch(true); setKeyword(''); setSelectedIds([]); }}
                                            className="btn btn-sm" style={{ fontSize: '14px', fontWeight: 600 }}>
                                            <Plus size={16} />Them vat tu
                                        </button>
                                    )}
                                </div>

                                {!form.warehouseId ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '40px 20px', color: '#9ca3af' }}>
                                        <PackageOpen size={48} strokeWidth={1.5} />
                                        <p style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>Vui long chon kho xuat truoc</p>
                                        <p style={{ fontSize: 13, margin: 0, color: '#64748b' }}>Vat tu co trong kho se hien thi o day</p>
                                    </div>
                                ) : (
                                    <>
                                        {showSearch && (
                                            <div style={{ marginBottom: 16, position: 'relative' }}>
                                                <div style={{ position: 'relative' }}>
                                                    <Search size={20} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', zIndex: 1 }} />
                                                    <input type="text" value={keyword} autoFocus
                                                        onChange={e => { setKeyword(e.target.value); setSelectedIds([]); }}
                                                        placeholder="Tim theo ten hoac ma vat tu..."
                                                        style={{ width: '100%', padding: '12px 44px', border: '2px solid #2196F3', borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box', boxShadow: '0 0 0 4px rgba(33,150,243,0.1)' }} />
                                                    <button type="button" onClick={() => setShowSearch(false)}
                                                        style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, color: '#6b7280' }}>
                                                        <X size={20} />
                                                    </button>
                                                </div>
                                                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', maxHeight: 400, overflowY: 'auto', zIndex: 100 }}>
                                                    {filteredItems.length === 0 ? (
                                                        <div style={{ padding: 24, textAlign: 'center', color: '#9ca3af' }}>
                                                            <Package size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                                                            <p style={{ margin: 0, fontSize: 13 }}>Khong co vat tu nao trong kho nay</p>
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
                                                                            <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>Ton: {(item.onHandQty ?? 0).toLocaleString()}</span>
                                                                        </div>
                                                                        <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#6b7280' }}>
                                                                            <span>Ma: {item.itemCode}</span>
                                                                            <span>- DVT: {item.uomName ?? item.baseUomName}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                            {selectedIds.length > 0 && (
                                                                <div style={{ padding: 12, borderTop: '2px solid #e5e7eb', backgroundColor: '#f9fafb', position: 'sticky', bottom: 0 }}>
                                                                    <button type="button" onClick={addSelected}
                                                                        className="btn btn-sm"
                                                                        style={{ width: '100%', backgroundColor: '#2196F3', color: '#fff', border: 'none', fontWeight: 600 }}>
                                                                        <Plus size={16} />Them {selectedIds.length} vat tu
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {lineItems.length > 0 ? (
                                            <div className="table-container">
                                                <table className="product-table">
                                                    <thead>
                                                        <tr>
                                                            <th style={{ width: 40, textAlign: 'center' }}>STT</th>
                                                            <th>Vat tu</th>
                                                            <th style={{ width: 90, textAlign: 'right' }}>Ton kho</th>
                                                            <th style={{ width: 100, textAlign: 'right' }}>SL xuat</th>
                                                            <th style={{ width: 60 }} />
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {lineItems.map((line, idx) => (
                                                            <tr key={line.id}>
                                                                <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                                                                <td>
                                                                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                                                        <div style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, border: '1px solid #e5e7eb', backgroundColor: '#f3f4f6', flexShrink: 0 }}>
                                                                            <ImageIcon size={20} color="#9ca3af" />
                                                                        </div>
                                                                        <div>
                                                                            <div style={{ fontSize: 14, fontWeight: 500, color: '#1f2937' }}>{line.itemName}</div>
                                                                            <div style={{ fontSize: 12, color: '#6b7280' }}>Ma: {line.itemCode} - DVT: {line.uomName}</div>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td style={{ textAlign: 'right', color: '#64748b', fontSize: 13 }}>{line.availableQty.toLocaleString()}</td>
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
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '40px 20px', color: '#9ca3af' }}>
                                                <PackageOpen size={48} strokeWidth={1.5} />
                                                <p style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>Chua co vat tu nao</p>
                                                <p style={{ fontSize: 13, margin: 0, color: '#64748b' }}>Nhan "Them vat tu" de bat dau</p>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                        {/* RIGHT: Dia chi + Summary + Ghi chu */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Dia chi giao hang</h2>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    <div className="form-field">
                                        <label className="form-label">Tinh/Thanh pho</label>
                                        <div className="input-wrapper">
                                            <MapPin className="input-icon" size={16} />
                                            <select value={form.provinceCode} onChange={e => set('provinceCode', e.target.value)} className="form-input" style={{ paddingLeft: 40 }}>
                                                <option value="">Chon tinh/thanh pho</option>
                                                {provinces.map(p => (<option key={p.code} value={p.code}>{p.name}</option>))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="form-field">
                                        <label className="form-label">Phuong/Xa</label>
                                        <div className="input-wrapper">
                                            <MapPin className="input-icon" size={16} />
                                            <select value={form.wardCode} onChange={e => set('wardCode', e.target.value)} className="form-input" style={{ paddingLeft: 40 }} disabled={!form.provinceCode}>
                                                <option value="">Chon phuong/xa</option>
                                                {(provinceWards?.wards ?? []).map(w => (<option key={w.code} value={w.code}>{w.name}</option>))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="form-field">
                                        <label className="form-label">Dia chi cu the</label>
                                        <div className="input-wrapper">
                                            <MapPin className="input-icon" size={16} />
                                            <input type="text" value={form.address || ''}
                                                onChange={e => set('address', e.target.value)} placeholder="So nha, duong..." className="form-input" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Tong quan</h2>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                                        <span style={{ color: '#64748b' }}>So vat tu:</span>
                                        <span style={{ fontWeight: 600 }}>{lineItems.length}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                                        <span style={{ color: '#64748b' }}>Tong so luong:</span>
                                        <span style={{ fontWeight: 600 }}>{totals.toLocaleString()}</span>
                                    </div>
                                    {form.warehouseName && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                                            <span style={{ color: '#64748b' }}>Kho xuat:</span>
                                            <span style={{ fontWeight: 500, color: '#374151', textAlign: 'right', maxWidth: 180 }}>{form.warehouseName}</span>
                                        </div>
                                    )}
                                    {form.receiverName && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                                            <span style={{ color: '#64748b' }}>Nguoi nhan:</span>
                                            <span style={{ fontWeight: 500, color: '#374151', textAlign: 'right', maxWidth: 180 }}>{form.receiverName}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Ghi chu</h2>
                                </div>
                                <div className="form-field">
                                    <textarea name="note" value={form.note}
                                        onChange={e => { if (e.target.value.length <= MAX_NOTE) set('note', e.target.value); }}
                                        className="form-textarea" rows={4} placeholder="Nhap ghi chu (neu co)"
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

function Calendar({ size = 16, className, style }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
    );
}
