import React, { useState, useCallback, useEffect } from 'react';
import { Box, Paper, Typography, TextField, Autocomplete } from '@mui/material';
import { Search } from 'lucide-react';
import {
    ListFilterPopupShell,
    LIST_FILTER_DROPDOWN_PAPER_SX,
    LIST_FILTER_INPUT_SX,
    LIST_FILTER_LABEL_SX,
} from './listFilterPopup';

const WAREHOUSE_OPTIONS = [
    { value: 'WH-HCM', label: 'Kho HCM' },
    { value: 'WH-HN', label: 'Kho Hà Nội' },
    { value: 'WH-DN', label: 'Kho Đà Nẵng' },
];

const MODE_OPTIONS = [
    { value: 'PERIODIC', label: 'Định kỳ' },
    { value: 'ADHOC', label: 'Đột xuất' },
];

const STATUS_OPTIONS = [
    { value: 'DRAFT', label: 'Bản nháp' },
    { value: 'IN_PROGRESS', label: 'Đang thực hiện' },
    { value: 'PENDING_APPROVAL', label: 'Chờ duyệt' },
    { value: 'COMPLETED', label: 'Hoàn thành' },
    { value: 'CANCELLED', label: 'Đã hủy' },
];

const CREATOR_OPTIONS = [
    { value: 'Nguyễn Văn A', label: 'Nguyễn Văn A' },
    { value: 'Trần Thị B', label: 'Trần Thị B' },
    { value: 'Lê Văn C', label: 'Lê Văn C' },
    { value: 'Phạm Thị D', label: 'Phạm Thị D' },
    { value: 'Nguyễn Văn E', label: 'Nguyễn Văn E' },
];

const inputWithIconSx = {
    ...LIST_FILTER_INPUT_SX,
    '& .MuiOutlinedInput-root': {
        ...LIST_FILTER_INPUT_SX['& .MuiOutlinedInput-root'],
        pl: 5,
    },
};

