import React, { useState, useCallback, useEffect } from 'react';
import { Box, Paper, Typography, TextField, Autocomplete } from '@mui/material';
import {
    ListFilterPopupShell,
    LIST_FILTER_DROPDOWN_PAPER_SX,
    LIST_FILTER_INPUT_SX,
    LIST_FILTER_LABEL_SX,
} from './listFilterPopup';

const STATUS_OPTIONS = [
    { value: 'ALL', label: 'Tất cả' },
    { value: 'DRAFT', label: 'Nháp' },
    { value: 'PENDING_DIR', label: 'Chờ giám đốc duyệt' },
    { value: 'APPROVED', label: 'Đã duyệt' },
    { value: 'POSTED', label: 'Đã ghi sổ' },
    { value: 'REJECTED', label: 'Từ chối' },
];

export default function InventoryAdjustmentFilterPopup({ open, onClose, initialValues = {}, onApply }) {
    const [statusOption, setStatusOption] = useState({ value: 'ALL', label: 'Tất cả' });
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    useEffect(() => {
        if (!open) return;

        setStatusOption({ value: 'ALL', label: 'Tất cả' });
        setFromDate('');
        setToDate('');

        if (initialValues.status && initialValues.status !== 'ALL') {
            const found = STATUS_OPTIONS.find((o) => o.value === initialValues.status);
            if (found) setStatusOption(found);
        }
        if (initialValues.fromDate) setFromDate(initialValues.fromDate);
        if (initialValues.toDate) setToDate(initialValues.toDate);
    }, [open, initialValues]);

    const handleApply = useCallback(() => {
        onApply({
            status: statusOption.value === 'ALL' ? undefined : statusOption.value,
            fromDate: fromDate || undefined,
            toDate: toDate || undefined,
        });
        onClose();
    }, [statusOption, fromDate, toDate, onApply, onClose]);

    const handleClear = useCallback(() => {
        setStatusOption({ value: 'ALL', label: 'Tất cả' });
        setFromDate('');
        setToDate('');
        onApply({ status: undefined, fromDate: undefined, toDate: undefined });
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
                    options={STATUS_OPTIONS}
                    getOptionLabel={(opt) => opt.label}
                    value={statusOption}
                    onChange={(_, v) => setStatusOption(v || STATUS_OPTIONS[0])}
                    isOptionEqualToValue={(a, b) => a.value === b.value}
                    PaperComponent={(props) => <Paper {...props} sx={LIST_FILTER_DROPDOWN_PAPER_SX} />}
                    renderInput={(params) => (
                        <TextField {...params} placeholder="Chọn trạng thái" sx={LIST_FILTER_INPUT_SX} />
                    )}
                />
            </Box>

            <Box>
                <Typography variant="body2" sx={LIST_FILTER_LABEL_SX}>
                    Ngày đề xuất
                </Typography>
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
