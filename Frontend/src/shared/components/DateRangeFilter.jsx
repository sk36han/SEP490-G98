import React, { useState, useRef, useEffect } from 'react';
import { Box, Typography, Popover } from '@mui/material';
import { Calendar, ChevronDown } from 'lucide-react';
import dayjs from 'dayjs';

const PRESET_OPTIONS = [
    { label: 'Hôm nay', getValue: () => ({ from: dayjs().format('YYYY-MM-DD'), to: dayjs().format('YYYY-MM-DD') }) },
    { label: 'Hôm qua', getValue: () => ({ from: dayjs().subtract(1, 'day').format('YYYY-MM-DD'), to: dayjs().subtract(1, 'day').format('YYYY-MM-DD') }) },
    { label: '7 ngày qua', getValue: () => ({ from: dayjs().subtract(6, 'day').format('YYYY-MM-DD'), to: dayjs().format('YYYY-MM-DD') }) },
    { label: '30 ngày qua', getValue: () => ({ from: dayjs().subtract(29, 'day').format('YYYY-MM-DD'), to: dayjs().format('YYYY-MM-DD') }) },
    { label: 'Tuần trước', getValue: () => ({ from: dayjs().subtract(1, 'week').startOf('week').format('YYYY-MM-DD'), to: dayjs().subtract(1, 'week').endOf('week').format('YYYY-MM-DD') }) },
    { label: 'Tuần này', getValue: () => ({ from: dayjs().startOf('week').format('YYYY-MM-DD'), to: dayjs().endOf('week').format('YYYY-MM-DD') }) },
    { label: 'Tháng trước', getValue: () => ({ from: dayjs().subtract(1, 'month').startOf('month').format('YYYY-MM-DD'), to: dayjs().subtract(1, 'month').endOf('month').format('YYYY-MM-DD') }) },
    { label: 'Tháng này', getValue: () => ({ from: dayjs().startOf('month').format('YYYY-MM-DD'), to: dayjs().endOf('month').format('YYYY-MM-DD') }) },
    { label: 'Năm trước', getValue: () => ({ from: dayjs().subtract(1, 'year').startOf('year').format('YYYY-MM-DD'), to: dayjs().subtract(1, 'year').endOf('year').format('YYYY-MM-DD') }) },
    { label: 'Năm nay', getValue: () => ({ from: dayjs().startOf('year').format('YYYY-MM-DD'), to: dayjs().endOf('year').format('YYYY-MM-DD') }) },
];

/**
 * Date Range Filter Component
 * Dropdown voi cac tuy chon predefined va tuy chon ngay tuy y
 */
