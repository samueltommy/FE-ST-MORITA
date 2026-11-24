import React, { useState } from 'react';
import {
  Plus,
  Printer,
  Pencil,
  Trash2,
  Save,
  X,
  ClipboardList,
  FlaskConical,
  CheckCircle2,
  XCircle,
  Trophy,
  Loader2,
  Search,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  listDailyActivitiesApi,
  getDailyActivitiesSummaryApi,
  createDailyActivityApi,
  updateDailyActivityApi,
  deleteDailyActivityApi,
  printDailyActivitiesReportApi,
  printSingleDailyActivityApi,
  listSampleRequestsApi,
  getSampleWinLoseReportApi,
  createSampleRequestApi,
  updateSampleRequestApi,
  approveSampleRequestApi,
  updateSampleOutcomeApi,
  deleteSampleRequestApi,
  listSalesDropdownEmployeesApi,
  listSalesDropdownCustomersApi,
  listSalesDropdownItemsApi,
  extractSalesErrorMessage,
  AttendanceStatus,
  SalesDailyActivityPayload,
  SalesDailyActivityRecord,
  SampleRequestPayload,
  SampleRequestRecord,
  SampleOutcome,
} from '../../services/salesService';
import { formatIDR } from '../../utils/invoiceCalculator';
import { ConfirmActionModal } from '../core1_hrd/ConfirmActionModal';
import { useRBAC } from '../../hooks/useRBAC';

const todayStr = () => new Date().toISOString().split('T')[0];

const ATTENDANCE_OPTIONS: AttendanceStatus[] = ['HADIR', 'DINAS_LUAR', 'IZIN', 'SAKIT', 'CUTI', 'ALPHA'];

const emptySdaDraft = (): SalesDailyActivityPayload => ({
  employeeId: '',
  activityDate: todayStr(),
  attendanceStatus: 'HADIR',
  targetSalesAmount: 0,
  actualSalesAmount: 0,
  visitingCount: 0,
  callingCount: 0,
  quotationCount: 0,
  newCompanyCount: 0,
  customerId: '',
  activityType: 'CLIENT_VISIT',
  notes: '',
});

const emptySampleDraft = (): SampleRequestPayload => ({
  salesPersonId: '',
  customerId: '',
  customerName: '',
  contactPerson: '',
  contactPhone: '',
  itemId: '',
  productName: '',
  specificationNotes: '',
  qtyRequested: 1,
  unit: 'Roll',
  requestDate: todayStr(),
  neededDate: '',
  purpose: '',
  estimatedPotentialValue: 0,
  notes: '',
});

