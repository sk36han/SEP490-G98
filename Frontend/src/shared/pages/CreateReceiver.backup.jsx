import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';

import Toast from '../../components/Toast/Toast';
import { useToast } from '../hooks/useToast';
import { createReceiver } from '../lib/receiverService';
import { getCompanies, createCompany } from '../lib/companyService';
import { FormDialog } from '../../ui/dialogs/FormDialog';

import '../styles/CreateSupplier.css';

const CreateReceiver = () => {
    const navigate = useNavigate();
    const { toast, showToast, clearToast } = useToast();

    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        receiverName: '',
        phone: '',
        email: '',
        notes: '',
        companyId: '',
    });
    const [errors, setErrors] = useState({});

    const [companies, setCompanies] = useState([]);
    const [loadingCompanies, setLoadingCompanies] = useState(false);
    const [companyDialogOpen, setCompanyDialogOpen] = useState(false);
    const [companyForm, setCompanyForm] = useState({ companyCode: '', companyName: '' });
    const [companyErrors, setCompanyErrors] = useState({});
    const [creatingCompany, setCreatingCompany] = useState(false);

    const loadCompanies = async () => {
        setLoadingCompanies(true);
        try {
            const list = await getCompanies();
            setCompanies(list ?? []);
        } catch (err) {
            console.error('Failed to load companies', err);
            showToast('Không tải được danh sách công ty.', 'error');
        } finally {
            setLoadingCompanies(false);
        }
    };

    useEffect(() => {
        loadCompanies();
    }, []);

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

        if (!formData.companyId) {
            newErrors.companyId = 'Công ty là bắt buộc';
        }

        if (!formData.receiverName.trim()) {
            newErrors.receiverName = 'Tên người nhận là bắt buộc';
        }

        if (!formData.phone.trim()) {
            newErrors.phone = 'Số điện thoại là bắt buộc';
        }

        if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
            newErrors.email = 'Email không hợp lệ';
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
                notes: formData.notes.trim() || null,
                companyId: Number(formData.companyId) || null,
                isActive: true,
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

    const handleCreateCompany = () => {
        setCompanyDialogOpen(true);
        setCompanyForm({ companyCode: '', companyName: '' });
        setCompanyErrors({});
    };

    const handleCloseCompanyDialog = () => {
        setCompanyDialogOpen(false);
        setCompanyForm({ companyCode: '', companyName: '' });
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
        if (!companyForm.companyCode.trim()) {
            newErrors.companyCode = 'Mã công ty là bắt buộc';
        } else if (!/^[A-Za-z0-9_-]+$/.test(companyForm.companyCode.trim())) {
            newErrors.companyCode = 'Mã công ty chỉ chứa chữ, số, _ và -';
        }
        if (!companyForm.companyName.trim()) {
            newErrors.companyName = 'Tên công ty là bắt buộc';
        }
        setCompanyErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmitCompany = async (e) => {
        e.preventDefault();
        if (!validateCompanyForm()) return;
        setCreatingCompany(true);
        try {
            const created = await createCompany({
                companyName: companyForm.companyName.trim(),
            });
            showToast('Tạo công ty thành công!', 'success');
            await loadCompanies();
            // Auto-select newly created company
            const newId = created?.companyId ?? created?.CompanyId;
            if (newId) setFormData(prev => ({ ...prev, companyId: String(newId) }));
            handleCloseCompanyDialog();
        } catch (error) {
            const msg = error?.response?.data?.message || error?.message || 'Tạo công ty thất bại';
            showToast(msg, 'error');
        } finally {
            setCreatingCompany(false);
        }
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
                                <label className="form-label" htmlFor="companyId">
                                    Công ty <span className="required-mark">*</span>
                                </label>
                                <div className="input-wrapper">
                                    <Building2 className="input-icon" size={16} />
                                    <select
                                        id="companyId"
                                        name="companyId"
                                        value={formData.companyId}
                                        onChange={handleChange}
                                        className={`form-input ${errors.companyId ? 'error' : ''}`}
                                    >
                                        <option value="">
                                            {loadingCompanies ? 'Đang tải...' : '-- Chọn công ty --'}
                                        </option>
                                        {companies.map((c) => (
                                            <option key={c.companyId} value={c.companyId}>
                                                {c.companyCode} - {c.companyName}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
                                    <button
                                        type="button"
                                        onClick={handleCreateCompany}
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
                        </div>
                    </div>

                    <div className="info-section">
                        <div className="section-header-with-toggle">
                            <h2 className="section-title">Ghi chú</h2>
                        </div>

                        <div className="form-grid">
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

            <FormDialog
                open={companyDialogOpen}
                onClose={handleCloseCompanyDialog}
                title="Tạo mới công ty"
                actions={
                    <>
                        <button type="button" onClick={handleCloseCompanyDialog} className="btn btn-cancel" disabled={creatingCompany}>
                            Hủy
                        </button>
                        <button type="button" onClick={handleSubmitCompany} className="btn btn-primary" disabled={creatingCompany}>
                            {creatingCompany ? (
                                <><Loader size={15} className="btn-icon spinner" /> Đang tạo...</>
                            ) : (
                                <><Plus size={15} className="btn-icon" /> Tạo công ty</>
                            )}
                        </button>
                    </>
                }
            >
                <form onSubmit={handleSubmitCompany} style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '8px 0' }}>
                    

                    <div className="form-field">
                        <label className="form-label" htmlFor="companyName">
                            Tên công ty <span className="required-mark">*</span>
                        </label>
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
                                autoComplete="off"
                            />
                        </div>
                        {companyErrors.companyName && <span className="error-message">{companyErrors.companyName}</span>}
                    </div>
                </form>
            </FormDialog>
        </div>
    );
};

export default CreateReceiver;