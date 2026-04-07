/**
 * ViewReceiverDetail – Chi tiết người nhận
 * Người dùng: WAREHOUSE_KEEPER, SALE_ENGINEER, DIRECTOR, ACCOUNTANTS
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Box,
    Typography,
    Button,
    CircularProgress,
    Select,
    MenuItem,
    FormControl,
    Chip,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from '@mui/material';
import {
    ArrowLeft,
    User,
    Mail,
    Phone,
    FileText,
    Building2,
    MapPin,
    Briefcase,
    Edit,
    Save,
    X,
    Loader,
    Eye,
} from 'lucide-react';
import Toast from '../../components/Toast/Toast';
import { useToast } from '../hooks/useToast';
import {
    getReceiverDetail,
    updateReceiver,
    toggleReceiverStatus,
} from '../lib/receiverService';
import { getCompanies, createCompany } from '../lib/companyService';
import { getAddresses, createAddress } from '../lib/addressService';
import { FormDialog } from '../../ui/dialogs/FormDialog';
import '../styles/CreateSupplier.css';

const fmtDate = (str) => {
    if (!str) return '—';
    const d = new Date(str.endsWith('Z') ? str : str + 'Z');
    if (Number.isNaN(d.getTime())) return str;
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const InfoField = ({ label, value, icon: Icon }) => (
    <div className="form-field">
        <label className="form-label">{label}</label>
        <div className="input-wrapper">
            {Icon && <span className="input-icon" style={{ display: 'flex', alignItems: 'center' }}><Icon size={16} /></span>}
            <div style={{
                padding: '8px 12px',
                backgroundColor: '#f5f5f5',
                borderRadius: '8px',
                fontSize: '14px',
                color: '#374151',
                minHeight: '38px',
                display: 'flex',
                alignItems: 'center',
                width: '100%',
                border: '1px solid transparent',
            }}>
                {value || '—'}
            </div>
        </div>
    </div>
);

const EditableField = ({ label, value, onChange, name, icon: Icon, type = 'text', error, placeholder }) => (
    <div className="form-field">
        <label className="form-label" htmlFor={name}>{label}</label>
        <div className="input-wrapper">
            {Icon && <span className="input-icon" style={{ display: 'flex', alignItems: 'center' }}><Icon size={16} /></span>}
            <input
                id={name}
                type={type}
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className={`form-input ${error ? 'error' : ''}`}
                autoComplete="off"
            />
        </div>
        {error && <span className="error-message">{error}</span>}
    </div>
);

export default function ViewReceiverDetail() {
    const navigate = useNavigate();
    const { id } = useParams();
    const { toast, showToast, clearToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [editing, setEditing] = useState(false);
    const [data, setData] = useState(null);

    // Company + Address state (for edit)
    const [companies, setCompanies] = useState([]);
    const [addresses, setAddresses] = useState([]);
    const [loadingCompanies, setLoadingCompanies] = useState(false);
    const [loadingAddresses, setLoadingAddresses] = useState(false);
    const [companyDialogOpen, setCompanyDialogOpen] = useState(false);
    const [addressDialogOpen, setAddressDialogOpen] = useState(false);
    const [companyForm, setCompanyForm] = useState({ companyName: '' });
    const [companyErrors, setCompanyErrors] = useState({});
    const [addressForm, setAddressForm] = useState({
        addressName: '',
        addressDetail: '',
        district: '',
        city: '',
        ward: '',
    });
    const [addressErrors, setAddressErrors] = useState({});
    const [useCustomAddress, setUseCustomAddress] = useState(false);
    const [errors, setErrors] = useState({});

    const fetchDetail = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        try {
            const detail = await getReceiverDetail(id);
            setData(detail);
        } catch (err) {
            showToast(err?.message || 'Không tải được chi tiết người nhận.', 'error');
        } finally {
            setLoading(false);
        }
    }, [id, showToast]);

    const loadCompanies = useCallback(async () => {
        setLoadingCompanies(true);
        try {
            const list = await getCompanies();
            setCompanies(list ?? []);
        } catch {
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

    useEffect(() => { fetchDetail(); }, [fetchDetail]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    };

    const handleStatusToggle = async () => {
        if (!data?.receiverId) return;
        if (!window.confirm('Bạn có chắc muốn thay đổi trạng thái?')) return;
        try {
            await toggleReceiverStatus(data.receiverId, !data.isActive);
            setData(prev => ({ ...prev, isActive: !prev.isActive }));
            showToast('Đổi trạng thái thành công!', 'success');
        } catch (err) {
            showToast(err?.message || 'Đổi trạng thái thất bại.', 'error');
        }
    };

    const validateForm = () => {
        const newErrors = {};
        if (!data?.receiverName?.trim()) newErrors.receiverName = 'Tên người nhận là bắt buộc.';
        if (!data?.phone?.trim()) newErrors.phone = 'Số điện thoại là bắt buộc.';
        if (data?.email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
            newErrors.email = 'Email không hợp lệ.';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async () => {
        if (!validateForm()) return;
        try {
            setSubmitting(true);
            const selectedAddr = addresses.find(a => String(a.addressId) === String(data.addressId));
            await updateReceiver(data.receiverId, {
                receiverName: data.receiverName.trim(),
                phone: data.phone.trim(),
                email: data.email.trim() || null,
                notes: data.notes?.trim() || null,
                isActive: data.isActive,
                companyId: data.companyId ? Number(data.companyId) : null,
                addressId: useCustomAddress ? null : (selectedAddr?.addressId ? Number(selectedAddr.addressId) : null),
                address: data.address?.trim() || null,
                city: data.city?.trim() || null,
                district: data.district?.trim() || null,
                ward: data.ward?.trim() || null,
            });
            showToast('Cập nhật thành công!', 'success');
            setEditing(false);
            await fetchDetail();
        } catch (err) {
            showToast(err?.message || 'Cập nhật thất bại.', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancel = () => {
        if (editing) {
            setEditing(false);
            fetchDetail();
            return;
        }
        navigate(-1);
    };

    // Company dialog
    const handleOpenCompanyDialog = () => { setCompanyDialogOpen(true); setCompanyForm({ companyName: '' }); setCompanyErrors({}); };
    const handleCloseCompanyDialog = () => { setCompanyDialogOpen(false); };
    const handleCompanyFormChange = (e) => {
        const { name, value } = e.target;
        setCompanyForm(prev => ({ ...prev, [name]: value }));
        if (companyErrors[name]) setCompanyErrors(prev => ({ ...prev, [name]: '' }));
    };
    const validateCompanyForm = () => {
        const errs = {};
        if (!companyForm.companyName.trim()) errs.companyName = 'Tên công ty là bắt buộc.';
        setCompanyErrors(errs);
        return Object.keys(errs).length === 0;
    };
    const handleSubmitCompany = async (e) => {
        e.preventDefault();
        if (!validateCompanyForm()) return;
        setSubmitting(true);
        try {
            const created = await createCompany({ companyName: companyForm.companyName.trim() });
            showToast('Tạo công ty thành công!', 'success');
            await loadCompanies();
            if (created?.companyId) {
                setData(prev => ({ ...prev, companyId: String(created.companyId) }));
                loadAddresses(created.companyId);
            }
            setCompanyDialogOpen(false);
        } catch (err) {
            showToast(err?.message || 'Tạo công ty thất bại.', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    // Address dialog
    const handleOpenAddressDialog = () => {
        if (!data?.companyId) { showToast('Vui lòng chọn công ty trước.', 'warning'); return; }
        setAddressDialogOpen(true);
        setAddressForm({ addressName: '', addressDetail: '', district: '', city: '', ward: '' });
        setAddressErrors({});
    };
    const handleCloseAddressDialog = () => { setAddressDialogOpen(false); };
    const handleAddressFormChange = (e) => {
        const { name, value } = e.target;
        setAddressForm(prev => ({ ...prev, [name]: value }));
        if (addressErrors[name]) setAddressErrors(prev => ({ ...prev, [name]: '' }));
    };
    const validateAddressForm = () => {
        const errs = {};
        if (!addressForm.addressDetail.trim()) errs.addressDetail = 'Địa chỉ chi tiết là bắt buộc.';
        setAddressErrors(errs);
        return Object.keys(errs).length === 0;
    };
    const handleSubmitAddress = async (e) => {
        e.preventDefault();
        if (!validateAddressForm()) return;
        setSubmitting(true);
        try {
            const created = await createAddress({
                companyId: Number(data.companyId),
                addressName: addressForm.addressName.trim() || null,
                addressDetail: addressForm.addressDetail.trim(),
                district: addressForm.district.trim() || null,
                city: addressForm.city.trim() || null,
                ward: addressForm.ward.trim() || null,
            });
            showToast('Tạo địa chỉ thành công!', 'success');
            await loadAddresses(data.companyId);
            if (created?.addressId) {
                setData(prev => ({ ...prev, addressId: String(created.addressId) }));
            }
            setAddressDialogOpen(false);
        } catch (err) {
            showToast(err?.message || 'Tạo địa chỉ thất bại.', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCompanyChange = (e) => {
        const newCompanyId = e.target.value;
        setData(prev => ({
            ...prev,
            companyId: newCompanyId,
            addressId: '',
            address: '', city: '', district: '', ward: '',
        }));
        setUseCustomAddress(false);
        loadAddresses(newCompanyId);
    };

    const handleAddressSelectChange = (e) => {
        const selectedId = e.target.value;
        if (!selectedId) {
            setData(prev => ({ ...prev, addressId: '', address: '', city: '', district: '', ward: '' }));
            return;
        }
        const selected = addresses.find(a => String(a.addressId) === selectedId);
        if (selected) {
            setData(prev => ({
                ...prev,
                addressId: selectedId,
                address: selected.addressDetail ?? '',
                city: selected.city ?? '',
                district: selected.district ?? '',
                ward: selected.ward ?? '',
            }));
        }
    };

    useEffect(() => {
        if (editing) loadCompanies();
        if (editing && data?.companyId) loadAddresses(data.companyId);
    }, [editing, data?.companyId, loadCompanies, loadAddresses]);

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (!data) {
        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 2 }}>
                <Typography sx={{ color: '#ef4444' }}>Không tìm thấy người nhận.</Typography>
                <Button variant="outlined" onClick={() => navigate('/receivers')} startIcon={<ArrowLeft size={16} />}>
                    Quay lại danh sách
                </Button>
            </Box>
        );
    }

    const fullAddress = [data.address, data.ward, data.district, data.city].filter(Boolean).join(', ');

    return (
        <div className="create-supplier-page">
            {/* Header */}
            <div className="page-header">
                <div className="page-header-left">
                    <button type="button" onClick={() => navigate(-1)} className="back-button">
                        <ArrowLeft size={20} />
                        <span>Quay lại</span>
                    </button>
                </div>

                <div className="page-header-actions">
                    {!editing ? (
                        <>
                            <button type="button" className="btn btn-secondary" onClick={handleStatusToggle}>
                                <X size={15} />
                                {data.isActive ? 'Ngưng hoạt động' : 'Kích hoạt'}
                            </button>
                            <button type="button" className="btn btn-secondary" onClick={() => navigate(`/receivers/edit/${data.receiverId}`)}>
                                <Edit size={15} />
                                Chỉnh sửa
                            </button>
                        </>
                    ) : (
                        <>
                            <button type="button" onClick={() => { setEditing(false); fetchDetail(); }} className="btn btn-cancel" disabled={submitting}>
                                <X size={16} />
                                Hủy
                            </button>
                            <button type="button" onClick={handleSave} className="btn btn-primary" disabled={submitting}>
                                {submitting ? (
                                    <><Loader size={16} className="btn-icon spinner" /> Đang lưu...</>
                                ) : (
                                    <><Save size={16} className="btn-icon" /> Lưu</>
                                )}
                            </button>
                        </>
                    )}
                </div>

                {/* Status badge */}
                <div>
                    {data.isActive ? (
                        <Chip label="Hoạt động" sx={{ bgcolor: 'rgba(5,150,105,0.1)', color: '#059669', fontWeight: 600, fontSize: '13px', borderRadius: '999px', px: 1 }} />
                    ) : (
                        <Chip label="Ngưng hoạt động" sx={{ bgcolor: 'rgba(217,119,6,0.1)', color: '#d97706', fontWeight: 600, fontSize: '13px', borderRadius: '999px', px: 1 }} />
                    )}
                </div>
            </div>

            {/* Form */}
            <div className="form-card">
                <form className="form-wrapper">
                    {/* Intro */}
                    <div className="form-card-intro">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                            <div>
                                <h1 className="page-title">Chi tiết người nhận</h1>
                                <p style={{ fontSize: '14px', color: '#6b7280', margin: '8px 0 0 0' }}>
                                    Mã: <span style={{ fontWeight: 600, color: '#2196F3' }}>{data.receiverCode || data.receiverId}</span>
                                    {data.companyName && <span style={{ marginLeft: 16 }}> | Công ty: <span style={{ fontWeight: 500 }}>{data.companyName}</span></span>}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Thông tin người nhận */}
                    <div className="info-section">
                        <div className="section-header-with-toggle">
                            <h2 className="section-title">Thông tin người nhận</h2>
                        </div>

                        <div className="form-grid">
                            {editing ? (
                                <>
                                    <EditableField
                                        label="Tên người nhận"
                                        name="receiverName"
                                        value={data.receiverName || ''}
                                        onChange={handleChange}
                                        icon={User}
                                        error={errors.receiverName}
                                        placeholder="Nhập tên người nhận"
                                    />
                                    <EditableField
                                        label="Số điện thoại"
                                        name="phone"
                                        value={data.phone || ''}
                                        onChange={handleChange}
                                        icon={Phone}
                                        error={errors.phone}
                                        placeholder="0912345678"
                                    />
                                    <div className="form-field span-2">
                                        <EditableField
                                            label="Email"
                                            name="email"
                                            value={data.email || ''}
                                            onChange={handleChange}
                                            icon={Mail}
                                            error={errors.email}
                                            placeholder="example@company.com"
                                        />
                                    </div>
                                    <div className="form-field span-2">
                                        <EditableField
                                            label="Chức vụ"
                                            name="position"
                                            value={data.position || ''}
                                            onChange={handleChange}
                                            icon={Briefcase}
                                            placeholder="VD: Người liên hệ, Kế toán"
                                        />
                                    </div>
                                    <div className="form-field span-2">
                                        <label className="form-label">Ghi chú</label>
                                        <div className="input-wrapper textarea-wrapper">
                                            <FileText className="input-icon textarea-icon" size={16} />
                                            <textarea
                                                name="notes"
                                                value={data.notes || ''}
                                                onChange={handleChange}
                                                rows="3"
                                                className="form-textarea"
                                                placeholder="Nhập ghi chú (nếu có)"
                                            />
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <InfoField label="Tên người nhận" value={data.receiverName} icon={User} />
                                    <InfoField label="Số điện thoại" value={data.phone} icon={Phone} />
                                    <InfoField label="Email" value={data.email} icon={Mail} />
                                    <InfoField label="Chức vụ" value={data.position} icon={Briefcase} />
                                    <div className="form-field span-2">
                                        <label className="form-label">Ghi chú</label>
                                        <div style={{
                                            padding: '8px 12px',
                                            backgroundColor: '#f5f5f5',
                                            borderRadius: '8px',
                                            fontSize: '14px',
                                            color: '#374151',
                                            minHeight: '60px',
                                            border: '1px solid transparent',
                                        }}>
                                            {data.notes || 'Không có ghi chú'}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Thông tin công ty */}
                    <div className="info-section">
                        <div className="section-header-with-toggle">
                            <h2 className="section-title">Thông tin công ty</h2>
                        </div>

                        <div className="form-grid">
                            {editing ? (
                                <div className="form-field span-2">
                                    <label className="form-label" htmlFor="companyId">Công ty</label>
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                        <div className="input-wrapper" style={{ flex: 1 }}>
                                            <Building2 className="input-icon" size={16} style={{ display: 'flex', alignItems: 'center' }} />
                                            <select
                                                id="companyId"
                                                name="companyId"
                                                value={data.companyId || ''}
                                                onChange={handleCompanyChange}
                                                className="form-input"
                                                style={{ width: '100%' }}
                                            >
                                                <option value="">-- Chọn công ty --</option>
                                                {companies.map(c => (
                                                    <option key={c.companyId} value={c.companyId}>
                                                        {c.companyCode ? `${c.companyCode} - ` : ''}{c.companyName}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <button type="button" onClick={handleOpenCompanyDialog} className="btn btn-cancel" style={{ padding: '8px 12px', display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', marginTop: 2 }}>
                                            <Edit size={15} /> Tạo mới
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <InfoField label="Công ty" value={data.companyName} icon={Building2} />
                            )}
                        </div>
                    </div>

                    {/* Địa chỉ giao hàng */}
                    <div className="info-section">
                        <div className="section-header-with-toggle">
                            <h2 className="section-title">Địa chỉ giao hàng</h2>
                        </div>

                        <div className="form-grid">
                            {editing ? (
                                <>
                                    <div className="form-field span-2">
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                            <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 14 }}>
                                                    <input type="radio" name="addressMode" checked={!useCustomAddress} onChange={() => setUseCustomAddress(false)} />
                                                    Chọn địa chỉ có sẵn
                                                </label>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 14 }}>
                                                    <input type="radio" name="addressMode" checked={useCustomAddress} onChange={() => setUseCustomAddress(true)} />
                                                    Nhập địa chỉ khác
                                                </label>
                                            </div>

                                            {!useCustomAddress && (
                                                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                                    <div className="input-wrapper" style={{ flex: 1 }}>
                                                        <MapPin className="input-icon" size={16} style={{ display: 'flex', alignItems: 'center' }} />
                                                        <select
                                                            value={data.addressId || ''}
                                                            onChange={handleAddressSelectChange}
                                                            className="form-input"
                                                            style={{ width: '100%' }}
                                                        >
                                                            <option value="">-- Chọn địa chỉ --</option>
                                                            {addresses.map(a => (
                                                                <option key={a.addressId} value={a.addressId}>
                                                                    {a.addressName ? `${a.addressName} — ${a.addressDetail}` : a.addressDetail}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <button type="button" onClick={handleOpenAddressDialog} className="btn btn-cancel" style={{ padding: '8px 12px', display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', marginTop: 2 }}>
                                                        <Edit size={15} /> Tạo mới
                                                    </button>
                                                </div>
                                            )}

                                            {!useCustomAddress && data.addressId && (
                                                <div style={{ padding: '10px 14px', backgroundColor: '#f0f9ff', borderRadius: 8, fontSize: '13px', color: '#374151', borderLeft: '3px solid #2196F3' }}>
                                                    {data.addressName && <div style={{ fontWeight: 500 }}>{data.addressName}</div>}
                                                    {fullAddress}
                                                </div>
                                            )}

                                            {useCustomAddress && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                                    <div className="form-field">
                                                        <label className="form-label">Địa chỉ chi tiết</label>
                                                        <div className="input-wrapper">
                                                            <MapPin className="input-icon" size={16} style={{ display: 'flex', alignItems: 'center' }} />
                                                            <input type="text" name="address" value={data.address || ''} onChange={handleChange} className="form-input" placeholder="VD: Số 123, Đường Nguyễn Trãi" />
                                                        </div>
                                                    </div>
                                                    <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                                                        <div className="form-field">
                                                            <label className="form-label">Tỉnh / Thành phố</label>
                                                            <div className="input-wrapper">
                                                                <MapPin className="input-icon" size={16} style={{ display: 'flex', alignItems: 'center' }} />
                                                                <input type="text" name="city" value={data.city || ''} onChange={handleChange} className="form-input" placeholder="VD: Hồ Chí Minh" />
                                                            </div>
                                                        </div>
                                                        <div className="form-field">
                                                            <label className="form-label">Quận / Huyện</label>
                                                            <div className="input-wrapper">
                                                                <MapPin className="input-icon" size={16} style={{ display: 'flex', alignItems: 'center' }} />
                                                                <input type="text" name="district" value={data.district || ''} onChange={handleChange} className="form-input" placeholder="VD: Quận 1" />
                                                            </div>
                                                        </div>
                                                        <div className="form-field span-2">
                                                            <label className="form-label">Phường / Xã</label>
                                                            <div className="input-wrapper">
                                                                <MapPin className="input-icon" size={16} style={{ display: 'flex', alignItems: 'center' }} />
                                                                <input type="text" name="ward" value={data.ward || ''} onChange={handleChange} className="form-input" placeholder="VD: Phường Bến Nghé" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="form-field span-2">
                                        <label className="form-label">Địa chỉ</label>
                                        <div style={{
                                            padding: '8px 12px',
                                            backgroundColor: '#f5f5f5',
                                            borderRadius: '8px',
                                            fontSize: '14px',
                                            color: '#374151',
                                            minHeight: '38px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 8,
                                        }}>
                                            <MapPin size={16} color="#9ca3af" />
                                            {fullAddress || '—'}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Thông tin hệ thống */}
                    <div className="info-section">
                        <div className="section-header-with-toggle">
                            <h2 className="section-title">Thông tin hệ thống</h2>
                        </div>
                        <div className="form-grid">
                            <InfoField label="Ngày tạo" value={fmtDate(data.createdAt)} />
                            <InfoField label="Ngày cập nhật" value={fmtDate(data.updatedAt)} />
                        </div>
                    </div>
                </form>
            </div>

            {toast && toast.message && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}

            {/* Dialog: Tạo Công ty */}
            <FormDialog
                open={companyDialogOpen}
                onClose={handleCloseCompanyDialog}
                title="Tạo mới công ty"
                actions={
                    <>
                        <button type="button" onClick={handleCloseCompanyDialog} className="btn btn-cancel">Hủy</button>
                        <button type="button" onClick={handleSubmitCompany} className="btn btn-primary" disabled={submitting}>
                            {submitting ? <><Loader size={15} className="btn-icon spinner" /> Đang tạo...</> : <><Edit size={15} className="btn-icon" /> Tạo công ty</>}
                        </button>
                    </>
                }
            >
                <form onSubmit={handleSubmitCompany} style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '8px 0' }}>
                    <div className="form-field">
                        <label className="form-label" htmlFor="companyName">Tên công ty <span className="required-mark">*</span></label>
                        <div className="input-wrapper">
                            <Building2 className="input-icon" size={16} />
                            <input
                                id="companyName"
                                type="text"
                                name="companyName"
                                value={companyForm.companyName}
                                onChange={handleCompanyFormChange}
                                placeholder="VD: Công ty ABC"
                                className={`form-input ${companyErrors.companyName ? 'error' : ''}`}
                            />
                        </div>
                        {companyErrors.companyName && <span className="error-message">{companyErrors.companyName}</span>}
                    </div>
                </form>
            </FormDialog>

            {/* Dialog: Tạo Địa chỉ */}
            <FormDialog
                open={addressDialogOpen}
                onClose={handleCloseAddressDialog}
                title="Tạo mới địa chỉ"
                actions={
                    <>
                        <button type="button" onClick={handleCloseAddressDialog} className="btn btn-cancel">Hủy</button>
                        <button type="button" onClick={handleSubmitAddress} className="btn btn-primary" disabled={submitting}>
                            {submitting ? <><Loader size={15} className="btn-icon spinner" /> Đang tạo...</> : <><Edit size={15} className="btn-icon" /> Tạo địa chỉ</>}
                        </button>
                    </>
                }
            >
                <form onSubmit={handleSubmitAddress} style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '8px 0' }}>
                    <div className="form-field">
                        <label className="form-label" htmlFor="addr-addressDetail">Địa chỉ chi tiết <span className="required-mark">*</span></label>
                        <div className="input-wrapper">
                            <MapPin className="input-icon" size={16} />
                            <input id="addr-addressDetail" type="text" name="addressDetail" value={addressForm.addressDetail} onChange={handleAddressFormChange} className={`form-input ${addressErrors.addressDetail ? 'error' : ''}`} placeholder="VD: Số 123, Đường Nguyễn Trãi" />
                        </div>
                        {addressErrors.addressDetail && <span className="error-message">{addressErrors.addressDetail}</span>}
                    </div>
                    <div className="form-field">
                        <label className="form-label" htmlFor="addr-city">Tỉnh / Thành phố</label>
                        <div className="input-wrapper">
                            <MapPin className="input-icon" size={16} />
                            <input id="addr-city" type="text" name="city" value={addressForm.city} onChange={handleAddressFormChange} className="form-input" placeholder="VD: Hồ Chí Minh" />
                        </div>
                    </div>
                    <div className="form-field">
                        <label className="form-label" htmlFor="addr-district">Quận / Huyện</label>
                        <div className="input-wrapper">
                            <MapPin className="input-icon" size={16} />
                            <input id="addr-district" type="text" name="district" value={addressForm.district} onChange={handleAddressFormChange} className="form-input" placeholder="VD: Quận 1" />
                        </div>
                    </div>
                    <div className="form-field">
                        <label className="form-label" htmlFor="addr-ward">Phường / Xã</label>
                        <div className="input-wrapper">
                            <MapPin className="input-icon" size={16} />
                            <input id="addr-ward" type="text" name="ward" value={addressForm.ward} onChange={handleAddressFormChange} className="form-input" placeholder="VD: Phường Bến Nghé" />
                        </div>
                    </div>
                </form>
            </FormDialog>
        </div>
    );
}
