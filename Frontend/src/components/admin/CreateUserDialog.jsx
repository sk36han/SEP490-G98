import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  InputAdornment,
  Typography,
  Box,
} from "@mui/material";
import { User, Mail, Key, CreditCard } from "lucide-react";
import { ROLE_OPTIONS } from "../../shared/constants/roles";
import { generateUsername } from "../../shared/utils/stringUtils";

const inputSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: 2,
    bgcolor: "white",
    "& fieldset": { borderColor: "divider" },
    "&:hover fieldset": { borderColor: "primary.light" },
    "&.Mui-focused fieldset": { borderWidth: 2 },
  },
};

const CreateUserDialog = ({
  open,
  formData,
  onFormChange,
  onSubmit,
  onClose,
  submitting = false,
}) => {
  const [showConfirmClose, setShowConfirmClose] = React.useState(false);

  const hasFormData = Boolean(
    (formData.email ?? "").trim() ||
      (formData.fullName ?? "").trim() ||
      (formData.username ?? "").trim() ||
      (formData.gender ?? "") ||
      (formData.citizenId ?? "").trim() ||
      (formData.roleId !== undefined && formData.roleId !== 2)
  );

  const handleRequestClose = () => {
    if (hasFormData) setShowConfirmClose(true);
    else onClose();
  };

  const handleConfirmClose = () => {
    setShowConfirmClose(false);
    onClose();
  };

  const handleFullNameChange = (e) => {
    const newName = e.target.value;
    const newUsername = generateUsername(newName);
    onFormChange({ ...formData, fullName: newName, username: newUsername });
  };

  return (
    <>
    <Dialog
      open={open}
      onClose={(e, reason) => {
        if (reason === "backdropClick" || reason === "escapeKeyDown") {
          handleRequestClose();
        } else {
          onClose();
        }
      }}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: "hidden",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
        },
      }}
    >
      <DialogTitle
        sx={{
          background: "linear-gradient(135deg, #1976D2 0%, #1565C0 100%)",
          color: "white",
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          px: 3,
          py: 2,
        }}
      >
        <Typography
          variant="h6"
          component="div"
          sx={{
            fontFamily: "'Be Vietnam Pro', sans-serif",
            fontWeight: 700,
            letterSpacing: "0.02em",
            textAlign: "center",
            fontSize: "1.2rem",
            textShadow: "0 1px 2px rgba(0,0,0,0.1)",
          }}
        >
          Tạo tài khoản mới
        </Typography>
      </DialogTitle>
      <form onSubmit={onSubmit}>
        <DialogContent sx={{ p: 0, bgcolor: "grey.50" }}>
          <Box sx={{ px: 3, pt: 3, pb: 1 }}>
            <Typography
              variant="subtitle2"
              color="text.secondary"
              sx={{ mb: 1.5, fontWeight: 600 }}
            >
              Thông tin cơ bản
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sx={{ flexBasis: "100%", width: "100%", maxWidth: "100%" }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Email"
                  type="email"
                  placeholder="user@company.com"
                  value={formData.email}
                  onChange={(e) =>
                    onFormChange({ ...formData, email: e.target.value })
                  }
                  required
                  sx={inputSx}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start" sx={{ mr: 1 }}>
                        <Mail
                          size={18}
                          style={{ color: "var(--mui-palette-text-secondary)" }}
                        />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sx={{ flexBasis: "100%", width: "100%", maxWidth: "100%" }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Họ và tên"
                  placeholder="VD: Nguyễn Văn A"
                  value={formData.fullName}
                  onChange={handleFullNameChange}
                  required
                  sx={inputSx}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start" sx={{ mr: 1 }}>
                        <User
                          size={18}
                          style={{ color: "var(--mui-palette-text-secondary)" }}
                        />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={6} sx={{ width: "50%", maxWidth: "50%", flexBasis: "50%" }}>
                <FormControl fullWidth size="small" sx={inputSx}>
                  <InputLabel id="create-gender-label">Giới tính</InputLabel>
                  <Select
                    labelId="create-gender-label"
                    value={formData.gender ?? ""}
                    label="Giới tính"
                    onChange={(e) =>
                      onFormChange({ ...formData, gender: e.target.value })
                    }
                  >
                    <MenuItem value="male">Nam</MenuItem>
                    <MenuItem value="female">Nữ</MenuItem>
                    <MenuItem value="other">Khác</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6} sx={{ width: "50%", maxWidth: "50%", flexBasis: "50%" }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Số căn cước công dân"
                  placeholder="VD: 001099012345"
                  value={formData.citizenId ?? ""}
                  onChange={(e) =>
                    onFormChange({ ...formData, citizenId: e.target.value })
                  }
                  sx={inputSx}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start" sx={{ mr: 1 }}>
                        <CreditCard
                          size={18}
                          style={{ color: "var(--mui-palette-text-secondary)" }}
                        />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={6} sx={{ width: "50%", maxWidth: "50%", flexBasis: "50%" }}>
                <FormControl fullWidth size="small" sx={inputSx}>
                  <InputLabel id="create-role-label">Vai trò</InputLabel>
                  <Select
                    labelId="create-role-label"
                    value={formData.roleId}
                    label="Vai trò"
                    onChange={(e) =>
                      onFormChange({ ...formData, roleId: e.target.value })
                    }
                  >
                    {Object.entries(ROLE_OPTIONS).map(([id, name]) => (
                      <MenuItem key={id} value={parseInt(id)}>
                        {name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>
          <Box sx={{ px: 3, py: 2 }}>
            <Typography
              variant="subtitle2"
              color="text.secondary"
              sx={{ mb: 1.5, fontWeight: 600 }}
            >
              Tên đăng nhập
            </Typography>
            <TextField
              fullWidth
              size="small"
              label="Username"
              value={formData.username ? `${formData.username}` : ''}
              placeholder="Sẽ tạo dạng: thangvd1, thangvd2..."
              InputProps={{
                readOnly: true,
                startAdornment: (
                  <InputAdornment position="start" sx={{ mr: 1 }}>
                    <Key
                      size={18}
                      style={{ color: "var(--mui-palette-text-secondary)" }}
                    />
                  </InputAdornment>
                ),
              }}
              helperText="Tự động tạo từ họ tên + số thứ tự (hiển thị đầy đủ sau khi tạo)"
              sx={{
                ...inputSx,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  bgcolor: "grey.100",
                  "& fieldset": { borderColor: "divider" },
                },
                "& .MuiFormHelperText-root": { fontSize: "0.75rem", mt: 0.5 },
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions
          sx={{
            px: 3,
            py: 2,
            borderTop: "1px solid",
            borderColor: "divider",
            bgcolor: "grey.50",
            gap: 1.5,
          }}
        >
          <Button
            onClick={handleRequestClose}
            variant="outlined"
            color="inherit"
            sx={{
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 600,
              minWidth: 100,
            }}
          >
            Hủy bỏ
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={submitting}
            sx={{
              px: 3,
              minWidth: 140,
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 600,
              background: "linear-gradient(135deg, #1976D2 0%, #1565C0 100%)",
              boxShadow: "0 2px 8px rgba(25, 118, 210, 0.35)",
              "&:hover": { boxShadow: "0 4px 12px rgba(25, 118, 210, 0.4)" },
            }}
          >
            {submitting ? "Đang tạo..." : "Tạo tài khoản"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>

    <Dialog
      open={showConfirmClose}
      onClose={() => setShowConfirmClose(false)}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { borderRadius: 2 } }}
    >
      <DialogTitle sx={{ fontWeight: 600 }}>Xác nhận</DialogTitle>
      <DialogContent>
        <Typography>Dữ liệu chưa lưu. Bạn có chắc muốn thoát?</Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button onClick={() => setShowConfirmClose(false)} variant="outlined" color="inherit" sx={{ borderRadius: 2, textTransform: "none" }}>
          Không
        </Button>
        <Button onClick={handleConfirmClose} variant="contained" color="primary" sx={{ borderRadius: 2, textTransform: "none" }}>
          Có, thoát
        </Button>
      </DialogActions>
    </Dialog>
    </>
  );
};

export default CreateUserDialog;
