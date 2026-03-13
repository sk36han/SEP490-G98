import { FormDialog } from '../../ui/dialogs/FormDialog';
import { Button } from '../../ui/buttons/Button';

export function BaseFormDialog({ open, onClose, title, onSubmit, loading, children, actions, ...props }) {
  return (
    <FormDialog open={open} onClose={onClose} title={title}
      actions={actions || (<><Button variant="outlined" onClick={onClose}>Hủy</Button><Button type="submit" form="form-dialog" loading={loading}>Lưu</Button></>)}
      {...props}
    >
      <form id="form-dialog" onSubmit={onSubmit}>{children}</form>
    </FormDialog>
  );
}
