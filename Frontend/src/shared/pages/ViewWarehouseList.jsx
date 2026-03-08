import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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
  IconButton,
  Tooltip,
  Popover,
  FormGroup,
  FormControlLabel,
  Checkbox,
  FormControl,
  Select,
  MenuItem,
  Chip,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import {
  Warehouse as WarehouseIcon,
  Plus,
  Eye,
  Edit,
  Columns,
  CloudOff,
} from "lucide-react";
import SearchInput from "../components/SearchInput";
import { getWarehouses } from "../lib/warehouseService";
import "../styles/ListView.css";

const WAREHOUSE_COLUMNS = [
  { id: "stt", label: "STT", getValue: () => "" },
  {
    id: "warehouseCode",
    label: "Mã kho",
    getValue: (row) => row.warehouseCode ?? "",
  },
  {
    id: "warehouseName",
    label: "Tên kho",
    getValue: (row) => row.warehouseName ?? "",
  },
  { id: "address", label: "Địa chỉ", getValue: (row) => row.address ?? "-" },
  {
    id: "isActive",
    label: "Trạng thái",
    getValue: (row) => (row.isActive ? "Hoạt động" : "Tắt"),
  },
  {
    id: "createdAt",
    label: "Ngày tạo",
    getValue: (row) => row.createdAt ?? "",
  },
  { id: "actions", label: "Hành động", getValue: () => "" },
];
const DEFAULT_VISIBLE_COLUMN_IDS = [
  "stt",
  "warehouseCode",
  "warehouseName",
  "address",
  "isActive",
  "actions",
];
const ROWS_PER_PAGE_OPTIONS = [7, 10, 20, 50, 100];

