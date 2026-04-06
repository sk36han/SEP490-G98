import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Plus, X, MapPin, User, Send, Loader,
    Package, Search, Trash2,
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
import { createReceiver, getReceiversByCompany } from '../lib/receiverService';
import { getAddressesByCompany, createAddress } from '../lib/addressService';
import { getWarehouseList } from '../lib/warehouseService';
import { getItemsByWarehouse } from '../lib/itemService';
import { createReleaseRequest } from '../lib/releaseRequestService';
import '../styles/CreateSupplier.css';

const MAX_NOTE = 250;

function normalizeId(value) {
    if (value === null || value === undefined || value === '') return '';
    return String(value);
}

function formatAddress(address, ward, district, city) {
    const parts = [address, ward, district, city].filter(Boolean);
    return parts.length ? parts.join(', ') : '';
}

function CreateCompanyDialog({ open, onClose, onSuccess }) {
    const [form, setForm] = useState({ companyName: '' });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async () => {
        if (!form.companyName.trim()) {
            setError('Vui lòng nhập tên công ty.');
            return;
        }

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
        if (submitting) return;
        setForm({ companyName: '' });
        setError('');
        onClose();
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
            <DialogTitle sx={{ fontWeight: 600, fontSize: '16px' }}>Tạo công ty mới</DialogTitle>
            <DialogContent>
                <TextField
                    label="Tên công ty"
                    value={form.companyName}
                    onChange={(e) => setForm({ companyName: e.target.value })}
                    fullWidth
                    margin="normal"
                    error={Boolean(error)}
                    helperText={error}
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
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

function CreateReceiverDialog({ open, onClose, onSuccess, companyId, companyName }) {
    const [form, setForm] = useState({
        receiverName: '',
        phone: '',
        email: '',
        position: '',
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const setField = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));

    const handleSubmit = async () => {
        if (!form.receiverName.trim()) {
            setError('Vui lòng nhập tên người nhận.');
            return;
        }
        if (!form.phone.trim()) {
            setError('Vui lòng nhập số điện thoại.');
            return;
        }

        setSubmitting(true);
        setError('');
        try {
            const result = await createReceiver({
                receiverName: form.receiverName.trim(),
                phone: form.phone.trim(),
                email: form.email.trim() || null,
                position: form.position.trim() || null,
                companyId: companyId ? Number(companyId) : null,
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
        if (submitting) return;
        setForm({ receiverName: '', phone: '', email: '', position: '' });
        setError('');
        onClose();
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
                <TextField label="Tên người nhận *" value={form.receiverName} onChange={(e) => setField('receiverName', e.target.value)} fullWidth margin="normal" autoFocus />
                <TextField label="Số điện thoại *" value={form.phone} onChange={(e) => setField('phone', e.target.value)} fullWidth margin="normal" />
                <TextField label="Email" value={form.email} onChange={(e) => setField('email', e.target.value)} fullWidth margin="normal" />
                <TextField label="Chức vụ" value={form.position} onChange={(e) => setField('position', e.target.value)} fullWidth margin="normal" />
                {error && <div style={{ color: '#ef4444', fontSize: '13px', marginTop: 8 }}>{error}</div>}
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

    const setField = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));

    const handleSubmit = async () => {
        if (!form.addressDetail.trim()) {
            setError('Vui lòng nhập địa chỉ cụ thể.');
            return;
        }

        setSubmitting(true);
        setError('');
        try {
            const result = await createAddress({
                companyId: companyId ? Number(companyId) : null,
                addressName: form.addressName.trim() || null,
                addressDetail: form.addressDetail.trim(),
                city: form.city.trim() || null,
                district: form.district.trim() || null,
                ward: form.ward.trim() || null,
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
        if (submitting) return;
        setForm({ addressName: '', addressDetail: '', city: '', district: '', ward: '' });
        setError('');
        onClose();
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
                <TextField label="Tên địa chỉ" value={form.addressName} onChange={(e) => setField('addressName', e.target.value)} fullWidth margin="normal" placeholder="VD: Văn phòng, Kho hàng..." />
                <TextField label="Địa chỉ cụ thể *" value={form.addressDetail} onChange={(e) => setField('addressDetail', e.target.value)} fullWidth margin="normal" autoFocus />
                <TextField label="Thành phố / Tỉnh" value={form.city} onChange={(e) => setField('city', e.target.value)} fullWidth margin="normal" />
                <TextField label="Quận / Huyện" value={form.district} onChange={(e) => setField('district', e.target.value)} fullWidth margin="normal" />
                <TextField label="Phường / Xã" value={form.ward} onChange={(e) => setField('ward', e.target.value)} fullWidth margin="normal" />
                {error && <div style={{ color: '#ef4444', fontSize: '13px', marginTop: 8 }}>{error}</div>}
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

export default function CreateReleaseRequest() {
    const navigate = useNavigate();
    const { toast, showToast, clearToast } = useToast();

    const [submitting, setSubmitting] = useState(false);
    const [savingDraft, setSavingDraft] = useState(false);

    const [companyDialogOpen, setCompanyDialogOpen] = useState(false);
    const [receiverDialogOpen, setReceiverDialogOpen] = useState(false);
    const [addressDialogOpen, setAddressDialogOpen] = useState(false);

    const [companies, setCompanies] = useState([]);
    const [receivers, setReceivers] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [items, setItems] = useState([]);
    const [addresses, setAddresses] = useState([]);

    const [loading, setLoading] = useState(true);
    const [itemsLoading, setItemsLoading] = useState(false);

    const [selectedCompanyId, setSelectedCompanyId] = useState('');
    const [selectedReceiverId, setSelectedReceiverId] = useState('');
    const [selectedAddressId, setSelectedAddressId] = useState('');
    const [receiverDetail, setReceiverDetail] = useState(null);

    const [form, setForm] = useState({
        warehouseId: '',
        warehouseName: '',
        expectedDate: new Date().toISOString().slice(0, 10),
        purpose: '',
        note: '',
    });

    const [addressMode, setAddressMode] = useState('list');
    const [customAddress, setCustomAddress] = useState({
        address: '',
        city: '',
        district: '',
        ward: '',
    });

    const [lineItems, setLineItems] = useState([]);
    const [showItemSearch, setShowItemSearch] = useState(false);
    const [itemKeyword, setItemKeyword] = useState('');
    const [selectedItemIds, setSelectedItemIds] = useState([]);

    useEffect(() => {
        const fetchAll = async () => {
            setLoading(true);
            try {
                const [companyResult, warehouseResult] = await Promise.all([
                    getCompanies(),
                    getWarehouseList({ pageSize: 100 }),
                ]);

                setCompanies(Array.isArray(companyResult) ? companyResult : (companyResult?.items ?? []));
                setWarehouses(warehouseResult?.items ?? []);
            } catch {
                showToast('Không tải được danh sách. Vui lòng thử lại.', 'error');
            } finally {
                setLoading(false);
            }
        };

        fetchAll();
    }, [showToast]);

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
                const data = await getItemsByWarehouse(Number(form.warehouseId));
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
        if (!companyId) {
            setReceivers([]);
            return;
        }

        try {
            const list = await getReceiversByCompany(Number(companyId));
            setReceivers(Array.isArray(list) ? list : []);
        } catch {
            setReceivers([]);
        }
    }, []);

    const loadAddresses = useCallback(async (companyId) => {
        if (!companyId) {
            setAddresses([]);
            setSelectedAddressId('');
            return;
        }

        try {
            const list = await getAddressesByCompany(Number(companyId));
            const normalizedList = Array.isArray(list) ? list : [];
            setAddresses(normalizedList);

            const defaultAddr = normalizedList.find((a) => a?.isDefault || a?.IsDefault);
            if (defaultAddr) {
                setSelectedAddressId(normalizeId(defaultAddr.addressId ?? defaultAddr.AddressId));
            } else if (normalizedList.length > 0) {
                setSelectedAddressId(normalizeId(normalizedList[0].addressId ?? normalizedList[0].AddressId));
            } else {
                setSelectedAddressId('');
            }
        } catch {
            setAddresses([]);
            setSelectedAddressId('');
        }
    }, []);

    const handleCompanyChange = (e) => {
        const companyId = normalizeId(e.target.value);
        setSelectedCompanyId(companyId);
        setSelectedReceiverId('');
        setSelectedAddressId('');
        setReceiverDetail(null);
        setAddressMode('list');
        setCustomAddress({ address: '', city: '', district: '', ward: '' });
        loadReceivers(companyId);
        loadAddresses(companyId);
    };

    const handleReceiverChange = (e) => {
        const receiverId = normalizeId(e.target.value);
        setSelectedReceiverId(receiverId);

        if (!receiverId) {
            setReceiverDetail(null);
            return;
        }

        const receiver = receivers.find((r) => normalizeId(r.receiverId ?? r.ReceiverId) === receiverId);
        setReceiverDetail(receiver || null);
        setAddressMode('list');
        setCustomAddress({ address: '', city: '', district: '', ward: '' });
        loadAddresses(selectedCompanyId);
    };

    const handleWarehouseChange = (e) => {
        const warehouseId = normalizeId(e.target.value);
        const found = warehouses.find((w) => normalizeId(w.warehouseId ?? w.WarehouseId) === warehouseId);
        setForm((prev) => ({
            ...prev,
            warehouseId,
            warehouseName: found?.warehouseName ?? found?.WarehouseName ?? '',
        }));
    };

    const handleCreateCompanySuccess = (result) => {
        const newCompany = {
            companyId: result?.companyId ?? result?.CompanyId,
            companyName: result?.companyName ?? result?.CompanyName ?? '',
        };
        setCompanies((prev) => [newCompany, ...prev]);
        const id = normalizeId(newCompany.companyId);
        setSelectedCompanyId(id);
        setSelectedReceiverId('');
        setSelectedAddressId('');
        setReceiverDetail(null);
        loadReceivers(id);
        loadAddresses(id);
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
        setReceivers((prev) => [newReceiver, ...prev]);
        const id = normalizeId(newReceiver.receiverId);
        setSelectedReceiverId(id);
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
        setAddresses((prev) => [...prev, newAddress]);
        setSelectedAddressId(normalizeId(newAddress.addressId));
        setAddressMode('list');
        showToast('Tạo địa chỉ thành công!', 'success');
    };

    const filteredItems = useMemo(() => {
        const keyword = itemKeyword.trim().toLowerCase();
        return items.filter((item) => {
            const availableQty = Number(item.availableQty ?? item.AvailableQty ?? 0);
            if (availableQty <= 0) return false;
            if (!keyword) return true;
            return String(item.itemName ?? item.ItemName ?? '').toLowerCase().includes(keyword)
                || String(item.itemCode ?? item.ItemCode ?? '').toLowerCase().includes(keyword);
        });
    }, [items, itemKeyword]);

    const handleSelectItem = (item) => {
        const itemId = normalizeId(item.itemId ?? item.ItemId);
        if (lineItems.some((line) => normalizeId(line.itemId ?? line.ItemId) === itemId)) {
            showToast('Vật tư đã có trong danh sách!', 'warning');
            return;
        }

        setLineItems((prev) => [
            ...prev,
            {
                id: `${Date.now()}-${Math.random()}`,
                itemId,
                itemName: item.itemName ?? item.ItemName ?? '',
                itemCode: item.itemCode ?? item.ItemCode ?? '',
                uomName: item.uomName ?? item.baseUomName ?? item.UomName ?? '',
                uomId: normalizeId(item.uomId ?? item.UomId),
                availableQty: Number(item.availableQty ?? item.AvailableQty ?? item.onHandQty ?? item.OnHandQty ?? 0),
                quantity: 1,
                note: '',
            },
        ]);
        setItemKeyword('');
        setShowItemSearch(false);
        showToast('Đã thêm vật tư', 'success');
    };

    const toggleItem = (id) => {
        setSelectedItemIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
    };

    const addSelectedItems = () => {
        if (!selectedItemIds.length) {
            showToast('Chọn ít nhất 1 vật tư', 'warning');
            return;
        }

        const existingIds = new Set(lineItems.map((line) => normalizeId(line.itemId ?? line.ItemId)));
        const newLines = items
            .filter((item) => selectedItemIds.includes(normalizeId(item.itemId ?? item.ItemId)))
            .filter((item) => !existingIds.has(normalizeId(item.itemId ?? item.ItemId)))
            .map((item) => ({
                id: `${Date.now()}-${Math.random()}`,
                itemId: normalizeId(item.itemId ?? item.ItemId),
                itemName: item.itemName ?? item.ItemName ?? '',
                itemCode: item.itemCode ?? item.ItemCode ?? '',
                uomName: item.uomName ?? item.baseUomName ?? item.UomName ?? '',
                uomId: normalizeId(item.uomId ?? item.UomId),
                availableQty: Number(item.availableQty ?? item.AvailableQty ?? item.onHandQty ?? item.OnHandQty ?? 0),
                quantity: 1,
                note: '',
            }));

        if (newLines.length) {
            setLineItems((prev) => [...prev, ...newLines]);
        }

        setItemKeyword('');
        setShowItemSearch(false);
        setSelectedItemIds([]);
        showToast(`Đã thêm ${newLines.length} vật tư`, 'success');
    };

    const updateLine = (index, field, value) => {
        setLineItems((prev) => prev.map((line, lineIndex) => {
            if (lineIndex !== index) return line;
            return { ...line, [field]: value };
        }));
    };

    const removeLine = (index) => {
        setLineItems((prev) => prev.filter((_, lineIndex) => lineIndex !== index));
    };

    const selectedCompany = useMemo(
        () => companies.find((c) => normalizeId(c.companyId ?? c.CompanyId) === selectedCompanyId) || null,
        [companies, selectedCompanyId]
    );

    const selectedAddress = useMemo(
        () => addresses.find((a) => normalizeId(a.addressId ?? a.AddressId) === selectedAddressId) || null,
        [addresses, selectedAddressId]
    );

    const summary = useMemo(() => ({
        itemCount: lineItems.length,
        totalQty: lineItems.reduce((sum, line) => sum + (Number(line.quantity) || 0), 0),
    }), [lineItems]);

    const canSaveDraft = useMemo(() => (
        Boolean(selectedCompanyId)
        && Boolean(selectedReceiverId)
        && Boolean(form.warehouseId)
        && lineItems.length > 0
    ), [selectedCompanyId, selectedReceiverId, form.warehouseId, lineItems]);

    const canCreateRequest = useMemo(() => (
        Boolean(selectedCompanyId)
        && Boolean(selectedReceiverId)
        && Boolean(form.warehouseId)
        && Boolean(form.purpose.trim())
        && lineItems.length > 0
    ), [selectedCompanyId, selectedReceiverId, form.warehouseId, form.purpose, lineItems]);

    const buildPayload = () => {
        let address = '';
        let city = '';
        let district = '';
        let ward = '';
        let addressId = null;

        if (addressMode === 'custom') {
            address = customAddress.address || '';
            city = customAddress.city || '';
            district = customAddress.district || '';
            ward = customAddress.ward || '';
        } else if (selectedAddress) {
            addressId = Number(selectedAddress.addressId ?? selectedAddress.AddressId);
            address = selectedAddress.addressDetail || selectedAddress.AddressDetail || selectedAddress.addressName || selectedAddress.AddressName || '';
            city = selectedAddress.city || selectedAddress.City || '';
            district = selectedAddress.district || selectedAddress.District || '';
            ward = selectedAddress.ward || selectedAddress.Ward || '';
        }

        return {
            warehouseId: Number(form.warehouseId),
            receiverId: Number(selectedReceiverId),
            companyId: Number(selectedCompanyId),
            expectedDate: form.expectedDate || null,
            purpose: form.purpose.trim() || null,
            note: form.note.trim() || null,
            addressId,
            address,
            city,
            district,
            ward,
            lines: lineItems.map((line) => ({
                itemId: Number(line.itemId),
                requestedQty: Number(line.quantity),
                uomId: line.uomId ? Number(line.uomId) : null,
                note: line.note?.trim() || null,
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

        if (!selectedCompanyId) {
            showToast('Vui lòng chọn công ty.', 'error');
            return;
        }
        if (!selectedReceiverId) {
            showToast('Vui lòng chọn người nhận.', 'error');
            return;
        }
        if (!form.warehouseId) {
            showToast('Vui lòng chọn kho xuất.', 'error');
            return;
        }
        if (!form.purpose.trim()) {
            showToast('Vui lòng nhập lý do xuất hàng.', 'error');
            return;
        }
        if (lineItems.length === 0) {
            showToast('Vui lòng thêm ít nhất 1 vật tư.', 'error');
            return;
        }
        if (addressMode === 'list' && !selectedAddressId) {
            showToast('Vui lòng chọn địa chỉ giao hàng.', 'error');
            return;
        }
        if (addressMode === 'custom' && !customAddress.address.trim()) {
            showToast('Vui lòng nhập địa chỉ giao hàng.', 'error');
            return;
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
            <div className="page-header">
                <div className="page-header-left">
                    <button type="button" onClick={() => navigate(-1)} className="back-button">
                        <ArrowLeft size={20} />
                        <span>Quay lại</span>
                    </button>
                </div>
                <div className="page-header-actions">
                    <button type="button" onClick={() => navigate(-1)} className="btn btn-cancel" disabled={submitting || savingDraft}>
                        <X size={15} />Hủy
                    </button>
                    <button type="button" className="btn btn-secondary" disabled={!canSaveDraft || savingDraft || submitting} onClick={handleSaveDraft} style={{ minWidth: 120 }}>
                        {savingDraft ? <><Loader size={15} className="spinner" />Đang lưu...</> : <><Save size={15} />Lưu Nháp</>}
                    </button>
                    <button type="button" className="btn btn-primary" disabled={!canCreateRequest || submitting || savingDraft} onClick={handleCreateRequest}>
                        {submitting ? <><Loader size={15} className="spinner" />Đang gửi...</> : <><Send size={15} />Tạo Yêu Cầu Xuất Hàng</>}
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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">
                                        <span style={{ marginRight: 8, color: '#2196F3', fontWeight: 700 }}>1</span>
                                        Người giao hàng
                                    </h2>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    <div className="form-field">
                                        <label className="form-label">Công ty <span className="required-mark">*</span></label>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <div className="input-wrapper" style={{ flex: 1 }}>
                                                <Building2 className="input-icon" size={16} />
                                                <select value={selectedCompanyId} onChange={handleCompanyChange} className="form-input" style={{ paddingLeft: 40 }}>
                                                    <option value="">Chọn công ty</option>
                                                    {companies.map((company) => (
                                                        <option key={normalizeId(company.companyId ?? company.CompanyId)} value={normalizeId(company.companyId ?? company.CompanyId)}>
                                                            {company.companyName ?? company.CompanyName ?? ''}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <button type="button" onClick={() => setCompanyDialogOpen(true)} className="btn btn-secondary" title="Tạo công ty mới">
                                                <Plus size={15} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="form-field">
                                        <label className="form-label">Người nhận <span className="required-mark">*</span></label>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <div className="input-wrapper" style={{ flex: 1 }}>
                                                <User className="input-icon" size={16} />
                                                <select value={selectedReceiverId} onChange={handleReceiverChange} className="form-input" style={{ paddingLeft: 40 }} disabled={!selectedCompanyId}>
                                                    <option value="">{!selectedCompanyId ? 'Chọn công ty trước' : 'Chọn người nhận'}</option>
                                                    {receivers.map((receiver) => (
                                                        <option key={normalizeId(receiver.receiverId ?? receiver.ReceiverId)} value={normalizeId(receiver.receiverId ?? receiver.ReceiverId)}>
                                                            {receiver.receiverName ?? receiver.ReceiverName ?? ''}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <button type="button" onClick={() => setReceiverDialogOpen(true)} className="btn btn-secondary" disabled={!selectedCompanyId} title="Tạo người nhận mới">
                                                <Plus size={15} />
                                            </button>
                                        </div>
                                    </div>

                                    {receiverDetail && (
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                            <div className="form-field" style={{ margin: 0 }}>
                                                <label className="form-label">Số điện thoại</label>
                                                <div className="input-wrapper">
                                                    <Phone className="input-icon" size={16} />
                                                    <input type="text" value={receiverDetail.phone || receiverDetail.Phone || ''} readOnly className="form-input" style={{ backgroundColor: '#f5f5f5' }} />
                                                </div>
                                            </div>
                                            <div className="form-field" style={{ margin: 0 }}>
                                                <label className="form-label">Email</label>
                                                <div className="input-wrapper">
                                                    <Mail className="input-icon" size={16} />
                                                    <input type="email" value={receiverDetail.email || receiverDetail.Email || ''} readOnly className="form-input" style={{ backgroundColor: '#f5f5f5' }} />
                                                </div>
                                            </div>
                                            {(receiverDetail.position || receiverDetail.Position) && (
                                                <div className="form-field" style={{ margin: 0, gridColumn: '1 / -1' }}>
                                                    <label className="form-label">Chức vụ</label>
                                                    <div className="input-wrapper">
                                                        <Briefcase className="input-icon" size={16} />
                                                        <input type="text" value={receiverDetail.position || receiverDetail.Position || ''} readOnly className="form-input" style={{ backgroundColor: '#f5f5f5' }} />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {receiverDetail && (
                                        <div className="form-field" style={{ margin: 0 }}>
                                            <label className="form-label">Địa chỉ giao hàng</label>
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                <div className="input-wrapper" style={{ flex: 1 }}>
                                                    <MapPin className="input-icon" size={16} />
                                                    <select
                                                        value={selectedAddressId}
                                                        onChange={(e) => {
                                                            const value = normalizeId(e.target.value);
                                                            setSelectedAddressId(value);
                                                            if (value) setAddressMode('list');
                                                        }}
                                                        className="form-input"
                                                        style={{ paddingLeft: 40 }}
                                                    >
                                                        <option value="">Chọn địa chỉ</option>
                                                        {addresses.map((address) => {
                                                            const id = normalizeId(address.addressId ?? address.AddressId);
                                                            const isDefault = address.isDefault ?? address.IsDefault;
                                                            const label = address.addressName || address.AddressName
                                                                ? `${address.addressName ?? address.AddressName} - ${formatAddress(address.addressDetail ?? address.AddressDetail, address.ward ?? address.Ward, address.district ?? address.District, address.city ?? address.City)}`
                                                                : formatAddress(address.addressDetail ?? address.AddressDetail, address.ward ?? address.Ward, address.district ?? address.District, address.city ?? address.City) || 'Địa chỉ';
                                                            return (
                                                                <option key={id} value={id}>
                                                                    {label}{isDefault ? ' (Mặc định)' : ''}
                                                                </option>
                                                            );
                                                        })}
                                                    </select>
                                                </div>
                                                <button type="button" onClick={() => { setAddressMode('custom'); setSelectedAddressId(''); }} className="btn btn-secondary" title="Nhập địa chỉ khác">
                                                    <Plus size={15} />
                                                </button>
                                                <button type="button" onClick={() => setAddressDialogOpen(true)} className="btn btn-secondary" disabled={!selectedCompanyId} title="Tạo địa chỉ mới">
                                                    <MapPin size={15} />
                                                </button>
                                            </div>

                                            {addressMode === 'custom' && (
                                                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                    <TextField label="Địa chỉ cụ thể" value={customAddress.address} onChange={(e) => setCustomAddress((prev) => ({ ...prev, address: e.target.value }))} size="small" fullWidth />
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                                        <TextField label="Thành phố / Tỉnh" value={customAddress.city} onChange={(e) => setCustomAddress((prev) => ({ ...prev, city: e.target.value }))} size="small" fullWidth />
                                                        <TextField label="Quận / Huyện" value={customAddress.district} onChange={(e) => setCustomAddress((prev) => ({ ...prev, district: e.target.value }))} size="small" fullWidth />
                                                    </div>
                                                    <TextField label="Phường / Xã" value={customAddress.ward} onChange={(e) => setCustomAddress((prev) => ({ ...prev, ward: e.target.value }))} size="small" fullWidth />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">
                                        <span style={{ marginRight: 8, color: '#2196F3', fontWeight: 700 }}>2</span>
                                        Thông tin xuất hàng
                                    </h2>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                    <div className="form-field" style={{ margin: 0 }}>
                                        <label className="form-label">Kho xuất <span className="required-mark">*</span></label>
                                        <div className="input-wrapper">
                                            <Package className="input-icon" size={16} />
                                            <select value={form.warehouseId} onChange={handleWarehouseChange} className="form-input" style={{ paddingLeft: 40 }}>
                                                <option value="">Chọn kho xuất</option>
                                                {warehouses.map((warehouse) => (
                                                    <option key={normalizeId(warehouse.warehouseId ?? warehouse.WarehouseId)} value={normalizeId(warehouse.warehouseId ?? warehouse.WarehouseId)}>
                                                        {warehouse.warehouseName ?? warehouse.WarehouseName ?? ''}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="form-field" style={{ margin: 0 }}>
                                        <label className="form-label">Ngày dự kiến</label>
                                        <input type="date" value={form.expectedDate} onChange={(e) => setForm((prev) => ({ ...prev, expectedDate: e.target.value }))} className="form-input" />
                                    </div>

                                    <div className="form-field" style={{ margin: 0, gridColumn: '1 / -1' }}>
                                        <label className="form-label">Lý do xuất hàng <span className="required-mark">*</span></label>
                                        <input type="text" value={form.purpose} onChange={(e) => setForm((prev) => ({ ...prev, purpose: e.target.value }))} className="form-input" placeholder="Nhập lý do xuất hàng" />
                                    </div>
                                </div>
                            </div>

                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">
                                        <span style={{ marginRight: 8, color: '#2196F3', fontWeight: 700 }}>3</span>
                                        Danh sách vật tư
                                    </h2>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowItemSearch((prev) => !prev)} disabled={!form.warehouseId || itemsLoading}>
                                            <Search size={14} />
                                            Thêm vật tư
                                        </button>
                                    </div>
                                </div>

                                {showItemSearch && (
                                    <div style={{ marginBottom: 16, border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, background: '#f8fafc' }}>
                                        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                                            <div className="input-wrapper" style={{ flex: 1 }}>
                                                <Search className="input-icon" size={16} />
                                                <input type="text" value={itemKeyword} onChange={(e) => setItemKeyword(e.target.value)} className="form-input" style={{ paddingLeft: 40 }} placeholder="Tìm vật tư theo tên hoặc mã" />
                                            </div>
                                            <button type="button" className="btn btn-secondary" onClick={addSelectedItems} disabled={!selectedItemIds.length}>
                                                <Plus size={14} />Thêm đã chọn
                                            </button>
                                        </div>

                                        <div style={{ maxHeight: 280, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 10, background: '#fff' }}>
                                            {itemsLoading ? (
                                                <div style={{ padding: 20, textAlign: 'center' }}><CircularProgress size={24} /></div>
                                            ) : filteredItems.length === 0 ? (
                                                <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8' }}>Không có vật tư phù hợp</div>
                                            ) : (
                                                filteredItems.map((item) => {
                                                    const id = normalizeId(item.itemId ?? item.ItemId);
                                                    const checked = selectedItemIds.includes(id);
                                                    return (
                                                        <label key={id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}>
                                                            <input type="checkbox" checked={checked} onChange={() => toggleItem(id)} />
                                                            <div style={{ flex: 1 }}>
                                                                <div style={{ fontWeight: 600, color: '#0f172a' }}>{item.itemName ?? item.ItemName ?? ''}</div>
                                                                <div style={{ fontSize: 12, color: '#64748b' }}>
                                                                    Mã: {item.itemCode ?? item.ItemCode ?? '-'} • Còn trống: {Number(item.availableQty ?? item.AvailableQty ?? item.onHandQty ?? item.OnHandQty ?? 0).toLocaleString()}
                                                                </div>
                                                            </div>
                                                            <button type="button" className="btn btn-secondary btn-sm" onClick={(e) => { e.preventDefault(); handleSelectItem(item); }}>
                                                                Chọn
                                                            </button>
                                                        </label>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                )}

                                {!lineItems.length ? (
                                    <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                                        Chưa có vật tư nào.
                                    </div>
                                ) : (
                                    <div className="table-container" style={{ overflowX: 'auto' }}>
                                        <table className="product-table">
                                            <thead>
                                                <tr>
                                                    <th style={{ width: 50, textAlign: 'center' }}>STT</th>
                                                    <th>Vật tư</th>
                                                    <th style={{ width: 120, textAlign: 'right' }}>Tồn kho</th>
                                                    <th style={{ width: 140, textAlign: 'center' }}>Số lượng</th>
                                                    <th>Ghi chú</th>
                                                    <th style={{ width: 60 }}></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {lineItems.map((line, index) => (
                                                    <tr key={line.id}>
                                                        <td style={{ textAlign: 'center' }}>{index + 1}</td>
                                                        <td>
                                                            <div style={{ fontWeight: 600 }}>{line.itemName}</div>
                                                            <div style={{ fontSize: 12, color: '#64748b' }}>Mã: {line.itemCode || '-'} • DVT: {line.uomName || '-'}</div>
                                                        </td>
                                                        <td style={{ textAlign: 'right' }}>{Number(line.availableQty || 0).toLocaleString()}</td>
                                                        <td>
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                max={line.availableQty || 1}
                                                                value={line.quantity}
                                                                onChange={(e) => {
                                                                    const value = Math.max(1, Math.min(Number(e.target.value || 1), Number(line.availableQty || 1)));
                                                                    updateLine(index, 'quantity', value);
                                                                }}
                                                                className="form-input"
                                                                style={{ minWidth: 100 }}
                                                            />
                                                        </td>
                                                        <td>
                                                            <input type="text" value={line.note} onChange={(e) => updateLine(index, 'note', e.target.value)} className="form-input" placeholder="Ghi chú dòng vật tư" />
                                                        </td>
                                                        <td>
                                                            <button type="button" className="btn btn-cancel btn-sm" onClick={() => removeLine(index)}>
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                            <div className="info-section" style={{ margin: 0 }}>
                                <div className="section-header-with-toggle">
                                    <h2 className="section-title">Thông tin chung</h2>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                                        <span style={{ color: '#64748b' }}>Công ty:</span>
                                        <span style={{ fontWeight: 500, color: '#374151', textAlign: 'right', maxWidth: 180 }}>
                                            {selectedCompany?.companyName ?? selectedCompany?.CompanyName ?? '-'}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                                        <span style={{ color: '#64748b' }}>Người nhận:</span>
                                        <span style={{ fontWeight: 500, color: '#374151', textAlign: 'right', maxWidth: 180 }}>
                                            {receiverDetail?.receiverName ?? receiverDetail?.ReceiverName ?? '-'}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                                        <span style={{ color: '#64748b' }}>Địa chỉ:</span>
                                        <span style={{ fontWeight: 500, color: '#374151', textAlign: 'right', maxWidth: 180 }}>
                                            {addressMode === 'custom'
                                                ? formatAddress(customAddress.address, customAddress.ward, customAddress.district, customAddress.city) || '-'
                                                : (selectedAddress
                                                    ? formatAddress(selectedAddress.addressDetail ?? selectedAddress.AddressDetail, selectedAddress.ward ?? selectedAddress.Ward, selectedAddress.district ?? selectedAddress.District, selectedAddress.city ?? selectedAddress.City) || '-'
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
                                        onChange={(e) => {
                                            if (e.target.value.length <= MAX_NOTE) {
                                                setForm((prev) => ({ ...prev, note: e.target.value }));
                                            }
                                        }}
                                        className="form-textarea"
                                        rows={4}
                                        placeholder="Nhập ghi chú (nếu có)"
                                        style={{ width: '100%', minHeight: 100 }}
                                    />
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4, fontSize: 12, color: form.note.length >= MAX_NOTE ? '#ef4444' : '#6b7280' }}>
                                        {form.note.length}/{MAX_NOTE}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </form>
            </div>

            <CreateCompanyDialog open={companyDialogOpen} onClose={() => setCompanyDialogOpen(false)} onSuccess={handleCreateCompanySuccess} />
            <CreateReceiverDialog open={receiverDialogOpen} onClose={() => setReceiverDialogOpen(false)} onSuccess={handleCreateReceiverSuccess} companyId={selectedCompanyId} companyName={selectedCompany?.companyName ?? selectedCompany?.CompanyName ?? ''} />
            <CreateAddressDialog open={addressDialogOpen} onClose={() => setAddressDialogOpen(false)} onSuccess={handleCreateAddressSuccess} companyId={selectedCompanyId} companyName={selectedCompany?.companyName ?? selectedCompany?.CompanyName ?? ''} />

            {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}
        </div>
    );
}
