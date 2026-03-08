/*
 * Popup tạo/sửa Thông số (Item Parameter). editRow set = chế độ sửa.
 */
import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    MenuItem,
    FormControlLabel,
    Checkbox,
} from '@mui/material';

const inputSx = {
    '& .MuiOutlinedInput-root': { borderRadius: 2, '& fieldset': { borderColor: 'divider' } },
    '& .MuiInputLabel-root': { overflow: 'visible' },
};

const DATA_TYPES = ['string', 'number', 'boolean', 'date', 'datetime'];

export default function CreateSpecDialog({ open, onClose, onSubmit, editRow = null }) {
    const isEdit = Boolean(editRow);
    const [paramCode, setParamCode] = useState('');
    const [paramName, setParamName] = useState('');
    const [dataType, setDataType] = useState('string');
    const [isActive, setIsActive] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (open) {
            if (editRow) {
                setParamCode(editRow.paramCode ?? '');
                setParamName(editRow.paramName ?? '');
                setDataType(editRow.dataType ?? 'string');
                setIsActive(editRow.isActive ?? true);
            } else {
                setParamCode('');
                setParamName('');
                setDataType('string');
                setIsActive(true);
            }
            setSubmitting(false);
        }
    }, [open, editRow]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const code = (paramCode || '').trim();
        const name = (paramName || '').trim();
        if (!name) return;
        if (!isEdit && !code) return;
        setSubmitting(true);
        try {
            await Promise.resolve(onSubmit({
                paramId: editRow?.paramId,
                paramCode: code,
                paramName: name,
                dataType: dataType || 'string',
                isActive: isEdit ? isActive : true,
                specCode: code,
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
                        label="Mã thông số"
                        value={paramCode}
                        onChange={(e) => setParamCode(e.target.value)}
                        required={!isEdit}
                        placeholder="VD: MICROONG_01"
                        sx={{ ...inputSx, mb: 2 }}
                        InputLabelProps={{ shrink: true }}
                        inputProps={isEdit ? { readOnly: true } : {}}
                        helperText={isEdit ? 'Mã không đổi khi chỉnh sửa' : undefined}
                    />
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
                    <TextField
                        select
                        fullWidth
                        size="small"
                        label="Kiểu dữ liệu"
                        value={dataType}
                        onChange={(e) => setDataType(e.target.value)}
                        required
                        sx={{ ...inputSx, mb: 2 }}
                        InputLabelProps={{ shrink: true }}
                    >
                        {DATA_TYPES.map((t) => (
                            <MenuItem key={t} value={t}>{t}</MenuItem>
                        ))}
                    </TextField>
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
