import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Box, Paper, Typography, TextField, Autocomplete } from '@mui/material';
import {
    ListFilterPopupShell,
    LIST_FILTER_DROPDOWN_PAPER_SX,
    LIST_FILTER_INPUT_SX,
    LIST_FILTER_LABEL_SX,
} from './listFilterPopup';

/**
 * Bộ lọc cảnh báo tồn kho — dữ liệu gợi ý lấy từ policyRows + warehouses (không mock).
 *
 * @param {Object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {Record<string, unknown>} [props.initialValues]
 * @param {(values: Record<string, string|undefined>) => void} props.onApply
 * @param {Array<{ warehouseId?: number, warehouseName?: string }>} [props.warehouses]
 * @param {Array<{ itemCode?: string, itemName?: string, warehouseName?: string }>} [props.policyRows]
 */
export default function AlertFilterPopup({
    open,
    onClose,
    initialValues = {},
    onApply,
    warehouses = [],
    policyRows = [],
}) {
    const [itemCode, setItemCode] = useState('');
    const [itemName, setItemName] = useState('');
    const [warehouseOption, setWarehouseOption] = useState({ value: '', label: 'Tất cả' });
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    const warehouseOptions = useMemo(() => {
        const base = [{ value: '', label: 'Tất cả' }];
        const rows = Array.isArray(warehouses) ? warehouses : [];
        const seen = new Set();
        rows.forEach((w) => {
            const name = w?.warehouseName ?? '';
            if (!name || seen.has(name)) return;
            seen.add(name);
            base.push({
                value: String(w.warehouseId ?? ''),
                label: name,
            });
        });
        return base;
    }, [warehouses]);

    const itemCodeOptions = useMemo(() => {
        const codes = new Set();
        (Array.isArray(policyRows) ? policyRows : []).forEach((r) => {
            const c = r?.itemCode;
            if (c != null && String(c).trim() !== '') codes.add(String(c).trim());
        });
        return [...codes].sort((a, b) => a.localeCompare(b, 'vi')).map((label) => ({ label }));
    }, [policyRows]);

    const itemNameOptions = useMemo(() => {
        const list = [];
        const seen = new Set();
        (Array.isArray(policyRows) ? policyRows : []).forEach((r) => {
            const name = r?.itemName;
            if (name == null || String(name).trim() === '') return;
            const label = String(name).trim();
            if (seen.has(label)) return;
            seen.add(label);
            list.push({
                label,
                sub: r?.itemCode != null ? String(r.itemCode) : '',
            });
        });
        list.sort((a, b) => a.label.localeCompare(b.label, 'vi'));
        return list;
    }, [policyRows]);

    useEffect(() => {
        if (!open) return;
        setItemCode(initialValues.itemCode ?? '');
        setItemName(initialValues.itemName ?? '');
        const whLabel = initialValues.warehouseName;
        const match = warehouseOptions.find((o) => o.label === (whLabel ?? 'Tất cả'));
        setWarehouseOption(match ?? warehouseOptions[0] ?? { value: '', label: 'Tất cả' });
        setFromDate(initialValues.fromDate ?? '');
        setToDate(initialValues.toDate ?? '');
    }, [open, initialValues, warehouseOptions]);

    const handleApply = useCallback(() => {
        onApply({
            itemCode: itemCode || undefined,
            itemName: itemName || undefined,
            warehouseName: warehouseOption.label !== 'Tất cả' ? warehouseOption.label : undefined,
            fromDate: fromDate || undefined,
            toDate: toDate || undefined,
        });
        onClose();
    }, [itemCode, itemName, warehouseOption, fromDate, toDate, onApply, onClose]);

    const handleClear = useCallback(() => {
        setItemCode('');
        setItemName('');
        setWarehouseOption(warehouseOptions[0] ?? { value: '', label: 'Tất cả' });
        setFromDate('');
        setToDate('');
        onApply({});
        onClose();
    }, [warehouseOptions, onApply, onClose]);

    return (
        <ListFilterPopupShell open={open} onClose={onClose} onClear={handleClear} onApply={handleApply} width={360}>
            <Box>
                <Typography variant="body2" sx={LIST_FILTER_LABEL_SX}>
                    Mã vật tư
                </Typography>
                <Autocomplete
                    size="small"
                    options={itemCodeOptions}
                    getOptionLabel={(opt) => opt.label}
                    value={itemCodeOptions.find((o) => o.label === itemCode) || null}
                    onChange={(_, v) => setItemCode(v?.label ?? '')}
                    isOptionEqualToValue={(a, b) => a.label === b.label}
                    PaperComponent={(props) => <Paper {...props} sx={LIST_FILTER_DROPDOWN_PAPER_SX} />}
                    renderInput={(params) => (
                        <TextField {...params} placeholder="Tìm mã vật tư…" sx={LIST_FILTER_INPUT_SX} />
                    )}
                />
            </Box>

            <Box>
                <Typography variant="body2" sx={LIST_FILTER_LABEL_SX}>
                    Tên vật tư
                </Typography>
                <Autocomplete
                    size="small"
                    options={itemNameOptions}
                    getOptionLabel={(opt) => opt.label}
                    value={itemNameOptions.find((o) => o.label === itemName) || null}
                    onChange={(_, v) => setItemName(v?.label ?? '')}
                    isOptionEqualToValue={(a, b) => a.label === b.label}
                    PaperComponent={(props) => <Paper {...props} sx={LIST_FILTER_DROPDOWN_PAPER_SX} />}
                    renderInput={(params) => (
                        <TextField {...params} placeholder="Tìm tên vật tư…" sx={LIST_FILTER_INPUT_SX} />
                    )}
                />
            </Box>

            <Box>
                <Typography variant="body2" sx={LIST_FILTER_LABEL_SX}>
                    Kho
                </Typography>
                <Autocomplete
                    size="small"
                    options={warehouseOptions}
                    getOptionLabel={(opt) => opt.label}
                    value={warehouseOption}
                    onChange={(_, v) => setWarehouseOption(v || warehouseOptions[0] || { value: '', label: 'Tất cả' })}
                    isOptionEqualToValue={(a, b) => a.value === b.value && a.label === b.label}
                    PaperComponent={(props) => <Paper {...props} sx={LIST_FILTER_DROPDOWN_PAPER_SX} />}
                    renderInput={(params) => (
                        <TextField {...params} placeholder="Chọn kho" sx={LIST_FILTER_INPUT_SX} />
                    )}
                />
            </Box>

            <Box>
                <Typography variant="body2" sx={LIST_FILTER_LABEL_SX}>
                    Ngày tạo
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
