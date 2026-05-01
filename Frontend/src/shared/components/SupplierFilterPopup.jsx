import React, { useState, useCallback, useEffect } from 'react';
import { Box, Paper, Typography, TextField, Autocomplete } from '@mui/material';
import { getProvinces, getProvinceWithWards } from '../lib/locationService';
import {
    ListFilterPopupShell,
    LIST_FILTER_DROPDOWN_PAPER_SX,
    LIST_FILTER_INPUT_SX,
    LIST_FILTER_LABEL_SX,
} from './listFilterPopup';

// ── Component ──────────────────────────────────────────────────────────────
export default function SupplierFilterPopup({ open, onClose, initialValues = {}, onApply }) {
    const [trangThaiOption, setTrangThaiOption] = useState({ value: '', label: 'Tất cả' });
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    // Address filter state - use province detail approach like CreateSupplier
    const [provinces, setProvinces] = useState([]);
    const [provinceDetail, setProvinceDetail] = useState(null);
    const [provinceOption, setProvinceOption] = useState(null);
    const [districtOption, setDistrictOption] = useState(null);
    const [wardOption, setWardOption] = useState(null);
    const [loadingProvinces, setLoadingProvinces] = useState(false);
    const [loadingDistricts, setLoadingDistricts] = useState(false);

    const TRANG_THAI_OPTIONS = [
        { value: '', label: 'Tất cả' },
        { value: 'true', label: 'Hoạt động' },
        { value: 'false', label: 'Ngừng Hoạt Động' },
    ];

    // Computed options from province detail - same as CreateSupplier
    const districtOptions = provinceDetail?.districts || [];
    const selectedDistrict = districtOptions.find(d => districtOption && String(d.code) === String(districtOption.code));
    const wardOptions = selectedDistrict?.wards || [];

    // Load provinces when popup opens - use getProvinceWithWards like CreateSupplier
    useEffect(() => {
        if (!open) return;

        // Reset all states
        setProvinceOption(null);
        setDistrictOption(null);
        setWardOption(null);
        setProvinceDetail(null);
        setTrangThaiOption({ value: '', label: 'Tất cả' });
        setFromDate('');
        setToDate('');

        let cancelled = false;
        setLoadingProvinces(true);
        getProvinces()
            .then(list => {
                if (cancelled) return;
                setProvinces(list || []);

                // If there's initial provinceCode, load the cascade
                if (initialValues.provinceCode) {
                    const province = list?.find(p => String(p.code) === String(initialValues.provinceCode));
                    if (province) {
                        setProvinceOption(province);
                        return getProvinceWithWards(province.code);
                    }
                }
                return null;
            })
            .then(detail => {
                if (cancelled) return;
                if (detail) {
                    setProvinceDetail(detail);
                    // Find and set district
                    if (initialValues.districtCode && detail.districts) {
                        const district = detail.districts.find(d => String(d.code) === String(initialValues.districtCode));
                        if (district) {
                            setDistrictOption(district);
                            // Find and set ward
                            if (initialValues.wardCode && district.wards) {
                                const ward = district.wards.find(w => String(w.code) === String(initialValues.wardCode));
                                if (ward) setWardOption(ward);
                            }
                        }
                    }
                }
                // Set other initial values
                if (initialValues.isActive === true) {
                    setTrangThaiOption({ value: 'true', label: 'Hoạt động' });
                } else if (initialValues.isActive === false) {
                    setTrangThaiOption({ value: 'false', label: 'Ngừng HĐ' });
                }
                setFromDate(initialValues.fromDate ?? '');
                setToDate(initialValues.toDate ?? '');
            })
            .catch(err => console.error('Failed to load location data', err))
            .finally(() => {
                if (!cancelled) setLoadingProvinces(false);
            });

        return () => { cancelled = true; };
    }, [open, initialValues.provinceCode, initialValues.districtCode, initialValues.wardCode]);

    // Fetch province detail when province changes - use getProvinceWithWards
    useEffect(() => {
        if (!provinceOption) {
            setProvinceDetail(null);
            setDistrictOption(null);
            setWardOption(null);
            return;
        }

        let cancelled = false;
        setLoadingDistricts(true);
        getProvinceWithWards(provinceOption.code)
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
                if (!cancelled) setLoadingDistricts(false);
            });

        // Reset district and ward when province changes
        setDistrictOption(null);
        setWardOption(null);

        return () => { cancelled = true; };
    }, [provinceOption]);

    const handleApply = useCallback(() => {
        const isActive = trangThaiOption.value === '' ? null : trangThaiOption.value === 'true';
        onApply({
            isActive,
            fromDate: fromDate || undefined,
            toDate: toDate || undefined,
            provinceCode: provinceOption?.code ? String(provinceOption.code) : undefined,
            districtCode: districtOption?.code ? String(districtOption.code) : undefined,
            wardCode: wardOption?.code ? String(wardOption.code) : undefined,
        });
        onClose();
    }, [trangThaiOption, fromDate, toDate, provinceOption, districtOption, wardOption, onApply, onClose]);

    const handleClear = useCallback(() => {
        setTrangThaiOption({ value: '', label: 'Tất cả' });
        setFromDate('');
        setToDate('');
        setProvinceOption(null);
        setDistrictOption(null);
        setWardOption(null);
        setProvinceDetail(null);
        onApply({ isActive: null, fromDate: undefined, toDate: undefined, provinceCode: undefined, districtCode: undefined, wardCode: undefined });
        onClose();
    }, [onApply, onClose]);

    return (
        <ListFilterPopupShell open={open} onClose={onClose} onClear={handleClear} onApply={handleApply} width={360}>
                {/* Tỉnh/Thành phố */}
                <Box>
                    <Typography variant="body2" sx={LIST_FILTER_LABEL_SX}>Tỉnh/Thành phố</Typography>
                    <Autocomplete
                        size="small"
                        options={provinces}
                        getOptionLabel={(o) => o.name || ''}
                        value={provinceOption}
                        onChange={(_, v) => {
                            setProvinceOption(v);
                            setDistrictOption(null);
                            setWardOption(null);
                            setProvinceDetail(null);
                        }}
                        loading={loadingProvinces}
                        isOptionEqualToValue={(a, b) => a.code === b.code}
                        PaperComponent={(props) => (
                            <Paper {...props} sx={LIST_FILTER_DROPDOWN_PAPER_SX} />
                        )}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                placeholder="Chọn tỉnh/thành"
                                sx={LIST_FILTER_INPUT_SX}
                                InputProps={{
                                    ...params.InputProps,
                                    endAdornment: (
                                        <>
                                            {loadingProvinces ? params.InputProps.endAdornment : null}
                                        </>
                                    ),
                                }}
                            />
                        )}
                    />
                </Box>

                {/* Quận/Huyện */}
                <Box>
                    <Typography variant="body2" sx={LIST_FILTER_LABEL_SX}>Quận/Huyện</Typography>
                    <Autocomplete
                        size="small"
                        options={districtOptions}
                        getOptionLabel={(o) => o.name || ''}
                        value={districtOption}
                        onChange={(_, v) => {
                            setDistrictOption(v);
                            setWardOption(null);
                        }}
                        disabled={!provinceOption}
                        loading={loadingDistricts}
                        isOptionEqualToValue={(a, b) => a.code === b.code}
                        PaperComponent={(props) => (
                            <Paper {...props} sx={LIST_FILTER_DROPDOWN_PAPER_SX} />
                        )}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                placeholder="Chọn quận/huyện"
                                sx={LIST_FILTER_INPUT_SX}
                                InputProps={{
                                    ...params.InputProps,
                                    endAdornment: (
                                        <>
                                            {loadingDistricts ? params.InputProps.endAdornment : null}
                                        </>
                                    ),
                                }}
                            />
                        )}
                    />
                </Box>

                {/* Phường/Xã */}
                <Box>
                    <Typography variant="body2" sx={LIST_FILTER_LABEL_SX}>Phường/Xã</Typography>
                    <Autocomplete
                        size="small"
                        options={wardOptions}
                        getOptionLabel={(o) => o.name || ''}
                        value={wardOption}
                        onChange={(_, v) => setWardOption(v)}
                        disabled={!districtOption}
                        loading={false}
                        isOptionEqualToValue={(a, b) => a.code === b.code}
                        PaperComponent={(props) => (
                            <Paper {...props} sx={LIST_FILTER_DROPDOWN_PAPER_SX} />
                        )}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                placeholder="Chọn phường/xã"
                                sx={LIST_FILTER_INPUT_SX}
                            />
                        )}
                    />
                </Box>

                {/* Trạng thái */}
                <Box>
                    <Typography variant="body2" sx={LIST_FILTER_LABEL_SX}>Trạng thái</Typography>
                    <Autocomplete
                        size="small"
                        options={TRANG_THAI_OPTIONS}
                        getOptionLabel={(opt) => opt.label}
                        value={trangThaiOption}
                        onChange={(_, v) => setTrangThaiOption(v || TRANG_THAI_OPTIONS[0])}
                        isOptionEqualToValue={(a, b) => a.value === b.value}
                        PaperComponent={(props) => (
                            <Paper {...props} sx={LIST_FILTER_DROPDOWN_PAPER_SX} />
                        )}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                placeholder="Chọn trạng thái"
                                sx={LIST_FILTER_INPUT_SX}
                            />
                        )}
                    />
                </Box>

                {/* Ngày tạo */}
                <Box>
                    <Typography variant="body2" sx={LIST_FILTER_LABEL_SX}>Ngày tạo</Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <TextField
                            size="small"
                            type="date"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            placeholder="Từ ngày"
                            fullWidth
                            sx={LIST_FILTER_INPUT_SX}
                        />
                        <TextField
                            size="small"
                            type="date"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            placeholder="Đến ngày"
                            fullWidth
                            sx={LIST_FILTER_INPUT_SX}
                        />
                    </Box>
                </Box>
        </ListFilterPopupShell>
    );
}
