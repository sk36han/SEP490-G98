import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Save,
    X,
    User,
    Mail,
    Phone,
    MapPin,
    Globe,
    FileText,
} from 'lucide-react';
import { COUNTRIES } from '../data/vietnamAdministrative';
import { getProvinces, getProvinceWithWards } from '../lib/locationService';
import '../styles/CreateSupplier.css';

const CreateReceiver = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        receiverName: '',
        phone: '',
        email: '',
        country: 'VN',
        provinceCode: '',
        wardCode: '',
        address: '',
        notes: '',
        isActive: 'true',
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
                    // eslint-disable-next-line no-console
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
                    // eslint-disable-next-line no-console
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
    const wardOptions = useMemo(
        () =>
            provinceDetail?.districts
                ? provinceDetail.districts.flatMap((d) => d.wards || [])
                : [],
        [provinceDetail]
    );

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => {
            const next = { ...prev, [name]: value };
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
        if (!formData.email.trim()) {
            newErrors.email = 'Email là bắt buộc';
        }
        if (!formData.address.trim()) {
            newErrors.address = 'Địa chỉ chi tiết là bắt buộc';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!validateForm()) {
            return;
        }
        const payload = {
            ...formData,
            countryName: COUNTRIES.find((c) => c.code === formData.country)?.name ?? formData.country,
            provinceName: selectedProvince?.name ?? '',
            wardName:
                wardOptions.find((w) => String(w.code) === formData.wardCode)?.name ?? '',
        };
        // UI demo only – mã người nhận sẽ do backend tự sinh
        // eslint-disable-next-line no-console
        console.log('Receiver form submitted', payload);
        navigate(-1);
    };

    const handleCancel = () => {
        navigate(-1);
    };

    return (
        <div className="create-supplier-page">
            <div className="page-header">
                <button type="button" onClick={handleCancel} className="back-button">
                    <ArrowLeft size={20} />
                    <span>Quay lại</span>
                </button>

                <div>
                    <h1 className="page-title">Tạo người nhận mới</h1>
                    <p className="page-subtitle">Điền thông tin để tạo người nhận hàng trong hệ thống. Mã người nhận sẽ được hệ thống tự sinh.</p>
                </div>
            </div>

            <div className="form-card">
                <div className="card-header">
                    <h2 className="card-title">Thông tin người nhận</h2>
                    <p className="card-description">Các trường đánh dấu (*) là bắt buộc</p>
                </div>

                <form onSubmit={handleSubmit} className="form-content">
                    <div className="form-grid">
                        <div className="form-field span-2">
                            <label className="form-label">
                                Tên người nhận <span className="required-mark">*</span>
                            </label>
                            <div className="input-wrapper">
                                <User className="input-icon" size={16} />
                                <input
                                    type="text"
                                    name="receiverName"
                                    value={formData.receiverName}
                                    onChange={handleChange}
                                    placeholder="Nhập tên người nhận"
                                    className={`form-input ${errors.receiverName ? 'error' : ''}`}
                                />
                            </div>
                            {errors.receiverName && (
                                <span className="error-message">{errors.receiverName}</span>
                            )}
                        </div>

                        <div className="form-field">
                            <label className="form-label">
                                Email <span className="required-mark">*</span>
                            </label>
                            <div className="input-wrapper">
                                <Mail className="input-icon" size={16} />
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="example@company.com"
                                    className={`form-input ${errors.email ? 'error' : ''}`}
                                />
                            </div>
                            {errors.email && <span className="error-message">{errors.email}</span>}
                        </div>

                        <div className="form-field">
                            <label className="form-label">
                                Số điện thoại <span className="required-mark">*</span>
                            </label>
                            <div className="input-wrapper">
                                <Phone className="input-icon" size={16} />
                                <input
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    placeholder="0912345678"
                                    className={`form-input ${errors.phone ? 'error' : ''}`}
                                />
                            </div>
                            {errors.phone && <span className="error-message">{errors.phone}</span>}
                        </div>

                        <div className="form-field span-2">
                            <label className="form-label">
                                Địa chỉ chi tiết <span className="required-mark">*</span>
                            </label>
                            <div className="input-wrapper">
                                <MapPin className="input-icon" size={16} />
                                <input
                                    type="text"
                                    name="address"
                                    value={formData.address}
                                    onChange={handleChange}
                                    placeholder="Số nhà, đường..."
                                    className={`form-input ${errors.address ? 'error' : ''}`}
                                />
                            </div>
                            {errors.address && <span className="error-message">{errors.address}</span>}
                        </div>

                        <div className="form-field">
                            <label className="form-label">Quốc gia</label>
                            <div className="input-wrapper">
                                <Globe className="input-icon" size={16} />
                                <select
                                    name="country"
                                    value={formData.country}
                                    onChange={handleChange}
                                    className="form-input"
                                >
                                    {COUNTRIES.map((c) => (
                                        <option key={c.code} value={c.code}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="form-field">
                            <label className="form-label">Tỉnh / Thành phố</label>
                            <div className="input-wrapper">
                                <MapPin className="input-icon" size={16} />
                                <select
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
                                        provinces.map((p) => (
                                            <option key={p.code} value={String(p.code)}>
                                                {p.name}
                                            </option>
                                        ))}
                                </select>
                            </div>
                        </div>

                        <div className="form-field">
                            <label className="form-label">Phường / Xã</label>
                            <div className="input-wrapper">
                                <MapPin className="input-icon" size={16} />
                                <select
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
                                        wardOptions.map((w) => {
                                            const value = String(w.code);
                                            return (
                                                <option key={value} value={value}>
                                                    {w.name}
                                                </option>
                                            );
                                        })}
                                </select>
                            </div>
                            {wardError && (
                                <span className="form-error" style={{ marginTop: 4, display: 'block' }}>
                                    {wardError}
                                </span>
                            )}
                        </div>

                        <div className="form-field">
                            <label className="form-label">Trạng thái</label>
                            <div className="input-wrapper">
                                <FileText className="input-icon" size={16} />
                                <select
                                    name="isActive"
                                    value={formData.isActive}
                                    onChange={handleChange}
                                    className="form-input"
                                >
                                    <option value="true">Hoạt động</option>
                                    <option value="false">Ngưng</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-field span-3">
                            <label className="form-label">Ghi chú</label>
                            <textarea
                                name="notes"
                                value={formData.notes}
                                onChange={handleChange}
                                placeholder="Nhập ghi chú (nếu có)"
                                rows="4"
                                className="form-textarea"
                            />
                        </div>
                    </div>

                    <div className="form-actions">
                        <button type="button" onClick={handleCancel} className="btn btn-cancel">
                            <X size={16} className="btn-icon" />
                            Hủy
                        </button>
                        <div className="actions-right">
                            <button type="submit" className="btn btn-primary">
                                <Save size={16} className="btn-icon" />
                                Tạo người nhận
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateReceiver;
