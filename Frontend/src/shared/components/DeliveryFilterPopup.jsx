/**
 * Bộ lọc giao hàng – cùng layout với các filter View*List.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, TextField, Autocomplete } from '@mui/material';
import { ListFilterPopupShell, LIST_FILTER_INPUT_SX, LIST_FILTER_LABEL_SX } from './listFilterPopup';

const CARRIER_OPTIONS = [
    { value: '', label: 'Tất cả' },
    { value: 'Giao Hàng Nhanh', label: 'Giao Hàng Nhanh' },
    { value: 'Viettel Post', label: 'Viettel Post' },
    { value: 'Ninja Van', label: 'Ninja Van' },
];

const STATUS_OPTIONS = [
    { value: '', label: 'Tất cả' },
    { value: 'ASSIGNED', label: 'Đã giao tài xế' },
    { value: 'IN_TRANSIT', label: 'Đang vận chuyển' },
    { value: 'DELIVERED', label: 'Đã giao' },
    { value: 'FAILED', label: 'Giao thất bại' },
    { value: 'CANCELLED', label: 'Đã hủy' },
];

const IS_ACTIVE_OPTIONS = [
    { value: '', label: 'Tất cả' },
    { value: 'true', label: 'Đang hoạt động' },
    { value: 'false', label: 'Ngừng hoạt động' },
];

const DeliveryFilterPopup = ({ open, onClose, initialValues = {}, onApply }) => {
    const [carrierOption, setCarrierOption] = useState(CARRIER_OPTIONS[0]);
    const [statusOption, setStatusOption] = useState(STATUS_OPTIONS[0]);
    const [isActiveOption, setIsActiveOption] = useState(IS_ACTIVE_OPTIONS[0]);

    useEffect(() => {
        if (!open) return;
        const c = initialValues.carrierName ?? '';
        const s = initialValues.status ?? '';
        const a = initialValues.isActive;
        setCarrierOption(CARRIER_OPTIONS.find((o) => o.value === c) ?? CARRIER_OPTIONS[0]);
        setStatusOption(STATUS_OPTIONS.find((o) => o.value === s) ?? STATUS_OPTIONS[0]);
        if (a === true || a === 'true') {
            setIsActiveOption(IS_ACTIVE_OPTIONS[1]);
        } else if (a === false || a === 'false') {
            setIsActiveOption(IS_ACTIVE_OPTIONS[2]);
        } else {
            setIsActiveOption(IS_ACTIVE_OPTIONS[0]);
        }
    }, [open, initialValues]);

    const handleApply = useCallback(() => {
        onApply({
            carrierName: carrierOption.value || undefined,
            status: statusOption.value || undefined,
            isActive: isActiveOption.value === '' ? undefined : isActiveOption.value,
        });
        onClose();
    }, [carrierOption, statusOption, isActiveOption, onApply, onClose]);

    const handleClear = useCallback(() => {
        setCarrierOption(CARRIER_OPTIONS[0]);
        setStatusOption(STATUS_OPTIONS[0]);
        setIsActiveOption(IS_ACTIVE_OPTIONS[0]);
        onApply({ carrierName: '', status: '', isActive: '' });
        onClose();
    }, [onApply, onClose]);

    return (
        <ListFilterPopupShell open={open} onClose={onClose} onClear={handleClear} onApply={handleApply} title="Bộ lọc giao hàng" width={360}>
            <Box>
                <Typography variant="body2" sx={LIST_FILTER_LABEL_SX}>
                    Đơn vị vận chuyển
                </Typography>
                <Autocomplete
                    size="small"
                    options={CARRIER_OPTIONS}
                    getOptionLabel={(o) => o.label}
                    value={carrierOption}
                    onChange={(_, v) => setCarrierOption(v || CARRIER_OPTIONS[0])}
                    isOptionEqualToValue={(a, b) => a.value === b.value}
                    renderInput={(params) => (
                        <TextField {...params} placeholder="Chọn đơn vị vận chuyển" sx={LIST_FILTER_INPUT_SX} />
                    )}
                />
            </Box>

            <Box>
                <Typography variant="body2" sx={LIST_FILTER_LABEL_SX}>
                    Trạng thái vận chuyển
                </Typography>
                <Autocomplete
                    size="small"
                    options={STATUS_OPTIONS}
                    getOptionLabel={(o) => o.label}
                    value={statusOption}
                    onChange={(_, v) => setStatusOption(v || STATUS_OPTIONS[0])}
                    isOptionEqualToValue={(a, b) => a.value === b.value}
                    renderInput={(params) => (
                        <TextField {...params} placeholder="Chọn trạng thái" sx={LIST_FILTER_INPUT_SX} />
                    )}
                />
            </Box>

            <Box>
                <Typography variant="body2" sx={LIST_FILTER_LABEL_SX}>
                    Trạng thái hoạt động
                </Typography>
                <Autocomplete
                    size="small"
                    options={IS_ACTIVE_OPTIONS}
                    getOptionLabel={(o) => o.label}
                    value={isActiveOption}
                    onChange={(_, v) => setIsActiveOption(v || IS_ACTIVE_OPTIONS[0])}
                    isOptionEqualToValue={(a, b) => a.value === b.value}
                    renderInput={(params) => (
                        <TextField {...params} placeholder="Chọn trạng thái hoạt động" sx={LIST_FILTER_INPUT_SX} />
                    )}
                />
            </Box>
        </ListFilterPopupShell>
    );
};

export default DeliveryFilterPopup;
