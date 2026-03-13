import { Dialog as MuiDialog } from '@mui/material';

export function Dialog({ PaperProps, ...props }) {
  return (
    <MuiDialog
      PaperProps={{
        ...PaperProps,
        sx: { borderRadius: 3, ...PaperProps?.sx }
      }}
      {...props}
    />
  );
}
