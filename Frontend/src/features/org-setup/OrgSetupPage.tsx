import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import { Card } from '@/components/ui/Card';
import { useAuthStore } from '@/store/auth.store';
import type { Role } from '@/types/auth.types';
import { DepartmentsTab } from './tabs/DepartmentsTab';
import { CategoriesTab } from './tabs/CategoriesTab';
import { EmployeesTab } from './tabs/EmployeesTab';
import { TemplatesTab } from './tabs/TemplatesTab';

type Tab = 'departments' | 'categories' | 'employees' | 'templates';

// Categories is the only tab Asset Manager holds backend permission for
// (POST/PATCH /asset-categories allow ADMIN + ASSET_MANAGER); the rest are
// Admin-only, matching the brief's "Organization Setup — Admin only" spec.
const TABS: { key: Tab; label: string; icon: string; roles: Role[] }[] = [
  { key: 'departments', label: 'Departments', icon: 'buildings', roles: ['ADMIN'] },
  { key: 'categories', label: 'Asset Categories', icon: 'tag', roles: ['ADMIN', 'ASSET_MANAGER'] },
  { key: 'employees', label: 'Employee Directory', icon: 'users', roles: ['ADMIN'] },
  { key: 'templates', label: 'Industry Templates', icon: 'puzzle-piece', roles: ['ADMIN'] },
];

function isTab(value: string | null): value is Tab {
  return value === 'departments' || value === 'categories' || value === 'employees' || value === 'templates';
}

export function OrgSetupPage() {
  const role = useAuthStore((s) => s.user?.role);
  const visibleTabs = TABS.filter((t) => !role || t.roles.includes(role));

  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const initialTab = isTab(requestedTab) && visibleTabs.some((t) => t.key === requestedTab)
    ? requestedTab
    : (visibleTabs[0]?.key ?? 'categories');
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);

  const selectTab = (tab: Tab) => {
    setActiveTab(tab);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', tab);
      return next;
    }, { replace: true });
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink-900 text-black">Organization Setup</h1>
        <p className="text-sm text-ink-500">Manage departments, asset categories, your team, and how this org is configured.</p>
      </div>

      <div className="flex gap-1 border-b border-ink-200 dark:border-ink-800">
        {visibleTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => selectTab(tab.key)}
            className={clsx(
              'flex items-center gap-1.5 border-b-2 px-3 pb-3 text-sm font-medium transition-colors',
              activeTab === tab.key
                ? 'border-brand-600 text-brand-800 dark:border-brand-500 dark:text-brand-300'
                : 'border-transparent text-ink-500 hover:text-ink-800 dark:hover:text-ink-200',
            )}
          >
            <i className={`ph-bold ph-${tab.icon}`} />
            {tab.label}
          </button>
        ))}
      </div>

      <Card>
        {activeTab === 'departments' && <DepartmentsTab />}
        {activeTab === 'categories' && <CategoriesTab />}
        {activeTab === 'employees' && <EmployeesTab />}
        {activeTab === 'templates' && <TemplatesTab />}
      </Card>
    </div>
  );
}
