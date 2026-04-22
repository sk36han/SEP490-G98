import { Box, Button } from '@mui/material';

export function ListFilterPopupFooter({ onClear, onApply, clearLabel = 'Xóa lọc', applyLabel = 'Áp dụng' }) {
    return (
        <Box
            sx={{
                px: 2.5,
                py: 2,
                display: 'flex',
                gap: 1.5,
                borderTop: '1px solid #f3f4f6',
                flexShrink: 0,
            }}
        >
            <Button
                variant="outlined"
                onClick={onClear}
                sx={{
                    flex: 1,
                    textTransform: 'none',
                    fontSize: '13px',
                    fontWeight: 500,
                    height: 38,
                    borderRadius: '10px',
                    borderColor: '#e5e7eb',
                    color: '#6b7280',
                    '&:hover': {
                        borderColor: '#d1d5db',
                        bgcolor: '#f9fafb',
                    },
                }}
            >
                {clearLabel}
            </Button>
            <Button
                variant="contained"
                onClick={onApply}
                sx={{
                    flex: 1,
                    textTransform: 'none',
                    fontSize: '13px',
                    fontWeight: 500,
                    height: 38,
                    borderRadius: '10px',
                    bgcolor: '#3b82f6',
                    boxShadow: 'none',
                    '&:hover': {
                        bgcolor: '#2563eb',
                        boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
                    },
                }}
            >
                {applyLabel}
            </Button>
        </Box>
    );
}
