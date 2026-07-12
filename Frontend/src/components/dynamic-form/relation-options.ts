import { searchAssets } from '@/features/assets/api';
import { listDepartments } from '@/features/departments/api';
import { listEmployees } from '@/features/employees/api';
import { listRecords } from '@/features/custom-objects/api';
import type { CustomFieldDefinition } from '@/types/domain.types';

export interface RelationOption {
  value: string;
  label: string;
}

/** Best-effort human label for a custom object record — first non-empty text-ish value, else a short id. */
function recordLabel(id: string, data: Record<string, unknown>): string {
  const preferred = data.fullName ?? data.name ?? data.title ?? data.label;
  if (typeof preferred === 'string' && preferred.trim()) return preferred;
  const firstString = Object.values(data).find((v) => typeof v === 'string' && v.trim());
  if (typeof firstString === 'string') return firstString;
  return id.slice(0, 8);
}

export async function fetchRelationOptions(def: CustomFieldDefinition): Promise<RelationOption[]> {
  switch (def.relationTarget) {
    case 'ASSET': {
      const assets = await searchAssets({});
      return assets.map((a) => ({ value: a.id, label: `${a.assetTag} — ${a.name}` }));
    }
    case 'DEPARTMENT': {
      const departments = await listDepartments();
      return departments.map((d) => ({ value: d.id, label: d.name }));
    }
    case 'USER': {
      const employees = await listEmployees();
      return employees.map((e) => ({ value: e.id, label: `${e.name} (${e.email})` }));
    }
    case 'CUSTOM_OBJECT': {
      if (!def.relationObjectDefinitionId) return [];
      const records = await listRecords(def.relationObjectDefinitionId);
      return records.map((r) => ({ value: r.id, label: recordLabel(r.id, r.data) }));
    }
    default:
      return [];
  }
}
