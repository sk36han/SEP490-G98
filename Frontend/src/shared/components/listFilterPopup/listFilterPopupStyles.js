/** Shared visual tokens for draggable list filter panels (View*List pages). */

export const LIST_FILTER_FONT_STACK =
    "'Be Vietnam Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

export function getListFilterPaperSx({
    width = 360,
    maxHeight = '75vh',
    left = 300,
    top = 110,
} = {}) {
    return {
        position: 'fixed',
        left,
        top,
        width,
        maxHeight,
        borderRadius: '12px',
        border: '1px solid rgba(0, 0, 0, 0.08)',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04)',
        overflow: 'hidden',
        zIndex: 1300,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: '#ffffff',
    };
}

export const LIST_FILTER_HEADER_SX = {
    cursor: 'move',
    px: 2.5,
    py: 2,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid #f3f4f6',
};

export const LIST_FILTER_BODY_SX = {
    p: 2.5,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    overflowY: 'auto',
    flex: 1,
    minHeight: 0,
    '&::-webkit-scrollbar': { width: '6px' },
    '&::-webkit-scrollbar-track': { bgcolor: 'transparent' },
    '&::-webkit-scrollbar-thumb': {
        bgcolor: '#d1d5db',
        borderRadius: '3px',
        '&:hover': { bgcolor: '#9ca3af' },
    },
};

export const LIST_FILTER_LABEL_SX = {
    fontSize: '12px',
    color: '#6b7280',
    mb: 0.75,
    fontWeight: 500,
};

export const LIST_FILTER_INPUT_SX = {
    '& .MuiOutlinedInput-root': {
        height: 40,
        bgcolor: '#f3f4f6',
        borderRadius: '10px',
        fontSize: '13px',
        '& fieldset': { border: 'none' },
        '&:hover': { bgcolor: '#e5e7eb' },
        '&.Mui-focused': {
            bgcolor: '#ffffff',
            boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
            '& fieldset': { border: '1px solid #3b82f6' },
        },
    },
    '& .MuiInputBase-input': { fontSize: '13px' },
};

/** Autocomplete panel when options need the same look as list pages */
export const LIST_FILTER_DROPDOWN_PAPER_SX = {
    borderRadius: '10px',
    mt: 1,
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.08)',
    border: '1px solid rgba(0, 0, 0, 0.08)',
    overflow: 'hidden',
    '& .MuiAutocomplete-listbox': {
        fontSize: '13px',
        fontFamily: LIST_FILTER_FONT_STACK,
        padding: '4px 0',
        maxHeight: '240px',
    },
    '& .MuiAutocomplete-option': {
        fontSize: '13px',
        fontFamily: LIST_FILTER_FONT_STACK,
        padding: '8px 12px',
        '&:hover': { bgcolor: '#f3f4f6' },
        '&[aria-selected="true"]': { bgcolor: '#e0f2fe' },
    },
};
