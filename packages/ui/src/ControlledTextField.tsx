import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { TextField, type TextFieldProps } from './TextField';

export type ControlledTextFieldProps<T extends FieldValues> = Omit<
  TextFieldProps,
  'value' | 'onChangeText' | 'onBlur' | 'error'
> & {
  control: Control<T>;
  name: Path<T>;
  error?: string;
};

/**
 * Liga o TextField ao React Hook Form.
 *
 * Sem isto, cada campo repetia o mesmo bloco de `Controller` com `onChange`,
 * `onBlur` e `value` — seis cópias só nas telas de autenticação, todas iguais
 * exceto pelo nome do campo.
 */
export function ControlledTextField<T extends FieldValues>({
  control,
  name,
  error,
  ...fieldProps
}: ControlledTextFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, onBlur, value } }) => (
        <TextField
          value={typeof value === 'string' ? value : ''}
          onChangeText={onChange}
          onBlur={onBlur}
          error={error}
          {...fieldProps}
        />
      )}
    />
  );
}
