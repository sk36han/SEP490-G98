import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Grid,
    InputAdornment,
    Typography,
    Box,
    Select,
    MenuItem,
    FormControl,
} from '@mui/material';
import { Building2, FileText, Phone, Mail, MapPin } from 'lucide-react';

const labelSx = { mb: 0.75, fontWeight: 500, fontSize: '0.8125rem', color: 'text.secondary' };
const inputSx = {
    '& .MuiOutlinedInput-root': {
        borderRadius: 2,
        '& fieldset': { borderColor: 'divider' },
        '& input': { fontSize: '0.8125rem', py: 1 },
    },
};
const inputReadOnlySx = {
    ...inputSx,
    '& .MuiOutlinedInput-root': { bgcolor: '#f6f7f9', '&.Mui-disabled': { bgcolor: '#f6f7f9' } },
};

function FieldBlock({ label, children }) {
    return (
        <Box sx={{ width: '100%' }}>
            <Typography variant="body2" sx={labelSx}>{label}</Typography>
            {children}
        </Box>
    );
}

export default function EditSupplierPopup({ open, onClose, supplier }) {
    const [form, setForm] = useState({
        supplierCode: '',
        supplierName: '',
        taxCode: '',
        phone: '',
        email: '',
        address: '',
        isActive: true,
    });

    useEffect(() => {
        if (supplier) {
            setForm({
                supplierCode: supplier.supplierCode ?? '',
                supplierName: supplier.supplierName ?? '',
                taxCode: supplier.taxCode ?? '',
                phone: supplier.phone ?? '',
                email: supplier.email ?? '',
                address: supplier.address ?? '',
                isActive: supplier.isActive ?? true,
            });
        }
    }, [supplier, open]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleClose = () => {
        onClose();
    };

    const handleSave = () => {
        onClose();
    };

    if (!supplier) return null;

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 3,
                    boxShadow: 4,
                    minHeight: 420,
                    maxHeight: '90vh',
                },
            }}
        >
            <DialogTitle
                sx={{
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    pb: 2,
                    pt: 2.5,
                    fontWeight: 600,
                    fontSize: '1.125rem',
                }}
            >
                Chỉnh sửa nhà cung cấp
            </DialogTitle>
            <DialogContent sx={{ pt: 3, pb: 3, overflowY: 'auto' }}>
                <Grid container spacing={3}>
                    <Grid item xs={12} sm={6}>
                        <FieldBlock label="ID nhà cung cấp">
                            <TextField
                                fullWidth
                                size="small"
                                value={supplier.supplierId ?? ''}
                                InputProps={{ readOnly: true }}
                                sx={inputReadOnlySx}
                            />
                        </FieldBlock>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <FieldBlock label="Mã nhà cung cấp">
                            <TextField
                                fullWidth
                                size="small"
                                name="supplierCode"
                                value={form.supplierCode}
                                onChange={handleChange}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <Building2 size={18} color="#757575" />
                                        </InputAdornment>
                                    ),
                                }}
                                sx={inputSx}
                            />
                        </FieldBlock>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <FieldBlock label="Mã số thuế">
                            <TextField
                                fullWidth
                                size="small"
                                name="taxCode"
                                value={form.taxCode}
                                onChange={handleChange}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <FileText size={18} color="#757575" />
                                        </InputAdornment>
                                    ),
                                }}
                                sx={inputSx}
                            />
                        </FieldBlock>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <FieldBlock label="Tên nhà cung cấp">
                            <TextField
                                fullWidth
                                size="small"
                                name="supplierName"
                                value={form.supplierName}
                                onChange={handleChange}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <Building2 size={18} color="#757575" />
                                        </InputAdornment>
                                    ),
                                }}
                                sx={inputSx}
                            />
                        </FieldBlock>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <FieldBlock label="Số điện thoại">
                            <TextField
                                fullWidth
                                size="small"
                                name="phone"
                                value={form.phone}
                                onChange={handleChange}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <Phone size={18} color="#757575" />
                                        </InputAdornment>
                                    ),
                                }}
                                sx={inputSx}
                            />
                        </FieldBlock>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <FieldBlock label="Email">
                            <TextField
                                fullWidth
                                size="small"
                                name="email"
                                value={form.email}
                                onChange={handleChange}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <Mail size={18} color="#757575" />
                                        </InputAdornment>
                                    ),
                                }}
                                sx={inputSx}
                            />
                        </FieldBlock>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <FieldBlock label="Địa chỉ">
                            <TextField
                                fullWidth
                                size="small"
                                name="address"
                                value={form.address}
                                onChange={handleChange}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <MapPin size={18} color="#757575" />
                                        </InputAdornment>
                                    ),
                                }}
                                sx={inputSx}
                            />
                        </FieldBlock>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <FieldBlock label="Trạng thái">
                            <FormControl fullWidth size="small" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}>
                                <Select
                                    name="isActive"
                                    value={form.isActive === true || form.isActive === 'true' ? 'true' : 'false'}
                                    onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.value === 'true' }))}
                                    sx={{ fontSize: '0.8125rem', py: 0.5 }}
                                >
                                    <MenuItem value="true">Hoạt động</MenuItem>
                                    <MenuItem value="false">Tắt</MenuItem>
                                </Select>
                            </FormControl>
                        </FieldBlock>
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2, pt: 0, gap: 1 }}>
                <Button onClick={handleClose} variant="outlined" sx={{ textTransform: 'none', borderRadius: 2 }}>
                    Hủy
                </Button>
                <Button onClick={handleSave} variant="contained" sx={{ textTransform: 'none', borderRadius: 2 }}>
                    Lưu
                </Button>
            </DialogActions>
        </Dialog>
    );
}
