import React, { useState, useCallback, useEffect } from 'react';
import { Box, Paper, Typography, TextField, Autocomplete } from '@mui/material';
import {
    ListFilterPopupShell,
    LIST_FILTER_DROPDOWN_PAPER_SX,
    LIST_FILTER_INPUT_SX,
    LIST_FILTER_LABEL_SX,
} from './listFilterPopup';

const TRANG_THAI_OPTIONS = [
    { value: 'all', label: 'Tất cả' },
    { value: 'active', label: 'Hoạt động' },
    { value: 'inactive', label: 'Ngừng hoạt động' },
];

export default function CategoryFilterPopup({ open, onClose, initialValues = {}, onApply }) {
    const [trangThaiOption, setTrangThaiOption] = useState(TRANG_THAI_OPTIONS[0]);

    useEffect(() => {
        if (!open) return;
        if (initialValues.isActive === true) {
            setTrangThaiOption(TRANG_THAI_OPTIONS[1]);
        } else if (initialValues.isActive === false) {
            setTrangThaiOption(TRANG_THAI_OPTIONS[2]);
        } else {
            setTrangThaiOption(TRANG_THAI_OPTIONS[0]);
        }
    }, [open, initialValues.isActive]);

    const handleApply = useCallback(() => {
        onApply({
            filterStatus: trangThaiOption.value,
        });
        onClose();
    }, [trangThaiOption, onApply, onClose]);

    const handleClear = useCallback(() => {
        setTrangThaiOption(TRANG_THAI_OPTIONS[0]);
        onApply({ filterStatus: 'all' });
        onClose();
    }, [onApply, onClose]);

    return (
        <ListFilterPopupShell open={open} onClose={onClose} onClear={handleClear} onApply={handleApply} width={360}>
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
                    PaperComponent={(props) => <Paper {...props} sx={LIST_FILTER_DROPDOWN_PAPER_SX} />}
                    renderInput={(params) => (
                        <TextField {...params} placeholder="Chọn trạng thái" sx={LIST_FILTER_INPUT_SX} />
                    )}
                />
            </Box>
        </ListFilterPopupShell>
    );
}
