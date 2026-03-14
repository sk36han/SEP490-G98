/*
 * Danh sách Đơn vị tính – kết nối API UnitOfMeasure.
 * Cột: STT, Mã đơn vị tính, Tên, Trạng thái, Hành động.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Button,
  Typography,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  useTheme,
  useMediaQuery,
  Popover,
  FormControlLabel,
  Checkbox,
  CircularProgress,
  Alert,
  Tooltip,
  FormControl,
  Select,
  MenuItem,
} from '@mui/material';
import { Plus, Edit3, RefreshCw, Filter, Power } from 'lucide-react';
import '../styles/ListView.css';
import authService from '../lib/authService';
import { getPermissionRole, getRawRoleFromUser } from '../permissions/roleUtils';
import SearchInput from '../components/SearchInput';
import UomFormDialog from '../components/UomFormDialog';
import { getUomList, createUom, updateUom, toggleUomStatus } from '../lib/uomService';

const ROWS_PER_PAGE_OPTIONS = [7, 10, 20, 50, 100];

const ViewUomList = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const userInfo = authService.getUser();
  const permissionRole = getPermissionRole(getRawRoleFromUser(userInfo));
  const canManage = permissionRole === 'WAREHOUSE_KEEPER';

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyActive, setShowOnlyActive] = useState(false);
  const [filterAnchor, setFilterAnchor] = useState(null);
  const [uomDialogOpen, setUomDialogOpen] = useState(false);
  const [uomDialogMode, setUomDialogMode] = useState('create');
  const [uomEditRow, setUomEditRow] = useState(null);

  const currentPage = page + 1;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getUomList({
        page: currentPage,
        pageSize,
        keyword: searchTerm.trim() || undefined,
        isActive: showOnlyActive ? true : undefined,
      });
      setRows(result.items ?? []);
      setTotalItems(result.totalItems ?? 0);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Không tải được danh sách đơn vị tính.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchTerm, showOnlyActive]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const handleRefresh = () => {
    fetchList();
  };

  const handleToggleStatus = async (uom) => {
    if (!canManage) return;
    try {
      await toggleUomStatus(uom.uomId, !uom.isActive);
      setRows((prev) =>
        prev.map((r) => (r.uomId === uom.uomId ? { ...r, isActive: !r.isActive } : r))
      );
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Không đổi được trạng thái.');
    }
  };

  const handleOpenCreateUom = () => {
    setUomEditRow(null);
    setUomDialogMode('create');
    setUomDialogOpen(true);
  };

  const handleOpenEditUom = (u) => {
    setUomEditRow(u);
    setUomDialogMode('edit');
    setUomDialogOpen(true);
  };

  const handleUomDialogSuccess = async (payload) => {
    if (payload.mode === 'edit') {
      await updateUom(payload.uomId, { uomCode: payload.uomCode, uomName: payload.uomName, isActive: payload.isActive });
    } else {
      await createUom({ uomCode: payload.uomCode, uomName: payload.uomName });
    }
    fetchList();
  };

  return (
    <Box
      sx={{
        height: '100%',
        minHeight: 0,
        minWidth: 0,
        overflow: 'visible',
        display: 'flex',
        flexDirection: 'column',
        pt: 0,
        pb: 2,
        width: '100%',
        maxWidth: '100%',
        ml: 0,
        mr: 0,
        boxSizing: 'border-box',
      }}
    >
      <Box sx={{ flexShrink: 0, mb: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
        <Typography
          variant="h4"
          component="h1"
          fontWeight="800"
          sx={{
            background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
            backgroundClip: 'text',
            textFillColor: 'transparent',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            whiteSpace: 'nowrap',
            mb: 0.5,
          }}
        >
          Đơn vị tính
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600 }}>
          Quản lý danh sách đơn vị tính dùng cho vật tư (Cái, Hộp, kg, …).
        </Typography>
      </Box>

      <Box
        className="list-view"
        sx={{
          flex: 1,
          minHeight: 0,
          minWidth: 0,
          overflow: 'visible',
          display: 'flex',
          flexDirection: 'column',
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
        <Card className="list-filter-card" sx={{ mb: 1, borderRadius: 3, border: '1px solid rgba(0,0,0,0.12)', boxShadow: (t) => t.shadows[1] }}>
          <CardContent sx={{ '&.MuiCardContent-root:last-child': { pb: 2 }, pt: 1, px: 1.5 }}>
            <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 1.5, alignItems: isMobile ? 'stretch' : 'center', flexWrap: 'wrap' }}>
              <SearchInput
                placeholder="Tìm theo mã, tên đơn vị tính..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(0);
                }}
                onKeyDown={(e) => e.key === 'Enter' && (setPage(0), fetchList())}
                sx={{ flex: '1 1 240px', minWidth: isMobile ? '100%' : 240, maxWidth: isMobile ? '100%' : 520 }}
              />
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', ml: isMobile ? 0 : 'auto', flexWrap: 'wrap' }}>
                <IconButton
                  size="small"
                  onClick={(e) => setFilterAnchor(e.currentTarget)}
                  title="Bộ lọc"
                  sx={{ border: 1, borderColor: 'divider' }}
                >
                  <Filter size={18} />
                </IconButton>
                {canManage && (
                  <Button
                    variant="contained"
                    startIcon={<Plus size={18} />}
                    sx={{ fontSize: 13, fontWeight: 600, textTransform: 'none', borderRadius: 2, minHeight: 36, px: 2 }}
                    onClick={handleOpenCreateUom}
                  >
                    Thêm đơn vị tính
                  </Button>
                )}
                <IconButton size="small" onClick={handleRefresh} title="Làm mới">
                  <RefreshCw size={18} />
                </IconButton>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {error && (
          <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 1 }}>
            {error}
          </Alert>
        )}

        <Card
          className="list-grid-card"
          sx={{ flex: 1, minHeight: 400, overflow: 'visible', borderRadius: 3, border: '1px solid rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column' }}
        >
          <CardContent sx={{ p: 0, '&:last-child': { pb: 0 }, flex: 1, display: 'flex', flexDirection: 'column' }}>
            <Box className="list-grid-wrapper" sx={{ flex: 1, minHeight: 360, overflow: 'visible' }}>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 280 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <TableContainer sx={{ flex: 1, width: '100%', overflowY: 'auto', overflowX: 'hidden' }}>
                  <Table size="small" sx={{ width: '100%', tableLayout: 'fixed' }}>
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'grey.50' }}>
                        <TableCell sx={{ fontWeight: 600, width: 52, minWidth: 52, maxWidth: 52 }} align="center">STT</TableCell>
                        <TableCell sx={{ fontWeight: 600, width: '48%', minWidth: 140, px: 1.25 }}>Tên đơn vị tính</TableCell>
                        <TableCell sx={{ fontWeight: 600, width: '18%', minWidth: 100, px: 1.25 }}>Trạng thái</TableCell>
                        <TableCell sx={{ fontWeight: 600, width: '14%', minWidth: 100, px: 1.25 }} align="right">Hành động</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {rows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                            {error ? 'Có lỗi khi tải dữ liệu.' : 'Chưa có đơn vị tính nào.'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        rows.map((u, index) => (
                          <TableRow key={u.uomId} hover>
                            <TableCell align="center" sx={{ width: 52, minWidth: 52, maxWidth: 52, fontVariantNumeric: 'tabular-nums' }}>
                              {(currentPage - 1) * pageSize + index + 1}
                            </TableCell>
                            <TableCell sx={{ px: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 320 }}>
                              {u.uomName}
                            </TableCell>
                            <TableCell sx={{ px: 1.25 }}>
                              <Chip
                                label={u.isActive ? 'Hoạt động' : 'Tắt'}
                                size="small"
                                color={u.isActive ? 'success' : 'default'}
                                sx={{ borderRadius: 1.5 }}
                              />
                            </TableCell>
                            <TableCell align="right" sx={{ px: 1.25 }}>
                              {canManage && (
                                <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25 }}>
                                  <Tooltip title={u.isActive ? 'Tắt' : 'Bật'}>
                                    <IconButton size="small" onClick={() => handleToggleStatus(u)} aria-label={u.isActive ? 'Tắt' : 'Bật'}>
                                      <Power size={18} color={u.isActive ? '#2e7d32' : '#757575'} />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Chỉnh sửa">
                                    <IconButton size="small" aria-label="Chỉnh sửa" onClick={() => handleOpenEditUom(u)}>
                                      <Edit3 size={18} />
                                    </IconButton>
                                  </Tooltip>
                                </Box>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          </CardContent>
        </Card>

        {!loading && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end', gap: 2, py: 1.5, flexShrink: 0 }}>
            <Typography variant="body2" color="text.secondary" component="span" sx={{ whiteSpace: 'nowrap' }}>Số dòng / trang:</Typography>
            <FormControl size="small" sx={{ minWidth: 72 }}>
              <Select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }} sx={{ height: 32, fontSize: '0.875rem' }}>
                {ROWS_PER_PAGE_OPTIONS.map((n) => (
                  <MenuItem key={n} value={n}>{n}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Typography variant="body2" color="text.secondary" component="span" sx={{ whiteSpace: 'nowrap' }}>
              {(totalItems === 0 ? 0 : page * pageSize + 1)}–{Math.min((page + 1) * pageSize, totalItems)} / {totalItems} (Tổng {totalPages} trang)
            </Typography>
            <Button size="small" variant="outlined" disabled={page <= 0} onClick={() => setPage((p) => p - 1)} sx={{ minWidth: 36, textTransform: 'none' }}>Trước</Button>
            <Typography variant="body2" color="text.secondary" sx={{ px: 1.5, minWidth: 72, textAlign: 'center' }}>Trang {totalPages > 0 ? currentPage : 0} / {totalPages || 1}</Typography>
            <Button size="small" variant="outlined" disabled={page >= totalPages - 1 || totalItems === 0} onClick={() => setPage((p) => p + 1)} sx={{ minWidth: 36, textTransform: 'none' }}>Sau</Button>
          </Box>
        )}

        <Popover
          open={Boolean(filterAnchor)}
          anchorEl={filterAnchor}
          onClose={() => setFilterAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        >
          <Box sx={{ p: 1.5 }}>
            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
              Bộ lọc
            </Typography>
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={showOnlyActive}
                  onChange={(e) => {
                    setShowOnlyActive(e.target.checked);
                    setPage(0);
                  }}
                />
              }
              label="Chỉ hiển thị đang hoạt động"
            />
          </Box>
        </Popover>

        <UomFormDialog
          open={uomDialogOpen}
          onClose={() => setUomDialogOpen(false)}
          mode={uomDialogMode}
          editRow={uomEditRow}
          onSuccess={handleUomDialogSuccess}
        />
      </Box>
    </Box>
  );
};

export default ViewUomList;
