import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { TextField, type TextFieldProps } from './TextField';

export type ControlledTextFieldProps<T extends FieldValues> = Omit<
  TextFieldProps,
  'value' | 'onChangeText' | 'onBlur' | 'error'
> & {
  control: Control<T>;
  name: Path<T>;
  error?: string;
  /**
   * Reescreve o texto a cada tecla, para campos com máscara.
   *
   * Roda na mudança, e não na validação, porque é isso que faz a barra de uma
   * data aparecer enquanto se digita em vez de corrigir a pessoa ao sair do
   * campo. Sem esta porta, um campo mascarado teria de recriar o bloco de
   * `Controller` inteiro só para embrulhar o `onChange` — que é exatamente o
   * que este componente existe para evitar.
   */
  format?: (text: string) => string;
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
  format,
  ...fieldProps
}: ControlledTextFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, onBlur, value } }) => (
        <TextField
          value={typeof value === 'string' ? value : ''}
          onChangeText={format ? (text) => onChange(format(text)) : onChange}
          onBlur={onBlur}
          error={error}
          {...fieldProps}
        />
      )}
    />
  );
}
