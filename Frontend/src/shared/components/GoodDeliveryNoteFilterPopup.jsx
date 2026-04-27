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
    { value: 'Draft', label: 'Nháp' },
    { value: 'PendingIssue', label: 'Chờ xuất hàng' },
    { value: 'Issued', label: 'Đã xuất hàng' },
    { value: 'Posted', label: 'Đã ghi sổ' },
    { value: 'Rejected', label: 'Từ chối' },
];

const PAYMENT_STATUS_OPTIONS = [
    { value: '', label: 'Tất cả' },
    { value: 'paid', label: 'Đã thanh toán' },
    { value: 'unpaid', label: 'Chưa thanh toán' },
];

export default function GoodDeliveryNoteFilterPopup({
    open,
    onClose,
    initialValues = {},
    onApply,
    releaseRequestCodeOptions = [],
    receiverOptions = [],
    warehouseOptions = [],
    createdByOptions = [],
}) {
    const [statusOption, setStatusOption] = useState(STATUS_OPTIONS[0]);
    const [paymentStatusOption, setPaymentStatusOption] = useState(PAYMENT_STATUS_OPTIONS[0]);
    const [releaseRequestCodeOption, setReleaseRequestCodeOption] = useState('');
    const [receiverOption, setReceiverOption] = useState('');
    const [warehouseOption, setWarehouseOption] = useState('');
    const [createdByOption, setCreatedByOption] = useState('');
    const [issueFromDate, setIssueFromDate] = useState('');
    const [issueToDate, setIssueToDate] = useState('');

    useEffect(() => {
        if (!open) return;

        setStatusOption(STATUS_OPTIONS.find((o) => o.value === (initialValues.status ?? '')) || STATUS_OPTIONS[0]);
        setPaymentStatusOption(
            PAYMENT_STATUS_OPTIONS.find((o) => o.value === (initialValues.paymentStatus ?? '')) || PAYMENT_STATUS_OPTIONS[0]
        );
        setReleaseRequestCodeOption(initialValues.releaseRequestCode ?? '');
        setReceiverOption(initialValues.receiverName ?? '');
        setWarehouseOption(initialValues.warehouseName ?? '');
        setCreatedByOption(initialValues.createdBy ?? '');
        setIssueFromDate(initialValues.issueFromDate ?? '');
        setIssueToDate(initialValues.issueToDate ?? '');
    }, [open, initialValues]);

    const handleApply = useCallback(() => {
        onApply({
            status: statusOption.value || undefined,
            paymentStatus: paymentStatusOption.value || undefined,
            releaseRequestCode: releaseRequestCodeOption || undefined,
            receiverName: receiverOption || undefined,
            warehouseName: warehouseOption || undefined,
            createdBy: createdByOption || undefined,
            issueFromDate: issueFromDate || undefined,
            issueToDate: issueToDate || undefined,
        });
        onClose();
    }, [
        statusOption,
        paymentStatusOption,
        releaseRequestCodeOption,
        receiverOption,
        warehouseOption,
        createdByOption,
        issueFromDate,
        issueToDate,
        onApply,
        onClose,
    ]);

    const handleClear = useCallback(() => {
        setStatusOption(STATUS_OPTIONS[0]);
        setPaymentStatusOption(PAYMENT_STATUS_OPTIONS[0]);
        setReleaseRequestCodeOption('');
        setReceiverOption('');
        setWarehouseOption('');
        setCreatedByOption('');
        setIssueFromDate('');
        setIssueToDate('');

        onApply({
            status: undefined,
            paymentStatus: undefined,
            releaseRequestCode: undefined,
            receiverName: undefined,
            warehouseName: undefined,
            createdBy: undefined,
            issueFromDate: undefined,
            issueToDate: undefined,
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
                    Trạng thái thanh toán
                </Typography>
                <Autocomplete
                    size="small"
                    options={PAYMENT_STATUS_OPTIONS}
                    getOptionLabel={(opt) => opt.label}
                    value={paymentStatusOption}
                    onChange={(_, v) => setPaymentStatusOption(v || PAYMENT_STATUS_OPTIONS[0])}
                    isOptionEqualToValue={(a, b) => a.value === b.value}
                    PaperComponent={(props) => <Paper {...props} sx={LIST_FILTER_DROPDOWN_PAPER_SX} />}
                    renderInput={(params) => (
                        <TextField {...params} placeholder="Chọn trạng thái thanh toán" sx={LIST_FILTER_INPUT_SX} />
                    )}
                />
            </Box>

            <Box>
                <Typography variant="body2" sx={LIST_FILTER_LABEL_SX}>
                    Yêu cầu xuất tham chiếu
                </Typography>
                <Autocomplete
                    freeSolo
                    size="small"
                    options={releaseRequestCodeOptions}
                    value={releaseRequestCodeOption}
                    onInputChange={(_, v) => setReleaseRequestCodeOption(v || '')}
                    PaperComponent={(props) => <Paper {...props} sx={LIST_FILTER_DROPDOWN_PAPER_SX} />}
                    renderInput={(params) => (
                        <TextField {...params} placeholder="Tìm mã yêu cầu xuất" sx={LIST_FILTER_INPUT_SX} />
                    )}
                />
            </Box>

            <Box>
                <Typography variant="body2" sx={LIST_FILTER_LABEL_SX}>
                    Người nhận
                </Typography>
                <Autocomplete
                    freeSolo
                    size="small"
                    options={receiverOptions}
                    value={receiverOption}
                    onInputChange={(_, v) => setReceiverOption(v || '')}
                    PaperComponent={(props) => <Paper {...props} sx={LIST_FILTER_DROPDOWN_PAPER_SX} />}
                    renderInput={(params) => (
                        <TextField {...params} placeholder="Tìm người nhận" sx={LIST_FILTER_INPUT_SX} />
                    )}
                />
            </Box>

            <Box>
                <Typography variant="body2" sx={LIST_FILTER_LABEL_SX}>
                    Kho xuất
                </Typography>
                <Autocomplete
                    freeSolo
                    size="small"
                    options={warehouseOptions}
                    value={warehouseOption}
                    onInputChange={(_, v) => setWarehouseOption(v || '')}
                    PaperComponent={(props) => <Paper {...props} sx={LIST_FILTER_DROPDOWN_PAPER_SX} />}
                    renderInput={(params) => (
                        <TextField {...params} placeholder="Tìm kho xuất" sx={LIST_FILTER_INPUT_SX} />
                    )}
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
                    Ngày xuất
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField
                        size="small"
                        type="date"
                        value={issueFromDate}
                        onChange={(e) => setIssueFromDate(e.target.value)}
                        fullWidth
                        sx={LIST_FILTER_INPUT_SX}
                    />
                    <TextField
                        size="small"
                        type="date"
                        value={issueToDate}
                        onChange={(e) => setIssueToDate(e.target.value)}
                        fullWidth
                        sx={LIST_FILTER_INPUT_SX}
                    />
                </Box>
            </Box>
        </ListFilterPopupShell>
    );
}
