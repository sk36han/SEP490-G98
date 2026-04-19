import React, { useCallback, useEffect } from 'react';
import { Box, Typography, TextField, Autocomplete } from '@mui/material';
import { ListFilterPopupShell, LIST_FILTER_INPUT_SX, LIST_FILTER_LABEL_SX } from './listFilterPopup';
import { ROLE_OPTIONS } from '../constants/roles';

const TRANG_THAI_OPTIONS = [
    { value: null, label: 'Tất cả' },
    { value: true, label: 'Hoạt động' },
    { value: false, label: 'Vô hiệu' },
];

const ROLE_SELECT_OPTIONS = [
    { value: '', label: 'Tất cả vai trò' },
    ...Object.values(ROLE_OPTIONS).map((name) => ({ value: name, label: name })),
];

export default function UserAccountFilterPopup({ open, onClose, initialValues = {}, onApply }) {
    const [roleOption, setRoleOption] = React.useState(ROLE_SELECT_OPTIONS[0]);
    const [trangThaiOption, setTrangThaiOption] = React.useState(TRANG_THAI_OPTIONS[0]);
    const [fromDate, setFromDate] = React.useState('');
    const [toDate, setToDate] = React.useState('');

    useEffect(() => {
        if (!open) return;
        const r = initialValues.role ?? '';
        setRoleOption(ROLE_SELECT_OPTIONS.find((o) => o.value === r) ?? ROLE_SELECT_OPTIONS[0]);
        const isActive = initialValues.isActive;
        setTrangThaiOption(
            isActive === true ? TRANG_THAI_OPTIONS[1] : isActive === false ? TRANG_THAI_OPTIONS[2] : TRANG_THAI_OPTIONS[0]
        );
        setFromDate(initialValues.fromDate ?? '');
        setToDate(initialValues.toDate ?? '');
    }, [open, initialValues.role, initialValues.isActive, initialValues.fromDate, initialValues.toDate]);

    const handleApply = useCallback(() => {
        onApply({
            role: roleOption.value ? roleOption.value.trim() : undefined,
            isActive: trangThaiOption.value,
            fromDate: fromDate || undefined,
            toDate: toDate || undefined,
        });
        onClose();
    }, [roleOption, trangThaiOption, fromDate, toDate, onApply, onClose]);

    const handleClear = useCallback(() => {
        setRoleOption(ROLE_SELECT_OPTIONS[0]);
        setTrangThaiOption(TRANG_THAI_OPTIONS[0]);
        setFromDate('');
        setToDate('');
        onApply({ role: undefined, isActive: null, fromDate: undefined, toDate: undefined });
        onClose();
    }, [onApply, onClose]);

    return (
        <ListFilterPopupShell open={open} onClose={onClose} onClear={handleClear} onApply={handleApply} title="Bộ lọc người dùng" width={360}>
            <Box>
                <Typography variant="body2" sx={LIST_FILTER_LABEL_SX}>
                    Vai trò
                </Typography>
                <Autocomplete
                    size="small"
                    options={ROLE_SELECT_OPTIONS}
                    getOptionLabel={(o) => o.label}
                    value={roleOption}
                    onChange={(_, v) => setRoleOption(v || ROLE_SELECT_OPTIONS[0])}
                    isOptionEqualToValue={(a, b) => a.value === b.value}
                    renderInput={(params) => (
                        <TextField {...params} placeholder="Chọn vai trò" sx={LIST_FILTER_INPUT_SX} />
                    )}
                />
            </Box>
            <Box>
                <Typography variant="body2" sx={LIST_FILTER_LABEL_SX}>
                    Trạng thái
                </Typography>
                <Autocomplete
                    size="small"
                    options={TRANG_THAI_OPTIONS}
                    getOptionLabel={(o) => o.label}
                    value={trangThaiOption}
                    onChange={(_, v) => setTrangThaiOption(v ?? TRANG_THAI_OPTIONS[0])}
                    isOptionEqualToValue={(a, b) => a.value === b.value}
                    renderInput={(params) => (
                        <TextField {...params} placeholder="Chọn trạng thái" sx={LIST_FILTER_INPUT_SX} />
                    )}
                />
            </Box>
            <Box>
                <Typography variant="body2" sx={LIST_FILTER_LABEL_SX}>
                    Ngày tạo tài khoản
                </Typography>
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
            </Box>
        </ListFilterPopupShell>
    );
}
