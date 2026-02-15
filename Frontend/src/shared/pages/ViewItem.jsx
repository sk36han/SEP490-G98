import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, Card, CardContent, Typography, Button, Grid, IconButton, Tooltip, Popover, FormGroup, FormControlLabel, Checkbox } from '@mui/material';
import { ArrowLeft, Columns } from 'lucide-react';
import '../styles/ListView.css';

const MOCK_ITEMS = [
    { itemId: 1, itemCode: 'SP001', itemName: 'iPhone 15 Pro Max 256GB', itemType: 'Product', description: 'Điện thoại iPhone 15 Pro Max bản 256GB', categoryId: 1, brandId: 1, baseUomId: 1, packagingSpecId: 1, requiresCO: true, requiresCQ: true, isActive: true, defaultWarehouseId: 1, inventoryAccount: '1561', revenueAccount: '5111', categoryName: 'Điện thoại', brandName: 'Apple', baseUomName: 'Cái' },
    { itemId: 2, itemCode: 'SP002', itemName: 'Samsung Galaxy S24 Ultra', itemType: 'Product', description: 'Điện thoại Samsung Galaxy S24 Ultra', categoryId: 1, brandId: 2, baseUomId: 1, packagingSpecId: 1, requiresCO: true, requiresCQ: true, isActive: true, defaultWarehouseId: 1, inventoryAccount: '1561', revenueAccount: '5111', categoryName: 'Điện thoại', brandName: 'Samsung', baseUomName: 'Cái' },
];

const VIEW_ITEM_FIELDS = [
    { id: 'itemCode', label: 'Item Code', getValue: (item) => item.itemCode },
    { id: 'itemName', label: 'Item Name', getValue: (item) => item.itemName },
    { id: 'itemType', label: 'Item Type', getValue: (item) => item.itemType },
    { id: 'description', label: 'Description', getValue: (item) => item.description },
    { id: 'category', label: 'Category', getValue: (item) => item.categoryName || item.categoryId },
    { id: 'brand', label: 'Brand', getValue: (item) => item.brandName || item.brandId },
    { id: 'baseUom', label: 'Base UOM', getValue: (item) => item.baseUomName || item.baseUomId },
    { id: 'requiresCO', label: 'Requires CO', getValue: (item) => (item.requiresCO ? 'Có' : 'Không') },
    { id: 'requiresCQ', label: 'Requires CQ', getValue: (item) => (item.requiresCQ ? 'Có' : 'Không') },
    { id: 'isActive', label: 'Is Active', getValue: (item) => (item.isActive ? 'Active' : 'Inactive') },
    { id: 'defaultWarehouseId', label: 'Default Warehouse ID', getValue: (item) => item.defaultWarehouseId },
    { id: 'inventoryAccount', label: 'Inventory Account', getValue: (item) => item.inventoryAccount },
    { id: 'revenueAccount', label: 'Revenue Account', getValue: (item) => item.revenueAccount },
];
const DEFAULT_VISIBLE_FIELD_IDS = VIEW_ITEM_FIELDS.map((f) => f.id);

