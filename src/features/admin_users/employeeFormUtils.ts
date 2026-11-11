import type { EmployeeChildItem, EmployeeTrainingItem } from '../../types';
import type { CreateEmployeePayload } from '../../services/hrdService';

/**
 * Unified form state for Employee Create / Edit (17 field groups).
 */
export interface EmployeeFormState {
  nik: string;
  full_name: string;
  department: string;
  user_level: string;
  username: string;
  email: string;
  password: string;
  employment_status: string;
  identity_card_number: string;
  ktp_photo_url: string;
  kk_photo_url: string;
  npwp_number: string;
  npwp_photo_url: string;
  join_date: string;
  bpjs_kesehatan: string;
  bpjs_ketenagakerjaan: string;
  place_of_birth: string;
  date_of_birth: string;
  religion: string;
  phone_number: string;
  address: string;
  emergency_contact_phone: string;
  emergency_contact_relationship: string;
  marital_status: 'SINGLE' | 'MARRIED';
  spouse_name: string;
  children: EmployeeChildItem[];
  last_education: string;
  ijazah_photo_url: string;
  trainings: { name: string; organizer: string; year: number | ''; certificate_url: string }[];
  basic_salary: number | '';
  bank_name: string;
  bank_account_number: string;
}

export const todayIso = () => new Date().toISOString().split('T')[0];

export function createEmptyEmployeeForm(defaultDept = 'SALES'): EmployeeFormState {
  return {
    nik: `EMP-${new Date().getFullYear()}-001`,
    full_name: '',
    department: defaultDept,
    user_level: 'L3_STAFF',
    username: '',
    email: '',
    password: '',
    employment_status: 'PERMANENT',
    identity_card_number: '',
    ktp_photo_url: '',
    kk_photo_url: '',
    npwp_number: '',
    npwp_photo_url: '',
    join_date: todayIso(),
    bpjs_kesehatan: '',
    bpjs_ketenagakerjaan: '',
    place_of_birth: '',
    date_of_birth: '',
    religion: '',
    phone_number: '+62 ',
    address: '',
    emergency_contact_phone: '',
    emergency_contact_relationship: '',
    marital_status: 'SINGLE',
    spouse_name: '',
    children: [],
    last_education: '',
    ijazah_photo_url: '',
    trainings: [],
    basic_salary: '',
    bank_name: '',
    bank_account_number: '',
  };
}

/** Reads a field from a raw API employee supporting both camelCase & snake_case */
export function pick<T = any>(emp: any, snake: string, camel?: string): T | undefined {
  if (!emp) return undefined;
  const c = camel || snake.replace(/_([a-z])/g, (_, g) => g.toUpperCase());
  const v = emp[snake] ?? emp[c];
  return v === null ? undefined : v;
}

export function normalizeTrainings(raw: any): EmployeeTrainingItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((t: any) => ({
    name: String(t?.name ?? ''),
    organizer: String(t?.organizer ?? ''),
    year: Number(t?.year ?? 0),
    certificate_url: t?.certificate_url ?? t?.certificateUrl ?? '',
  }));
}

export function normalizeChildren(raw: any): EmployeeChildItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((c: any) => ({ name: String(c?.name ?? ''), age: Number(c?.age ?? 0) }));
}

