import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, TextField, Autocomplete } from '@mui/material';
import { ListFilterPopupShell, LIST_FILTER_INPUT_SX, LIST_FILTER_LABEL_SX } from './listFilterPopup';
import { ITEM_TYPE_FIELD_LABEL, ITEM_TYPE_OPTIONS } from '../constants/itemTypes';

const TRANG_THAI_OPTIONS = [
    { value: '', label: 'Tất cả' },
    { value: 'true', label: 'Hoạt động' },
    { value: 'false', label: 'Tắt' },
];

const DANG_VAT_TU_OPTIONS = [{ value: '', label: 'Tất cả' }, ...ITEM_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))];

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
        setItemTypeOption(DANG_VAT_TU_OPTIONS.find((o) => o.value === initialValues.itemType) ?? DANG_VAT_TU_OPTIONS[0]);
        setCategoryName(initialValues.categoryName ?? '');
        const isActive = initialValues.isActive;
        setTrangThaiOption(
            isActive === true ? TRANG_THAI_OPTIONS[1] : isActive === false ? TRANG_THAI_OPTIONS[2] : TRANG_THAI_OPTIONS[0]
        );
        setFromDate(initialValues.fromDate ?? '');
        setToDate(initialValues.toDate ?? '');
    }, [open, initialValues.itemCode, initialValues.itemName, initialValues.itemType, initialValues.categoryName, initialValues.isActive, initialValues.fromDate, initialValues.toDate]);

    const handleApply = useCallback(() => {
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
    }, [itemCode, itemName, itemTypeOption, categoryName, trangThaiOption, fromDate, toDate, onApply, onClose]);

    const handleClear = useCallback(() => {
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
    }, [onApply, onClose]);

    return (
        <ListFilterPopupShell open={open} onClose={onClose} onClear={handleClear} onApply={handleApply} width={360} title="Bộ lọc vật tư">
            <Box>
                <Typography variant="body2" sx={LIST_FILTER_LABEL_SX}>
                    Mã vật tư
                </Typography>
                <TextField
                    size="small"
                    value={itemCode}
                    onChange={(e) => setItemCode(e.target.value)}
                    fullWidth
                    placeholder="Mã vật tư"
                    sx={LIST_FILTER_INPUT_SX}
                />
            </Box>
            <Box>
                <Typography variant="body2" sx={LIST_FILTER_LABEL_SX}>
                    Tên vật tư
                </Typography>
                <TextField
                    size="small"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    fullWidth
                    placeholder="Tên vật tư"
                    sx={LIST_FILTER_INPUT_SX}
                />
            </Box>
            <Box>
                <Typography variant="body2" sx={LIST_FILTER_LABEL_SX}>
                    Dạng vật tư
                </Typography>
                <Autocomplete
                    size="small"
                    options={DANG_VAT_TU_OPTIONS}
                    getOptionLabel={(opt) => opt.label}
                    value={itemTypeOption}
                    onChange={(_, v) => setItemTypeOption(v || DANG_VAT_TU_OPTIONS[0])}
                    isOptionEqualToValue={(a, b) => a.value === b.value}
                    renderInput={(params) => (
                        <TextField {...params} placeholder="Chọn dạng vật tư" sx={LIST_FILTER_INPUT_SX} />
                    )}
                />
            </Box>
            <Box>
                <Typography variant="body2" sx={LIST_FILTER_LABEL_SX}>
                    Danh mục
                </Typography>
                <TextField
                    size="small"
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    fullWidth
                    placeholder="Tên danh mục"
                    sx={LIST_FILTER_INPUT_SX}
                />
            </Box>
            <Box>
                <Typography variant="body2" sx={LIST_FILTER_LABEL_SX}>
                    Trạng thái
                </Typography>
                <Autocomplete
                    size="small"
                    options={TRANG_THAI_OPTIONS}
                    getOptionLabel={(opt) => opt.label}
                    value={trangThaiOption}
                    onChange={(_, v) => setTrangThaiOption(v || TRANG_THAI_OPTIONS[0])}
                    isOptionEqualToValue={(a, b) => a.value === b.value}
                    renderInput={(params) => (
                        <TextField {...params} placeholder="Chọn trạng thái" sx={LIST_FILTER_INPUT_SX} />
                    )}
                />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                <Box>
                    <Typography variant="body2" sx={{ ...LIST_FILTER_LABEL_SX, mb: 0.5, fontSize: '11px' }}>
                        Từ ngày
                    </Typography>
                    <TextField
                        size="small"
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        fullWidth
                        sx={LIST_FILTER_INPUT_SX}
                    />
                </Box>
                <Box>
                    <Typography variant="body2" sx={{ ...LIST_FILTER_LABEL_SX, mb: 0.5, fontSize: '11px' }}>
                        Đến ngày
                    </Typography>
                    <TextField
                        size="small"
                        type="date"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        fullWidth
                        sx={LIST_FILTER_INPUT_SX}
                    />
                </Box>
            </Box>
        </ListFilterPopupShell>
    );
}
