import { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material';
import { createReceiver } from '../../shared/lib/receiverService';

/**
 * Dialog tạo người nhận mới cho công ty.
 */
export function CreateReceiverDialog({ open, onClose, onSuccess, companyId, companyName }) {
    const [form, setForm] = useState({
        receiverName: '',
        phone: '',
        email: '',
        position: '',
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const setField = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));

    const handleSubmit = async () => {
        if (!form.receiverName.trim()) {
            setError('Vui lòng nhập tên người nhận.');
            return;
        }
        if (!form.phone.trim()) {
            setError('Vui lòng nhập số điện thoại.');
            return;
        }

        setSubmitting(true);
        setError('');
        try {
            const result = await createReceiver({
                receiverName: form.receiverName.trim(),
                phone: form.phone.trim(),
                email: form.email.trim() || null,
                position: form.position.trim() || null,
                companyId: companyId ? Number(companyId) : null,
            });
            setForm({ receiverName: '', phone: '', email: '', position: '' });
            onSuccess?.(result);
            onClose();
        } catch (err) {
            setError(err?.message || 'Tạo người nhận thất bại.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleClose = () => {
        if (submitting) return;
        setForm({ receiverName: '', phone: '', email: '', position: '' });
        setError('');
        onClose();
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ fontWeight: 600, fontSize: '16px' }}>
                Tạo người nhận mới
                {companyName && (
                    <span style={{ display: 'block', fontSize: '13px', fontWeight: 400, color: '#6b7280', marginTop: 4 }}>
                        Công ty: {companyName}
                    </span>
                )}
            </DialogTitle>
            <DialogContent>
                <TextField label="Tên người nhận *" value={form.receiverName} onChange={(e) => setField('receiverName', e.target.value)} fullWidth margin="normal" autoFocus />
                <TextField label="Số điện thoại *" value={form.phone} onChange={(e) => setField('phone', e.target.value)} fullWidth margin="normal" />
                <TextField label="Email" value={form.email} onChange={(e) => setField('email', e.target.value)} fullWidth margin="normal" />
                <TextField label="Chức vụ" value={form.position} onChange={(e) => setField('position', e.target.value)} fullWidth margin="normal" />
                {error && <div style={{ color: '#ef4444', fontSize: '13px', marginTop: 8 }}>{error}</div>}
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