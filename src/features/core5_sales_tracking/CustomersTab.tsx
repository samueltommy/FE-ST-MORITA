import React, { useState } from 'react';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Save,
  X,
  ChevronDown,
  ChevronRight,
  MapPin,
  Building2,
  Loader2,
  Star,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  listSalesCustomersApi,
  createSalesCustomerApi,
  updateSalesCustomerApi,
  deleteSalesCustomerApi,
  createCustomerAddressApi,
  updateCustomerAddressApi,
  deleteCustomerAddressApi,
  listSalesDropdownEmployeesApi,
  extractSalesErrorMessage,
  SalesCustomerRecord,
  SalesCustomerPayload,
  CustomerAddressPayload,
  CustomerAddressRecord,
  CustomerAddressType,
} from '../../services/salesService';
import { formatIDR } from '../../utils/invoiceCalculator';
import { ConfirmActionModal } from '../core1_hrd/ConfirmActionModal';
import { useRBAC } from '../../hooks/useRBAC';

const emptyCustomerDraft = (): SalesCustomerPayload => ({
  customerCode: '',
  name: '',
  companyName: '',
  status: 'NEW',
  businessType: '',
  npwp: '',
  nik: '',
  taxTransactionCode: '010',
  pkpStatus: 'PKP',
  namaNpwp: '',
  alamatPajakLengkap: '',
  salesPersonId: '',
  website: '',
  creditLimit: 0,
  paymentTerm: 'NET 30',
  paymentTermsDays: 30,
  contactPersonName: '',
  contactEmail: '',
  contactPhone: '',
  address: '',
  billingAddress: '',
  city: '',
  province: '',
  zoning: '',
  postalCode: '',
  latitude: undefined,
  longitude: undefined,
  isActive: true,
});

const emptyAddressDraft = (): CustomerAddressPayload => ({
  addressLabel: '',
  addressType: 'SHIPPING',
  recipientName: '',
  recipientPhone: '',
  fullAddress: '',
  city: '',
  province: '',
  zoning: '',
  postalCode: '',
  latitude: undefined,
  longitude: undefined,
  isPrimary: false,
});

const TAX_CODES = [
  { code: '010', label: '010 — Penyerahan BKP/JKP Umum' },
  { code: '040', label: '040 — DPP Nilai Lain' },
  { code: '070', label: '070 — Kawasan Berikat / PPN Tidak Dipungut' },
  { code: '080', label: '080 — PPN Dibebaskan' },
];

const PAYMENT_TERMS = ['COD', 'CBD', 'NET 7', 'NET 14', 'NET 30', 'NET 45', 'NET 60', 'NET 90'];
const ADDRESS_TYPES: CustomerAddressType[] = ['SHIPPING', 'BILLING', 'OFFICE', 'WAREHOUSE'];

