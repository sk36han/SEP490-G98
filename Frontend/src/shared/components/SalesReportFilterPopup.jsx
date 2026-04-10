import React from 'react';
import { useState, useRef, useCallback, useEffect } from 'react';
import { Box, Paper, Typography, TextField, Button, IconButton, Autocomplete } from '@mui/material';
import { X } from 'lucide-react';

const YEAR_OPTIONS    = ["Tất cả", "2026", "2025", "2024"];
const QUARTER_OPTIONS = ["Tất cả", "Quý 1", "Quý 2", "Quý 3", "Quý 4"];
const MONTH_OPTIONS   = ["Tất cả", "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
                         "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"];

const dropdownPaperSx = {
    borderRadius: '10px', mt: 1,
    boxShadow: '0 4px 16px rgba(0,0,0,0.12), 0 2px 4px rgba(0,0,0,0.08)',
    border: '1px solid rgba(0,0,0,0.08)', overflow: 'hidden',
    '& .MuiAutocomplete-listbox': { fontSize: '13px', padding: '4px 0', maxHeight: '240px' },
    '& .MuiAutocomplete-option': { fontSize: '13px', padding: '8px 12px', '&:hover': { bgcolor: '#f3f4f6' }, '&[aria-selected="true"]': { bgcolor: '#e0f2fe' } },
};

const inputSx = {
    '& .MuiOutlinedInput-root': { height: 40, bgcolor: '#f3f4f6', borderRadius: '10px', fontSize: '13px', '& fieldset': { border: 'none' }, '&:hover': { bgcolor: '#e5e7eb' }, '&.Mui-focused': { bgcolor: '#ffffff', boxShadow: '0 0 0 3px rgba(59,130,246,0.1)', '& fieldset': { border: '1px solid #3b82f6' } } },
    '& .MuiInputBase-input': { fontSize: '13px' },
};

const labelSx = { fontSize: '12px', color: '#6b7280', mb: 0.75, fontWeight: 500 };