export default function StocktakeFilterPopup({ open, onClose, initialValues = {}, onApply }) {
    const [warehouseOption, setWarehouseOption] = useState(null);
    const [modeOption, setModeOption] = useState(null);
    const [statusOption, setStatusOption] = useState(null);
    const [creatorOption, setCreatorOption] = useState(null);
    const [plannedFromDate, setPlannedFromDate] = useState('');
    const [plannedToDate, setPlannedToDate] = useState('');
    const [createdFromDate, setCreatedFromDate] = useState('');
    const [createdToDate, setCreatedToDate] = useState('');

    useEffect(() => {
        if (!open) return;

        setWarehouseOption(null);
        setModeOption(null);
        setStatusOption(null);
        setCreatorOption(null);
        setPlannedFromDate('');
        setPlannedToDate('');
        setCreatedFromDate('');
        setCreatedToDate('');

        if (initialValues.warehouseCode) {
            const found = WAREHOUSE_OPTIONS.find((o) => o.value === initialValues.warehouseCode);
            if (found) setWarehouseOption(found);
        }
        if (initialValues.mode) {
            const found = MODE_OPTIONS.find((o) => o.value === initialValues.mode);
            if (found) setModeOption(found);
        }
        if (initialValues.status) {
            const found = STATUS_OPTIONS.find((o) => o.value === initialValues.status);
            if (found) setStatusOption(found);
        }
        if (initialValues.createdByName) {
            const found = CREATOR_OPTIONS.find((o) => o.value === initialValues.createdByName);
            if (found) setCreatorOption(found);
        }
        if (initialValues.plannedFromDate) setPlannedFromDate(initialValues.plannedFromDate);
        if (initialValues.plannedToDate) setPlannedToDate(initialValues.plannedToDate);
        if (initialValues.createdFromDate) setCreatedFromDate(initialValues.createdFromDate);
        if (initialValues.createdToDate) setCreatedToDate(initialValues.createdToDate);
    }, [open, initialValues]);

    const handleApply = useCallback(() => {
        onApply({
            warehouseCode: warehouseOption?.value || undefined,
            mode: modeOption?.value || undefined,
            status: statusOption?.value || undefined,
            createdByName: creatorOption?.value || undefined,
            plannedFromDate: plannedFromDate || undefined,
            plannedToDate: plannedToDate || undefined,
            createdFromDate: createdFromDate || undefined,
            createdToDate: createdToDate || undefined,
        });
        onClose();
    }, [
        warehouseOption,
        modeOption,
        statusOption,
        creatorOption,
        plannedFromDate,
        plannedToDate,
        createdFromDate,
        createdToDate,
        onApply,
        onClose,
    ]);

    const handleClear = useCallback(() => {
        setWarehouseOption(null);
        setModeOption(null);
        setStatusOption(null);
        setCreatorOption(null);
        setPlannedFromDate('');
        setPlannedToDate('');
        setCreatedFromDate('');
        setCreatedToDate('');
        onApply({});
        onClose();
    }, [onApply, onClose]);

    return (
        <ListFilterPopupShell open={open} onClose={onClose} onClear={handleClear} onApply={handleApply} width={360}>
            <Box>
                <Typography variant="body2" sx={LIST_FILTER_LABEL_SX}>
                    Kho
                </Typography>
                <Autocomplete
                    size="small"
                    options={WAREHOUSE_OPTIONS}
                    getOptionLabel={(opt) => opt.label}
                    value={warehouseOption}
                    onChange={(_, v) => setWarehouseOption(v)}
                    PaperComponent={(props) => <Paper {...props} sx={LIST_FILTER_DROPDOWN_PAPER_SX} />}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            placeholder="Tìm hoặc chọn kho"
                            sx={inputWithIconSx}
                            InputProps={{
                                ...params.InputProps,
                                startAdornment: (
                                    <>
                                        <Search size={16} style={{ marginRight: 4, color: '#9ca3af' }} />
                                        {params.InputProps.startAdornment}
                                    </>
                                ),
                            }}
                        />
                    )}
                />
            </Box>

            <Box>
                <Typography variant="body2" sx={LIST_FILTER_LABEL_SX}>
                    Hình thức
                </Typography>
                <Autocomplete
                    size="small"
                    options={MODE_OPTIONS}
                    getOptionLabel={(opt) => opt.label}
                    value={modeOption}
                    onChange={(_, v) => setModeOption(v)}
                    PaperComponent={(props) => <Paper {...props} sx={LIST_FILTER_DROPDOWN_PAPER_SX} />}
                    renderInput={(params) => (
                        <TextField {...params} placeholder="Chọn hình thức" sx={LIST_FILTER_INPUT_SX} />
                    )}
                />
            </Box>

            <Box>
                <Typography variant="body2" sx={LIST_FILTER_LABEL_SX}>
                    Trạng thái
                </Typography>
                <Autocomplete
                    size="small"
                    options={STATUS_OPTIONS}
                    getOptionLabel={(opt) => opt.label}
                    value={statusOption}
                    onChange={(_, v) => setStatusOption(v)}
                    PaperComponent={(props) => <Paper {...props} sx={LIST_FILTER_DROPDOWN_PAPER_SX} />}
                    renderInput={(params) => (
                        <TextField {...params} placeholder="Chọn trạng thái" sx={LIST_FILTER_INPUT_SX} />
                    )}
                />
            </Box>

            <Box>
                <Typography variant="body2" sx={LIST_FILTER_LABEL_SX}>
                    Nhân viên tạo
                </Typography>
                <Autocomplete
                    size="small"
                    options={CREATOR_OPTIONS}
                    getOptionLabel={(opt) => opt.label}
                    value={creatorOption}
                    onChange={(_, v) => setCreatorOption(v)}
                    PaperComponent={(props) => <Paper {...props} sx={LIST_FILTER_DROPDOWN_PAPER_SX} />}
                    renderInput={(params) => (
                        <TextField
                            {...params}
                            placeholder="Tìm hoặc chọn nhân viên"
                            sx={inputWithIconSx}
                            InputProps={{
                                ...params.InputProps,
                                startAdornment: (
                                    <>
                                        <Search size={16} style={{ marginRight: 4, color: '#9ca3af' }} />
                                        {params.InputProps.startAdornment}
                                    </>
                                ),
                            }}
                        />
                    )}
                />
            </Box>

            <Box>
                <Typography variant="body2" sx={LIST_FILTER_LABEL_SX}>
                    Ngày giờ dự kiến kiểm kê
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField
                        size="small"
                        type="date"
                        value={plannedFromDate}
                        onChange={(e) => setPlannedFromDate(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        fullWidth
                        sx={LIST_FILTER_INPUT_SX}
                    />
                    <TextField
                        size="small"
                        type="date"
                        value={plannedToDate}
                        onChange={(e) => setPlannedToDate(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        fullWidth
                        sx={LIST_FILTER_INPUT_SX}
                    />
                </Box>
            </Box>

            <Box>
                <Typography variant="body2" sx={LIST_FILTER_LABEL_SX}>
                    Ngày tạo
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField
                        size="small"
                        type="date"
                        value={createdFromDate}
                        onChange={(e) => setCreatedFromDate(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        fullWidth
                        sx={LIST_FILTER_INPUT_SX}
                    />
                    <TextField
                        size="small"
                        type="date"
                        value={createdToDate}
                        onChange={(e) => setCreatedToDate(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        fullWidth
                        sx={LIST_FILTER_INPUT_SX}
                    />
                </Box>
            </Box>
        </ListFilterPopupShell>
    );
}
