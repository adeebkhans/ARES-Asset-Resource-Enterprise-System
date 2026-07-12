import { type ReactNode } from 'react';

/**
 * Thin wrapper around Phosphor icon web components.
 * Usage: <Icon name="house" weight="fill" />
 * Weight defaults to "bold" for legibility at small sizes.
 */
interface IconProps {
  name: string;
  weight?: 'thin' | 'light' | 'bold' | 'fill' | 'duotone';
  size?: number | string;
  className?: string;
}

export function Icon({ name, weight = 'bold', size = 20, className = '' }: IconProps) {
  return (
    <i
      className={`ph ph-${weight === 'bold' ? '' : weight + '-'}${name} ${className}`}
      style={{ fontSize: typeof size === 'number' ? `${size}px` : size }}
    />
  );
}

/** Shortcut icon names for navigation and common UI actions. */
export const NAV_ICONS = {
  dashboard: { name: 'house' },
  assets: { name: 'package' },
  maintenance: { name: 'wrench' },
  audits: { name: 'magnifying-glass' },
  approvals: { name: 'check-circle' },
  notifications: { name: 'bell' },
  'custom-objects': { name: 'puzzle-piece' },
  'org-setup': { name: 'buildings' },
  reports: { name: 'chart-bar' },
  'activity-logs': { name: 'clock-counter-clockwise' },
  logout: { name: 'sign-out' },
} as const;

export type NavIconName = keyof typeof NAV_ICONS;
