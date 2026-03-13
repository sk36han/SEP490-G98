import { IconButton as MuiIconButton } from '@mui/material';

export function IconButton({ sx, ...props }) {
  return <MuiIconButton sx={{ borderRadius: 2, ...sx }} {...props} />;
}
