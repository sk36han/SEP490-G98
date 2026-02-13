import React, { useState, useEffect } from 'react';
import {
    Table, TableBody, TableCell, TableContainer, TableHead,
    TableRow, Paper, Button, TextField, Dialog, DialogTitle,
    DialogContent, DialogActions, Select, MenuItem, FormControl,
    InputLabel, Chip, IconButton, Tooltip, Box, Typography,
    CircularProgress, Pagination, InputAdornment, Container, Grid
} from '@mui/material';
import { Search, Edit, Power, UserPlus, Download, X, User, Mail, Briefcase, Key, Shield } from 'lucide-react';
import adminService from '../lib/adminService';
import Toast from '../../components/Toast/Toast';

const ROLE_OPTIONS = {
    1: "Giám Đốc",
    2: "Sale Engineer",
    3: "Kế toán",
    4: "Sale Support",
    6: "Admin",
    7: "Thủ kho"
};

const ROLE_DISPLAY_MAPPING = {
    "Giám Đốc": "Giám Đốc",
    "Sale Engineer": "Sale Engineer",
    "Kế toán": "Kế toán",
    "Accountant": "Kế toán",
    "Accountant - Kế toán": "Kế toán",
    "Sale Support": "Sale Support",
    "Admin": "Admin",
    "admin": "Admin",
    "Thủ kho": "Thủ kho",
    "GD": "Giám Đốc",
    "SALES": "Sale Engineer"
};

const removeDiacritics = (str) => {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");
};

const generateUsername = (fullName) => {
    if (!fullName) return '';
    const normalized = removeDiacritics(fullName.trim().toLowerCase());
    const parts = normalized.split(/\s+/);
    if (parts.length === 0) return '';
    const lastName = parts[parts.length - 1];
    const initials = parts.slice(0, parts.length - 1).map(p => p[0]).join('');
    return lastName + initials;
};

const ROLE_COLORS = {
    "Giám Đốc": "error",
    "Sale Engineer": "primary",
    "Kế toán": "warning",
    "Sale Support": "info",
    "Admin": "secondary",
    "Thủ kho": "default"
};