/** Map raw API employee → form state (for Edit) */
export function employeeToFormState(emp: any): EmployeeFormState {
  const base = createEmptyEmployeeForm();
  const s = (snake: string) => String(pick(emp, snake) ?? '');
  const marital = s('marital_status').toUpperCase();
  return {
    ...base,
    nik: s('nik'),
    full_name: s('full_name') || String(emp?.name ?? ''),
    department: s('department') || base.department,
    user_level: s('user_level') || 'L3_STAFF',
    username: s('username'),
    email: s('email'),
    password: '',
    employment_status: s('employment_status') || 'PERMANENT',
    identity_card_number: s('identity_card_number'),
    ktp_photo_url: s('ktp_photo_url'),
    kk_photo_url: s('kk_photo_url'),
    npwp_number: s('npwp_number'),
    npwp_photo_url: s('npwp_photo_url'),
    join_date: (s('join_date') || todayIso()).slice(0, 10),
    bpjs_kesehatan: s('bpjs_kesehatan'),
    bpjs_ketenagakerjaan: s('bpjs_ketenagakerjaan'),
    place_of_birth: s('place_of_birth'),
    date_of_birth: s('date_of_birth').slice(0, 10),
    religion: s('religion'),
    phone_number: s('phone_number'),
    address: s('address'),
    emergency_contact_phone: s('emergency_contact_phone'),
    emergency_contact_relationship: s('emergency_contact_relationship'),
    marital_status: marital === 'MARRIED' ? 'MARRIED' : 'SINGLE',
    spouse_name: s('spouse_name'),
    children: normalizeChildren(emp?.children),
    last_education: s('last_education'),
    ijazah_photo_url: s('ijazah_photo_url'),
    trainings: normalizeTrainings(emp?.trainings).map((t) => ({
      name: t.name,
      organizer: t.organizer,
      year: t.year || '',
      certificate_url: t.certificate_url || '',
    })),
    basic_salary: (pick<number>(emp, 'basic_salary') as number) ?? '',
    bank_name: s('bank_name'),
    bank_account_number: s('bank_account_number'),
  };
}

const nullIfEmpty = (v: string) => (v && v.trim() ? v.trim() : null);

/** Map form state → backend payload (snake_case) */
export function formStateToPayload(
  f: EmployeeFormState,
  opts: { includeCredentials: boolean; includeSensitive: boolean; roleId?: string; permissions?: string[] }
): CreateEmployeePayload {
  const payload: CreateEmployeePayload = {
    nik: f.nik.trim(),
    full_name: f.full_name.trim(),
    department: f.department,
    user_level: f.user_level,
    username: f.username.trim(),
    email: f.email.trim(),
    password: f.password,
    employment_status: f.employment_status,
    identity_card_number: f.identity_card_number.trim(),
    ktp_photo_url: nullIfEmpty(f.ktp_photo_url),
    kk_photo_url: nullIfEmpty(f.kk_photo_url),
    npwp_number: nullIfEmpty(f.npwp_number),
    npwp_photo_url: nullIfEmpty(f.npwp_photo_url),
    join_date: f.join_date,
    bpjs_kesehatan: nullIfEmpty(f.bpjs_kesehatan),
    bpjs_ketenagakerjaan: nullIfEmpty(f.bpjs_ketenagakerjaan),
    place_of_birth: nullIfEmpty(f.place_of_birth),
    date_of_birth: nullIfEmpty(f.date_of_birth),
    religion: nullIfEmpty(f.religion),
    phone_number: f.phone_number.trim(),
    address: nullIfEmpty(f.address),
    emergency_contact_phone: nullIfEmpty(f.emergency_contact_phone),
    emergency_contact_relationship: nullIfEmpty(f.emergency_contact_relationship),
    marital_status: f.marital_status,
    spouse_name: f.marital_status === 'MARRIED' ? nullIfEmpty(f.spouse_name) : null,
    children: f.children
      .filter((c) => c.name.trim())
      .map((c) => ({ name: c.name.trim(), age: Number(c.age) || 0 })),
    last_education: nullIfEmpty(f.last_education),
    ijazah_photo_url: nullIfEmpty(f.ijazah_photo_url),
    trainings: f.trainings
      .filter((t) => t.name.trim())
      .map((t) => ({
        name: t.name.trim(),
        organizer: t.organizer.trim(),
        year: Number(t.year) || new Date().getFullYear(),
        certificate_url: t.certificate_url || undefined,
      })),
  };

  if (opts.roleId) payload.role_id = opts.roleId;
  if (opts.permissions) payload.permissions = opts.permissions;

  if (opts.includeSensitive) {
    if (f.basic_salary !== '') payload.basic_salary = Number(f.basic_salary);
    payload.bank_name = nullIfEmpty(f.bank_name);
    payload.bank_account_number = nullIfEmpty(f.bank_account_number);
  }

  if (!opts.includeCredentials) {
    delete (payload as any).password;
  }
  return payload;
}

export const RELATIONSHIP_SUGGESTIONS = ['Istri', 'Suami', 'Orang Tua', 'Ayah', 'Ibu', 'Saudara', 'Anak', 'Kerabat'];

