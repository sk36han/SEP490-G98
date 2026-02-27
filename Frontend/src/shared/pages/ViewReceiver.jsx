import React, { useState, useMemo } from 'react';
import {
    Box,
    Card,
    CardContent,
    Button,
    Typography,
    IconButton,
    Select,
    MenuItem,
    FormControl,
    Tooltip,
    useTheme,
    useMediaQuery,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Popover,
    FormGroup,
    FormControlLabel,
    Checkbox,
    Chip,
} from '@mui/material';
import { Columns, Filter, Eye, Edit } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SearchInput from '../components/SearchInput';
import { removeDiacritics } from '../utils/stringUtils';
import ReceiverFilterPopup from '../components/ReceiverFilterPopup';
import '../styles/SupplierView.css';

const ROWS_PER_PAGE_OPTIONS = [10, 20, 50, 100];

const RECEIVER_COLUMNS = [
    { id: 'stt', label: 'STT', getValue: () => '' },
    { id: 'receiverCode', label: 'Mã người nhận', getValue: (row) => row.receiverCode ?? '' },
    { id: 'receiverName', label: 'Tên người nhận', getValue: (row) => row.receiverName ?? '' },
    { id: 'phone', label: 'Số điện thoại', getValue: (row) => row.phone ?? '' },
    { id: 'email', label: 'Email', getValue: (row) => row.email ?? '' },
    { id: 'ward', label: 'Phường', getValue: (row) => row.ward ?? '' },
    { id: 'province', label: 'Tỉnh', getValue: (row) => row.province ?? '' },
    { id: 'country', label: 'Quốc gia', getValue: (row) => row.country ?? '' },
    { id: 'address', label: 'Địa chỉ', getValue: (row) => row.address ?? '' },
    { id: 'notes', label: 'Ghi chú', getValue: (row) => row.notes ?? '' },
    { id: 'isActive', label: 'Trạng thái', getValue: (row) => (row.isActive ? 'Hoạt động' : 'Ngưng') },
    { id: 'createdAt', label: 'Ngày tạo', getValue: (row) => row.createdAt ?? '' },
    { id: 'actions', label: 'Thao tác', getValue: () => '' },
];

const DEFAULT_VISIBLE_COLUMN_IDS = RECEIVER_COLUMNS.map((c) => c.id);

const MOCK_RECEIVERS = [
    {
        receiverId: 1,
        receiverCode: 'RCV001',
        receiverName: 'Anh Nguyễn Văn A',
        phone: '0901 234 567',
        email: 'receiver.a@example.com',
        ward: 'Phường Bến Thành',
        province: 'TP.HCM',
        country: 'Việt Nam',
        address: '123 Nguyễn Trãi, Quận 1',
        notes: 'Nhận hàng giờ hành chính',
        isActive: true,
        createdAt: '2025-02-01',
    },
    {
        receiverId: 2,
        receiverCode: 'RCV002',
        receiverName: 'Chị Trần Thị B',
        phone: '0902 345 678',
        email: 'receiver.b@example.com',
        ward: 'Phường Bến Nghé',
        province: 'TP.HCM',
        country: 'Việt Nam',
        address: '456 Lê Lợi, Quận 1',
        notes: '',
        isActive: true,
        createdAt: '2025-02-03',
    },
    {
        receiverId: 3,
        receiverCode: 'RCV003',
        receiverName: 'Kho công ty C',
        phone: '028 3939 8888',
        email: 'warehouse.c@example.com',
        ward: 'Phường 25',
        province: 'TP.HCM',
        country: 'Việt Nam',
        address: '789 Điện Biên Phủ, Quận Bình Thạnh',
        notes: 'Kho ngoại thành',
        isActive: false,
        createdAt: '2025-01-20',
    },
];

