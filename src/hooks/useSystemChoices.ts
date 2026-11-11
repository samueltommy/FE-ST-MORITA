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
  value: string;         // Nilai konstan enum yang dikirim ke Backend (contoh: "SALES", "WAREHOUSE_PPIC")
  label: string;         // Teks ramah pengguna yang tampil di UI (contoh: "Sales", "Warehouse & PPIC")
  description?: string;  // Penjelasan fungsi/peran opsi (opsional, cocok untuk tooltip / subtitle)
  badge_variant?: BadgeVariant; // Hint tema warna UI (snake_case)
  badgeVariant?: BadgeVariant;  // Hint tema warna UI (camelCase dari apiClient)
}

export interface SystemChoicesDictionary {
  departments: SelectOption[];
  divisions: SelectOption[];
  userLevels: SelectOption[];
  employmentStatuses: SelectOption[];
  maritalStatuses: SelectOption[];
  educations: SelectOption[];
  religions: SelectOption[];
  requestTypes: SelectOption[];
  customerTypes: SelectOption[];
  pkpStatuses: SelectOption[];
  itemTypes: SelectOption[];
  [key: string]: SelectOption[];
}

export const DEFAULT_DIVISIONS: SelectOption[] = [
  { value: 'SALES', label: 'Sales', description: 'Quotation, Incoming Order (IO), Aktivitas & Kunjungan Sales (SDA), Master Customer', badgeVariant: 'warning', badge_variant: 'warning' },
  { value: 'DELIVERY', label: 'Delivery', description: 'Delivery Order (Surat Jalan), E-Tracking Barcode/GPS, Peminjaman Kendaraan Dinas', badgeVariant: 'info', badge_variant: 'info' },
  { value: 'WAREHOUSE_PPIC', label: 'Warehouse & PPIC', description: 'Penerimaan Barang (Receiving LOG), Pencatatan Limbah (Waste), SPK Produksi, Master Item & Stok', badgeVariant: 'primary', badge_variant: 'primary' },
  { value: 'PRODUKSI_QC', label: 'Produksi & QC', description: 'Input Hasil Produksi, Inspeksi QC IQC/PQC/OQC, Rekam QC, Otorisasi Pelepasan Hold QC', badgeVariant: 'destructive', badge_variant: 'destructive' },
  { value: 'PURCHASING', label: 'Pembelian (Purchasing)', description: 'Purchase Request (PR), Purchase Order (PO), Dokumen Exim, Master Supplier', badgeVariant: 'secondary', badge_variant: 'secondary' },
  { value: 'FINANCE', label: 'Finance', description: 'Validasi Cost Control Quotation, Kalkulasi & Sales Invoice 13 Rumus, Piutang AR & Pembayaran, E-Complaint & RMA', badgeVariant: 'success', badge_variant: 'success' },
  { value: 'RND', label: 'RND', description: 'R&D Trial Formula, Konversi Formula ke Master BOM, Publikasi E-Katalog, Permintaan Sampel', badgeVariant: 'info', badge_variant: 'info' },
  { value: 'HRD', label: 'HRD', description: 'Master Data Karyawan, Pengajuan & Approval Cuti/Izin, Presensi / Kehadiran Harian', badgeVariant: 'secondary', badge_variant: 'secondary' },
];

export const DEFAULT_USER_LEVELS: SelectOption[] = [
  { value: 'L0_SUPER_ADMIN', label: 'L0 - Super Admin', description: 'Akses penuh seluruh 8 divisi dan pengaturan sistem', badgeVariant: 'secondary', badge_variant: 'secondary' },
  { value: 'L1_DIREKSI', label: 'L1 - Direksi (Executive)', description: 'Akses eksekutif ke seluruh 8 divisi & otorisasi penuh', badgeVariant: 'warning', badge_variant: 'warning' },
  { value: 'L2_MANAGER', label: 'L2 - Manager Divisi', description: 'Akses manajemen & approval pada divisi terkait', badgeVariant: 'primary', badge_variant: 'primary' },
  { value: 'L3_STAFF', label: 'L3 - Staff / Operator', description: 'Akses operasional harian sesuai divisi kerja', badgeVariant: 'default', badge_variant: 'default' },
  { value: 'L4_EXTERNAL', label: 'L4 - External User', description: 'Akses portal eksternal terbatas', badgeVariant: 'info', badge_variant: 'info' },
];

