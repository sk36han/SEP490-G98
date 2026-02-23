import React, { useState } from 'react';
import { useToast } from '../hooks/useToast';
import {
    ArrowLeft,
    Plus,
    X,
    Building2,
    Mail,
    Phone,
    MapPin,
    User,
    FileText,
    Globe,
    Loader
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Toast from '../../components/Toast/Toast';
import { createSupplier } from '../lib/supplierService';
import '../styles/CreateSupplier.css';

const CreateSupplier = () => {
    const navigate = useNavigate();
    const { toast, showToast, clearToast } = useToast();
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        supplierCode: '',
        supplierName: '',
        contactPerson: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        country: 'Việt Nam',
        taxCode: '',
        website: '',
        notes: ''
    });

    const [errors, setErrors] = useState({});

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        // Clear error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        // Required fields
        if (!formData.supplierCode.trim()) {
            newErrors.supplierCode = 'Mã nhà cung cấp là bắt buộc';
        }
        if (!formData.supplierName.trim()) {
            newErrors.supplierName = 'Tên nhà cung cấp là bắt buộc';
        }
        if (!formData.contactPerson.trim()) {
            newErrors.contactPerson = 'Người liên hệ là bắt buộc';
        }
        if (!formData.phone.trim()) {
            newErrors.phone = 'Số điện thoại là bắt buộc';
        } else if (!/^0\d{9}$/.test(formData.phone)) {
            newErrors.phone = 'Số điện thoại phải có 10 chữ số và bắt đầu bằng 0';
        }
        if (!formData.email.trim()) {
            newErrors.email = 'Email là bắt buộc';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Email không hợp lệ';
        }
        if (!formData.address.trim()) {
            newErrors.address = 'Địa chỉ là bắt buộc';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            showToast('Vui lòng kiểm tra lại thông tin!', 'error');
            const firstErrorField = Object.keys(errors)[0];
            if (firstErrorField) {
                document.getElementsByName(firstErrorField)[0]?.focus();
            }
            return;
        }

        try {
            setSubmitting(true);
            await createSupplier({
                supplierCode: formData.supplierCode.trim(),
                supplierName: formData.supplierName.trim(),
                taxCode: formData.taxCode.trim() || null,
                phone: formData.phone.trim() || null,
                email: formData.email.trim() || null,
                address: formData.address.trim() || null,
            });
            showToast('Tạo nhà cung cấp thành công!', 'success');
            setTimeout(() => {
                navigate(-1);
            }, 1500);
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancel = () => {
        navigate(-1);
    };

    return (
        <div className="create-supplier-page">
            {/* Thanh trên: Trái = Quay lại | Phải = Hủy + Tạo nhà cung cấp (không có breadcrumb Nhà cung cấp/Tạo mới) */}
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
                        onClick={() => document.getElementById('create-supplier-form')?.requestSubmit()}
                    >
                        {submitting ? (
                            <>
                                <Loader size={16} className="btn-icon spinner" />
                                Đang tạo...
                            </>
                        ) : (
                            <>
                                <Plus size={16} className="btn-icon" />
                                Tạo nhà cung cấp
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Card form: tiêu đề + mô tả ở đầu card, sau đó Thông tin nhà cung cấp + form */}
            <div className="form-card">
                <form id="create-supplier-form" onSubmit={handleSubmit} className="form-wrapper">
                    {/* Tiêu đề và mô tả ngay đầu card, bỏ khoảng trắng thừa */}
                    <div className="form-card-intro">
                        <h1 className="page-title">Tạo nhà cung cấp mới</h1>
                        <p className="page-subtitle">Điền thông tin để tạo nhà cung cấp mới trong hệ thống</p>
                        <p className="form-card-required-note">
                            Các trường đánh dấu <span className="required-mark">(*)</span> là bắt buộc
                        </p>
                    </div>

                <div className="form-content">
                    {/* Form Grid */}
                    <div className="form-grid">

                        {/* Supplier Code */}
                        <div className="form-field">
                            <label htmlFor="supplierCode" className="form-label">
                                Mã nhà cung cấp <span className="required-mark">*</span>
                            </label>
                            <div className="input-wrapper">
                                <Building2 className="input-icon" size={16} />
                                <input
                                    id="supplierCode"
                                    type="text"
                                    name="supplierCode"
                                    value={formData.supplierCode}
                                    onChange={handleChange}
                                    placeholder="Nhập mã NCC (VD: NCC001)"
                                    className={`form-input ${errors.supplierCode ? 'error' : ''}`}
                                    autoComplete="off"
                                />
                            </div>
                            {errors.supplierCode && (
                                <span className="error-message" role="alert">{errors.supplierCode}</span>
                            )}
                        </div>

                        {/* Supplier Name */}
                        <div className="form-field span-2">
                            <label htmlFor="supplierName" className="form-label">
                                Tên nhà cung cấp <span className="required-mark">*</span>
                            </label>
                            <div className="input-wrapper">
                                <Building2 className="input-icon" size={16} />
                                <input
                                    id="supplierName"
                                    type="text"
                                    name="supplierName"
                                    value={formData.supplierName}
                                    onChange={handleChange}
                                    placeholder="Nhập tên nhà cung cấp"
                                    className={`form-input ${errors.supplierName ? 'error' : ''}`}
                                    autoComplete="off"
                                />
                            </div>
                            {errors.supplierName && (
                                <span className="error-message" role="alert">{errors.supplierName}</span>
                            )}
                        </div>

                        {/* Contact Person */}
                        <div className="form-field">
                            <label htmlFor="contactPerson" className="form-label">
                                Người liên hệ <span className="required-mark">*</span>
                            </label>
                            <div className="input-wrapper">
                                <User className="input-icon" size={16} />
                                <input
                                    id="contactPerson"
                                    type="text"
                                    name="contactPerson"
                                    value={formData.contactPerson}
                                    onChange={handleChange}
                                    placeholder="Nhập tên người liên hệ"
                                    className={`form-input ${errors.contactPerson ? 'error' : ''}`}
                                    autoComplete="name"
                                />
                            </div>
                            {errors.contactPerson && (
                                <span className="error-message" role="alert">{errors.contactPerson}</span>
                            )}
                        </div>

                        {/* Email */}
                        <div className="form-field">
                            <label htmlFor="email" className="form-label">
                                Email <span className="required-mark">*</span>
                            </label>
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
                            {errors.email && (
                                <span className="error-message" role="alert">{errors.email}</span>
                            )}
                        </div>

                        {/* Phone */}
                        <div className="form-field">
                            <label htmlFor="phone" className="form-label">
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
                            {errors.phone && (
                                <span className="error-message" role="alert">{errors.phone}</span>
                            )}
                        </div>

                        {/* Address */}
                        <div className="form-field span-2">
                            <label htmlFor="address" className="form-label">
                                Địa chỉ <span className="required-mark">*</span>
                            </label>
                            <div className="input-wrapper">
                                <MapPin className="input-icon" size={16} />
                                <input
                                    id="address"
                                    type="text"
                                    name="address"
                                    value={formData.address}
                                    onChange={handleChange}
                                    placeholder="Nhập địa chỉ"
                                    className={`form-input ${errors.address ? 'error' : ''}`}
                                    autoComplete="street-address"
                                />
                            </div>
                            {errors.address && (
                                <span className="error-message" role="alert">{errors.address}</span>
                            )}
                        </div>

                        {/* City */}
                        <div className="form-field">
                            <label htmlFor="city" className="form-label">Thành phố</label>
                            <div className="input-wrapper">
                                <MapPin className="input-icon" size={16} />
                                <input
                                    id="city"
                                    type="text"
                                    name="city"
                                    value={formData.city}
                                    onChange={handleChange}
                                    placeholder="Nhập thành phố"
                                    className="form-input"
                                    autoComplete="address-level2"
                                />
                            </div>
                        </div>

                        {/* Country */}
                        <div className="form-field">
                            <label htmlFor="country" className="form-label">Quốc gia</label>
                            <div className="input-wrapper">
                                <Globe className="input-icon" size={16} />
                                <input
                                    id="country"
                                    type="text"
                                    name="country"
                                    value={formData.country}
                                    onChange={handleChange}
                                    placeholder="Nhập quốc gia"
                                    className="form-input"
                                    autoComplete="country-name"
                                />
                            </div>
                        </div>

                        {/* Tax Code */}
                        <div className="form-field">
                            <label htmlFor="taxCode" className="form-label">Mã số thuế</label>
                            <div className="input-wrapper">
                                <FileText className="input-icon" size={16} />
                                <input
                                    id="taxCode"
                                    type="text"
                                    name="taxCode"
                                    value={formData.taxCode}
                                    onChange={handleChange}
                                    placeholder="Nhập mã số thuế"
                                    className="form-input"
                                    autoComplete="off"
                                />
                            </div>
                        </div>

                        {/* Website */}
                        <div className="form-field span-3">
                            <label htmlFor="website" className="form-label">Website</label>
                            <div className="input-wrapper">
                                <Globe className="input-icon" size={16} />
                                <input
                                    id="website"
                                    type="url"
                                    name="website"
                                    value={formData.website}
                                    onChange={handleChange}
                                    placeholder="https://example.com"
                                    className="form-input"
                                    autoComplete="url"
                                />
                            </div>
                        </div>

                        {/* Notes */}
                        <div className="form-field span-3">
                            <label htmlFor="notes" className="form-label">Ghi chú</label>
                            <textarea
                                id="notes"
                                name="notes"
                                value={formData.notes}
                                onChange={handleChange}
                                placeholder="Nhập ghi chú (nếu có)"
                                rows="4"
                                className="form-textarea"
                            />
                        </div>
                    </div>
                </div>
                </form>
            </div>

            {/* Toast Notification */}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={clearToast}
                />
            )}
        </div>
    );
};

export default CreateSupplier;
