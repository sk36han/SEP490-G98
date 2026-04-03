import { useState, useCallback } from 'react';

export function useDialog(initialState = false) {
  const [open, setOpen] = useState(initialState);
  const [data, setData] = useState(null);

  const openDialog = useCallback((initialData = null) => {
    setData(initialData);
    setOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setOpen(false);
    setData(null);
  }, []);

  const toggleDialog = useCallback(() => setOpen(prev => !prev), []);

  return { open, data, openDialog, closeDialog, toggleDialog };
}