export const DEFAULT_EMPLOYMENT_STATUSES: SelectOption[] = [
  { value: 'PERMANENT', label: 'Permanent (Karyawan Tetap)', badgeVariant: 'success', badge_variant: 'success' },
  { value: 'CONTRACT', label: 'Contract (PKWT)', badgeVariant: 'primary', badge_variant: 'primary' },
  { value: 'PROBATION', label: 'Probation (Masa Percobaan)', badgeVariant: 'warning', badge_variant: 'warning' },
  { value: 'INTERNSHIP', label: 'Internship (Magang)', badgeVariant: 'info', badge_variant: 'info' },
  { value: 'RESIGNED', label: 'Resigned (Non-Aktif)', badgeVariant: 'destructive', badge_variant: 'destructive' },
];

export const DEFAULT_MARITAL_STATUSES: SelectOption[] = [
  { value: 'SINGLE', label: 'Single / Belum Menikah', badgeVariant: 'default', badge_variant: 'default' },
  { value: 'MARRIED', label: 'Nikah / Menikah', badgeVariant: 'primary', badge_variant: 'primary' },
];

export const DEFAULT_EDUCATIONS: SelectOption[] = [
  { value: 'SMA/SMK', label: 'SMA/SMK' },
  { value: 'D1/D2', label: 'D1/D2' },
  { value: 'D3', label: 'D3' },
  { value: 'D4/S1', label: 'D4/S1' },
  { value: 'S2', label: 'S2' },
  { value: 'S3', label: 'S3' },
];

export const DEFAULT_RELIGIONS: SelectOption[] = [
  { value: 'Islam', label: 'Islam' },
  { value: 'Kristen Protestan', label: 'Kristen Protestan' },
  { value: 'Katolik', label: 'Katolik' },
  { value: 'Hindu', label: 'Hindu' },
  { value: 'Buddha', label: 'Buddha' },
  { value: 'Konghucu', label: 'Konghucu' },
];

const DEFAULT_FALLBACK_BY_KEY: Record<string, SelectOption[]> = {
  departments: DEFAULT_DIVISIONS,
  divisions: DEFAULT_DIVISIONS,
  userLevels: DEFAULT_USER_LEVELS,
  user_levels: DEFAULT_USER_LEVELS,
  employmentStatuses: DEFAULT_EMPLOYMENT_STATUSES,
  employment_statuses: DEFAULT_EMPLOYMENT_STATUSES,
  maritalStatuses: DEFAULT_MARITAL_STATUSES,
  marital_statuses: DEFAULT_MARITAL_STATUSES,
  educations: DEFAULT_EDUCATIONS,
  religions: DEFAULT_RELIGIONS,
};

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
  if (typeof opt === 'string') {
    return {
      value: opt,
      label: opt,
    };
  }
  const variant = opt.badgeVariant || opt.badge_variant;
  return {
    value: opt.value ?? opt.code ?? '',
    label: opt.label ?? opt.name ?? opt.value ?? opt.code ?? '',
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
  if (!value) return '';
  if (options && options.length > 0) {
    const match = options.find((opt) => opt.value === value);
    if (match?.label) return match.label;
  }
  const fallbackDiv = DEFAULT_DIVISIONS.find((d) => d.value === value);
  if (fallbackDiv) return fallbackDiv.label;
  return value;
}

/**
 * Helper to lookup badge variant from options by value
 */
export function findOptionBadge(options?: SelectOption[] | null, value?: string): BadgeVariant | undefined {
  if (!value) return undefined;
  if (options && options.length > 0) {
    const match = options.find((opt) => opt.value === value);
    const v = match?.badgeVariant || match?.badge_variant;
    if (v) return v;
  }
  const fallbackDiv = DEFAULT_DIVISIONS.find((d) => d.value === value);
  return fallbackDiv?.badgeVariant || fallbackDiv?.badge_variant;
}

/**
 * Helper to lookup description from options by value
 */
