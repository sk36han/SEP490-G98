import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Button,
    TextField,
    Chip,
    IconButton,
    Tooltip,
    Box,
    Typography,
    CircularProgress,
    Pagination,
    Container,
    Popover,
    FormGroup,
    FormControlLabel,
    Checkbox,
    FormControl,
    Select,
    MenuItem,
} from '@mui/material';
import { Search, Edit, Power, UserPlus, Download, Columns, RefreshCw, Filter } from 'lucide-react';
import adminService from '../lib/adminService';
import authService from '../lib/authService';
import Toast from '../../components/Toast/Toast';
import CreateAccountDialog from '../../components/admin/CreateAccountDialog';
import EditUserDialog from '../../components/admin/EditUserDialog';
import { useToast } from '../hooks/useToast';
import { removeDiacritics } from '../utils/stringUtils';
import SearchInput from '../components/SearchInput';
import UserAccountFilterPopup from '../components/UserAccountFilterPopup';
import { ROLE_DISPLAY_MAPPING, ROLE_COLORS, ROLE_NAME_TO_ID } from '../constants/roles';

/** Cột bảng danh sách user – dùng cho chọn cột hiển thị */
const USER_ACCOUNT_COLUMNS = [
    { id: 'stt', label: 'STT', getValue: (row, index, { pageNumber, pageSize }) => (pageNumber - 1) * pageSize + index + 1 },
    { id: 'username', label: 'Username', getValue: (row) => row.username ?? '' },
    { id: 'email', label: 'Email', getValue: (row) => row.email ?? '' },
    { id: 'fullName', label: 'Họ tên', getValue: (row) => row.fullName ?? '' },
    { id: 'role', label: 'Vai trò', getValue: (row) => ROLE_DISPLAY_MAPPING[row.roleName] || row.roleName || 'N/A' },
    { id: 'status', label: 'Trạng thái', getValue: (row) => row.isActive ? 'Hoạt động' : 'Vô hiệu' },
    { id: 'actions', label: 'Hành động', getValue: () => '' },
];
const DEFAULT_VISIBLE_USER_COLUMN_IDS = USER_ACCOUNT_COLUMNS.map((c) => c.id);
const ROWS_PER_PAGE_OPTIONS = [7, 10, 20, 50, 100];

