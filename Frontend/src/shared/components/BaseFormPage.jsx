import { Box, Paper, Typography, Grid } from '@mui/material';
import { Button } from '../../ui/buttons/Button';

export function BaseFormPage({ title, onSubmit, loading, children, actions, sx, ...props }) {
  return (
    <Box sx={{ p: 3, ...sx }}>
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>{title}</Typography>
      <Paper sx={{ p: 3 }}>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
          <Grid container spacing={3}>{children}</Grid>
          {actions || <Box sx={{ display: 'flex', gap: 2, mt: 3, justifyContent: 'flex-end' }}><Button type="submit" variant="contained" loading={loading}>Lưu</Button></Box>}
        </form>
      </Paper>
    </Box>
  );
}
