import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Plus,
    X,
    User,
    Mail,
    Phone,
    MapPin,
    Globe,
    FileText,
    Loader,
} from 'lucide-react';

import Toast from '../../components/Toast/Toast';
import { COUNTRIES } from '../data/vietnamAdministrative';
import { useToast } from '../hooks/useToast';
import { getProvinces, getProvinceWithWards } from '../lib/locationService';
import { createReceiver } from '../lib/receiverService';

import '../styles/CreateSupplier.css';

const CreateReceiver = () => {
    const navigate = useNavigate();
    const { toast, showToast, clearToast } = useToast();

    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        receiverName: '',
        phone: '',
        email: '',
        country: 'VN',
        provinceCode: '',
        wardCode: '',
        address: '',
        notes: '',
    });
    const [errors, setErrors] = useState({});

    const [provinces, setProvinces] = useState([]);
    const [loadingProvinces, setLoadingProvinces] = useState(false);
    const [provinceError, setProvinceError] = useState('');
    const [provinceDetail, setProvinceDetail] = useState(null);
    const [loadingWards, setLoadingWards] = useState(false);
    const [wardError, setWardError] = useState('');

    useEffect(() => {
        let cancelled = false;

        const fetchProvinces = async () => {
            setLoadingProvinces(true);
            setProvinceError('');

            try {
                const list = await getProvinces();
                if (!cancelled) {
                    setProvinces(list || []);
                }
            } catch (err) {
                if (!cancelled) {
                    console.error('Failed to load provinces', err);
                    setProvinceError('Không tải được danh sách tỉnh/thành phố. Vui lòng thử lại sau.');
                }
            } finally {
                if (!cancelled) {
                    setLoadingProvinces(false);
                }
            }
        };

        fetchProvinces();

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (!formData.provinceCode) {
            setProvinceDetail(null);
            setWardError('');
            return;
        }

        let cancelled = false;
        setWardError('');
        setLoadingWards(true);

        getProvinceWithWards(formData.provinceCode)
            .then((detail) => {
                if (!cancelled && detail) {
                    setProvinceDetail(detail);
                }
            })
            .catch((err) => {
                if (!cancelled) {
                    console.error('Failed to load wards', err);
                    setWardError('Không tải được danh sách phường/xã. Vui lòng thử lại.');
                    setProvinceDetail(null);
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setLoadingWards(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [formData.provinceCode]);

    const selectedProvince = useMemo(
        () => provinces.find((p) => String(p.code) === formData.provinceCode),
        [provinces, formData.provinceCode]
    );

    const wardOptions = useMemo(() => {
        if (!provinceDetail?.districts) return [];

        const list = provinceDetail.districts.flatMap((district) => district.wards || []);
        return [...list].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'vi'));
    }, [provinceDetail]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;

        setFormData((prev) => {
            const next = { ...prev, [name]: type === 'checkbox' ? checked : value };
            if (name === 'provinceCode') {
                next.wardCode = '';
            }
            return next;
        });

        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: '' }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.receiverName.trim()) {
            newErrors.receiverName = 'Tên người nhận là bắt buộc';
        }

        if (!formData.phone.trim()) {
            newErrors.phone = 'Số điện thoại là bắt buộc';
        }

        if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
            newErrors.email = 'Email không hợp lệ';
        }

        if (!formData.address.trim()) {
            newErrors.address = 'Địa chỉ chi tiết là bắt buộc';
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

            const payload = {
                receiverName: formData.receiverName.trim(),
                phone: formData.phone.trim(),
                email: formData.email.trim() || null,
                address: formData.address.trim(),
                isActive: true,
                notes: formData.notes.trim() || null,
                countryName: COUNTRIES.find((country) => country.code === formData.country)?.name ?? formData.country,
                provinceName: selectedProvince?.name ?? '',
                wardName: wardOptions.find((ward) => String(ward.code) === formData.wardCode)?.name ?? '',
            };

            await createReceiver(payload);
            showToast('Tạo người nhận thành công!', 'success');

            setTimeout(() => {
                navigate(-1);
            }, 900);
        } catch (error) {
            const errorMessage =
                error?.response?.data?.message ||
                error?.response?.data?.Message ||
                error?.message ||
                'Có lỗi xảy ra khi tạo người nhận';
            showToast(errorMessage, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancel = () => {
        navigate(-1);
    };

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
                                Tạo người nhận
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
                            Các trường đánh dấu <span className="required-mark">*</span> là bắt buộc
                        </p>
                    </div>

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

                            <div className="form-field span-2">
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
                                        placeholder="Số nhà, đường..."
                                        className={`form-input ${errors.address ? 'error' : ''}`}
                                        autoComplete="street-address"
                                    />
                                </div>
                                {errors.address && <span className="error-message">{errors.address}</span>}
                            </div>

                            <div className="form-field">
                                <label className="form-label" htmlFor="country">Quốc gia</label>
                                <div className="input-wrapper">
                                    <Globe className="input-icon" size={16} />
                                    <select
                                        id="country"
                                        name="country"
                                        value={formData.country}
                                        onChange={handleChange}
                                        className="form-input"
                                    >
                                        {COUNTRIES.map((country) => (
                                            <option key={country.code} value={country.code}>
                                                {country.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="form-field">
                                <label className="form-label" htmlFor="provinceCode">Tỉnh / Thành phố</label>
                                <div className="input-wrapper">
                                    <MapPin className="input-icon" size={16} />
                                    <select
                                        id="provinceCode"
                                        name="provinceCode"
                                        value={formData.provinceCode}
                                        onChange={handleChange}
                                        className="form-input"
                                        disabled={loadingProvinces || !!provinceError}
                                    >
                                        <option value="">
                                            {loadingProvinces
                                                ? 'Đang tải danh sách tỉnh/thành...'
                                                : provinceError || '-- Chọn tỉnh / thành phố --'}
                                        </option>
                                        {!loadingProvinces &&
                                            !provinceError &&
                                            provinces.map((province) => (
                                                <option key={province.code} value={String(province.code)}>
                                                    {province.name}
                                                </option>
                                            ))}
                                    </select>
                                </div>
                            </div>

                            <div className="form-field">
                                <label className="form-label" htmlFor="wardCode">Phường / Xã</label>
                                <div className="input-wrapper">
                                    <MapPin className="input-icon" size={16} />
                                    <select
                                        id="wardCode"
                                        name="wardCode"
                                        value={formData.wardCode}
                                        onChange={handleChange}
                                        className="form-input"
                                        disabled={!formData.provinceCode || loadingWards}
                                    >
                                        <option value="">
                                            {!formData.provinceCode
                                                ? '-- Chọn tỉnh/thành trước --'
                                                : loadingWards
                                                    ? 'Đang tải phường/xã...'
                                                    : '-- Chọn phường / xã --'}
                                        </option>
                                        {!loadingWards &&
                                            wardOptions.map((ward) => {
                                                const value = String(ward.code);
                                                return (
                                                    <option key={value} value={value}>
                                                        {ward.name}
                                                    </option>
                                                );
                                            })}
                                    </select>
                                </div>
                                {wardError && <span className="error-message">{wardError}</span>}
                            </div>

                            <div className="form-field span-3">
                                <label className="form-label" htmlFor="notes">Ghi chú</label>
                                <div className="input-wrapper textarea-wrapper">
                                    <FileText className="input-icon textarea-icon" size={16} />
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
                    </div>
                </form>
            </div>

            {toast && toast.message && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}
        </div>
    );
};

export default CreateReceiver;