export default function DateRangeFilter({
    fromDate,
    toDate,
    onFromDateChange,
    onToDateChange,
    disableFuture = false,
}) {
    const [anchorEl, setAnchorEl] = useState(null);
    const [isCustomMode, setIsCustomMode] = useState(false);
    const [tempFrom, setTempFrom] = useState(fromDate || '');
    const [tempTo, setTempTo] = useState(toDate || '');
    const buttonRef = useRef(null);

    useEffect(() => {
        // Check if current date range matches any preset
        const matchedPreset = PRESET_OPTIONS.find(opt => {
            const preset = opt.getValue();
            return preset.from === fromDate && preset.to === toDate;
        });
        setIsCustomMode(!matchedPreset);
        setTempFrom(fromDate || '');
        setTempTo(toDate || '');
    }, [fromDate, toDate]);

    const handleOpen = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handlePresetSelect = (preset) => {
        const { from, to } = preset.getValue();
        setTempFrom(from);
        setTempTo(to);
        onFromDateChange?.(from);
        onToDateChange?.(to);
        handleClose();
    };

    const handleCustomToggle = () => {
        setIsCustomMode(true);
    };

    const handleApplyCustom = () => {
        if (tempFrom && tempTo) {
            onFromDateChange?.(tempFrom);
            onToDateChange?.(tempTo);
        }
        handleClose();
    };

    const handleFromDateChange = (e) => {
        setTempFrom(e.target.value);
    };

    const handleToDateChange = (e) => {
        setTempTo(e.target.value);
    };

    // Find current preset label
    const currentPreset = PRESET_OPTIONS.find(opt => {
        const preset = opt.getValue();
        return preset.from === fromDate && preset.to === toDate;
    });

    const displayText = currentPreset
        ? currentPreset.label
        : (fromDate && toDate
            ? `${dayjs(fromDate).format('dd/MM/yyyy')} - ${dayjs(toDate).format('dd/MM/yyyy')}`
            : 'Chọn ngày');

    const isOpen = Boolean(anchorEl);

    return (
        <>
            {/* Dropdown Button */}
            <Box
                ref={buttonRef}
                onClick={handleOpen}
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    px: 1.5,
                    py: 0.75,
                    bgcolor: '#f3f4f6',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    border: '1px solid transparent',
                    transition: 'all 0.2s',
                    '&:hover': {
                        bgcolor: '#e5e7eb',
                    },
                }}
            >
                <Calendar size={16} color="#6b7280" />
                <Typography sx={{ fontSize: '13px', color: '#374151', flex: 1 }}>
                    {displayText}
                </Typography>
                <ChevronDown size={16} color="#6b7280" />
            </Box>

            {/* Dropdown Panel */}
            <Popover
                open={isOpen}
                anchorEl={anchorEl}
                onClose={handleClose}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'left',
                }}
                slotProps={{
                    paper: {
                        sx: {
                            mt: 1,
                            borderRadius: '12px',
                            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.08)',
                            border: '1px solid rgba(0, 0, 0, 0.08)',
                            overflow: 'hidden',
                        },
                    },
                }}
            >
                <Box sx={{ width: 360, p: 2 }}>
                    {/* Preset Options */}
                    {!isCustomMode ? (
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                            {PRESET_OPTIONS.map((preset) => (
                                <Box
                                    key={preset.label}
                                    onClick={() => handlePresetSelect(preset)}
                                    sx={{
                                        px: 1.5,
                                        py: 1,
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontSize: '13px',
                                        color: '#374151',
                                        transition: 'all 0.2s',
                                        '&:hover': {
                                            bgcolor: '#f3f4f6',
                                        },
                                    }}
                                >
                                    {preset.label}
                                </Box>
                            ))}
                            {/* Custom option button */}
                            <Box
                                onClick={handleCustomToggle}
                                sx={{
                                    px: 1.5,
                                    py: 1,
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    bgcolor: '#3b82f6',
                                    color: '#ffffff',
                                    textAlign: 'center',
                                    fontWeight: 500,
                                    transition: 'all 0.2s',
                                    '&:hover': {
                                        bgcolor: '#2563eb',
                                    },
                                }}
                            >
                                Tùy chọn
                            </Box>
                        </Box>
                    ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {/* Custom Date Inputs */}
                            <Box sx={{ display: 'flex', gap: 1.5 }}>
                                <Box sx={{ flex: 1 }}>
                                    <Typography sx={{ fontSize: '12px', color: '#6b7280', mb: 0.5 }}>
                                        Từ ngày
                                    </Typography>
                                    <input
                                        type="date"
                                        value={tempFrom}
                                        onChange={handleFromDateChange}
                                        max={disableFuture ? dayjs().format('YYYY-MM-DD') : undefined}
                                        style={{
                                            width: '100%',
                                            padding: '8px 12px',
                                            borderRadius: '8px',
                                            border: '1px solid #d1d5db',
                                            fontSize: '13px',
                                            outline: 'none',
                                            backgroundColor: '#f9fafb',
                                        }}
                                    />
                                </Box>
                                <Box sx={{ flex: 1 }}>
                                    <Typography sx={{ fontSize: '12px', color: '#6b7280', mb: 0.5 }}>
                                        Đến ngày
                                    </Typography>
                                    <input
                                        type="date"
                                        value={tempTo}
                                        onChange={handleToDateChange}
                                        max={disableFuture ? dayjs().format('YYYY-MM-DD') : undefined}
                                        min={tempFrom}
                                        style={{
                                            width: '100%',
                                            padding: '8px 12px',
                                            borderRadius: '8px',
                                            border: '1px solid #d1d5db',
                                            fontSize: '13px',
                                            outline: 'none',
                                            backgroundColor: '#f9fafb',
                                        }}
                                    />
                                </Box>
                            </Box>

                            {/* Validation error */}
                            {tempFrom && tempTo && new Date(tempTo) < new Date(tempFrom) && (
                                <Typography sx={{ color: '#dc2626', fontSize: '12px' }}>
                                    Ngày kết thúc phải lớn hơn ngày bắt đầu
                                </Typography>
                            )}

                            {/* Action Buttons */}
                            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                                <Box
                                    onClick={() => setIsCustomMode(false)}
                                    sx={{
                                        px: 2,
                                        py: 0.75,
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontSize: '13px',
                                        color: '#6b7280',
                                        border: '1px solid #d1d5db',
                                        '&:hover': {
                                            bgcolor: '#f3f4f6',
                                        },
                                    }}
                                >
                                    Quay lại
                                </Box>
                                <Box
                                    onClick={handleApplyCustom}
                                    sx={{
                                        px: 2,
                                        py: 0.75,
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontSize: '13px',
                                        bgcolor: '#3b82f6',
                                        color: '#ffffff',
                                        fontWeight: 500,
                                        '&:hover': {
                                            bgcolor: '#2563eb',
                                        },
                                    }}
                                >
                                    Áp dụng
                                </Box>
                            </Box>
                        </Box>
                    )}
                </Box>
            </Popover>
        </>
    );
}
