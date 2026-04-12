/**
 * DeliveryFilterPopup – Bộ lọc giao hàng
 * Pattern giống StocktakeFilterPopup.
 */
import React from 'react';
import {
    Box,
    Typography,
    Button,
    IconButton,
    Popover,
} from '@mui/material';
import { X } from 'lucide-react';

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
    const [values, setValues] = React.useState({
        carrierName: '',
        status: '',
        isActive: '',
        ...initialValues,
    });

    React.useEffect(() => {
        setValues({ carrierName: '', status: '', isActive: '', ...initialValues });
    }, [initialValues]);

    const handleChange = (key, value) => {
        setValues(prev => ({ ...prev, [key]: value }));
    };

    const handleApply = () => {
        onApply(values);
        onClose();
    };

    const handleReset = () => {
        setValues({ carrierName: '', status: '', isActive: '' });
    };

    return (
        <Popover
            open={open}
            onClose={onClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            transformOrigin={{ vertical: 'top', horizontal: 'left' }}
            slotProps={{
                paper: {
                    elevation: 0,
                    sx: {
                        mt: 1,
                        width: 320,
                        borderRadius: '14px',
                        border: '1px solid rgba(0,0,0,0.08)',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
                        overflow: 'hidden',
                    },
                },
            }}
        >
            {/* Header */}
            <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle2" fontWeight={600} sx={{ fontSize: '15px', color: '#111827' }}>
                    Bộ lọc giao hàng
                </Typography>
                <IconButton size="small" onClick={onClose} sx={{ color: '#9ca3af', '&:hover': { color: '#6b7280' } }}>
                    <X size={16} />
                </IconButton>
            </Box>

            {/* Body */}
            <Box sx={{ px: 2.5, py: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* Đơn vị vận chuyển */}
                <Box>
                    <Typography sx={{ fontSize: '12px', fontWeight: 500, color: '#6b7280', mb: 0.75 }}>Đơn vị vận chuyển</Typography>
                    <select
                        value={values.carrierName}
                        onChange={(e) => handleChange('carrierName', e.target.value)}
                        style={{
                            width: '100%', padding: '8px 12px', fontSize: '13px', borderRadius: '8px',
                            border: '1px solid #e5e7eb', backgroundColor: '#fff', color: '#374151',
                            outline: 'none', cursor: 'pointer', appearance: 'none',
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 12px center',
                            paddingRight: '32px',
                        }}
                    >
                        {CARRIER_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                </Box>

                {/* Trạng thái vận chuyển */}
                <Box>
                    <Typography sx={{ fontSize: '12px', fontWeight: 500, color: '#6b7280', mb: 0.75 }}>Trạng thái vận chuyển</Typography>
                    <select
                        value={values.status}
                        onChange={(e) => handleChange('status', e.target.value)}
                        style={{
                            width: '100%', padding: '8px 12px', fontSize: '13px', borderRadius: '8px',
                            border: '1px solid #e5e7eb', backgroundColor: '#fff', color: '#374151',
                            outline: 'none', cursor: 'pointer', appearance: 'none',
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 12px center',
                            paddingRight: '32px',
                        }}
                    >
                        {STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                </Box>

                {/* Trạng thái hoạt động */}
                <Box>
                    <Typography sx={{ fontSize: '12px', fontWeight: 500, color: '#6b7280', mb: 0.75 }}>Trạng thái hoạt động</Typography>
                    <select
                        value={values.isActive}
                        onChange={(e) => handleChange('isActive', e.target.value)}
                        style={{
                            width: '100%', padding: '8px 12px', fontSize: '13px', borderRadius: '8px',
                            border: '1px solid #e5e7eb', backgroundColor: '#fff', color: '#374151',
                            outline: 'none', cursor: 'pointer', appearance: 'none',
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 12px center',
                            paddingRight: '32px',
                        }}
                    >
                        {IS_ACTIVE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                </Box>
            </Box>

            {/* Footer */}
            <Box sx={{ px: 2.5, py: 2, borderTop: '1px solid #f3f4f6', display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                <Button size="small" onClick={handleReset} sx={{ fontSize: '13px', textTransform: 'none', borderRadius: '8px', color: '#6b7280', '&:hover': { bgcolor: '#f9fafb' } }}>
                    Đặt lại
                </Button>
                <Button size="small" variant="contained" onClick={handleApply} sx={{ fontSize: '13px', textTransform: 'none', borderRadius: '8px', bgcolor: '#3b82f6', '&:hover': { bgcolor: '#2563eb' } }}>
                    Áp dụng
                </Button>
            </Box>
        </Popover>
    );
};

export default DeliveryFilterPopup;