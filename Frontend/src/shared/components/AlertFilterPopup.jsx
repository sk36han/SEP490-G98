import React, { useState, useCallback, useEffect } from 'react';
import { Box, Paper, Typography, TextField, Autocomplete } from '@mui/material';
import {
    ListFilterPopupShell,
    LIST_FILTER_DROPDOWN_PAPER_SX,
    LIST_FILTER_INPUT_SX,
    LIST_FILTER_LABEL_SX,
} from './listFilterPopup';

const ALL_DATA = [
    { alertId: 'AL-001', itemCode: 'SKU-001', itemName: 'Sữa tươi Vinamilk 180ml', warehouseName: 'Kho Tổng Hà Nội', createdBy: 'Nguyễn Văn Minh' },
    { alertId: 'AL-002', itemCode: 'SKU-002', itemName: 'Nước suối Aquafina 500ml', warehouseName: 'Kho Tổng Hà Nội', createdBy: 'Trần Thị Lan' },
    { alertId: 'AL-003', itemCode: 'SKU-003', itemName: 'Mì Hảo Hảo Tôm chua cay', warehouseName: 'Kho Tổng Hà Nội', createdBy: 'Lê Hoàng Nam' },
    { alertId: 'AL-004', itemCode: 'SKU-004', itemName: 'Gạo ST25 (Túi 5kg)', warehouseName: 'Kho Quận 9', createdBy: 'Phạm Thị Hương' },
    { alertId: 'AL-005', itemCode: 'SKU-005', itemName: 'Dầu ăn Tường An 1L', warehouseName: 'Kho Quận 9', createdBy: 'Nguyễn Văn Minh' },
    { alertId: 'AL-006', itemCode: 'SKU-006', itemName: 'Bánh Oreo vani 133g', warehouseName: 'Kho Tổng Hà Nội', createdBy: 'Trần Thị Lan' },
    { alertId: 'AL-007', itemCode: 'SKU-007', itemName: 'Bia Tiger lon 330ml', warehouseName: 'Kho Sài Gòn', createdBy: 'Lê Hoàng Nam' },
    { alertId: 'AL-008', itemCode: 'SKU-008', itemName: 'Trứng gà ta (vỉ 10)', warehouseName: 'Kho Sài Gòn', createdBy: 'Phạm Thị Hương' },
    { alertId: 'AL-009', itemCode: 'SKU-009', itemName: 'Xúc xích Vissan 500g', warehouseName: 'Kho Tổng Hà Nội', createdBy: 'Nguyễn Văn Minh' },
    { alertId: 'AL-010', itemCode: 'SKU-010', itemName: 'Sữa đặc Ông Thọ 397g', warehouseName: 'Kho Quận 9', createdBy: 'Trần Thị Lan' },
    { alertId: 'AL-011', itemCode: 'SKU-011', itemName: 'Cà phê G7 3in1', warehouseName: 'Kho Tổng Hà Nội', createdBy: 'Lê Hoàng Nam' },
    { alertId: 'AL-012', itemCode: 'SKU-012', itemName: 'Nước mắm Nam Ngư 500ml', warehouseName: 'Kho Sài Gòn', createdBy: 'Phạm Thị Hương' },
    { alertId: 'AL-013', itemCode: 'SKU-013', itemName: 'Gói tương ăn liền 200g', warehouseName: 'Kho Quận 9', createdBy: 'Nguyễn Văn Minh' },
    { alertId: 'AL-014', itemCode: 'SKU-014', itemName: 'Tã dán newborn (pack 40)', warehouseName: 'Kho Tổng Hà Nội', createdBy: 'Trần Thị Lan' },
    { alertId: 'AL-015', itemCode: 'SKU-015', itemName: 'Nước rửa chén Sunlight 750ml', warehouseName: 'Kho Sài Gòn', createdBy: 'Lê Hoàng Nam' },
];

const WAREHOUSE_OPTIONS = [
    { value: '', label: 'Tất cả' },
    { value: 'WH-001', label: 'Kho Tổng Hà Nội' },
    { value: 'WH-002', label: 'Kho Quận 9' },
    { value: 'WH-003', label: 'Kho Sài Gòn' },
];

export default function AlertFilterPopup({ open, onClose, initialValues = {}, onApply }) {
    const [itemCode, setItemCode] = useState('');
    const [itemName, setItemName] = useState('');
    const [warehouseOption, setWarehouseOption] = useState(WAREHOUSE_OPTIONS[0]);
    const [createdBy, setCreatedBy] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    const itemCodeOptions = [...new Set(ALL_DATA.map((d) => d.itemCode))].map((v) => ({ label: v }));
    const itemNameOptions = ALL_DATA.map((d) => ({ label: d.itemName, sub: d.itemCode }));
    const createdByOptions = [...new Set(ALL_DATA.map((d) => d.createdBy))].map((v) => ({ label: v }));

    useEffect(() => {
        if (!open) return;
        setItemCode(initialValues.itemCode ?? '');
        setItemName(initialValues.itemName ?? '');
        setWarehouseOption(WAREHOUSE_OPTIONS.find((o) => o.label === (initialValues.warehouseName ?? 'Tất cả')) ?? WAREHOUSE_OPTIONS[0]);
        setCreatedBy(initialValues.createdBy ?? '');
        setFromDate(initialValues.fromDate ?? '');
        setToDate(initialValues.toDate ?? '');
    }, [open, initialValues]);

    const handleApply = useCallback(() => {
        onApply({
            itemCode: itemCode || undefined,
            itemName: itemName || undefined,
            warehouseName: warehouseOption.label !== 'Tất cả' ? warehouseOption.label : undefined,
            createdBy: createdBy || undefined,
            fromDate: fromDate || undefined,
            toDate: toDate || undefined,
        });
        onClose();
    }, [itemCode, itemName, warehouseOption, createdBy, fromDate, toDate, onApply, onClose]);

    const handleClear = useCallback(() => {
        setItemCode('');
        setItemName('');
        setWarehouseOption(WAREHOUSE_OPTIONS[0]);
        setCreatedBy('');
        setFromDate('');
        setToDate('');
        onApply({});
        onClose();
    }, [onApply, onClose]);

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
                    options={WAREHOUSE_OPTIONS}
                    getOptionLabel={(opt) => opt.label}
                    value={warehouseOption}
                    onChange={(_, v) => setWarehouseOption(v || WAREHOUSE_OPTIONS[0])}
                    isOptionEqualToValue={(a, b) => a.value === b.value}
                    PaperComponent={(props) => <Paper {...props} sx={LIST_FILTER_DROPDOWN_PAPER_SX} />}
                    renderInput={(params) => (
                        <TextField {...params} placeholder="Chọn kho" sx={LIST_FILTER_INPUT_SX} />
                    )}
                />
            </Box>

            <Box>
                <Typography variant="body2" sx={LIST_FILTER_LABEL_SX}>
                    Nhân viên tạo
                </Typography>
                <Autocomplete
                    size="small"
                    options={createdByOptions}
                    getOptionLabel={(opt) => opt.label}
                    value={createdByOptions.find((o) => o.label === createdBy) || null}
                    onChange={(_, v) => setCreatedBy(v?.label ?? '')}
                    isOptionEqualToValue={(a, b) => a.label === b.label}
                    PaperComponent={(props) => <Paper {...props} sx={LIST_FILTER_DROPDOWN_PAPER_SX} />}
                    renderInput={(params) => (
                        <TextField {...params} placeholder="Tìm nhân viên tạo…" sx={LIST_FILTER_INPUT_SX} />
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
