import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Grid,
    IconButton,
    Tooltip,
    Popover,
    FormGroup,
    FormControlLabel,
    Checkbox,
} from '@mui/material';
import { ArrowLeft, Edit, Columns } from 'lucide-react';
import '../styles/ListView.css';

const MOCK_PO = {
    purchaseOrderId: 1,
    pocode: 'PO-2025-001',
    requestedBy: 1,
    supplierId: 1,
    supplierName: 'Công ty TNHH ABC',
    requestedDate: '2025-02-10',
    justification: 'Nhập kho theo kế hoạch Q1',
    status: 'Draft',
    currentStageNo: 0,
    createdAt: '2025-02-10T08:00:00',
    submittedAt: null,
    updatedAt: '2025-02-10T08:00:00',
};

const MOCK_LINES = [
    { purchaseOrderLineId: 1, itemId: 1, itemCode: 'SP001', itemName: 'iPhone 15 Pro Max 256GB', orderedQty: 10, uomId: 1, uomName: 'Cái', note: '' },
    { purchaseOrderLineId: 2, itemId: 2, itemCode: 'SP002', itemName: 'Samsung Galaxy S24 Ultra', orderedQty: 5, uomId: 1, uomName: 'Cái', note: 'Giao trước 20/02' },
];

const PO_LINE_COLUMNS = [
    { id: 'itemCode', label: 'Item Code', getValue: (row) => row.itemCode ?? '' },
    { id: 'itemName', label: 'Tên vật tư', getValue: (row) => row.itemName ?? '' },
    { id: 'orderedQty', label: 'Số lượng', getValue: (row) => row.orderedQty ?? '' },
    { id: 'uomName', label: 'Đơn vị', getValue: (row) => row.uomName ?? '' },
    { id: 'note', label: 'Ghi chú', getValue: (row) => row.note ?? '-' },
];
const DEFAULT_VISIBLE_LINE_COLUMN_IDS = PO_LINE_COLUMNS.map((c) => c.id);