const UserAccountList = () => {
    const { toast, showToast, clearToast } = useToast();
    const location = useLocation();
    const navigate = useNavigate();
    const currentUserId = authService.getCurrentUserId();
    const [allUsers, setAllUsers] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [pageNumber, setPageNumber] = useState(1);
    const [pageSize, setPageSize] = useState(7);
    const [totalCount, setTotalCount] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterOpen, setFilterOpen] = useState(false);
    const [filterValues, setFilterValues] = useState({ role: '', isActive: null, fromDate: null, toDate: null });

    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [creatingUser, setCreatingUser] = useState(false);
    const createSubmittingRef = useRef(false);
    // Dự phòng cho audit log (ghi lại admin đã chỉnh sửa những gì)
    // const [selectedUser, setSelectedUser] = useState(null);

    const [createForm, setCreateForm] = useState({
        email: '',
        fullName: '',
        username: '',
        roleId: 2,
        gender: '',
        citizenId: '',
    });
    const [editForm, setEditForm] = useState({
        userId: null,
        fullName: '',
        username: '',
        email: '',
        phone: '',
        roleId: 2,
        isActive: true,
        createdAt: null,
        lastLoginAt: null,
        gender: '',
        citizenId: '',
    });
    const [visibleColumnIds, setVisibleColumnIds] = useState(() => new Set(DEFAULT_VISIBLE_USER_COLUMN_IDS));
    const [columnSelectorAnchor, setColumnSelectorAnchor] = useState(null);

    const handleColumnVisibilityChange = (columnId, checked) => {
        setVisibleColumnIds((prev) => {
            const next = new Set(prev);
            if (checked) next.add(columnId);
            else next.delete(columnId);
            return next;
        });
    };
    const handleSelectAllUserColumns = (checked) => {
        setVisibleColumnIds(checked ? new Set(DEFAULT_VISIBLE_USER_COLUMN_IDS) : new Set());
    };
    const visibleColumns = USER_ACCOUNT_COLUMNS.filter((col) => visibleColumnIds.has(col.id));
    const columnSelectorOpen = Boolean(columnSelectorAnchor);

    const loadUsers = async () => {
        setLoading(true);
        try {
            const response = await adminService.getUserList({
                pageNumber: 1,
                pageSize: 100,
                searchTerm: '',
            });
            const list = response?.data?.items ?? response?.items ?? [];
            setAllUsers(Array.isArray(list) ? list : []);
            return (response?.data?.items ?? list)?.length ?? 0;
        } catch (error) {
            showToast(error.message, 'error');
            return 0;
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
    }, []);

    // Mở dialog Tạo mới khi điều hướng từ Sidebar với state.openCreate
    useEffect(() => {
        if (location.state?.openCreate) {
            setShowCreateDialog(true);
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location.pathname, location.state?.openCreate, navigate]);

    useEffect(() => {
        let result = allUsers;
        if (searchTerm.trim()) {
            const normalize = (str) => (str ? removeDiacritics(str.toLowerCase()) : '');
            const lowerTerm = normalize(searchTerm.trim());
            result = result.filter(
                (user) =>
                    normalize(user.fullName).includes(lowerTerm) ||
                    normalize(user.email).includes(lowerTerm) ||
                    normalize(user.username).includes(lowerTerm)
            );
        }
        if (filterValues.role) {
            result = result.filter(
                (user) => (ROLE_DISPLAY_MAPPING[user.roleName] || user.roleName) === filterValues.role
            );
        }
        if (filterValues.isActive !== null && filterValues.isActive !== undefined) {
            result = result.filter((user) => Boolean(user.isActive) === filterValues.isActive);
        }
        if (filterValues.fromDate || filterValues.toDate) {
            result = result.filter((user) => {
                const createdAt = user.createdAt ? new Date(user.createdAt) : null;
                if (!createdAt || isNaN(createdAt.getTime())) return false;
                if (filterValues.fromDate) {
                    const from = new Date(filterValues.fromDate);
                    from.setHours(0, 0, 0, 0);
                    if (createdAt < from) return false;
                }
                if (filterValues.toDate) {
                    const to = new Date(filterValues.toDate);
                    to.setHours(23, 59, 59, 999);
                    if (createdAt > to) return false;
                }
                return true;
            });
        }
        setTotalCount(result.length);
        const start = (pageNumber - 1) * pageSize;
        setUsers(result.slice(start, start + pageSize));
    }, [allUsers, searchTerm, filterValues, pageNumber, pageSize]);

    useEffect(() => {
        setPageNumber(1);
    }, [searchTerm, filterValues.role, filterValues.isActive, filterValues.fromDate, filterValues.toDate]);

    const handleFilterApply = (values) => {
        setFilterValues({
            role: values.role ?? '',
            isActive: values.isActive ?? null,
            fromDate: values.fromDate ?? null,
            toDate: values.toDate ?? null,
        });
        setPageNumber(1);
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        if (createSubmittingRef.current || creatingUser) return;
        if (!createForm.email || !createForm.fullName) {
            showToast('Vui lòng điền đầy đủ Email và Họ tên!', 'error');
            return;
        }
        createSubmittingRef.current = true;
        setCreatingUser(true);
        try {
            const payload = { email: createForm.email, fullName: createForm.fullName, roleId: createForm.roleId };
            const result = await adminService.createUser(payload);
            const createdUsername = result?.data?.username;
            const msg = createdUsername
                ? `Tạo tài khoản thành công! Tên đăng nhập: ${createdUsername}`
                : 'Tạo tài khoản thành công!';
            showToast(msg, 'success');
            setShowCreateDialog(false);
            setCreateForm({ email: '', fullName: '', username: '', roleId: 2, gender: '', citizenId: '' });
            const count = await loadUsers();
            if (count > 0) {
                const lastPage = Math.ceil(count / pageSize);
                setPageNumber(lastPage);
            }
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            createSubmittingRef.current = false;
            setCreatingUser(false);
        }
    };

    const handleEditUser = async (e) => {
        e.preventDefault();
        if (!editForm.userId || !editForm.fullName) {
            showToast('Vui lòng điền Họ tên!', 'error');
            return;
        }
        try {
            await adminService.updateUser(editForm.userId, {
                fullName: editForm.fullName,
                roleId: editForm.roleId,
                gender: editForm.gender || undefined,
                dob: editForm.dob || undefined,
            });
            showToast('Cập nhật thành công!', 'success');
            setShowEditDialog(false);
            loadUsers();
        } catch (error) {
            showToast(error.message, 'error');
        }
    };

    const handleToggleStatus = async (userId, currentStatus) => {
        if (currentUserId != null && Number(userId) === Number(currentUserId) && currentStatus) {
            showToast('Bạn không thể vô hiệu hóa tài khoản của chính mình.', 'error');
            return;
        }
        const action = currentStatus ? 'vô hiệu hóa' : 'kích hoạt';
        if (!window.confirm(`Bạn có chắc muốn ${action} tài khoản này?`)) return;
        try {
            await adminService.toggleUserStatus(userId);
            showToast(`Đã ${action} tài khoản!`, 'success');
            loadUsers();
        } catch (error) {
            showToast(error.message, 'error');
        }
    };

    const openEditDialog = (user) => {
        const roleId = user.roleId ?? ROLE_NAME_TO_ID[user.roleName] ?? 2;
        const rawDob = user.dob ?? user.dateOfBirth ?? null;
        const dobStr = rawDob
            ? (typeof rawDob === 'string' && rawDob.length >= 10 ? rawDob.substring(0, 10) : new Date(rawDob).toISOString().slice(0, 10))
            : '';
        setEditForm({
            userId: user.userId,
            fullName: user.fullName ?? '',
            username: user.username ?? '',
            email: user.email ?? '',
            phone: user.phone ?? '',
            roleId: Number(roleId) || 2,
            isActive: user.isActive ?? true,
            createdAt: user.createdAt ?? null,
            lastLoginAt: user.lastLoginAt ?? null,
            gender: user.gender ?? '',
            dob: dobStr,
            citizenId: user.citizenId ?? '',
        });
        setShowEditDialog(true);
    };

    const handleExport = async () => {
        try {
            const blob = await adminService.exportUsersExcel();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `users_${new Date().toISOString().split('T')[0]}.xlsx`;
            link.click();
            window.URL.revokeObjectURL(url);
            showToast('Xuất file Excel thành công!', 'success');
        } catch (error) {
            showToast(error.message, 'error');
        }
    };

    const totalPages = pageSize > 0 ? Math.max(0, Math.ceil(totalCount / pageSize)) : 0;
    const start = totalCount === 0 ? 0 : (pageNumber - 1) * pageSize + 1;
    const end = Math.min(pageNumber * pageSize, totalCount);

    const handlePageSizeChange = (e) => {
        setPageSize(Number(e.target.value));
        setPageNumber(1);
    };

    return (
        <Container
            maxWidth="xl"
            sx={{
                pt: 2,
                pb: 2,
                mx: 'auto',
                height: '100%',
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <Box
                sx={{
                    mb: 0.75,
                    mt: 0,
                    flexShrink: 0,
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
                        mt: 0,
                        background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                        backgroundClip: 'text',
                        textFillColor: 'transparent',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        textShadow: '0 2px 4px rgba(0,0,0,0.2), 0 1px 3px rgba(0,0,0,0.15)',
                        whiteSpace: 'nowrap',
                    }}
                >
                    Quản lý người dùng
                </Typography>
                <Typography
                    variant="body1"
                    color="text.secondary"
                    sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                >
                    Quản lý tài khoản, phân quyền và trạng thái hoạt động của nhân viên trong hệ thống.
                </Typography>
            </Box>

            <Paper
                elevation={3}
                sx={{
                    mt: 1.5,
                    p: 0.5,
                    borderRadius: 4,
                    flex: 1,
                    minHeight: 0,
                    minWidth: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    background: 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(20px)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.05)',
                    border: '1px solid rgba(0, 0, 0, 0.12)',
                }}
            >
                <UserAccountFilterPopup
                    open={filterOpen}
                    onClose={() => setFilterOpen(false)}
                    initialValues={filterValues}
                    onApply={handleFilterApply}
                />
                <Box
                    sx={{
                        mb: 0.25,
                        flexShrink: 0,
                        display: 'flex',
                        gap: 2,
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        justifyContent: 'space-between',
                        py: 1.5,
                        px: 2,
                    }}
                >
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flex: '1 1 auto', minWidth: 0 }}>
                        <SearchInput
                            placeholder="Tìm kiếm theo email, tên, username..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            sx={{ flexGrow: 1, maxWidth: 420, minWidth: 160 }}
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
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexShrink: 0 }}>
                        <Tooltip title="Làm mới danh sách">
                            <IconButton
                                color="primary"
                                onClick={() => loadUsers()}
                                aria-label="Làm mới"
                                sx={{ border: 1, borderColor: 'divider' }}
                            >
                                <RefreshCw size={20} />
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
                        <Button
                            variant="outlined"
                            startIcon={<Download size={18} />}
                            onClick={handleExport}
                            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                        >
                            Xuất Excel
                        </Button>
                        <Button
                            variant="contained"
                            startIcon={<UserPlus size={18} />}
                            onClick={() => setShowCreateDialog(true)}
                            sx={{
                                borderRadius: 2,
                                textTransform: 'none',
                                fontWeight: 600,
                                background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                                boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)',
                            }}
                        >
                            Tạo tài khoản
                        </Button>
                    </Box>
                </Box>

                <Popover
                    open={columnSelectorOpen}
                    anchorEl={columnSelectorAnchor}
                    onClose={() => setColumnSelectorAnchor(null)}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                    slotProps={{ paper: { sx: { mt: 1.5, p: 2, minWidth: 220, maxWidth: 520 } } }}
                >
                    <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5, whiteSpace: 'nowrap' }}>
                        Chọn cột hiển thị
                    </Typography>
                    <FormGroup>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={visibleColumnIds.size === USER_ACCOUNT_COLUMNS.length}
                                    indeterminate={visibleColumnIds.size > 0 && visibleColumnIds.size < USER_ACCOUNT_COLUMNS.length}
                                    onChange={(e) => handleSelectAllUserColumns(e.target.checked)}
                                />
                            }
                            label="Tất cả"
                        />
                        <Box
                            sx={{
                                display: 'grid',
                                gridTemplateRows: 'repeat(5, auto)',
                                gridAutoFlow: 'column',
                                gap: '2px 20px',
                                alignContent: 'start',
                                mt: 0.5,
                            }}
                        >
                            {USER_ACCOUNT_COLUMNS.map((col) => (
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
                        </Box>
                    </FormGroup>
                </Popover>

                <TableContainer sx={{ flex: 1, minHeight: 0, minWidth: 0, border: '1px solid rgba(0,0,0,0.08)', borderRadius: 2, overflow: 'auto' }}>
                    <Table stickyHeader>
                        <TableHead>
                            <TableRow>
                                {visibleColumns.map((col) => (
                                    <TableCell
                                        key={col.id}
                                        align={col.id === 'stt' ? 'center' : col.id === 'actions' ? 'right' : 'left'}
                                        sx={{
                                            fontWeight: 'bold',
                                            bgcolor: 'grey.50',
                                            color: 'text.secondary',
                                            whiteSpace: 'nowrap',
                                            ...(col.id === 'stt' ? { width: 52, minWidth: 52, maxWidth: 52 } : {}),
                                        }}
                                    >
                                        {col.label}
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading && users.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={visibleColumns.length} align="center" sx={{ py: 8 }}>
                                        <CircularProgress size={40} />
                                    </TableCell>
                                </TableRow>
                            ) : users.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={visibleColumns.length} align="center" sx={{ py: 8 }}>
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                color: 'text.secondary',
                                            }}
                                        >
                                            <Search size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
                                            <Typography>Không tìm thấy người dùng nào</Typography>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                users.map((user, index) => (
                                    <TableRow
                                        key={user.userId}
                                        hover
                                        sx={{
                                            '&:last-child td, &:last-child th': { border: 0 },
                                            transition: 'background-color 0.2s',
                                            '&:hover': {
                                                backgroundColor: 'rgba(25, 118, 210, 0.04) !important',
                                            },
                                        }}
                                    >
                                        {visibleColumns.map((col) => {
                                            const opts = { pageNumber, pageSize };
                                            if (col.id === 'stt') {
                                                return (
                                                    <TableCell key={col.id} align="center" sx={{ width: 52, minWidth: 52, maxWidth: 52, fontVariantNumeric: 'tabular-nums' }}>
                                                        {col.getValue(user, index, opts)}
                                                    </TableCell>
                                                );
                                            }
                                            if (col.id === 'username') {
                                                return <TableCell key={col.id} sx={{ fontWeight: 500 }}>{user.username}</TableCell>;
                                            }
                                            if (col.id === 'email') {
                                                return <TableCell key={col.id}>{user.email}</TableCell>;
                                            }
                                            if (col.id === 'fullName') {
                                                return (
                                                    <TableCell key={col.id}>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                            <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: 'primary.light', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontWeight: 'bold' }}>
                                                                {user.fullName.charAt(0)}
                                                            </Box>
                                                            {user.fullName}
                                                        </Box>
                                                    </TableCell>
                                                );
                                            }
                                            if (col.id === 'role') {
                                                return (
                                                    <TableCell key={col.id}>
                                                        <Chip
                                                            label={ROLE_DISPLAY_MAPPING[user.roleName] || user.roleName || 'N/A'}
                                                            size="small"
                                                            color={ROLE_COLORS[ROLE_DISPLAY_MAPPING[user.roleName]] || 'default'}
                                                            variant="filled"
                                                            sx={{ fontWeight: 600, borderRadius: 1.5 }}
                                                        />
                                                    </TableCell>
                                                );
                                            }
                                            if (col.id === 'status') {
                                                return (
                                                    <TableCell key={col.id}>
                                                        <Chip
                                                            label={user.isActive ? 'Active' : 'Inactive'}
                                                            size="small"
                                                            variant="outlined"
                                                            sx={{
                                                                fontWeight: 600,
                                                                borderRadius: '50px',
                                                                px: 1.25,
                                                                bgcolor: 'transparent',
                                                                color: user.isActive ? 'success.main' : 'text.secondary',
                                                                border: '1px solid',
                                                                borderColor: user.isActive ? 'success.main' : 'grey.400',
                                                            }}
                                                        />
                                                    </TableCell>
                                                );
                                            }
                                            if (col.id === 'actions') {
                                                return (
                                                    <TableCell key={col.id} align="right">
                                                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                                                            <Tooltip title="Chỉnh sửa">
                                                                <IconButton size="small" onClick={() => openEditDialog(user)} sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main', bgcolor: 'primary.lighter' } }}>
                                                                    <Edit size={18} />
                                                                </IconButton>
                                                            </Tooltip>
                                                            {(() => {
                                                                const isSelf = currentUserId != null && Number(user.userId) === Number(currentUserId);
                                                                const cannotDeactivateSelf = isSelf && user.isActive;
                                                                return (
                                                                    <Tooltip title={cannotDeactivateSelf ? 'Không thể vô hiệu hóa chính mình' : (user.isActive ? 'Vô hiệu hóa' : 'Kích hoạt')}>
                                                                        <span>
                                                                            <IconButton
                                                                                size="small"
                                                                                disabled={cannotDeactivateSelf}
                                                                                onClick={() => handleToggleStatus(user.userId, user.isActive)}
                                                                                sx={{
                                                                                    color: cannotDeactivateSelf ? 'grey.400' : (user.isActive ? 'success.main' : 'text.disabled'),
                                                                                    '&:hover': cannotDeactivateSelf ? {} : { color: user.isActive ? 'error.main' : 'success.main', bgcolor: 'action.hover' }
                                                                                }}
                                                                            >
                                                                                <Power size={18} />
                                                                            </IconButton>
                                                                        </span>
                                                                    </Tooltip>
                                                                );
                                                            })()}
                                                        </Box>
                                                    </TableCell>
                                                );
                                            }
                                            return <TableCell key={col.id}>{col.getValue(user, index, opts)}</TableCell>;
                                        })}
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            {/* Phần chân bảng: khoảng trắng nhỏ với bảng, sát đáy viewport */}
            <Box
                sx={{
                    mt: 1.5,
                    flexShrink: 0,
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: 2,
                    py: 1,
                }}
            >
                <Typography variant="body2" color="text.secondary" component="span" sx={{ whiteSpace: 'nowrap' }}>Số dòng / trang:</Typography>
                <FormControl size="small" sx={{ minWidth: 72 }}>
                    <Select
                        value={pageSize}
                        onChange={handlePageSizeChange}
                        sx={{ height: 32, fontSize: '0.875rem' }}
                    >
                        {ROWS_PER_PAGE_OPTIONS.map((n) => (
                            <MenuItem key={n} value={n}>{n}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
                <Typography variant="body2" color="text.secondary" component="span" sx={{ whiteSpace: 'nowrap' }}>
                    {start}–{end} / {totalCount} (Tổng {totalPages} trang)
                </Typography>
                <Button
                    size="small"
                    variant="outlined"
                    disabled={pageNumber <= 1}
                    onClick={() => setPageNumber(pageNumber - 1)}
                    sx={{ minWidth: 36, textTransform: 'none' }}
                >
                    Trước
                </Button>
                <Typography variant="body2" color="text.secondary" sx={{ px: 1.5, minWidth: 72, textAlign: 'center' }}>
                    Trang {pageNumber} / {totalPages || 1}
                </Typography>
                <Button
                    size="small"
                    variant="outlined"
                    disabled={end >= totalCount || totalCount === 0}
                    onClick={() => setPageNumber(pageNumber + 1)}
                    sx={{ minWidth: 36, textTransform: 'none' }}
                >
                    Sau
                </Button>
                {totalPages > 1 && (
                    <Pagination
                        count={totalPages}
                        page={pageNumber}
                        onChange={(e, page) => setPageNumber(page)}
                        color="primary"
                        showFirstButton
                        showLastButton
                    />
                )}
            </Box>

            <CreateAccountDialog
                open={showCreateDialog}
                formData={createForm}
                onFormChange={setCreateForm}
                onSubmit={handleCreateUser}
                onClose={() => setShowCreateDialog(false)}
                submitting={creatingUser}
            />

            <EditUserDialog
                open={showEditDialog}
                formData={editForm}
                onFormChange={setEditForm}
                onSubmit={handleEditUser}
                onClose={() => setShowEditDialog(false)}
            />

            {toast && (
                <Toast message={toast.message} type={toast.type} onClose={clearToast} />
            )}
        </Container>
    );
};

export default UserAccountList;
