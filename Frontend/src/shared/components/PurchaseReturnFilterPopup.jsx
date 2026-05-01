import React, { useState, useCallback, useEffect } from 'react';
import { Box, Paper, Typography, TextField, Autocomplete } from '@mui/material';
import {
    ListFilterPopupShell,
    LIST_FILTER_DROPDOWN_PAPER_SX,
    LIST_FILTER_INPUT_SX,
    LIST_FILTER_LABEL_SX,
} from './listFilterPopup';

const STATUS_OPTIONS = [
    { value: '', label: 'Tất cả' },
    { value: 'DRAFT', label: 'Nháp' },
    { value: 'SUBMITTED', label: 'Chờ trả hàng' },
    { value: 'APPROVED', label: 'Đã bắt đầu trả hàng' },
    { value: 'POSTED', label: 'Đã hoàn thành' },
    { value: 'CANCELLED', label: 'Đã hủy' },
];

const REFUND_STATUS_OPTIONS = [
    { value: '', label: 'Tất cả' },
    { value: 'NotRefunded', label: 'Chưa hoàn tiền' },
    { value: 'PartiallyRefunded', label: 'Hoàn một phần' },
    { value: 'Refunded', label: 'Đã hoàn tiền' },
];

export default function PurchaseReturnFilterPopup({
    open,
    onClose,
    initialValues = {},
    onApply,
    relatedGRNOptions = [],
    createdByOptions = [],
    supplierOptions = [],
}) {
    const [statusOption, setStatusOption] = useState(STATUS_OPTIONS[0]);
    const [refundStatusOption, setRefundStatusOption] = useState(REFUND_STATUS_OPTIONS[0]);
    const [relatedGRNOption, setRelatedGRNOption] = useState('');
    const [createdByOption, setCreatedByOption] = useState('');
    const [supplierOption, setSupplierOption] = useState('');
    const [returnFromDate, setReturnFromDate] = useState('');
    const [returnToDate, setReturnToDate] = useState('');
    const [createdFromDate, setCreatedFromDate] = useState('');
    const [createdToDate, setCreatedToDate] = useState('');

    useEffect(() => {
        if (!open) return;

        setStatusOption(STATUS_OPTIONS.find((o) => o.value === (initialValues.status ?? '')) || STATUS_OPTIONS[0]);
        setRefundStatusOption(
            REFUND_STATUS_OPTIONS.find((o) => o.value === (initialValues.refundStatus ?? '')) || REFUND_STATUS_OPTIONS[0]
        );
        setRelatedGRNOption(initialValues.relatedGrnCode ?? '');
        setCreatedByOption(initialValues.createdByName ?? '');
        setSupplierOption(initialValues.supplierName ?? '');
        setReturnFromDate(initialValues.returnFromDate ?? '');
        setReturnToDate(initialValues.returnToDate ?? '');
        setCreatedFromDate(initialValues.createdFromDate ?? '');
        setCreatedToDate(initialValues.createdToDate ?? '');
    }, [open, initialValues]);

    const handleApply = useCallback(() => {
        onApply({
            status: statusOption.value || undefined,
            refundStatus: refundStatusOption.value || undefined,
            relatedGrnCode: relatedGRNOption || undefined,
            createdByName: createdByOption || undefined,
            supplierName: supplierOption || undefined,
            returnFromDate: returnFromDate || undefined,
            returnToDate: returnToDate || undefined,
            createdFromDate: createdFromDate || undefined,
            createdToDate: createdToDate || undefined,
        });
        onClose();
    }, [
        statusOption,
        refundStatusOption,
        relatedGRNOption,
        createdByOption,
        supplierOption,
        returnFromDate,
        returnToDate,
        createdFromDate,
        createdToDate,
        onApply,
        onClose,
    ]);

    const handleClear = useCallback(() => {
        setStatusOption(STATUS_OPTIONS[0]);
        setRefundStatusOption(REFUND_STATUS_OPTIONS[0]);
        setRelatedGRNOption('');
        setCreatedByOption('');
        setSupplierOption('');
        setReturnFromDate('');
        setReturnToDate('');
        setCreatedFromDate('');
        setCreatedToDate('');

        onApply({
            status: undefined,
            refundStatus: undefined,
            relatedGrnCode: undefined,
            createdByName: undefined,
            supplierName: undefined,
            returnFromDate: undefined,
            returnToDate: undefined,
            createdFromDate: undefined,
            createdToDate: undefined,
        });
        onClose();
    }, [onApply, onClose]);

    return (
        <ListFilterPopupShell open={open} onClose={onClose} onClear={handleClear} onApply={handleApply} width={360} maxHeight="80vh">
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
                    Trạng thái hoàn tiền
                </Typography>
                <Autocomplete
                    size="small"
                    options={REFUND_STATUS_OPTIONS}
                    getOptionLabel={(opt) => opt.label}
                    value={refundStatusOption}
                    onChange={(_, v) => setRefundStatusOption(v || REFUND_STATUS_OPTIONS[0])}
                    isOptionEqualToValue={(a, b) => a.value === b.value}
                    PaperComponent={(props) => <Paper {...props} sx={LIST_FILTER_DROPDOWN_PAPER_SX} />}
                    renderInput={(params) => (
                        <TextField {...params} placeholder="Chọn trạng thái hoàn tiền" sx={LIST_FILTER_INPUT_SX} />
                    )}
                />
            </Box>

            <Box>
                <Typography variant="body2" sx={LIST_FILTER_LABEL_SX}>
                    Phiếu nhập tham chiếu
                </Typography>
                <Autocomplete
                    freeSolo
                    size="small"
                    options={relatedGRNOptions}
                    value={relatedGRNOption}
                    onInputChange={(_, v) => setRelatedGRNOption(v || '')}
                    PaperComponent={(props) => <Paper {...props} sx={LIST_FILTER_DROPDOWN_PAPER_SX} />}
                    renderInput={(params) => <TextField {...params} placeholder="Tìm GRN" sx={LIST_FILTER_INPUT_SX} />}
                />
            </Box>

            <Box>
                <Typography variant="body2" sx={LIST_FILTER_LABEL_SX}>
                    Người tạo
                </Typography>
                <Autocomplete
                    freeSolo
                    size="small"
                    options={createdByOptions}
                    value={createdByOption}
                    onInputChange={(_, v) => setCreatedByOption(v || '')}
                    PaperComponent={(props) => <Paper {...props} sx={LIST_FILTER_DROPDOWN_PAPER_SX} />}
                    renderInput={(params) => (
                        <TextField {...params} placeholder="Tìm người tạo" sx={LIST_FILTER_INPUT_SX} />
                    )}
                />
            </Box>

            <Box>
                <Typography variant="body2" sx={LIST_FILTER_LABEL_SX}>
                    Nhà cung cấp
                </Typography>
                <Autocomplete
                    freeSolo
                    size="small"
                    options={supplierOptions}
                    value={supplierOption}
                    onInputChange={(_, v) => setSupplierOption(v || '')}
                    PaperComponent={(props) => <Paper {...props} sx={LIST_FILTER_DROPDOWN_PAPER_SX} />}
                    renderInput={(params) => (
                        <TextField {...params} placeholder="Tìm nhà cung cấp" sx={LIST_FILTER_INPUT_SX} />
                    )}
                />
            </Box>

            <Box>
                <Typography variant="body2" sx={LIST_FILTER_LABEL_SX}>
                    Ngày trả hàng
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField
                        size="small"
                        type="date"
                        value={returnFromDate}
                        onChange={(e) => setReturnFromDate(e.target.value)}
                        fullWidth
                        sx={LIST_FILTER_INPUT_SX}
                    />
                    <TextField
                        size="small"
                        type="date"
                        value={returnToDate}
                        onChange={(e) => setReturnToDate(e.target.value)}
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
                        fullWidth
                        sx={LIST_FILTER_INPUT_SX}
                    />
                    <TextField
                        size="small"
                        type="date"
                        value={createdToDate}
                        onChange={(e) => setCreatedToDate(e.target.value)}
                        fullWidth
                        sx={LIST_FILTER_INPUT_SX}
                    />
                </Box>
            </Box>
        </ListFilterPopupShell>
    );
}
