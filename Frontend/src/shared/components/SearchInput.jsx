import React from 'react';
import { TextField, InputAdornment } from '@mui/material';
import { Search } from 'lucide-react';

const defaultSx = {
    '& .MuiOutlinedInput-root': {
        borderRadius: 3,
        backgroundColor: 'white',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06), 0 4px 14px rgba(0,0,0,0.08)',
        fontSize: '0.8125rem',
        '& fieldset': { borderColor: 'transparent' },
        '&:hover fieldset': { borderColor: 'primary.main' },
        '&.Mui-focused fieldset': { borderColor: 'primary.main' },
    },
    '& .MuiInputBase-input::placeholder': {
        fontSize: '0.8125rem',
    },
};

/**
 * Thanh tìm kiếm dùng chung – UI thống nhất (icon Search, viền, bo góc).
 * Tìm kiếm theo value/onChange (không cần nút "Tìm kiếm"); Enter có thể dùng onKeyDown.
 */
const SearchInput = ({ placeholder = 'Tìm kiếm…', value, onChange, onKeyDown, sx = {}, className, ...rest }) => (
    <TextField
        size="small"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        className={className}
        sx={{ ...defaultSx, ...sx }}
        InputProps={{
            startAdornment: (
                <InputAdornment position="start">
                    <Search size={20} style={{ opacity: 0.6 }} />
                </InputAdornment>
            ),
        }}
        {...rest}
    />
);

export default SearchInput;
