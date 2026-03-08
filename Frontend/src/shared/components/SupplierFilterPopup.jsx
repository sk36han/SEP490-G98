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
import { X, Filter } from 'lucide-react';
import { getSupplierSuggestions } from '../lib/supplierService';

// ── Design tokens (matching PurchaseOrderFilterPopup) ──────────────────────
const TRANG_THAI_OPTIONS = [
    { value: '',      label: 'Tất cả'    },
    { value: 'true',  label: 'Hoạt động' },
    { value: 'false', label: 'Ngừng HĐ'  },
];

const DEBOUNCE_MS = 300;

const INPUT_SX = {
    '& .MuiOutlinedInput-root': {
        bgcolor: '#f3f4f6',
        borderRadius: '9px',
        fontSize: '13px',
        '& fieldset': { border: 'none' },
        '&:hover': { bgcolor: '#e5e7eb' },
        '&.Mui-focused': {
            bgcolor: '#ffffff',
            boxShadow: '0 0 0 3px rgba(2,132,199,0.10)',
            '& fieldset': { border: '1px solid #0284c7' },
        },
    },
    '& .MuiInputBase-input': { fontSize: '13px' },
};

const LABEL_SX = { fontSize: '12px', color: '#6b7280', mb: 0.75, fontWeight: 500 };

