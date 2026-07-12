import type { CustomFieldDefinition, CustomObjectRecord } from '@/types/domain.types';

interface DynamicTableProps {
  fields: CustomFieldDefinition[];
  records: CustomObjectRecord[];
  onEdit?: (record: CustomObjectRecord) => void;
  onDelete?: (record: CustomObjectRecord) => void;
}

function formatCell(value: unknown, fieldType: CustomFieldDefinition['fieldType']): string {
  if (value === undefined || value === null || value === '') return '—';
  if (fieldType === 'BOOLEAN') return value ? 'Yes' : 'No';
  if (fieldType === 'MULTISELECT' && Array.isArray(value)) return value.join(', ');
  if (fieldType === 'RELATION' && typeof value === 'string') return value.slice(0, 8);
  return String(value);
}

/** Table whose columns are generated from field metadata — pairs with DynamicForm (plan.md §7.4). */
export function DynamicTable({ fields, records, onEdit, onDelete }: DynamicTableProps) {
  const sorted = [...fields].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-ink-200 dark:border-ink-700">
            {sorted.map((def) => (
              <th key={def.id} className="pb-2 pr-4 font-medium text-ink-500">
                {def.label}
              </th>
            ))}
            {(onEdit || onDelete) && <th className="pb-2"></th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
          {records.map((record) => (
            <tr key={record.id}>
              {sorted.map((def) => (
                <td key={def.id} className="py-2 pr-4 text-ink-700 dark:text-ink-300">
                  {formatCell(record.data[def.fieldKey], def.fieldType)}
                </td>
              ))}
              {(onEdit || onDelete) && (
                <td className="py-2 text-right">
                  <div className="flex justify-end gap-2">
                    {onEdit && (
                      <button
                        onClick={() => onEdit(record)}
                        className="text-xs font-medium text-ink-500 hover:text-ink-900 dark:hover:text-white"
                      >
                        Edit
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(record)}
                        className="text-xs font-medium text-red-500 hover:text-red-700 dark:hover:text-red-400"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
