// Create Release Request
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Plus, X, MapPin, User, Send, Loader,
    Package, ImageIcon, Search, PackageOpen, Trash2,
    Building2, Phone, Mail, Briefcase, Save,
} from 'lucide-react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField,
    CircularProgress,
} from '@mui/material';
import Toast from '../../components/Toast/Toast';
import { useToast } from '../hooks/useToast';
import { getCompanies, createCompany } from '../lib/companyService';
import { getReceivers, createReceiver, getReceiversByCompany } from '../lib/receiverService';
import { getAddressesByCompany, createAddress } from '../lib/addressService';
import { getWarehouseList } from '../lib/warehouseService';
import { getItemsForDisplay, getItemsByWarehouse } from '../lib/itemService';
import { createReleaseRequest, submitReleaseRequest } from '../lib/releaseRequestService';
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
        if (!form.companyName.trim()) { setError('Vui lòng nhập tên công ty.'); return; }
        setSubmitting(true);
        setError('');
        try {
            const result = await createCompany({ companyName: form.companyName.trim() });
            setForm({ companyName: '' });
            onSuccess(result);
            onClose();
        } catch (err) {
            setError(err?.message || 'Tạo công ty thất bại.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleClose = () => {
        if (!submitting) { setForm({ companyName: '' }); setError(''); onClose(); }
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
            <DialogTitle sx={{ fontWeight: 600, fontSize: '16px' }}>Tạo công ty mới</DialogTitle>
            <DialogContent>
                <TextField
                    label="Tên công ty"
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
                <button type="button" onClick={handleClose} className="btn btn-cancel" disabled={submitting}>Hủy</button>
                <button type="button" onClick={handleSubmit} className="btn btn-primary" disabled={submitting}>
                    {submitting ? <><CircularProgress size={14} /> Đang tạo...</> : 'Tạo'}
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
        if (!form.receiverName.trim()) { setError('Vui lòng nhập tên người nhận.'); return; }
        if (!form.phone.trim()) { setError('Vui lòng nhập số điện thoại.'); return; }
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
            setError(err?.message || 'Tạo người nhận thất bại.');
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
                Tạo người nhận mới
                {companyName && (
                    <span style={{ display: 'block', fontSize: '13px', fontWeight: 400, color: '#6b7280', marginTop: 4 }}>
                        Công ty: {companyName}
                    </span>
                )}
            </DialogTitle>
            <DialogContent>
                <TextField label="Tên người nhận *" value={form.receiverName}
                    onChange={e => set('receiverName', e.target.value)} fullWidth margin="normal" autoFocus />
                <TextField label="Số điện thoại *" value={form.phone}
                    onChange={e => set('phone', e.target.value)} fullWidth margin="normal" />
                <TextField label="Email" value={form.email}
                    onChange={e => set('email', e.target.value)} fullWidth margin="normal" />
                <TextField label="Chức vụ" value={form.position}
                    onChange={e => set('position', e.target.value)} fullWidth margin="normal" />
                {error && (
                    <div style={{ color: '#ef4444', fontSize: '13px', marginTop: 8 }}>{error}</div>
                )}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <button type="button" onClick={handleClose} className="btn btn-cancel" disabled={submitting}>Hủy</button>
                <button type="button" onClick={handleSubmit} className="btn btn-primary" disabled={submitting}>
                    {submitting ? <><CircularProgress size={14} /> Đang tạo...</> : 'Tạo'}
                </button>
            </DialogActions>
        </Dialog>
    );
}

// ─── Dialog: Tao Dia Chi ───────────────────────────────────────────────────

