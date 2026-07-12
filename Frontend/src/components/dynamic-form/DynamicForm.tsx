import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { buildFieldsSchema, defaultValuesForFields } from '@/lib/zod-from-fields';
import { fetchRelationOptions } from './relation-options';
import type { CustomFieldDefinition } from '@/types/domain.types';

interface DynamicFormProps {
  fields: CustomFieldDefinition[];
  initialValues?: Record<string, unknown>;
  onSubmit: (values: Record<string, unknown>) => void;
  isSubmitting?: boolean;
  submitLabel?: string;
  /** Rendered above the dynamic fields — used to splice in fixed fields (e.g. Asset's name/location). */
  children?: React.ReactNode;
}

/**
 * Renders a standalone form purely from field metadata — used by Custom
 * Object create/edit (plan.md §7.4). When dynamic fields need to live inside
 * an *existing* form instead (e.g. Asset registration's category fields),
 * use <DynamicFieldInput> directly with that form's own register/control.
 */
export function DynamicForm({ fields, initialValues, onSubmit, isSubmitting, submitLabel = 'Save', children }: DynamicFormProps) {
  const sorted = [...fields].sort((a, b) => a.sortOrder - b.sortOrder);
  const schema = buildFieldsSchema(sorted);
  const defaults = { ...defaultValuesForFields(sorted), ...initialValues };

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema), defaultValues: defaults });

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
      {children}
      {sorted.map((def) => (
        <DynamicFieldInput
          key={def.id}
          def={def}
          register={register}
          control={control}
          error={(errors[def.fieldKey]?.message as string | undefined) ?? undefined}
        />
      ))}
      <Button type="submit" isLoading={isSubmitting}>
        {submitLabel}
      </Button>
    </form>
  );
}

interface DynamicFieldInputProps {
  def: CustomFieldDefinition;
  /** Defaults to `def.fieldKey` — pass an explicit dotted path (e.g. "customFieldValues.warrantyMonths") to nest inside a bigger form. */
  name?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: any;
  error?: string;
}

/** One field, rendered from metadata. Shared by DynamicForm and any host form that embeds custom fields inline (e.g. AssetsPage). */
export function DynamicFieldInput({ def, name, register, control, error }: DynamicFieldInputProps) {
  const fieldName = name ?? def.fieldKey;
  const label = def.isRequired ? `${def.label} *` : def.label;

  switch (def.fieldType) {
    case 'TEXT':
      return <Input label={label} error={error} {...register(fieldName)} />;
    case 'NUMBER':
      return <Input label={label} type="number" error={error} {...register(fieldName)} />;
    case 'DATE':
      return <Input label={label} type="date" error={error} {...register(fieldName)} />;
    case 'BOOLEAN':
      return (
        <label className="flex items-center gap-2 text-sm text-ink-700 dark:text-ink-300">
          <input type="checkbox" className="rounded" {...register(fieldName)} />
          {label}
        </label>
      );
    case 'SELECT':
      return (
        <Select
          label={label}
          error={error}
          placeholder={`Select ${def.label.toLowerCase()}`}
          options={def.options.map((o) => ({ value: o, label: o }))}
          {...register(fieldName)}
        />
      );
    case 'MULTISELECT':
      return (
        <Controller
          control={control}
          name={fieldName}
          render={({ field }) => (
            <fieldset className="flex flex-col gap-1">
              <legend className="text-sm font-medium text-ink-700 dark:text-ink-300">{label}</legend>
              <div className="flex flex-wrap gap-3">
                {def.options.map((opt) => {
                  const checked: string[] = field.value ?? [];
                  return (
                    <label key={opt} className="flex items-center gap-1.5 text-sm text-ink-600 dark:text-ink-400">
                      <input
                        type="checkbox"
                        className="rounded"
                        checked={checked.includes(opt)}
                        onChange={(e) => {
                          field.onChange(e.target.checked ? [...checked, opt] : checked.filter((v) => v !== opt));
                        }}
                      />
                      {opt}
                    </label>
                  );
                })}
              </div>
              {error && <span className="text-xs text-red-600 dark:text-red-400">{error}</span>}
            </fieldset>
          )}
        />
      );
    case 'RELATION':
      return <RelationField def={def} name={fieldName} control={control} label={label} error={error} />;
  }
}

function RelationField({
  def,
  name,
  control,
  label,
  error,
}: {
  def: CustomFieldDefinition;
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: any;
  label: string;
  error?: string;
}) {
  const { data: options = [], isLoading } = useQuery({
    queryKey: ['relation-options', def.relationTarget, def.relationObjectDefinitionId],
    queryFn: () => fetchRelationOptions(def),
  });

  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Select
          label={label}
          error={error}
          placeholder={isLoading ? 'Loading…' : `Select ${def.label.toLowerCase()}`}
          options={options}
          value={(field.value as string) ?? ''}
          onChange={field.onChange}
        />
      )}
    />
  );
}
