import React from 'react';
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
} from '@mui/material';
import { Building2, FileText, Phone, Mail, MapPin } from 'lucide-react';

const labelSx = { mb: 0.75, fontWeight: 500, fontSize: '0.8125rem', color: 'text.secondary' };
const inputSx = {
    '& .MuiOutlinedInput-root': {
        borderRadius: 2,
        bgcolor: '#f6f7f9',
        '& fieldset': { borderColor: 'divider' },
        '&.Mui-disabled': { bgcolor: '#f6f7f9' },
        '& input': { fontSize: '0.8125rem', py: 1 },
    },
};

function FieldBlock({ label, children }) {
    return (
        <Box sx={{ width: '100%' }}>
            <Typography variant="body2" sx={labelSx}>{label}</Typography>
            {children}
        </Box>
    );
}

export default function ViewSupplierDetail({ open, onClose, supplier }) {
    if (!supplier) return null;

    return (
        <Dialog
            open={open}
            onClose={onClose}
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
                Chi tiết nhà cung cấp
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
                                sx={inputSx}
                            />
                        </FieldBlock>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <FieldBlock label="Mã nhà cung cấp">
                            <TextField
                                fullWidth
                                size="small"
                                value={supplier.supplierCode ?? ''}
                                InputProps={{
                                    readOnly: true,
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
                                value={supplier.taxCode ?? ''}
                                InputProps={{
                                    readOnly: true,
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
                                value={supplier.supplierName ?? ''}
                                InputProps={{
                                    readOnly: true,
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
                                value={supplier.phone ?? ''}
                                InputProps={{
                                    readOnly: true,
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
                                value={supplier.email ?? ''}
                                InputProps={{
                                    readOnly: true,
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
                                value={supplier.address ?? ''}
                                InputProps={{
                                    readOnly: true,
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
                            <TextField
                                fullWidth
                                size="small"
                                value={supplier.isActive ? 'Hoạt động' : 'Tắt'}
                                InputProps={{ readOnly: true }}
                                sx={inputSx}
                            />
                        </FieldBlock>
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2, pt: 0 }}>
                <Button
                    onClick={onClose}
                    variant="contained"
                    sx={{ textTransform: 'none', borderRadius: 2 }}
                >
                    Đóng
                </Button>
            </DialogActions>
        </Dialog>
    );
}
