import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    IconButton,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Grid,
    InputAdornment,
    Typography,
} from '@mui/material';
import { X, User, Mail, Key, Shield } from 'lucide-react';
import { ROLE_OPTIONS } from '../../shared/constants/roles';
import { generateUsername } from '../../shared/utils/stringUtils';

const CreateUserDialog = ({ open, formData, onFormChange, onSubmit, onClose }) => {
    const handleFullNameChange = (e) => {
        const newName = e.target.value;
        const newUsername = generateUsername(newName);
        onFormChange({ ...formData, fullName: newName, username: newUsername });
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 3,
                    overflow: 'hidden',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                },
            }}
        >
            <DialogTitle
                sx={{
                    background: 'linear-gradient(135deg, #1976D2 0%, #1565C0 100%)',
                    color: 'white',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    px: 3,
                    py: 2.5,
                }}
            >
                <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
                    Tạo tài khoản mới
                </Typography>
                <IconButton onClick={onClose} size="small" sx={{ color: 'white' }}>
                    <X size={20} />
                </IconButton>
            </DialogTitle>
            <form onSubmit={onSubmit}>
                <DialogContent sx={{ p: 4 }}>
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => onFormChange({ ...formData, email: e.target.value })}
                                required
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <Mail size={18} className="text-gray-500" />
                                        </InputAdornment>
                                    ),
                                    sx: { borderRadius: 2 },
                                }}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Họ và tên"
                                value={formData.fullName}
                                onChange={handleFullNameChange}
                                required
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <User size={18} className="text-gray-500" />
                                        </InputAdornment>
                                    ),
                                    sx: { borderRadius: 2 },
                                }}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth>
                                <InputLabel>Vai trò</InputLabel>
                                <Select
                                    value={formData.roleId}
                                    label="Vai trò"
                                    onChange={(e) => onFormChange({ ...formData, roleId: e.target.value })}
                                    startAdornment={
                                        <InputAdornment position="start" sx={{ mr: 1, ml: 1 }}>
                                            <Shield size={18} className="text-gray-500" />
                                        </InputAdornment>
                                    }
                                    sx={{ borderRadius: 2 }}
                                >
                                    {Object.entries(ROLE_OPTIONS).map(([id, name]) => (
                                        <MenuItem key={id} value={parseInt(id)}>
                                            {name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Tên đăng nhập (Username)"
                                value={formData.username}
                                InputProps={{
                                    readOnly: true,
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <Key size={18} className="text-gray-500" />
                                        </InputAdornment>
                                    ),
                                    sx: { bgcolor: 'action.hover', borderRadius: 2 },
                                }}
                                helperText="Tự động tạo từ họ tên"
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ p: 3, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                    <Button onClick={onClose} variant="outlined" color="inherit" sx={{ borderRadius: 2 }}>
                        Hủy bỏ
                    </Button>
                    <Button
                        type="submit"
                        variant="contained"
                        sx={{
                            px: 4,
                            borderRadius: 2,
                            background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                            boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)',
                        }}
                    >
                        Tạo tài khoản
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
};

export default CreateUserDialog;