const UserAccountList = () => {
    // ... existing state ...
    const [allUsers, setAllUsers] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalCount, setTotalCount] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');

    // Dialog states
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    // ... form states ...
    const [createForm, setCreateForm] = useState({
        email: '',
        fullName: '',
        username: '',
        roleId: 2
    });
    const [editForm, setEditForm] = useState({
        userId: null,
        fullName: '',
        username: '',
        roleId: 2,
        isActive: true
    });

    // ... helpers ...
    const removeDiacritics = (str) => {
        return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");
    };

    const generateUsername = (fullName) => {
        if (!fullName) return '';
        const normalized = removeDiacritics(fullName.trim().toLowerCase());
        const parts = normalized.split(/\s+/);
        if (parts.length === 0) return '';
        const lastName = parts[parts.length - 1];
        const initials = parts.slice(0, parts.length - 1).map(p => p[0]).join('');
        return lastName + initials;
    };

    // ... helper functions ...
    const showToast = (message, type = 'success') => setToast({ message, type });

    // ... loadUsers, useEffects, handlers ...
    // (Preserving logic, only showing UI changes in return)
    const loadUsers = async () => {
        setLoading(true);
        try {
            const response = await adminService.getUserList({
                pageNumber: 1,
                pageSize: 1000,
                searchTerm: ''
            });
            const pagedResult = response.data;
            setAllUsers(pagedResult.items || []);
        } catch (error) {
            showToast(error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadUsers(); }, []);

    useEffect(() => {
        let result = allUsers;
        if (searchTerm.trim()) {
            const normalize = (str) => str ? removeDiacritics(str.toLowerCase()) : '';
            const lowerTerm = normalize(searchTerm.trim());
            result = allUsers.filter(user =>
                normalize(user.fullName).includes(lowerTerm) ||
                normalize(user.email).includes(lowerTerm) ||
                normalize(user.username).includes(lowerTerm)
            );
        }
        setTotalCount(result.length);
        const start = (pageNumber - 1) * pageSize;
        setUsers(result.slice(start, start + pageSize));
    }, [allUsers, searchTerm, pageNumber, pageSize]);

    useEffect(() => { setPageNumber(1); }, [searchTerm]);

    const handleCreateUser = async (e) => {
        e.preventDefault();
        if (!createForm.email || !createForm.fullName || !createForm.username) {
            showToast('Vui lòng điền đầy đủ thông tin!', 'error');
            return;
        }
        try {
            await adminService.createUser(createForm);
            showToast('Tạo tài khoản thành công!', 'success');
            setShowCreateDialog(false);
            setCreateForm({ email: '', fullName: '', username: '', roleId: 2 });
            loadUsers();
        } catch (error) {
            showToast(error.message, 'error');
        }
    };

    const handleEditUser = async (e) => {
        e.preventDefault();
        if (!editForm.userId || !editForm.fullName || !editForm.username) {
            showToast('Vui lòng điền đầy đủ thông tin!', 'error');
            return;
        }
        try {
            await adminService.updateUser(editForm.userId, editForm);
            showToast('Cập nhật thành công!', 'success');
            setShowEditDialog(false);
            setSelectedUser(null);
            loadUsers();
        } catch (error) {
            showToast(error.message, 'error');
        }
    };

    const handleToggleStatus = async (userId, currentStatus) => {
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
        setSelectedUser(user);
        setEditForm({
            userId: user.userId,
            fullName: user.fullName,
            username: user.username || '',
            roleId: user.roleId || 2,
            isActive: user.isActive
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

    const totalPages = Math.ceil(totalCount / pageSize);

    return (
        <Container maxWidth="xl" sx={{ py: 4 }}>
            {/* Header */}
            <Box sx={{ mb: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <Typography variant="h4" component="h1" gutterBottom fontWeight="800" sx={{ background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)', backgroundClip: 'text', textFillColor: 'transparent', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Quản lý người dùng
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600 }}>
                    Quản lý tài khoản, phân quyền và trạng thái hoạt động của nhân viên trong hệ thống.
                </Typography>
            </Box>

            <Paper
                elevation={3}
                sx={{
                    p: 3,
                    borderRadius: 4,
                    background: 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(20px)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.3)'
                }}
            >
                {/* Action Bar */}
                <Box sx={{ mb: 4, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                    <TextField
                        placeholder="Tìm kiếm theo email, tên, username..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        size="small"
                        sx={{
                            flexGrow: 1,
                            maxWidth: 500,
                            '& .MuiOutlinedInput-root': {
                                borderRadius: 3,
                                backgroundColor: 'white',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                                '& fieldset': { borderColor: 'transparent' },
                                '&:hover fieldset': { borderColor: 'primary.main' },
                                '&.Mui-focused fieldset': { borderColor: 'primary.main' }
                            }
                        }}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <Search size={20} className="text-gray-400" />
                                </InputAdornment>
                            ),
                        }}
                    />
                    <Box sx={{ display: 'flex', gap: 2 }}>
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
                                boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)'
                            }}
                        >
                            Tạo tài khoản
                        </Button>
                    </Box>
                </Box>

                {/* Users Table */}
                <TableContainer sx={{ maxHeight: 600 }}>
                    <Table stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.50', color: 'text.secondary' }}>STT</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.50', color: 'text.secondary' }}>Username</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.50', color: 'text.secondary' }}>Email</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.50', color: 'text.secondary' }}>Họ tên</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.50', color: 'text.secondary' }}>Vai trò</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', bgcolor: 'grey.50', color: 'text.secondary' }}>Trạng thái</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 'bold', bgcolor: 'grey.50', color: 'text.secondary' }}>Hành động</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading && users.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                                        <CircularProgress size={40} />
                                    </TableCell>
                                </TableRow>
                            ) : users.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'text.secondary' }}>
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
                                            '&:hover': { backgroundColor: 'rgba(25, 118, 210, 0.04) !important' }
                                        }}
                                    >
                                        <TableCell>{(pageNumber - 1) * pageSize + index + 1}</TableCell>
                                        <TableCell sx={{ fontWeight: 500 }}>{user.username}</TableCell>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: 'primary.light', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontWeight: 'bold' }}>
                                                    {user.fullName.charAt(0)}
                                                </Box>
                                                {user.fullName}
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={ROLE_DISPLAY_MAPPING[user.roleName] || user.roleName || 'N/A'}
                                                size="small"
                                                color={ROLE_COLORS[ROLE_DISPLAY_MAPPING[user.roleName]] || 'default'}
                                                variant="filled"
                                                sx={{ fontWeight: 600, borderRadius: 1.5 }}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={user.isActive ? 'Hoạt động' : 'Vô hiệu'}
                                                size="small"
                                                sx={{
                                                    bgcolor: user.isActive ? 'success.light' : 'grey.300',
                                                    color: user.isActive ? 'success.dark' : 'grey.700',
                                                    fontWeight: 600,
                                                    borderRadius: 1.5
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell align="right">
                                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                                                <Tooltip title="Chỉnh sửa">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => openEditDialog(user)}
                                                        sx={{
                                                            color: 'text.secondary',
                                                            '&:hover': { color: 'primary.main', bgcolor: 'primary.lighter' }
                                                        }}
                                                    >
                                                        <Edit size={18} />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title={user.isActive ? 'Vô hiệu hóa' : 'Kích hoạt'}>
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => handleToggleStatus(user.userId, user.isActive)}
                                                        sx={{
                                                            color: user.isActive ? 'success.main' : 'text.disabled',
                                                            '&:hover': { color: user.isActive ? 'error.main' : 'success.main', bgcolor: 'action.hover' }
                                                        }}
                                                    >
                                                        <Power size={18} />
                                                    </IconButton>
                                                </Tooltip>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            {/* Pagination */}
            {totalPages > 1 && (
                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
                    <Pagination
                        count={totalPages}
                        page={pageNumber}
                        onChange={(e, page) => setPageNumber(page)}
                        color="primary"
                        showFirstButton
                        showLastButton
                    />
                </Box>
            )}

            {/* Create User Dialog */}
            <Dialog
                open={showCreateDialog}
                onClose={() => setShowCreateDialog(false)}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        overflow: 'hidden',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                    }
                }}
            >
                <DialogTitle sx={{
                    background: 'linear-gradient(135deg, #1976D2 0%, #1565C0 100%)',
                    color: 'white',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    px: 3,
                    py: 2.5
                }}>
                    <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
                        Tạo tài khoản mới
                    </Typography>
                    <IconButton onClick={() => setShowCreateDialog(false)} size="small" sx={{ color: 'white' }}>
                        <X size={20} />
                    </IconButton>
                </DialogTitle>
                <form onSubmit={handleCreateUser}>
                    <DialogContent sx={{ p: 4 }}>
                        <Grid container spacing={3}>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    label="Email"
                                    type="email"
                                    value={createForm.email}
                                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                                    required
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <Mail size={18} className="text-gray-500" />
                                            </InputAdornment>
                                        ),
                                        sx: { borderRadius: 2 }
                                    }}
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    label="Họ và tên"
                                    value={createForm.fullName}
                                    onChange={(e) => {
                                        const newName = e.target.value;
                                        const newUsername = generateUsername(newName);
                                        setCreateForm({
                                            ...createForm,
                                            fullName: newName,
                                            username: newUsername
                                        });
                                    }}
                                    required
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <User size={18} className="text-gray-500" />
                                            </InputAdornment>
                                        ),
                                        sx: { borderRadius: 2 }
                                    }}
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <FormControl fullWidth>
                                    <InputLabel>Vai trò</InputLabel>
                                    <Select
                                        value={createForm.roleId}
                                        label="Vai trò"
                                        onChange={(e) => setCreateForm({ ...createForm, roleId: e.target.value })}
                                        startAdornment={
                                            <InputAdornment position="start" sx={{ mr: 1, ml: 1 }}>
                                                <Shield size={18} className="text-gray-500" />
                                            </InputAdornment>
                                        }
                                        sx={{ borderRadius: 2 }}
                                    >
                                        {Object.entries(ROLE_OPTIONS).map(([id, name]) => (
                                            <MenuItem key={id} value={parseInt(id)}>{name}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    label="Tên đăng nhập (Username)"
                                    value={createForm.username}
                                    InputProps={{
                                        readOnly: true,
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <Key size={18} className="text-gray-500" />
                                            </InputAdornment>
                                        ),
                                        sx: { bgcolor: 'action.hover', borderRadius: 2 }
                                    }}
                                    helperText="Tự động tạo từ họ tên"
                                />
                            </Grid>
                        </Grid>
                    </DialogContent>
                    <DialogActions sx={{ p: 3, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                        <Button
                            onClick={() => setShowCreateDialog(false)}
                            variant="outlined"
                            color="inherit"
                            sx={{ borderRadius: 2 }}
                        >
                            Hủy bỏ
                        </Button>
                        <Button
                            type="submit"
                            variant="contained"
                            sx={{
                                px: 4,
                                borderRadius: 2,
                                background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                                boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)'
                            }}
                        >
                            Tạo tài khoản
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>

            {/* Edit User Dialog */}
            <Dialog
                open={showEditDialog}
                onClose={() => setShowEditDialog(false)}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        overflow: 'hidden',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                    }
                }}
            >
                <DialogTitle sx={{
                    background: 'linear-gradient(135deg, #2E7D32 0%, #43A047 100%)', // Green gradient for edit
                    color: 'white',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    px: 3,
                    py: 2.5
                }}>
                    <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
                        Chỉnh sửa thông tin
                    </Typography>
                    <IconButton onClick={() => setShowEditDialog(false)} size="small" sx={{ color: 'white' }}>
                        <X size={20} />
                    </IconButton>
                </DialogTitle>
                <form onSubmit={handleEditUser}>
                    <DialogContent sx={{ p: 4 }}>
                        <Grid container spacing={3}>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    label="Họ và tên"
                                    value={editForm.fullName}
                                    onChange={(e) => {
                                        const newName = e.target.value;
                                        // Auto-update username but allow overwrite (though it's readonly now, so logic basically updates check)
                                        const newUsername = generateUsername(newName);
                                        setEditForm({
                                            ...editForm,
                                            fullName: newName,
                                            username: newUsername
                                        });
                                    }}
                                    required
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <User size={18} className="text-gray-500" />
                                            </InputAdornment>
                                        ),
                                        sx: { borderRadius: 2 }
                                    }}
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <FormControl fullWidth>
                                    <InputLabel>Vai trò</InputLabel>
                                    <Select
                                        value={editForm.roleId}
                                        label="Vai trò"
                                        onChange={(e) => setEditForm({ ...editForm, roleId: e.target.value })}
                                        startAdornment={
                                            <InputAdornment position="start" sx={{ mr: 1, ml: 1 }}>
                                                <Shield size={18} className="text-gray-500" />
                                            </InputAdornment>
                                        }
                                        sx={{ borderRadius: 2 }}
                                    >
                                        {Object.entries(ROLE_OPTIONS).map(([id, name]) => (
                                            <MenuItem key={id} value={parseInt(id)}>{name}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Tên đăng nhập (Username)"
                                    value={editForm.username}
                                    InputProps={{
                                        readOnly: true,
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <Key size={18} className="text-gray-500" />
                                            </InputAdornment>
                                        ),
                                        sx: { bgcolor: 'action.hover', borderRadius: 2 }
                                    }}
                                    helperText="Tự động tạo từ họ tên"
                                />
                            </Grid>
                        </Grid>
                    </DialogContent>
                    <DialogActions sx={{ p: 3, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                        <Button
                            onClick={() => setShowEditDialog(false)}
                            variant="outlined"
                            color="inherit"
                            sx={{ borderRadius: 2 }}
                        >
                            Hủy bỏ
                        </Button>
                        <Button
                            type="submit"
                            variant="contained"
                            color="success"
                            sx={{
                                px: 4,
                                borderRadius: 2,
                                boxShadow: '0 3px 5px 2px rgba(46, 125, 50, .3)'
                            }}
                        >
                            Lưu thay đổi
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>

            {/* Toast Notification */}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
        </Container>
    );
};

export default UserAccountList;
