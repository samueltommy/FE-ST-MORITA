import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Shield,
  Search,
  CheckCircle2,
  XCircle,
  Key,
  X,
  Loader2,
  Pencil,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getUserManagementRolesApi,
  createUserManagementRoleApi,
  updateUserManagementRoleApi,
  deleteUserManagementRoleApi,
  UserAccountRecord,
  RoleRecord,
} from '../../services/userManagementService';
import {
  getEmployeesApi,
  updateEmployeeAccessApi,
  suspendEmployeeApi,
  deleteEmployeeApi,
} from '../../services/hrdService';
import {
  useSystemChoices,
  DEFAULT_DIVISIONS,
  DEFAULT_USER_LEVELS,
  SelectOption,
  findOptionLabel,
} from '../../hooks/useSystemChoices';
import { CustomAccessMatrix } from '../../components/rbac/CustomAccessMatrix';
import {
  AccessMatrix,
  getDefaultAccessMatrix,
  matrixToPermissions,
  permissionsToMatrix,
} from '../../utils/rbacMatrix';
import { useRBAC } from '../../hooks/useRBAC';
import { OFFICIAL_DIVISIONS } from '../../types';
import { ConfirmActionModal } from './ConfirmActionModal';

const asOptions = (data: any, fallback: SelectOption[]): SelectOption[] =>
  Array.isArray(data) && data.length > 0 ? data : fallback;

