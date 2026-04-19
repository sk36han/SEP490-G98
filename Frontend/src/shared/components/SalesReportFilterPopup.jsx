import React, { useState, useCallback, useEffect } from 'react';
import { Box, Paper, Typography, TextField, Autocomplete } from '@mui/material';
import {
    ListFilterPopupShell,
    LIST_FILTER_DROPDOWN_PAPER_SX,
    LIST_FILTER_INPUT_SX,
    LIST_FILTER_LABEL_SX,
} from './listFilterPopup';

const YEAR_OPTIONS = ['Tất cả', '2026', '2025', '2024'];
const QUARTER_OPTIONS = ['Tất cả', 'Quý 1', 'Quý 2', 'Quý 3', 'Quý 4'];
const MONTH_OPTIONS = [
    'Tất cả',
    'Tháng 1',
    'Tháng 2',
    'Tháng 3',
    'Tháng 4',
    'Tháng 5',
    'Tháng 6',
    'Tháng 7',
    'Tháng 8',
    'Tháng 9',
    'Tháng 10',
    'Tháng 11',
    'Tháng 12',
];

export default function SalesReportFilterPopup({ open, onClose, initialValues = {}, onApply }) {
    const [year, setYear] = useState(YEAR_OPTIONS[0]);
    const [quarter, setQuarter] = useState(QUARTER_OPTIONS[0]);
    const [month, setMonth] = useState(MONTH_OPTIONS[0]);

    useEffect(() => {
        if (!open) return;
        setYear(initialValues.year ?? YEAR_OPTIONS[0]);
        setQuarter(initialValues.quarter ?? QUARTER_OPTIONS[0]);
        setMonth(initialValues.month ?? MONTH_OPTIONS[0]);
    }, [open, initialValues]);

    const handleApply = useCallback(() => {
        onApply({ year, quarter, month });
        onClose();
    }, [year, quarter, month, onApply, onClose]);

    const handleClear = useCallback(() => {
        setYear(YEAR_OPTIONS[0]);
        setQuarter(QUARTER_OPTIONS[0]);
        setMonth(MONTH_OPTIONS[0]);
        onApply({ year: YEAR_OPTIONS[0], quarter: QUARTER_OPTIONS[0], month: MONTH_OPTIONS[0] });
        onClose();
    }, [onApply, onClose]);

    return (
        <ListFilterPopupShell open={open} onClose={onClose} onClear={handleClear} onApply={handleApply} title="Bộ lọc báo cáo" width={360}>
            <Box>
                <Typography variant="body2" sx={LIST_FILTER_LABEL_SX}>
                    Năm
                </Typography>
                <Autocomplete
                    size="small"
                    options={YEAR_OPTIONS}
                    getOptionLabel={(opt) => opt}
                    value={year}
                    onChange={(_, v) => setYear(v || YEAR_OPTIONS[0])}
                    isOptionEqualToValue={(a, b) => a === b}
                    PaperComponent={(props) => <Paper {...props} sx={LIST_FILTER_DROPDOWN_PAPER_SX} />}
                    renderInput={(params) => <TextField {...params} placeholder="Chọn năm" sx={LIST_FILTER_INPUT_SX} />}
                />
            </Box>

            <Box>
                <Typography variant="body2" sx={LIST_FILTER_LABEL_SX}>
                    Quý
                </Typography>
                <Autocomplete
                    size="small"
                    options={QUARTER_OPTIONS}
                    getOptionLabel={(opt) => opt}
                    value={quarter}
                    onChange={(_, v) => setQuarter(v || QUARTER_OPTIONS[0])}
                    isOptionEqualToValue={(a, b) => a === b}
                    PaperComponent={(props) => <Paper {...props} sx={LIST_FILTER_DROPDOWN_PAPER_SX} />}
                    renderInput={(params) => <TextField {...params} placeholder="Chọn quý" sx={LIST_FILTER_INPUT_SX} />}
                />
            </Box>

            <Box>
                <Typography variant="body2" sx={LIST_FILTER_LABEL_SX}>
                    Tháng
                </Typography>
                <Autocomplete
                    size="small"
                    options={MONTH_OPTIONS}
                    getOptionLabel={(opt) => opt}
                    value={month}
                    onChange={(_, v) => setMonth(v || MONTH_OPTIONS[0])}
                    isOptionEqualToValue={(a, b) => a === b}
                    PaperComponent={(props) => <Paper {...props} sx={LIST_FILTER_DROPDOWN_PAPER_SX} />}
                    renderInput={(params) => <TextField {...params} placeholder="Chọn tháng" sx={LIST_FILTER_INPUT_SX} />}
                />
            </Box>
        </ListFilterPopupShell>
    );
}
