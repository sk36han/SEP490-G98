import React, { useState, useCallback, useEffect } from 'react';
import { Box, Typography, TextField, Autocomplete } from '@mui/material';
import { ListFilterPopupShell, LIST_FILTER_INPUT_SX, LIST_FILTER_LABEL_SX } from './listFilterPopup';

const STATUS_OPTIONS = [
    { value: '', label: 'Tất cả' },
    { value: 'DRAFT', label: 'Nháp' },
    { value: 'PENDING_ACC', label: 'Chờ duyệt' },
    { value: 'APPROVED', label: 'Đã duyệt' },
    { value: 'REJECTED', label: 'Từ chối' },
    { value: 'CANCELLED', label: 'Đã hủy' },
];

const QUOTATION_STATUS_OPTIONS = [
    { value: '', label: 'Tất cả' },
    { value: 'DRAFT', label: 'Nháp báo giá' },
    { value: 'SENT', label: 'Đã gửi báo giá' },
    { value: 'CONFIRMED', label: 'Đã chốt báo giá' },
];

const LIFECYCLE_STATUS_OPTIONS = [
    { value: '', label: 'Tất cả' },
    { value: 'IssuePending', label: 'Đang đợi xuất hàng' },
    { value: 'IssuePartial', label: 'Xuất một phần hàng' },
    { value: 'IssueFull', label: 'Xuất đủ hàng' },
];

const STAFF_OPTIONS = [
    { value: 'Nguyen Van A', label: 'Nguyen Van A' },
    { value: 'Pham Thi B', label: 'Pham Thi B' },
    { value: 'Tran Van C', label: 'Tran Van C' },
    { value: 'Le Thi D', label: 'Le Thi D' },
    { value: 'Hoang Van E', label: 'Hoang Van E' },
    { value: 'Dinh Van F', label: 'Dinh Van F' },
];

const RECEIVER_OPTIONS = [
    { value: 'Tran Thi B', label: 'Tran Thi B' },
    { value: 'Le Van C', label: 'Le Van C' },
    { value: 'Hoang Van E', label: 'Hoang Van E' },
    { value: 'Dang Thi F', label: 'Dang Thi F' },
    { value: 'Nguyen Van G', label: 'Nguyen Van G' },
    { value: 'Pham Thi H', label: 'Pham Thi H' },
];

