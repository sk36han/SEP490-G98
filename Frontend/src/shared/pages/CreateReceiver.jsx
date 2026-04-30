import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Plus,
    X,
    User,
    Mail,
    Phone,
    FileText,
    Loader,
    Building2,
    MapPin,
} from 'lucide-react';

import Toast from '../../components/Toast/Toast';
import { useToast } from '../hooks/useToast';
import { createReceiver } from '../lib/receiverService';
import { getCompanies, createCompany } from '../lib/companyService';
import { getAddresses, createAddress } from '../lib/addressService';
import { CreateCompanyDialog, CreateAddressDialog } from '@ui/dialogs';

import '../styles/CreateSupplier.css';

/* ─── Luồng: Công ty → Địa chỉ (của công ty) → Người nhận ─── */

const CreateReceiver = () => {
    const navigate = useNavigate();
    const { toast, showToast, clearToast } = useToast();

    const [submitting, setSubmitting] = useState(false);

    /* ── Company state ── */
    const [companies, setCompanies] = useState([]);
    const [loadingCompanies, setLoadingCompanies] = useState(false);
    const [companyDialogOpen, setCompanyDialogOpen] = useState(false);
    const [companyForm, setCompanyForm] = useState({ companyName: '' });
    const [companyErrors, setCompanyErrors] = useState({});
    const [creatingCompany, setCreatingCompany] = useState(false);

    /* ── Address state ── */
    const [addresses, setAddresses] = useState([]);
    const [loadingAddresses, setLoadingAddresses] = useState(false);
    const [addressDialogOpen, setAddressDialogOpen] = useState(false);
    const [addressForm, setAddressForm] = useState({
        addressName: '',
        addressDetail: '',
        district: '',
        city: '',
        ward: '',
    });
    const [addressErrors, setAddressErrors] = useState({});
    const [creatingAddress, setCreatingAddress] = useState(false);
    /** "Nhập địa chỉ khác" — bỏ qua dropdown, cho nhập tay */
    const [useCustomAddress, setUseCustomAddress] = useState(false);

    /* ── Receiver form state ── */
    const [formData, setFormData] = useState({
        companyId: '',
        receiverName: '',
        phone: '',
        email: '',
        position: '',
        notes: '',
        // Address fields
        addressId: '',
        addressName: '',
        address: '',
        city: '',
        district: '',
        ward: '',
    });
    const [errors, setErrors] = useState({});

    /* ── Helpers ── */
    const loadCompanies = useCallback(async () => {
        setLoadingCompanies(true);
        try {
            const list = await getCompanies();
            setCompanies(list ?? []);
        } catch (err) {
            showToast('Không tải được danh sách công ty.', 'error');
        } finally {
            setLoadingCompanies(false);
        }
    }, [showToast]);

    const loadAddresses = useCallback(async (companyId) => {
        if (!companyId) {
            setAddresses([]);
            return;
        }
        setLoadingAddresses(true);
        try {
            const list = await getAddresses(companyId);
            setAddresses(list ?? []);
        } catch {
            showToast('Không tải được danh sách địa chỉ.', 'error');
        } finally {
            setLoadingAddresses(false);
        }
    }, [showToast]);

    useEffect(() => {
        loadCompanies();
    }, [loadCompanies]);

    /* ── Company handlers ── */
    const handleCompanyChange = (e) => {
        const newCompanyId = e.target.value;
        setFormData(prev => ({
            ...prev,
            companyId: newCompanyId,
            addressId: '',
            addressName: '',
            address: '',
            city: '',
            district: '',
            ward: '',
        }));
        setUseCustomAddress(false);
        setErrors(prev => ({ ...prev, companyId: '' }));
        loadAddresses(newCompanyId);
    };

    const handleOpenCompanyDialog = () => {
        setCompanyDialogOpen(true);
        setCompanyForm({ companyName: '' });
        setCompanyErrors({});
    };

    const handleCloseCompanyDialog = () => {
        setCompanyDialogOpen(false);
        setCompanyForm({ companyName: '' });
        setCompanyErrors({});
    };

    const handleCompanyFormChange = (e) => {
        const { name, value } = e.target;
        setCompanyForm(prev => ({ ...prev, [name]: value }));
        if (companyErrors[name]) {
            setCompanyErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const validateCompanyForm = () => {
        const newErrors = {};
        if (!companyForm.companyName.trim()) {
            newErrors.companyName = 'Tên công ty là bắt buộc.';
        }
        setCompanyErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmitCompany = async (e) => {
        e.preventDefault();
        if (!validateCompanyForm()) return;
        setCreatingCompany(true);
        try {
            const created = await createCompany({ companyName: companyForm.companyName.trim() });
            showToast('Tạo công ty thành công!', 'success');
            await loadCompanies();
            const newId = created?.companyId;
            if (newId) {
                setFormData(prev => ({ ...prev, companyId: String(newId) }));
                loadAddresses(newId);
            }
            handleCloseCompanyDialog();
        } catch (error) {
            const msg = error?.response?.data?.message || error?.message || 'Tạo công ty thất bại.';
            showToast(msg, 'error');
        } finally {
            setCreatingCompany(false);
        }
    };

    const handleCreateCompanySuccess = async (created) => {
        showToast('Tạo công ty thành công!', 'success');
        await loadCompanies();
        const newId = created?.companyId;
        if (newId) {
            setFormData(prev => ({ ...prev, companyId: String(newId) }));
            loadAddresses(newId);
        }
        handleCloseCompanyDialog();
    };

    /* ── Address handlers ── */
    const handleOpenAddressDialog = () => {
        if (!formData.companyId) {
            showToast('Vui lòng chọn công ty trước khi tạo địa chỉ.', 'warning');
            return;
        }
        setAddressDialogOpen(true);
        setAddressForm({ addressName: '', addressDetail: '', district: '', city: '', ward: '' });
        setAddressErrors({});
    };

    const handleCloseAddressDialog = () => {
        setAddressDialogOpen(false);
        setAddressForm({ addressName: '', addressDetail: '', district: '', city: '', ward: '' });
        setAddressErrors({});
    };

    const handleAddressFormChange = (e) => {
        const { name, value } = e.target;
        setAddressForm(prev => ({ ...prev, [name]: value }));
        if (addressErrors[name]) {
            setAddressErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const validateAddressForm = () => {
        const newErrors = {};
        if (!addressForm.addressDetail.trim()) {
            newErrors.addressDetail = 'Địa chỉ chi tiết là bắt buộc.';
        }
        setAddressErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmitAddress = async (e) => {
        e.preventDefault();
        if (!validateAddressForm()) return;
        setCreatingAddress(true);
        try {
            const created = await createAddress({
                companyId: Number(formData.companyId),
                addressName: addressForm.addressName.trim() || null,
                addressDetail: addressForm.addressDetail.trim(),
                district: addressForm.district.trim() || null,
                city: addressForm.city.trim() || null,
                ward: addressForm.ward.trim() || null,
            });
            showToast('Tạo địa chỉ thành công!', 'success');
            await loadAddresses(formData.companyId);
            const newId = created?.addressId ?? created?.AddressId;
            if (newId) {
                setFormData(prev => ({ ...prev, addressId: String(newId) }));
            }
            handleCloseAddressDialog();
        } catch (error) {
            const msg = error?.response?.data?.message || error?.message || 'Tạo địa chỉ thất bại.';
            showToast(msg, 'error');
        } finally {
            setCreatingAddress(false);
        }
    };

    const handleCreateAddressSuccess = async (created) => {
        showToast('Tạo địa chỉ thành công!', 'success');
        await loadAddresses(formData.companyId);
        const newId = created?.addressId ?? created?.AddressId;
        if (newId) {
            setFormData(prev => ({ ...prev, addressId: String(newId) }));
        }
        handleCloseAddressDialog();
    };

    /* ── Address selection ── */
    const handleAddressSelectChange = (e) => {
        const selectedId = e.target.value;
        if (!selectedId) {
            setFormData(prev => ({ ...prev, addressId: '', addressName: '', address: '', city: '', district: '', ward: '' }));
            return;
        }
        const selected = addresses.find(a => String(a.addressId) === selectedId);
        if (selected) {
            setFormData(prev => ({
                ...prev,
                addressId: selectedId,
                addressName: selected.addressName ?? '',
                address: selected.addressDetail ?? '',
                city: selected.city ?? '',
                district: selected.district ?? '',
                ward: selected.ward ?? '',
            }));
        }
        setErrors(prev => ({ ...prev, addressId: '' }));
    };

    /* ── Receiver form handlers ── */
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.companyId) {
            newErrors.companyId = 'Công ty là bắt buộc.';
        }

        if (!formData.receiverName.trim()) {
            newErrors.receiverName = 'Tên người nhận là bắt buộc.';
        }

        if (!formData.phone.trim()) {
            newErrors.phone = 'Số điện thoại là bắt buộc.';
        }

        if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
            newErrors.email = 'Email không hợp lệ.';
        }

        if (useCustomAddress && !formData.address.trim()) {
            newErrors.address = 'Địa chỉ chi tiết là bắt buộc.';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            showToast('Vui lòng kiểm tra lại thông tin!', 'error');
            return;
        }

        try {
            setSubmitting(true);

            const selectedAddr = addresses.find(a => String(a.addressId) === formData.addressId);

            const payload = {
                receiverName: formData.receiverName.trim(),
                phone: formData.phone.trim(),
                email: formData.email.trim() || null,
                position: formData.position.trim() || null,
                notes: formData.notes.trim() || null,
                companyId: Number(formData.companyId),
                isActive: true,
                // Address
                addressId: useCustomAddress ? null : (selectedAddr?.addressId ? Number(selectedAddr.addressId) : null),
                address: formData.address.trim() || null,
                city: formData.city.trim() || null,
                district: formData.district.trim() || null,
                ward: formData.ward.trim() || null,
            };

            await createReceiver(payload);
            showToast('Tạo người nhận thành công!', 'success');

            setTimeout(() => {
                navigate(-1);
            }, 900);
        } catch (error) {
            const msg = error?.response?.data?.message || error?.message || 'Đã xảy ra lỗi khi tạo người nhận.';
            showToast(msg, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancel = () => {
        navigate(-1);
    };

    /* ── Render ── */
    return (
        <div className="create-supplier-page">
            <div className="page-header">
                <div className="page-header-left">
                    <button type="button" onClick={handleCancel} className="back-button">
                        <ArrowLeft size={20} />
                        <span>Quay lại</span>
                    </button>
                </div>

                <div className="page-header-actions">
                    <button type="button" onClick={handleCancel} className="btn btn-cancel" disabled={submitting}>
                        <X size={16} className="btn-icon" />
                        Hủy
                    </button>

                    <button
                        type="button"
                        className="btn btn-primary"
                        disabled={submitting}
                        onClick={() => document.getElementById('create-receiver-form')?.requestSubmit()}
                    >
                        {submitting ? (
                            <>
                                <Loader size={16} className="btn-icon spinner" />
                                Đang tạo...
                            </>
                        ) : (
                            <>
                                <Plus size={16} className="btn-icon" />
                                Tao nguoi nhan
                            </>
                        )}
                    </button>
                </div>
            </div>

            <div className="form-card">
                <form id="create-receiver-form" onSubmit={handleSubmit} className="form-wrapper">
                    <div className="form-card-intro">
                        <h1 className="page-title">Thêm mới người nhận</h1>
                        <p className="form-card-required-note">
                            Các trường được đánh dấu <span className="required-mark">*</span> là bắt buộc
                        </p>
                    </div>

                    {/* ── Section 1: Công ty ── */}
                    <div className="info-section">
                        <div className="section-header-with-toggle">
                            <h2 className="section-title">Thông tin công ty</h2>
                        </div>

                        <div className="form-grid">
                            <div className="form-field span-2">
                                <label className="form-label" htmlFor="companyId">
                                    Công ty <span className="required-mark">*</span>
                                </label>
                                <div className="input-wrapper">
                                    <Building2 className="input-icon" size={16} />
                                    <select
                                        id="companyId"
                                        name="companyId"
                                        value={formData.companyId}
                                        onChange={handleCompanyChange}
                                        className={`form-input ${errors.companyId ? 'error' : ''}`}
                                    >
                                        <option value="">
                                            {loadingCompanies ? 'Đang tải...' : '-- Chọn công ty --'}
                                        </option>
                                        {companies.map((c) => (
                                            <option key={c.companyId} value={c.companyId}>
                                                {c.companyCode ? `${c.companyCode} - ` : ''}{c.companyName}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
                                    <button
                                        type="button"
                                        onClick={handleOpenCompanyDialog}
                                        disabled={submitting}
                                        className="btn btn-cancel"
                                        style={{
                                            padding: '8px 12px',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 6,
                                        }}
                                    >
                                        <Plus size={15} className="btn-icon" />
                                        Tạo mới công ty
                                    </button>
                                </div>

                                {errors.companyId && <span className="error-message">{errors.companyId}</span>}
                            </div>
                        </div>
                    </div>

                    {/* ── Section 2: Địa chỉ giao hàng ── */}
                    <div className="info-section">
                        <div className="section-header-with-toggle">
                            <h2 className="section-title">Địa chỉ giao hàng</h2>
                        </div>

                        <div className="form-grid">
                            <div className="form-field span-2">
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {/* Radio: chon co san hay nhap tay */}
                                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '14px' }}>
                                            <input
                                                type="radio"
                                                name="addressMode"
                                                value="existing"
                                                checked={!useCustomAddress}
                                                onChange={() => {
                                                    setUseCustomAddress(false);
                                                    setErrors(prev => ({ ...prev, addressId: '' }));
                                                }}
                                            />
                                            Chọn địa chỉ có sẵn
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '14px' }}>
                                            <input
                                                type="radio"
                                                name="addressMode"
                                                value="custom"
                                                checked={useCustomAddress}
                                                onChange={() => {
                                                    setUseCustomAddress(true);
                                                    setErrors(prev => ({ ...prev, addressId: '' }));
                                                }}
                                            />
                                            Nhập địa chỉ khác
                                        </label>
                                    </div>

                                    {/* Dropdown chon address */}
                                    {!useCustomAddress && (
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                                            <div style={{ flex: 1 }}>
                                                <div className="input-wrapper">
                                                    <MapPin className="input-icon" size={16} />
                                                    <select
                                                        id="addressId"
                                                        name="addressId"
                                                        value={formData.addressId}
                                                        onChange={handleAddressSelectChange}
                                                        className={`form-input ${errors.addressId ? 'error' : ''}`}
                                                    >
                                                        <option value="">
                                                            {loadingAddresses ? 'Đang tải...' : '-- Chọn địa chỉ --'}
                                                        </option>
                                                        {addresses.map((addr) => (
                                                            <option key={addr.addressId} value={addr.addressId}>
                                                                {addr.addressName
                                                                    ? `${addr.addressName} — ${addr.addressDetail}`
                                                                    : addr.addressDetail}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                {errors.addressId && <span className="error-message">{errors.addressId}</span>}
                                            </div>

                                            <button
                                                type="button"
                                                onClick={handleOpenAddressDialog}
                                                className="btn btn-cancel"
                                                style={{
                                                    padding: '8px 12px',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 6,
                                                    whiteSpace: 'nowrap',
                                                    marginTop: '2px',
                                                }}
                                            >
                                                <Plus size={15} className="btn-icon" />
                                                Tạo mới
                                            </button>
                                        </div>
                                    )}

                                    {/* Preview dia chi da chon */}
                                    {!useCustomAddress && formData.addressId && (
                                        <div style={{
                                            padding: '10px 14px',
                                            backgroundColor: '#f0f9ff',
                                            borderRadius: '8px',
                                            fontSize: '13px',
                                            color: '#374151',
                                            borderLeft: '3px solid #2196F3',
                                        }}>
                                            {formData.addressName && <div style={{ fontWeight: 500 }}>{formData.addressName}</div>}
                                            {formData.address && <div>{formData.address}</div>}
                                            {(formData.ward || formData.district || formData.city) && (
                                                <div style={{ color: '#6b7280', marginTop: '2px' }}>
                                                    {[formData.ward, formData.district, formData.city].filter(Boolean).join(', ')}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Nhập tay địa chỉ */}
                                    {useCustomAddress && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            <div className="form-field">
                                                <label className="form-label" htmlFor="addressName">
                                                    Ten dia chi (tuy chon)
                                                </label>
                                                <div className="input-wrapper">
                                                    <MapPin className="input-icon" size={16} />
                                                    <input
                                                        id="addressName"
                                                        type="text"
                                                        name="addressName"
                                                        value={formData.addressName}
                                                        onChange={handleChange}
                                                        placeholder="VD: Nhà kho A, Văn phòng chính"
                                                        className="form-input"
                                                        autoComplete="off"
                                                    />
                                                </div>
                                            </div>

                                            <div className="form-field">
                                                <label className="form-label" htmlFor="address">
                                                    Địa chỉ chi tiết <span className="required-mark">*</span>
                                                </label>
                                                <div className="input-wrapper">
                                                    <MapPin className="input-icon" size={16} />
                                                    <input
                                                        id="address"
                                                        type="text"
                                                        name="address"
                                                        value={formData.address}
                                                        onChange={handleChange}
                                                        placeholder="VD: Số 123, Đường Nguyễn Trãi"
                                                        className={`form-input ${errors.address ? 'error' : ''}`}
                                                        autoComplete="off"
                                                    />
                                                </div>
                                                {errors.address && <span className="error-message">{errors.address}</span>}
                                            </div>

                                            <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                                                <div className="form-field">
                                                    <label className="form-label" htmlFor="city">Tinh / Thanh pho</label>
                                                    <div className="input-wrapper">
                                                        <MapPin className="input-icon" size={16} />
                                                        <input
                                                            id="city"
                                                            type="text"
                                                            name="city"
                                                            value={formData.city}
                                                            onChange={handleChange}
                                                            placeholder="VD: Hồ Chí Minh"
                                                            className="form-input"
                                                            autoComplete="off"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="form-field">
                                                    <label className="form-label" htmlFor="district">Quận / Huyện</label>
                                                    <div className="input-wrapper">
                                                        <MapPin className="input-icon" size={16} />
                                                        <input
                                                            id="district"
                                                            type="text"
                                                            name="district"
                                                            value={formData.district}
                                                            onChange={handleChange}
                                                            placeholder="VD: Quận 1"
                                                            className="form-input"
                                                            autoComplete="off"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="form-field span-2">
                                                    <label className="form-label" htmlFor="ward">Phuong / Xa</label>
                                                    <div className="input-wrapper">
                                                        <MapPin className="input-icon" size={16} />
                                                        <input
                                                            id="ward"
                                                            type="text"
                                                            name="ward"
                                                            value={formData.ward}
                                                            onChange={handleChange}
                                                            placeholder="VD: Phường Bến Nghé"
                                                            className="form-input"
                                                            autoComplete="off"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Section 3: Thông tin người nhận ── */}
                    <div className="info-section">
                        <div className="section-header-with-toggle">
                            <h2 className="section-title">Thông tin người nhận</h2>
                        </div>

                        <div className="form-grid">
                            <div className="form-field span-2">
                                <label className="form-label" htmlFor="receiverName">
                                    Tên người nhận <span className="required-mark">*</span>
                                </label>
                                <div className="input-wrapper">
                                    <User className="input-icon" size={16} />
                                    <input
                                        id="receiverName"
                                        type="text"
                                        name="receiverName"
                                        value={formData.receiverName}
                                        onChange={handleChange}
                                        placeholder="Nhập tên người nhận"
                                        className={`form-input ${errors.receiverName ? 'error' : ''}`}
                                        autoComplete="off"
                                    />
                                </div>
                                {errors.receiverName && <span className="error-message">{errors.receiverName}</span>}
                            </div>

                            <div className="form-field">
                                
                            </div>

                            <div className="form-field">
                                <label className="form-label" htmlFor="phone">
                                    Số điện thoại <span className="required-mark">*</span>
                                </label>
                                <div className="input-wrapper">
                                    <Phone className="input-icon" size={16} />
                                    <input
                                        id="phone"
                                        type="tel"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        placeholder="0912345678"
                                        className={`form-input ${errors.phone ? 'error' : ''}`}
                                        autoComplete="tel"
                                    />
                                </div>
                                {errors.phone && <span className="error-message">{errors.phone}</span>}
                            </div>

                            <div className="form-field">
                                <label className="form-label" htmlFor="email">Email</label>
                                <div className="input-wrapper">
                                    <Mail className="input-icon" size={16} />
                                    <input
                                        id="email"
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        placeholder="example@company.com"
                                        className={`form-input ${errors.email ? 'error' : ''}`}
                                        autoComplete="email"
                                    />
                                </div>
                                {errors.email && <span className="error-message">{errors.email}</span>}
                            </div>

                            <div className="form-field span-2">
                                <label className="form-label" htmlFor="notes">Ghi chú</label>
                                <div className="input-wrapper textarea-wrapper">
                                    <FileText className="input-icon textarea-icon" size={16} />
                                    <textarea
                                        id="notes"
                                        name="notes"
                                        value={formData.notes}
                                        onChange={handleChange}
                                        placeholder="Nhập ghi chú (nếu có)"
                                        rows="3"
                                        className="form-textarea"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </form>
            </div>

            {toast && toast.message && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}

            <CreateCompanyDialog
                open={companyDialogOpen}
                onClose={handleCloseCompanyDialog}
                onSuccess={handleCreateCompanySuccess}
            />

            <CreateAddressDialog
                open={addressDialogOpen}
                onClose={handleCloseAddressDialog}
                onSuccess={handleCreateAddressSuccess}
                companyId={formData.companyId ? Number(formData.companyId) : null}
            />
        </div>
    );
};

export default CreateReceiver;