export default function ViewReceiver() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const navigate = useNavigate();

    const [data, setData] = useState(MOCK_RECEIVERS);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterOpen, setFilterOpen] = useState(false);
    const [filterValues, setFilterValues] = useState({});
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(20);
    const [visibleColumnIds, setVisibleColumnIds] = useState(() => new Set(DEFAULT_VISIBLE_COLUMN_IDS));
    const [columnSelectorAnchor, setColumnSelectorAnchor] = useState(null);

    const handleColumnVisibilityChange = (columnId, checked) => {
        setVisibleColumnIds((prev) => {
            const next = new Set(prev);
            if (checked) next.add(columnId);
            else next.delete(columnId);
            return next;
        });
    };

    const handleSelectAllColumns = (checked) => {
        setVisibleColumnIds(checked ? new Set(DEFAULT_VISIBLE_COLUMN_IDS) : new Set());
    };

    const visibleColumns = RECEIVER_COLUMNS.filter((col) => visibleColumnIds.has(col.id));
    const columnSelectorOpen = Boolean(columnSelectorAnchor);

    const filteredRows = useMemo(() => {
        const normalize = (str) => (str ? removeDiacritics(String(str).toLowerCase()) : '');
        const term = searchTerm.trim() ? normalize(searchTerm.trim()) : '';

        let list = [...data];

        if (term) {
            list = list.filter((row) => {
                const matchCode = normalize(row.receiverCode).includes(term);
                const matchName = normalize(row.receiverName).includes(term);
                const matchPhone = normalize(row.phone).includes(term);
                const matchEmail = normalize(row.email).includes(term);
                const matchWard = normalize(row.ward).includes(term);
                const matchProvince = normalize(row.province).includes(term);
                const matchCountry = normalize(row.country).includes(term);
                const matchAddress = normalize(row.address).includes(term);
                return (
                    matchCode ||
                    matchName ||
                    matchPhone ||
                    matchEmail ||
                    matchWard ||
                    matchProvince ||
                    matchCountry ||
                    matchAddress
                );
            });
        }

        if (filterValues.receiverCode) {
            const v = normalize(filterValues.receiverCode);
            list = list.filter((row) => normalize(row.receiverCode).includes(v));
        }
        if (filterValues.receiverName) {
            const v = normalize(filterValues.receiverName);
            list = list.filter((row) => normalize(row.receiverName).includes(v));
        }
        if (filterValues.phone) {
            const v = normalize(filterValues.phone);
            list = list.filter((row) => normalize(row.phone).includes(v));
        }
        if (filterValues.email) {
            const v = normalize(filterValues.email);
            list = list.filter((row) => normalize(row.email).includes(v));
        }
        if (filterValues.ward) {
            const v = normalize(filterValues.ward);
            list = list.filter((row) => normalize(row.ward).includes(v));
        }
        if (filterValues.province) {
            const v = normalize(filterValues.province);
            list = list.filter((row) => normalize(row.province).includes(v));
        }
        if (filterValues.country) {
            const v = normalize(filterValues.country);
            list = list.filter((row) => normalize(row.country).includes(v));
        }
        if (filterValues.isActive !== undefined && filterValues.isActive !== null) {
            list = list.filter((row) => row.isActive === filterValues.isActive);
        }
        if (filterValues.fromDate) {
            list = list.filter((row) => row.createdAt && row.createdAt >= filterValues.fromDate);
        }
        if (filterValues.toDate) {
            list = list.filter((row) => row.createdAt && row.createdAt <= filterValues.toDate);
        }

        return list;
    }, [searchTerm, filterValues, data]);

    const totalRows = filteredRows.length;
    const start = totalRows === 0 ? 0 : page * pageSize + 1;
    const end = Math.min((page + 1) * pageSize, totalRows);
    const totalPages = pageSize > 0 ? Math.max(0, Math.ceil(totalRows / pageSize)) : 0;

    const rows = useMemo(
        () => filteredRows.slice(page * pageSize, (page + 1) * pageSize),
        [filteredRows, page, pageSize]
    );

    const handleStatusChange = (id, nextValue) => {
        const isActive = nextValue === 'true';
        const confirmed = window.confirm('Bạn có chắc chắn muốn thay đổi trạng thái người nhận này?');
        if (!confirmed) return;
        setData((prev) =>
            prev.map((row) =>
                row.receiverId === id ? { ...row, isActive } : row
            )
        );
    };

    const handleSearch = () => {
        setPage(0);
    };

    const handleFilterApply = (values) => {
        setFilterValues(values);
        setPage(0);
    };

    const handlePageChange = (newPage) => setPage(newPage);
    const handlePageSizeChange = (e) => {
        setPageSize(Number(e.target.value));
        setPage(0);
    };

    return (
        <Box sx={{ pt: 0, pb: 2, mt: -3 }}>
            <Box
                sx={{
                    mb: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    textAlign: 'left',
                }}
            >
                <Typography
                    variant="h4"
                    component="h1"
                    gutterBottom
                    fontWeight="800"
                    sx={{
                        background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                        backgroundClip: 'text',
                        textFillColor: 'transparent',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        textShadow: '0 2px 4px rgba(0,0,0,0.2), 0 1px 3px rgba(0,0,0,0.15)',
                        whiteSpace: 'nowrap',
                    }}
                >
                    Quản lý người nhận
                </Typography>
                <Typography
                    variant="body1"
                    color="text.secondary"
                    sx={{ maxWidth: 560, wordBreak: 'break-word', overflowWrap: 'break-word' }}
                >
                    Tra cứu và quản lý thông tin người nhận hàng.
                </Typography>
            </Box>

            <Box
                className="supplier-view"
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
                <ReceiverFilterPopup
                    open={filterOpen}
                    onClose={() => setFilterOpen(false)}
                    initialValues={filterValues}
                    onApply={handleFilterApply}
                />
                <Card
                    className="supplier-filter-card"
                    sx={{
                        mb: 1,
                        borderRadius: 3,
                        border: '1px solid rgba(0,0,0,0.12)',
                        boxShadow: (t) => t.shadows[1],
                    }}
                >
                    <CardContent sx={{ '&.MuiCardContent-root:last-child': { pb: 2 }, pt: 1, px: 1.5 }}>
                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: isMobile ? 'column' : 'row',
                                gap: 1.5,
                                alignItems: isMobile ? 'stretch' : 'center',
                                flexWrap: 'wrap',
                            }}
                            >
                            <SearchInput
                                placeholder="Tìm kiếm theo mã, tên, SĐT, email người nhận…"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                sx={{
                                    flex: '1 1 200px',
                                    minWidth: isMobile ? '100%' : 200,
                                    maxWidth: isMobile ? '100%' : 480,
                                }}
                            />
                            <Tooltip title="Bộ lọc">
                                <IconButton
                                    color="primary"
                                    onClick={() => setFilterOpen(true)}
                                    aria-label="Bộ lọc"
                                    sx={{ border: 1, borderColor: 'divider' }}
                                >
                                    <Filter size={20} />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Chọn cột hiển thị">
                                <IconButton
                                    color="primary"
                                    onClick={(e) => setColumnSelectorAnchor(e.currentTarget)}
                                    aria-label="Chọn cột"
                                    sx={{ border: 1, borderColor: 'divider' }}
                                >
                                    <Columns size={20} />
                                </IconButton>
                            </Tooltip>
                            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', ml: isMobile ? 0 : 'auto' }}>
                                <Button
                                    className="supplier-page-btn"
                                    variant="contained"
                                    onClick={() => navigate('/receivers/create')}
                                    sx={{
                                        fontSize: 13,
                                        fontWeight: 600,
                                        textTransform: 'none',
                                        borderRadius: 2,
                                        minHeight: 36,
                                        px: 2,
                                        background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                                        boxShadow: '0 2px 8px rgba(33, 150, 243, 0.3)',
                                        '&:hover': {
                                            background: 'linear-gradient(45deg, #1976D2 30%, #00BCD4 90%)',
                                            boxShadow: '0 4px 12px rgba(33, 150, 243, 0.4)',
                                        },
                                    }}
                                    startIcon={<span style={{ fontSize: 18, fontWeight: 700 }}>+</span>}
                                >
                                    Tạo mới
                                </Button>
                            </Box>
                        </Box>
                    </CardContent>
                </Card>

                <Popover
                    open={columnSelectorOpen}
                    anchorEl={columnSelectorAnchor}
                    onClose={() => setColumnSelectorAnchor(null)}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                    slotProps={{ paper: { sx: { mt: 1.5, p: 2, minWidth: 220 } } }}
                >
                    <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5, whiteSpace: 'nowrap' }}>
                        Chọn cột hiển thị
                    </Typography>
                    <FormGroup>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={visibleColumnIds.size === RECEIVER_COLUMNS.length}
                                    indeterminate={
                                        visibleColumnIds.size > 0 &&
                                        visibleColumnIds.size < RECEIVER_COLUMNS.length
                                    }
                                    onChange={(e) => handleSelectAllColumns(e.target.checked)}
                                />
                            }
                            label="Tất cả"
                        />
                        {RECEIVER_COLUMNS.map((col) => (
                            <FormControlLabel
                                key={col.id}
                                control={
                                    <Checkbox
                                        checked={visibleColumnIds.has(col.id)}
                                        onChange={(e) => handleColumnVisibilityChange(col.id, e.target.checked)}
                                    />
                                }
                                label={col.label}
                            />
                        ))}
                    </FormGroup>
                </Popover>

                <Card
                    className="supplier-grid-card"
                    sx={{
                        borderRadius: 3,
                        overflow: 'hidden',
                        border: '1px solid rgba(0,0,0,0.12)',
                        boxShadow: (t) => t.shadows[1],
                        p: 1,
                    }}
                >
                    <Box
                        className="supplier-grid-wrapper"
                        sx={{ position: 'relative', minHeight: 'calc(100vh - 220px)' }}
                    >
                        {rows.length === 0 ? (
                            <Box
                                sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    py: 6,
                                    color: 'text.secondary',
                                }}
                            >
                                <Typography>Chưa có dữ liệu người nhận</Typography>
                            </Box>
                        ) : (
                            <TableContainer
                                sx={{
                                    maxHeight: 'calc(100vh - 240px)',
                                    border: '1px solid rgba(0,0,0,0.2)',
                                    borderRadius: 2,
                                    overflow: 'hidden',
                                }}
                            >
                                <Table size="small" stickyHeader>
                                    <TableHead>
                                        <TableRow>
                                            {visibleColumns.map((col) => (
                                                <TableCell
                                                    key={col.id}
                                                    sx={{
                                                        fontWeight: 600,
                                                        bgcolor: 'grey.50',
                                                        whiteSpace: 'nowrap',
                                                    }}
                                                    align="left"
                                                >
                                                    {col.label}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {rows.map((row, index) => (
                                            <TableRow key={row.receiverId} hover>
                                                {visibleColumns.map((col) => {
                                                    if (col.id === 'stt') {
                                                        return (
                                                            <TableCell key={col.id} align="left">
                                                                {page * pageSize + index + 1}
                                                            </TableCell>
                                                        );
                                                    }
                                                    if (col.id === 'isActive') {
                                                        return (
                                                            <TableCell key={col.id} align="left">
                                                                <FormControl size="small" sx={{ minWidth: 120 }}>
                                                                    <Select
                                                                        value={row.isActive ? 'true' : 'false'}
                                                                        onChange={(e) =>
                                                                            handleStatusChange(
                                                                                row.receiverId,
                                                                                e.target.value
                                                                            )
                                                                        }
                                                                        sx={{
                                                                            fontSize: '0.8125rem',
                                                                            borderRadius: '50px',
                                                                            '& .MuiSelect-select': {
                                                                                py: 0.25,
                                                                                px: 1.5,
                                                                            },
                                                                        }}
                                                                    >
                                                                        <MenuItem value="true">Hoạt động</MenuItem>
                                                                        <MenuItem value="false">Ngưng</MenuItem>
                                                                    </Select>
                                                                </FormControl>
                                                            </TableCell>
                                                        );
                                                    }
                                                    if (col.id === 'actions') {
                                                        return (
                                                            <TableCell key={col.id} align="right">
                                                                <Tooltip title="Xem">
                                                                    <IconButton
                                                                        size="small"
                                                                        aria-label="Xem"
                                                                    >
                                                                        <Eye size={18} />
                                                                    </IconButton>
                                                                </Tooltip>
                                                                <Tooltip title="Sửa">
                                                                    <IconButton
                                                                        size="small"
                                                                        aria-label="Sửa"
                                                                    >
                                                                        <Edit size={18} />
                                                                    </IconButton>
                                                                </Tooltip>
                                                            </TableCell>
                                                        );
                                                    }
                                                    return (
                                                        <TableCell key={col.id} align="left">
                                                            {col.getValue(row)}
                                                        </TableCell>
                                                    );
                                                })}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </Box>
                </Card>

                <Box
                    sx={{
                        mt: 0,
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: 2,
                    }}
                >
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        component="span"
                        sx={{ whiteSpace: 'nowrap' }}
                    >
                        Số dòng / trang:
                    </Typography>
                    <FormControl size="small" sx={{ minWidth: 72 }}>
                        <Select
                            value={pageSize}
                            onChange={handlePageSizeChange}
                            sx={{ height: 32, fontSize: '0.875rem' }}
                        >
                            {ROWS_PER_PAGE_OPTIONS.map((n) => (
                                <MenuItem key={n} value={n}>
                                    {n}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        component="span"
                        sx={{ whiteSpace: 'nowrap' }}
                    >
                        {start}–{end} / {totalRows} (Tổng {totalPages} trang)
                    </Typography>
                    <Button
                        size="small"
                        variant="outlined"
                        disabled={page <= 0}
                        onClick={() => handlePageChange(page - 1)}
                        sx={{ minWidth: 36, textTransform: 'none' }}
                    >
                        Trước
                    </Button>
                    <Button
                        size="small"
                        variant="outlined"
                        disabled={end >= totalRows || totalRows === 0}
                        onClick={() => handlePageChange(page + 1)}
                        sx={{ minWidth: 36, textTransform: 'none' }}
                    >
                        Sau
                    </Button>
                </Box>
            </Box>
        </Box>
    );
}

