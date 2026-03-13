import React, { useState, useEffect, useRef } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    Typography,
    Box,
    CircularProgress,
} from '@mui/material';
import { Lock, Check } from 'lucide-react';
import authService from '../../shared/lib/authService';

const OtpDialog = ({ open, onClose, onSuccess }) => {
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const inputRef = useRef(null);

    const email = localStorage.getItem('pendingEmail') || '';

    useEffect(() => {
        if (open) {
            setOtp('');
            setError('');
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [open]);

    const handleOtpChange = (e) => {
        const value = e.target.value.replace(/\D/g, '').slice(0, 6);
        setOtp(value);
        setError('');
    };

    const handleVerify = async () => {
        if (otp.length !== 6) {
            setError('Vui long nhap du 6 chu so');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await authService.verifyOtp(otp);
            onSuccess();
        } catch (err) {
            setError(err.message || 'Ma OTP khong dung');
            setOtp('');
        } finally {
            setLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && otp.length === 6) {
            handleVerify();
        }
    };

    return (
        <Dialog 
            open={open} 
            onClose={onClose}
            maxWidth="xs"
            fullWidth
            PaperProps={{
                sx: { borderRadius: 3, p: 1 }
            }}
        >
            <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
                <Box 
                    sx={{ 
                        display: 'inline-flex', 
                        p: 1.5, 
                        borderRadius: '50%', 
                        bgcolor: 'primary.lighter',
                        mb: 1
                    }}
                >
                    <Lock size={32} color="#1976d2" />
                </Box>
                <Typography variant="h5" fontWeight="600" component="span" display="block">
                    Xac thuc OTP
                </Typography>
            </DialogTitle>
            
            <DialogContent sx={{ textAlign: 'center', pt: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Ma OTP da duoc gui den email cua ban
                </Typography>
                
                <Typography variant="body1" fontWeight="500" sx={{ mb: 2 }}>
                    {email}
                </Typography>

                <TextField
                    inputRef={inputRef}
                    fullWidth
                    value={otp}
                    onChange={handleOtpChange}
                    onKeyPress={handleKeyPress}
                    placeholder="Nhap ma OTP"
                    inputProps={{
                        maxLength: 6,
                        style: { textAlign: 'center', letterSpacing: '0.5em', fontSize: '1.5rem' }
                    }}
                    error={!!error}
                    disabled={loading}
                    sx={{
                        mb: 2,
                        '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                        }
                    }}
                />

                {error && (
                    <Typography variant="body2" color="error" sx={{ mb: 2 }}>
                        {error}
                    </Typography>
                )}

                <Typography variant="body2" color="text.secondary">
                    Ma OTP co hieu luc trong 5 phut
                </Typography>
            </DialogContent>

            <DialogActions sx={{ justifyContent: 'center', pb: 3, px: 3 }}>
                <Button 
                    variant="outlined" 
                    onClick={onClose}
                    disabled={loading}
                    sx={{ minWidth: 100 }}
                >
                    Huy
                </Button>
                <Button 
                    variant="contained" 
                    onClick={handleVerify}
                    disabled={otp.length !== 6 || loading}
                    sx={{ minWidth: 120, position: 'relative' }}
                >
                    {loading ? (
                        <CircularProgress size={24} color="inherit" />
                    ) : (
                        <>
                            Xác nhận
                            <Check size={16} style={{ marginLeft: 4 }} />
                        </>
                    )}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default OtpDialog;