function CreateAddressDialog({ open, onClose, onSuccess, companyId, companyName }) {
    const [form, setForm] = useState({
        addressName: '',
        addressDetail: '',
        city: '',
        district: '',
        ward: '',
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const set = (name, value) => setForm(prev => ({ ...prev, [name]: value }));

    const handleSubmit = async () => {
        if (!form.addressDetail.trim()) { setError('Vui lòng nhập địa chỉ cụ thể.'); return; }
        setSubmitting(true);
        setError('');
        try {
            const result = await createAddress({
                companyId: companyId || null,
                addressName: form.addressName?.trim() || null,
                addressDetail: form.addressDetail.trim(),
                city: form.city?.trim() || null,
                district: form.district?.trim() || null,
                ward: form.ward?.trim() || null,
                isDefault: false,
            });
            setForm({ addressName: '', addressDetail: '', city: '', district: '', ward: '' });
            onSuccess(result);
            onClose();
        } catch (err) {
            setError(err?.message || 'Tạo địa chỉ thất bại.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleClose = () => {
        if (!submitting) {
            setForm({ addressName: '', addressDetail: '', city: '', district: '', ward: '' });
            setError('');
            onClose();
        }
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ fontWeight: 600, fontSize: '16px' }}>
                Tạo địa chỉ mới
                {companyName && (
                    <span style={{ display: 'block', fontSize: '13px', fontWeight: 400, color: '#6b7280', marginTop: 4 }}>
                        Công ty: {companyName}
                    </span>
                )}
            </DialogTitle>
            <DialogContent>
                <TextField
                    label="Tên địa chỉ"
                    value={form.addressName}
                    onChange={e => set('addressName', e.target.value)}
                    fullWidth margin="normal"
                    placeholder="VD: Văn phòng, Kho hàng..."
                />
                <TextField
                    label="Địa chỉ cụ thể *"
                    value={form.addressDetail}
                    onChange={e => set('addressDetail', e.target.value)}
                    fullWidth margin="normal"
                    autoFocus
                />
                <TextField
                    label="Thành phố / Tỉnh"
                    value={form.city}
                    onChange={e => set('city', e.target.value)}
                    fullWidth margin="normal"
                />
                <TextField
                    label="Quận / Huyện"
                    value={form.district}
                    onChange={e => set('district', e.target.value)}
                    fullWidth margin="normal"
                />
                <TextField
                    label="Phường / Xã"
                    value={form.ward}
                    onChange={e => set('ward', e.target.value)}
                    fullWidth margin="normal"
                />
                {error && (
                    <div style={{ color: '#ef4444', fontSize: '13px', marginTop: 8 }}>{error}</div>
                )}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <button type="button" onClick={handleClose} className="btn btn-cancel" disabled={submitting}>Hủy</button>
                <button type="button" onClick={handleSubmit} className="btn btn-primary" disabled={submitting}>
                    {submitting ? <><CircularProgress size={14} /> Đang tạo...</> : 'Tạo'}
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
    const [savingDraft, setSavingDraft] = useState(false);

    // ── Dialogs
    const [companyDialogOpen, setCompanyDialogOpen] = useState(false);
    const [receiverDialogOpen, setReceiverDialogOpen] = useState(false);
    const [addressDialogOpen, setAddressDialogOpen] = useState(false);

    // ── Data lists
    const [companies, setCompanies] = useState([]);
    const [receivers, setReceivers] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [itemsLoading, setItemsLoading] = useState(false);

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

    // ── Address
    const [addresses, setAddresses] = useState([]);
    const [selectedAddressId, setSelectedAddressId] = useState('');
    const [addressMode, setAddressMode] = useState('list'); // 'list' | 'custom'
    const [customAddress, setCustomAddress] = useState({
        address: '', city: '', district: '', ward: '',
    });

    // ── Load initial data
    useEffect(() => {
        const fetchAll = async () => {
            setLoading(true);
            try {
                const [c, w] = await Promise.all([
                    getCompanies(),
                    getWarehouseList({ pageSize: 100 }),
                ]);
                setCompanies(Array.isArray(c) ? c : (c.items ?? []));
                setWarehouses(w.items ?? []);
            } catch {
                showToast('Không tải được danh sách. Vui lòng thử lại.', 'error');
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, [showToast]);

    // ── Load items when warehouse changes
    useEffect(() => {
        if (!form.warehouseId) {
            setItems([]);
            setLineItems([]);
            return;
        }
        const fetchItems = async () => {
            setItemsLoading(true);
            setLineItems([]);
            try {
                const data = await getItemsByWarehouse(form.warehouseId);
                setItems(Array.isArray(data) ? data : []);
            } catch {
                showToast('Không tải được danh sách vật tư. Vui lòng thử lại.', 'error');
            } finally {
                setItemsLoading(false);
            }
        };
        fetchItems();
    }, [form.warehouseId, showToast]);

    const loadReceivers = useCallback(async (companyId) => {
        if (!companyId) { setReceivers([]); return; }
        try {
            const list = await getReceiversByCompany(companyId);
            setReceivers(list);
        } catch {
            setReceivers([]);
        }
    }, []);

    const loadAddresses = useCallback(async (companyId) => {
        if (!companyId) { setAddresses([]); return; }
        try {
            const list = await getAddressesByCompany(companyId);
            setAddresses(list);
            // Auto-select default address if exists
            const defaultAddr = list.find(a => a.isDefault);
            if (defaultAddr) {
                setSelectedAddressId(defaultAddr.addressId);
            } else if (list.length > 0) {
                setSelectedAddressId(list[0].addressId);
            } else {
                setSelectedAddressId('');
            }
        } catch {
            setAddresses([]);
            setSelectedAddressId('');
        }
    }, []);

    const handleCompanyChange = (e) => {
        const id = Number(e.target.value);
        setSelectedCompanyId(id);
        setSelectedReceiverId('');
        setReceiverDetail(null);
        setAddressMode('list');
        setSelectedAddressId('');
        setCustomAddress({ address: '', city: '', district: '', ward: '' });
        loadReceivers(id);
        loadAddresses(id);
    };

    const handleReceiverChange = (e) => {
        const id = Number(e.target.value);
        setSelectedReceiverId(id);
        if (id) {
            const r = receivers.find(x => (x.receiverId ?? x.ReceiverId) === id);
            setReceiverDetail(r || null);
            setAddressMode('list');
            setCustomAddress({ address: '', city: '', district: '', ward: '' });
            loadAddresses(selectedCompanyId);
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
        showToast('Tạo công ty thành công!', 'success');
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
        loadAddresses(selectedCompanyId);
        showToast('Tạo người nhận thành công!', 'success');
    };

    const handleCreateAddressSuccess = (result) => {
        const newAddress = {
            addressId: result?.addressId ?? result?.AddressId,
            companyId: result?.companyId ?? result?.CompanyId ?? selectedCompanyId,
            addressName: result?.addressName ?? result?.AddressName ?? '',
            addressDetail: result?.addressDetail ?? result?.AddressDetail ?? '',
            district: result?.district ?? result?.District ?? '',
            city: result?.city ?? result?.City ?? '',
            ward: result?.ward ?? result?.Ward ?? '',
            isDefault: result?.isDefault ?? result?.IsDefault ?? false,
        };
        setAddresses(prev => [...prev, newAddress]);
        setSelectedAddressId(newAddress.addressId);
        setAddressMode('list');
        showToast('Tạo địa chỉ thành công!', 'success');
    };

    // ── Item selection
    const filteredItems = useMemo(() => {
        if (!itemKeyword.trim()) return items.filter(it => (it.onHandQty ?? 0) > 0);
        const kw = itemKeyword.toLowerCase();
        return items.filter(it =>
            (it.onHandQty ?? 0) > 0 &&
            ((it.itemName ?? '').toLowerCase().includes(kw) || (it.itemCode ?? '').toLowerCase().includes(kw))
        );
    }, [items, itemKeyword]);

    const handleSelectItem = (item) => {
        const id = item.itemId ?? item.ItemId;
        if (lineItems.find(l => (l.itemId ?? l.ItemId) === id)) {
            showToast('Vật tư đã có trong danh sách!', 'warning'); return;
        }
        setLineItems(prev => [...prev, {
            id: Date.now() + Math.random(), itemId: id,
            itemName: item.itemName ?? '', itemCode: item.itemCode ?? '',
            uomName: item.uomName ?? item.baseUomName ?? '', uomId: item.uomId ?? null,
            availableQty: item.onHandQty ?? 0, quantity: 1, note: '',
        }]);
        setItemKeyword(''); setShowItemSearch(false);
        showToast('Đã thêm vật tư', 'success');
    };

    const toggleItem = (id) => {
        setSelectedItemIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const addSelectedItems = () => {
        if (!selectedItemIds.length) { showToast('Chọn ít nhất 1 vật tư', 'warning'); return; }
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
        showToast('Đã thêm ' + newLines.length + ' vật tư', 'success');
    };

    const updateLine = (index, field, value) =>
        setLineItems(prev => prev.map((l, i) => i === index ? { ...l, [field]: value } : l));

    const removeLine = (index) => setLineItems(prev => prev.filter((_, i) => i !== index));

    const selectedCompany = companies.find(c => (c.companyId ?? c.CompanyId) === selectedCompanyId);
    const selectedAddress = addresses.find(a => (a.addressId ?? a.AddressId) === selectedAddressId);
    const summary = useMemo(() => ({
        itemCount: lineItems.length,
        totalQty: lineItems.reduce((s, l) => s + (Number(l.quantity) || 0), 0),
    }), [lineItems]);

    const canSaveDraft = useMemo(() =>
        Boolean(selectedCompanyId) &&
        Boolean(selectedReceiverId) &&
        Boolean(form.warehouseId) &&
        lineItems.length > 0,
        [selectedCompanyId, selectedReceiverId, form.warehouseId, lineItems]);

    const canCreateRequest = useMemo(() =>
        Boolean(selectedCompanyId) &&
        Boolean(selectedReceiverId) &&
        Boolean(form.warehouseId) &&
        Boolean(form.purpose?.trim()) &&
        lineItems.length > 0,
        [selectedCompanyId, selectedReceiverId, form, lineItems]);

    const buildPayload = () => {
        let address = '', city = '', district = '', ward = '', addressId = null;
        if (addressMode === 'custom') {
            address = customAddress.address || '';
            city = customAddress.city || '';
            district = customAddress.district || '';
            ward = customAddress.ward || '';
        } else if (selectedAddressId) {
            const sel = addresses.find(a => (a.addressId ?? a.AddressId) === selectedAddressId);
            if (sel) {
                addressId = sel.addressId ?? sel.AddressId;
                address = sel.addressDetail || sel.addressName || '';
                city = sel.city || '';
                district = sel.district || '';
                ward = sel.ward || '';
            }
        }
        return {
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
        };
    };

    const handleSaveDraft = async (e) => {
        e?.preventDefault();
        setSavingDraft(true);
        try {
            await createReleaseRequest({ ...buildPayload(), status: 'DRAFT' });
            showToast('Lưu nháp thành công!', 'success');
            setTimeout(() => navigate('/release-request'), 1500);
        } catch (err) {
            const msg = err?.message || err?.response?.data?.message || 'Lưu nháp thất bại.';
            showToast(msg, 'error');
        } finally {
            setSavingDraft(false);
        }
    };

    const handleCreateRequest = async (e) => {
        e?.preventDefault();
        if (!selectedCompanyId) { showToast('Vui lòng chọn công ty.', 'error'); return; }
        if (!selectedReceiverId) { showToast('Vui lòng chọn người nhận.', 'error'); return; }
        if (!form.warehouseId) { showToast('Vui lòng chọn kho xuất.', 'error'); return; }
        if (!form.purpose?.trim()) { showToast('Vui lòng nhập lý do xuất hàng.', 'error'); return; }
        if (lineItems.length === 0) { showToast('Vui lòng thêm ít nhất 1 vật tư.', 'error'); return; }
        // Validate address: phải chọn từ dropdown HOẠC nhập custom
        if (addressMode === 'list' && !selectedAddressId) {
            showToast('Vui lòng chọn địa chỉ giao hàng.', 'error'); return;
        }
        if (addressMode === 'custom' && !customAddress.address?.trim()) {
            showToast('Vui lòng nhập địa chỉ giao hàng.', 'error'); return;
        }

        setSubmitting(true);
        try {
            await createReleaseRequest({ ...buildPayload(), status: 'PENDING_ACC' });
            showToast('Tạo yêu cầu xuất hàng thành công!', 'success');
            setTimeout(() => navigate('/release-request'), 1500);
        } catch (err) {
            const msg = err?.message || err?.response?.data?.message || 'Tạo yêu cầu xuất hàng thất bại.';
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
                        <ArrowLeft size={20} /><span>Quay lại</span>
                    </button>
                </div>
                <div className="page-header-actions">
                    <button type="button" onClick={() => navigate(-1)} className="btn btn-cancel" disabled={submitting || savingDraft}>
                        <X size={15} />Hủy
                    </button>
                    <button
                        type="button"
                        className="btn btn-secondary"
                        disabled={!canSaveDraft || savingDraft || submitting}
                        onClick={handleSaveDraft}
                        style={{ minWidth: 120 }}
                    >
                        {savingDraft ? (
                            <><Loader size={15} className="spinner" />Đang lưu...</>
                        ) : (
                            <><Save size={15} />Lưu Nháp</>
                        )}
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary"
                        disabled={!canCreateRequest || submitting || savingDraft}
                        onClick={handleCreateRequest}
                    >
                        {submitting ? (
                            <><Loader size={15} className="spinner" />Đang gửi...</>
                        ) : (
                            <><Send size={15} />Tạo Yêu Cầu Xuất Hàng</>
                        )}
                    </button>
                </div>
            </div>

            <div className="form-card">
                <form id="create-rr-form" className="form-wrapper">
                    <div className="form-card-intro">
                        <h1 className="page-title">Tạo yêu cầu xuất hàng</h1>
                        <p className="form-card-required-note">Các trường <span className="required-mark">*</span> là bắt buộc</p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24, alignItems: 'start' }}>

                        {/* LEFT */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

                            {/* STEP 1: Nguoi giao hang */}
                        <div className="info-section" style={{ margin: 0 }}>
                            <div className="section-header-with-toggle">
                                    <h2 className="section-title">
                                        <span style={{ marginRight: 8, color: '#2196F3', fontWeight: 700 }}>1</span>
                                        Người giao hàng
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
                                                    <option value="">Cọn công ty</option>
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
                                                title="Tạo công ty mới"
                                            >
                                                <Plus size={15} />
                                </button>
                                </div>
                            </div>

                                    {/* 1.2 Nguoi nhan */}
                                    <div className="form-field">
                                        <label className="form-label">Người nhận <span className="required-mark">*</span></label>
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
                                                        {!selectedCompanyId ? 'Chọn công ty trước' : 'Chọn người nhận'}
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
                                                title="Tạo người nhận mới"
                                            >
                                                <Plus size={15} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* 1.3 Thong tin nguoi nhan (auto-fill) */}
                                    {receiverDetail && (
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                            <div className="form-field" style={{ margin: 0 }}>
                                                <label className="form-label">Số điện thoại</label>
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
                                                    <label className="form-label">Chức vụ</label>
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
                                            <label className="form-label">Địa chỉ giao hàng</label>
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                <div className="input-wrapper" style={{ flex: 1 }}>
                                                    <MapPin className="input-icon" size={16} />
                                                    <select
                                                        value={selectedAddressId}
                                                        onChange={e => {
                                                            setSelectedAddressId(e.target.value);
                                                            if (e.target.value) setAddressMode('list');
                                                        }}
                                                        className="form-input"
                                                        style={{ paddingLeft: 40 }}
                                                    >
                                                        <option value="">Cọn địa chỉ</option>
                                                        {addresses.map(a => (
                                                            <option
                                                                key={a.addressId ?? a.AddressId}
                                                                value={a.addressId ?? a.AddressId}
                                                            >
                                                                {a.addressName
                                                                    ? `${a.addressName} - ${formatAddress(a.addressDetail, a.ward, a.district, a.city)}`
                                                                    : formatAddress(a.addressDetail, a.ward, a.district, a.city) || 'Địa chỉ'}
                                                                {(a.isDefault) ? ' (Mặc định)' : ''}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => { setAddressMode('custom'); setSelectedAddressId(''); }}
                                                    className="btn btn-secondary"
                                                    title="Nhap dia chi khac"
                                                >
                                                    <Plus size={15} />
                                                </button>
                                            </div>
                                            {addressMode === 'custom' && (
                                                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                    <TextField
                                                        label="Địa chỉ cụ thể"
                                                        value={customAddress.address}
                                                        onChange={e => setCustomAddress(prev => ({ ...prev, address: e.target.value }))}
                                                        size="small" fullWidth
                                                    />
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                                        <TextField
                                                            label="Thành phố / Tỉnh"
                                                            value={customAddress.city}
                                                            onChange={e => setCustomAddress(prev => ({ ...prev, city: e.target.value }))}
                                                            size="small" fullWidth
                                                        />
                                                        <TextField
                                                            label="Quận / Huyện"
                                                            value={customAddress.district}
                                                            onChange={e => setCustomAddress(prev => ({ ...prev, district: e.target.value }))}
                                                            size="small" fullWidth
                                                        />
                                                    </div>
                                                    <TextField
                                                        label="Phường / Xã"
                                                        value={customAddress.ward}
                                                        onChange={e => setCustomAddress(prev => ({ ...prev, ward: e.target.value }))}
                                                        size="small" fullWidth
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* STEP 2: Kho xuat */}
                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">
                                        <span style={{ marginRight: 8, color: '#2196F3', fontWeight: 700 }}>2</span>
                                        Kho xuất hàng
                                    </h2>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    <div className="form-field">
                                        <label className="form-label">Kho xuất <span className="required-mark">*</span></label>
                                        <div className="input-wrapper">
                                            <MapPin className="input-icon" size={16} />
                                            <select
                                                value={form.warehouseId}
                                                onChange={handleWarehouseChange}
                                                className="form-input"
                                                style={{ paddingLeft: 40 }}
                                            >
                                                <option value="">Cọn kho xuất</option>
                                                {warehouses.map(w => (
                                                    <option key={w.warehouseId ?? w.WarehouseId} value={w.warehouseId ?? w.WarehouseId}>
                                                        {w.warehouseName ?? w.WarehouseName ?? ''}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="form-field">
                                        <label className="form-label">Ngày xuất dự kiến</label>
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
                                        <label className="form-label">Lý do xuất hàng <span className="required-mark">*</span></label>
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
                                        Vật tư yêu cầu xuất
                                    </h2>
                                    {form.warehouseId && (
                                        <button
                                            type="button"
                                            onClick={() => { setShowItemSearch(true); setItemKeyword(''); setSelectedItemIds([]); }}
                                            className="btn btn-sm"
                                            style={{ fontSize: '14px', fontWeight: 600 }}
                                            disabled={itemsLoading}
                                        >
                                            {itemsLoading ? <Loader size={16} className="spinner" /> : <Plus size={16} />}
                                            {itemsLoading ? 'Đang tải...' : 'Thêm vật tư'}
                                        </button>
                                    )}
                                </div>

                                {!form.warehouseId ? (
                                    <div style={{
                                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                                        justifyContent: 'center', gap: 12, padding: '40px 20px', color: '#9ca3af'
                                    }}>
                                        <PackageOpen size={48} strokeWidth={1.5} />
                                        <p style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>Vui lòng chọn kho xuất trước</p>
                                        <p style={{ fontSize: 13, margin: 0, color: '#64748b' }}>Vật tư có trong kho sẽ hiển thị ở đây</p>
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
                                                        placeholder="Tìm theo tên hoặc mã vật tư..."
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
                                                            <p style={{ margin: 0, fontSize: 13 }}>Không có vật tư nào trong kho này</p>
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
                                                                            <span>Ton: {(item.onHandQty ?? 0).toLocaleString()}</span>
                                                                    </span>
                                                                </div>
                                                                <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#6b7280' }}>
                                                                            <span>Mã: {item.itemCode}</span>
                                                                            <span>- ĐVT: {item.uomName ?? item.baseUomName}</span>
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
                                                                        <Plus size={16} />Thêm {selectedItemIds.length} vật tư
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
                                                            <th>Vật tư</th>
                                                            <th style={{ width: 90, textAlign: 'right' }}>Tồn kho</th>
                                                            <th style={{ width: 100, textAlign: 'right' }}>SL xuất</th>
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
                                                                                Mã: {line.itemCode} - ĐVT: {line.uomName}
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
                                                <p style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>Chưa có vật tư nào</p>
                                                <p style={{ fontSize: 13, margin: 0, color: '#64748b' }}>Nhấn "Thêm vật tư" để bắt đầu</p>
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
                                        <span style={{ color: '#64748b' }}>Công ty:</span>
                                        <span style={{ fontWeight: 500, color: '#374151', textAlign: 'right', maxWidth: 180 }}>
                                            {selectedCompany?.companyName ?? '-'}
                                        </span>
                                        </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                                        <span style={{ color: '#64748b' }}>Người nhận:</span>
                                        <span style={{ fontWeight: 500, color: '#374151', textAlign: 'right', maxWidth: 180 }}>
                                            {receiverDetail?.receiverName ?? '-'}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                                        <span style={{ color: '#64748b' }}>Địa chỉ:</span>
                                        <span style={{ fontWeight: 500, color: '#374151', textAlign: 'right', maxWidth: 180 }}>
                                            {addressMode === 'custom'
                                                ? formatAddress(customAddress.address, customAddress.ward, customAddress.district, customAddress.city) || '-'
                                                : (selectedAddress
                                                    ? formatAddress(selectedAddress.addressDetail, selectedAddress.ward, selectedAddress.district, selectedAddress.city) || '-'
                                                    : '-')}
                                        </span>
                                        </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                                        <span style={{ color: '#64748b' }}>Kho xuất:</span>
                                        <span style={{ fontWeight: 500, color: '#374151', textAlign: 'right', maxWidth: 180 }}>
                                            {form.warehouseName || '-'}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                                        <span style={{ color: '#64748b' }}>Số vật tư:</span>
                                        <span style={{ fontWeight: 600 }}>{summary.itemCount}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                                        <span style={{ color: '#64748b' }}>Tổng số lượng:</span>
                                        <span style={{ fontWeight: 600 }}>{summary.totalQty.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Ghi chú</h2>
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
                                        placeholder="Nhập ghi chú (nếu có)"
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
            <CreateAddressDialog
                open={addressDialogOpen}
                onClose={() => setAddressDialogOpen(false)}
                onSuccess={handleCreateAddressSuccess}
                companyId={selectedCompanyId}
                companyName={selectedCompany?.companyName ?? ''}
            />

            {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}
        </div>
    );
}

