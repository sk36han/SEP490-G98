import React, { useState, useEffect } from 'react';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { Box, Paper } from '@mui/material';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';

dayjs.locale('vi');

/**
 * Month Picker Calendar - Single calendar for month selection
 * Returns month range when a date is clicked
 * 
 * @param {string|Date|null} value - Current selected date/month (YYYY-MM-DD)
 * @param {function} onChange - Callback returns { from: 'YYYY-MM-01', to: 'YYYY-MM-DD' } for the selected month
 * @param {object} sx - Additional styles
 */
export default function MonthPickerCalendar({ value, onChange, sx }) {
    const [currentMonth, setCurrentMonth] = useState(dayjs(value || new Date()));
    const [selectedDate, setSelectedDate] = useState(value ? dayjs(value) : null);

    useEffect(() => {
        if (value) {
            const newDate = dayjs(value);
            setCurrentMonth(newDate);
            setSelectedDate(newDate);
        }
    }, [value]);

    const handlePrevMonth = () => {
        setCurrentMonth(currentMonth.subtract(1, 'month'));
    };

    const handleNextMonth = () => {
        setCurrentMonth(currentMonth.add(1, 'month'));
    };

    const handleDateClick = (date) => {
        setSelectedDate(date);
        // Return month range
        const monthStart = date.startOf('month');
        const monthEnd = date.endOf('month');
        onChange?.({
            from: monthStart.format('YYYY-MM-DD'),
            to: monthEnd.format('YYYY-MM-DD'),
            displayDate: date.format('MM/YYYY'),
        });
    };

    const calendarPaperSx = {
        width: '100%',
        minWidth: 260,
        maxWidth: 280,
        borderRadius: '10px',
        bgcolor: '#ffffff',
        border: '1px solid rgba(0, 0, 0, 0.06)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
        overflow: 'hidden',
        ...sx,
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="vi">
            <Paper elevation={0} sx={calendarPaperSx}>
                {/* Month/Year Header with arrows */}
                <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    px: 1.5,
                    py: 1.5,
                    borderBottom: '1px solid #f3f4f6',
                }}>
                    <Box
                        onClick={handlePrevMonth}
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            p: 0.75,
                            borderRadius: '6px',
                            color: '#6b7280',
                            transition: 'all 0.2s',
                            '&:hover': { bgcolor: '#f3f4f6', color: '#111827' },
                        }}
                    >
                        <ChevronLeft size={20} />
                    </Box>

                    <Box sx={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: '#111827',
                        fontFamily: "'Be Vietnam Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                    }}>
                        {currentMonth.format('MMMM YYYY')}
                    </Box>

                    <Box
                        onClick={handleNextMonth}
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            p: 0.75,
                            borderRadius: '6px',
                            color: '#6b7280',
                            transition: 'all 0.2s',
                            '&:hover': { bgcolor: '#f3f4f6', color: '#111827' },
                        }}
                    >
                        <ChevronRight size={20} />
                    </Box>
                </Box>

                {/* Calendar */}
                <Box sx={{ px: 1, py: 0.5 }}>
                    <DateCalendar
                        value={selectedDate}
                        onChange={handleDateClick}
                        showDaysOutsideCurrentMonth
                        fixedWeekNumber={6}
                        slotProps={{
                            leftArrowButton: { sx: { display: 'none' } },
                            rightArrowButton: { sx: { display: 'none' } },
                            calendarHeader: { sx: { display: 'none' } },
                        }}
                        sx={{
                            width: '100%',
                            margin: 0,
                            maxHeight: 260,
                            '& .MuiDateCalendar-root': {
                                width: '100%',
                                margin: 0,
                                maxHeight: 260,
                            },
                            '& .MuiPickersCalendarHeader-root': {
                                display: 'none',
                            },
                            '& .MuiDayCalendar-header': {
                                marginBottom: '2px',
                            },
                            '& .MuiDayCalendar-weekDayLabel': {
                                fontSize: '11px',
                                fontWeight: 500,
                                color: '#6b7280',
                                fontFamily: "'Be Vietnam Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                            },
                            '& .MuiPickersDay-root': {
                                fontSize: '13px',
                                fontFamily: "'Be Vietnam Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                                color: '#374151',
                                width: 32,
                                height: 32,
                                margin: '2px 0',
                                '&:hover': {
                                    bgcolor: '#f3f4f6',
                                },
                                '&.Mui-selected': {
                                    bgcolor: '#0284c7 !important',
                                    color: '#ffffff',
                                    fontWeight: 500,
                                    '&:hover': {
                                        bgcolor: '#0369a1 !important',
                                    },
                                },
                                '&.Mui-disabled': {
                                    color: '#d1d5db',
                                },
                                '&.MuiPickersDay-today': {
                                    border: '1px solid #0284c7',
                                    '&.Mui-selected': {
                                        border: 'none',
                                    },
                                },
                                '&.MuiPickersDay-dayOutsideMonth': {
                                    color: '#d1d5db',
                                },
                            },
                        }}
                    />
                </Box>
            </Paper>
        </LocalizationProvider>
    );
}

/**
 * Single Date Calendar Component (legacy - kept for compatibility)
 * Hiển thị lịch dạng block/panel luôn visible, không có input field hay popup.
 */