export function findOptionDescription(options?: SelectOption[] | null, value?: string): string | undefined {
  if (!value) return undefined;
  if (options && options.length > 0) {
    const match = options.find((opt) => opt.value === value);
    if (match?.description) return match.description;
  }
  const fallbackDiv = DEFAULT_DIVISIONS.find((d) => d.value === value);
  return fallbackDiv?.description;
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
      if (categoryCache[slug]?.length) return categoryCache[slug];
      if (globalChoicesCache && globalChoicesCache[key]?.length) return globalChoicesCache[key];
      return DEFAULT_FALLBACK_BY_KEY[key] || DEFAULT_FALLBACK_BY_KEY[category] || [];
    }
    return globalChoicesCache || {
      departments: DEFAULT_DIVISIONS,
      divisions: DEFAULT_DIVISIONS,
      userLevels: DEFAULT_USER_LEVELS,
      employmentStatuses: DEFAULT_EMPLOYMENT_STATUSES,
      maritalStatuses: DEFAULT_MARITAL_STATUSES,
      educations: DEFAULT_EDUCATIONS,
      religions: DEFAULT_RELIGIONS,
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
      if (!forceRefresh && globalChoicesCache) {
        if (category) {
          const slug = normalizeCategorySlug(category);
          const key = normalizeCategoryKey(category);
          const resolved =
            categoryCache[slug] ||
            globalChoicesCache[key] ||
            DEFAULT_FALLBACK_BY_KEY[key] ||
            [];
          setData(resolved);
          setLoading(false);
          return;
        } else {
          setData(globalChoicesCache);
          setLoading(false);
          return;
        }
      }

      setLoading(true);
      const res = await apiClient.get('/choices');
      const rawDict = res.data?.data || res.data || {};

      const parseList = (raw: any, fallback: SelectOption[] = []): SelectOption[] => {
        if (Array.isArray(raw) && raw.length > 0) {
          return raw.map(normalizeOption);
        }
        return fallback;
      };

      const departments = parseList(rawDict.departments || rawDict.divisions, DEFAULT_DIVISIONS);
      const divisions = parseList(rawDict.divisions || rawDict.departments, departments);
      const userLevels = parseList(rawDict.userLevels || rawDict.user_levels, DEFAULT_USER_LEVELS);
      const employmentStatuses = parseList(rawDict.employmentStatuses || rawDict.employment_statuses, DEFAULT_EMPLOYMENT_STATUSES);
      const maritalStatuses = parseList(rawDict.maritalStatuses || rawDict.marital_statuses, DEFAULT_MARITAL_STATUSES);
      const educations = parseList(rawDict.educations, DEFAULT_EDUCATIONS);
      const religions = parseList(rawDict.religions, DEFAULT_RELIGIONS);

      const dict: SystemChoicesDictionary = {
        departments,
        divisions,
        userLevels,
        employmentStatuses,
        maritalStatuses,
        educations,
        religions,
        requestTypes: parseList(rawDict.requestTypes || rawDict.request_types),
        customerTypes: parseList(rawDict.customerTypes || rawDict.customer_types),
        pkpStatuses: parseList(rawDict.pkpStatuses || rawDict.pkp_statuses),
        itemTypes: parseList(rawDict.itemTypes || rawDict.item_types),
      };

      globalChoicesCache = dict;
      categoryCache['departments'] = dict.departments;
      categoryCache['divisions'] = dict.divisions;
      categoryCache['user-levels'] = dict.userLevels;
      categoryCache['employment-statuses'] = dict.employmentStatuses;
      categoryCache['marital-statuses'] = dict.maritalStatuses;
      categoryCache['educations'] = dict.educations;
      categoryCache['religions'] = dict.religions;
      categoryCache['request-types'] = dict.requestTypes;
      categoryCache['customer-types'] = dict.customerTypes;
      categoryCache['pkp-statuses'] = dict.pkpStatuses;
      categoryCache['item-types'] = dict.itemTypes;

      if (isMountedRef.current) {
        if (category) {
          const slug = normalizeCategorySlug(category);
          const key = normalizeCategoryKey(category);
          setData(categoryCache[slug] || dict[key] || DEFAULT_FALLBACK_BY_KEY[key] || []);
        } else {
          setData(dict);
        }
        setError(null);
      }
    } catch (err: any) {
      // Fallback: if category is departments/divisions, try GET /auth/departments
      if (category && (category === 'departments' || category === 'divisions')) {
        try {
          const deptRes = await apiClient.get('/auth/departments');
          const rawDepts = deptRes.data?.data || deptRes.data || [];
          if (Array.isArray(rawDepts) && rawDepts.length > 0) {
            const normalized = rawDepts.map(normalizeOption);
            categoryCache['departments'] = normalized;
            categoryCache['divisions'] = normalized;
            if (isMountedRef.current) {
              setData(normalized);
              setError(null);
            }
            return;
          }
        } catch {
          // Use fallback
        }
      }

      if (isMountedRef.current) {
        if (category) {
          const key = normalizeCategoryKey(category);
          setData(DEFAULT_FALLBACK_BY_KEY[key] || DEFAULT_FALLBACK_BY_KEY[category] || []);
        }
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
