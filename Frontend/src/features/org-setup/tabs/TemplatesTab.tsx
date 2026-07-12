import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ApiRequestError } from '@/types/api.types';
import type { ApplyTemplateResult } from '@/types/domain.types';
import { applyIndustryTemplate, listIndustryTemplates } from '@/features/industry-templates/api';

const TEMPLATE_ICON: Record<string, string> = {
  SCHOOL: 'school',
  HOSPITAL: 'hospital',
  HOTEL: 'buildings',
  FACTORY: 'factory',
};

/**
 * The demo payoff of the Configurable Object Framework (plan.md §7.5): one
 * click provisions the categories + custom objects a School/Hospital/Hotel/
 * Factory needs, using the exact same engine an Admin could configure by hand.
 */
export function TemplatesTab() {
  const queryClient = useQueryClient();
  const [result, setResult] = useState<{ tag: string; data: ApplyTemplateResult } | null>(null);
  const [error, setError] = useState('');

  const { data: templates = [], isLoading } = useQuery({ queryKey: ['industry-templates'], queryFn: listIndustryTemplates });

  const applyMutation = useMutation({
    mutationFn: applyIndustryTemplate,
    onSuccess: (data, tag) => {
      setResult({ tag, data });
      setError('');
      queryClient.invalidateQueries({ queryKey: ['asset-categories'] });
      queryClient.invalidateQueries({ queryKey: ['custom-objects'] });
    },
    onError: (err) => setError(err instanceof ApiRequestError ? err.message : 'Failed to apply template'),
  });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-500">Industry Templates</h3>
        <p className="mt-1 text-sm text-ink-500">
          One click provisions the asset categories and custom objects a business like this typically needs. Safe to click more than once — anything that already exists is skipped.
        </p>
      </div>

      {isLoading && <p className="text-sm text-ink-500">Loading…</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {templates.map((t) => (
          <Card key={t.tag} className="flex flex-col gap-3">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl"><i className={`ph-bold ph-${TEMPLATE_ICON[t.tag] ?? 'puzzle-piece'}`} /></span>
              <span className="font-display font-semibold text-ink-900 dark:text-white">{t.name}</span>
            </div>
            <p className="text-sm text-ink-500">{t.description}</p>
            <p className="text-xs text-ink-400">
              {t.categoryCount} categor{t.categoryCount === 1 ? 'y' : 'ies'} · {t.objectCount} custom object{t.objectCount === 1 ? '' : 's'}
            </p>
            <Button
              variant="secondary"
              className="mt-auto"
              onClick={() => applyMutation.mutate(t.tag)}
              isLoading={applyMutation.isPending && applyMutation.variables === t.tag}
            >
              Apply to this organization
            </Button>
          </Card>
        ))}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {result && (
        <Card className="border-brand-200 bg-brand-50/60 dark:border-brand-800 dark:bg-brand-900/10">
          <p className="mb-2 text-sm font-semibold text-brand-800 dark:text-brand-300">Applied {result.tag}</p>
          <div className="grid grid-cols-2 gap-3 text-xs text-ink-600 dark:text-ink-400">
            <div>
              <p className="font-medium text-ink-800 dark:text-ink-200">Categories created</p>
              <p>{result.data.categoriesCreated.join(', ') || '—'}</p>
            </div>
            <div>
              <p className="font-medium text-ink-800 dark:text-ink-200">Categories skipped (already existed)</p>
              <p>{result.data.categoriesSkipped.join(', ') || '—'}</p>
            </div>
            <div>
              <p className="font-medium text-ink-800 dark:text-ink-200">Custom objects created</p>
              <p>{result.data.objectsCreated.join(', ') || '—'}</p>
            </div>
            <div>
              <p className="font-medium text-ink-800 dark:text-ink-200">Custom objects skipped (already existed)</p>
              <p>{result.data.objectsSkipped.join(', ') || '—'}</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