export const DailyActivityAndSamplesTab: React.FC<{ initialSection?: 'sda' | 'samples' }> = ({
  initialSection = 'sda',
}) => {
  const queryClient = useQueryClient();
  const { isSuperAdmin, isExecutive, isAdminBidang, userDivision } = useRBAC();

  const canMutateSda = isSuperAdmin || isExecutive || userDivision === 'SALES';
  const canMutateSample = isSuperAdmin || isExecutive || userDivision === 'SALES' || userDivision === 'RND';
  const canApproveSample =
    isSuperAdmin || isExecutive || (isAdminBidang && (userDivision === 'SALES' || userDivision === 'RND'));

  const [section, setSection] = useState<'sda' | 'samples'>(initialSection);

  // SDA Filters & Form
  const [sdaPage, setSdaPage] = useState(1);
  const [sdaEmpFilter, setSdaEmpFilter] = useState('ALL');
  const [sdaDateFrom, setSdaDateFrom] = useState('');
  const [sdaDateTo, setSdaDateTo] = useState('');
  const [sdaAttendanceFilter, setSdaAttendanceFilter] = useState('ALL');
  const [sdaFormOpen, setSdaFormOpen] = useState(false);
  const [editingSdaId, setEditingSdaId] = useState<string | null>(null);
  const [sdaDraft, setSdaDraft] = useState<SalesDailyActivityPayload>(emptySdaDraft);
  const [deleteSdaTarget, setDeleteSdaTarget] = useState<SalesDailyActivityRecord | null>(null);

  // Sample Filters & Form
  const [smpPage, setSmpPage] = useState(1);
  const [smpSearch, setSmpSearch] = useState('');
  const [smpApprovalFilter, setSmpApprovalFilter] = useState('ALL');
  const [smpOutcomeFilter, setSmpOutcomeFilter] = useState('ALL');
  const [smpFormOpen, setSmpFormOpen] = useState(false);
  const [editingSmpId, setEditingSmpId] = useState<string | null>(null);
  const [smpDraft, setSmpDraft] = useState<SampleRequestPayload>(emptySampleDraft);
  const [deleteSmpTarget, setDeleteSmpTarget] = useState<SampleRequestRecord | null>(null);

  // Outcome Modal
  const [outcomeTarget, setOutcomeTarget] = useState<SampleRequestRecord | null>(null);
  const [outcomeValue, setOutcomeValue] = useState<SampleOutcome>('WIN');
  const [outcomeDeliveryStatus, setOutcomeDeliveryStatus] = useState('DELIVERED');
  const [outcomeNotes, setOutcomeNotes] = useState('');

  // Queries
  const { data: sdaRes, isLoading: sdaLoading } = useQuery({
    queryKey: ['salesDailyActivities', sdaPage, sdaEmpFilter, sdaDateFrom, sdaDateTo, sdaAttendanceFilter],
    queryFn: () =>
      listDailyActivitiesApi({
        page: sdaPage,
        limit: 20,
        employeeId: sdaEmpFilter,
        dateFrom: sdaDateFrom || undefined,
        dateTo: sdaDateTo || undefined,
        attendanceStatus: sdaAttendanceFilter,
      }),
  });
  const sdaRows = sdaRes?.data || [];
  const sdaTotalPages = sdaRes?.meta?.totalPages || sdaRes?.meta?.total_pages || 1;

  const { data: sdaSummary } = useQuery({
    queryKey: ['salesDailyActivitiesSummary', sdaEmpFilter, sdaDateFrom, sdaDateTo],
    queryFn: () =>
      getDailyActivitiesSummaryApi({
        employeeId: sdaEmpFilter,
        dateFrom: sdaDateFrom || undefined,
        dateTo: sdaDateTo || undefined,
      }),
  });

  const { data: smpRes, isLoading: smpLoading } = useQuery({
    queryKey: ['salesSampleRequests', smpPage, smpSearch, smpApprovalFilter, smpOutcomeFilter],
    queryFn: () =>
      listSampleRequestsApi({
        page: smpPage,
        limit: 20,
        search: smpSearch || undefined,
        approvalStatus: smpApprovalFilter,
        sampleOutcome: smpOutcomeFilter,
      }),
  });
  const samples = smpRes?.data || [];
  const smpTotalPages = smpRes?.meta?.totalPages || smpRes?.meta?.total_pages || 1;

  const { data: smpReport } = useQuery({
    queryKey: ['salesSampleWinLoseReport'],
    queryFn: () => getSampleWinLoseReportApi({}),
  });

  const { data: salesEmployees = [] } = useQuery({
    queryKey: ['salesDropdownEmployees'],
    queryFn: listSalesDropdownEmployeesApi,
  });
  const { data: customers = [] } = useQuery({
    queryKey: ['salesDropdownCustomers'],
    queryFn: listSalesDropdownCustomersApi,
  });
  const { data: items = [] } = useQuery({
    queryKey: ['salesDropdownItems'],
    queryFn: listSalesDropdownItemsApi,
  });

  const invalidateSda = () => {
    queryClient.invalidateQueries({ queryKey: ['salesDailyActivities'] });
    queryClient.invalidateQueries({ queryKey: ['salesDailyActivitiesSummary'] });
  };
  const invalidateSamples = () => {
    queryClient.invalidateQueries({ queryKey: ['salesSampleRequests'] });
    queryClient.invalidateQueries({ queryKey: ['salesSampleWinLoseReport'] });
  };

  // Mutations — SDA
  const saveSdaMut = useMutation({
    mutationFn: async () => {
      const payload: SalesDailyActivityPayload = {
        ...sdaDraft,
        employeeId: sdaDraft.employeeId || undefined,
        customerId: sdaDraft.customerId || null,
      };
      if (editingSdaId) return updateDailyActivityApi(editingSdaId, payload);
      return createDailyActivityApi(payload);
    },
    onSuccess: () => {
      toast.success(editingSdaId ? 'Laporan SDA diperbarui' : 'Laporan SDA berhasil disimpan');
      invalidateSda();
      setSdaFormOpen(false);
      setEditingSdaId(null);
      setSdaDraft(emptySdaDraft());
    },
    onError: (err) => toast.error(extractSalesErrorMessage(err, 'Gagal menyimpan laporan SDA')),
  });

  const deleteSdaMut = useMutation({
    mutationFn: (id: string) => deleteDailyActivityApi(id),
    onSuccess: () => {
      toast.success('Laporan SDA dihapus');
      invalidateSda();
      setDeleteSdaTarget(null);
    },
    onError: (err) => toast.error(extractSalesErrorMessage(err, 'Gagal menghapus SDA')),
  });

  // Mutations — Samples
  const saveSmpMut = useMutation({
    mutationFn: async () => {
      const payload: SampleRequestPayload = {
        ...smpDraft,
        salesPersonId: smpDraft.salesPersonId || undefined,
        customerId: smpDraft.customerId || null,
        itemId: smpDraft.itemId || null,
        neededDate: smpDraft.neededDate || null,
      };
      if (editingSmpId) return updateSampleRequestApi(editingSmpId, payload);
      return createSampleRequestApi(payload);
    },
    onSuccess: () => {
      toast.success(editingSmpId ? 'Pengajuan sampel diperbarui' : 'Pengajuan sampel berhasil dibuat');
      invalidateSamples();
      setSmpFormOpen(false);
      setEditingSmpId(null);
      setSmpDraft(emptySampleDraft());
    },
    onError: (err) => toast.error(extractSalesErrorMessage(err, 'Gagal menyimpan pengajuan sampel')),
  });

  const approveSmpMut = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'APPROVE' | 'REJECT' }) =>
      approveSampleRequestApi(id, action),
    onSuccess: () => {
      toast.success('Status approval sampel diperbarui');
      invalidateSamples();
    },
    onError: (err) => toast.error(extractSalesErrorMessage(err, 'Gagal memproses approval sampel')),
  });

  const outcomeSmpMut = useMutation({
    mutationFn: () => {
      if (!outcomeTarget) throw new Error('Sampel belum dipilih');
      return updateSampleOutcomeApi(outcomeTarget.id, {
        sampleOutcome: outcomeValue,
        deliveryStatus: outcomeDeliveryStatus,
        outcomeNotes: outcomeNotes || undefined,
      });
    },
    onSuccess: () => {
      toast.success(`Hasil sampel diperbarui menjadi ${outcomeValue}`);
      invalidateSamples();
      setOutcomeTarget(null);
      setOutcomeNotes('');
    },
    onError: (err) => toast.error(extractSalesErrorMessage(err, 'Gagal update hasil sampel')),
  });

  const deleteSmpMut = useMutation({
    mutationFn: (id: string) => deleteSampleRequestApi(id),
    onSuccess: () => {
      toast.success('Pengajuan sampel dihapus');
      invalidateSamples();
      setDeleteSmpTarget(null);
    },
    onError: (err) => toast.error(extractSalesErrorMessage(err, 'Gagal menghapus pengajuan sampel')),
  });

  return (
    <div className="space-y-4">
      {/* Sub-tab Switcher */}
      <div className="bg-white rounded-2xl border border-slate-200 p-2 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setSection('sda')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer ${
            section === 'sda' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          <span>6.2 Sales Daily Activity (SDA) &amp; Cetak Laporan</span>
        </button>
        <button
          onClick={() => setSection('samples')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer ${
            section === 'samples' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FlaskConical className="w-4 h-4" />
          <span>6.2 Form Sampel, Approval &amp; Report Win/Lose</span>
        </button>
      </div>

      {/* SECTION A: SALES DAILY ACTIVITY */}
      {section === 'sda' && (
        <div className="space-y-4">
          {/* Summary Strip */}
          {sdaSummary && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="bg-white rounded-2xl border border-slate-200 p-3.5">
                <div className="text-[11px] font-bold text-slate-500">Total Target</div>
                <div className="text-sm font-black font-mono text-slate-900 mt-1">{formatIDR(sdaSummary.totalTargetSales)}</div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-3.5">
                <div className="text-[11px] font-bold text-slate-500">Total Actual</div>
                <div className="text-sm font-black font-mono text-emerald-700 mt-1">{formatIDR(sdaSummary.totalActualSales)}</div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-3.5">
                <div className="text-[11px] font-bold text-slate-500">Achievement</div>
                <div className="text-sm font-black font-mono text-blue-700 mt-1">{sdaSummary.achievementPercent}%</div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-3.5">
                <div className="text-[11px] font-bold text-slate-500">Visiting / Calling</div>
                <div className="text-sm font-black font-mono text-slate-900 mt-1">
                  {sdaSummary.totalVisiting} / {sdaSummary.totalCalling}
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-3.5">
                <div className="text-[11px] font-bold text-slate-500">Quotation Dibuat</div>
                <div className="text-sm font-black font-mono text-amber-700 mt-1">{sdaSummary.totalQuotation}</div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-3.5">
                <div className="text-[11px] font-bold text-slate-500">New Company</div>
                <div className="text-sm font-black font-mono text-purple-700 mt-1">{sdaSummary.totalNewCompany}</div>
              </div>
            </div>
          )}

          {/* Toolbar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={sdaEmpFilter}
                onChange={(e) => {
                  setSdaEmpFilter(e.target.value);
                  setSdaPage(1);
                }}
                className="px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-semibold"
              >
                <option value="ALL">Semua Sales Person</option>
                {salesEmployees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.fullName}</option>
                ))}
              </select>
              <select
                value={sdaAttendanceFilter}
                onChange={(e) => {
                  setSdaAttendanceFilter(e.target.value);
                  setSdaPage(1);
                }}
                className="px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-semibold"
              >
                <option value="ALL">Semua Kehadiran</option>
                {ATTENDANCE_OPTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
              <input type="date" value={sdaDateFrom} onChange={(e) => setSdaDateFrom(e.target.value)} className="px-2.5 py-2 text-xs rounded-xl border border-slate-300" />
              <span className="text-xs text-slate-400">s/d</span>
              <input type="date" value={sdaDateTo} onChange={(e) => setSdaDateTo(e.target.value)} className="px-2.5 py-2 text-xs rounded-xl border border-slate-300" />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  printDailyActivitiesReportApi({
                    employeeId: sdaEmpFilter,
                    dateFrom: sdaDateFrom || undefined,
                    dateTo: sdaDateTo || undefined,
                  }).catch((e) => toast.error(extractSalesErrorMessage(e)))
                }
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Rekap SDA</span>
              </button>
              {canMutateSda && (
                <button
                  onClick={() => {
                    setEditingSdaId(null);
                    setSdaDraft(emptySdaDraft());
                    setSdaFormOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Input SDA Harian</span>
                </button>
              )}
            </div>
          </div>

          {/* SDA Form */}
          {sdaFormOpen && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveSdaMut.mutate();
              }}
              className="bg-white rounded-2xl border-2 border-amber-300 p-5 space-y-4 shadow-sm"
            >
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h3 className="text-sm font-black text-slate-900">
                  {editingSdaId ? 'Edit Laporan SDA' : 'Input Laporan Sales Daily Activity (6.2)'}
                </h3>
                <button type="button" onClick={() => setSdaFormOpen(false)} className="p-1 text-slate-400">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal Aktivitas *</label>
                  <input
                    type="date"
                    required
                    value={sdaDraft.activityDate}
                    onChange={(e) => setSdaDraft({ ...sdaDraft, activityDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Sales Person</label>
                  <select
                    value={sdaDraft.employeeId || ''}
                    onChange={(e) => setSdaDraft({ ...sdaDraft, employeeId: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white"
                  >
                    <option value="">(Otomatis User Login)</option>
                    {salesEmployees.map((emp) => <option key={emp.id} value={emp.id}>{emp.fullName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Status Kehadiran *</label>
                  <select
                    value={sdaDraft.attendanceStatus}
                    onChange={(e) => setSdaDraft({ ...sdaDraft, attendanceStatus: e.target.value as AttendanceStatus })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-bold"
                  >
                    {ATTENDANCE_OPTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Customer Utama (Opsional)</label>
                  <select
                    value={sdaDraft.customerId || ''}
                    onChange={(e) => setSdaDraft({ ...sdaDraft, customerId: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white"
                  >
                    <option value="">-- Umum / Multi Customer --</option>
                    {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Target Sales (IDR)</label>
                  <input
                    type="number"
                    min={0}
                    value={sdaDraft.targetSalesAmount}
                    onChange={(e) => setSdaDraft({ ...sdaDraft, targetSalesAmount: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Actual Sales (IDR)</label>
                  <input
                    type="number"
                    min={0}
                    value={sdaDraft.actualSalesAmount}
                    onChange={(e) => setSdaDraft({ ...sdaDraft, actualSalesAmount: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Visiting / Calling</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={0}
                      placeholder="Visit"
                      value={sdaDraft.visitingCount}
                      onChange={(e) => setSdaDraft({ ...sdaDraft, visitingCount: Number(e.target.value) || 0 })}
                      className="w-1/2 px-2.5 py-2 text-xs rounded-xl border border-slate-300 font-mono"
                    />
                    <input
                      type="number"
                      min={0}
                      placeholder="Call"
                      value={sdaDraft.callingCount}
                      onChange={(e) => setSdaDraft({ ...sdaDraft, callingCount: Number(e.target.value) || 0 })}
                      className="w-1/2 px-2.5 py-2 text-xs rounded-xl border border-slate-300 font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Quotation / New Company</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={0}
                      placeholder="Quote"
                      value={sdaDraft.quotationCount}
                      onChange={(e) => setSdaDraft({ ...sdaDraft, quotationCount: Number(e.target.value) || 0 })}
                      className="w-1/2 px-2.5 py-2 text-xs rounded-xl border border-slate-300 font-mono"
                    />
                    <input
                      type="number"
                      min={0}
                      placeholder="New Co"
                      value={sdaDraft.newCompanyCount}
                      onChange={(e) => setSdaDraft({ ...sdaDraft, newCompanyCount: Number(e.target.value) || 0 })}
                      className="w-1/2 px-2.5 py-2 text-xs rounded-xl border border-slate-300 font-mono"
                    />
                  </div>
                </div>
                <div className="sm:col-span-4">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Catatan Kunjungan &amp; Ringkasan Aktivitas</label>
                  <textarea
                    rows={2}
                    value={sdaDraft.notes || ''}
                    onChange={(e) => setSdaDraft({ ...sdaDraft, notes: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button type="button" onClick={() => setSdaFormOpen(false)} className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold">Batal</button>
                <button type="submit" disabled={saveSdaMut.isPending} className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5">
                  {saveSdaMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Simpan SDA</span>
                </button>
              </div>
            </form>
          )}

          {/* SDA Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-bold uppercase border-b border-slate-200">
                  <tr>
                    <th className="p-3">No. SDA &amp; Tanggal</th>
                    <th className="p-3">Sales Person &amp; Kehadiran</th>
                    <th className="p-3 text-right">Target vs Actual</th>
                    <th className="p-3 text-center">Visit / Call / Quote / New</th>
                    <th className="p-3">Catatan</th>
                    <th className="p-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sdaLoading ? (
                    <tr><td colSpan={6} className="p-8 text-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" /> Memuat SDA...</td></tr>
                  ) : sdaRows.length === 0 ? (
                    <tr><td colSpan={6} className="p-8 text-center text-slate-400">Belum ada laporan SDA.</td></tr>
                  ) : (
                    sdaRows.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/70">
                        <td className="p-3">
                          <div className="font-mono font-bold text-blue-700">{r.activityNumber}</div>
                          <div className="text-[11px] text-slate-500">{r.activityDate}</div>
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-slate-900">{r.employeeName}</div>
                          <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800">
                            {r.attendanceStatus}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono">
                          <div className="text-[11px] text-slate-500">T: {formatIDR(r.targetSalesAmount)}</div>
                          <div className="font-bold text-emerald-700">A: {formatIDR(r.actualSalesAmount)} ({r.achievementPercent}%)</div>
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-slate-700">
                          {r.visitingCount} / {r.callingCount} / {r.quotationCount} / {r.newCompanyCount}
                        </td>
                        <td className="p-3 text-slate-600 max-w-xs truncate">{r.notes || r.customerName || '-'}</td>
                        <td className="p-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => printSingleDailyActivityApi(r.id).catch((e) => toast.error(extractSalesErrorMessage(e)))}
                              className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50 cursor-pointer"
                              title="Cetak Laporan SDA Ini"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            {canMutateSda && (
                              <button
                                onClick={() => {
                                  setEditingSdaId(r.id);
                                  setSdaDraft({
                                    employeeId: r.employeeId,
                                    activityDate: r.activityDate,
                                    attendanceStatus: r.attendanceStatus as AttendanceStatus,
                                    targetSalesAmount: r.targetSalesAmount,
                                    actualSalesAmount: r.actualSalesAmount,
                                    visitingCount: r.visitingCount,
                                    callingCount: r.callingCount,
                                    quotationCount: r.quotationCount,
                                    newCompanyCount: r.newCompanyCount,
                                    customerId: r.customerId || '',
                                    activityType: r.activityType || 'CLIENT_VISIT',
                                    notes: r.notes || '',
                                  });
                                  setSdaFormOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 cursor-pointer"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                            )}
                            {canMutateSda && (
                              <button onClick={() => setDeleteSdaTarget(r)} className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
              <span>Halaman <strong>{sdaPage}</strong> dari <strong>{sdaTotalPages}</strong></span>
              <div className="flex gap-2">
                <button disabled={sdaPage <= 1} onClick={() => setSdaPage((p) => Math.max(1, p - 1))} className="px-3 py-1 rounded-lg border border-slate-300 font-bold disabled:opacity-40">Sebelumnya</button>
                <button disabled={sdaPage >= sdaTotalPages} onClick={() => setSdaPage((p) => p + 1)} className="px-3 py-1 rounded-lg border border-slate-300 font-bold disabled:opacity-40">Selanjutnya</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION B: SAMPLE REQUESTS & WIN/LOSE REPORT */}
      {section === 'samples' && (
        <div className="space-y-4">
          {/* Win / Lose Report KPI Strip */}
          {smpReport && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="bg-white rounded-2xl border border-slate-200 p-3.5">
                <div className="text-[11px] font-bold text-slate-500">Total Sampel</div>
                <div className="text-base font-black font-mono text-slate-900 mt-1">{smpReport.totalSamples}</div>
              </div>
              <div className="bg-white rounded-2xl border border-emerald-200 bg-emerald-50/30 p-3.5">
                <div className="text-[11px] font-bold text-emerald-700">WIN</div>
                <div className="text-base font-black font-mono text-emerald-700 mt-1">{smpReport.winCount}</div>
              </div>
              <div className="bg-white rounded-2xl border border-rose-200 bg-rose-50/30 p-3.5">
                <div className="text-[11px] font-bold text-rose-700">LOSE</div>
                <div className="text-base font-black font-mono text-rose-700 mt-1">{smpReport.loseCount}</div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-3.5">
                <div className="text-[11px] font-bold text-slate-500">Win Rate</div>
                <div className="text-base font-black font-mono text-blue-700 mt-1">{smpReport.winRatePercent}%</div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-3.5">
                <div className="text-[11px] font-bold text-slate-500">Potensi WIN</div>
                <div className="text-sm font-black font-mono text-emerald-700 mt-1">{formatIDR(smpReport.totalPotentialValueWon)}</div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 p-3.5">
                <div className="text-[11px] font-bold text-slate-500">Potensi LOSE</div>
                <div className="text-sm font-black font-mono text-rose-700 mt-1">{formatIDR(smpReport.totalPotentialValueLost)}</div>
              </div>
            </div>
          )}

          {/* Toolbar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={smpSearch}
                  onChange={(e) => {
                    setSmpSearch(e.target.value);
                    setSmpPage(1);
                  }}
                  placeholder="Cari no sampel / customer / produk..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300"
                />
              </div>
              <select value={smpApprovalFilter} onChange={(e) => setSmpApprovalFilter(e.target.value)} className="px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-semibold">
                <option value="ALL">Semua Approval</option>
                <option value="PENDING">PENDING</option>
                <option value="APPROVED">APPROVED</option>
                <option value="REJECTED">REJECTED</option>
              </select>
              <select value={smpOutcomeFilter} onChange={(e) => setSmpOutcomeFilter(e.target.value)} className="px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-semibold">
                <option value="ALL">Semua Outcome</option>
                <option value="PENDING">PENDING</option>
                <option value="WIN">WIN</option>
                <option value="LOSE">LOSE</option>
              </select>
            </div>
            {canMutateSample && (
              <button
                onClick={() => {
                  setEditingSmpId(null);
                  setSmpDraft(emptySampleDraft());
                  setSmpFormOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Ajukan Sampel Baru</span>
              </button>
            )}
          </div>

          {/* Sample Form */}
          {smpFormOpen && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!smpDraft.customerName.trim() || !smpDraft.productName.trim()) {
                  toast.error('Nama Customer dan Produk Sampel wajib diisi');
                  return;
                }
                saveSmpMut.mutate();
              }}
              className="bg-white rounded-2xl border-2 border-amber-300 p-5 space-y-4 shadow-sm"
            >
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h3 className="text-sm font-black text-slate-900">
                  {editingSmpId ? 'Edit Pengajuan Sampel' : 'Form Pengajuan Sampel Produk (6.2)'}
                </h3>
                <button type="button" onClick={() => setSmpFormOpen(false)} className="p-1 text-slate-400">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Pilih Customer (Master)</label>
                  <select
                    value={smpDraft.customerId || ''}
                    onChange={(e) => {
                      const cid = e.target.value;
                      const c = customers.find((x) => x.id === cid);
                      setSmpDraft({ ...smpDraft, customerId: cid, customerName: c?.name || smpDraft.customerName });
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white"
                  >
                    <option value="">-- Prospek Baru / Manual --</option>
                    {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nama Customer / Prospek *</label>
                  <input
                    type="text"
                    required
                    value={smpDraft.customerName}
                    onChange={(e) => setSmpDraft({ ...smpDraft, customerName: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Pilih Item Master (Opsional)</label>
                  <select
                    value={smpDraft.itemId || ''}
                    onChange={(e) => {
                      const iid = e.target.value;
                      const it = items.find((x) => x.id === iid);
                      setSmpDraft({ ...smpDraft, itemId: iid, productName: it?.name || smpDraft.productName, unit: it?.unit || smpDraft.unit });
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white"
                  >
                    <option value="">-- Sampel Custom --</option>
                    {items.map((it) => <option key={it.id} value={it.id}>[{it.code}] {it.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nama Produk Sampel *</label>
                  <input
                    type="text"
                    required
                    value={smpDraft.productName}
                    onChange={(e) => setSmpDraft({ ...smpDraft, productName: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Qty &amp; Satuan</label>
                  <div className="flex gap-1.5">
                    <input type="number" min={0.01} step="any" value={smpDraft.qtyRequested} onChange={(e) => setSmpDraft({ ...smpDraft, qtyRequested: Number(e.target.value) || 1 })} className="w-1/2 px-2.5 py-2 text-xs rounded-xl border border-slate-300 font-mono" />
                    <input type="text" value={smpDraft.unit} onChange={(e) => setSmpDraft({ ...smpDraft, unit: e.target.value })} className="w-1/2 px-2.5 py-2 text-xs rounded-xl border border-slate-300" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal Dibutuhkan</label>
                  <input type="date" value={smpDraft.neededDate || ''} onChange={(e) => setSmpDraft({ ...smpDraft, neededDate: e.target.value })} className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Estimasi Nilai Potensial (IDR)</label>
                  <input type="number" min={0} value={smpDraft.estimatedPotentialValue || 0} onChange={(e) => setSmpDraft({ ...smpDraft, estimatedPotentialValue: Number(e.target.value) || 0 })} className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">PIC / Telepon Customer</label>
                  <input type="text" value={smpDraft.contactPerson || ''} onChange={(e) => setSmpDraft({ ...smpDraft, contactPerson: e.target.value })} placeholder="Nama PIC" className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Spesifikasi Teknis</label>
                  <input type="text" value={smpDraft.specificationNotes || ''} onChange={(e) => setSmpDraft({ ...smpDraft, specificationNotes: e.target.value })} placeholder="Lebar, ketebalan, suhu tahan panas..." className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tujuan Pengujian</label>
                  <input type="text" value={smpDraft.purpose || ''} onChange={(e) => setSmpDraft({ ...smpDraft, purpose: e.target.value })} placeholder="Trial line produksi / approval QA klien" className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button type="button" onClick={() => setSmpFormOpen(false)} className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold">Batal</button>
                <button type="submit" disabled={saveSmpMut.isPending} className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5">
                  {saveSmpMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Simpan Pengajuan</span>
                </button>
              </div>
            </form>
          )}

          {/* Sample Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-bold uppercase border-b border-slate-200">
                  <tr>
                    <th className="p-3">No. Sampel &amp; Tgl</th>
                    <th className="p-3">Customer &amp; Sales</th>
                    <th className="p-3">Produk &amp; Qty</th>
                    <th className="p-3 text-right">Nilai Potensial</th>
                    <th className="p-3">Approval</th>
                    <th className="p-3">Hasil (Win/Lose)</th>
                    <th className="p-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {smpLoading ? (
                    <tr><td colSpan={7} className="p-8 text-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" /> Memuat pengajuan sampel...</td></tr>
                  ) : samples.length === 0 ? (
                    <tr><td colSpan={7} className="p-8 text-center text-slate-400">Belum ada data pengajuan sampel.</td></tr>
                  ) : (
                    samples.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/70">
                        <td className="p-3">
                          <div className="font-mono font-bold text-blue-700">{s.requestNumber}</div>
                          <div className="text-[11px] text-slate-500">{s.requestDate}</div>
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-slate-900">{s.customerName}</div>
                          <div className="text-[11px] text-slate-500">Sales: {s.salesPersonName}</div>
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-slate-800">{s.productName}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{s.qtyRequested} {s.unit}</div>
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900">
                          {formatIDR(s.estimatedPotentialValue)}
                        </td>
                        <td className="p-3 space-y-1">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold ${
                              s.approvalStatus === 'APPROVED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : s.approvalStatus === 'REJECTED'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {s.approvalStatus}
                          </span>
                          {canApproveSample && s.approvalStatus === 'PENDING' && (
                            <div className="flex gap-1">
                              <button
                                onClick={() => approveSmpMut.mutate({ id: s.id, action: 'APPROVE' })}
                                className="px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-bold cursor-pointer"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => approveSmpMut.mutate({ id: s.id, action: 'REJECT' })}
                                className="px-2 py-0.5 rounded bg-rose-600 text-white text-[10px] font-bold cursor-pointer"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="p-3 space-y-1">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-black ${
                              s.sampleOutcome === 'WIN'
                                ? 'bg-emerald-600 text-white'
                                : s.sampleOutcome === 'LOSE'
                                ? 'bg-rose-600 text-white'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {s.sampleOutcome}
                          </span>
                          {canMutateSample && (
                            <div>
                              <button
                                onClick={() => {
                                  setOutcomeTarget(s);
                                  setOutcomeValue((s.sampleOutcome === 'WIN' || s.sampleOutcome === 'LOSE' ? s.sampleOutcome : 'WIN') as SampleOutcome);
                                  setOutcomeDeliveryStatus(s.deliveryStatus || 'DELIVERED');
                                  setOutcomeNotes(s.outcomeNotes || '');
                                }}
                                className="text-[11px] font-bold text-blue-600 hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                              >
                                <Trophy className="w-3 h-3" /> Update Win/Lose
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            {canMutateSample && (
                              <button
                                onClick={() => {
                                  setEditingSmpId(s.id);
                                  setSmpDraft({
                                    salesPersonId: s.salesPersonId,
                                    customerId: s.customerId || '',
                                    customerName: s.customerName,
                                    contactPerson: s.contactPerson || '',
                                    contactPhone: s.contactPhone || '',
                                    itemId: s.itemId || '',
                                    productName: s.productName,
                                    specificationNotes: s.specificationNotes || '',
                                    qtyRequested: s.qtyRequested,
                                    unit: s.unit,
                                    requestDate: s.requestDate,
                                    neededDate: s.neededDate || '',
                                    purpose: s.purpose || '',
                                    estimatedPotentialValue: s.estimatedPotentialValue,
                                    notes: s.notes || '',
                                  });
                                  setSmpFormOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 cursor-pointer"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                            )}
                            {canMutateSample && (
                              <button onClick={() => setDeleteSmpTarget(s)} className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
              <span>Halaman <strong>{smpPage}</strong> dari <strong>{smpTotalPages}</strong></span>
              <div className="flex gap-2">
                <button disabled={smpPage <= 1} onClick={() => setSmpPage((p) => Math.max(1, p - 1))} className="px-3 py-1 rounded-lg border border-slate-300 font-bold disabled:opacity-40">Sebelumnya</button>
                <button disabled={smpPage >= smpTotalPages} onClick={() => setSmpPage((p) => p + 1)} className="px-3 py-1 rounded-lg border border-slate-300 font-bold disabled:opacity-40">Selanjutnya</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Outcome Win/Lose Modal */}
      {outcomeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-600" />
                Update Outcome Sampel (Win / Lose)
              </h3>
              <button onClick={() => setOutcomeTarget(null)} className="p-1 text-slate-400"><X className="w-4 h-4" /></button>
            </div>
            <div className="text-xs bg-slate-50 p-3 rounded-xl">
              <div><strong>No:</strong> {outcomeTarget.requestNumber}</div>
              <div><strong>Customer:</strong> {outcomeTarget.customerName}</div>
              <div><strong>Produk:</strong> {outcomeTarget.productName}</div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Hasil Pengujian Sampel</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['WIN', 'LOSE', 'PENDING'] as SampleOutcome[]).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setOutcomeValue(opt)}
                      className={`py-2 rounded-xl text-xs font-black border cursor-pointer ${
                        outcomeValue === opt
                          ? opt === 'WIN'
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : opt === 'LOSE'
                            ? 'bg-rose-600 text-white border-rose-600'
                            : 'bg-slate-700 text-white border-slate-700'
                          : 'bg-white text-slate-700 border-slate-300'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Status Pengiriman Sampel</label>
                <select value={outcomeDeliveryStatus} onChange={(e) => setOutcomeDeliveryStatus(e.target.value)} className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white">
                  <option value="PENDING">PENDING</option>
                  <option value="SHIPPED">SHIPPED</option>
                  <option value="DELIVERED">DELIVERED</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Catatan Hasil (Alasan Win/Lose)</label>
                <textarea rows={2} value={outcomeNotes} onChange={(e) => setOutcomeNotes(e.target.value)} className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setOutcomeTarget(null)} className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold">Batal</button>
              <button disabled={outcomeSmpMut.isPending} onClick={() => outcomeSmpMut.mutate()} className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5">
                {outcomeSmpMut.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Simpan Hasil</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmActionModal
        isOpen={Boolean(deleteSdaTarget)}
        title="Hapus Laporan SDA"
        message={`Yakin ingin menghapus SDA ${deleteSdaTarget?.activityNumber || ''}?`}
        confirmLabel="Ya, Hapus"
        confirmTone="danger"
        isLoading={deleteSdaMut.isPending}
        onCancel={() => setDeleteSdaTarget(null)}
        onConfirm={() => deleteSdaTarget && deleteSdaMut.mutate(deleteSdaTarget.id)}
      />

      <ConfirmActionModal
        isOpen={Boolean(deleteSmpTarget)}
        title="Hapus Pengajuan Sampel"
        message={`Yakin ingin menghapus pengajuan sampel ${deleteSmpTarget?.requestNumber || ''}?`}
        confirmLabel="Ya, Hapus"
        confirmTone="danger"
        isLoading={deleteSmpMut.isPending}
        onCancel={() => setDeleteSmpTarget(null)}
        onConfirm={() => deleteSmpTarget && deleteSmpMut.mutate(deleteSmpTarget.id)}
      />
    </div>
  );
};

