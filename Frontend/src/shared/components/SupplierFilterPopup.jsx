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
import { X } from 'lucide-react';
import { getSupplierSuggestions } from '../lib/supplierService';

const TRANG_THAI_OPTIONS = [
    { value: '', label: 'Tất cả' },
    { value: 'true', label: 'Hoạt động' },
    { value: 'false', label: 'Tắt' },
];

const DEBOUNCE_MS = 300;

/**
 * Popup bộ lọc – gọn, tiếng Việt, draggable. Text field = Autocomplete freeSolo + gợi ý từ API.
 */
export default function SupplierFilterPopup({ open, onClose, initialValues = {}, onApply }) {
    const [supplierCode, setSupplierCode] = useState('');
    const [supplierName, setSupplierName] = useState('');
    const [taxCode, setTaxCode] = useState('');
    const [trangThaiOption, setTrangThaiOption] = useState(TRANG_THAI_OPTIONS[0]);
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [codeOptions, setCodeOptions] = useState([]);
    const [nameOptions, setNameOptions] = useState([]);
    const [taxOptions, setTaxOptions] = useState([]);
    const boxRef = useRef(null);
    const dragRef = useRef({ x: 0, y: 0, startX: 0, startY: 0 });
    const debounceRef = useRef(null);

    useEffect(() => {
        if (!open) return;
        setSupplierCode(initialValues.supplierCode ?? '');
        setSupplierName(initialValues.supplierName ?? '');
        setTaxCode(initialValues.taxCode ?? '');
        const isActive = initialValues.isActive;
        setTrangThaiOption(
            isActive === true ? TRANG_THAI_OPTIONS[1]
            : isActive === false ? TRANG_THAI_OPTIONS[2]
            : TRANG_THAI_OPTIONS[0]
        );
        setFromDate(initialValues.fromDate ?? '');
        setToDate(initialValues.toDate ?? '');
    }, [open, initialValues.supplierCode, initialValues.supplierName, initialValues.taxCode, initialValues.isActive, initialValues.fromDate, initialValues.toDate]);

    const loadSuggestions = useCallback((field, inputValue) => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (!inputValue || !inputValue.trim()) {
            if (field === 'supplierCode') setCodeOptions([]);
            if (field === 'supplierName') setNameOptions([]);
            if (field === 'taxCode') setTaxOptions([]);
            return;
        }
        debounceRef.current = setTimeout(async () => {
            const list = await getSupplierSuggestions(field, inputValue);
            if (field === 'supplierCode') setCodeOptions(list);
            if (field === 'supplierName') setNameOptions(list);
            if (field === 'taxCode') setTaxOptions(list);
        }, DEBOUNCE_MS);
    }, []);

    const handleApply = useCallback(() => {
        const isActive = trangThaiOption.value === '' ? null : trangThaiOption.value === 'true';
        onApply({
            supplierCode: supplierCode.trim() || undefined,
            supplierName: supplierName.trim() || undefined,
            taxCode: taxCode.trim() || undefined,
            isActive,
            fromDate: fromDate || undefined,
            toDate: toDate || undefined,
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
        onApply({
            supplierCode: undefined,
            supplierName: undefined,
            taxCode: undefined,
            isActive: null,
            fromDate: undefined,
            toDate: undefined,
        });
        onClose();
    }, [onApply, onClose]);

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

    if (!open) return null;

    const compactSx = { fontSize: '0.8125rem', '& .MuiInputBase-input': { fontSize: '0.8125rem' }, '& .MuiInputLabel-root': { fontSize: '0.8125rem' } };

    return (
        <Paper
            ref={boxRef}
            elevation={8}
            sx={{
                position: 'fixed',
                left: 280,
                top: 120,
                width: 240,
                maxHeight: 'min(85vh, 420px)',
                borderRadius: 2,
                overflow: 'hidden',
                zIndex: 1300,
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <Box
                onMouseDown={handleMouseDown}
                sx={{
                    cursor: 'move',
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
                <Typography variant="caption" fontWeight={600} sx={{ fontSize: '0.75rem' }}>Bộ lọc</Typography>
                <IconButton size="small" onClick={onClose} aria-label="Đóng" sx={{ p: 0.25 }}>
                    <X size={16} />
                </IconButton>
            </Box>
            <Box sx={{ p: 1.25, display: 'flex', flexDirection: 'column', gap: 1.5, overflowY: 'auto', flex: 1, minHeight: 0 }}>
                <Autocomplete
                    freeSolo
                    size="small"
                    options={codeOptions}
                    value={supplierCode}
                    onInputChange={(_, v) => {
                        setSupplierCode(v);
                        loadSuggestions('supplierCode', v);
                    }}
                    onChange={(_, v) => setSupplierCode(typeof v === 'string' ? v : v ?? '')}
                    renderInput={(params) => <TextField {...params} label="Mã NCC" />}
                    sx={compactSx}
                />
                <Autocomplete
                    freeSolo
                    size="small"
                    options={nameOptions}
                    value={supplierName}
                    onInputChange={(_, v) => {
                        setSupplierName(v);
                        loadSuggestions('supplierName', v);
                    }}
                    onChange={(_, v) => setSupplierName(typeof v === 'string' ? v : v ?? '')}
                    renderInput={(params) => <TextField {...params} label="Tên nhà cung cấp" />}
                    sx={compactSx}
                />
                <Autocomplete
                    freeSolo
                    size="small"
                    options={taxOptions}
                    value={taxCode}
                    onInputChange={(_, v) => {
                        setTaxCode(v);
                        loadSuggestions('taxCode', v);
                    }}
                    onChange={(_, v) => setTaxCode(typeof v === 'string' ? v : v ?? '')}
                    renderInput={(params) => <TextField {...params} label="Mã số thuế" />}
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