export const UserManagementTab: React.FC = () => {
  const queryClient = useQueryClient();
  const { isSuperAdmin, isExecutive, userDivision } = useRBAC();
  // Matriks Core 1: Khusus divisi HRD (termasuk IT L2/L3), L1_DIREKSI, dan L0_SUPER_ADMIN
  const canManage = isSuperAdmin || isExecutive || userDivision === 'HRD';

  const [subTab, setSubTab] = useState<'users' | 'roles'>('users');
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('ALL');
  const [filterLevel, setFilterLevel] = useState('ALL');
  const [filterActive, setFilterActive] = useState<'ALL' | 'true' | 'false'>('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [rolePage, setRolePage] = useState(1);
  const [rolePageSize, setRolePageSize] = useState(9);

  const { data: deptChoices } = useSystemChoices('departments');
  const { data: levelChoices } = useSystemChoices('user-levels');
  const divisions = asOptions(deptChoices, DEFAULT_DIVISIONS);
  const userLevels = asOptions(levelChoices, DEFAULT_USER_LEVELS);

  // Single Source of Truth: gunakan /hrd/employees dengan server-side pagination agar 100% sinkron dengan Database Karyawan
  const { data: usersRes, isLoading: loadingUsers } = useQuery({
    queryKey: ['userManagementUsers', page, pageSize, search, filterDept],
    queryFn: () => getEmployeesApi(page, pageSize, search || undefined, filterDept),
    enabled: canManage,
  });

  const rawEmployees: any[] = Array.isArray(usersRes?.data) ? usersRes.data : [];
  const allEmployees: UserAccountRecord[] = rawEmployees.map((emp: any) => ({
    id: String(emp?.id ?? ''),
    username: String(emp?.username || emp?.nik || '-'),
    email: String(emp?.email || '-'),
    fullName: String(emp?.fullName || emp?.username || '-'),
    department: emp?.department || '',
    userLevel: emp?.userLevel || 'L3_STAFF',
    roleId: emp?.roleId || emp?.roleName || '',
    roleName: emp?.roleName || emp?.roleId || '',
    departmentAccess: Array.isArray(emp?.departmentAccess)
      ? emp.departmentAccess
      : Array.isArray(emp?.allowedDivisions)
      ? emp.allowedDivisions
      : emp?.department
      ? [emp.department]
      : [],
    allowedDivisions: Array.isArray(emp?.allowedDivisions) ? emp.allowedDivisions : undefined,
    customPermissions: Array.isArray(emp?.permissions)
      ? emp.permissions
      : Array.isArray(emp?.customPermissions)
      ? emp.customPermissions
      : [],
    isActive: emp?.isActive !== false && emp?.employmentStatus !== 'RESIGNED',
    employeeId: String(emp?.id ?? ''),
    employeeNik: emp?.nik || '',
  }));

  const usersList = allEmployees.filter((u) => {
    const matchLevel = filterLevel === 'ALL' || u.userLevel === filterLevel;
    const active = u.isActive !== false;
    const matchActive =
      filterActive === 'ALL' || (filterActive === 'true' ? active : !active);
    return matchLevel && matchActive;
  });

  const hasClientFilter = filterLevel !== 'ALL' || filterActive !== 'ALL';
  const serverTotalUsers =
    (usersRes as any)?.summary?.total ??
    usersRes?.meta?.total ??
    usersRes?.meta?.totalItems ??
    usersRes?.meta?.total_items ??
    allEmployees.length;
  const totalUsersCount = hasClientFilter ? usersList.length : serverTotalUsers;
  const totalUserPages = Math.max(
    1,
    usersRes?.meta?.totalPages ||
      usersRes?.meta?.total_pages ||
      Math.ceil(serverTotalUsers / pageSize) ||
      1
  );

  const { data: rolesData, isLoading: loadingRoles } = useQuery({
    queryKey: ['userManagementRoles'],
    queryFn: getUserManagementRolesApi,
    enabled: canManage,
  });
  const rolesList: RoleRecord[] = Array.isArray(rolesData) ? rolesData : [];
  const totalRolePages = Math.max(1, Math.ceil(rolesList.length / rolePageSize));
  const pagedRoles = rolesList.slice((rolePage - 1) * rolePageSize, rolePage * rolePageSize);

  // ── Edit Access Modal ───────────────────────────────────────────────────
  const [editingUser, setEditingUser] = useState<UserAccountRecord | null>(null);
  const [accessForm, setAccessForm] = useState({
    department: 'HRD',
    userLevel: 'L3_STAFF',
    roleId: '',
    departmentAccess: [] as string[],
  });
  const [accessMatrix, setAccessMatrix] = useState<AccessMatrix>(() =>
    getDefaultAccessMatrix('L3_STAFF', 'HRD')
  );

  const openEditAccess = (u: UserAccountRecord) => {
    const dept = u.department || 'HRD';
    const lvl = u.userLevel || 'L3_STAFF';
    const existingAccess =
      Array.isArray(u.departmentAccess) && u.departmentAccess.length > 0
        ? u.departmentAccess
        : Array.isArray(u.allowedDivisions) && u.allowedDivisions.length > 0
        ? u.allowedDivisions
        : [dept];
    setEditingUser(u);
    setAccessForm({
      department: dept,
      userLevel: lvl,
      roleId: u.roleId || '',
      departmentAccess: existingAccess,
    });
    setAccessMatrix(
      Array.isArray(u.customPermissions) && u.customPermissions.length > 0
        ? permissionsToMatrix(u.customPermissions)
        : getDefaultAccessMatrix(lvl, dept)
    );
  };

  const updateAccessMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      updateEmployeeAccessApi(id, {
        userLevel: payload.userLevel,
        department: payload.department,
        departmentAccess: payload.departmentAccess,
        roleName: payload.roleId || null,
        isActive: editingUser?.isActive !== false,
      }),
    onSuccess: (res) => {
      if (res?.keycloakSynced === false) {
        toast.warning('Hak akses tersimpan di DB, namun sinkronisasi Keycloak sedang offline.');
      } else {
        toast.success('Hak akses pengguna diperbarui & disinkronkan ke Keycloak');
      }
      queryClient.invalidateQueries({ queryKey: ['userManagementUsers'] });
      queryClient.invalidateQueries({ queryKey: ['hrd', 'employees'] });
      setEditingUser(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Gagal memperbarui hak akses');
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      suspendEmployeeApi(id, isActive),
    onSuccess: (res) => {
      if (res?.keycloakSynced === false) {
        toast.warning('Status akun diperbarui di DB, namun Keycloak sedang offline.');
      } else {
        toast.success('Status akun pengguna diperbarui');
      }
      queryClient.invalidateQueries({ queryKey: ['userManagementUsers'] });
      queryClient.invalidateQueries({ queryKey: ['hrd', 'employees'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Gagal mengubah status akun');
    },
  });

  // ── Soft Delete User / Role Confirmation ────────────────────────────────
  const [confirmTarget, setConfirmTarget] = useState<{
    type: 'user' | 'role';
    id: string;
    label: string;
  } | null>(null);

  const deleteUserMutation = useMutation({
    mutationFn: deleteEmployeeApi,
    onSuccess: (res) => {
      if (res?.keycloakSynced === false) {
        toast.warning('Akun dinonaktifkan di DB, namun sinkronisasi Keycloak sedang offline.');
      } else {
        toast.success('Akun pengguna dinonaktifkan (Soft Delete)');
      }
      queryClient.invalidateQueries({ queryKey: ['userManagementUsers'] });
      queryClient.invalidateQueries({ queryKey: ['hrd', 'employees'] });
      setConfirmTarget(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Gagal menonaktifkan akun');
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: deleteUserManagementRoleApi,
    onSuccess: () => {
      toast.success('Role berhasil dinonaktifkan (Soft Delete)');
      queryClient.invalidateQueries({ queryKey: ['userManagementRoles'] });
      setConfirmTarget(null);
    },
  });

  // ── Role Modal ──────────────────────────────────────────────────────────
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleRecord | null>(null);
  const [roleForm, setRoleForm] = useState({ name: '', description: '' });
  const [roleMatrix, setRoleMatrix] = useState<AccessMatrix>(() =>
    getDefaultAccessMatrix('L3_STAFF', 'HRD')
  );

  const openCreateRole = () => {
    setEditingRole(null);
    setRoleForm({ name: '', description: '' });
    setRoleMatrix(getDefaultAccessMatrix('L3_STAFF', 'HRD'));
    setRoleModalOpen(true);
  };

  const openEditRole = (role: RoleRecord) => {
    setEditingRole(role);
    setRoleForm({ name: role.name, description: role.description || '' });
    setRoleMatrix(permissionsToMatrix(role.permissions || []));
    setRoleModalOpen(true);
  };

  const saveRoleMutation = useMutation({
    mutationFn: async () => {
      const permissions = matrixToPermissions(roleMatrix);
      if (editingRole) {
        return updateUserManagementRoleApi(editingRole.id, {
          name: roleForm.name,
          description: roleForm.description,
          permissions,
        });
      }
      return createUserManagementRoleApi({
        name: roleForm.name,
        description: roleForm.description,
        permissions,
      });
    },
    onSuccess: () => {
      toast.success(editingRole ? 'Role diperbarui' : 'Role baru ditambahkan');
      queryClient.invalidateQueries({ queryKey: ['userManagementRoles'] });
      setRoleModalOpen(false);
    },
  });

  if (!canManage) {
    return (
      <div className="p-8 text-center rounded-2xl border border-slate-200 bg-white text-slate-500">
        Manajemen Pengguna hanya dapat diakses oleh Divisi HRD (termasuk IT), Direksi (L1), atau Super Admin (L0).
      </div>
    );
  }

  const toggleDivision = (list: string[], code: string, setter: (v: string[]) => void) => {
    if (list.includes(code)) {
      setter(list.filter((d) => d !== code));
    } else {
      setter([...list, code]);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSubTab('users')}
            className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer ${
              subTab === 'users'
                ? 'bg-violet-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Daftar Pengguna ({totalUsersCount})</span>
          </button>
          <button
            onClick={() => setSubTab('roles')}
            className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer ${
              subTab === 'roles'
                ? 'bg-violet-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Manajemen Role ({rolesList.length})</span>
          </button>
        </div>

        {subTab === 'roles' && (
          <button
            onClick={openCreateRole}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold flex items-center gap-2 cursor-pointer"
          >
            <Shield className="w-4 h-4" />
            <span>Tambah Role</span>
          </button>
        )}
      </div>

      {subTab === 'users' && (
        <>
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Cari nama, username, email..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <select
              value={filterDept}
              onChange={(e) => {
                setFilterDept(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
            >
              <option value="ALL">Semua Divisi</option>
              {divisions.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>

            <select
              value={filterLevel}
              onChange={(e) => {
                setFilterLevel(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
            >
              <option value="ALL">Semua Level RBAC</option>
              {userLevels.map((lvl) => (
                <option key={lvl.value} value={lvl.value}>
                  {lvl.label}
                </option>
              ))}
            </select>

            <select
              value={filterActive}
              onChange={(e) => {
                setFilterActive(e.target.value as any);
                setPage(1);
              }}
              className="px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
            >
              <option value="ALL">Semua Status</option>
              <option value="true">Aktif</option>
              <option value="false">Non-Aktif</option>
            </select>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase">
                  <th className="py-3 px-4">Pengguna</th>
                  <th className="py-3 px-4">Divisi & Akses</th>
                  <th className="py-3 px-4">Level & Role</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {loadingUsers ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      <Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Memuat data pengguna...
                    </td>
                  </tr>
                ) : usersList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      Belum ada pengguna yang sesuai filter.
                    </td>
                  </tr>
                ) : (
                  usersList.map((u) => {
                    const displayName =
                      u.fullName ||
                      [u.firstName, u.lastName].filter(Boolean).join(' ') ||
                      u.username;
                    const active = u.isActive !== false;
                    const divAccess = u.departmentAccess || u.allowedDivisions || [];
                    return (
                      <tr key={u.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{displayName}</div>
                          <div className="text-xs text-slate-500">
                            @{u.username} • {u.email}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800">
                            {findOptionLabel(divisions, u.department || '') || u.department || '-'}
                          </div>
                          {Array.isArray(divAccess) && divAccess.length > 0 && (
                            <div className="text-xs text-slate-500 mt-0.5">
                              Akses: {divAccess.join(', ')}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-block px-2 py-0.5 rounded-md bg-violet-100 text-violet-800 text-xs font-bold">
                            {u.userLevel || '-'}
                          </span>
                          {(u.roleName || u.roleId) && (
                            <div className="text-xs text-slate-600 mt-0.5">
                              {u.roleName || u.roleId}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() =>
                              toggleStatusMutation.mutate({ id: u.id, isActive: !active })
                            }
                            disabled={toggleStatusMutation.isPending}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold cursor-pointer ${
                              active
                                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                : 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                            }`}
                          >
                            {active ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" /> Aktif
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3.5 h-3.5" /> Non-Aktif
                              </>
                            )}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => openEditAccess(u)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-violet-100 text-slate-700 hover:text-violet-800 text-xs font-bold cursor-pointer"
                            >
                              <Key className="w-3.5 h-3.5" />
                              <span>Atur Akses</span>
                            </button>
                            <button
                              onClick={() =>
                                setConfirmTarget({
                                  type: 'user',
                                  id: u.id,
                                  label: displayName,
                                })
                              }
                              className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 cursor-pointer"
                              title="Nonaktifkan / Hapus Akun"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Pagination Bar — Daftar Pengguna */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 bg-slate-50/70 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <span>
                  Halaman <span className="font-bold text-slate-900">{page}</span> dari{' '}
                  <span className="font-bold text-slate-900">{totalUserPages}</span> • Total{' '}
                  <span className="font-bold text-slate-900">{totalUsersCount}</span> pengguna
                </span>
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5">
                  <span>Per halaman:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                    className="px-2 py-1 rounded-lg border border-slate-300 bg-white text-xs font-semibold"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </label>
                <button
                  type="button"
                  disabled={page <= 1 || loadingUsers}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 font-semibold disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                >
                  Sebelumnya
                </button>
                <button
                  type="button"
                  disabled={page >= totalUserPages || loadingUsers}
                  onClick={() => setPage((p) => Math.min(totalUserPages, p + 1))}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 font-semibold disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                >
                  Berikutnya
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {subTab === 'roles' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loadingRoles ? (
              <div className="col-span-full py-8 text-center text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Memuat daftar role...
              </div>
            ) : rolesList.length === 0 ? (
              <div className="col-span-full py-8 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
                Belum ada role kustom. Klik "Tambah Role" untuk membuat role baru.
              </div>
            ) : (
              pagedRoles.map((role, roleIdx) => {
              const rolePerms = Array.isArray(role?.permissions)
                ? role.permissions.map((p) => (typeof p === 'string' ? p : String(p)))
                : [];
              return (
              <div
                key={role?.id || `role-${roleIdx}`}
                className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-bold text-slate-900 text-base">{role?.name || 'Unnamed Role'}</h4>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditRole(role)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-violet-700 cursor-pointer"
                        title="Edit Role"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {!role?.isSystem && (
                        <button
                          onClick={() =>
                            setConfirmTarget({
                              type: 'role',
                              id: role.id,
                              label: role.name,
                            })
                          }
                          className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-500 hover:text-rose-600 cursor-pointer"
                          title="Hapus Role"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {role?.description || 'Tidak ada deskripsi'}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {rolePerms.slice(0, 6).map((p, idx) => (
                      <span
                        key={`${role?.id || roleIdx}-${idx}-${p}`}
                        className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-mono"
                      >
                        {p}
                      </span>
                    ))}
                    {rolePerms.length > 6 && (
                      <span className="px-2 py-0.5 rounded bg-violet-50 text-violet-700 text-[11px] font-bold">
                        +{rolePerms.length - 6} lainnya
                      </span>
                    )}
                  </div>
                </div>
                {role?.userCount !== undefined && (
                  <div className="text-xs text-slate-500 border-t border-slate-100 pt-2">
                    Digunakan oleh <span className="font-bold">{role.userCount}</span> pengguna
                  </div>
                )}
              </div>
              );
            })
          )}
          </div>

          {/* Pagination Bar — Manajemen Role */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-2xl border border-slate-200 bg-white text-xs text-slate-600">
            <div>
              Halaman <span className="font-bold text-slate-900">{rolePage}</span> dari{' '}
              <span className="font-bold text-slate-900">{totalRolePages}</span> • Total{' '}
              <span className="font-bold text-slate-900">{rolesList.length}</span> role
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5">
                <span>Per halaman:</span>
                <select
                  value={rolePageSize}
                  onChange={(e) => {
                    setRolePageSize(Number(e.target.value));
                    setRolePage(1);
                  }}
                  className="px-2 py-1 rounded-lg border border-slate-300 bg-white text-xs font-semibold"
                >
                  <option value={9}>9</option>
                  <option value={18}>18</option>
                  <option value={30}>30</option>
                </select>
              </label>
              <button
                type="button"
                disabled={rolePage <= 1 || loadingRoles}
                onClick={() => setRolePage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 font-semibold disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                Sebelumnya
              </button>
              <button
                type="button"
                disabled={rolePage >= totalRolePages || loadingRoles}
                onClick={() => setRolePage((p) => Math.min(totalRolePages, p + 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 font-semibold disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                Berikutnya
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Access Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Atur Akses — {editingUser.fullName || editingUser.username}
                </h3>
                <p className="text-xs text-slate-500">{editingUser.email}</p>
              </div>
              <button onClick={() => setEditingUser(null)} className="p-1 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Divisi Utama</label>
                <select
                  value={accessForm.department}
                  onChange={(e) => {
                    const nextDept = e.target.value;
                    const oldDept = accessForm.department;
                    const nextAccess = Array.from(
                      new Set([
                        ...accessForm.departmentAccess.filter((d) => d !== oldDept),
                        nextDept,
                      ])
                    );
                    setAccessForm({
                      ...accessForm,
                      department: nextDept,
                      departmentAccess: nextAccess,
                    });
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                >
                  {divisions.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Level RBAC</label>
                <select
                  value={accessForm.userLevel}
                  onChange={(e) => setAccessForm({ ...accessForm, userLevel: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                >
                  {userLevels.map((lvl) => (
                    <option key={lvl.value} value={lvl.value}>
                      {lvl.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Role</label>
                <select
                  value={accessForm.roleId}
                  onChange={(e) => setAccessForm({ ...accessForm, roleId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                >
                  <option value="">-- Default --</option>
                  {rolesList.map((r) => (
                    <option key={r.id} value={r.name}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Akses Lintas Departemen (`department_access`)
              </label>
              <div className="flex flex-wrap gap-2">
                {OFFICIAL_DIVISIONS.map((divCode) => (
                  <label
                    key={divCode}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-semibold cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={accessForm.departmentAccess.includes(divCode)}
                      onChange={() =>
                        toggleDivision(accessForm.departmentAccess, divCode, (v) =>
                          setAccessForm({ ...accessForm, departmentAccess: v })
                        )
                      }
                    />
                    <span>{divCode}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="border-t pt-3">
              <CustomAccessMatrix
                value={accessMatrix}
                onChange={setAccessMatrix}
                userLevel={accessForm.userLevel}
                department={accessForm.department}
              />
            </div>

            <div className="flex justify-end gap-2 border-t pt-3">
              <button
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-sm font-bold text-slate-700"
              >
                Batal
              </button>
              <button
                disabled={updateAccessMutation.isPending}
                onClick={() =>
                  updateAccessMutation.mutate({
                    id: editingUser.id,
                    payload: {
                      ...accessForm,
                      roleId: accessForm.roleId || undefined,
                      allowedDivisions: accessForm.departmentAccess,
                      customPermissions: matrixToPermissions(accessMatrix),
                    },
                  })
                }
                className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold disabled:opacity-50"
              >
                {updateAccessMutation.isPending ? 'Menyimpan...' : 'Simpan Perubahan Akses'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Role Modal */}
      {roleModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-slate-900">
                {editingRole ? `Edit Role: ${editingRole.name}` : 'Buat Role Baru'}
              </h3>
              <button onClick={() => setRoleModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Role *</label>
                <input
                  type="text"
                  value={roleForm.name}
                  onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Deskripsi</label>
                <input
                  type="text"
                  value={roleForm.description}
                  onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>
            </div>

            <CustomAccessMatrix value={roleMatrix} onChange={setRoleMatrix} />

            <div className="flex justify-end gap-2 border-t pt-3">
              <button
                onClick={() => setRoleModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-sm font-bold text-slate-700"
              >
                Batal
              </button>
              <button
                disabled={saveRoleMutation.isPending || !roleForm.name}
                onClick={() => saveRoleMutation.mutate()}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold disabled:opacity-50"
              >
                {saveRoleMutation.isPending ? 'Menyimpan...' : 'Simpan Role'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Soft Delete Confirmation */}
      <ConfirmActionModal
        open={!!confirmTarget}
        variant="danger"
        title={confirmTarget?.type === 'user' ? 'Nonaktifkan Akun Pengguna?' : 'Hapus Role?'}
        message={`Batalkan / Nonaktifkan ${
          confirmTarget?.type === 'user' ? 'akun' : 'role'
        } "${confirmTarget?.label}"? Data akan ditandai nonaktif (Soft Delete) dan tidak muncul di daftar aktif.`}
        confirmLabel="Ya, Nonaktifkan"
        loading={deleteUserMutation.isPending || deleteRoleMutation.isPending}
        onCancel={() => setConfirmTarget(null)}
        onConfirm={() => {
          if (!confirmTarget) return;
          if (confirmTarget.type === 'user') deleteUserMutation.mutate(confirmTarget.id);
          else deleteRoleMutation.mutate(confirmTarget.id);
        }}
      />
    </div>
  );
};
