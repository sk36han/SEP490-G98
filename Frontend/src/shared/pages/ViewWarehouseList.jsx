import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import { removeDiacritics } from "../utils/stringUtils";
import SearchInput from "../components/SearchInput";
import "../styles/ListView.css";

/** Mock danh sách kho – có thể thay bằng API */
const MOCK_WAREHOUSES = [
  {
    warehouseId: 1,
    warehouseCode: "WH001",
    warehouseName: "Kho chính",
    address: "123 Đường A, Quận 1, TP.HCM",
    isActive: true,
    createdAt: "2025-02-01T08:00:00",
  },
  {
    warehouseId: 2,
    warehouseCode: "WH002",
    warehouseName: "Kho phụ",
    address: "456 Đường B, Quận 2, TP.HCM",
    isActive: true,
    createdAt: "2025-02-05T09:00:00",
  },
  {
    warehouseId: 3,
    warehouseCode: "WH003",
    warehouseName: "Kho lạnh",
    address: "789 Đường C, Quận 7, TP.HCM",
    isActive: true,
    createdAt: "2025-02-10T10:00:00",
  },
  {
    warehouseId: 4,
    warehouseCode: "WH004",
    warehouseName: "Kho tạm ngưng",
    address: "321 Đường D, Quận Bình Thạnh",
    isActive: false,
    createdAt: "2025-01-15T14:00:00",
  },
];

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
const ROWS_PER_PAGE_OPTIONS = [10, 20, 50, 100];

const ViewWarehouseList = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const navigate = useNavigate();
  const [list, setList] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [visibleColumnIds, setVisibleColumnIds] = useState(
    () => new Set(DEFAULT_VISIBLE_COLUMN_IDS),
  );
  const [columnSelectorAnchor, setColumnSelectorAnchor] = useState(null);

  useEffect(() => {
    setList(MOCK_WAREHOUSES);
  }, []);

  const filteredList = React.useMemo(() => {
    if (!searchTerm.trim()) return list;
    const normalize = (str) =>
      str ? removeDiacritics(String(str).toLowerCase()) : "";
    const term = normalize(searchTerm.trim());
    return list.filter((wh) => {
      const matchCode = normalize(wh.warehouseCode).includes(term);
      const matchName = normalize(wh.warehouseName).includes(term);
      const matchAddress = normalize(wh.address).includes(term);
      return matchCode || matchName || matchAddress;
    });
  }, [list, searchTerm]);

  useEffect(() => {
    setPage(0);
  }, [searchTerm]);

  const totalCount = filteredList.length;
  const start = totalCount === 0 ? 0 : page * pageSize + 1;
  const end = Math.min((page + 1) * pageSize, totalCount);
  const totalPages =
    pageSize > 0 ? Math.max(0, Math.ceil(totalCount / pageSize)) : 0;
  const paginatedList = filteredList.slice(
    page * pageSize,
    (page + 1) * pageSize,
  );

  const handlePageChange = (newPage) => setPage(newPage);
  const handlePageSizeChange = (e) => {
    setPageSize(Number(e.target.value));
    setPage(0);
  };

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
    <Box sx={{ pt: 0, pb: 2, mt: -3 }}>
      <Box
        sx={{
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
          slotProps={{ paper: { sx: { mt: 1.5, p: 2, minWidth: 220 } } }}
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
          </FormGroup>
        </Popover>

        <Card
          className="list-grid-card"
          sx={{
            borderRadius: 3,
            overflow: "hidden",
            border: "1px solid rgba(0,0,0,0.12)",
            boxShadow: (t) => t.shadows[1],
            p: 1,
          }}
        >
          <Box
            className="list-grid-wrapper"
            sx={{ position: "relative", minHeight: "calc(100vh - 220px)" }}
          >
            {paginatedList.length === 0 ? (
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
                  maxHeight: "calc(100vh - 240px)",
                  border: "1px solid rgba(0,0,0,0.2)",
                  borderRadius: 2,
                  overflow: "hidden",
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
                            bgcolor: "grey.50",
                            whiteSpace: "nowrap",
                          }}
                          align={col.id === "actions" ? "right" : "left"}
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
                              <TableCell key={col.id} align="left">
                                {page * pageSize + index + 1}
                              </TableCell>
                            );
                          if (col.id === "isActive")
                            return (
                              <TableCell key={col.id} align="left">
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
                                sx={{ fontSize: "0.8rem" }}
                              >
                                {formatDate(wh.createdAt)}
                              </TableCell>
                            );
                          if (col.id === "actions") {
                            return (
                              <TableCell key={col.id} align="right">
                                <Tooltip title="Xem chi tiết">
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
                            <TableCell key={col.id} align="left">
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
            mt: 0,
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 2,
          }}
        >
          <Typography
            variant="body2"
            color="text.secondary"
            component="span"
            sx={{ whiteSpace: "nowrap" }}
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
            sx={{ whiteSpace: "nowrap" }}
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
