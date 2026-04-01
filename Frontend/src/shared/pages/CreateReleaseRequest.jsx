// Create Release Request
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Plus, X, MapPin, User, Send, Loader,
    Package, ImageIcon, Search, PackageOpen, Trash2,
    Building2, Phone, Mail, Briefcase,
} from 'lucide-react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Radio, RadioGroup, FormControlLabel,
    CircularProgress,
} from '@mui/material';
import Toast from '../../components/Toast/Toast';
import { useToast } from '../hooks/useToast';
import { getCompanies, createCompany } from '../lib/companyService';
import { getReceivers, createReceiver } from '../lib/receiverService';
import { getWarehouseList } from '../lib/warehouseService';
import { getItemsForDisplay } from '../lib/itemService';
import { createReleaseRequest } from '../lib/releaseRequestService';
import '../styles/CreateSupplier.css';

const MAX_NOTE = 250;

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatAddress(address, ward, district, city) {
    const parts = [address, ward, district, city].filter(Boolean);
    return parts.length ? parts.join(', ') : '';
}

// ─── Dialog: Tao Cong Ty ───────────────────────────────────────────────────

function CreateCompanyDialog({ open, onClose, onSuccess }) {
    const [form, setForm] = useState({ companyName: '' });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async () => {
        if (!form.companyName.trim()) { setError('Vui long nhap ten cong ty.'); return; }
        setSubmitting(true);
        setError('');
        try {
            const result = await createCompany({ companyName: form.companyName.trim() });
            setForm({ companyName: '' });
            onSuccess(result);
            onClose();
        } catch (err) {
            setError(err?.message || 'Tao cong ty that bai.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleClose = () => {
        if (!submitting) { setForm({ companyName: '' }); setError(''); onClose(); }
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
            <DialogTitle sx={{ fontWeight: 600, fontSize: '16px' }}>Tao cong ty moi</DialogTitle>
            <DialogContent>
                <TextField
                    label="Ten cong ty"
                    value={form.companyName}
                    onChange={e => setForm({ companyName: e.target.value })}
                    fullWidth margin="normal"
                    error={Boolean(error)}
                    helperText={error}
                    autoFocus
                    onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                />
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <button type="button" onClick={handleClose} className="btn btn-cancel" disabled={submitting}>Huy</button>
                <button type="button" onClick={handleSubmit} className="btn btn-primary" disabled={submitting}>
                    {submitting ? <><CircularProgress size={14} /> Dang tao...</> : 'Tao'}
                </button>
            </DialogActions>
        </Dialog>
    );
}

// ─── Dialog: Tao Nguoi Nhan ─────────────────────────────────────────────────

function CreateReceiverDialog({ open, onClose, onSuccess, companyId, companyName }) {
    const [form, setForm] = useState({
        receiverName: '', phone: '', email: '', position: '',
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const set = (name, value) => setForm(prev => ({ ...prev, [name]: value }));

    const handleSubmit = async () => {
        if (!form.receiverName.trim()) { setError('Vui long nhap ten nguoi nhan.'); return; }
        if (!form.phone.trim()) { setError('Vui long nhap so dien thoai.'); return; }
        setSubmitting(true);
        setError('');
        try {
            const result = await createReceiver({
                receiverName: form.receiverName.trim(),
                phone: form.phone.trim(),
                email: form.email?.trim() || null,
                position: form.position?.trim() || null,
                companyId: companyId || null,
            });
            setForm({ receiverName: '', phone: '', email: '', position: '' });
            onSuccess(result);
            onClose();
        } catch (err) {
            setError(err?.message || 'Tao nguoi nhan that bai.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleClose = () => {
        if (!submitting) { setForm({ receiverName: '', phone: '', email: '', position: '' }); setError(''); onClose(); }
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ fontWeight: 600, fontSize: '16px' }}>
                Tao nguoi nhan moi
                {companyName && (
                    <span style={{ display: 'block', fontSize: '13px', fontWeight: 400, color: '#6b7280', marginTop: 4 }}>
                        Cong ty: {companyName}
                    </span>
                )}
            </DialogTitle>
            <DialogContent>
                <TextField label="Ten nguoi nhan *" value={form.receiverName}
                    onChange={e => set('receiverName', e.target.value)} fullWidth margin="normal" autoFocus />
                <TextField label="So dien thoai *" value={form.phone}
                    onChange={e => set('phone', e.target.value)} fullWidth margin="normal" />
                <TextField label="Email" value={form.email}
                    onChange={e => set('email', e.target.value)} fullWidth margin="normal" />
                <TextField label="Chuc vu" value={form.position}
                    onChange={e => set('position', e.target.value)} fullWidth margin="normal" />
                {error && (
                    <div style={{ color: '#ef4444', fontSize: '13px', marginTop: 8 }}>{error}</div>
                )}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <button type="button" onClick={handleClose} className="btn btn-cancel" disabled={submitting}>Huy</button>
                <button type="button" onClick={handleSubmit} className="btn btn-primary" disabled={submitting}>
                    {submitting ? <><CircularProgress size={14} /> Dang tao...</> : 'Tao'}
                </button>
            </DialogActions>
        </Dialog>
    );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function CreateReleaseRequest() {
    const navigate = useNavigate();
    const { toast, showToast, clearToast } = useToast();
    const [submitting, setSubmitting] = useState(false);

    // ── Dialogs
    const [companyDialogOpen, setCompanyDialogOpen] = useState(false);
    const [receiverDialogOpen, setReceiverDialogOpen] = useState(false);

    // ── Data lists
    const [companies, setCompanies] = useState([]);
    const [receivers, setReceivers] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    // ── Step 1 — Nguoi giao hang
    const [selectedCompanyId, setSelectedCompanyId] = useState('');
    const [selectedReceiverId, setSelectedReceiverId] = useState('');
    const [receiverDetail, setReceiverDetail] = useState(null);

    // ── Step 2 — Kho xuat
    const [form, setForm] = useState({
        warehouseId: '', warehouseName: '',
        expectedDate: new Date().toISOString().slice(0, 10),
        purpose: '', note: '',
    });

    // ── Step 3 — Vat tu
    const [lineItems, setLineItems] = useState([]);
    const [showItemSearch, setShowItemSearch] = useState(false);
    const [itemKeyword, setItemKeyword] = useState('');
    const [selectedItemIds, setSelectedItemIds] = useState([]);

    // ── Address mode
    const [addressMode, setAddressMode] = useState('default');
    const [customAddress, setCustomAddress] = useState({
        address: '', city: '', district: '', ward: '',
    });

    // ── Load data
    useEffect(() => {
        const fetchAll = async () => {
            setLoading(true);
            try {
                const [c, w, i] = await Promise.all([
                    getCompanies({ pageSize: 1000 }),
                    getWarehouseList({ pageSize: 100 }),
                    getItemsForDisplay(),
                ]);
                setCompanies(Array.isArray(c) ? c : (c.items ?? []));
                setWarehouses(w.items ?? []);
                setItems(Array.isArray(i) ? i : []);
            } catch {
                showToast('Khong tai duoc danh sach. Vui long thu lai.', 'error');
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, [showToast]);

    const loadReceivers = useCallback(async (companyId) => {
        if (!companyId) { setReceivers([]); return; }
        try {
            const r = await getReceivers({ companyId, pageSize: 1000 });
            setReceivers(r.items ?? []);
        } catch { setReceivers([]); }
    }, []);

    const handleCompanyChange = (e) => {
        const id = Number(e.target.value);
        setSelectedCompanyId(id);
        setSelectedReceiverId('');
        setReceiverDetail(null);
        setAddressMode('default');
        setCustomAddress({ address: '', city: '', district: '', ward: '' });
        loadReceivers(id);
    };

    const handleReceiverChange = (e) => {
        const id = Number(e.target.value);
        setSelectedReceiverId(id);
        if (id) {
            const r = receivers.find(x => (x.receiverId ?? x.ReceiverId) === id);
            setReceiverDetail(r || null);
            setAddressMode('default');
            setCustomAddress({ address: '', city: '', district: '', ward: '' });
        } else {
            setReceiverDetail(null);
        }
    };

    const handleWarehouseChange = (e) => {
        const val = e.target.value;
        const id = val === '' ? '' : Number(val);
        const found = id !== '' ? (warehouses.find(w => (w.warehouseId ?? w.WarehouseId) === id)) : null;
        setForm(prev => ({ ...prev, warehouseId: id, warehouseName: found?.warehouseName ?? '' }));
    };

    const handleCreateCompanySuccess = (result) => {
        const newCompany = {
            companyId: result?.companyId,
            companyName: result?.companyName ?? '',
        };
        setCompanies(prev => [newCompany, ...prev]);
        setSelectedCompanyId(newCompany.companyId);
        setSelectedReceiverId('');
        setReceiverDetail(null);
        loadReceivers(newCompany.companyId);
        showToast('Tao cong ty thanh cong!', 'success');
    };

    const handleCreateReceiverSuccess = (result) => {
        const newReceiver = {
            receiverId: result?.receiverId ?? result?.ReceiverId,
            receiverName: result?.receiverName ?? result?.ReceiverName ?? '',
            phone: result?.phone ?? result?.Phone ?? '',
            email: result?.email ?? result?.Email ?? '',
            address: result?.address ?? result?.Address ?? '',
            city: result?.city ?? result?.City ?? '',
            district: result?.district ?? result?.District ?? '',
            ward: result?.ward ?? result?.Ward ?? '',
            position: result?.position ?? result?.Position ?? '',
        };
        setReceivers(prev => [newReceiver, ...prev]);
        setSelectedReceiverId(newReceiver.receiverId);
        setReceiverDetail(newReceiver);
        showToast('Tao nguoi nhan thanh cong!', 'success');
    };

    // ── Item selection
    const filteredItems = useMemo(() => {
        if (!form.warehouseId) return [];
        if (!itemKeyword.trim()) return items.filter(it => (it.onHandQty ?? 0) > 0);
        const kw = itemKeyword.toLowerCase();
        return items.filter(it =>
            (it.onHandQty ?? 0) > 0 &&
            ((it.itemName ?? '').toLowerCase().includes(kw) || (it.itemCode ?? '').toLowerCase().includes(kw))
        );
    }, [items, itemKeyword, form.warehouseId]);

    const handleSelectItem = (item) => {
        const id = item.itemId ?? item.ItemId;
        if (lineItems.find(l => (l.itemId ?? l.ItemId) === id)) {
            showToast('Vat tu da co trong danh sach!', 'warning'); return;
        }
        setLineItems(prev => [...prev, {
            id: Date.now(), itemId: id,
            itemName: item.itemName ?? '', itemCode: item.itemCode ?? '',
            uomName: item.uomName ?? item.baseUomName ?? '', uomId: item.uomId ?? null,
            availableQty: item.onHandQty ?? 0, quantity: 1, note: '',
        }]);
        setItemKeyword(''); setShowItemSearch(false);
        showToast('Da them vat tu', 'success');
    };

    const toggleItem = (id) => {
        setSelectedItemIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const addSelectedItems = () => {
        if (!selectedItemIds.length) { showToast('Chon it nhat 1 vat tu', 'warning'); return; }
        const toAdd = items.filter(it => selectedItemIds.includes(it.itemId ?? it.ItemId));
        const existing = new Set(lineItems.map(l => l.itemId ?? l.ItemId));
        const newLines = toAdd.filter(it => !existing.has(it.itemId ?? it.ItemId)).map(it => ({
            id: Date.now() + Math.random(),
            itemId: it.itemId ?? it.ItemId,
            itemName: it.itemName ?? '', itemCode: it.itemCode ?? '',
            uomName: it.uomName ?? it.baseUomName ?? '', uomId: it.uomId ?? null,
            availableQty: it.onHandQty ?? 0, quantity: 1, note: '',
        }));
        if (newLines.length) setLineItems(prev => [...prev, ...newLines]);
        setItemKeyword(''); setShowItemSearch(false); setSelectedItemIds([]);
        showToast('Da them ' + newLines.length + ' vat tu', 'success');
    };

    const updateLine = (index, field, value) =>
        setLineItems(prev => prev.map((l, i) => i === index ? { ...l, [field]: value } : l));

    const removeLine = (index) => setLineItems(prev => prev.filter((_, i) => i !== index));

    const selectedCompany = companies.find(c => (c.companyId ?? c.CompanyId) === selectedCompanyId);
    const summary = useMemo(() => ({
        itemCount: lineItems.length,
        totalQty: lineItems.reduce((s, l) => s + (Number(l.quantity) || 0), 0),
    }), [lineItems]);

    const canSubmit = useMemo(() =>
        Boolean(selectedCompanyId) &&
        Boolean(selectedReceiverId) &&
        Boolean(form.warehouseId) &&
        Boolean(form.purpose?.trim()) &&
        lineItems.length > 0,
        [selectedCompanyId, selectedReceiverId, form, lineItems]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedCompanyId) { showToast('Vui long chon cong ty.', 'error'); return; }
        if (!selectedReceiverId) { showToast('Vui long chon nguoi nhan.', 'error'); return; }
        if (!form.warehouseId) { showToast('Vui long chon kho xuat.', 'error'); return; }
        if (!form.purpose?.trim()) { showToast('Vui long nhap ly do xuat hang.', 'error'); return; }
        if (!lineItems.length) { showToast('Vui long them it nhat 1 vat tu.', 'error'); return; }

        setSubmitting(true);
        try {
            let address = '', city = '', district = '', ward = '', addressId = null;
            if (addressMode === 'default' && receiverDetail) {
                address = receiverDetail.address || '';
                city = receiverDetail.city || '';
                district = receiverDetail.district || '';
                ward = receiverDetail.ward || '';
                addressId = receiverDetail.addressId || null;
            } else if (addressMode === 'custom') {
                address = customAddress.address || '';
                city = customAddress.city || '';
                district = customAddress.district || '';
                ward = customAddress.ward || '';
            }

            await createReleaseRequest({
                warehouseId: form.warehouseId,
                receiverId: selectedReceiverId,
                companyId: selectedCompanyId,
                expectedDate: form.expectedDate || null,
                purpose: form.purpose?.trim() || null,
                note: form.note?.trim() || null,
                addressId,
                address,
                city,
                district,
                ward,
                lines: lineItems.map(l => ({
                    itemId: l.itemId,
                    requestedQty: l.quantity,
                    uomId: l.uomId,
                    note: l.note?.trim() || null,
                })),
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

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                <CircularProgress />
            </div>
        );
    }

    return (
        <div className="create-supplier-page">
            {/* Header */}
            <div className="page-header">
                <div className="page-header-left">
                    <button type="button" onClick={() => navigate(-1)} className="back-button">
                        <ArrowLeft size={20} /><span>Quay lai</span>
                    </button>
                </div>
                <div className="page-header-actions">
                    <button type="button" onClick={() => navigate(-1)} className="btn btn-cancel" disabled={submitting}>
                        <X size={15} />Huy
                    </button>
                    <button type="button" className="btn btn-primary" disabled={!canSubmit || submitting} onClick={handleSubmit}>
                        {submitting ? (
                            <><Loader size={15} className="spinner" />Dang xu ly...</>
                        ) : (
                            <><Send size={15} />Tao Yeu Cau Xuat Hang</>
                        )}
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

                        {/* LEFT */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

                            {/* STEP 1: Nguoi giao hang */}
                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">
                                        <span style={{ marginRight: 8, color: '#2196F3', fontWeight: 700 }}>1</span>
                                        Nguoi giao hang
                                    </h2>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    {/* 1.1 Cong ty */}
                                    <div className="form-field">
                                        <label className="form-label">Cong ty <span className="required-mark">*</span></label>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <div className="input-wrapper" style={{ flex: 1 }}>
                                                <Building2 className="input-icon" size={16} />
                                                <select
                                                    value={selectedCompanyId}
                                                    onChange={handleCompanyChange}
                                                    className="form-input"
                                                    style={{ paddingLeft: 40 }}
                                                >
                                                    <option value="">Chon cong ty</option>
                                                    {companies.map(c => (
                                                        <option key={c.companyId ?? c.CompanyId} value={c.companyId ?? c.CompanyId}>
                                                            {c.companyName ?? c.CompanyName ?? ''}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setCompanyDialogOpen(true)}
                                                className="btn btn-secondary"
                                                title="Tao cong ty moi"
                                            >
                                                <Plus size={15} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* 1.2 Nguoi nhan */}
                                    <div className="form-field">
                                        <label className="form-label">Nguoi nhan <span className="required-mark">*</span></label>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <div className="input-wrapper" style={{ flex: 1 }}>
                                                <User className="input-icon" size={16} />
                                                <select
                                                    value={selectedReceiverId}
                                                    onChange={handleReceiverChange}
                                                    className="form-input"
                                                    style={{ paddingLeft: 40 }}
                                                    disabled={!selectedCompanyId}
                                                >
                                                    <option value="">
                                                        {!selectedCompanyId ? 'Chon cong ty truoc' : 'Chon nguoi nhan'}
                                                    </option>
                                                    {receivers.map(r => (
                                                        <option key={r.receiverId ?? r.ReceiverId} value={r.receiverId ?? r.ReceiverId}>
                                                            {r.receiverName ?? r.ReceiverName ?? ''}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setReceiverDialogOpen(true)}
                                                className="btn btn-secondary"
                                                disabled={!selectedCompanyId}
                                                title="Tao nguoi nhan moi"
                                            >
                                                <Plus size={15} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* 1.3 Thong tin nguoi nhan (auto-fill) */}
                                    {receiverDetail && (
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                            <div className="form-field" style={{ margin: 0 }}>
                                                <label className="form-label">So dien thoai</label>
                                                <div className="input-wrapper">
                                                    <Phone className="input-icon" size={16} />
                                                    <input
                                                        type="text"
                                                        value={receiverDetail.phone || ''}
                                                        readOnly
                                                        className="form-input"
                                                        style={{ backgroundColor: '#f5f5f5' }}
                                                    />
                                                </div>
                                            </div>
                                            <div className="form-field" style={{ margin: 0 }}>
                                                <label className="form-label">Email</label>
                                                <div className="input-wrapper">
                                                    <Mail className="input-icon" size={16} />
                                                    <input
                                                        type="email"
                                                        value={receiverDetail.email || ''}
                                                        readOnly
                                                        className="form-input"
                                                        style={{ backgroundColor: '#f5f5f5' }}
                                                    />
                                                </div>
                                            </div>
                                            {receiverDetail.position && (
                                                <div className="form-field" style={{ margin: 0, gridColumn: '1 / -1' }}>
                                                    <label className="form-label">Chuc vu</label>
                                                    <div className="input-wrapper">
                                                        <Briefcase className="input-icon" size={16} />
                                                        <input
                                                            type="text"
                                                            value={receiverDetail.position || ''}
                                                            readOnly
                                                            className="form-input"
                                                            style={{ backgroundColor: '#f5f5f5' }}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* 1.4 Dia chi giao hang */}
                                    {receiverDetail && (
                                        <div className="form-field" style={{ margin: 0 }}>
                                            <label className="form-label">Dia chi giao hang</label>
                                            <RadioGroup
                                                value={addressMode}
                                                onChange={e => setAddressMode(e.target.value)}
                                            >
                                                <FormControlLabel
                                                    value="default"
                                                    control={<Radio size="small" />}
                                                    label={<span style={{ fontSize: '14px' }}>Su dung dia chi mac dinh</span>}
                                                />
                                                {addressMode === 'default' && (
                                                    <div style={{
                                                        marginLeft: 32, marginTop: 8,
                                                        padding: '12px 16px',
                                                        backgroundColor: '#f0f9ff',
                                                        borderRadius: 8, fontSize: '13px', color: '#374151',
                                                        border: '1px solid #e0f2fe',
                                                    }}>
                                                        <MapPin size={14} style={{ marginRight: 6, color: '#2196F3', verticalAlign: 'middle' }} />
                                                        {formatAddress(
                                                            receiverDetail.address,
                                                            receiverDetail.ward,
                                                            receiverDetail.district,
                                                            receiverDetail.city
                                                        ) || <span style={{ color: '#9ca3af' }}>Chua co dia chi</span>}
                                                    </div>
                                                )}

                                                <FormControlLabel
                                                    value="custom"
                                                    control={<Radio size="small" />}
                                                    label={<span style={{ fontSize: '14px' }}>Ghi de dia chi khac</span>}
                                                />
                                                {addressMode === 'custom' && (
                                                    <div style={{ marginLeft: 32, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                        <TextField
                                                            label="Dia chi cu the"
                                                            value={customAddress.address}
                                                            onChange={e => setCustomAddress(prev => ({ ...prev, address: e.target.value }))}
                                                            size="small" fullWidth
                                                        />
                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                                            <TextField
                                                                label="Thanh pho / Tinh"
                                                                value={customAddress.city}
                                                                onChange={e => setCustomAddress(prev => ({ ...prev, city: e.target.value }))}
                                                                size="small" fullWidth
                                                            />
                                                            <TextField
                                                                label="Quan / Huyen"
                                                                value={customAddress.district}
                                                                onChange={e => setCustomAddress(prev => ({ ...prev, district: e.target.value }))}
                                                                size="small" fullWidth
                                                            />
                                                        </div>
                                                        <TextField
                                                            label="Phuong / Xa"
                                                            value={customAddress.ward}
                                                            onChange={e => setCustomAddress(prev => ({ ...prev, ward: e.target.value }))}
                                                            size="small" fullWidth
                                                        />
                                                    </div>
                                                )}
                                            </RadioGroup>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* STEP 2: Kho xuat */}
                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">
                                        <span style={{ marginRight: 8, color: '#2196F3', fontWeight: 700 }}>2</span>
                                        Kho xuat hang
                                    </h2>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    <div className="form-field">
                                        <label className="form-label">Kho xuat <span className="required-mark">*</span></label>
                                        <div className="input-wrapper">
                                            <MapPin className="input-icon" size={16} />
                                            <select
                                                value={form.warehouseId}
                                                onChange={handleWarehouseChange}
                                                className="form-input"
                                                style={{ paddingLeft: 40 }}
                                            >
                                                <option value="">Chon kho xuat</option>
                                                {warehouses.map(w => (
                                                    <option key={w.warehouseId ?? w.WarehouseId} value={w.warehouseId ?? w.WarehouseId}>
                                                        {w.warehouseName ?? w.WarehouseName ?? ''}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="form-field">
                                        <label className="form-label">Ngay xuat du kien</label>
                                        <div className="input-wrapper">
                                            <svg className="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                                <line x1="16" y1="2" x2="16" y2="6" />
                                                <line x1="8" y1="2" x2="8" y2="6" />
                                                <line x1="3" y1="10" x2="21" y2="10" />
                                            </svg>
                                            <input
                                                type="date"
                                                value={form.expectedDate}
                                                onChange={e => setForm(prev => ({ ...prev, expectedDate: e.target.value }))}
                                                className="form-input"
                                            />
                                        </div>
                                    </div>

                                    <div className="form-field">
                                        <label className="form-label">Ly do xuat hang <span className="required-mark">*</span></label>
                                        <div className="input-wrapper">
                                            <Package className="input-icon" size={16} />
                                            <input
                                                type="text"
                                                value={form.purpose || ''}
                                                onChange={e => setForm(prev => ({ ...prev, purpose: e.target.value }))}
                                                placeholder="VD: Ban hang, Tra hang, Xuat kho..."
                                                className="form-input"
                                                style={{ paddingLeft: 40 }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* STEP 3: Vat tu yeu cau xuat */}
                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">
                                        <span style={{ marginRight: 8, color: '#2196F3', fontWeight: 700 }}>3</span>
                                        Vat tu yeu cau xuat
                                    </h2>
                                    {form.warehouseId && (
                                        <button
                                            type="button"
                                            onClick={() => { setShowItemSearch(true); setItemKeyword(''); setSelectedItemIds([]); }}
                                            className="btn btn-sm"
                                            style={{ fontSize: '14px', fontWeight: 600 }}
                                        >
                                            <Plus size={16} />Them vat tu
                                        </button>
                                    )}
                                </div>

                                {!form.warehouseId ? (
                                    <div style={{
                                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                                        justifyContent: 'center', gap: 12, padding: '40px 20px', color: '#9ca3af'
                                    }}>
                                        <PackageOpen size={48} strokeWidth={1.5} />
                                        <p style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>Vui long chon kho xuat truoc</p>
                                        <p style={{ fontSize: 13, margin: 0, color: '#64748b' }}>Vat tu co trong kho se hien thi o day</p>
                                    </div>
                                ) : (
                                    <>
                                        {showItemSearch && (
                                            <div style={{ marginBottom: 16, position: 'relative' }}>
                                                <div style={{ position: 'relative' }}>
                                                    <Search size={20} style={{
                                                        position: 'absolute', left: 12, top: '50%',
                                                        transform: 'translateY(-50%)', color: '#9ca3af', zIndex: 1
                                                    }} />
                                                    <input
                                                        type="text"
                                                        value={itemKeyword}
                                                        autoFocus
                                                        onChange={e => { setItemKeyword(e.target.value); setSelectedItemIds([]); }}
                                                        placeholder="Tim theo ten hoac ma vat tu..."
                                                        style={{
                                                            width: '100%', padding: '12px 44px',
                                                            border: '2px solid #2196F3', borderRadius: 10,
                                                            fontSize: 14, outline: 'none',
                                                            boxShadow: '0 0 0 4px rgba(33,150,243,0.1)',
                                                        }}
                                                    />
                                                    <button type="button" onClick={() => setShowItemSearch(false)}
                                                        style={{
                                                            position: 'absolute', right: 8, top: '50%',
                                                            transform: 'translateY(-50%)',
                                                            background: 'transparent', border: 'none',
                                                            cursor: 'pointer', padding: 4, color: '#6b7280'
                                                        }}>
                                                        <X size={20} />
                                                    </button>
                                                </div>

                                                <div style={{
                                                    position: 'absolute', top: '100%', left: 0, right: 0,
                                                    marginTop: 4, backgroundColor: '#fff',
                                                    border: '1px solid #e5e7eb', borderRadius: 10,
                                                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                                                    maxHeight: 400, overflowY: 'auto', zIndex: 100,
                                                }}>
                                                    {filteredItems.length === 0 ? (
                                                        <div style={{ padding: 24, textAlign: 'center', color: '#9ca3af' }}>
                                                            <Package size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                                                            <p style={{ margin: 0, fontSize: 13 }}>Khong co vat tu nao trong kho nay</p>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            {filteredItems.map(item => (
                                                                <div key={item.itemId ?? item.ItemId}
                                                                    style={{
                                                                        padding: '12px 16px', borderBottom: '1px solid #f3f4f6',
                                                                        display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                                                                    }}
                                                                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f9fafb'}
                                                                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                                                    onClick={() => handleSelectItem(item)}
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={selectedItemIds.includes(item.itemId ?? item.ItemId)}
                                                                        onChange={e => { e.stopPropagation(); toggleItem(item.itemId ?? item.ItemId); }}
                                                                        onClick={e => e.stopPropagation()}
                                                                        style={{ cursor: 'pointer', width: 16, height: 16, flexShrink: 0 }}
                                                                    />
                                                                    <div style={{
                                                                        width: 40, height: 40, display: 'flex', alignItems: 'center',
                                                                        justifyContent: 'center', borderRadius: 6,
                                                                        border: '1px solid #e5e7eb', backgroundColor: '#f3f4f6', flexShrink: 0
                                                                    }}>
                                                                        <ImageIcon size={20} color="#9ca3af" />
                                                                    </div>
                                                                    <div style={{ flex: 1 }}>
                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                                                            <span style={{ fontSize: 14, fontWeight: 500, color: '#1f2937' }}>
                                                                                {item.itemName}
                                                                            </span>
                                                                            <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>
                                                                                Ton: {(item.onHandQty ?? 0).toLocaleString()}
                                                                            </span>
                                                                        </div>
                                                                        <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#6b7280' }}>
                                                                            <span>Ma: {item.itemCode}</span>
                                                                            <span>- DVT: {item.uomName ?? item.baseUomName}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                            {selectedItemIds.length > 0 && (
                                                                <div style={{
                                                                    padding: 12, borderTop: '2px solid #e5e7eb',
                                                                    backgroundColor: '#f9fafb', position: 'sticky', bottom: 0
                                                                }}>
                                                                    <button type="button" onClick={addSelectedItems}
                                                                        className="btn btn-sm"
                                                                        style={{ width: '100%', backgroundColor: '#2196F3', color: '#fff', border: 'none', fontWeight: 600 }}
                                                                    >
                                                                        <Plus size={16} />Them {selectedItemIds.length} vat tu
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
                                                                        <div style={{
                                                                            width: 40, height: 40, display: 'flex', alignItems: 'center',
                                                                            justifyContent: 'center', borderRadius: 6,
                                                                            border: '1px solid #e5e7eb', backgroundColor: '#f3f4f6', flexShrink: 0
                                                                        }}>
                                                                            <ImageIcon size={20} color="#9ca3af" />
                                                                        </div>
                                                                        <div>
                                                                            <div style={{ fontSize: 14, fontWeight: 500, color: '#1f2937' }}>{line.itemName}</div>
                                                                            <div style={{ fontSize: 12, color: '#6b7280' }}>
                                                                                Ma: {line.itemCode} - DVT: {line.uomName}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td style={{ textAlign: 'right', color: '#64748b', fontSize: 13 }}>
                                                                    {line.availableQty.toLocaleString()}
                                                                </td>
                                                                <td>
                                                                    <input
                                                                        type="number"
                                                                        value={line.quantity ?? ''}
                                                                        onChange={e => updateLine(idx, 'quantity', Number(e.target.value))}
                                                                        min="0"
                                                                        className="form-input"
                                                                        style={{ textAlign: 'right' }}
                                                                    />
                                                                </td>
                                                                <td style={{ textAlign: 'center' }}>
                                                                    <button type="button" onClick={() => removeLine(idx)}
                                                                        className="btn-icon-only" style={{ color: '#ef4444' }}>
                                                                        <Trash2 size={18} />
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <div style={{
                                                display: 'flex', flexDirection: 'column', alignItems: 'center',
                                                justifyContent: 'center', gap: 12, padding: '40px 20px', color: '#9ca3af'
                                            }}>
                                                <PackageOpen size={48} strokeWidth={1.5} />
                                                <p style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>Chua co vat tu nao</p>
                                                <p style={{ fontSize: 13, margin: 0, color: '#64748b' }}>Nhan "Them vat tu" de bat dau</p>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                        {/* RIGHT: Summary + Ghi chu */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Tong quan</h2>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                                        <span style={{ color: '#64748b' }}>Cong ty:</span>
                                        <span style={{ fontWeight: 500, color: '#374151', textAlign: 'right', maxWidth: 180 }}>
                                            {selectedCompany?.companyName ?? '-'}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                                        <span style={{ color: '#64748b' }}>Nguoi nhan:</span>
                                        <span style={{ fontWeight: 500, color: '#374151', textAlign: 'right', maxWidth: 180 }}>
                                            {receiverDetail?.receiverName ?? '-'}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                                        <span style={{ color: '#64748b' }}>Kho xuat:</span>
                                        <span style={{ fontWeight: 500, color: '#374151', textAlign: 'right', maxWidth: 180 }}>
                                            {form.warehouseName || '-'}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                                        <span style={{ color: '#64748b' }}>So vat tu:</span>
                                        <span style={{ fontWeight: 600 }}>{summary.itemCount}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                                        <span style={{ color: '#64748b' }}>Tong so luong:</span>
                                        <span style={{ fontWeight: 600 }}>{summary.totalQty.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Ghi chu</h2>
                                </div>
                                <div className="form-field">
                                    <textarea
                                        name="note"
                                        value={form.note}
                                        onChange={e => {
                                            if (e.target.value.length <= MAX_NOTE)
                                                setForm(prev => ({ ...prev, note: e.target.value }));
                                        }}
                                        className="form-textarea"
                                        rows={4}
                                        placeholder="Nhap ghi chu (neu co)"
                                        style={{ width: '100%', minHeight: 100 }}
                                    />
                                    <div style={{
                                        display: 'flex', justifyContent: 'flex-end', marginTop: 4,
                                        fontSize: 12, color: form.note.length >= MAX_NOTE ? '#ef4444' : '#6b7280'
                                    }}>
                                        {form.note.length}/{MAX_NOTE}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </form>
            </div>

            {/* Dialogs */}
            <CreateCompanyDialog
                open={companyDialogOpen}
                onClose={() => setCompanyDialogOpen(false)}
                onSuccess={handleCreateCompanySuccess}
            />
            <CreateReceiverDialog
                open={receiverDialogOpen}
                onClose={() => setReceiverDialogOpen(false)}
                onSuccess={handleCreateReceiverSuccess}
                companyId={selectedCompanyId}
                companyName={selectedCompany?.companyName ?? ''}
            />

            {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}
        </div>
    );
}
