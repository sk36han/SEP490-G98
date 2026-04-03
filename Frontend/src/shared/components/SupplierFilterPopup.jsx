import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
    Box,
    Paper,
    Typography,
    TextField,
    Button,
    IconButton,
    Autocomplete,
} from '@mui/material';
import { X } from 'lucide-react';
import { getProvinces, getProvinceWithWards } from '../lib/locationService';

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

    const boxRef = useRef(null);
    const dragRef = useRef({ x: 0, y: 0, startX: 0, startY: 0 });

    const TRANG_THAI_OPTIONS = [
        { value: '', label: 'Tất cả' },
        { value: 'true', label: 'Hoạt động' },
        { value: 'false', label: 'Ngừng Hoạt Động' },
    ];

    // Computed options from province detail - same as CreateSupplier
    const districtOptions = provinceDetail?.districts || [];
    const selectedDistrict = districtOptions.find(d => districtOption && String(d.code) === String(districtOption.code));
    const wardOptions = selectedDistrict?.wards || [];

    // Custom dropdown paper style - fix scrollbar issue
    const dropdownPaperSx = {
        borderRadius: '10px',
        mt: 1,
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.08)',
        border: '1px solid rgba(0, 0, 0, 0.08)',
        overflow: 'hidden',
        '& .MuiAutocomplete-listbox': {
            fontSize: '13px',
            fontFamily: "'Be Vietnam Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Robonto, sans-serif",
            padding: '4px 0',
            maxHeight: '240px',
        },
        '& .MuiAutocomplete-option': {
            fontSize: '13px',
            fontFamily: "'Be Vietnam Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Robonto, sans-serif",
            padding: '8px 12px',
            '&:hover': {
                bgcolor: '#f3f4f6',
            },
            '&[aria-selected="true"]': {
                bgcolor: '#e0f2fe',
            },
        },
    };

    const inputSx = {
        '& .MuiOutlinedInput-root': {
            height: 40,
            bgcolor: '#f3f4f6',
            borderRadius: '10px',
            fontSize: '13px',
            '& fieldset': { border: 'none' },
            '&:hover': { bgcolor: '#e5e7eb' },
            '&.Mui-focused': {
                bgcolor: '#ffffff',
                boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
                '& fieldset': { border: '1px solid #3b82f6' },
            },
        },
        '& .MuiInputBase-input': { fontSize: '13px' },
    };

    const labelSx = { fontSize: '12px', color: '#6b7280', mb: 0.75, fontWeight: 500 };

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

    // Drag logic
    const handleMouseDown = useCallback((e) => {
        if (!boxRef.current) return;
        const rect = boxRef.current.getBoundingClientRect();
        dragRef.current = { x: rect.left, y: rect.top, startX: e.clientX, startY: e.clientY };
        const onMouseMove = (ev) => {
            const dx = ev.clientX - dragRef.current.startX;
            const dy = ev.clientY - dragRef.current.startY;
            dragRef.current.x += dx;
            dragRef.current.y += dy;
            dragRef.current.startX = ev.clientX;
            dragRef.current.startY = ev.clientY;
            boxRef.current.style.left = `${dragRef.current.x}px`;
            boxRef.current.style.top = `${dragRef.current.y}px`;
        };
        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }, []);

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

    if (!open) return null;

    return (
        <Paper
            ref={boxRef}
            elevation={0}
            sx={{
                position: 'fixed',
                left: 300,
                top: 110,
                width: 320,
                borderRadius: '12px',
                border: '1px solid rgba(0, 0, 0, 0.08)',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04)',
                overflow: 'hidden',
                zIndex: 1300,
                display: 'flex',
                flexDirection: 'column',
                bgcolor: '#ffffff',
            }}
        >
            {/* Header */}
            <Box
                onMouseDown={handleMouseDown}
                sx={{
                    cursor: 'move',
                    px: 2.5,
                    py: 2,
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid #f3f4f6',
                }}
            >
                <Typography variant="subtitle2" fontWeight={600} sx={{ fontSize: '15px', color: '#111827' }}>
                    Bộ lọc
                </Typography>
                <IconButton
                    size="small"
                    onClick={onClose}
                    aria-label="Đóng"
                    sx={{
                        p: 0.5,
                        color: '#6b7280',
                        '&:hover': {
                            bgcolor: '#f3f4f6',
                            color: '#111827',
                        },
                    }}
                >
                    <X size={18} />
                </IconButton>
            </Box>

            {/* Body */}
            <Box sx={{
                p: 2.5,
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                overflowY: 'auto',
                flex: 1,
                minHeight: 0,
                '&::-webkit-scrollbar': { width: '6px' },
                '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
                '&::-webkit-scrollbar-thumb': { bgcolor: '#d1d5db', borderRadius: '3px' },
            }}>
                {/* Tỉnh/Thành phố */}
                <Box>
                    <Typography variant="body2" sx={labelSx}>Tỉnh/Thành phố</Typography>
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
                            <Paper {...props} sx={dropdownPaperSx} />
                        )}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                placeholder="Chọn tỉnh/thành"
                                sx={inputSx}
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
                    <Typography variant="body2" sx={labelSx}>Quận/Huyện</Typography>
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
                            <Paper {...props} sx={dropdownPaperSx} />
                        )}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                placeholder="Chọn quận/huyện"
                                sx={inputSx}
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
                    <Typography variant="body2" sx={labelSx}>Phường/Xã</Typography>
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
                            <Paper {...props} sx={dropdownPaperSx} />
                        )}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                placeholder="Chọn phường/xã"
                                sx={inputSx}
                            />
                        )}
                    />
                </Box>

                {/* Trạng thái */}
                <Box>
                    <Typography variant="body2" sx={labelSx}>Trạng thái</Typography>
                    <Autocomplete
                        size="small"
                        options={TRANG_THAI_OPTIONS}
                        getOptionLabel={(opt) => opt.label}
                        value={trangThaiOption}
                        onChange={(_, v) => setTrangThaiOption(v || TRANG_THAI_OPTIONS[0])}
                        isOptionEqualToValue={(a, b) => a.value === b.value}
                        PaperComponent={(props) => (
                            <Paper {...props} sx={dropdownPaperSx} />
                        )}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                placeholder="Chọn trạng thái"
                                sx={inputSx}
                            />
                        )}
                    />
                </Box>

                {/* Ngày tạo */}
                <Box>
                    <Typography variant="body2" sx={labelSx}>Ngày tạo</Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <TextField
                            size="small"
                            type="date"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            placeholder="Từ ngày"
                            fullWidth
                            sx={inputSx}
                        />
                        <TextField
                            size="small"
                            type="date"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            placeholder="Đến ngày"
                            fullWidth
                            sx={inputSx}
                        />
                    </Box>
                </Box>
            </Box>

            {/* Footer */}
            <Box sx={{
                px: 2.5,
                py: 2,
                borderTop: '1px solid #f3f4f6',
                display: 'flex',
                gap: 1,
            }}>
                <Button
                    fullWidth
                    size="small"
                    onClick={handleClear}
                    sx={{
                        fontSize: '13px',
                        fontWeight: 500,
                        textTransform: 'none',
                        height: 36,
                        borderRadius: '8px',
                        border: '1px solid #d1d5db',
                        color: '#374151',
                        '&:hover': {
                            bgcolor: '#f3f4f6',
                            borderColor: '#9ca3af',
                        },
                    }}
                >
                    Xóa lọc
                </Button>
                <Button
                    fullWidth
                    size="small"
                    onClick={handleApply}
                    sx={{
                        fontSize: '13px',
                        fontWeight: 600,
                        textTransform: 'none',
                        height: 36,
                        borderRadius: '8px',
                        bgcolor: '#3b82f6',
                        color: '#ffffff',
                        '&:hover': {
                            bgcolor: '#2563eb',
                        },
                    }}
                >
                    Áp dụng
                </Button>
            </Box>
        </Paper>
    );
}
