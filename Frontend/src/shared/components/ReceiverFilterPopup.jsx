import React, { useState, useCallback, useEffect } from 'react';
import { Box, Typography, TextField, Autocomplete } from '@mui/material';
import { ListFilterPopupShell, LIST_FILTER_INPUT_SX, LIST_FILTER_LABEL_SX } from './listFilterPopup';

const STATUS_OPTIONS = [
    { value: '', label: 'Tất cả' },
    { value: 'true', label: 'Hoạt động' },
    { value: 'false', label: 'Ngưng' },
];

export default function ReceiverFilterPopup({ open, onClose, initialValues = {}, onApply }) {
    const [receiverCode, setReceiverCode] = useState('');
    const [receiverName, setReceiverName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [ward, setWard] = useState('');
    const [province, setProvince] = useState('');
    const [country, setCountry] = useState('');
    const [statusOption, setStatusOption] = useState(STATUS_OPTIONS[0]);
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    useEffect(() => {
        if (!open) return;
        setReceiverCode(initialValues.receiverCode ?? '');
        setReceiverName(initialValues.receiverName ?? '');
        setPhone(initialValues.phone ?? '');
        setEmail(initialValues.email ?? '');
        setWard(initialValues.ward ?? '');
        setProvince(initialValues.province ?? '');
        setCountry(initialValues.country ?? '');
        const isActive = initialValues.isActive;
        setStatusOption(
            isActive === true ? STATUS_OPTIONS[1] : isActive === false ? STATUS_OPTIONS[2] : STATUS_OPTIONS[0]
        );
        setFromDate(initialValues.fromDate ?? '');
        setToDate(initialValues.toDate ?? '');
    }, [
        open,
        initialValues.receiverCode,
        initialValues.receiverName,
        initialValues.phone,
        initialValues.email,
        initialValues.ward,
        initialValues.province,
        initialValues.country,
        initialValues.isActive,
        initialValues.fromDate,
        initialValues.toDate,
    ]);

    const handleApply = useCallback(() => {
        const isActive = statusOption.value === '' ? null : statusOption.value === 'true';
        onApply({
            receiverCode: receiverCode.trim() || undefined,
            receiverName: receiverName.trim() || undefined,
            phone: phone.trim() || undefined,
            email: email.trim() || undefined,
            ward: ward.trim() || undefined,
            province: province.trim() || undefined,
            country: country.trim() || undefined,
            isActive,
            fromDate: fromDate || undefined,
            toDate: toDate || undefined,
        });
        onClose();
    }, [receiverCode, receiverName, phone, email, ward, province, country, statusOption, fromDate, toDate, onApply, onClose]);

    const handleClear = useCallback(() => {
        setReceiverCode('');
        setReceiverName('');
        setPhone('');
        setEmail('');
        setWard('');
        setProvince('');
        setCountry('');
        setStatusOption(STATUS_OPTIONS[0]);
        setFromDate('');
        setToDate('');
        onApply({
            receiverCode: undefined,
            receiverName: undefined,
            phone: undefined,
            email: undefined,
            ward: undefined,
            province: undefined,
            country: undefined,
            isActive: null,
            fromDate: undefined,
            toDate: undefined,
        });
        onClose();
    }, [onApply, onClose]);

    return (
        <ListFilterPopupShell open={open} onClose={onClose} onClear={handleClear} onApply={handleApply} title="Bộ lọc người nhận" width={360}>
            <Box>
                <Typography variant="body2" sx={LIST_FILTER_LABEL_SX}>
                    Mã người nhận
                </Typography>
                <TextField
                    size="small"
                    value={receiverCode}
                    onChange={(e) => setReceiverCode(e.target.value)}
                    fullWidth
                    placeholder="Mã người nhận"
                    sx={LIST_FILTER_INPUT_SX}
                />
            </Box>
            <Box>
                <Typography variant="body2" sx={LIST_FILTER_LABEL_SX}>
                    Tên người nhận
                </Typography>
                <TextField
                    size="small"
                    value={receiverName}
                    onChange={(e) => setReceiverName(e.target.value)}
                    fullWidth
                    placeholder="Tên người nhận"
                    sx={LIST_FILTER_INPUT_SX}
                />
            </Box>
            <Box>
                <Typography variant="body2" sx={LIST_FILTER_LABEL_SX}>
                    Số điện thoại
                </Typography>
                <TextField
                    size="small"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    fullWidth
                    placeholder="Số điện thoại"
                    sx={LIST_FILTER_INPUT_SX}
                />
            </Box>
            <Box>
                <Typography variant="body2" sx={LIST_FILTER_LABEL_SX}>
                    Email
                </Typography>
                <TextField
                    size="small"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    fullWidth
                    placeholder="Email"
                    sx={LIST_FILTER_INPUT_SX}
                />
            </Box>
            <Box>
                <Typography variant="body2" sx={LIST_FILTER_LABEL_SX}>
                    Phường
                </Typography>
                <TextField
                    size="small"
                    value={ward}
                    onChange={(e) => setWard(e.target.value)}
                    fullWidth
                    placeholder="Phường"
                    sx={LIST_FILTER_INPUT_SX}
                />
            </Box>
            <Box>
                <Typography variant="body2" sx={LIST_FILTER_LABEL_SX}>
                    Tỉnh
                </Typography>
                <TextField
                    size="small"
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    fullWidth
                    placeholder="Tỉnh"
                    sx={LIST_FILTER_INPUT_SX}
                />
            </Box>
            <Box>
                <Typography variant="body2" sx={LIST_FILTER_LABEL_SX}>
                    Quốc gia
                </Typography>
                <TextField
                    size="small"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    fullWidth
                    placeholder="Quốc gia"
                    sx={LIST_FILTER_INPUT_SX}
                />
            </Box>
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
                    renderInput={(params) => (
                        <TextField {...params} placeholder="Chọn trạng thái" sx={LIST_FILTER_INPUT_SX} />
                    )}
                />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                <Box>
                    <Typography variant="body2" sx={{ ...LIST_FILTER_LABEL_SX, mb: 0.5, fontSize: '11px' }}>
                        Từ ngày tạo
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
                        Đến ngày tạo
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
