import React, { useState, useEffect } from 'react';
import { useToast } from '../hooks/useToast';
import { getProvinces, getProvinceWithWards, getProvincesV2, getProvinceWardsDirectV2 } from '../lib/locationService';
import {
    ArrowLeft,
    Plus,
    X,
    Building2,
    Mail,
    Phone,
    MapPin,
    FileText,
    Globe,
    Loader
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Toast from '../../components/Toast/Toast';
import { createSupplier } from '../lib/supplierService';
import '../styles/CreateSupplier.css';
import Tooltip from '@mui/material/Tooltip';

const CreateSupplier = () => {
    const navigate = useNavigate();
    const { toast, showToast, clearToast } = useToast();
    const [submitting, setSubmitting] = useState(false);
    const [useNewAddress, setUseNewAddress] = useState(false);
    
    // Vietnamese address state
    const [provinces, setProvinces] = useState([]);
    const [provinceDetail, setProvinceDetail] = useState(null);
    const [loadingProvinces, setLoadingProvinces] = useState(false);
    const [loadingWards, setLoadingWards] = useState(false);
    
    const [formData, setFormData] = useState({
        supplierName: '',
        email: '',
        phone: '',
        phoneCountryCode: '+84',
        taxCode: '',
        address: '',
        provinceCode: '',
        districtCode: '',
        wardCode: '',
        country: 'Việt Nam'
    });

    // V2 state variables
    const [provincesV2, setProvincesV2] = useState([]);
    const [loadingProvincesV2, setLoadingProvincesV2] = useState(false);
    const [loadingWardsV2, setLoadingWardsV2] = useState(false);
    const [provinceWardsV2, setProvinceWardsV2] = useState(null);

    // Computed values for display
    const districtOptions = provinceDetail?.districts || [];
    const selectedDistrict = districtOptions.find(d => String(d.code) === formData.districtCode);
    
    // When useNewAddress is ON: get all wards from all districts (sau sát nhập)
    // When useNewAddress is OFF: get wards from selected district (trước sát nhập)
    const wardOptions = useNewAddress 
        ? (provinceWardsV2?.wards || [])
        : (selectedDistrict?.wards || []);

    // Fetch provinces on mount - v1 (trước sát nhập)
    useEffect(() => {
        let cancelled = false;
        setLoadingProvinces(true);
        getProvinces()
            .then(list => {
                if (!cancelled) {
                    setProvinces(list || []);
                }
            })
            .catch(err => {
                if (!cancelled) {
                    console.error('Failed to load provinces', err);
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setLoadingProvinces(false);
                }
            });
        return () => { cancelled = true; };
    }, []);

    // Fetch provinces v2 on mount - v2 (sau sát nhập)
    useEffect(() => {
        let cancelled = false;
        setLoadingProvincesV2(true);
        getProvincesV2()
            .then(list => {
                if (!cancelled) {
                    setProvincesV2(list || []);
                }
            })
            .catch(err => {
                if (!cancelled) {
                    console.error('Failed to load provinces v2', err);
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setLoadingProvincesV2(false);
                }
            });
        return () => { cancelled = true; };
    }, []);

    // Fetch province detail (districts and wards) when province changes - v1 (trước sát nhập)
    useEffect(() => {
        if (!formData.provinceCode || useNewAddress) {
            setProvinceDetail(null);
            return;
        }
        
        let cancelled = false;
        setLoadingWards(true);
        getProvinceWithWards(formData.provinceCode)
            .then(detail => {
                if (!cancelled && detail) {
                    setProvinceDetail(detail);
                }
            })
            .catch(err => {
                if (!cancelled) {
                    console.error('Failed to load districts/wards', err);
                    setProvinceDetail(null);
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setLoadingWards(false);
                }
            });
        
        // Reset district and ward when province changes
        setFormData(prev => ({
            ...prev,
            districtCode: '',
            wardCode: ''
        }));
        
        return () => { cancelled = true; };
    }, [formData.provinceCode, useNewAddress]);

    // Fetch province wards directly - v2 (sau sát nhập)
    useEffect(() => {
        if (!formData.provinceCode || !useNewAddress) {
            setProvinceWardsV2(null);
            return;
        }
        
        let cancelled = false;
        setLoadingWardsV2(true);
        getProvinceWardsDirectV2(formData.provinceCode)
            .then(detail => {
                if (!cancelled && detail) {
                    setProvinceWardsV2(detail);
                }
            })
            .catch(err => {
                if (!cancelled) {
                    console.error('Failed to load wards v2', err);
                    setProvinceWardsV2(null);
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setLoadingWardsV2(false);
                }
            });
        
        // Reset ward when province changes
        setFormData(prev => ({
            ...prev,
            wardCode: ''
        }));
        
        return () => { cancelled = true; };
    }, [formData.provinceCode, useNewAddress]);

    // Reset ward when district changes (only when useNewAddress is OFF)
    useEffect(() => {
        if (!useNewAddress) {
            setFormData(prev => ({
                ...prev,
                wardCode: ''
            }));
        }
    }, [formData.districtCode, useNewAddress]);

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
        if (!formData.supplierName.trim()) {
            newErrors.supplierName = 'Tên nhà cung cấp là bắt buộc';
        }

        // Email validation (optional - only validate if provided)
        if (formData.email.trim() && !/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.email.trim())) {
            newErrors.email = 'Email không hợp lệ (ví dụ: example@company.com)';
        }

        // Phone validation (required)
        if (!formData.phone.trim()) {
            newErrors.phone = 'Số điện thoại là bắt buộc';
        } else {
            // Validate based on country code
            const phone = formData.phone.trim();
            if (formData.phoneCountryCode === '+84') {
                // Vietnam: 9-10 digits, can start with 0
                if (!/^0?\d{9,10}$/.test(phone)) {
                    newErrors.phone = 'Số điện thoại Việt Nam phải có 9-10 chữ số';
                }
            } else if (formData.phoneCountryCode === '+1') {
                // US/Canada: 10 digits
                if (!/^\d{10}$/.test(phone)) {
                    newErrors.phone = 'Số điện thoại phải có 10 chữ số';
                }
            } else if (formData.phoneCountryCode === '+86') {
                // China: 11 digits
                if (!/^\d{11}$/.test(phone)) {
                    newErrors.phone = 'Số điện thoại Trung Quốc phải có 11 chữ số';
                }
            } else if (formData.phoneCountryCode === '+81') {
                // Japan: 10-11 digits
                if (!/^\d{10,11}$/.test(phone)) {
                    newErrors.phone = 'Số điện thoại Nhật Bản phải có 10-11 chữ số';
                }
            } else if (formData.phoneCountryCode === '+82') {
                // Korea: 9-11 digits
                if (!/^\d{9,11}$/.test(phone)) {
                    newErrors.phone = 'Số điện thoại Hàn Quốc phải có 9-11 chữ số';
                }
            } else {
                // Generic validation for other countries
                if (!/^\d{7,15}$/.test(phone)) {
                    newErrors.phone = 'Số điện thoại phải có 7-15 chữ số';
                }
            }
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
            // Combine country code and phone number
            const fullPhone = `${formData.phoneCountryCode}${formData.phone.replace(/^0+/, '')}`;
            
            const payload = {
                supplierName: formData.supplierName.trim(),
                phone: fullPhone,
            };

            // Add optional fields if they have values
            if (formData.email && formData.email.trim()) {
                payload.email = formData.email.trim();
            }
            if (formData.taxCode && formData.taxCode.trim()) {
                payload.taxCode = formData.taxCode.trim();
            }
            if (formData.address && formData.address.trim()) {
                payload.address = formData.address.trim();
            }
            // Send province, district, ward codes to API
            if (formData.provinceCode) {
                payload.provinceCode = formData.provinceCode;
            }
            if (formData.districtCode) {
                payload.districtCode = formData.districtCode;
            }
            if (formData.wardCode) {
                payload.wardCode = formData.wardCode;
            }

            console.log('Sending payload to API:', payload);
            
            await createSupplier(payload);
            showToast('Tạo nhà cung cấp thành công!', 'success');
            setTimeout(() => {
                navigate(-1);
            }, 1500);
        } catch (error) {
            console.error('API Error:', error);
            showToast(error.message || 'Có lỗi xảy ra khi tạo nhà cung cấp', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancel = () => {
        navigate(-1);
    };

    return (
        <div className="create-supplier-page">
            {/* Header */}
            <div className="page-header">
                <div className="page-header-left">
                    <button type="button" onClick={handleCancel} className="back-button">
                        <ArrowLeft size={20} />
                        <span>Quay lại</span>
                    </button>
                </div>
                <div className="page-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Hủy — ghost */}
                    <button
                        type="button"
                        onClick={handleCancel}
                        className="btn btn-cancel"
                        disabled={submitting}
                    >
                        <X size={15} />
                        Hủy
                    </button>

                    {/* Tạo nhà cung cấp — primary */}
                    <button
                        type="button"
                        className="btn btn-primary"
                        disabled={submitting}
                        onClick={() => document.getElementById('create-supplier-form')?.requestSubmit()}
                    >
                        {submitting ? (
                            <>
                                <Loader size={15} className="spinner" />
                                Đang tạo...
                            </>
                        ) : (
                            <>
                                <Plus size={15} />
                                Tạo nhà cung cấp
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Form Card */}
            <div className="form-card">
                <form id="create-supplier-form" onSubmit={handleSubmit} className="form-wrapper">
                    {/* Intro */}
                    <div className="form-card-intro">
                        <h1 className="page-title">Thêm mới nhà cung cấp</h1>
                        <p className="form-card-required-note">
                            Các trường đánh dấu <span className="required-mark">*</span> là bắt buộc
                        </p>
                    </div>

                    {/* Layout 2 cột: Thông tin chung (trái) + Địa chỉ (phải) */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>
                    {/* Card 1: Thông tin chung */}
                        <div className="info-section" style={{ margin: 0 }}>
                        <div className="section-header-with-toggle">
                            <h2 className="section-title">Thông tin chung</h2>
                        </div>
                            <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                            {/* Tên nhà cung cấp */}
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

                            {/* Số điện thoại */}
                        <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                                <label htmlFor="phone" className="form-label">
                                    Số điện thoại <span className="required-mark">*</span>
                            </label>
                                <div className="phone-input-wrapper">
                                    <select
                                        name="phoneCountryCode"
                                        value={formData.phoneCountryCode}
                                        onChange={handleChange}
                                        className="phone-country-select"
                                    >
                                            <option value="+84">+84</option>
                                            <option value="+1">+1</option>
                                            <option value="+86">+86</option>
                                            <option value="+81">+81</option>
                                            <option value="+82">+82</option>
                                            <option value="+85">+85</option>
                                    </select>
                                    <div className="phone-input-container">
                                        <Phone className="phone-icon" size={16} />
                                <input
                                            id="phone"
                                            type="tel"
                                            name="phone"
                                            value={formData.phone}
                                    onChange={handleChange}
                                            placeholder={
                                                formData.phoneCountryCode === '+84' 
                                                    ? '912345678' 
                                                    : 'Nhập số điện thoại'
                                            }
                                            className={`phone-number-input ${errors.phone ? 'error' : ''}`}
                                            autoComplete="tel"
                                />
                            </div>
                                </div>
                                {errors.phone && (
                                    <span className="error-message" role="alert">{errors.phone}</span>
                            )}
                        </div>

                        {/* Email */}
                        <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                            <label htmlFor="email" className="form-label">
                                Email
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

                            {/* Mã số thuế */}
                                <div className="form-field" style={{ gridColumn: '1 / -1' }}>
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
                            </div>
                        </div>

                    {/* Card 2: Địa chỉ */}
                        <div className="info-section" style={{ margin: 0 }}>
                        <div className="section-header-with-toggle">
                            <h2 className="section-title">Địa chỉ</h2>
                        </div>
                            <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                                {/* Quốc gia */}
                            <div className="form-field">
                                <label htmlFor="country" className="form-label">Quốc gia</label>
                            <div className="input-wrapper">
                                <Globe className="input-icon" size={16} />
                                    <select
                                        id="country"
                                        name="country"
                                        value={formData.country}
                                        onChange={handleChange}
                                        className="form-input"
                                    >
                                        <option value="Việt Nam">Việt Nam</option>
                                    </select>
                                </div>
                            </div>

                            {/* Toggle: Địa chỉ mới sau sát nhập */}
                                <div className="form-field" style={{ display: 'flex', alignItems: 'center' }}>
                                    <Tooltip title="Loại cấu trúc địa chỉ 2 cấp sau sát nhập" placement="top" arrow>
                                        <label className="toggle-container" style={{ margin: 0, cursor: 'pointer' }}>
                                        <input
                                                type="checkbox"
                                                checked={useNewAddress}
                                                onChange={(e) => setUseNewAddress(e.target.checked)}
                                                className="toggle-checkbox"
                                            />
                                            <span className="toggle-slider"></span>
                                                <span className="toggle-label">Địa chỉ mới sau sát nhập</span>
                                    </label>
                                    </Tooltip>
                            </div>

                                {/* Tỉnh/Thành phố */}
                            <div className="form-field">
                                <label htmlFor="provinceCode" className="form-label">Tỉnh/Thành phố</label>
                                <div className="input-wrapper">
                                    <MapPin className="input-icon" size={16} />
                                    <select
                                        id="provinceCode"
                                        name="provinceCode"
                                        value={formData.provinceCode}
                                        onChange={handleChange}
                                        className="form-input"
                                        disabled={useNewAddress ? loadingProvincesV2 : loadingProvinces}
                                    >
                                        <option value="">
                                            {useNewAddress 
                                                ? (loadingProvincesV2 ? 'Đang tải...' : 'Chọn tỉnh/thành phố')
                                                : (loadingProvinces ? 'Đang tải...' : 'Chọn tỉnh/thành phố')
                                            }
                                        </option>
                                        {(useNewAddress ? provincesV2 : provinces).map(province => (
                                            <option key={province.code} value={province.code}>
                                                {province.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Quận/Huyện - chỉ hiện khi KHÔNG bật toggle */}
                            {!useNewAddress && (
                                <div className="form-field">
                                    <label htmlFor="districtCode" className="form-label">Quận/Huyện</label>
                                    <div className="input-wrapper">
                                        <MapPin className="input-icon" size={16} />
                                        <select
                                            id="districtCode"
                                            name="districtCode"
                                            value={formData.districtCode}
                                            onChange={handleChange}
                                            className="form-input"
                                            disabled={!formData.provinceCode || loadingWards}
                                        >
                                            <option value="">
                                                {loadingWards ? 'Đang tải...' : 'Chọn quận/huyện'}
                                            </option>
                                            {districtOptions.map(district => (
                                                <option key={district.code} value={district.code}>
                                                    {district.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}

                                {/* Phường/Xã */}
                            <div className="form-field">
                                <label htmlFor="wardCode" className="form-label">Phường/Xã</label>
                                <div className="input-wrapper">
                                    <MapPin className="input-icon" size={16} />
                                    <select
                                        id="wardCode"
                                        name="wardCode"
                                        value={formData.wardCode}
                                        onChange={handleChange}
                                        className="form-input"
                                        disabled={!formData.provinceCode || (useNewAddress ? loadingWardsV2 : loadingWards) || (!useNewAddress && !formData.districtCode)}
                                    >
                                        <option value="">
                                            {useNewAddress 
                                                ? (loadingWardsV2 ? 'Đang tải...' : 'Chọn phường/xã')
                                                : (loadingWards ? 'Đang tải...' : 'Chọn phường/xã')
                                            }
                                        </option>
                                        {wardOptions.map(ward => (
                                            <option key={ward.code} value={ward.code}>
                                                {ward.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Địa chỉ cụ thể */}
                                <div className="form-field span-2">
                                <label htmlFor="address" className="form-label">Địa chỉ cụ thể</label>
                                <div className="input-wrapper">
                                    <MapPin className="input-icon" size={16} />
                                    <input
                                        id="address"
                                        type="text"
                                        name="address"
                                        value={formData.address}
                                        onChange={handleChange}
                                        placeholder="Nhập địa chỉ cụ thể"
                                        className={`form-input ${errors.address ? 'error' : ''}`}
                                        autoComplete="street-address"
                                    />
                                </div>
                                {errors.address && (
                                    <span className="error-message" role="alert">{errors.address}</span>
                                )}
                                </div>
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
