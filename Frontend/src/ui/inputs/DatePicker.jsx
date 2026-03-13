import { DatePicker } from '@mui/x-date-pickers/DatePicker';

export function DatePickerField({ sx, ...props }) {
  return (
    <DatePicker
      slotProps={{ textField: { size: 'small', sx } }}
      format="DD/MM/YYYY"
      {...props}
    />
  );
}