export default function SalesReportFilterPopup({ open, onClose, initialValues = {}, onApply }) {
    const [year, setYear]         = useState(YEAR_OPTIONS[0]);
    const [quarter, setQuarter]   = useState(QUARTER_OPTIONS[0]);
    const [month, setMonth]       = useState(MONTH_OPTIONS[0]);

    const boxRef  = useRef(null);
    const dragRef = useRef({ x: 0, y: 0, startX: 0, startY: 0 });

    useEffect(() => {
        if (!open) return;
        setYear(initialValues.year    ?? YEAR_OPTIONS[0]);
        setQuarter(initialValues.quarter ?? QUARTER_OPTIONS[0]);
        setMonth(initialValues.month   ?? MONTH_OPTIONS[0]);
    }, [open, initialValues]);

    const handleMouseDown = useCallback((e) => {
        if (!boxRef.current) return;
        const rect = boxRef.current.getBoundingClientRect();
        dragRef.current = { x: rect.left, y: rect.top, startX: e.clientX, startY: e.clientY };
        const onMouseMove = (ev) => {
            const dx = ev.clientX - dragRef.current.startX;
            const dy = ev.clientY - dragRef.current.startY;
            dragRef.current.x += dx; dragRef.current.y += dy;
            dragRef.current.startX = ev.clientX; dragRef.current.startY = ev.clientY;
            boxRef.current.style.left = dragRef.current.x + 'px';
            boxRef.current.style.top  = dragRef.current.y + 'px';
        };
        const onMouseUp = () => { document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseup', onMouseUp); };
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }, []);

    const handleApply = useCallback(() => {
        onApply({ year, quarter, month });
        onClose();
    }, [year, quarter, month, onApply, onClose]);

    const handleClear = useCallback(() => {
        setYear(YEAR_OPTIONS[0]); setQuarter(QUARTER_OPTIONS[0]); setMonth(MONTH_OPTIONS[0]);
        onApply({ year: YEAR_OPTIONS[0], quarter: QUARTER_OPTIONS[0], month: MONTH_OPTIONS[0] });
        onClose();
    }, [onApply, onClose]);

    if (!open) return null;

    return (
        <Paper ref={boxRef} elevation={0} sx={{
            position: 'fixed', left: 300, top: 110, width: 340, borderRadius: '12px',
            border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 4px 16px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
            overflow: 'hidden', zIndex: 1300, display: 'flex', flexDirection: 'column', bgcolor: '#ffffff',
        }}>
            <Box onMouseDown={handleMouseDown} sx={{
                cursor: 'move', px: 2.5, py: 2, flexShrink: 0, display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6',
            }}>
                <Typography variant="subtitle2" fontWeight={600} sx={{ fontSize: '15px', color: '#111827' }}>Bộ lọc báo cáo</Typography>
                <IconButton size="small" onClick={onClose} aria-label="Đóng"
                    sx={{ p: 0.5, color: '#6b7280', '&:hover': { bgcolor: '#f3f4f6', color: '#111827' } }}>
                    <X size={18} />
                </IconButton>
            </Box>

            <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto', flex: 1, minHeight: 0,
                '&::-webkit-scrollbar': { width: '6px' }, '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
                '&::-webkit-scrollbar-thumb': { bgcolor: '#d1d5db', borderRadius: '3px' } }}>

                <Box>
                    <Typography variant="body2" sx={labelSx}>Năm</Typography>
                    <Autocomplete size="small" options={YEAR_OPTIONS} getOptionLabel={(opt) => opt} value={year}
                        onChange={(_, v) => setYear(v || YEAR_OPTIONS[0])}
                        isOptionEqualToValue={(a, b) => a === b}
                        PaperComponent={(props) => <Paper {...props} sx={dropdownPaperSx} />}
                        renderInput={(params) => <TextField {...params} placeholder="Chọn năm" sx={inputSx} />}
                    />
                </Box>

                <Box>
                    <Typography variant="body2" sx={labelSx}>Quý</Typography>
                    <Autocomplete size="small" options={QUARTER_OPTIONS} getOptionLabel={(opt) => opt} value={quarter}
                        onChange={(_, v) => setQuarter(v || QUARTER_OPTIONS[0])}
                        isOptionEqualToValue={(a, b) => a === b}
                        PaperComponent={(props) => <Paper {...props} sx={dropdownPaperSx} />}
                        renderInput={(params) => <TextField {...params} placeholder="Chọn quý" sx={inputSx} />}
                    />
                </Box>

                <Box>
                    <Typography variant="body2" sx={labelSx}>Tháng</Typography>
                    <Autocomplete size="small" options={MONTH_OPTIONS} getOptionLabel={(opt) => opt} value={month}
                        onChange={(_, v) => setMonth(v || MONTH_OPTIONS[0])}
                        isOptionEqualToValue={(a, b) => a === b}
                        PaperComponent={(props) => <Paper {...props} sx={dropdownPaperSx} />}
                        renderInput={(params) => <TextField {...params} placeholder="Chọn tháng" sx={inputSx} />}
                    />
                </Box>
            </Box>

            <Box sx={{ px: 2.5, py: 2, borderTop: '1px solid #f3f4f6', display: 'flex', gap: 1 }}>
                <Button fullWidth size="small" onClick={handleClear}
                    sx={{ fontSize: '13px', fontWeight: 500, textTransform: 'none', height: 36, borderRadius: '8px',
                        border: '1px solid #d1d5db', color: '#374151', '&:hover': { bgcolor: '#f3f4f6', borderColor: '#9ca3af' } }}>
                    Xóa lọc
                </Button>
                <Button fullWidth size="small" onClick={handleApply}
                    sx={{ fontSize: '13px', fontWeight: 600, textTransform: 'none', height: 36, borderRadius: '8px',
                        bgcolor: '#3b82f6', color: '#ffffff', '&:hover': { bgcolor: '#2563eb' } }}>
                    Áp dụng
                </Button>
            </Box>
        </Paper>
    );
}
