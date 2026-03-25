import React from 'react';
import {
    Box,
    Card,
    CardContent,
    Button,
    Typography,
    IconButton,
    TextField,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    FormControl,
    Select,
    MenuItem,
    InputAdornment,
    LinearProgress,
    Tooltip,
} from '@mui/material';
import { Save, Edit, TrendingUp, CheckCircle2 } from 'lucide-react';

import { useSalesTarget } from './hooks/useSalesTarget';
import { MOCK_TARGETS } from './data/mockData';

/**
 * Định dạng số sang tiền VND
 * @param {number} value
 * @returns {string}
 */
const formatCurrency = (value) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

/**
 * Màn hình thiết lập mục tiêu doanh thu bán hàng theo quý/tháng
 */
const SalesRevenueTarget = () => {
    const {
        year,
        setYear,
        quarter,
        setQuarter,
        targets,
        editingId,
        editValue,
        setEditValue,
        handleEdit,
        handleSave,
        handleCancel,
        calculateAchievement,
        totalTarget,
        totalAchievement,
        years,
    } = useSalesTarget(MOCK_TARGETS);

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
                    Mục tiêu Doanh thu Bán hàng
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Thiết lập và theo dõi chỉ tiêu doanh thu theo quý và tháng.
                </Typography>
            </Box>

            {/* Main wrapper */}
            <Box
                sx={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1.5,
                    background: 'linear-gradient(180deg, #ffffff 0%, rgba(255,255,255,0.97) 100%)',
                    borderRadius: 3,
                    p: 0.75,
                    border: '1px solid',
                    borderColor: 'divider',
                    boxShadow: 1,
                }}
            >
                {/* Toolbar: period picker + summary card */}
                <Card sx={{ borderRadius: 3, border: '1px solid rgba(0,0,0,0.12)', boxShadow: 1 }}>
                    <CardContent sx={{ py: 1.5, px: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'stretch' }}>
                            {/* Period selectors */}
                            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flex: '1 1 auto' }}>
                                <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>
                                    Kỳ báo cáo:
                                </Typography>
                                <FormControl size="small" sx={{ minWidth: 110 }}>
                                    <Select value={year} onChange={(e) => setYear(e.target.value)}>
                                        {years.map(y => <MenuItem key={y} value={y}>Năm {y}</MenuItem>)}
                                    </Select>
                                </FormControl>
                                <FormControl size="small" sx={{ minWidth: 90 }}>
                                    <Select value={quarter} onChange={(e) => setQuarter(e.target.value)}>
                                        {[1, 2, 3, 4].map(q => <MenuItem key={q} value={q}>Quý {q}</MenuItem>)}
                                    </Select>
                                </FormControl>
                            </Box>

                            {/* Summary pill */}
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 2,
                                    px: 2.5,
                                    py: 1,
                                    bgcolor: '#0D1B2A',
                                    borderRadius: 2,
                                    color: 'white',
                                    flex: '0 0 auto',
                                }}
                            >
                                <TrendingUp size={20} style={{ opacity: 0.7 }} />
                                <Box>
                                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', display: 'block', lineHeight: 1 }}>
                                        Tổng quát Q{quarter}/{year}
                                    </Typography>
                                    <Typography variant="body2" fontWeight={700}>{formatCurrency(totalTarget)}</Typography>
                                </Box>
                                <Box sx={{ minWidth: 80 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
                                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.65rem' }}>Đạt được</Typography>
                                        <Typography variant="caption" sx={{ color: 'white', fontWeight: 700, fontSize: '0.65rem' }}>{totalAchievement}%</Typography>
                                    </Box>
                                    <LinearProgress
                                        variant="determinate"
                                        value={totalAchievement}
                                        sx={{ height: 6, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.2)', '& .MuiLinearProgress-bar': { bgcolor: '#21CBF3' } }}
                                    />
                                </Box>
                                <CheckCircle2 size={18} style={{ color: '#21CBF3' }} />
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
                                    {['THÁNG', 'MỤC TIÊU DOANH THU (VND)', 'THỰC TẾ ĐẠT ĐƯỢC', 'TỶ LỆ HOÀN THÀNH', 'THAO TÁC'].map(h => (
                                        <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.72rem', letterSpacing: 0.5, color: 'text.secondary', bgcolor: 'grey.50' }}>
                                            {h}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {targets.map((row) => {
                                    const isEditing = editingId === row.id;
                                    const achievement = calculateAchievement(row.actual, isEditing ? editValue : row.target);
                                    return (
                                        <TableRow key={row.id} hover>
                                            <TableCell sx={{ fontWeight: 600 }}>{row.period}</TableCell>
                                            <TableCell>
                                                {isEditing ? (
                                                    <TextField type="number" size="small" value={editValue}
                                                        onChange={(e) => setEditValue(e.target.value)}
                                                        InputProps={{ endAdornment: <InputAdornment position="end">đ</InputAdornment> }}
                                                        sx={{ width: 180 }} />
                                                ) : (
                                                    <Typography fontWeight={700} color="primary.main" variant="body2">
                                                        {formatCurrency(row.target)}
                                                    </Typography>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2">{formatCurrency(row.actual)}</Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <Typography variant="body2" fontWeight={700}
                                                        color={achievement >= 100 ? 'success.main' : 'warning.main'}>
                                                        {achievement}%
                                                    </Typography>
                                                    <LinearProgress
                                                        variant="determinate"
                                                        value={Math.min(achievement, 100)}
                                                        color={achievement >= 100 ? 'success' : 'warning'}
                                                        sx={{ flex: 1, maxWidth: 80, height: 6, borderRadius: 3 }}
                                                    />
                                                </Box>
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
                                                    <Tooltip title="Thiết lập mục tiêu">
                                                        <IconButton color="primary" onClick={() => handleEdit(row)} size="small">
                                                            <Edit size={16} />
                                                        </IconButton>
                                                    </Tooltip>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Card>
            </Box>
        </Box>
    );
};

export default SalesRevenueTarget;
