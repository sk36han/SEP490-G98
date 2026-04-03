import { TextField as MuiTextField } from '@mui/material';

const inputSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: 2,
    '& fieldset': { borderColor: 'divider' }
  },
  '& .MuiInputLabel-root': { overflow: 'visible' },
};

export function TextField({ sx, ...props }) {
  return <MuiTextField sx={{ ...inputSx, ...sx }} {...props} />;
}
