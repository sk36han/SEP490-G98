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
import { X, Search } from 'lucide-react';

// ── Component ──────────────────────────────────────────────────────────────
export default function StocktakeFilterPopup({ open, onClose, initialValues = {}, onApply }) {
    const [warehouseOption, setWarehouseOption] = useState(null);
    const [modeOption, setModeOption] = useState(null);
    const [statusOption, setStatusOption] = useState(null);
    const [creatorOption, setCreatorOption] = useState(null);
    const [plannedFromDate, setPlannedFromDate] = useState('');
    const [plannedToDate, setPlannedToDate] = useState('');
    const [createdFromDate, setCreatedFromDate] = useState('');
    const [createdToDate, setCreatedToDate] = useState('');

    const boxRef = useRef(null);
    const dragRef = useRef({ x: 0, y: 0, startX: 0, startY: 0 });

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

    const inputWithIconSx = {
        ...inputSx,
        '& .MuiOutlinedInput-root': {
            height: 40,
            bgcolor: '#f3f4f6',
            borderRadius: '10px',
            fontSize: '13px',
            pl: 5,
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

    // Reset state when popup opens
    useEffect(() => {
        if (!open) return;

        // Reset to default
        setWarehouseOption(null);
        setModeOption(null);
        setStatusOption(null);
        setCreatorOption(null);
        setPlannedFromDate('');
        setPlannedToDate('');
        setCreatedFromDate('');
        setCreatedToDate('');

        // Apply initial values if any
        if (initialValues.warehouseCode) {
            const found = WAREHOUSE_OPTIONS.find(o => o.value === initialValues.warehouseCode);
            if (found) setWarehouseOption(found);
        }
        if (initialValues.mode) {
            const found = MODE_OPTIONS.find(o => o.value === initialValues.mode);
            if (found) setModeOption(found);
        }
        if (initialValues.status) {
            const found = STATUS_OPTIONS.find(o => o.value === initialValues.status);
            if (found) setStatusOption(found);
        }
        if (initialValues.createdByName) {
            const found = CREATOR_OPTIONS.find(o => o.value === initialValues.createdByName);
            if (found) setCreatorOption(found);
        }
        if (initialValues.plannedFromDate) setPlannedFromDate(initialValues.plannedFromDate);
        if (initialValues.plannedToDate) setPlannedToDate(initialValues.plannedToDate);
        if (initialValues.createdFromDate) setCreatedFromDate(initialValues.createdFromDate);
        if (initialValues.createdToDate) setCreatedToDate(initialValues.createdToDate);
    }, [open, initialValues]);

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
    }, [warehouseOption, modeOption, statusOption, creatorOption, plannedFromDate, plannedToDate, createdFromDate, createdToDate, onApply, onClose]);

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

    if (!open) return null;

    return (
        <Paper
            ref={boxRef}
            elevation={0}
            sx={{
                position: 'fixed',
                left: 300,
                top: 110,
                width: 360,
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
                {/* Kho - Search-Select */}
                <Box>
                    <Typography variant="body2" sx={labelSx}>Kho</Typography>
                    <Autocomplete
                        size="small"
                        options={WAREHOUSE_OPTIONS}
                        getOptionLabel={(opt) => opt.label}
                        value={warehouseOption}
                        onChange={(_, v) => setWarehouseOption(v)}
                        PaperComponent={(props) => (
                            <Paper {...props} sx={dropdownPaperSx} />
                        )}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                placeholder="Tìm hoặc chọn kho"
                                sx={inputSx}
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

                {/* Hình thức - Dropdown */}
                <Box>
                    <Typography variant="body2" sx={labelSx}>Hình thức</Typography>
                    <Autocomplete
                        size="small"
                        options={MODE_OPTIONS}
                        getOptionLabel={(opt) => opt.label}
                        value={modeOption}
                        onChange={(_, v) => setModeOption(v)}
                        PaperComponent={(props) => (
                            <Paper {...props} sx={dropdownPaperSx} />
                        )}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                placeholder="Chọn hình thức"
                                sx={inputSx}
                            />
                        )}
                    />
                </Box>

                {/* Trạng thái - Dropdown */}
                <Box>
                    <Typography variant="body2" sx={labelSx}>Trạng thái</Typography>
                    <Autocomplete
                        size="small"
                        options={STATUS_OPTIONS}
                        getOptionLabel={(opt) => opt.label}
                        value={statusOption}
                        onChange={(_, v) => setStatusOption(v)}
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

                {/* Nhân viên tạo - Search-Select */}
                <Box>
                    <Typography variant="body2" sx={labelSx}>Nhân viên tạo</Typography>
                    <Autocomplete
                        size="small"
                        options={CREATOR_OPTIONS}
                        getOptionLabel={(opt) => opt.label}
                        value={creatorOption}
                        onChange={(_, v) => setCreatorOption(v)}
                        PaperComponent={(props) => (
                            <Paper {...props} sx={dropdownPaperSx} />
                        )}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                placeholder="Tìm hoặc chọn nhân viên"
                                sx={inputSx}
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

                {/* Ngày giờ dự kiến kiểm kê */}
                <Box>
                    <Typography variant="body2" sx={labelSx}>Ngày giờ dự kiến kiểm kê</Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <TextField
                            size="small"
                            type="date"
                            value={plannedFromDate}
                            onChange={(e) => setPlannedFromDate(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            placeholder="Từ ngày"
                            fullWidth
                            sx={inputSx}
                        />
                        <TextField
                            size="small"
                            type="date"
                            value={plannedToDate}
                            onChange={(e) => setPlannedToDate(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            placeholder="Đến ngày"
                            fullWidth
                            sx={inputSx}
                        />
                    </Box>
                </Box>

                {/* Ngày tạo */}
                <Box>
                    <Typography variant="body2" sx={labelSx}>Ngày tạo</Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <TextField
                            size="small"
                            type="date"
                            value={createdFromDate}
                            onChange={(e) => setCreatedFromDate(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            placeholder="Từ ngày"
                            fullWidth
                            sx={inputSx}
                        />
                        <TextField
                            size="small"
                            type="date"
                            value={createdToDate}
                            onChange={(e) => setCreatedToDate(e.target.value)}
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
