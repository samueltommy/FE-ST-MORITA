import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '../lib/apiClient';

export type BadgeVariant =
  | 'default'
  | 'primary'
  | 'success'
  | 'warning'
  | 'destructive'
  | 'secondary'
  | 'info'
  | string;

export interface SelectOption {
  value: string;         // Nilai konstan enum yang dikirim ke Backend (contoh: "COST_CONTROL")
  label: string;         // Teks ramah pengguna yang tampil di UI (contoh: "Cost Control")
  description?: string;  // Penjelasan fungsi/peran opsi (opsional, cocok untuk tooltip / subtitle)
  badge_variant?: BadgeVariant; // Hint tema warna UI (snake_case)
  badgeVariant?: BadgeVariant;  // Hint tema warna UI (camelCase dari apiClient)
}

export interface SystemChoicesDictionary {
  departments: SelectOption[];
  userLevels: SelectOption[];
  employmentStatuses: SelectOption[];
  requestTypes: SelectOption[];
  customerTypes: SelectOption[];
  pkpStatuses: SelectOption[];
  itemTypes: SelectOption[];
  [key: string]: SelectOption[];
}

// Global in-memory cache to prevent repeated network requests across components
let globalChoicesCache: SystemChoicesDictionary | null = null;
const categoryCache: Record<string, SelectOption[]> = {};

/**
 * Normalizes category name to URL slug format (e.g. 'user_levels' or 'userLevels' -> 'user-levels')
 */
function normalizeCategorySlug(cat: string): string {
  return cat
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/_/g, '-')
    .toLowerCase();
}

/**
 * Normalizes dictionary key name to camelCase (e.g. 'user-levels' -> 'userLevels')
 */
function normalizeCategoryKey(cat: string): string {
  return cat
    .replace(/-([a-z])/g, (_, g) => g.toUpperCase())
    .replace(/_([a-z])/g, (_, g) => g.toUpperCase());
}

/**
 * Ensures an option has both badgeVariant and badge_variant set
 */
function normalizeOption(opt: any): SelectOption {
  const variant = opt.badgeVariant || opt.badge_variant;
  return {
    value: opt.value ?? '',
    label: opt.label ?? opt.value ?? '',
    description: opt.description ?? undefined,
    badgeVariant: variant ?? undefined,
    badge_variant: variant ?? undefined,
  };
}

/**
 * Maps BadgeVariant string to Tailwind CSS classes
 */
export function getBadgeClass(variant?: BadgeVariant | null): string {
  switch (variant) {
    case 'primary':
      return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800';
    case 'success':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800';
    case 'warning':
      return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800';
    case 'destructive':
      return 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800';
    case 'info':
      return 'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-950 dark:text-cyan-300 dark:border-cyan-800';
    case 'secondary':
      return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800';
    case 'default':
    default:
      return 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
  }
}

/**
 * Helper to lookup label from options by value
 */
export function findOptionLabel(options?: SelectOption[] | null, value?: string): string {
  if (!options || !value) return value || '';
  const match = options.find((opt) => opt.value === value);
  return match?.label || value;
}

/**
 * Helper to lookup badge variant from options by value
 */
export function findOptionBadge(options?: SelectOption[] | null, value?: string): BadgeVariant | undefined {
  if (!options || !value) return undefined;
  const match = options.find((opt) => opt.value === value);
  return match?.badgeVariant || match?.badge_variant;
}

/**
 * Helper to lookup description from options by value
 */
export function findOptionDescription(options?: SelectOption[] | null, value?: string): string | undefined {
  if (!options || !value) return undefined;
  const match = options.find((opt) => opt.value === value);
  return match?.description;
}

/**
 * Universal Hook for System Choices & Dropdown Options
 *
 * Usage 1: Specific category
 *   const { data: userLevels, loading } = useSystemChoices('user-levels');
 *
 * Usage 2: All choices dictionary
 *   const { data: allChoices, loading } = useSystemChoices();
 */
export function useSystemChoices(category?: string) {
  const [data, setData] = useState<SelectOption[] | SystemChoicesDictionary>(() => {
    if (category) {
      const slug = normalizeCategorySlug(category);
      const key = normalizeCategoryKey(category);
      if (categoryCache[slug]) return categoryCache[slug];
      if (globalChoicesCache && globalChoicesCache[key]) return globalChoicesCache[key];
      return [];
    }
    return globalChoicesCache || {
      departments: [],
      userLevels: [],
      employmentStatuses: [],
      requestTypes: [],
      customerTypes: [],
      pkpStatuses: [],
      itemTypes: [],
    };
  });

  const [loading, setLoading] = useState<boolean>(() => {
    if (category) {
      const slug = normalizeCategorySlug(category);
      const key = normalizeCategoryKey(category);
      return !categoryCache[slug] && !(globalChoicesCache && globalChoicesCache[key]);
    }
    return !globalChoicesCache;
  });

  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchChoices = useCallback(async (forceRefresh = false) => {
    try {
      if (category) {
        const slug = normalizeCategorySlug(category);
        const key = normalizeCategoryKey(category);

        if (!forceRefresh) {
          if (categoryCache[slug]) {
            setData(categoryCache[slug]);
            setLoading(false);
            return;
          }
          if (globalChoicesCache && globalChoicesCache[key]) {
            categoryCache[slug] = globalChoicesCache[key];
            setData(globalChoicesCache[key]);
            setLoading(false);
            return;
          }
        }

        setLoading(true);
        const res = await apiClient.get(`/choices/${slug}`);
        const rawOptions = res.data?.data || res.data || [];
        const normalized = Array.isArray(rawOptions) ? rawOptions.map(normalizeOption) : [];
        categoryCache[slug] = normalized;

        if (isMountedRef.current) {
          setData(normalized);
          setError(null);
        }
      } else {
        if (!forceRefresh && globalChoicesCache) {
          setData(globalChoicesCache);
          setLoading(false);
          return;
        }

        setLoading(true);
        const res = await apiClient.get('/choices');
        const rawDict = res.data?.data || res.data || {};
        const dict: SystemChoicesDictionary = {
          departments: (rawDict.departments || []).map(normalizeOption),
          userLevels: (rawDict.userLevels || rawDict.user_levels || []).map(normalizeOption),
          employmentStatuses: (rawDict.employmentStatuses || rawDict.employment_statuses || []).map(normalizeOption),
          requestTypes: (rawDict.requestTypes || rawDict.request_types || []).map(normalizeOption),
          customerTypes: (rawDict.customerTypes || rawDict.customer_types || []).map(normalizeOption),
          pkpStatuses: (rawDict.pkpStatuses || rawDict.pkp_statuses || []).map(normalizeOption),
          itemTypes: (rawDict.itemTypes || rawDict.item_types || []).map(normalizeOption),
        };

        globalChoicesCache = dict;
        categoryCache['departments'] = dict.departments;
        categoryCache['user-levels'] = dict.userLevels;
        categoryCache['employment-statuses'] = dict.employmentStatuses;
        categoryCache['request-types'] = dict.requestTypes;
        categoryCache['customer-types'] = dict.customerTypes;
        categoryCache['pkp-statuses'] = dict.pkpStatuses;
        categoryCache['item-types'] = dict.itemTypes;

        if (isMountedRef.current) {
          setData(dict);
          setError(null);
        }
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        setError(err?.response?.data?.message || err.message || 'Gagal mengambil data pilihan');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [category]);

  useEffect(() => {
    fetchChoices();
  }, [fetchChoices]);

  const refetch = useCallback(() => fetchChoices(true), [fetchChoices]);

  return {
    data: data as any,
    loading,
    error,
    refetch,
  };
}
