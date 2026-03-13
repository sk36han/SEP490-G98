import { Button as MuiButton } from '@mui/material';

const variantSx = {
  contained: { boxShadow: 'none', '&:hover': { boxShadow: 'none' } },
  outlined: { borderRadius: 2 },
  text: { borderRadius: 2 },
};

export function Button({ variant = 'contained', sx, ...props }) {
  return (
    <MuiButton
      variant={variant}
      sx={{ borderRadius: 2, ...variantSx[variant], ...sx }}
      {...props}
    />
  );
}