export const CustomersTab: React.FC = () => {
  const queryClient = useQueryClient();
  const { isSuperAdmin, isExecutive, isAdminBidang, userDivision } = useRBAC();

  const canMutate = isSuperAdmin || isExecutive || userDivision === 'SALES' || userDivision === 'FINANCE';
  const canDelete = isSuperAdmin || isExecutive || (isAdminBidang && (userDivision === 'SALES' || userDivision === 'FINANCE'));

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [pkpFilter, setPkpFilter] = useState('ALL');
  const [zoningFilter, setZoningFilter] = useState('');

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<SalesCustomerPayload>(emptyCustomerDraft);
  const [deleteTarget, setDeleteTarget] = useState<SalesCustomerRecord | null>(null);

  // Multi-address inline state per expanded customer
  const [addrAddingFor, setAddrAddingFor] = useState<string | null>(null);
  const [addrEditingId, setAddrEditingId] = useState<string | null>(null);
  const [addrDraft, setAddrDraft] = useState<CustomerAddressPayload>(emptyAddressDraft);

  const { data: res, isLoading } = useQuery({
    queryKey: ['salesCustomers', page, search, statusFilter, pkpFilter, zoningFilter],
    queryFn: () =>
      listSalesCustomersApi({
        page,
        limit: 20,
        search: search || undefined,
        status: statusFilter,
        pkpStatus: pkpFilter,
        zoning: zoningFilter || undefined,
      }),
  });
  const customers = res?.data || [];
  const totalPages = res?.meta?.totalPages || res?.meta?.total_pages || 1;

  const { data: salesEmployees = [] } = useQuery({
    queryKey: ['salesDropdownEmployees'],
    queryFn: listSalesDropdownEmployeesApi,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['salesCustomers'] });
    queryClient.invalidateQueries({ queryKey: ['salesDropdownCustomers'] });
  };

  const saveCustomerMut = useMutation({
    mutationFn: async () => {
      const payload: SalesCustomerPayload = {
        ...draft,
        companyName: draft.companyName?.trim() || draft.name.trim(),
        salesPersonId: draft.salesPersonId || null,
        customerCode: draft.customerCode?.trim() || undefined,
        latitude: draft.latitude !== undefined && !Number.isNaN(Number(draft.latitude)) ? Number(draft.latitude) : null,
        longitude: draft.longitude !== undefined && !Number.isNaN(Number(draft.longitude)) ? Number(draft.longitude) : null,
      };
      if (editingId) {
        return updateSalesCustomerApi(editingId, payload);
      }
      return createSalesCustomerApi(payload);
    },
    onSuccess: () => {
      toast.success(editingId ? 'Data customer berhasil diperbarui' : 'Customer baru berhasil ditambahkan');
      invalidate();
      setFormOpen(false);
      setEditingId(null);
      setDraft(emptyCustomerDraft());
    },
    onError: (err) => toast.error(extractSalesErrorMessage(err, 'Gagal menyimpan data customer')),
  });

  const deleteCustomerMut = useMutation({
    mutationFn: (id: string) => deleteSalesCustomerApi(id),
    onSuccess: () => {
      toast.success('Customer berhasil dihapus');
      invalidate();
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(extractSalesErrorMessage(err, 'Gagal menghapus customer')),
  });

  const saveAddressMut = useMutation({
    mutationFn: async ({ customerId }: { customerId: string }) => {
      const payload: CustomerAddressPayload = {
        ...addrDraft,
        latitude: addrDraft.latitude !== undefined && addrDraft.latitude !== null && !Number.isNaN(Number(addrDraft.latitude))
          ? Number(addrDraft.latitude)
          : null,
        longitude: addrDraft.longitude !== undefined && addrDraft.longitude !== null && !Number.isNaN(Number(addrDraft.longitude))
          ? Number(addrDraft.longitude)
          : null,
      };
      if (addrEditingId) {
        return updateCustomerAddressApi(customerId, addrEditingId, payload);
      }
      return createCustomerAddressApi(customerId, payload);
    },
    onSuccess: () => {
      toast.success(addrEditingId ? 'Alamat berhasil diperbarui' : 'Alamat baru berhasil ditambahkan');
      invalidate();
      setAddrAddingFor(null);
      setAddrEditingId(null);
      setAddrDraft(emptyAddressDraft());
    },
    onError: (err) => toast.error(extractSalesErrorMessage(err, 'Gagal menyimpan alamat customer')),
  });

  const deleteAddressMut = useMutation({
    mutationFn: ({ customerId, addressId }: { customerId: string; addressId: string }) =>
      deleteCustomerAddressApi(customerId, addressId),
    onSuccess: () => {
      toast.success('Alamat berhasil dihapus');
      invalidate();
    },
    onError: (err) => toast.error(extractSalesErrorMessage(err, 'Gagal menghapus alamat')),
  });

  const openCreate = () => {
    setEditingId(null);
    setDraft(emptyCustomerDraft());
    setFormOpen(true);
  };

  const openEdit = (c: SalesCustomerRecord) => {
    setEditingId(c.id);
    setDraft({
      customerCode: c.customerCode,
      name: c.name,
      companyName: c.companyName,
      status: (c.status === 'NEW' ? 'NEW' : 'OLD') as 'NEW' | 'OLD',
      businessType: c.businessType || '',
      npwp: c.npwp || '',
      nik: c.nik || '',
      taxTransactionCode: c.taxTransactionCode || '010',
      pkpStatus: (c.pkpStatus === 'PKP' ? 'PKP' : 'NON_PKP') as 'PKP' | 'NON_PKP',
      namaNpwp: c.namaNpwp || '',
      alamatPajakLengkap: c.alamatPajakLengkap || '',
      salesPersonId: c.salesPersonId || '',
      website: c.website || '',
      creditLimit: c.creditLimit,
      paymentTerm: c.paymentTerm,
      paymentTermsDays: c.paymentTermsDays,
      contactPersonName: c.contactPersonName || '',
      contactEmail: c.contactEmail || '',
      contactPhone: c.contactPhone || '',
      address: c.address || '',
      billingAddress: c.billingAddress || '',
      city: c.city || '',
      province: c.province || '',
      zoning: c.zoning || '',
      postalCode: c.postalCode || '',
      latitude: c.latitude ?? undefined,
      longitude: c.longitude ?? undefined,
      isActive: c.isActive,
    });
    setFormOpen(true);
  };

  const startEditAddress = (customerId: string, a: CustomerAddressRecord) => {
    setAddrAddingFor(customerId);
    setAddrEditingId(a.id);
    setAddrDraft({
      addressLabel: a.addressLabel,
      addressType: (ADDRESS_TYPES.includes(a.addressType as CustomerAddressType)
        ? a.addressType
        : 'SHIPPING') as CustomerAddressType,
      recipientName: a.recipientName || '',
      recipientPhone: a.recipientPhone || '',
      fullAddress: a.fullAddress,
      city: a.city || '',
      province: a.province || '',
      zoning: a.zoning || '',
      postalCode: a.postalCode || '',
      latitude: a.latitude ?? undefined,
      longitude: a.longitude ?? undefined,
      isPrimary: a.isPrimary,
    });
  };

  const handleSubmitCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.name.trim()) {
      toast.error('Nama Customer wajib diisi');
      return;
    }
    saveCustomerMut.mutate();
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px]">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Cari nama, kode, NPWP..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-amber-500 outline-none"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-semibold"
          >
            <option value="ALL">Semua Status (Baru/Lama)</option>
            <option value="NEW">Customer Baru (NEW)</option>
            <option value="OLD">Customer Lama (OLD)</option>
          </select>
          <select
            value={pkpFilter}
            onChange={(e) => {
              setPkpFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-semibold"
          >
            <option value="ALL">Semua Pajak (PKP/Non-PKP)</option>
            <option value="PKP">PKP</option>
            <option value="NON_PKP">NON-PKP</option>
          </select>
          <input
            type="text"
            value={zoningFilter}
            onChange={(e) => {
              setZoningFilter(e.target.value);
              setPage(1);
            }}
            placeholder="Filter Zonasi (cth: JABODETABEK)"
            className="px-3 py-2 text-xs rounded-xl border border-slate-300 w-44 outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {canMutate && (
          <button
            onClick={openCreate}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Customer (2.1.1)</span>
          </button>
        )}
      </div>

      {/* Create / Edit Customer Form Panel */}
      {formOpen && (
        <form
          onSubmit={handleSubmitCustomer}
          className="bg-white rounded-2xl border-2 border-amber-300 p-5 space-y-4 shadow-sm"
        >
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-amber-600" />
              {editingId ? 'Edit Master Customer' : 'Input Master Customer Baru (2.1.1)'}
            </h3>
            <button
              type="button"
              onClick={() => {
                setFormOpen(false);
                setEditingId(null);
              }}
              className="p-1 text-slate-400 hover:text-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Identitas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Kode Customer (Opsional/Auto)</label>
              <input
                type="text"
                value={draft.customerCode || ''}
                onChange={(e) => setDraft({ ...draft, customerCode: e.target.value })}
                placeholder="Auto-generate jika kosong"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Nama Customer / Perusahaan *</label>
              <input
                type="text"
                required
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value, companyName: e.target.value })}
                placeholder="PT Contoh Industri Indonesia"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Status Customer *</label>
              <select
                value={draft.status}
                onChange={(e) => setDraft({ ...draft, status: e.target.value as 'NEW' | 'OLD' })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-bold"
              >
                <option value="NEW">NEW (Customer Baru)</option>
                <option value="OLD">OLD (Customer Lama)</option>
              </select>
            </div>
          </div>

          {/* Pajak & Finance */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="text-xs font-black text-slate-700 uppercase">Informasi Perpajakan & Termin Pembayaran</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Status PKP</label>
                <select
                  value={draft.pkpStatus}
                  onChange={(e) => setDraft({ ...draft, pkpStatus: e.target.value as 'PKP' | 'NON_PKP' })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-bold"
                >
                  <option value="PKP">PKP (Pengusaha Kena Pajak)</option>
                  <option value="NON_PKP">NON_PKP</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Kode Transaksi Pajak</label>
                <select
                  value={draft.taxTransactionCode || '010'}
                  onChange={(e) => setDraft({ ...draft, taxTransactionCode: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white"
                >
                  {TAX_CODES.map((tc) => (
                    <option key={tc.code} value={tc.code}>{tc.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">NPWP (15/16 digit)</label>
                <input
                  type="text"
                  value={draft.npwp || ''}
                  onChange={(e) => setDraft({ ...draft, npwp: e.target.value })}
                  placeholder="01.234.567.8-901.000"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">NIK (Jika Perorangan/NPWP 16)</label>
                <input
                  type="text"
                  value={draft.nik || ''}
                  onChange={(e) => setDraft({ ...draft, nik: e.target.value })}
                  placeholder="3275xxxxxxxxxxxx"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Sesuai NPWP</label>
                <input
                  type="text"
                  value={draft.namaNpwp || ''}
                  onChange={(e) => setDraft({ ...draft, namaNpwp: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Alamat Pajak Lengkap</label>
                <input
                  type="text"
                  value={draft.alamatPajakLengkap || ''}
                  onChange={(e) => setDraft({ ...draft, alamatPajakLengkap: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Payment Term</label>
                <select
                  value={draft.paymentTerm || 'NET 30'}
                  onChange={(e) => {
                    const pt = e.target.value;
                    const daysMatch = pt.match(/\d+/);
                    setDraft({ ...draft, paymentTerm: pt, paymentTermsDays: daysMatch ? Number(daysMatch[0]) : 0 });
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-semibold"
                >
                  {PAYMENT_TERMS.map((pt) => (
                    <option key={pt} value={pt}>{pt}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Credit Limit (IDR)</label>
                <input
                  type="number"
                  min={0}
                  value={draft.creditLimit || 0}
                  onChange={(e) => setDraft({ ...draft, creditLimit: Number(e.target.value) || 0 })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Sales Person (PIC Internal)</label>
                <select
                  value={draft.salesPersonId || ''}
                  onChange={(e) => setDraft({ ...draft, salesPersonId: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white"
                >
                  <option value="">-- Pilih Sales Person --</option>
                  {salesEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName} {emp.nik ? `(${emp.nik})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Bidang Usaha</label>
                <input
                  type="text"
                  value={draft.businessType || ''}
                  onChange={(e) => setDraft({ ...draft, businessType: e.target.value })}
                  placeholder="Automotive / Electronics / Packaging"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                />
              </div>
            </div>
          </div>

          {/* Kontak, Zonasi & Alamat Utama */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nama PIC Customer</label>
              <input
                type="text"
                value={draft.contactPersonName || ''}
                onChange={(e) => setDraft({ ...draft, contactPersonName: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Telepon PIC</label>
              <input
                type="text"
                value={draft.contactPhone || ''}
                onChange={(e) => setDraft({ ...draft, contactPhone: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email PIC</label>
              <input
                type="email"
                value={draft.contactEmail || ''}
                onChange={(e) => setDraft({ ...draft, contactEmail: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Zonasi Wilayah</label>
              <input
                type="text"
                value={draft.zoning || ''}
                onChange={(e) => setDraft({ ...draft, zoning: e.target.value })}
                placeholder="JABODETABEK / KARAWANG / JAWA TIMUR"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Kota</label>
              <input
                type="text"
                value={draft.city || ''}
                onChange={(e) => setDraft({ ...draft, city: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Provinsi</label>
              <input
                type="text"
                value={draft.province || ''}
                onChange={(e) => setDraft({ ...draft, province: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Latitude (Opsional)</label>
              <input
                type="number"
                step="any"
                value={draft.latitude ?? ''}
                onChange={(e) => setDraft({ ...draft, latitude: e.target.value === '' ? undefined : Number(e.target.value) })}
                placeholder="-6.2088"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Longitude (Opsional)</label>
              <input
                type="number"
                step="any"
                value={draft.longitude ?? ''}
                onChange={(e) => setDraft({ ...draft, longitude: e.target.value === '' ? undefined : Number(e.target.value) })}
                placeholder="106.8456"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono"
              />
            </div>
            <div className="sm:col-span-4">
              <label className="block text-xs font-bold text-slate-700 mb-1">Alamat Kantor Utama</label>
              <textarea
                rows={2}
                value={draft.address || ''}
                onChange={(e) => setDraft({ ...draft, address: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => {
                setFormOpen(false);
                setEditingId(null);
              }}
              className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saveCustomerMut.isPending}
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
            >
              {saveCustomerMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{editingId ? 'Simpan Perubahan' : 'Simpan Customer'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Customer Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold uppercase border-b border-slate-200">
              <tr>
                <th className="p-3 w-8"></th>
                <th className="p-3">Kode & Customer</th>
                <th className="p-3">Status & Pajak</th>
                <th className="p-3">Zonasi & Sales</th>
                <th className="p-3">Termin & Plafon</th>
                <th className="p-3">PIC & Multi-Alamat</th>
                <th className="p-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                    Memuat data Master Customer...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    Belum ada data customer sesuai filter.
                  </td>
                </tr>
              ) : (
                customers.map((c) => {
                  const isExpanded = expandedId === c.id;
                  return (
                    <React.Fragment key={c.id}>
                      <tr className="hover:bg-slate-50/70">
                        <td className="p-3">
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : c.id)}
                            className="p-1 rounded-lg hover:bg-slate-200 text-slate-500 cursor-pointer"
                            title="Kelola Multi-Alamat"
                          >
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </button>
                        </td>
                        <td className="p-3">
                          <div className="font-mono font-bold text-blue-700">{c.customerCode}</div>
                          <div className="font-bold text-slate-900">{c.name}</div>
                          {c.businessType && <div className="text-[11px] text-slate-500">{c.businessType}</div>}
                        </td>
                        <td className="p-3 space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                c.status === 'NEW'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {c.status}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                c.pkpStatus === 'PKP'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {c.pkpStatus} {c.taxTransactionCode ? `(${c.taxTransactionCode})` : ''}
                            </span>
                          </div>
                          {c.npwp && <div className="font-mono text-[11px] text-slate-600">NPWP: {c.npwp}</div>}
                          {c.nik && <div className="font-mono text-[11px] text-slate-500">NIK: {c.nik}</div>}
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-slate-800">{c.zoning || c.province || c.city || '-'}</div>
                          <div className="text-[11px] text-slate-500">Sales: {c.salesPersonName || '-'}</div>
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-slate-800">{c.paymentTerm}</div>
                          <div className="font-mono text-[11px] text-slate-600">{formatIDR(c.creditLimit)}</div>
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-slate-800">{c.contactPersonName || '-'}</div>
                          <div className="text-[11px] text-slate-500">{c.contactPhone || c.contactEmail || '-'}</div>
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : c.id)}
                            className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 hover:underline cursor-pointer"
                          >
                            <MapPin className="w-3 h-3" />
                            <span>{c.addresses.length} Alamat Tersimpan</span>
                          </button>
                        </td>
                        <td className="p-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            {canMutate && (
                              <button
                                onClick={() => openEdit(c)}
                                className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 cursor-pointer"
                                title="Edit Customer"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                onClick={() => setDeleteTarget(c)}
                                className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer"
                                title="Hapus Customer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Multi-Alamat Panel */}
                      {isExpanded && (
                        <tr className="bg-amber-50/40">
                          <td colSpan={7} className="p-4">
                            <div className="space-y-3">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                  <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                                    <MapPin className="w-4 h-4 text-amber-600" />
                                    Multi-Alamat Customer — {c.name}
                                  </h4>
                                  {c.address && (
                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                      Alamat Utama: {c.address} {c.city ? `, ${c.city}` : ''}
                                    </p>
                                  )}
                                </div>
                                {canMutate && (
                                  <button
                                    onClick={() => {
                                      setAddrAddingFor(c.id);
                                      setAddrEditingId(null);
                                      setAddrDraft(emptyAddressDraft());
                                    }}
                                    className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Tambah Alamat</span>
                                  </button>
                                )}
                              </div>

                              {/* Inline Add/Edit Address Form */}
                              {addrAddingFor === c.id && (
                                <div className="bg-white p-3.5 rounded-xl border border-amber-300 space-y-3">
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                                    <div>
                                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Label Alamat *</label>
                                      <input
                                        type="text"
                                        value={addrDraft.addressLabel}
                                        onChange={(e) => setAddrDraft({ ...addrDraft, addressLabel: e.target.value })}
                                        placeholder="Plant 2 Cikarang / Gudang B"
                                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Tipe Alamat</label>
                                      <select
                                        value={addrDraft.addressType}
                                        onChange={(e) =>
                                          setAddrDraft({ ...addrDraft, addressType: e.target.value as CustomerAddressType })
                                        }
                                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-semibold"
                                      >
                                        {ADDRESS_TYPES.map((t) => (
                                          <option key={t} value={t}>{t}</option>
                                        ))}
                                      </select>
                                    </div>
                                    <div>
                                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Nama Penerima / PIC</label>
                                      <input
                                        type="text"
                                        value={addrDraft.recipientName || ''}
                                        onChange={(e) => setAddrDraft({ ...addrDraft, recipientName: e.target.value })}
                                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Telepon Penerima</label>
                                      <input
                                        type="text"
                                        value={addrDraft.recipientPhone || ''}
                                        onChange={(e) => setAddrDraft({ ...addrDraft, recipientPhone: e.target.value })}
                                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300"
                                      />
                                    </div>
                                    <div className="sm:col-span-2">
                                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Alamat Lengkap *</label>
                                      <input
                                        type="text"
                                        value={addrDraft.fullAddress}
                                        onChange={(e) => setAddrDraft({ ...addrDraft, fullAddress: e.target.value })}
                                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Kota / Provinsi</label>
                                      <div className="flex gap-1">
                                        <input
                                          type="text"
                                          placeholder="Kota"
                                          value={addrDraft.city || ''}
                                          onChange={(e) => setAddrDraft({ ...addrDraft, city: e.target.value })}
                                          className="w-1/2 px-2 py-1.5 text-xs rounded-lg border border-slate-300"
                                        />
                                        <input
                                          type="text"
                                          placeholder="Provinsi"
                                          value={addrDraft.province || ''}
                                          onChange={(e) => setAddrDraft({ ...addrDraft, province: e.target.value })}
                                          className="w-1/2 px-2 py-1.5 text-xs rounded-lg border border-slate-300"
                                        />
                                      </div>
                                    </div>
                                    <div>
                                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Zonasi</label>
                                      <input
                                        type="text"
                                        value={addrDraft.zoning || ''}
                                        onChange={(e) => setAddrDraft({ ...addrDraft, zoning: e.target.value })}
                                        placeholder="CIKARANG / KARAWANG"
                                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300"
                                      />
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={Boolean(addrDraft.isPrimary)}
                                        onChange={(e) => setAddrDraft({ ...addrDraft, isPrimary: e.target.checked })}
                                      />
                                      <span>Jadikan Alamat Utama (Primary)</span>
                                    </label>
                                    <div className="flex gap-2">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setAddrAddingFor(null);
                                          setAddrEditingId(null);
                                        }}
                                        className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-600"
                                      >
                                        Batal
                                      </button>
                                      <button
                                        type="button"
                                        disabled={saveAddressMut.isPending}
                                        onClick={() => {
                                          if (!addrDraft.addressLabel.trim() || !addrDraft.fullAddress.trim()) {
                                            toast.error('Label & Alamat Lengkap wajib diisi');
                                            return;
                                          }
                                          saveAddressMut.mutate({ customerId: c.id });
                                        }}
                                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1"
                                      >
                                        <Save className="w-3.5 h-3.5" />
                                        <span>Simpan Alamat</span>
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Saved Addresses Grid */}
                              {c.addresses.length === 0 ? (
                                <div className="text-xs text-slate-500 italic bg-white p-3 rounded-xl border border-dashed border-slate-300">
                                  Belum ada multi-alamat terdaftar untuk customer ini.
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                  {c.addresses.map((a) => (
                                    <div
                                      key={a.id}
                                      className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col justify-between gap-2"
                                    >
                                      <div>
                                        <div className="flex items-center justify-between gap-1">
                                          <span className="font-bold text-slate-900 flex items-center gap-1">
                                            {a.isPrimary && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />}
                                            {a.addressLabel}
                                          </span>
                                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold">
                                            {a.addressType}
                                          </span>
                                        </div>
                                        <p className="text-xs text-slate-600 mt-1">{a.fullAddress}</p>
                                        <div className="text-[11px] text-slate-500 mt-1">
                                          {[a.city, a.province, a.zoning ? `Zona: ${a.zoning}` : null].filter(Boolean).join(' • ')}
                                        </div>
                                        {(a.recipientName || a.recipientPhone) && (
                                          <div className="text-[11px] text-slate-500 mt-0.5">
                                            PIC: {a.recipientName || '-'} ({a.recipientPhone || '-'})
                                          </div>
                                        )}
                                      </div>
                                      {canMutate && (
                                        <div className="flex justify-end gap-1.5 pt-2 border-t border-slate-100">
                                          <button
                                            onClick={() => startEditAddress(c.id, a)}
                                            className="px-2 py-1 rounded-md text-[11px] font-bold text-blue-600 hover:bg-blue-50 cursor-pointer"
                                          >
                                            Edit
                                          </button>
                                          <button
                                            onClick={() => deleteAddressMut.mutate({ customerId: c.id, addressId: a.id })}
                                            className="px-2 py-1 rounded-md text-[11px] font-bold text-rose-600 hover:bg-rose-50 cursor-pointer"
                                          >
                                            Hapus
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <span>
            Halaman <strong>{page}</strong> dari <strong>{totalPages}</strong>
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1 rounded-lg border border-slate-300 font-bold disabled:opacity-40"
            >
              Sebelumnya
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1 rounded-lg border border-slate-300 font-bold disabled:opacity-40"
            >
              Selanjutnya
            </button>
          </div>
        </div>
      </div>

      <ConfirmActionModal
        isOpen={Boolean(deleteTarget)}
        title="Hapus Customer"
        message={`Yakin ingin menghapus customer ${deleteTarget?.name || ''} (${deleteTarget?.customerCode || ''})?`}
        confirmLabel="Ya, Hapus"
        confirmTone="danger"
        isLoading={deleteCustomerMut.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteCustomerMut.mutate(deleteTarget.id)}
      />
    </div>
  );
};

