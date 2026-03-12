/*
 * Popup tạo/sửa Thông số (Item Parameter). editRow set = chế độ sửa.
 * Mã thông số được tự động sinh từ tên.
 */
import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    FormControlLabel,
    Checkbox,
} from '@mui/material';

/** Chuyển chuỗi thành dạng code: bỏ dấu, thay space thành _, viết hoa */
const toCode = (str) => {
    if (!str) return '';
    return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // bỏ dấu tiếng Việt
        .replace(/\s+/g, '_')              // space -> _
        .replace(/[^a-zA-Z0-9_]/g, '')    // chỉ giữ a-z, A-Z, 0-9, _
        .toUpperCase()
        .slice(0, 50);                     // giới hạn 50 ký tự
};

const inputSx = {
    '& .MuiOutlinedInput-root': { borderRadius: 2, '& fieldset': { borderColor: 'divider' } },
    '& .MuiInputLabel-root': { overflow: 'visible' },
};

export default function CreateSpecDialog({ open, onClose, onSubmit, editRow = null }) {
    const isEdit = Boolean(editRow);
    const [paramName, setParamName] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Tự động sinh mã từ tên
    const paramCode = toCode(paramName);

    useEffect(() => {
        if (open) {
            if (editRow) {
                setParamName(editRow.paramName ?? '');
                setIsActive(editRow.isActive ?? true);
            } else {
                setParamName('');
                setIsActive(true);
            }
            setSubmitting(false);
        }
    }, [open, editRow]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const name = (paramName || '').trim();
        if (!name) return;
        setSubmitting(true);
        try {
            await Promise.resolve(onSubmit({
                paramId: editRow?.paramId,
                paramCode: paramCode || toCode(name), // đảm bảo có code
                paramName: name,
                dataType: 'string',
                isActive: isEdit ? isActive : true,
                specCode: paramCode || toCode(name),
                specName: name,
                isEdit,
            }));
            onClose();
        } catch (_) {}
        finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
            <DialogTitle>{isEdit ? 'Chỉnh sửa thông số kỹ thuật' : 'Tạo mới thông số kỹ thuật'}</DialogTitle>
            <form onSubmit={handleSubmit}>
                <DialogContent sx={{ pt: 2, pb: 1, overflow: 'visible' }}>
                    <TextField
                        fullWidth
                        size="small"
                        label="Tên thông số"
                        value={paramName}
                        onChange={(e) => setParamName(e.target.value)}
                        required
                        placeholder="VD: Đường kính ống"
                        sx={{ ...inputSx, mb: 2 }}
                        InputLabelProps={{ shrink: true }}
                    />
                    {isEdit && (
                        <FormControlLabel
                            control={<Checkbox checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />}
                            label="Đang hoạt động"
                        />
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={onClose} sx={{ textTransform: 'none' }} disabled={submitting}>Hủy</Button>
                    <Button type="submit" variant="contained" sx={{ textTransform: 'none' }} disabled={submitting}>
                        {submitting ? 'Đang lưu…' : (isEdit ? 'Lưu' : 'Tạo')}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}
