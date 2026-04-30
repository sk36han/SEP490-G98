import { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material';
import { createCompany } from '../../shared/lib/companyService';

/**
 * Dialog tạo công ty mới.
 * Dùng chung cho CreateReceiver, CreateReleaseRequest, ViewReceiverDetail.
 */
export function CreateCompanyDialog({ open, onClose, onSuccess }) {
    const [form, setForm] = useState({ companyCode: '', companyName: '' });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async () => {
        const companyCode = form.companyCode.trim();
        const companyName = form.companyName.trim();
        if (!companyCode || !companyName) {
            setError('Vui lòng nhập đầy đủ mã công ty và tên công ty.');
            return;
        }

        setSubmitting(true);
        setError('');
        try {
            const result = await createCompany({ companyCode, companyName });
            setForm({ companyCode: '', companyName: '' });
            onSuccess?.(result);
            onClose();
        } catch (err) {
            setError(err?.message || 'Tạo công ty thất bại.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleClose = () => {
        if (submitting) return;
        setForm({ companyCode: '', companyName: '' });
        setError('');
        onClose();
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ fontWeight: 700, fontSize: '16px', pb: 1 }}>
                Tạo công ty mới
            </DialogTitle>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: '12px !important' }}>
                <TextField
                    label="Mã công ty"
                    value={form.companyCode}
                    onChange={(e) => setForm((prev) => ({ ...prev, companyCode: e.target.value }))}
                    fullWidth
                    autoFocus
                    error={Boolean(error)}
                    InputLabelProps={{ shrink: true }}
                    sx={{ '& .MuiInputLabel-root': { bgcolor: '#fff', px: 0.5 } }}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                />
                <TextField
                    label="Tên công ty"
                    value={form.companyName}
                    onChange={(e) => setForm((prev) => ({ ...prev, companyName: e.target.value }))}
                    fullWidth
                    error={Boolean(error)}
                    helperText={error}
                    InputLabelProps={{ shrink: true }}
                    sx={{ '& .MuiInputLabel-root': { bgcolor: '#fff', px: 0.5 } }}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                />
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2, pt: 1 }}>
                <button type="button" onClick={handleClose} className="btn btn-cancel" disabled={submitting}>Hủy</button>
                <button type="button" onClick={handleSubmit} className="btn btn-primary" disabled={submitting}>
                    {submitting ? 'Đang tạo...' : 'Tạo'}
                </button>
            </DialogActions>
        </Dialog>
    );
}
