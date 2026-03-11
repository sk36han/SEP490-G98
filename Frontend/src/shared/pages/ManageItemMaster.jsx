import React from 'react';
import {
    Box,
    Container,
    Typography,
    Card,
    CardContent,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Button,
    Stack,
    IconButton,
} from '@mui/material';
import { Plus, Edit3, Trash2 } from 'lucide-react';

const MOCK_BRANDS = [
    { brandId: 1, brandCode: 'APPLE', brandName: 'Apple', isActive: true },
    { brandId: 2, brandCode: 'SAMSUNG', brandName: 'Samsung', isActive: true },
    { brandId: 3, brandCode: 'OTHER', brandName: 'Khác', isActive: true },
];

const MOCK_UOMS = [
    { uomId: 1, uomCode: 'CAI', uomName: 'Cái', isActive: true },
    { uomId: 2, uomCode: 'HOP', uomName: 'Hộp', isActive: true },
    { uomId: 3, uomCode: 'KG', uomName: 'Kilogram', isActive: true },
];

const MOCK_PACKAGING = [
    { packagingSpecId: 1, specCode: 'BOX', specName: 'Hộp', isActive: true },
    { packagingSpecId: 2, specCode: 'CARTON', specName: 'Thùng carton', isActive: true },
    { packagingSpecId: 3, specCode: 'BAG', specName: 'Túi', isActive: true },
];

const ManageItemMaster = () => {
    // Hiện tại chỉ là UI mockup; sau có thể nối API để load / thao tác dữ liệu thật
    const handleAdd = (type) => {
        // eslint-disable-next-line no-alert
        alert(`TODO: Mở popup tạo mới ${type}`);
    };

    const handleEdit = (type, id) => {
        // eslint-disable-next-line no-alert
        alert(`TODO: Mở popup chỉnh sửa ${type} với ID = ${id}`);
    };

    const handleDelete = (type, id) => {
        // eslint-disable-next-line no-alert
        alert(`TODO: Xử lý vô hiệu hóa / xóa ${type} với ID = ${id}`);
    };

    return (
        <Box sx={{ bgcolor: 'grey.50', minHeight: '100%', py: 2 }}>
            <Container maxWidth="lg" sx={{ maxWidth: 1200 }}>
                <Box sx={{ mb: 2 }}>
                    <Typography variant="h5" fontWeight={700} sx={{ color: 'text.primary', mb: 0.5 }}>
                        Quản lý danh mục vật tư
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Quản lý danh sách Brand, Đơn vị tính (Unit Of Measure) và Quy cách đóng gói (Packaging Spec)
                        dùng chung cho các vật tư.
                    </Typography>
                </Box>

                <Stack spacing={2}>
                    {/* Brand */}
                    <Card elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                        <CardContent sx={{ p: 2.5 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                                <Box>
                                    <Typography variant="subtitle1" fontWeight={700}>
                                        Brand (Thương hiệu)
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Dùng để gán thương hiệu cho vật tư trong màn hình vật tư.
                                    </Typography>
                                </Box>
                                <Button
                                    variant="contained"
                                    startIcon={<Plus size={18} />}
                                    onClick={() => handleAdd('Brand')}
                                    sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}
                                >
                                    Thêm Brand
                                </Button>
                            </Stack>
                            <TableContainer>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: 'grey.50' }}>
                                            <TableCell sx={{ fontWeight: 600 }}>Mã Brand</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>Tên Brand</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>Trạng thái</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }} align="right">
                                                Hành động
                                            </TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {MOCK_BRANDS.map((b) => (
                                            <TableRow key={b.brandId} hover>
                                                <TableCell>{b.brandCode}</TableCell>
                                                <TableCell>{b.brandName}</TableCell>
                                                <TableCell>{b.isActive ? 'Hoạt động' : 'Tắt'}</TableCell>
                                                <TableCell align="right">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleEdit('Brand', b.brandId)}
                                                        sx={{ mr: 0.5 }}
                                                    >
                                                        <Edit3 size={18} />
                                                    </IconButton>
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleDelete('Brand', b.brandId)}
                                                        sx={{ color: 'error.main' }}
                                                    >
                                                        <Trash2 size={18} />
                                                    </IconButton>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </CardContent>
                    </Card>

                    {/* Unit Of Measure */}
                    <Card elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                        <CardContent sx={{ p: 2.5 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                                <Box>
                                    <Typography variant="subtitle1" fontWeight={700}>
                                        Đơn vị tính (Unit Of Measure)
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Quản lý danh sách đơn vị tính chuẩn dùng để khai báo vật tư.
                                    </Typography>
                                </Box>
                                <Button
                                    variant="contained"
                                    startIcon={<Plus size={18} />}
                                    onClick={() => handleAdd('UnitOfMeasure')}
                                    sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}
                                >
                                    Thêm đơn vị tính
                                </Button>
                            </Stack>
                            <TableContainer>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: 'grey.50' }}>
                                            <TableCell sx={{ fontWeight: 600 }}>Mã ĐVT</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>Tên ĐVT</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>Trạng thái</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }} align="right">
                                                Hành động
                                            </TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {MOCK_UOMS.map((u) => (
                                            <TableRow key={u.uomId} hover>
                                                <TableCell>{u.uomCode}</TableCell>
                                                <TableCell>{u.uomName}</TableCell>
                                                <TableCell>{u.isActive ? 'Hoạt động' : 'Tắt'}</TableCell>
                                                <TableCell align="right">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleEdit('UnitOfMeasure', u.uomId)}
                                                        sx={{ mr: 0.5 }}
                                                    >
                                                        <Edit3 size={18} />
                                                    </IconButton>
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleDelete('UnitOfMeasure', u.uomId)}
                                                        sx={{ color: 'error.main' }}
                                                    >
                                                        <Trash2 size={18} />
                                                    </IconButton>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </CardContent>
                    </Card>

                    {/* Packaging Spec */}
                    <Card elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                        <CardContent sx={{ p: 2.5 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                                <Box>
                                    <Typography variant="subtitle1" fontWeight={700}>
                                        Quy cách đóng gói (Packaging Spec)
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Danh sách quy cách đóng gói để gán cho vật tư (Hộp, Thùng, Túi, ...).
                                    </Typography>
                                </Box>
                                <Button
                                    variant="contained"
                                    startIcon={<Plus size={18} />}
                                    onClick={() => handleAdd('PackagingSpec')}
                                    sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}
                                >
                                    Thêm quy cách
                                </Button>
                            </Stack>
                            <TableContainer>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: 'grey.50' }}>
                                            <TableCell sx={{ fontWeight: 600 }}>Mã quy cách</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>Tên quy cách</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>Trạng thái</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }} align="right">
                                                Hành động
                                            </TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {MOCK_PACKAGING.map((p) => (
                                            <TableRow key={p.packagingSpecId} hover>
                                                <TableCell>{p.specCode}</TableCell>
                                                <TableCell>{p.specName}</TableCell>
                                                <TableCell>{p.isActive ? 'Hoạt động' : 'Tắt'}</TableCell>
                                                <TableCell align="right">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleEdit('PackagingSpec', p.packagingSpecId)}
                                                        sx={{ mr: 0.5 }}
                                                    >
                                                        <Edit3 size={18} />
                                                    </IconButton>
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleDelete('PackagingSpec', p.packagingSpecId)}
                                                        sx={{ color: 'error.main' }}
                                                    >
                                                        <Trash2 size={18} />
                                                    </IconButton>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </CardContent>
                    </Card>
                </Stack>
            </Container>
        </Box>
    );
};

export default ManageItemMaster;