const ViewPurchaseOrder = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [po, setPo] = useState(null);
    const [lines, setLines] = useState([]);
    const [visibleColumnIds, setVisibleColumnIds] = useState(() => new Set(DEFAULT_VISIBLE_LINE_COLUMN_IDS));
    const [columnSelectorAnchor, setColumnSelectorAnchor] = useState(null);

    const handleColumnVisibilityChange = (columnId, checked) => {
        setVisibleColumnIds((prev) => {
            const next = new Set(prev);
            if (checked) next.add(columnId);
            else next.delete(columnId);
            return next;
        });
    };
    const handleSelectAllLineColumns = (checked) => {
        setVisibleColumnIds(checked ? new Set(DEFAULT_VISIBLE_LINE_COLUMN_IDS) : new Set());
    };
    const visibleColumns = PO_LINE_COLUMNS.filter((col) => visibleColumnIds.has(col.id));
    const columnSelectorOpen = Boolean(columnSelectorAnchor);

    useEffect(() => {
        setPo({ ...MOCK_PO, purchaseOrderId: Number(id), pocode: `PO-2025-${String(id).padStart(3, '0')}` });
        setLines(MOCK_LINES.map((l, i) => ({ ...l, purchaseOrderLineId: i + 1 })));
    }, [id]);

    if (!po) return null;

    return (
        <>
            <Box sx={{ mt: -80, mb: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
                <Typography variant="h4" component="h1" gutterBottom fontWeight="800" sx={{ background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)', backgroundClip: 'text', textFillColor: 'transparent', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textShadow: '0 2px 4px rgba(0,0,0,0.2), 0 1px 3px rgba(0,0,0,0.15)', whiteSpace: 'nowrap' }}>
                    Xem đơn mua hàng (View Purchase Order)
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 560, wordBreak: 'break-word', overflowWrap: 'break-word' }}>PO Code: {po.pocode} · Trạng thái: {po.status}</Typography>
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
                    <Button className="list-page-btn" variant="outlined" startIcon={<ArrowLeft size={20} />} onClick={() => navigate('/purchase-orders')} sx={{ fontSize: 13, fontWeight: 600, textTransform: 'none', borderRadius: 2, minHeight: 36, px: 2 }}>Quay lại</Button>
                </Box>

            <Card className="list-filter-card" sx={{ borderRadius: 3, border: '1px solid rgba(0,0,0,0.12)', boxShadow: (t) => t.shadows[1], p: 1, mb: 0.5 }}>
                <CardContent sx={{ '&.MuiCardContent-root:last-child': { pb: 0 } }}>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}><Typography variant="caption" color="text.secondary" component="span" sx={{ display: 'block', whiteSpace: 'nowrap' }}>PO Code</Typography><Typography component="span" sx={{ display: 'block', wordBreak: 'break-word' }}>{po.pocode}</Typography></Grid>
                        <Grid item xs={12} sm={6}><Typography variant="caption" color="text.secondary" component="span" sx={{ display: 'block', whiteSpace: 'nowrap' }}>Nhà cung cấp</Typography><Typography component="span" sx={{ display: 'block', wordBreak: 'break-word' }}>{po.supplierName}</Typography></Grid>
                        <Grid item xs={12} sm={6}><Typography variant="caption" color="text.secondary" component="span" sx={{ display: 'block', whiteSpace: 'nowrap' }}>Ngày yêu cầu</Typography><Typography component="span" sx={{ display: 'block', wordBreak: 'break-word' }}>{po.requestedDate}</Typography></Grid>
                        <Grid item xs={12} sm={6}><Typography variant="caption" color="text.secondary" component="span" sx={{ display: 'block', whiteSpace: 'nowrap' }}>Trạng thái</Typography><Typography component="span" sx={{ display: 'block', wordBreak: 'break-word' }}>{po.status}</Typography></Grid>
                        <Grid item xs={12}><Typography variant="caption" color="text.secondary" component="span" sx={{ display: 'block', whiteSpace: 'nowrap' }}>Lý do / Ghi chú</Typography><Typography component="span" sx={{ display: 'block', wordBreak: 'break-word' }}>{po.justification || '-'}</Typography></Grid>
                    </Grid>
                    <Box sx={{ mt: 2 }}>
                        <Button className="list-page-btn" variant="outlined" startIcon={<Edit size={18} />} onClick={() => navigate(`/purchase-orders/edit/${po.purchaseOrderId}`)} sx={{ fontSize: 13, fontWeight: 600, textTransform: 'none', borderRadius: 2, minHeight: 36, px: 2 }}>Chỉnh sửa</Button>
                    </Box>
                </CardContent>
            </Card>

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="subtitle1" fontWeight={600} sx={{ whiteSpace: 'nowrap' }}>Chi tiết dòng (Lines)</Typography>
                <Tooltip title="Chọn cột hiển thị">
                    <IconButton color="primary" onClick={(e) => setColumnSelectorAnchor(e.currentTarget)} aria-label="Chọn cột" sx={{ border: 1, borderColor: 'divider' }}>
                        <Columns size={20} />
                    </IconButton>
                </Tooltip>
            </Box>
            <Popover open={columnSelectorOpen} anchorEl={columnSelectorAnchor} onClose={() => setColumnSelectorAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }} slotProps={{ paper: { sx: { mt: 1.5, p: 2, minWidth: 220 } } }}>
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5, whiteSpace: 'nowrap' }}>Chọn cột hiển thị</Typography>
                <FormGroup>
                    <FormControlLabel control={<Checkbox checked={visibleColumnIds.size === PO_LINE_COLUMNS.length} indeterminate={visibleColumnIds.size > 0 && visibleColumnIds.size < PO_LINE_COLUMNS.length} onChange={(e) => handleSelectAllLineColumns(e.target.checked)} />} label="Tất cả" />
                    {PO_LINE_COLUMNS.map((col) => (
                        <FormControlLabel key={col.id} control={<Checkbox checked={visibleColumnIds.has(col.id)} onChange={(e) => handleColumnVisibilityChange(col.id, e.target.checked)} />} label={col.label} />
                    ))}
                </FormGroup>
            </Popover>
            <Card className="list-grid-card" sx={{ borderRadius: 3, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.12)', boxShadow: (t) => t.shadows[1], p: 1 }}>
                <TableContainer sx={{ border: '1px solid rgba(0,0,0,0.2)', borderRadius: 2, overflow: 'hidden' }}>
                    <Table size="small" stickyHeader>
                        <TableHead>
                            <TableRow>
                                {visibleColumns.map((col) => (
                                    <TableCell key={col.id} sx={{ fontWeight: 600, bgcolor: 'grey.50', whiteSpace: 'nowrap' }} align="left">{col.label}</TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {lines.map((line) => (
                                <TableRow key={line.purchaseOrderLineId} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                    {visibleColumns.map((col) => (
                                        <TableCell key={col.id} align="left">{col.getValue(line)}</TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Card>
            </Box>
        </>
    );
};

export default ViewPurchaseOrder;
