import React from 'react';
import {
    Box,
    Card,
    CardContent,
    Button,
    Typography,
    IconButton,
    Chip,
    TextField,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tooltip,
} from '@mui/material';
import { Save, Edit, AlertTriangle } from 'lucide-react';

import { useInventoryAlert } from './hooks/useInventoryAlert';
import { MOCK_PRODUCTS } from './data/mockData';
import SearchInput from '../shared/components/SearchInput';

/**
 * Dịch trạng thái mức tồn kho dựa trên định mức tối thiểu/tối đa
 * @param {number} current - Tồn kho hiện tại
 * @param {number} min - Mức tối thiểu (Min)
 * @param {number} max - Mức tối đa (Max)
 * @returns {Object} Đối tượng chứa nhãn trạng thái và màu sắc
 */
const getStockStatus = (current, min, max) => {
    if (current < min) return { label: 'Dưới định mức', color: 'error' };
    if (current > max) return { label: 'Vượt định mức', color: 'warning' };
    return { label: 'An toàn', color: 'success' };
};

/**
 * Màn hình thiết lập cảnh báo tồn kho sản phẩm
 */
const InventoryAlertSetup = () => {
    const {
        searchTerm,
        setSearchTerm,
        filteredAlerts,
        editingId,
        editForm,
        setEditForm,
        handleEdit,
        handleSave,
        handleCancel,
    } = useInventoryAlert(MOCK_PRODUCTS);

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', pb: 2, width: '100%' }}>
            {/* Page Header */}
            <Box sx={{ flexShrink: 0, mb: 1.5 }}>
                <Typography
                    variant="h4"
                    component="h1"
                    fontWeight={800}
                    gutterBottom
                    sx={{
                        background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        whiteSpace: 'nowrap',
                    }}
                >
                    Thiết lập Cảnh báo Tồn kho
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Cấu hình ngưỡng tối thiểu / tối đa cho từng sản phẩm để nhận cảnh báo tự động.
                </Typography>
            </Box>

            {/* Main wrapper */}
            <Box
                sx={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    background: 'linear-gradient(180deg, #ffffff 0%, rgba(255,255,255,0.97) 100%)',
                    borderRadius: 3,
                    p: 0.75,
                    border: '1px solid',
                    borderColor: 'divider',
                    boxShadow: 1,
                }}
            >
                {/* Filter Card */}
                <Card sx={{ mb: 1, borderRadius: 3, border: '1px solid rgba(0,0,0,0.12)', boxShadow: 1 }}>
                    <CardContent sx={{ py: 1, px: 1.5, '&:last-child': { pb: 1 } }}>
                        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                            <SearchInput
                                placeholder="Tìm theo mã hoặc tên sản phẩm..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                sx={{ flex: '1 1 220px', maxWidth: 480 }}
                            />
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                    px: 2,
                                    py: 1,
                                    bgcolor: 'warning.50',
                                    border: '1px solid',
                                    borderColor: 'warning.light',
                                    borderRadius: 2,
                                    flex: '1 1 300px',
                                }}
                            >
                                <AlertTriangle size={18} color="#ed6c02" />
                                <Typography variant="caption" color="warning.dark">
                                    Hệ thống tự động thông báo khi tồn kho thực tế vượt ngoài ngưỡng Min / Max đã thiết lập.
                                </Typography>
                            </Box>
                        </Box>
                    </CardContent>
                </Card>

                {/* Table Card */}
                <Card sx={{ flex: 1, borderRadius: 3, border: '1px solid rgba(0,0,0,0.12)', boxShadow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <TableContainer sx={{ flex: 1 }}>
                        <Table size="small" stickyHeader>
                            <TableHead>
                                <TableRow>
                                    {['MÃ SP', 'TÊN SẢN PHẨM', 'ĐVT', 'TỒN HIỆN TẠI', 'TRẠNG THÁI', 'TỒN TỐI THIỂU (MIN)', 'TỒN TỐI ĐA (MAX)', 'THAO TÁC'].map(h => (
                                        <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.72rem', letterSpacing: 0.5, color: 'text.secondary', bgcolor: 'grey.50' }}>
                                            {h}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {filteredAlerts.map((row) => {
                                    const status = getStockStatus(row.currentStock, row.minStock, row.maxStock);
                                    const isEditing = editingId === row.id;
                                    return (
                                        <TableRow key={row.id} hover>
                                            <TableCell sx={{ fontWeight: 600, color: 'primary.main' }}>{row.id}</TableCell>
                                            <TableCell>{row.name}</TableCell>
                                            <TableCell>{row.unit}</TableCell>
                                            <TableCell>
                                                <Typography fontWeight={700} color={status.color !== 'success' ? `${status.color}.main` : 'text.primary'} variant="body2">
                                                    {row.currentStock.toLocaleString()}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Chip label={status.label} color={status.color} size="small" sx={{ fontWeight: 600, fontSize: '0.7rem' }} />
                                            </TableCell>
                                            <TableCell>
                                                {isEditing ? (
                                                    <TextField type="number" size="small" value={editForm.minStock}
                                                        onChange={(e) => setEditForm({ ...editForm, minStock: e.target.value })}
                                                        sx={{ width: 90 }} />
                                                ) : row.minStock.toLocaleString()}
                                            </TableCell>
                                            <TableCell>
                                                {isEditing ? (
                                                    <TextField type="number" size="small" value={editForm.maxStock}
                                                        onChange={(e) => setEditForm({ ...editForm, maxStock: e.target.value })}
                                                        sx={{ width: 90 }} />
                                                ) : row.maxStock.toLocaleString()}
                                            </TableCell>
                                            <TableCell>
                                                {isEditing ? (
                                                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                        <Tooltip title="Lưu">
                                                            <IconButton color="primary" onClick={() => handleSave(row.id)} size="small">
                                                                <Save size={16} />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Button size="small" onClick={handleCancel} color="inherit" sx={{ minWidth: 'auto', px: 1, textTransform: 'none', fontSize: '0.75rem' }}>
                                                            Hủy
                                                        </Button>
                                                    </Box>
                                                ) : (
                                                    <Tooltip title="Chỉnh sửa ngưỡng">
                                                        <IconButton color="primary" onClick={() => handleEdit(row)} size="small">
                                                            <Edit size={16} />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                                {filteredAlerts.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                                            <Typography color="text.secondary">Không tìm thấy sản phẩm nào.</Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Card>
            </Box>
        </Box>
    );
};

export default InventoryAlertSetup;
