import { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material';
import { createAddress } from '../../shared/lib/addressService';

/**
 * Dialog tạo địa chỉ mới cho công ty.
 * Dùng chung cho CreateReceiver, CreateReleaseRequest, ViewReceiverDetail.
 */
export function CreateAddressDialog({ open, onClose, onSuccess, companyId }) {
    const [form, setForm] = useState({
        addressName: '',
        addressDetail: '',
        city: '',
        district: '',
        ward: '',
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const setField = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));

    const handleSubmit = async () => {
        if (!form.addressDetail.trim()) {
            setError('Vui lòng nhập địa chỉ cụ thể.');
            return;
        }

        setSubmitting(true);
        setError('');
        try {
            const result = await createAddress({
                companyId: companyId ? Number(companyId) : null,
                addressName: form.addressName.trim() || null,
                addressDetail: form.addressDetail.trim(),
                city: form.city.trim() || null,
                district: form.district.trim() || null,
                ward: form.ward.trim() || null,
                isDefault: false,
            });
            setForm({ addressName: '', addressDetail: '', city: '', district: '', ward: '' });
            onSuccess?.(result);
            onClose();
        } catch (err) {
            setError(err?.message || 'Tạo địa chỉ thất bại.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleClose = () => {
        if (submitting) return;
        setForm({ addressName: '', addressDetail: '', city: '', district: '', ward: '' });
        setError('');
        onClose();
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ fontWeight: 600, fontSize: '16px' }}>
                Tạo địa chỉ mới
            </DialogTitle>
            <DialogContent>
                <TextField label="Tên địa chỉ" value={form.addressName} onChange={(e) => setField('addressName', e.target.value)} fullWidth margin="normal" placeholder="VD: Văn phòng, Kho hàng..." />
                <TextField label="Địa chỉ cụ thể *" value={form.addressDetail} onChange={(e) => setField('addressDetail', e.target.value)} fullWidth margin="normal" autoFocus />
                <TextField label="Thành phố / Tỉnh" value={form.city} onChange={(e) => setField('city', e.target.value)} fullWidth margin="normal" />
                <TextField label="Quận / Huyện" value={form.district} onChange={(e) => setField('district', e.target.value)} fullWidth margin="normal" />
                <TextField label="Phường / Xã" value={form.ward} onChange={(e) => setField('ward', e.target.value)} fullWidth margin="normal" />
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
