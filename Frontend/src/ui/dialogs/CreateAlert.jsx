import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box, IconButton, TextField, MenuItem } from '@mui/material';
import { X } from 'lucide-react';

/**
 * Dialog tạo cảnh báo tồn kho mới.
 * Props: open, onClose, onSuccess, warehouses, existingPolicies, loadItemsByWarehouse
 */
export default function CreateAlertDialog({
    open,
    onClose,
    onSuccess,
    warehouses = [],
    existingPolicies = [],
    loadItemsByWarehouse,
}) {
    const [itemId, setItemId] = useState('');
    const [warehouseId, setWarehouseId] = useState('');
    const [minQty, setMinQty] = useState('');
    const [reorderQty, setReorderQty] = useState('');
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [warehouseItems, setWarehouseItems] = useState([]);
    const [loadingItems, setLoadingItems] = useState(false);

    useEffect(() => {
        if (!open) return;
        setItemId('');
        setWarehouseId('');
        setMinQty('');
        setReorderQty('');
        setErrors({});
        setSubmitting(false);
        setWarehouseItems([]);
        setLoadingItems(false);
    }, [open]);

    const activeWarehouses = useMemo(
        () => (Array.isArray(warehouses) ? warehouses : []).filter((x) => x?.isActive !== false),
        [warehouses],
    );
    const availableItems = useMemo(() => {
        const selectedWarehouseId = Number(warehouseId);
        if (!selectedWarehouseId) return [];

        const usedItemIds = new Set(
            (Array.isArray(existingPolicies) ? existingPolicies : [])
                .filter((x) => Number(x?.warehouseId) === selectedWarehouseId)
                .map((x) => Number(x?.itemId))
                .filter((id) => Number.isFinite(id) && id > 0),
        );

        return (Array.isArray(warehouseItems) ? warehouseItems : []).filter(
            (x) => !usedItemIds.has(Number(x?.itemId)),
        );
    }, [warehouseId, existingPolicies, warehouseItems]);

    const handleWarehouseChange = async (event) => {
        const nextWarehouseId = event.target.value;
        setWarehouseId(nextWarehouseId);
        setItemId('');
        setErrors((prev) => ({ ...prev, warehouseId: null, itemId: null }));

        if (!nextWarehouseId) {
            setWarehouseItems([]);
            return;
        }

        setLoadingItems(true);
        try {
            const rows = await Promise.resolve(loadItemsByWarehouse?.(Number(nextWarehouseId)));
            setWarehouseItems(Array.isArray(rows) ? rows : []);
        } catch {
            setWarehouseItems([]);
        } finally {
            setLoadingItems(false);
        }
    };

    const handleSubmit = async () => {
        const nextErrors = {};
        if (!itemId) nextErrors.itemId = 'Vui lòng chọn vật tư.';
        if (!warehouseId) nextErrors.warehouseId = 'Vui lòng chọn kho.';
        if (minQty === '' || Number.isNaN(Number(minQty)) || Number(minQty) < 0) {
            nextErrors.minQty = 'Ngưỡng tối thiểu không hợp lệ.';
        }
        if (reorderQty !== '' && (Number.isNaN(Number(reorderQty)) || Number(reorderQty) < 0)) {
            nextErrors.reorderQty = 'SL nhập đề xuất không hợp lệ.';
        }
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) return;

        setSubmitting(true);
        try {
            await Promise.resolve(onSuccess?.({
                itemId: Number(itemId),
                warehouseId: Number(warehouseId),
                minQty: Number(minQty),
                reorderQty: reorderQty === '' ? null : Number(reorderQty),
            }));
            onClose?.();
        } catch (err) {
            setErrors({
                submit: err?.message || err?.Message || 'Không thể tạo thiết lập cảnh báo.',
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: '14px' } }}>
            <DialogTitle sx={{ px: 3, py: 2.5, borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography sx={{ fontWeight: 600, fontSize: '18px' }}>Thêm cảnh báo</Typography>
                <IconButton size="small" onClick={onClose}><X size={20} /></IconButton>
            </DialogTitle>
            <DialogContent sx={{ px: 3, pt: 2, pb: 2.5 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
                    <TextField
                        select
                        fullWidth
                        size="small"
                        label="Kho"
                        value={warehouseId}
                        onChange={handleWarehouseChange}
                        error={Boolean(errors.warehouseId)}
                        helperText={errors.warehouseId}
                    >
                        {activeWarehouses.map((wh) => (
                            <MenuItem key={wh.warehouseId} value={wh.warehouseId}>
                                {wh.warehouseName}
                            </MenuItem>
                        ))}
                    </TextField>
                    <TextField
                        select
                        fullWidth
                        size="small"
                        label="Vật tư (theo kho đã chọn)"
                        value={itemId}
                        onChange={(e) => setItemId(e.target.value)}
                        disabled={!warehouseId || loadingItems}
                        error={Boolean(errors.itemId)}
                        helperText={
                            errors.itemId
                            || (!warehouseId
                                ? 'Vui lòng chọn kho trước.'
                                : loadingItems
                                    ? 'Đang tải vật tư theo kho...'
                                    : availableItems.length === 0
                                        ? 'Kho này không còn vật tư nào để thêm (đã thiết lập hết).'
                                        : '')
                        }
                    >
                        {availableItems.map((it) => (
                            <MenuItem key={it.itemId} value={it.itemId}>
                                {it.itemCode} - {it.itemName}
                            </MenuItem>
                        ))}
                    </TextField>
                    <TextField
                        fullWidth
                        size="small"
                        label="Ngưỡng tồn tối thiểu"
                        value={minQty}
                        onChange={(e) => setMinQty(e.target.value)}
                        error={Boolean(errors.minQty)}
                        helperText={errors.minQty}
                    />
                    <TextField
                        fullWidth
                        size="small"
                        label="SL nhập đề xuất"
                        value={reorderQty}
                        onChange={(e) => setReorderQty(e.target.value)}
                        error={Boolean(errors.reorderQty)}
                        helperText={errors.reorderQty}
                    />
                    {errors.submit && (
                        <Typography sx={{ fontSize: '12px', color: '#ef4444' }}>{errors.submit}</Typography>
                    )}
                </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2.5, borderTop: '1px solid rgba(0,0,0,0.06)', gap: 1.5 }}>
                <Button onClick={onClose} size="small" sx={{ textTransform: 'none' }}>Hủy</Button>
                <Button variant="contained" onClick={handleSubmit} disabled={submitting} size="small" sx={{ textTransform: 'none' }}>
                    {submitting ? 'Đang tạo...' : 'Tạo'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
