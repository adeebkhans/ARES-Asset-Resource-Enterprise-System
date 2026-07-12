import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { DepartmentsTab } from './tabs/DepartmentsTab';
import { CategoriesTab } from './tabs/CategoriesTab';
import { EmployeesTab } from './tabs/EmployeesTab';

type Tab = 'departments' | 'categories' | 'employees';

const TABS: { key: Tab; label: string }[] = [
  { key: 'departments', label: 'Departments' },
  { key: 'categories', label: 'Asset Categories' },
  { key: 'employees', label: 'Employee Directory' },
];

export function OrgSetupPage() {
  const [activeTab, setActiveTab] = useState<Tab>('departments');

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Organization Setup</h1>
        <p className="text-sm text-slate-500">Manage departments, asset categories, and your team.</p>
      </div>

      <div className="border-b border-slate-200 dark:border-slate-800">
        <nav className="-mb-px flex gap-6">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'border-slate-900 text-slate-900 dark:border-slate-100 dark:text-slate-100'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <Card>
        {activeTab === 'departments' && <DepartmentsTab />}
        {activeTab === 'categories' && <CategoriesTab />}
        {activeTab === 'employees' && <EmployeesTab />}
      </Card>
    </div>
  );
}
