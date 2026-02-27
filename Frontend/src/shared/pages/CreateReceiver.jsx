import React, { useState } from 'react';
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
import '../styles/CreateSupplier.css';

const CreateReceiver = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        receiverCode: '',
        receiverName: '',
        phone: '',
        email: '',
        ward: '',
        province: '',
        country: 'Việt Nam',
        address: '',
        notes: '',
        isActive: 'true',
    });
    const [errors, setErrors] = useState({});

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: '' }));
        }
    };

    const validateForm = () => {
        const newErrors = {};
        if (!formData.receiverCode.trim()) {
            newErrors.receiverCode = 'Mã người nhận là bắt buộc';
        }
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
            newErrors.address = 'Địa chỉ là bắt buộc';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!validateForm()) {
            return;
        }
        // UI demo only – chưa gọi API, chỉ log ra console
        // eslint-disable-next-line no-console
        console.log('Receiver form submitted', formData);
        navigate(-1);
    };

    const handleCancel = () => {
        navigate(-1);
    };

    return (
        <div className="create-supplier-page">
            <div className="page-header">
                <button onClick={handleCancel} className="back-button">
                    <ArrowLeft size={20} />
                    <span>Quay lại</span>
                </button>

                <div>
                    <h1 className="page-title">Tạo người nhận mới</h1>
                    <p className="page-subtitle">Điền thông tin để tạo người nhận hàng trong hệ thống</p>
                </div>
            </div>

            <div className="form-card">
                <div className="card-header">
                    <h2 className="card-title">Thông tin người nhận</h2>
                    <p className="card-description">Các trường đánh dấu (*) là bắt buộc</p>
                </div>

                <form onSubmit={handleSubmit} className="form-content">
                    <div className="form-grid">
                        <div className="form-field">
                            <label className="form-label">
                                Mã người nhận <span className="required-mark">*</span>
                            </label>
                            <div className="input-wrapper">
                                <FileText className="input-icon" size={16} />
                                <input
                                    type="text"
                                    name="receiverCode"
                                    value={formData.receiverCode}
                                    onChange={handleChange}
                                    placeholder="Nhập mã người nhận (VD: RCV001)"
                                    className={`form-input ${errors.receiverCode ? 'error' : ''}`}
                                />
                            </div>
                            {errors.receiverCode && (
                                <span className="error-message">{errors.receiverCode}</span>
                            )}
                        </div>

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
                                    placeholder="Số nhà, đường, quận/huyện..."
                                    className={`form-input ${errors.address ? 'error' : ''}`}
                                />
                            </div>
                            {errors.address && <span className="error-message">{errors.address}</span>}
                        </div>

                        <div className="form-field">
                            <label className="form-label">Phường</label>
                            <div className="input-wrapper">
                                <MapPin className="input-icon" size={16} />
                                <input
                                    type="text"
                                    name="ward"
                                    value={formData.ward}
                                    onChange={handleChange}
                                    placeholder="Nhập phường"
                                    className="form-input"
                                />
                            </div>
                        </div>

                        <div className="form-field">
                            <label className="form-label">Tỉnh / Thành phố</label>
                            <div className="input-wrapper">
                                <MapPin className="input-icon" size={16} />
                                <input
                                    type="text"
                                    name="province"
                                    value={formData.province}
                                    onChange={handleChange}
                                    placeholder="Nhập tỉnh / thành phố"
                                    className="form-input"
                                />
                            </div>
                        </div>

                        <div className="form-field">
                            <label className="form-label">Quốc gia</label>
                            <div className="input-wrapper">
                                <Globe className="input-icon" size={16} />
                                <input
                                    type="text"
                                    name="country"
                                    value={formData.country}
                                    onChange={handleChange}
                                    placeholder="Nhập quốc gia"
                                    className="form-input"
                                />
                            </div>
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

