import React, { useState, useCallback, useEffect } from 'react';
import { Box, Typography, TextField, Autocomplete } from '@mui/material';
import { ListFilterPopupShell, LIST_FILTER_INPUT_SX, LIST_FILTER_LABEL_SX } from './listFilterPopup';

const STATUS_OPTIONS = [
    { value: '', label: 'Tất cả' },
    { value: 'Draft', label: 'Nháp' },
    { value: 'Submitted', label: 'Đã gửi duyệt' },
    { value: 'Approved', label: 'Đã duyệt' },
    { value: 'Rejected', label: 'Từ chối' },
    { value: 'Posted', label: 'Đã ghi sổ' },
];

const RECEIVING_STATUS_OPTIONS = [
    { value: '', label: 'Tất cả' },
    { value: 'NotStarted', label: 'Chưa nhập' },
    { value: 'Partial', label: 'Nhập một phần' },
    { value: 'Completed', label: 'Đã nhập đủ' },
];

export default function GoodReceiptNoteFilterPopup({ open, onClose, initialValues = {}, onApply }) {
    const [statusOption, setStatusOption] = useState(STATUS_OPTIONS[0]);
    const [supplier, setSupplier] = useState('');
    const [warehouse, setWarehouse] = useState('');
    const [createdBy, setCreatedBy] = useState('');
    const [product, setProduct] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [receivingStatusOption, setReceivingStatusOption] = useState(RECEIVING_STATUS_OPTIONS[0]);

    useEffect(() => {
        if (!open) return;
        setStatusOption(STATUS_OPTIONS.find((o) => o.value === (initialValues.status ?? '')) ?? STATUS_OPTIONS[0]);
        setSupplier(initialValues.supplier ?? '');
        setWarehouse(initialValues.warehouse ?? '');
        setCreatedBy(initialValues.createdBy ?? '');
        setProduct(initialValues.product ?? '');
        setFromDate(initialValues.fromDate ?? '');
        setToDate(initialValues.toDate ?? '');
        setReceivingStatusOption(
            RECEIVING_STATUS_OPTIONS.find((o) => o.value === (initialValues.receivingStatus ?? '')) ??
                RECEIVING_STATUS_OPTIONS[0]
        );
    }, [open, initialValues]);

    const handleApply = useCallback(() => {
        onApply({
            status: statusOption.value || undefined,
            supplier: supplier || undefined,
            warehouse: warehouse || undefined,
            createdBy: createdBy || undefined,
            product: product || undefined,
            fromDate: fromDate || undefined,
            toDate: toDate || undefined,
            receivingStatus: receivingStatusOption.value || undefined,
        });
        onClose();
    }, [statusOption, receivingStatusOption, supplier, warehouse, createdBy, product, fromDate, toDate, onApply, onClose]);

    const handleClear = useCallback(() => {
        setStatusOption(STATUS_OPTIONS[0]);
        setSupplier('');
        setWarehouse('');
        setCreatedBy('');
        setProduct('');
        setFromDate('');
        setToDate('');
        setReceivingStatusOption(RECEIVING_STATUS_OPTIONS[0]);
        onApply({});
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
                    getOptionLabel={(o) => o.label}
                    value={statusOption}
                    onChange={(_, v) => setStatusOption(v ?? STATUS_OPTIONS[0])}
                    isOptionEqualToValue={(a, b) => a.value === b.value}
                    renderInput={(params) => (
                        <TextField {...params} placeholder="Chọn trạng thái" sx={LIST_FILTER_INPUT_SX} />
                    )}
                />
            </Box>

            <Box>
                <Typography variant="body2" sx={LIST_FILTER_LABEL_SX}>
                    Ngày nhập
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                    <Box>
                        <Typography variant="body2" sx={{ ...LIST_FILTER_LABEL_SX, mb: 0.5, fontSize: '11px' }}>
                            Từ ngày
                        </Typography>
                        <TextField
                            size="small"
                            type="date"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            fullWidth
                            sx={LIST_FILTER_INPUT_SX}
                        />
                    </Box>
                    <Box>
                        <Typography variant="body2" sx={{ ...LIST_FILTER_LABEL_SX, mb: 0.5, fontSize: '11px' }}>
                            Đến ngày
                        </Typography>
                        <TextField
                            size="small"
                            type="date"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            fullWidth
                            sx={LIST_FILTER_INPUT_SX}
                        />
                    </Box>
                </Box>
            </Box>

            <Box>
                <Typography variant="body2" sx={LIST_FILTER_LABEL_SX}>
                    Kho nhập
                </Typography>
                <TextField
                    size="small"
                    value={warehouse}
                    onChange={(e) => setWarehouse(e.target.value)}
                    fullWidth
                    placeholder="Tìm theo tên kho"
                    sx={LIST_FILTER_INPUT_SX}
                />
            </Box>

            <Box>
                <Typography variant="body2" sx={LIST_FILTER_LABEL_SX}>
                    Nhà cung cấp
                </Typography>
                <TextField
                    size="small"
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    fullWidth
                    placeholder="Tìm theo tên nhà cung cấp"
                    sx={LIST_FILTER_INPUT_SX}
                />
            </Box>

            <Box>
                <Typography variant="body2" sx={LIST_FILTER_LABEL_SX}>
                    Nhân viên tạo
                </Typography>
                <TextField
                    size="small"
                    value={createdBy}
                    onChange={(e) => setCreatedBy(e.target.value)}
                    fullWidth
                    placeholder="Tìm theo tên nhân viên"
                    sx={LIST_FILTER_INPUT_SX}
                />
            </Box>

            <Box>
                <Typography variant="body2" sx={LIST_FILTER_LABEL_SX}>
                    Sản phẩm
                </Typography>
                <TextField
                    size="small"
                    value={product}
                    onChange={(e) => setProduct(e.target.value)}
                    fullWidth
                    placeholder="Tìm theo tên sản phẩm"
                    sx={LIST_FILTER_INPUT_SX}
                />
            </Box>

            <Box>
                <Typography variant="body2" sx={LIST_FILTER_LABEL_SX}>
                    Trạng thái nhập
                </Typography>
                <Autocomplete
                    size="small"
                    options={RECEIVING_STATUS_OPTIONS}
                    getOptionLabel={(o) => o.label}
                    value={receivingStatusOption}
                    onChange={(_, v) => setReceivingStatusOption(v ?? RECEIVING_STATUS_OPTIONS[0])}
                    isOptionEqualToValue={(a, b) => a.value === b.value}
                    renderInput={(params) => (
                        <TextField {...params} placeholder="Chọn trạng thái nhập" sx={LIST_FILTER_INPUT_SX} />
                    )}
                />
            </Box>
        </ListFilterPopupShell>
    );
}