const ViewItem = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [item, setItem] = useState(null);
    const [visibleFieldIds, setVisibleFieldIds] = useState(() => new Set(DEFAULT_VISIBLE_FIELD_IDS));
    const [columnSelectorAnchor, setColumnSelectorAnchor] = useState(null);

    useEffect(() => {
        const found = MOCK_ITEMS.find((i) => String(i.itemId) === String(id));
        setItem(found || null);
    }, [id]);

    const handleFieldVisibilityChange = (fieldId, checked) => {
        setVisibleFieldIds((prev) => {
            const next = new Set(prev);
            if (checked) next.add(fieldId);
            else next.delete(fieldId);
            return next;
        });
    };
    const handleSelectAllFields = (checked) => {
        setVisibleFieldIds(checked ? new Set(DEFAULT_VISIBLE_FIELD_IDS) : new Set());
    };
    const visibleFields = VIEW_ITEM_FIELDS.filter((f) => visibleFieldIds.has(f.id));
    const columnSelectorOpen = Boolean(columnSelectorAnchor);

    if (item == null) {
        return (
            <Box className="view-detail-view" sx={{ width: '100%', maxWidth: '100%', background: 'linear-gradient(180deg, #ffffff 0%, rgba(255,255,255,0.97) 100%)', borderRadius: 3, p: 0.75, border: '1px solid', borderColor: 'divider', boxShadow: (t) => t.shadows[1], boxSizing: 'border-box' }}>
                <Typography color="text.secondary" sx={{ mb: 2 }}>Không tìm thấy item.</Typography>
                <Button className="list-page-btn" variant="outlined" startIcon={<ArrowLeft size={20} />} onClick={() => navigate('/products')} sx={{ fontSize: 13, fontWeight: 600, textTransform: 'none', borderRadius: 2, minHeight: 36, px: 2 }}>Quay lại</Button>
            </Box>
        );
    }

    return (
        <>
            <Box sx={{ mb: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
                <Typography variant="h4" component="h1" gutterBottom fontWeight="800" sx={{ background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)', backgroundClip: 'text', textFillColor: 'transparent', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textShadow: '0 2px 4px rgba(0,0,0,0.2), 0 1px 3px rgba(0,0,0,0.15)', whiteSpace: 'nowrap' }}>
                    Chi tiết vật tư (View Item)
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 560, wordBreak: 'break-word', overflowWrap: 'break-word' }}>Mã: {item.itemCode} · {item.itemName}</Typography>
            </Box>
            <Box
                className="view-detail-view"
                sx={{
                    width: '100%',
                    maxWidth: '100%',
                    background: 'linear-gradient(180deg, #ffffff 0%, rgba(255,255,255,0.97) 100%)',
                    borderRadius: 3,
                    p: 0.75,
                    border: '1px solid',
                    borderColor: 'divider',
                    boxShadow: (t) => t.shadows[1],
                    boxSizing: 'border-box',
                }}
            >
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 0.5 }}>
                    <Button className="list-page-btn" variant="outlined" startIcon={<ArrowLeft size={20} />} onClick={() => navigate('/products')} sx={{ fontSize: 13, fontWeight: 600, textTransform: 'none', borderRadius: 2, minHeight: 36, px: 2 }}>Quay lại</Button>
                </Box>

            <Card className="list-filter-card" sx={{ borderRadius: 3, border: '1px solid rgba(0,0,0,0.12)', boxShadow: (t) => t.shadows[1], p: 1, mb: 1 }}>
                <CardContent sx={{ '&.MuiCardContent-root:last-child': { pb: 0 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 0.5 }}>
                        <Tooltip title="Chọn trường hiển thị">
                            <IconButton color="primary" onClick={(e) => setColumnSelectorAnchor(e.currentTarget)} aria-label="Chọn trường" sx={{ border: 1, borderColor: 'divider' }}>
                                <Columns size={20} />
                            </IconButton>
                        </Tooltip>
                    </Box>
                    <Popover open={columnSelectorOpen} anchorEl={columnSelectorAnchor} onClose={() => setColumnSelectorAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }} slotProps={{ paper: { sx: { mt: 1.5, p: 2, minWidth: 220 } } }}>
                        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5, whiteSpace: 'nowrap' }}>Chọn trường hiển thị</Typography>
                        <FormGroup>
                            <FormControlLabel control={<Checkbox checked={visibleFieldIds.size === VIEW_ITEM_FIELDS.length} indeterminate={visibleFieldIds.size > 0 && visibleFieldIds.size < VIEW_ITEM_FIELDS.length} onChange={(e) => handleSelectAllFields(e.target.checked)} />} label="Tất cả" />
                            {VIEW_ITEM_FIELDS.map((f) => (
                                <FormControlLabel key={f.id} control={<Checkbox checked={visibleFieldIds.has(f.id)} onChange={(e) => handleFieldVisibilityChange(f.id, e.target.checked)} />} label={f.label} />
                            ))}
                        </FormGroup>
                    </Popover>
                    <Grid container spacing={2}>
                        {visibleFields.map((f) => (
                            <Grid item xs={12} sm={6} key={f.id}>
                                <Typography variant="caption" color="text.secondary" component="span" sx={{ display: 'block', whiteSpace: 'nowrap' }}>{f.label}</Typography>
                                <Typography variant="body1" component="span" sx={{ display: 'block', wordBreak: 'break-word' }}>{f.getValue(item) ?? '-'}</Typography>
                            </Grid>
                        ))}
                    </Grid>
                    <Box sx={{ mt: 0 }}>
                        <Button className="list-page-btn" variant="outlined" onClick={() => navigate(`/items/edit/${item.itemId}`)} sx={{ fontSize: 13, fontWeight: 600, textTransform: 'none', borderRadius: 2, minHeight: 36, px: 2 }}>Chỉnh sửa</Button>
                    </Box>
                </CardContent>
            </Card>
            </Box>
        </>
    );
};

export default ViewItem;
