import { Paper, Box, Typography, IconButton } from '@mui/material';
import { X } from 'lucide-react';
import { useListFilterPopupDrag } from './useListFilterPopupDrag';
import { getListFilterPaperSx, LIST_FILTER_HEADER_SX, LIST_FILTER_BODY_SX } from './listFilterPopupStyles';
import { ListFilterPopupFooter } from './ListFilterPopupFooter';

/**
 * Unified shell: fixed panel, drag header, scroll body, optional footer.
 * Use across View*List filter popups for consistent layout.
 */
export function ListFilterPopupShell({
    open,
    onClose,
    title = 'Bộ lọc',
    children,
    onClear,
    onApply,
    footer,
    width = 360,
    maxHeight = '75vh',
    left = 300,
    top = 110,
    clearLabel,
    applyLabel,
}) {
    const { boxRef, handleMouseDown } = useListFilterPopupDrag();

    if (!open) return null;

    const defaultFooter =
        footer !== undefined ? (
            footer
        ) : onClear && onApply ? (
            <ListFilterPopupFooter onClear={onClear} onApply={onApply} clearLabel={clearLabel} applyLabel={applyLabel} />
        ) : null;

    return (
        <Paper ref={boxRef} elevation={0} sx={getListFilterPaperSx({ width, maxHeight, left, top })}>
            <Box onMouseDown={handleMouseDown} sx={LIST_FILTER_HEADER_SX}>
                <Typography variant="subtitle2" fontWeight={600} sx={{ fontSize: '15px', color: '#111827' }}>
                    {title}
                </Typography>
                <IconButton
                    size="small"
                    onClick={onClose}
                    aria-label="Đóng"
                    sx={{
                        p: 0.5,
                        color: '#6b7280',
                        '&:hover': {
                            bgcolor: '#f3f4f6',
                            color: '#111827',
                        },
                    }}
                >
                    <X size={18} />
                </IconButton>
            </Box>
            <Box sx={LIST_FILTER_BODY_SX}>{children}</Box>
            {defaultFooter}
        </Paper>
    );
}