export function SingleDateCalendar({
    value,
    onChange,
    disableFuture = false,
    disablePast = false,
    sx,
}) {
    const calendarPaperSx = {
        width: '100%',
        minWidth: 280,
        maxWidth: 320,
        borderRadius: '12px',
        bgcolor: '#ffffff',
        border: '1px solid rgba(0, 0, 0, 0.06)',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04)',
        overflow: 'hidden',

        '& .MuiDateCalendar-root': {
            width: '100%',
            margin: 0,
            maxHeight: 340,
            padding: '8px 12px 12px',
        },

        '& .MuiPickersCalendarHeader-root': {
            paddingLeft: '4px',
            paddingRight: '0px',
            paddingTop: '4px',
            paddingBottom: '8px',
        },

        '& .MuiPickersCalendarHeader-label': {
            fontSize: '15px',
            fontWeight: 600,
            color: '#111827',
            fontFamily:
                "'Be Vietnam Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        },

        '& .MuiPickersArrowSwitcher-button': {
            color: '#6b7280',
            '&:hover': {
                bgcolor: '#f3f4f6',
            },
        },

        '& .MuiDayCalendar-header': {
            marginBottom: '4px',
        },

        '& .MuiDayCalendar-weekDayLabel': {
            fontSize: '12px',
            fontWeight: 500,
            color: '#6b7280',
            fontFamily:
                "'Be Vietnam Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        },

        '& .MuiPickersDay-root': {
            fontSize: '13px',
            fontFamily:
                "'Be Vietnam Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            color: '#374151',

            '&:hover': {
                bgcolor: '#f3f4f6',
            },

            '&.Mui-selected': {
                bgcolor: '#0284c7 !important',
                color: '#ffffff',
                fontWeight: 500,

                '&:hover': {
                    bgcolor: '#0369a1 !important',
                },
            },

            '&.Mui-disabled': {
                color: '#d1d5db',
            },

            '&.MuiPickersDay-today': {
                border: '1px solid #0284c7',

                '&.Mui-selected': {
                    border: 'none',
                },
            },
        },

        '& .MuiPickersDay-dayOutsideMonth': {
            color: '#d1d5db',
        },

        ...sx,
    };

    const handleChange = (newValue) => {
        onChange?.(newValue ? newValue.format('YYYY-MM-DD') : '');
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="vi">
            <Paper elevation={0} sx={calendarPaperSx}>
                <DateCalendar
                    value={value ? dayjs(value) : null}
                    onChange={handleChange}
                    disableFuture={disableFuture}
                    disablePast={disablePast}
                    showDaysOutsideCurrentMonth
                    fixedWeekNumber={6}
                />
            </Paper>
        </LocalizationProvider>
    );
}

/**
 * Reusable Date Range Picker Component (dạng input popup - giữ nguyên cho chỗ khác nếu cần)
 */
export function DateRangePicker({
    fromDate,
    toDate,
    onFromDateChange,
    onToDateChange,
    sx,
    fromLabel = 'Từ ngày',
    toLabel = 'Đến ngày',
}) {
    const datePickerSx = {
        flex: 1,
        '& .MuiOutlinedInput-root': {
            fontSize: '13px',
            height: 40,
            bgcolor: '#f3f4f6',
            borderRadius: '10px',
            '& fieldset': { border: 'none' },
            '&:hover': { bgcolor: '#e5e7eb' },
            '&.Mui-focused': {
                bgcolor: '#ffffff',
                boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
                '& fieldset': { border: '1px solid #3b82f6' },
            },
        },
        '& .MuiInputBase-input': {
            fontSize: '13px',
            py: 1.25,
        },
        '& .MuiFormLabel-root': {
            fontSize: '13px',
            mt: 0.5,
        },
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="vi">
            <Box sx={{ display: 'flex', gap: 1.5, ...sx }}>
                <DatePicker
                    label={fromLabel}
                    value={fromDate ? dayjs(fromDate) : null}
                    onChange={(newValue) =>
                        onFromDateChange?.(newValue ? newValue.format('YYYY-MM-DD') : '')
                    }
                    slotProps={{
                        textField: {
                            size: 'small',
                            fullWidth: true,
                            sx: datePickerSx,
                        },
                    }}
                    format="DD/MM/YYYY"
                />
                <DatePicker
                    label={toLabel}
                    value={toDate ? dayjs(toDate) : null}
                    onChange={(newValue) =>
                        onToDateChange?.(newValue ? newValue.format('YYYY-MM-DD') : '')
                    }
                    slotProps={{
                        textField: {
                            size: 'small',
                            fullWidth: true,
                            sx: datePickerSx,
                        },
                    }}
                    format="DD/MM/YYYY"
                />
            </Box>
        </LocalizationProvider>
    );
}

/**
 * Single Date Picker (dạng input popup - giữ nguyên để tương thích ngược)
 */
export function SingleDatePicker({
    value,
    onChange,
    label = 'Chọn ngày',
    sx,
    disableFuture = false,
    disablePast = false,
}) {
    const datePickerSx = {
        flex: 1,
        '& .MuiOutlinedInput-root': {
            fontSize: '13px',
            height: 40,
            bgcolor: '#f3f4f6',
            borderRadius: '10px',
            '& fieldset': { border: 'none' },
            '&:hover': { bgcolor: '#e5e7eb' },
            '&.Mui-focused': {
                bgcolor: '#ffffff',
                boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
                '& fieldset': { border: '1px solid #3b82f6' },
            },
        },
        '& .MuiInputBase-input': {
            fontSize: '13px',
            py: 1.25,
        },
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="vi">
            <DatePicker
                label={label}
                value={value ? dayjs(value) : null}
                onChange={(newValue) => onChange?.(newValue ? newValue.format('YYYY-MM-DD') : '')}
                slotProps={{
                    textField: {
                        size: 'small',
                        fullWidth: true,
                        sx: { ...datePickerSx, ...sx },
                    },
                }}
                format="DD/MM/YYYY"
                disableFuture={disableFuture}
                disablePast={disablePast}
            />
        </LocalizationProvider>
    );
}