import { useState } from 'react';
import clsx from 'clsx';
import { Card } from '@/components/ui/Card';
import { DepartmentsTab } from './tabs/DepartmentsTab';
import { CategoriesTab } from './tabs/CategoriesTab';
import { EmployeesTab } from './tabs/EmployeesTab';
import { TemplatesTab } from './tabs/TemplatesTab';

type Tab = 'departments' | 'categories' | 'employees' | 'templates';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'departments', label: 'Departments', icon: 'buildings' },
  { key: 'categories', label: 'Asset Categories', icon: 'tag' },
  { key: 'employees', label: 'Employee Directory', icon: 'users' },
  { key: 'templates', label: 'Industry Templates', icon: 'puzzle-piece' },
];

export function OrgSetupPage() {
  const [activeTab, setActiveTab] = useState<Tab>('departments');

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink-900 dark:text-white">Organization Setup</h1>
        <p className="text-sm text-ink-500">Manage departments, asset categories, your team, and how this org is configured.</p>
      </div>

      <div className="flex gap-1 border-b border-ink-200 dark:border-ink-800">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
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
