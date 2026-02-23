import React, { useState, useEffect } from 'react';
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

const TRANG_THAI_OPTIONS = [
    { value: '', label: 'Tất cả' },
    { value: 'true', label: 'Hoạt động' },
    { value: 'false', label: 'Tắt' },
];

const DANG_VAT_TU_OPTIONS = [
    { value: '', label: 'Tất cả' },
    { value: 'Product', label: 'Product' },
    { value: 'Material', label: 'Material' },
    { value: 'Service', label: 'Service' },
];

/**
 * Popup bộ lọc danh sách vật tư – giống SupplierFilterPopup (tiếng Việt).
 */
export default function ItemFilterPopup({ open, onClose, initialValues = {}, onApply }) {
    const [itemCode, setItemCode] = useState('');
    const [itemName, setItemName] = useState('');
    const [itemTypeOption, setItemTypeOption] = useState(DANG_VAT_TU_OPTIONS[0]);
    const [categoryName, setCategoryName] = useState('');
    const [trangThaiOption, setTrangThaiOption] = useState(TRANG_THAI_OPTIONS[0]);
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    useEffect(() => {
        if (!open) return;
        setItemCode(initialValues.itemCode ?? '');
        setItemName(initialValues.itemName ?? '');
        setItemTypeOption(
            DANG_VAT_TU_OPTIONS.find((o) => o.value === initialValues.itemType) ?? DANG_VAT_TU_OPTIONS[0]
        );
        setCategoryName(initialValues.categoryName ?? '');
        const isActive = initialValues.isActive;
        setTrangThaiOption(
            isActive === true ? TRANG_THAI_OPTIONS[1]
                : isActive === false ? TRANG_THAI_OPTIONS[2]
                    : TRANG_THAI_OPTIONS[0]
        );
        setFromDate(initialValues.fromDate ?? '');
        setToDate(initialValues.toDate ?? '');
    }, [open, initialValues.itemCode, initialValues.itemName, initialValues.itemType, initialValues.categoryName, initialValues.isActive, initialValues.fromDate, initialValues.toDate]);

    const handleApply = () => {
        const isActive = trangThaiOption.value === '' ? null : trangThaiOption.value === 'true';
        onApply({
            itemCode: itemCode.trim() || undefined,
            itemName: itemName.trim() || undefined,
            itemType: itemTypeOption.value || undefined,
            categoryName: categoryName.trim() || undefined,
            isActive,
            fromDate: fromDate || undefined,
            toDate: toDate || undefined,
        });
        onClose();
    };

    const handleClear = () => {
        setItemCode('');
        setItemName('');
        setItemTypeOption(DANG_VAT_TU_OPTIONS[0]);
        setCategoryName('');
        setTrangThaiOption(TRANG_THAI_OPTIONS[0]);
        setFromDate('');
        setToDate('');
        onApply({
            itemCode: undefined,
            itemName: undefined,
            itemType: undefined,
            categoryName: undefined,
            isActive: null,
            fromDate: undefined,
            toDate: undefined,
        });
        onClose();
    };

    if (!open) return null;

    const compactSx = { fontSize: '0.8125rem', '& .MuiInputBase-input': { fontSize: '0.8125rem' }, '& .MuiInputLabel-root': { fontSize: '0.8125rem' } };

    return (
        <Paper
            elevation={8}
            sx={{
                position: 'fixed',
                left: 280,
                top: 120,
                width: 260,
                maxHeight: 'min(85vh, 440px)',
                borderRadius: 2,
                overflow: 'hidden',
                zIndex: 1300,
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <Box
                sx={{
                    px: 1,
                    py: 0.5,
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: 1,
                    borderColor: 'divider',
                    backgroundColor: 'grey.50',
                }}
            >
                <Typography variant="caption" fontWeight={600} sx={{ fontSize: '0.75rem' }}>Bộ lọc vật tư</Typography>
                <IconButton size="small" onClick={onClose} aria-label="Đóng" sx={{ p: 0.25 }}>
                    <X size={16} />
                </IconButton>
            </Box>
            <Box sx={{ p: 1.25, display: 'flex', flexDirection: 'column', gap: 1.5, overflowY: 'auto', flex: 1, minHeight: 0 }}>
                <TextField
                    size="small"
                    label="Mã vật tư"
                    value={itemCode}
                    onChange={(e) => setItemCode(e.target.value)}
                    fullWidth
                    sx={compactSx}
                />
                <TextField
                    size="small"
                    label="Tên vật tư"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    fullWidth
                    sx={compactSx}
                />
                <Autocomplete
                    size="small"
                    options={DANG_VAT_TU_OPTIONS}
                    getOptionLabel={(opt) => opt.label}
                    value={itemTypeOption}
                    onChange={(_, v) => setItemTypeOption(v || DANG_VAT_TU_OPTIONS[0])}
                    isOptionEqualToValue={(a, b) => a.value === b.value}
                    renderInput={(params) => <TextField {...params} label="Dạng vật tư" />}
                    sx={compactSx}
                />
                <TextField
                    size="small"
                    label="Category"
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    fullWidth
                    sx={compactSx}
                />
                <Autocomplete
                    size="small"
                    options={TRANG_THAI_OPTIONS}
                    getOptionLabel={(opt) => opt.label}
                    value={trangThaiOption}
                    onChange={(_, v) => setTrangThaiOption(v || TRANG_THAI_OPTIONS[0])}
                    isOptionEqualToValue={(a, b) => a.value === b.value}
                    renderInput={(params) => <TextField {...params} label="Trạng thái" />}
                    sx={compactSx}
                />
                <TextField
                    size="small"
                    label="Từ ngày"
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                    sx={compactSx}
                />
                <TextField
                    size="small"
                    label="Đến ngày"
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                    sx={compactSx}
                />
                <Box sx={{ display: 'flex', gap: 0.5, mt: 0.25 }}>
                    <Button size="small" variant="contained" onClick={handleApply} sx={{ flex: 1, textTransform: 'none', fontSize: '0.8125rem', py: 0.5 }}>Áp dụng</Button>
                    <Button size="small" variant="outlined" onClick={handleClear} sx={{ flex: 1, textTransform: 'none', fontSize: '0.8125rem', py: 0.5 }}>Xóa lọc</Button>
                </Box>
            </Box>
        </Paper>
    );
}
