import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';

export function ConfirmActionDialog({
    confirmAction,
    onClose,
    onConfirm,
    submitting,
    savingDraft,
    isEditMode,
}) {
    return (
        <Dialog open={Boolean(confirmAction)} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle sx={{ fontWeight: 700, fontSize: '16px', pb: 1 }}>
                {confirmAction === 'quotation' ? 'Xác nhận tạo báo giá' : 'Xác nhận gửi duyệt'}
            </DialogTitle>
            <DialogContent sx={{ fontSize: 14, color: '#334155', lineHeight: 1.6 }}>
                {confirmAction === 'quotation'
                    ? 'Bạn có chắc muốn tạo báo giá cho yêu cầu xuất hàng này không?'
                    : 'Bạn có chắc muốn tạo và gửi duyệt yêu cầu xuất hàng này không?'}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <button type="button" onClick={onClose} className="btn btn-cancel" disabled={submitting || savingDraft}>
                    Hủy
                </button>
                <button type="button" onClick={onConfirm} className="btn btn-primary" disabled={submitting || savingDraft}>
                    {confirmAction === 'quotation'
                        ? (savingDraft ? 'Đang tạo...' : (isEditMode ? 'Lưu báo giá' : 'Tạo báo giá'))
                        : (submitting ? 'Đang gửi...' : 'Tạo & Gửi duyệt')}
                </button>
            </DialogActions>
        </Dialog>
    );
}
