import { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material';
import { createCompany } from '../../shared/lib/companyService';

/**
 * Dialog tạo công ty mới.
 * Dùng chung cho CreateReceiver, CreateReleaseRequest, ViewReceiverDetail.
 */
export function CreateCompanyDialog({ open, onClose, onSuccess }) {
    const [form, setForm] = useState({ companyName: '' });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async () => {
        if (!form.companyName.trim()) {
            setError('Vui lòng nhập tên công ty.');
            return;
        }

        setSubmitting(true);
        setError('');
        try {
            const result = await createCompany({ companyName: form.companyName.trim() });
            setForm({ companyName: '' });
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
        setForm({ companyName: '' });
        setError('');
        onClose();
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
            <DialogTitle sx={{ fontWeight: 600, fontSize: '16px' }}>
                Tạo công ty mới
            </DialogTitle>
            <DialogContent>
                <TextField
                    label="Tên công ty"
                    value={form.companyName}
                    onChange={(e) => setForm({ companyName: e.target.value })}
                    fullWidth
                    margin="normal"
                    error={Boolean(error)}
                    helperText={error}
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                />
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <button type="button" onClick={handleClose} className="btn btn-cancel" disabled={submitting}>Hủy</button>
                <button type="button" onClick={handleSubmit} className="btn btn-primary" disabled={submitting}>
                    {submitting ? 'Đang tạo...' : 'Tạo'}
                </button>
            </DialogActions>
        </Dialog>
    );
}