// ── Component ──────────────────────────────────────────────────────────────
export default function SupplierFilterPopup({ open, onClose, initialValues = {}, onApply }) {
    const [supplierCode, setSupplierCode]         = useState('');
    const [supplierName, setSupplierName]         = useState('');
    const [taxCode, setTaxCode]                   = useState('');
    const [trangThaiOption, setTrangThaiOption]   = useState(TRANG_THAI_OPTIONS[0]);
    const [fromDate, setFromDate]                 = useState('');
    const [toDate, setToDate]                     = useState('');
    const [codeOptions, setCodeOptions]           = useState([]);
    const [nameOptions, setNameOptions]           = useState([]);
    const [taxOptions, setTaxOptions]             = useState([]);

    const boxRef      = useRef(null);
    const dragRef     = useRef({ x: 0, y: 0, startX: 0, startY: 0 });
    const debounceRef = useRef(null);

    // Sync from parent
    useEffect(() => {
        if (!open) return;
        setSupplierCode(initialValues.supplierCode ?? '');
        setSupplierName(initialValues.supplierName ?? '');
        setTaxCode(initialValues.taxCode ?? '');
        const isActive = initialValues.isActive;
        setTrangThaiOption(
            isActive === true  ? TRANG_THAI_OPTIONS[1]
          : isActive === false ? TRANG_THAI_OPTIONS[2]
          : TRANG_THAI_OPTIONS[0],
        );
        setFromDate(initialValues.fromDate ?? '');
        setToDate(initialValues.toDate ?? '');
    }, [open, initialValues.supplierCode, initialValues.supplierName,
        initialValues.taxCode, initialValues.isActive,
        initialValues.fromDate, initialValues.toDate]);

    // Autocomplete suggestions
    const loadSuggestions = useCallback((field, inputValue) => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (!inputValue?.trim()) {
            if (field === 'supplierCode') setCodeOptions([]);
            if (field === 'supplierName') setNameOptions([]);
            if (field === 'taxCode')      setTaxOptions([]);
            return;
        }
        debounceRef.current = setTimeout(async () => {
            const list = await getSupplierSuggestions(field, inputValue);
            if (field === 'supplierCode') setCodeOptions(list);
            if (field === 'supplierName') setNameOptions(list);
            if (field === 'taxCode')      setTaxOptions(list);
        }, DEBOUNCE_MS);
    }, []);

    // Drag logic
    const handleMouseDown = useCallback((e) => {
        if (!boxRef.current) return;
        const rect = boxRef.current.getBoundingClientRect();
        dragRef.current = { x: rect.left, y: rect.top, startX: e.clientX, startY: e.clientY };
        const onMove = (ev) => {
            const dx = ev.clientX - dragRef.current.startX;
            const dy = ev.clientY - dragRef.current.startY;
            dragRef.current.x    += dx;
            dragRef.current.y    += dy;
            dragRef.current.startX = ev.clientX;
            dragRef.current.startY = ev.clientY;
            if (boxRef.current) {
                boxRef.current.style.left = `${dragRef.current.x}px`;
                boxRef.current.style.top  = `${dragRef.current.y}px`;
            }
        };
        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    }, []);

    const handleApply = useCallback(() => {
        const isActive = trangThaiOption.value === '' ? null : trangThaiOption.value === 'true';
        onApply({
            supplierCode: supplierCode.trim() || undefined,
            supplierName: supplierName.trim() || undefined,
            taxCode:      taxCode.trim()      || undefined,
            isActive,
            fromDate: fromDate || undefined,
            toDate:   toDate   || undefined,
        });
        onClose();
    }, [supplierCode, supplierName, taxCode, trangThaiOption, fromDate, toDate, onApply, onClose]);

    const handleClear = useCallback(() => {
        setSupplierCode('');
        setSupplierName('');
        setTaxCode('');
        setTrangThaiOption(TRANG_THAI_OPTIONS[0]);
        setFromDate('');
        setToDate('');
        onApply({ supplierCode: undefined, supplierName: undefined, taxCode: undefined, isActive: null, fromDate: undefined, toDate: undefined });
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
                width: 340,
                maxHeight: 'min(85vh, 520px)',
                borderRadius: '14px',
                border: '1px solid rgba(17,24,39,0.08)',
                boxShadow: '0 8px 32px rgba(17,24,39,0.12)',
                zIndex: 1400,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                bgcolor: '#ffffff',
            }}
        >
            {/* Header */}
            <Box
                onMouseDown={handleMouseDown}
                sx={{
                    cursor: 'move',
                    px: 2, py: 1.5,
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid rgba(17,24,39,0.07)',
                    userSelect: 'none',
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Filter size={14} style={{ color: '#0284c7' }} />
                    <Typography sx={{ fontSize: '14px', fontWeight: 600, color: 'rgba(17,24,39,0.88)' }}>
                        Bộ lọc nhà cung cấp
                    </Typography>
                </Box>
                <IconButton size="small" onClick={onClose} sx={{ width: 26, height: 26, color: '#9ca3af', '&:hover': { color: '#374151', bgcolor: 'rgba(17,24,39,0.05)' } }}>
                    <X size={15} />
                </IconButton>
            </Box>

            {/* Body */}
            <Box sx={{
                flex: 1, minHeight: 0, overflowY: 'auto', p: 2,
                display: 'flex', flexDirection: 'column', gap: 2,
                '&::-webkit-scrollbar': { width: 4 },
                '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(17,24,39,0.12)', borderRadius: 2 },
            }}>
                {/* Mã NCC */}
                <Box>
                    <Typography variant="body2" sx={LABEL_SX}>Mã NCC</Typography>
                    <Autocomplete
                        freeSolo size="small"
                        options={codeOptions}
                        value={supplierCode}
                        onInputChange={(_, v) => { setSupplierCode(v); loadSuggestions('supplierCode', v); }}
                        onChange={(_, v) => setSupplierCode(typeof v === 'string' ? v : v ?? '')}
                        renderInput={(params) => <TextField {...params} placeholder="VD: NCC-001" sx={INPUT_SX} />}
                    />
                </Box>

                {/* Tên nhà cung cấp */}
                <Box>
                    <Typography variant="body2" sx={LABEL_SX}>Tên nhà cung cấp</Typography>
                    <Autocomplete
                        freeSolo size="small"
                        options={nameOptions}
                        value={supplierName}
                        onInputChange={(_, v) => { setSupplierName(v); loadSuggestions('supplierName', v); }}
                        onChange={(_, v) => setSupplierName(typeof v === 'string' ? v : v ?? '')}
                        renderInput={(params) => <TextField {...params} placeholder="Tìm theo tên" sx={INPUT_SX} />}
                    />
                </Box>

                {/* Mã số thuế */}
                <Box>
                    <Typography variant="body2" sx={LABEL_SX}>Mã số thuế</Typography>
                    <Autocomplete
                        freeSolo size="small"
                        options={taxOptions}
                        value={taxCode}
                        onInputChange={(_, v) => { setTaxCode(v); loadSuggestions('taxCode', v); }}
                        onChange={(_, v) => setTaxCode(typeof v === 'string' ? v : v ?? '')}
                        renderInput={(params) => <TextField {...params} placeholder="VD: 0123456789" sx={INPUT_SX} />}
                    />
                </Box>

                {/* Trạng thái */}
                <Box>
                    <Typography variant="body2" sx={LABEL_SX}>Trạng thái</Typography>
                    <Autocomplete
                        size="small"
                        options={TRANG_THAI_OPTIONS}
                        getOptionLabel={(o) => o.label}
                        value={trangThaiOption}
                        onChange={(_, v) => setTrangThaiOption(v || TRANG_THAI_OPTIONS[0])}
                        isOptionEqualToValue={(a, b) => a.value === b.value}
                        renderInput={(params) => <TextField {...params} placeholder="Chọn trạng thái" sx={INPUT_SX} />}
                    />
                </Box>

                {/* Ngày tạo */}
                <Box>
                    <Typography variant="body2" sx={LABEL_SX}>Ngày tạo</Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <TextField
                            size="small" type="date" value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            placeholder="Từ ngày"
                            fullWidth sx={INPUT_SX}
                        />
                        <TextField
                            size="small" type="date" value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            placeholder="Đến ngày"
                            fullWidth sx={INPUT_SX}
                        />
                    </Box>
                </Box>
            </Box>

            {/* Footer */}
            <Box sx={{
                flexShrink: 0, px: 2, py: 1.5,
                borderTop: '1px solid rgba(17,24,39,0.07)',
                display: 'flex', gap: 1,
            }}>
                <Button
                    fullWidth size="small"
                    onClick={handleClear}
                    sx={{
                        fontSize: '13px', fontWeight: 500, textTransform: 'none',
                        height: 34, borderRadius: '8px',
                        border: '1px solid rgba(17,24,39,0.12)',
                        color: 'rgba(17,24,39,0.55)',
                        '&:hover': { bgcolor: 'rgba(17,24,39,0.04)', borderColor: 'rgba(17,24,39,0.18)' },
                    }}
                >
                    Xóa lọc
                </Button>
                <Button
                    fullWidth size="small"
                    onClick={handleApply}
                    sx={{
                        fontSize: '13px', fontWeight: 600, textTransform: 'none',
                        height: 34, borderRadius: '8px',
                        bgcolor: '#0284c7', color: '#ffffff',
                        '&:hover': { bgcolor: '#0369a1' },
                    }}
                >
                    Áp dụng
                </Button>
            </Box>
        </Paper>
    );
}
