import { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Tooltip,
} from '@mui/material';
import { MapPin } from 'lucide-react';
import { createAddress } from '../../shared/lib/addressService';
import {
    getProvinces,
    getProvinceWithWards,
    getProvincesV2,
    getProvinceWardsDirectV2,
} from '../../shared/lib/locationService';
import '../../shared/styles/CreateSupplier.css';

const emptyForm = () => ({
    addressName: '',
    addressDetail: '',
    provinceCode: '',
    districtCode: '',
    wardCode: '',
});

/**
 * Dialog tạo địa chỉ mới cho công ty.
 * Tỉnh / Quận / Phường: dropdown (dữ liệu provinces.open-api.vn), cùng logic CreateSupplier.
 */
export function CreateAddressDialog({ open, onClose, onSuccess, companyId }) {
    const [form, setForm] = useState(emptyForm);
    const [useNewAddress, setUseNewAddress] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const [provinces, setProvinces] = useState([]);
    const [provincesV2, setProvincesV2] = useState([]);
    const [provinceDetail, setProvinceDetail] = useState(null);
    const [provinceWardsV2, setProvinceWardsV2] = useState(null);
    const [loadingProvinces, setLoadingProvinces] = useState(false);
    const [loadingWards, setLoadingWards] = useState(false);
    const [loadingProvincesV2, setLoadingProvincesV2] = useState(false);
    const [loadingWardsV2, setLoadingWardsV2] = useState(false);

    const districtOptions = provinceDetail?.districts || [];
    const selectedDistrict = districtOptions.find((d) => String(d.code) === form.districtCode);
    const wardOptions = useNewAddress
        ? (provinceWardsV2?.wards || [])
        : (selectedDistrict?.wards || []);

    const setField = useCallback((name, value) => {
        setForm((prev) => ({ ...prev, [name]: value }));
    }, []);

    // Load danh sách tỉnh khi mở dialog
    useEffect(() => {
        if (!open) return undefined;
        let cancelled = false;
        setLoadingProvinces(true);
        setLoadingProvincesV2(true);
        getProvinces()
            .then((list) => { if (!cancelled) setProvinces(list || []); })
            .catch(() => { if (!cancelled) setProvinces([]); })
            .finally(() => { if (!cancelled) setLoadingProvinces(false); });
        getProvincesV2()
            .then((list) => { if (!cancelled) setProvincesV2(list || []); })
            .catch(() => { if (!cancelled) setProvincesV2([]); })
            .finally(() => { if (!cancelled) setLoadingProvincesV2(false); });
        return () => { cancelled = true; };
    }, [open]);

    // Chi tiết tỉnh (quận + phường) — trước sáp nhập
    useEffect(() => {
        if (!open || !form.provinceCode || useNewAddress) {
            setProvinceDetail(null);
            return undefined;
        }
        let cancelled = false;
        setLoadingWards(true);
        getProvinceWithWards(form.provinceCode)
            .then((detail) => { if (!cancelled && detail) setProvinceDetail(detail); })
            .catch(() => { if (!cancelled) setProvinceDetail(null); })
            .finally(() => { if (!cancelled) setLoadingWards(false); });
        return () => { cancelled = true; };
    }, [open, form.provinceCode, useNewAddress]);

    // Phường trực thuộc tỉnh — sau sáp nhập
    useEffect(() => {
        if (!open || !form.provinceCode || !useNewAddress) {
            setProvinceWardsV2(null);
            return undefined;
        }
        let cancelled = false;
        setLoadingWardsV2(true);
        getProvinceWardsDirectV2(form.provinceCode)
            .then((detail) => { if (!cancelled && detail) setProvinceWardsV2(detail); })
            .catch(() => { if (!cancelled) setProvinceWardsV2(null); })
            .finally(() => { if (!cancelled) setLoadingWardsV2(false); });
        return () => { cancelled = true; };
    }, [open, form.provinceCode, useNewAddress]);

    useEffect(() => {
        if (!useNewAddress) {
            setForm((prev) => ({ ...prev, wardCode: '' }));
        }
    }, [form.districtCode, useNewAddress]);

    /** Đóng dialog → xóa form (lần mở sau không còn dữ liệu cũ) */
    useEffect(() => {
        if (open) return;
        setForm(emptyForm());
        setUseNewAddress(false);
        setError('');
        setProvinceDetail(null);
        setProvinceWardsV2(null);
    }, [open]);

    const selectedProvince = useMemo(() => {
        const list = useNewAddress ? provincesV2 : provinces;
        return list.find((p) => String(p.code) === form.provinceCode) || null;
    }, [useNewAddress, provinces, provincesV2, form.provinceCode]);

    const handleProvinceChange = (e) => {
        const value = e.target.value;
        setForm((prev) => ({ ...prev, provinceCode: value, districtCode: '', wardCode: '' }));
        setError('');
    };

    const handleDistrictChange = (e) => {
        setForm((prev) => ({ ...prev, districtCode: e.target.value, wardCode: '' }));
        setError('');
    };

    const handleWardChange = (e) => {
        setField('wardCode', e.target.value);
        setError('');
    };

    const handleToggleNewAddress = (e) => {
        const next = e.target.checked;
        setUseNewAddress(next);
        setForm((prev) => ({ ...prev, districtCode: '', wardCode: '' }));
        setProvinceDetail(null);
        setProvinceWardsV2(null);
        setError('');
    };

    const handleSubmit = async () => {
        if (!form.addressDetail.trim()) {
            setError('Vui lòng nhập địa chỉ cụ thể.');
            return;
        }
        if (!form.provinceCode) {
            setError('Vui lòng chọn Tỉnh/Thành phố.');
            return;
        }
        if (!useNewAddress && !form.districtCode) {
            setError('Vui lòng chọn Quận/Huyện.');
            return;
        }
        if (!form.wardCode) {
            setError('Vui lòng chọn Phường/Xã.');
            return;
        }

        let cityName = selectedProvince?.name || '';
        let districtName = null;
        let wardName = '';

        if (!useNewAddress && form.districtCode) {
            const d = districtOptions.find((x) => String(x.code) === form.districtCode);
            if (d) districtName = d.name;
        }
        const ward = wardOptions.find((w) => String(w.code) === form.wardCode);
        if (ward) wardName = ward.name;

        setSubmitting(true);
        setError('');
        try {
            const result = await createAddress({
                companyId: companyId ? Number(companyId) : null,
                addressName: form.addressName.trim() || null,
                addressDetail: form.addressDetail.trim(),
                city: cityName || null,
                district: districtName,
                ward: wardName || null,
                isDefault: false,
            });
            onSuccess?.(result);
            onClose();
        } catch (err) {
            setError(err?.response?.data?.message || err?.message || 'Tạo địa chỉ thất bại.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleClose = () => {
        if (submitting) return;
        setForm(emptyForm());
        setUseNewAddress(false);
        setError('');
        onClose();
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ fontWeight: 600, fontSize: '16px' }}>
                Tạo địa chỉ mới
            </DialogTitle>
            <DialogContent>
                <TextField
                    label="Tên địa chỉ"
                    value={form.addressName}
                    onChange={(e) => setField('addressName', e.target.value)}
                    fullWidth
                    margin="normal"
                    placeholder="VD: Văn phòng, Kho hàng..."
                />
                <TextField
                    label="Địa chỉ cụ thể *"
                    value={form.addressDetail}
                    onChange={(e) => setField('addressDetail', e.target.value)}
                    fullWidth
                    margin="normal"
                    autoFocus
                    placeholder="Số nhà, đường, ngõ..."
                />

                <div style={{ marginTop: 12, marginBottom: 8 }}>
                    <Tooltip title="Cấu trúc 2 cấp (tỉnh → phường) sau sáp nhập hành chính" placement="top" arrow>
                        <label className="toggle-container" style={{ margin: 0, cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={useNewAddress}
                                onChange={handleToggleNewAddress}
                                className="toggle-checkbox"
                            />
                            <span className="toggle-slider" />
                            <span className="toggle-label">Địa chỉ mới sau sáp nhập</span>
                        </label>
                    </Tooltip>
                </div>

                <div className="form-field" style={{ marginTop: 8 }}>
                    <label className="form-label" htmlFor="addr-province">Tỉnh/Thành phố</label>
                    <div className="input-wrapper">
                        <MapPin className="input-icon" size={16} />
                        <select
                            id="addr-province"
                            className="form-input"
                            value={form.provinceCode}
                            onChange={handleProvinceChange}
                            disabled={useNewAddress ? loadingProvincesV2 : loadingProvinces}
                            style={{ paddingLeft: 40 }}
                        >
                            <option value="">
                                {useNewAddress
                                    ? (loadingProvincesV2 ? 'Đang tải...' : 'Chọn tỉnh/thành phố')
                                    : (loadingProvinces ? 'Đang tải...' : 'Chọn tỉnh/thành phố')}
                            </option>
                            {(useNewAddress ? provincesV2 : provinces).map((p) => (
                                <option key={p.code} value={p.code}>{p.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {!useNewAddress && (
                    <div className="form-field">
                        <label className="form-label" htmlFor="addr-district">Quận/Huyện</label>
                        <div className="input-wrapper">
                            <MapPin className="input-icon" size={16} />
                            <select
                                id="addr-district"
                                className="form-input"
                                value={form.districtCode}
                                onChange={handleDistrictChange}
                                disabled={!form.provinceCode || loadingWards}
                                style={{ paddingLeft: 40 }}
                            >
                                <option value="">{loadingWards ? 'Đang tải...' : 'Chọn quận/huyện'}</option>
                                {districtOptions.map((d) => (
                                    <option key={d.code} value={d.code}>{d.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}

                <div className="form-field">
                    <label className="form-label" htmlFor="addr-ward">Phường/Xã</label>
                    <div className="input-wrapper">
                        <MapPin className="input-icon" size={16} />
                        <select
                            id="addr-ward"
                            className="form-input"
                            value={form.wardCode}
                            onChange={handleWardChange}
                            disabled={
                                !form.provinceCode
                                || (useNewAddress ? loadingWardsV2 : loadingWards)
                                || (!useNewAddress && !form.districtCode)
                            }
                            style={{ paddingLeft: 40 }}
                        >
                            <option value="">
                                {useNewAddress
                                    ? (loadingWardsV2 ? 'Đang tải...' : 'Chọn phường/xã')
                                    : (loadingWards ? 'Đang tải...' : 'Chọn phường/xã')}
                            </option>
                            {wardOptions.map((w) => (
                                <option key={w.code} value={w.code}>{w.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {error && (
                    <div style={{ color: '#ef4444', fontSize: '13px', marginTop: 8 }}>{error}</div>
                )}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <button type="button" onClick={handleClose} className="btn btn-cancel" disabled={submitting}>Hủy</button>
                <button type="button" onClick={handleSubmit} className="btn btn-primary" disabled={submitting}>
                    {submitting ? 'Đang tạo...' : 'Tạo'}
                </button>
            </DialogActions>
        </Dialog>
    );
}