const getColumnWeight = (colId) => {
  switch (colId) {
    case "stt": return 0.6;
    case "warehouseCode": return 1.2;
    case "warehouseName": return 2;
    case "address": return 2;
    case "isActive": return 1.2;
    case "createdAt": return 1.2;
    case "actions": return 1.4;
    default: return 1;
  }
};
const STT_COLUMN_SX = { width: 52, minWidth: 52, maxWidth: 52, fontVariantNumeric: "tabular-nums", boxSizing: "border-box" };
const getColumnCellSx = (colId, widthPct) => {
  if (colId === "stt") return STT_COLUMN_SX;
  const base = { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", width: `${widthPct}%`, maxWidth: `${widthPct}%`, boxSizing: "border-box" };
  return colId === "actions" ? { ...base, overflow: "visible" } : base;
};

const ViewWarehouseList = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const navigate = useNavigate();
  const [list, setList] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(7);
  const [visibleColumnIds, setVisibleColumnIds] = useState(
    () => new Set(DEFAULT_VISIBLE_COLUMN_IDS),
  );
  const [columnSelectorAnchor, setColumnSelectorAnchor] = useState(null);

  const getApiParams = useCallback(
    () => ({ pageNumber: page + 1, pageSize }),
    [page, pageSize],
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getWarehouses(getApiParams());
      setList(res.items ?? []);
      setTotalRows(res.totalItems ?? 0);
    } catch (err) {
      setError(
        err?.response?.data?.message ??
          err?.response?.data?.Message ??
          err?.message ??
          "Không thể kết nối đến server",
      );
      setList([]);
      setTotalRows(0);
    } finally {
      setLoading(false);
    }
  }, [getApiParams]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalCount = totalRows;
  const start = totalCount === 0 ? 0 : page * pageSize + 1;
  const end = Math.min((page + 1) * pageSize, totalCount);
  const totalPages =
    pageSize > 0 ? Math.max(0, Math.ceil(totalCount / pageSize)) : 0;
  const paginatedList = list;

  const handlePageChange = (newPage) => setPage(newPage);
  const handlePageSizeChange = (e) => {
    setPageSize(Number(e.target.value));
    setPage(0);
  };

  const showOverlayError = Boolean(error && !loading);
  const showEmpty = !loading && !error && list.length === 0;

  const handleColumnVisibilityChange = (columnId, checked) => {
    setVisibleColumnIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(columnId);
      else next.delete(columnId);
      return next;
    });
  };
  const handleSelectAllColumns = (checked) => {
    setVisibleColumnIds(
      checked ? new Set(WAREHOUSE_COLUMNS.map((c) => c.id)) : new Set(),
    );
  };
  const totalWeight = WAREHOUSE_COLUMNS.filter((col) => visibleColumnIds.has(col.id)).reduce((acc, col) => acc + getColumnWeight(col.id), 0);
  const getColWidthPct = (colId) => (totalWeight > 0 ? (getColumnWeight(colId) / totalWeight) * 100 : 0);
  const visibleColumns = WAREHOUSE_COLUMNS.filter((col) =>
    visibleColumnIds.has(col.id),
  );
  const columnSelectorOpen = Boolean(columnSelectorAnchor);

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return (
      d.toLocaleDateString("vi-VN") +
      " " +
      d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
    );
  };

  return (
    <Box sx={{ height: "100%", minHeight: 0, minWidth: 0, overflow: "visible", display: "flex", flexDirection: "column", pt: 0, pb: 2, width: "100%", maxWidth: "100%", ml: 0, mr: 0, boxSizing: "border-box" }}>
      <Box
        sx={{
          flexShrink: 0,
          mb: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          textAlign: "left",
        }}
      >
        <Typography
          variant="h4"
          component="h1"
          gutterBottom
          fontWeight="800"
          sx={{
            background: "linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)",
            backgroundClip: "text",
            textFillColor: "transparent",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            textShadow: "0 2px 4px rgba(0,0,0,0.2), 0 1px 3px rgba(0,0,0,0.15)",
            whiteSpace: "nowrap",
          }}
        >
          Danh sách kho{" "}
        </Typography>
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{
            maxWidth: 560,
            wordBreak: "break-word",
            overflowWrap: "break-word",
          }}
        >
          Danh sách kho – tìm kiếm theo mã kho, tên kho, địa chỉ.
        </Typography>
      </Box>

      <Box
        className="list-view"
        sx={{
          flex: 1,
          minHeight: 0,
          minWidth: 0,
          overflow: "visible",
          display: "flex",
          flexDirection: "column",
          width: "100%",
          maxWidth: "100%",
          background:
            "linear-gradient(180deg, #ffffff 0%, rgba(255,255,255,0.97) 100%)",
          borderRadius: 3,
          p: 0.75,
          border: "1px solid",
          borderColor: "divider",
          boxShadow: (t) => t.shadows[1],
          boxSizing: "border-box",
        }}
      >
        <Card
          className="list-filter-card"
          sx={{
            mb: 1,
            borderRadius: 3,
            border: "1px solid rgba(0,0,0,0.12)",
            boxShadow: (t) => t.shadows[1],
          }}
        >
          <CardContent
            sx={{
              "&.MuiCardContent-root:last-child": { pb: 2 },
              pt: 1,
              px: 1.5,
            }}
          >
            <Box
              sx={{
                display: "flex",
                flexDirection: isMobile ? "column" : "row",
                gap: 1.5,
                alignItems: isMobile ? "stretch" : "center",
                flexWrap: "wrap",
              }}
            >
              <SearchInput
                placeholder="Tìm theo mã kho, tên kho, địa chỉ…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{
                  flex: "1 1 200px",
                  minWidth: isMobile ? "100%" : 200,
                  maxWidth: isMobile ? "100%" : 420,
                }}
              />
              <Tooltip title="Chọn cột hiển thị">
                <IconButton
                  color="primary"
                  onClick={(e) => setColumnSelectorAnchor(e.currentTarget)}
                  aria-label="Chọn cột"
                  sx={{ border: 1, borderColor: "divider" }}
                >
                  <Columns size={20} />
                </IconButton>
              </Tooltip>
              <Box
                sx={{
                  display: "flex",
                  gap: 1.5,
                  alignItems: "center",
                  ml: isMobile ? 0 : "auto",
                }}
              >
                <Button
                  className="list-page-btn"
                  variant="contained"
                  startIcon={<Plus size={18} />}
                  sx={{
                    fontSize: 13,
                    fontWeight: 600,
                    textTransform: "none",
                    borderRadius: 2,
                    minHeight: 36,
                    px: 2,
                  }}
                >
                  Thêm kho
                </Button>
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Popover
          open={columnSelectorOpen}
          anchorEl={columnSelectorAnchor}
          onClose={() => setColumnSelectorAnchor(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
          slotProps={{ paper: { sx: { mt: 1.5, p: 2, minWidth: 220, maxWidth: 520 } } }}
        >
          <Typography
            variant="subtitle2"
            fontWeight={600}
            sx={{ mb: 1.5, whiteSpace: "nowrap" }}
          >
            Chọn cột hiển thị
          </Typography>
          <FormGroup>
            <FormControlLabel
              control={
                <Checkbox
                  checked={visibleColumnIds.size === WAREHOUSE_COLUMNS.length}
                  indeterminate={
                    visibleColumnIds.size > 0 &&
                    visibleColumnIds.size < WAREHOUSE_COLUMNS.length
                  }
                  onChange={(e) => handleSelectAllColumns(e.target.checked)}
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
              {WAREHOUSE_COLUMNS.map((col) => (
                <FormControlLabel
                  key={col.id}
                  control={
                    <Checkbox
                      checked={visibleColumnIds.has(col.id)}
                      onChange={(e) =>
                        handleColumnVisibilityChange(col.id, e.target.checked)
                      }
                    />
                  }
                  label={col.label}
                />
              ))}
            </Box>
          </FormGroup>
        </Popover>

        <Card
          className="list-grid-card"
          sx={{
            flex: 1,
            minHeight: 400,
            minWidth: 0,
            overflow: "visible",
            display: "flex",
            flexDirection: "column",
            borderRadius: 3,
            border: "1px solid rgba(0,0,0,0.12)",
            boxShadow: (t) => t.shadows[1],
            p: 1,
          }}
        >
          <Box
            className="list-grid-wrapper"
            sx={{ flex: 1, minHeight: 360, minWidth: 0, overflow: "visible", display: "flex", flexDirection: "column", position: "relative" }}
          >
            {loading ? (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  py: 6,
                }}
              >
                <Typography color="text.secondary">Đang tải…</Typography>
              </Box>
            ) : showOverlayError ? (
              <Box
                className="list-grid-error-overlay"
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: 200,
                  backgroundColor: "rgba(255,255,255,0.95)",
                  gap: 1.5,
                }}
              >
                <CloudOff
                  size={40}
                  style={{ color: theme.palette.text.secondary }}
                />
                <Typography
                  variant="subtitle1"
                  fontWeight={600}
                  color="text.primary"
                >
                  Không thể kết nối đến máy chủ
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {error}
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => fetchData()}
                  sx={{ mt: 0.5, textTransform: "none" }}
                >
                  Thử lại
                </Button>
              </Box>
            ) : showEmpty ? (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  py: 6,
                  color: "text.secondary",
                }}
              >
                <WarehouseIcon
                  size={48}
                  style={{ marginBottom: 16, opacity: 0.5 }}
                />
                <Typography>Chưa có dữ liệu kho</Typography>
              </Box>
            ) : (
              <TableContainer
                sx={{
                  flex: 1,
                  minHeight: 0,
                  minWidth: 0,
                  width: "100%",
                  maxWidth: "100%",
                  border: "1px solid rgba(0,0,0,0.2)",
                  borderRadius: 2,
                  overflowY: "auto",
                  overflowX: "hidden",
                  boxSizing: "border-box",
                }}
              >
                <Table size="small" stickyHeader sx={{ width: "100%", tableLayout: "fixed" }}>
                  <TableHead>
                    <TableRow>
                      {visibleColumns.map((col) => (
                        <TableCell
                          key={col.id}
                          sx={{ ...getColumnCellSx(col.id, getColWidthPct(col.id)), fontWeight: 600, bgcolor: "grey.50" }}
                          align={col.id === "stt" ? "center" : col.id === "actions" ? "right" : "left"}
                        >
                          {col.label}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedList.map((wh, index) => (
                      <TableRow
                        key={wh.warehouseId}
                        hover
                        sx={{
                          "&:last-child td, &:last-child th": { border: 0 },
                        }}
                      >
                        {visibleColumns.map((col) => {
                          if (col.id === "stt")
                            return (
                              <TableCell key={col.id} align="center" sx={getColumnCellSx(col.id, getColWidthPct(col.id))}>
                                {page * pageSize + index + 1}
                              </TableCell>
                            );
                          if (col.id === "isActive")
                            return (
                              <TableCell key={col.id} align="left" sx={getColumnCellSx(col.id, getColWidthPct(col.id))}>
                                <Chip
                                  label={wh.isActive ? "Hoạt động" : "Tắt"}
                                  size="small"
                                  color={wh.isActive ? "success" : "default"}
                                  variant="filled"
                                  sx={{ borderRadius: 1.5 }}
                                />
                              </TableCell>
                            );
                          if (col.id === "createdAt")
                            return (
                              <TableCell
                                key={col.id}
                                align="left"
                                sx={{ ...getColumnCellSx(col.id, getColWidthPct(col.id)), fontSize: "0.8rem" }}
                              >
                                {formatDate(wh.createdAt)}
                              </TableCell>
                            );
                          if (col.id === "actions") {
                            return (
                              <TableCell key={col.id} align="right" sx={getColumnCellSx(col.id, getColWidthPct(col.id))}>
                                <Tooltip title="Xem chi tiết">
                                  <IconButton
                                    size="small"
                                    onClick={() => navigate(`/inventory/${wh.warehouseId}`)}
                                    sx={{
                                      color: "text.secondary",
                                      "&:hover": {
                                        color: "primary.main",
                                        bgcolor: "primary.lighter",
                                      },
                                    }}
                                  >
                                    <Eye size={18} />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Chỉnh sửa">
                                  <IconButton
                                    size="small"
                                    onClick={() => {}}
                                    sx={{
                                      color: "text.secondary",
                                      "&:hover": {
                                        color: "primary.main",
                                        bgcolor: "primary.lighter",
                                      },
                                    }}
                                  >
                                    <Edit size={18} />
                                  </IconButton>
                                </Tooltip>
                              </TableCell>
                            );
                          }
                          return (
                            <TableCell key={col.id} align="left" sx={getColumnCellSx(col.id, getColWidthPct(col.id))} title={col.getValue(wh)}>
                              {col.getValue(wh)}
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
            flexShrink: 0,
            mt: 1,
            pt: 1,
            pb: 0.5,
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 2,
            overflow: "visible",
            minHeight: 48,
          }}
        >
          <Typography
            variant="body2"
            color="text.secondary"
            component="span"
            sx={{ whiteSpace: "nowrap", flexShrink: 0 }}
          >
            Số dòng / trang:
          </Typography>
          <FormControl size="small" sx={{ minWidth: 72 }}>
            <Select
              value={pageSize}
              onChange={handlePageSizeChange}
              sx={{ height: 32, fontSize: "0.875rem" }}
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
            sx={{ whiteSpace: "nowrap", flexShrink: 0 }}
          >
            {start}–{end} / {totalCount} (Tổng {totalPages} trang)
          </Typography>
          <Button
            size="small"
            variant="outlined"
            disabled={page <= 0}
            onClick={() => handlePageChange(page - 1)}
            sx={{ minWidth: 36, textTransform: "none" }}
          >
            Trước
          </Button>
          <Typography variant="body2" color="text.secondary" component="span" sx={{ px: 1.5, minWidth: 72, textAlign: "center", flexShrink: 0 }}>
            Trang {page + 1} / {totalPages || 1}
          </Typography>
          <Button
            size="small"
            variant="outlined"
            disabled={end >= totalCount || totalCount === 0}
            onClick={() => handlePageChange(page + 1)}
            sx={{ minWidth: 36, textTransform: "none" }}
          >
            Sau
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default ViewWarehouseList;
