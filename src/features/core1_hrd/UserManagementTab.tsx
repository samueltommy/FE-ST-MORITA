import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  UserPlus,
  Shield,
  Search,
  CheckCircle2,
  XCircle,
  Key,
  X,
  Loader2,
  Pencil,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getUserManagementUsersApi,
  createUserManagementUserApi,
  updateUserAccessApi,
  updateUserStatusApi,
  getUserManagementRolesApi,
  createUserManagementRoleApi,
  updateUserManagementRoleApi,
  UserAccountRecord,
  RoleRecord,
} from '../../services/userManagementService';
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

const asOptions = (data: any, fallback: SelectOption[]): SelectOption[] =>
  Array.isArray(data) && data.length > 0 ? data : fallback;

export const UserManagementTab: React.FC = () => {
  const queryClient = useQueryClient();
  const { isSuperAdmin, isExecutive, isAdminBidang } = useRBAC();
  const canManage = isSuperAdmin || isExecutive || isAdminBidang;

  const [subTab, setSubTab] = useState<'users' | 'roles'>('users');
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('ALL');
  const [filterLevel, setFilterLevel] = useState('ALL');
  const [filterActive, setFilterActive] = useState<'ALL' | 'true' | 'false'>('ALL');

  const { data: deptChoices } = useSystemChoices('departments');
  const { data: levelChoices } = useSystemChoices('user-levels');
  const divisions = asOptions(deptChoices, DEFAULT_DIVISIONS);
  const userLevels = asOptions(levelChoices, DEFAULT_USER_LEVELS);

  const { data: usersRes, isLoading: loadingUsers } = useQuery({
    queryKey: ['userManagementUsers', search, filterDept, filterLevel, filterActive],
    queryFn: () =>
      getUserManagementUsersApi({
        search: search || undefined,
        department: filterDept,
        userLevel: filterLevel,
        isActive: filterActive === 'ALL' ? undefined : filterActive === 'true',
      }),
    enabled: canManage,
  });
  const usersList = usersRes?.data || [];

  const { data: rolesList = [], isLoading: loadingRoles } = useQuery({
    queryKey: ['userManagementRoles'],
    queryFn: getUserManagementRolesApi,
    enabled: canManage,
  });

  // ── Create User Modal ───────────────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    password: '',
    department: 'HRD',
    userLevel: 'L3_STAFF',
    roleId: '',
    allowedDivisions: ['HRD'] as string[],
  });
  const [newUserMatrix, setNewUserMatrix] = useState<AccessMatrix>(() =>
    getDefaultAccessMatrix('L3_STAFF', 'HRD')
  );

  const createUserMutation = useMutation({
    mutationFn: createUserManagementUserApi,
    onSuccess: () => {
      toast.success('Akun pengguna berhasil dibuat');
      queryClient.invalidateQueries({ queryKey: ['userManagementUsers'] });
      setCreateOpen(false);
    },
  });

  // ── Edit Access Modal ───────────────────────────────────────────────────
  const [editingUser, setEditingUser] = useState<UserAccountRecord | null>(null);
  const [accessForm, setAccessForm] = useState({
    department: 'HRD',
    userLevel: 'L3_STAFF',
    roleId: '',
    allowedDivisions: [] as string[],
  });
  const [accessMatrix, setAccessMatrix] = useState<AccessMatrix>(() =>
    getDefaultAccessMatrix('L3_STAFF', 'HRD')
  );

  const openEditAccess = (u: UserAccountRecord) => {
    const dept = u.department || 'HRD';
    const lvl = u.userLevel || 'L3_STAFF';
    setEditingUser(u);
    setAccessForm({
      department: dept,
      userLevel: lvl,
      roleId: u.roleId || '',
      allowedDivisions: Array.isArray(u.allowedDivisions) && u.allowedDivisions.length > 0
        ? u.allowedDivisions
        : [dept],
    });
    setAccessMatrix(
      Array.isArray(u.customPermissions) && u.customPermissions.length > 0
        ? permissionsToMatrix(u.customPermissions)
        : getDefaultAccessMatrix(lvl, dept)
    );
  };

  const updateAccessMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      updateUserAccessApi(id, payload),
    onSuccess: () => {
      toast.success('Hak akses pengguna diperbarui');
      queryClient.invalidateQueries({ queryKey: ['userManagementUsers'] });
      setEditingUser(null);
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      updateUserStatusApi(id, isActive),
    onSuccess: () => {
      toast.success('Status akun pengguna diperbarui');
      queryClient.invalidateQueries({ queryKey: ['userManagementUsers'] });
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
        Manajemen Pengguna hanya dapat diakses oleh Super Admin, Direksi, atau Manager.
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
      {/* Sub-navigation */}
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
            <span>Daftar Pengguna ({usersList.length})</span>
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

        {subTab === 'users' ? (
          <button
            onClick={() => setCreateOpen(true)}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold flex items-center gap-2 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Tambah Pengguna</span>
          </button>
        ) : (
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
          {/* Filter Bar */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama, username, email..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
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
              onChange={(e) => setFilterLevel(e.target.value)}
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
              onChange={(e) => setFilterActive(e.target.value as any)}
              className="px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
            >
              <option value="ALL">Semua Status</option>
              <option value="true">Aktif</option>
              <option value="false">Non-Aktif</option>
            </select>
          </div>

          {/* Users Table */}
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
                          {Array.isArray(u.allowedDivisions) && u.allowedDivisions.length > 0 && (
                            <div className="text-xs text-slate-500 mt-0.5">
                              Akses: {u.allowedDivisions.join(', ')}
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
                          <button
                            onClick={() => openEditAccess(u)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-violet-100 text-slate-700 hover:text-violet-800 text-xs font-bold cursor-pointer"
                          >
                            <Key className="w-3.5 h-3.5" />
                            <span>Atur Akses</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {subTab === 'roles' && (
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
            rolesList.map((role) => (
              <div
                key={role.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-bold text-slate-900 text-base">{role.name}</h4>
                    <button
                      onClick={() => openEditRole(role)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-violet-700 cursor-pointer"
                      title="Edit Role"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {role.description || 'Tidak ada deskripsi'}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {(role.permissions || []).slice(0, 6).map((p) => (
                      <span
                        key={p}
                        className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-mono"
                      >
                        {p}
                      </span>
                    ))}
                    {(role.permissions || []).length > 6 && (
                      <span className="px-2 py-0.5 rounded bg-violet-50 text-violet-700 text-[11px] font-bold">
                        +{role.permissions.length - 6} lainnya
                      </span>
                    )}
                  </div>
                </div>
                {role.userCount !== undefined && (
                  <div className="text-xs text-slate-500 border-t border-slate-100 pt-2">
                    Digunakan oleh <span className="font-bold">{role.userCount}</span> pengguna
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Create User Modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-slate-900">Tambah Akun Pengguna Baru</h3>
              <button onClick={() => setCreateOpen(false)} className="p-1 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Username *</label>
                <input
                  type="text"
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Depan</label>
                <input
                  type="text"
                  value={newUser.firstName}
                  onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nama Belakang</label>
                <input
                  type="text"
                  value={newUser.lastName}
                  onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Password Awal *</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Divisi Utama</label>
                <select
                  value={newUser.department}
                  onChange={(e) => {
                    const dept = e.target.value;
                    setNewUser({
                      ...newUser,
                      department: dept,
                      allowedDivisions: [dept],
                    });
                    setNewUserMatrix(getDefaultAccessMatrix(newUser.userLevel, dept));
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
                  value={newUser.userLevel}
                  onChange={(e) => {
                    const lvl = e.target.value;
                    setNewUser({ ...newUser, userLevel: lvl });
                    setNewUserMatrix(getDefaultAccessMatrix(lvl, newUser.department));
                  }}
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
                <label className="block font-semibold text-slate-700 mb-1">Role (Opsional)</label>
                <select
                  value={newUser.roleId}
                  onChange={(e) => setNewUser({ ...newUser, roleId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
                >
                  <option value="">-- Otomatis / Default --</option>
                  {rolesList.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Divisi yang Diizinkan (Allowed Divisions)
              </label>
              <div className="flex flex-wrap gap-2">
                {OFFICIAL_DIVISIONS.map((divCode) => (
                  <label
                    key={divCode}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-semibold cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={newUser.allowedDivisions.includes(divCode)}
                      onChange={() =>
                        toggleDivision(newUser.allowedDivisions, divCode, (v) =>
                          setNewUser({ ...newUser, allowedDivisions: v })
                        )
                      }
                    />
                    <span>{divCode}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="border-t pt-3">
              <CustomAccessMatrix matrix={newUserMatrix} onChange={setNewUserMatrix} />
            </div>

            <div className="flex justify-end gap-2 border-t pt-3">
              <button
                onClick={() => setCreateOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-sm font-bold text-slate-700"
              >
                Batal
              </button>
              <button
                disabled={createUserMutation.isPending || !newUser.username || !newUser.email || !newUser.password}
                onClick={() =>
                  createUserMutation.mutate({
                    ...newUser,
                    roleId: newUser.roleId || undefined,
                    customPermissions: matrixToPermissions(newUserMatrix),
                  })
                }
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold disabled:opacity-50"
              >
                {createUserMutation.isPending ? 'Menyimpan...' : 'Simpan Pengguna'}
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
                  onChange={(e) => setAccessForm({ ...accessForm, department: e.target.value })}
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
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Divisi yang Diizinkan
              </label>
              <div className="flex flex-wrap gap-2">
                {OFFICIAL_DIVISIONS.map((divCode) => (
                  <label
                    key={divCode}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-semibold cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={accessForm.allowedDivisions.includes(divCode)}
                      onChange={() =>
                        toggleDivision(accessForm.allowedDivisions, divCode, (v) =>
                          setAccessForm({ ...accessForm, allowedDivisions: v })
                        )
                      }
                    />
                    <span>{divCode}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="border-t pt-3">
              <CustomAccessMatrix matrix={accessMatrix} onChange={setAccessMatrix} />
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

            <CustomAccessMatrix matrix={roleMatrix} onChange={setRoleMatrix} />

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
    </div>
  );
};

