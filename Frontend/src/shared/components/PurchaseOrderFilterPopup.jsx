import React, { useState, useCallback, useEffect } from 'react';
import { Box, Typography, TextField, Autocomplete } from '@mui/material';
import { ListFilterPopupShell, LIST_FILTER_INPUT_SX, LIST_FILTER_LABEL_SX } from './listFilterPopup';

const APPROVAL_STATUS_OPTIONS = [
    { value: '', label: 'Tất cả' },
    { value: 'DRAFT', label: 'Bản nháp' },
    { value: 'Pending_Acc', label: 'Chờ duyệt' },
    { value: 'APPROVED', label: 'Đã duyệt' },
    { value: 'REJECTED', label: 'Từ chối' },
];

const RECEIVING_STATUS_OPTIONS = [
    { value: '', label: 'Tất cả' },
    { value: 'PendingRcv', label: 'Chờ nhập' },
    { value: 'PartialRcv', label: 'Nhập một phần' },
    { value: 'FullRcv', label: 'Nhập toàn bộ' },
];

export default function PurchaseOrderFilterPopup({ open, onClose, initialValues = {}, onApply }) {
    const [approvalStatusOption, setApprovalStatusOption] = useState(APPROVAL_STATUS_OPTIONS[0]);
    const [receivingStatusOption, setReceivingStatusOption] = useState(RECEIVING_STATUS_OPTIONS[0]);
    const [supplier, setSupplier] = useState('');
    const [warehouse, setWarehouse] = useState('');
    const [creator, setCreator] = useState('');
    const [responsiblePerson, setResponsiblePerson] = useState('');
    const [product, setProduct] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    useEffect(() => {
        if (!open) return;
        const approvalStatus = initialValues.approvalStatus ?? '';
        const receivingStatus = initialValues.receivingStatus ?? '';
        setApprovalStatusOption(
            APPROVAL_STATUS_OPTIONS.find((o) => o.value === approvalStatus) || APPROVAL_STATUS_OPTIONS[0]
        );
        setReceivingStatusOption(
            RECEIVING_STATUS_OPTIONS.find((o) => o.value === receivingStatus) || RECEIVING_STATUS_OPTIONS[0]
        );
        setSupplier(initialValues.supplier ?? '');
        setWarehouse(initialValues.warehouse ?? '');
        setCreator(initialValues.creator ?? '');
        setResponsiblePerson(initialValues.responsiblePerson ?? '');
        setProduct(initialValues.product ?? '');
        setFromDate(initialValues.fromDate ?? '');
        setToDate(initialValues.toDate ?? '');
    }, [open, initialValues]);

    const handleApply = useCallback(() => {
        onApply({
            approvalStatus: approvalStatusOption.value || undefined,
            receivingStatus: receivingStatusOption.value || undefined,
            supplier: supplier || undefined,
            warehouse: warehouse || undefined,
            creator: creator || undefined,
            responsiblePerson: responsiblePerson || undefined,
            product: product || undefined,
            fromDate: fromDate || undefined,
            toDate: toDate || undefined,
        });
        onClose();
    }, [
        approvalStatusOption,
        receivingStatusOption,
        supplier,
        warehouse,
        creator,
        responsiblePerson,
        product,
        fromDate,
        toDate,
        onApply,
        onClose,
    ]);

    const handleClear = useCallback(() => {
        setApprovalStatusOption(APPROVAL_STATUS_OPTIONS[0]);
        setReceivingStatusOption(RECEIVING_STATUS_OPTIONS[0]);
        setSupplier('');
        setWarehouse('');
        setCreator('');
        setResponsiblePerson('');
        setProduct('');
        setFromDate('');
        setToDate('');
        onApply({
            approvalStatus: undefined,
            receivingStatus: undefined,
            supplier: undefined,
            warehouse: undefined,
            creator: undefined,
            responsiblePerson: undefined,
            product: undefined,
            fromDate: undefined,
            toDate: undefined,
        });
        onClose();
    }, [onApply, onClose]);

    return (
        <ListFilterPopupShell open={open} onClose={onClose} onClear={handleClear} onApply={handleApply} width={360}>
            <Box>
                <Typography variant="body2" sx={LIST_FILTER_LABEL_SX}>
                    Trạng thái duyệt
                </Typography>
                <Autocomplete
                    size="small"
                    options={APPROVAL_STATUS_OPTIONS}
                    getOptionLabel={(opt) => opt.label}
                    value={approvalStatusOption}
                    onChange={(_, v) => setApprovalStatusOption(v || APPROVAL_STATUS_OPTIONS[0])}
                    isOptionEqualToValue={(a, b) => a.value === b.value}
                    renderInput={(params) => (
                        <TextField {...params} placeholder="Chọn trạng thái" sx={LIST_FILTER_INPUT_SX} />
                    )}
                />
            </Box>

            <Box>
                <Typography variant="body2" sx={LIST_FILTER_LABEL_SX}>
                    Trạng thái nhập hàng
                </Typography>
                <Autocomplete
                    size="small"
                    options={RECEIVING_STATUS_OPTIONS}
                    getOptionLabel={(opt) => opt.label}
                    value={receivingStatusOption}
                    onChange={(_, v) => setReceivingStatusOption(v || RECEIVING_STATUS_OPTIONS[0])}
                    isOptionEqualToValue={(a, b) => a.value === b.value}
                    renderInput={(params) => (
                        <TextField {...params} placeholder="Chọn trạng thái" sx={LIST_FILTER_INPUT_SX} />
                    )}
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
                    Kho/Chi nhánh
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
                    Nhân viên tạo
                </Typography>
                <TextField
                    size="small"
                    value={creator}
                    onChange={(e) => setCreator(e.target.value)}
                    fullWidth
                    placeholder="Tìm theo tên nhân viên"
                    sx={LIST_FILTER_INPUT_SX}
                />
            </Box>

            <Box>
                <Typography variant="body2" sx={LIST_FILTER_LABEL_SX}>
                    Nhân viên phụ trách
                </Typography>
                <TextField
                    size="small"
                    value={responsiblePerson}
                    onChange={(e) => setResponsiblePerson(e.target.value)}
                    fullWidth
                    placeholder="Tìm theo tên nhân viên phụ trách"
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
        </ListFilterPopupShell>
    );
}
