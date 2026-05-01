import React, { useState, useEffect, useCallback } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Grid,
    InputAdornment,
    Typography,
    Box,
    Select,
    MenuItem,
    FormControl,
    CircularProgress,
    FormControlLabel,
    Checkbox,
} from '@mui/material';
import { Building2, FileText, Phone, Mail, MapPin, Loader } from 'lucide-react';
import { updateSupplier } from '../lib/supplierService';
import { useToast } from '../hooks/useToast';
import Toast from '../../components/Toast/Toast';
import { getProvinces, getProvincesV2, getProvinceWithWards, getProvinceWardsDirectV2 } from '../lib/locationService';

const labelSx = { mb: 0.75, fontWeight: 500, fontSize: '0.8125rem', color: 'text.secondary' };
const inputSx = {
    '& .MuiOutlinedInput-root': {
        borderRadius: 2,
        '& fieldset': { borderColor: 'divider' },
        '& input': { fontSize: '0.8125rem', py: 1 },
    },
};

function FieldBlock({ label, children }) {
    return (
        <Box sx={{ width: '100%' }}>
            <Typography variant="body2" sx={labelSx}>{label}</Typography>
            {children}
        </Box>
    );
}

export default function EditSupplierPopup({ open, onClose, supplier, onSave }) {
    const { toast, showToast, clearToast } = useToast();
    const [form, setForm] = useState({
        supplierCode: '',
        supplierName: '',
        taxCode: '',
        phone: '',
        email: '',
        address: '',
        isActive: true,
        // Address fields
        provinceCode: '',
        districtCode: '',
        wardCode: '',
        useNewAddress: false,
    });
    const [saving, setSaving] = useState(false);

    // Location state
    const [provinces, setProvinces] = useState([]);
    const [provincesV2, setProvincesV2] = useState([]);
    const [provinceDetail, setProvinceDetail] = useState(null);
    const [provinceWardsV2, setProvinceWardsV2] = useState(null);
    const [loadingProvinces, setLoadingProvinces] = useState(false);
    const [loadingWards, setLoadingWards] = useState(false);
    const [loadingProvincesV2, setLoadingProvincesV2] = useState(false);
    const [loadingWardsV2, setLoadingWardsV2] = useState(false);

    // Computed
    const districtOptions = provinceDetail?.districts || [];
    const selectedDistrict = districtOptions.find(d => String(d.code) === form.districtCode);
    const wardOptions = form.useNewAddress
        ? (provinceWardsV2?.wards || [])
        : (selectedDistrict?.wards || []);

    // Fetch provinces v1 + v2
    const loadProvinces = useCallback(() => {
        setLoadingProvinces(true);
        getProvinces()
            .then(list => setProvinces(list || []))
            .catch(() => setProvinces([]))
            .finally(() => setLoadingProvinces(false));

        setLoadingProvincesV2(true);
        getProvincesV2()
            .then(list => setProvincesV2(list || []))
            .catch(() => setProvincesV2([]))
            .finally(() => setLoadingProvincesV2(false));
    }, []);

    // Fetch districts + wards when province changes (v1)
    const loadDistrictDetail = useCallback((provinceCode) => {
        if (!provinceCode || form.useNewAddress) return;
        setLoadingWards(true);
        getProvinceWithWards(provinceCode)
            .then(detail => {
                if (detail) setProvinceDetail(detail);
            })
            .catch(() => setProvinceDetail(null))
            .finally(() => setLoadingWards(false));
    }, [form.useNewAddress]);

    // Fetch wards directly (v2)
    const loadWardV2 = useCallback((provinceCode) => {
        if (!provinceCode || !form.useNewAddress) return;
        setLoadingWardsV2(true);
        getProvinceWardsDirectV2(provinceCode)
            .then(detail => {
                if (detail) setProvinceWardsV2(detail);
            })
            .catch(() => setProvinceWardsV2(null))
            .finally(() => setLoadingWardsV2(false));
    }, [form.useNewAddress]);

    useEffect(() => {
        if (open) loadProvinces();
    }, [open, loadProvinces]);

    // Update district/ward lists when province or mode changes
    useEffect(() => {
        if (form.provinceCode) {
            loadDistrictDetail(form.provinceCode);
            loadWardV2(form.provinceCode);
        }
        // Reset on province change
        setForm(prev => ({ ...prev, districtCode: '', wardCode: '', provinceCode: prev.provinceCode }));
    }, [form.provinceCode]); // eslint-disable-line

    useEffect(() => {
        // Reset ward on district change (only for v1)
        if (!form.useNewAddress) {
            setForm(prev => ({ ...prev, wardCode: '' }));
        }
    }, [form.districtCode, form.useNewAddress]);

    useEffect(() => {
        if (supplier) {
            // Match province by name (city from backend)
            const cityName = supplier.city || '';
            const districtName = supplier.district || '';
            const wardName = supplier.ward || '';

            let provinceCode = '';
            let districtCode = '';
            let wardCode = '';

            // Try v1 provinces first (with districts)
            for (const p of provinces) {
                if (cityName && p.name === cityName) {
                    provinceCode = String(p.code);
                    // Load detail if not loaded yet
                    if (!provinceDetail) {
                        getProvinceWithWards(provinceCode).then(detail => {
                            if (detail) {
                                setProvinceDetail(detail);
                                // Match district
                                for (const d of (detail.districts || [])) {
                                    if (districtName && d.name === districtName) {
                                        setForm(prev => {
                                            const newForm = { ...prev, provinceCode: String(p.code), districtCode: String(d.code) };
                                            // Match ward
                                            for (const w of (d.wards || [])) {
                                                if (wardName && w.name === wardName) {
                                                    newForm.wardCode = String(w.code);
                                                    break;
                                                }
                                            }
                                            return newForm;
                                        });
                                        return;
                                    }
                                }
                                setForm(prev => ({ ...prev, provinceCode: String(p.code) }));
                            }
                        });
                    }
                    break;
                }
            }

            setForm(prev => ({
                ...prev,
                supplierCode: supplier.supplierCode ?? '',
                supplierName: supplier.supplierName ?? '',
                taxCode: supplier.taxCode ?? '',
                phone: supplier.phone ?? '',
                email: supplier.email ?? '',
                address: supplier.address ?? '',
                isActive: supplier.isActive ?? true,
                provinceCode,
                districtCode,
                wardCode,
            }));
        }
    }, [supplier, open, provinceDetail, provinces]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const handleClose = () => {
        if (!saving) {
            onClose();
        }
    };

    const handleSave = async () => {
        if (!form.supplierName.trim()) {
            showToast('Tên nhà cung cấp không được để trống.', 'error');
            return;
        }

        try {
            setSaving(true);
            const payload = {
                supplierName: form.supplierName.trim(),
                taxCode: form.taxCode.trim() || null,
                phone: form.phone.trim() || null,
                email: form.email.trim() || null,
                address: form.address.trim() || null,
                isActive: form.isActive,
            };

            // Resolve location names from codes
            if (form.provinceCode) {
                const selectedProvince = form.useNewAddress
                    ? provincesV2.find(p => String(p.code) === form.provinceCode)
                    : provinces.find(p => String(p.code) === form.provinceCode);
                if (selectedProvince) payload.city = selectedProvince.name;
            }
            if (!form.useNewAddress && form.districtCode) {
                const district = districtOptions.find(d => String(d.code) === form.districtCode);
                if (district) payload.district = district.name;
            }
            if (form.wardCode) {
                const ward = wardOptions.find(w => String(w.code) === form.wardCode);
                if (ward) payload.ward = ward.name;
            }

            await updateSupplier(supplier.supplierId, payload);
            showToast('Cập nhật nhà cung cấp thành công!', 'success');
            if (onSave) onSave();
            setTimeout(() => onClose(), 1200);
        } catch (err) {
            const msg = err?.response?.data?.message
                ?? err?.response?.data?.errors?.TaxCode?.[0]
                ?? err?.response?.data?.errors?.taxCode?.[0]
                ?? err?.message
                ?? 'Có lỗi xảy ra khi cập nhật nhà cung cấp.';
            showToast(msg, 'error');
        } finally {
            setSaving(false);
        }
    };

    if (!supplier) return null;

    return (
        <>
            <Dialog
                open={open}
                onClose={handleClose}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        boxShadow: 4,
                        minHeight: 420,
                        maxHeight: '90vh',
                    },
                }}
            >
                <DialogTitle
                    sx={{
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        pb: 2,
                        pt: 2.5,
                        fontWeight: 600,
                        fontSize: '1.125rem',
                    }}
                >
                    Chỉnh sửa nhà cung cấp
                </DialogTitle>
                <DialogContent sx={{ pt: 3, pb: 2, overflowY: 'auto', maxHeight: '70vh' }}>
                    <Grid container spacing={3}>
                        {/* Mã nhà cung cấp */}
                        <Grid item xs={12} sm={6}>
                            <FieldBlock label="Mã nhà cung cấp">
                                <TextField
                                    fullWidth
                                    size="small"
                                    value={form.supplierCode}
                                    InputProps={{ readOnly: true }}
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: 2,
                                            bgcolor: '#f6f7f9',
                                            '& input': { fontSize: '0.8125rem', py: 1 },
                                        },
                                    }}
                                />
                            </FieldBlock>
                        </Grid>
                        {/* Tên nhà cung cấp */}
                        <Grid item xs={12} sm={6}>
                            <FieldBlock label="Tên nhà cung cấp *">
                                <TextField
                                    fullWidth
                                    size="small"
                                    name="supplierName"
                                    value={form.supplierName}
                                    onChange={handleChange}
                                    disabled={saving}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <Building2 size={18} color="#757575" />
                                            </InputAdornment>
                                        ),
                                    }}
                                    sx={inputSx}
                                />
                            </FieldBlock>
                        </Grid>
                        {/* Mã số thuế */}
                        <Grid item xs={12} sm={6}>
                            <FieldBlock label="Mã số thuế">
                                <TextField
                                    fullWidth
                                    size="small"
                                    name="taxCode"
                                    value={form.taxCode}
                                    onChange={handleChange}
                                    disabled={saving}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <FileText size={18} color="#757575" />
                                            </InputAdornment>
                                        ),
                                    }}
                                    sx={inputSx}
                                />
                            </FieldBlock>
                        </Grid>
                        {/* Số điện thoại */}
                        <Grid item xs={12} sm={6}>
                            <FieldBlock label="Số điện thoại">
                                <TextField
                                    fullWidth
                                    size="small"
                                    name="phone"
                                    value={form.phone}
                                    onChange={handleChange}
                                    disabled={saving}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <Phone size={18} color="#757575" />
                                            </InputAdornment>
                                        ),
                                    }}
                                    sx={inputSx}
                                />
                            </FieldBlock>
                        </Grid>
                        {/* Email */}
                        <Grid item xs={12} sm={6}>
                            <FieldBlock label="Email">
                                <TextField
                                    fullWidth
                                    size="small"
                                    name="email"
                                    value={form.email}
                                    onChange={handleChange}
                                    disabled={saving}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <Mail size={18} color="#757575" />
                                            </InputAdornment>
                                        ),
                                    }}
                                    sx={inputSx}
                                />
                            </FieldBlock>
                        </Grid>
                        {/* Trạng thái */}
                        <Grid item xs={12} sm={6}>
                            <FieldBlock label="Trạng thái">
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            name="isActive"
                                            checked={form.isActive}
                                            onChange={handleChange}
                                            disabled={saving}
                                            sx={{ color: 'text.secondary' }}
                                        />
                                    }
                                    label={<Typography sx={{ fontSize: '0.8125rem', fontWeight: 500, color: form.isActive ? '#10b981' : '#ef4444' }}>{form.isActive ? 'Hoạt động' : 'Tắt'}</Typography>}
                                />
                            </FieldBlock>
                        </Grid>

                        {/* --- Địa chỉ --- */}
                        <Grid item xs={12}>
                            <Box sx={{ borderTop: '1px solid', borderColor: 'divider', pt: 2 }}>
                                <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', mb: 2, color: 'text.primary' }}>
                                    Địa chỉ
                                </Typography>
                                <Grid container spacing={2}>
                                    {/* Tỉnh/Thành phố */}
                                    <Grid item xs={12} sm={4}>
                                        <FieldBlock label="Tỉnh/Thành phố">
                                            <FormControl fullWidth size="small">
                                                <Select
                                                    name="provinceCode"
                                                    value={form.provinceCode}
                                                    onChange={handleChange}
                                                    disabled={saving || (form.useNewAddress ? loadingProvincesV2 : loadingProvinces)}
                                                    displayEmpty
                                                    sx={{ fontSize: '0.8125rem' }}
                                                >
                                                    <MenuItem value="">
                                                        <em style={{ color: '#9ca3af', fontSize: '0.8125rem' }}>
                                                            {form.useNewAddress
                                                                ? (loadingProvincesV2 ? 'Đang tải...' : 'Chọn tỉnh/thành phố')
                                                                : (loadingProvinces ? 'Đang tải...' : 'Chọn tỉnh/thành phố')}
                                                        </em>
                                                    </MenuItem>
                                                    {(form.useNewAddress ? provincesV2 : provinces).map(p => (
                                                        <MenuItem key={p.code} value={String(p.code)}>{p.name}</MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>
                                        </FieldBlock>
                                    </Grid>

                                    {/* Quận/Huyện */}
                                    {!form.useNewAddress && (
                                        <Grid item xs={12} sm={4}>
                                            <FieldBlock label="Quận/Huyện">
                                                <FormControl fullWidth size="small">
                                                    <Select
                                                        name="districtCode"
                                                        value={form.districtCode}
                                                        onChange={handleChange}
                                                        disabled={saving || !form.provinceCode || loadingWards}
                                                        displayEmpty
                                                        sx={{ fontSize: '0.8125rem' }}
                                                    >
                                                        <MenuItem value="">
                                                            <em style={{ color: '#9ca3af', fontSize: '0.8125rem' }}>
                                                                {loadingWards ? 'Đang tải...' : (!form.provinceCode ? 'Chọn tỉnh trước' : 'Chọn quận/huyện')}
                                                            </em>
                                                        </MenuItem>
                                                        {districtOptions.map(d => (
                                                            <MenuItem key={d.code} value={String(d.code)}>{d.name}</MenuItem>
                                                        ))}
                                                    </Select>
                                                </FormControl>
                                            </FieldBlock>
                                        </Grid>
                                    )}

                                    {/* Phường/Xã */}
                                    <Grid item xs={12} sm={4}>
                                        <FieldBlock label="Phường/Xã">
                                            <FormControl fullWidth size="small">
                                                <Select
                                                    name="wardCode"
                                                    value={form.wardCode}
                                                    onChange={handleChange}
                                                    disabled={saving
                                                        || !form.provinceCode
                                                        || (form.useNewAddress ? loadingWardsV2 : (!form.districtCode && !form.useNewAddress))}
                                                    displayEmpty
                                                    sx={{ fontSize: '0.8125rem' }}
                                                >
                                                    <MenuItem value="">
                                                        <em style={{ color: '#9ca3af', fontSize: '0.8125rem' }}>
                                                            {form.useNewAddress
                                                                ? (loadingWardsV2 ? 'Đang tải...' : 'Chọn phường/xã')
                                                                : (loadingWards ? 'Đang tải...' : (!form.provinceCode ? 'Chọn tỉnh trước' : 'Chọn phường/xã'))
                                                            }
                                                        </em>
                                                    </MenuItem>
                                                    {wardOptions.map(w => (
                                                        <MenuItem key={w.code} value={String(w.code)}>{w.name}</MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>
                                        </FieldBlock>
                                    </Grid>

                                    {/* Địa chỉ cụ thể */}
                                    <Grid item xs={12}>
                                        <FieldBlock label="Địa chỉ cụ thể">
                                            <TextField
                                                fullWidth
                                                size="small"
                                                name="address"
                                                value={form.address}
                                                onChange={handleChange}
                                                disabled={saving}
                                                placeholder="Số nhà, đường..."
                                                InputProps={{
                                                    startAdornment: (
                                                        <InputAdornment position="start">
                                                            <MapPin size={18} color="#757575" />
                                                        </InputAdornment>
                                                    ),
                                                }}
                                                sx={inputSx}
                                            />
                                        </FieldBlock>
                                    </Grid>

                                    {/* Toggle địa chỉ mới */}
                                    <Grid item xs={12}>
                                        <FormControlLabel
                                            control={
                                                <Checkbox
                                                    name="useNewAddress"
                                                    checked={form.useNewAddress}
                                                    onChange={handleChange}
                                                    disabled={saving}
                                                    size="small"
                                                />
                                            }
                                            label={<Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>Địa chỉ mới sau sát nhập</Typography>}
                                        />
                                    </Grid>
                                </Grid>
                            </Box>
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, pt: 0, gap: 1 }}>
                    <Button onClick={handleClose} variant="outlined" disabled={saving} sx={{ textTransform: 'none', borderRadius: 2 }}>
                        Hủy
                    </Button>
                    <Button
                        onClick={handleSave}
                        variant="contained"
                        disabled={saving}
                        sx={{ textTransform: 'none', borderRadius: 2, minWidth: 80 }}
                        startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
                    >
                        {saving ? 'Đang lưu...' : 'Lưu'}
                    </Button>
                </DialogActions>
            </Dialog>

            {toast && <Toast message={toast.message} type={toast.type} onClose={clearToast} />}
        </>
    );
}