export default function ReleaseRequestFilterPopup({ open, onClose, initialValues = {}, onApply }) {
    const [statusOption, setStatusOption] = useState(STATUS_OPTIONS[0]);
    const [quotationStatusOption, setQuotationStatusOption] = useState(QUOTATION_STATUS_OPTIONS[0]);
    const [lifecycleStatusOption, setLifecycleStatusOption] = useState(LIFECYCLE_STATUS_OPTIONS[0]);
    const [requestedByOption, setRequestedByOption] = useState(null);
    const [receiverOption, setReceiverOption] = useState(null);
    const [fromExportDate, setFromExportDate] = useState('');
    const [toExportDate, setToExportDate] = useState('');
    const [fromCreatedDate, setFromCreatedDate] = useState('');
    const [toCreatedDate, setToCreatedDate] = useState('');

    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => {
        if (!open) return;
        setStatusOption(STATUS_OPTIONS.find((o) => o.value === (initialValues.status ?? '')) ?? STATUS_OPTIONS[0]);
        setQuotationStatusOption(QUOTATION_STATUS_OPTIONS.find((o) => o.value === (initialValues.quotationStatus ?? '')) ?? QUOTATION_STATUS_OPTIONS[0]);
        setLifecycleStatusOption(LIFECYCLE_STATUS_OPTIONS.find((o) => o.value === (initialValues.lifecycleStatus ?? '')) ?? LIFECYCLE_STATUS_OPTIONS[0]);
        setRequestedByOption(STAFF_OPTIONS.find((o) => o.value === (initialValues.requestedBy ?? '')) ?? null);
        setReceiverOption(RECEIVER_OPTIONS.find((o) => o.value === (initialValues.receiverName ?? '')) ?? null);
        setFromExportDate(initialValues.fromExportDate ?? '');
        setToExportDate(initialValues.toExportDate ?? '');
        setFromCreatedDate(initialValues.fromCreatedDate ?? '');
        setToCreatedDate(initialValues.toCreatedDate ?? '');
    }, [open, initialValues]);

    const handleApply = useCallback(() => {
        onApply({
            status: statusOption.value || undefined,
            quotationStatus: quotationStatusOption.value || undefined,
            lifecycleStatus: lifecycleStatusOption.value || undefined,
            requestedBy: requestedByOption?.value || undefined,
            receiverName: receiverOption?.value || undefined,
            fromExportDate: fromExportDate || undefined,
            toExportDate: toExportDate || undefined,
            fromCreatedDate: fromCreatedDate || undefined,
            toCreatedDate: toCreatedDate || undefined,
        });
        onClose();
    }, [
        statusOption,
        quotationStatusOption,
        lifecycleStatusOption,
        requestedByOption,
        receiverOption,
        fromExportDate,
        toExportDate,
        fromCreatedDate,
        toCreatedDate,
        onApply,
        onClose,
    ]);

    const handleClear = useCallback(() => {
        setStatusOption(STATUS_OPTIONS[0]);
        setQuotationStatusOption(QUOTATION_STATUS_OPTIONS[0]);
        setLifecycleStatusOption(LIFECYCLE_STATUS_OPTIONS[0]);
        setRequestedByOption(null);
        setReceiverOption(null);
        setFromExportDate('');
        setToExportDate('');
        setFromCreatedDate('');
        setToCreatedDate('');
        onApply({});
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
                    Trạng thái báo giá
                </Typography>
                <Autocomplete
                    size="small"
                    options={QUOTATION_STATUS_OPTIONS}
                    getOptionLabel={(o) => o.label}
                    value={quotationStatusOption}
                    onChange={(_, v) => setQuotationStatusOption(v ?? QUOTATION_STATUS_OPTIONS[0])}
                    isOptionEqualToValue={(a, b) => a.value === b.value}
                    renderInput={(params) => (
                        <TextField {...params} placeholder="Chọn trạng thái báo giá" sx={LIST_FILTER_INPUT_SX} />
                    )}
                />
            </Box>
            <Box>
                <Typography variant="body2" sx={LIST_FILTER_LABEL_SX}>
                    Tình trạng xuất
                </Typography>
                <Autocomplete
                    size="small"
                    options={LIFECYCLE_STATUS_OPTIONS}
                    getOptionLabel={(o) => o.label}
                    value={lifecycleStatusOption}
                    onChange={(_, v) => setLifecycleStatusOption(v ?? LIFECYCLE_STATUS_OPTIONS[0])}
                    isOptionEqualToValue={(a, b) => a.value === b.value}
                    renderInput={(params) => (
                        <TextField {...params} placeholder="Chọn tình trạng xuất" sx={LIST_FILTER_INPUT_SX} />
                    )}
                />
            </Box>
            <Box>
                <Typography variant="body2" sx={LIST_FILTER_LABEL_SX}>
                    Nhân viên yêu cầu
                </Typography>
                <Autocomplete
                    size="small"
                    options={STAFF_OPTIONS}
                    getOptionLabel={(o) => o.label}
                    value={requestedByOption}
                    onChange={(_, v) => setRequestedByOption(v)}
                    isOptionEqualToValue={(a, b) => a.value === b.value}
                    renderInput={(params) => (
                        <TextField {...params} placeholder="Chọn nhân viên" sx={LIST_FILTER_INPUT_SX} />
                    )}
                />
            </Box>
            <Box>
                <Typography variant="body2" sx={LIST_FILTER_LABEL_SX}>
                    Người nhận
                </Typography>
                <Autocomplete
                    size="small"
                    options={RECEIVER_OPTIONS}
                    getOptionLabel={(o) => o.label}
                    value={receiverOption}
                    onChange={(_, v) => setReceiverOption(v)}
                    isOptionEqualToValue={(a, b) => a.value === b.value}
                    renderInput={(params) => (
                        <TextField {...params} placeholder="Chọn người nhận" sx={LIST_FILTER_INPUT_SX} />
                    )}
                />
            </Box>
            <Box>
                <Typography variant="body2" sx={LIST_FILTER_LABEL_SX}>
                    Ngày xuất dự kiến
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                    <TextField
                        size="small"
                        type="date"
                        value={fromExportDate}
                        onChange={(e) => setFromExportDate(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        sx={LIST_FILTER_INPUT_SX}
                    />
                    <TextField
                        size="small"
                        type="date"
                        value={toExportDate}
                        onChange={(e) => setToExportDate(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        sx={LIST_FILTER_INPUT_SX}
                    />
                </Box>
            </Box>
            <Box>
                <Typography variant="body2" sx={LIST_FILTER_LABEL_SX}>
                    Ngày tạo
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                    <TextField
                        size="small"
                        type="date"
                        value={fromCreatedDate}
                        onChange={(e) => setFromCreatedDate(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        sx={LIST_FILTER_INPUT_SX}
                    />
                    <TextField
                        size="small"
                        type="date"
                        value={toCreatedDate}
                        onChange={(e) => setToCreatedDate(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        sx={LIST_FILTER_INPUT_SX}
                    />
                </Box>
            </Box>
        </ListFilterPopupShell>
    );
}
