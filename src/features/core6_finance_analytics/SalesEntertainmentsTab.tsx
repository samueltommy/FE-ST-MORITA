import React, { useState } from 'react';
import {
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Printer,
  Pencil,
  Trash2,
  Save,
  X,
  Upload,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  listSalesEntertainmentsApi,
  createSalesEntertainmentApi,
  updateSalesEntertainmentApi,
  deleteSalesEntertainmentApi,
  approveEntertainmentManagerApi,
  approveEntertainmentFinanceApi,
  listMdmCustomersApi,
  uploadFinanceDocument,
  resolveFinanceFileUrl,
  printFinanceHtmlReport,
  extractFinanceErrorMessage,
  SalesEntertainmentRecord,
  SalesEntertainmentPayload,
} from '../../services/financeService';
import { formatIDR } from '../../utils/invoiceCalculator';
import { ConfirmActionModal } from '../core1_hrd/ConfirmActionModal';
import { useRBAC } from '../../hooks/useRBAC';

const todayStr = () => new Date().toISOString().split('T')[0];

const emptyDraft = (): SalesEntertainmentPayload => ({
  customerId: '',
  customerName: '',
  entertainmentDate: todayStr(),
  location: '',
  attendees: '',
  purpose: '',
  estimatedAmount: 0,
  actualAmount: 0,
  receiptFileUrl: '',
  notes: '',
});

export const SalesEntertainmentsTab: React.FC = () => {
  const queryClient = useQueryClient();
  const { isSuperAdmin, isExecutive, isAdminBidang, userDivision } = useRBAC();

  const canCreateOrEdit = isSuperAdmin || isExecutive || userDivision === 'SALES';
  const canApproveManager = isSuperAdmin || isExecutive || (isAdminBidang && userDivision === 'SALES');
  const canApproveFinance = isSuperAdmin || isExecutive || userDivision === 'FINANCE';

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<SalesEntertainmentPayload>(emptyDraft);
  const [uploading, setUploading] = useState(false);

  const [voidTarget, setVoidTarget] = useState<SalesEntertainmentRecord | null>(null);

  const { data: res, isLoading } = useQuery({
    queryKey: ['financeEntertainments', page, search, statusFilter],
    queryFn: () => listSalesEntertainmentsApi({ page, limit: 20, search: search || undefined, status: statusFilter }),
  });
  const list = res?.data || [];
  const totalPages = res?.meta?.totalPages || res?.meta?.total_pages || 1;

  const { data: customers = [] } = useQuery({
    queryKey: ['mdmCustomersDropdown'],
    queryFn: listMdmCustomersApi,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['financeEntertainments'] });

  const createMutation = useMutation({
    mutationFn: (payload: SalesEntertainmentPayload) => createSalesEntertainmentApi(payload),
    onSuccess: () => {
      toast.success('Pengajuan Entertain Sales berhasil disimpan');
      setIsAdding(false);
      setDraft(emptyDraft());
      invalidate();
    },
    onError: (err: any) => toast.error(extractFinanceErrorMessage(err, 'Gagal menyimpan entertain sales')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<SalesEntertainmentPayload> }) =>
      updateSalesEntertainmentApi(id, payload),
    onSuccess: () => {
      toast.success('Entertain Sales berhasil diperbarui');
      setEditingId(null);
      setDraft(emptyDraft());
      invalidate();
    },
    onError: (err: any) => toast.error(extractFinanceErrorMessage(err, 'Gagal memperbarui entertain sales')),
  });

  const mgrMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'APPROVE' | 'REJECT' }) =>
      approveEntertainmentManagerApi(id, action),
    onSuccess: () => {
      toast.success('Approval Manager Marketing berhasil diproses');
      invalidate();
    },
    onError: (err: any) => toast.error(extractFinanceErrorMessage(err, 'Gagal memproses approval Manager Marketing')),
  });

  const finMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'APPROVE' | 'REJECT' }) =>
      approveEntertainmentFinanceApi(id, action),
    onSuccess: () => {
      toast.success('Approval Finance berhasil diproses');
      invalidate();
    },
    onError: (err: any) => toast.error(extractFinanceErrorMessage(err, 'Gagal memproses approval Finance')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSalesEntertainmentApi(id),
    onSuccess: () => {
      toast.success('Pengajuan Entertain berhasil dibatalkan');
      setVoidTarget(null);
      invalidate();
    },
    onError: (err: any) => toast.error(extractFinanceErrorMessage(err, 'Gagal membatalkan entertain')),
  });

  const handleUploadReceipt = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadFinanceDocument('entertainment_receipt', file);
      setDraft((prev) => ({ ...prev, receiptFileUrl: url }));
      toast.success('Nota/kwitansi entertain berhasil diunggah');
    } catch (err: any) {
      toast.error(err?.message || 'Gagal mengunggah nota');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = () => {
    if (!draft.customerId && !draft.customerName?.trim()) return toast.error('Customer wajib diisi');
    if (!draft.location.trim()) return toast.error('Lokasi wajib diisi');
    const payload: SalesEntertainmentPayload = {
      ...draft,
      customerId: draft.customerId || null,
      receiptFileUrl: draft.receiptFileUrl || null,
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const renderBadge = (status: string) => {
    const s = (status || 'PENDING').toUpperCase();
    if (s === 'APPROVED') return <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">APPROVED</span>;
    if (s === 'REJECTED') return <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold">REJECTED</span>;
    return <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">PENDING</span>;
  };

  const renderInlineEditor = (isNew: boolean) => (
    <tr className="bg-blue-50 border-b border-blue-200 align-top">
      <td className="px-3 py-2.5">
        <input
          type="date"
          value={draft.entertainmentDate}
          onChange={(e) => setDraft({ ...draft, entertainmentDate: e.target.value })}
          className="px-2 py-1 rounded border border-slate-300 bg-white text-xs"
        />
      </td>
      <td className="px-3 py-2.5 space-y-1 min-w-[170px]">
        <select
          value={draft.customerId || ''}
          onChange={(e) => {
            const c = customers.find((x) => x.id === e.target.value);
            setDraft({ ...draft, customerId: e.target.value, customerName: c?.name || draft.customerName });
          }}
          className="w-full px-2 py-1 rounded border border-slate-300 bg-white text-xs"
        >
          <option value="">-- Pilih Customer --</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Atau nama customer..."
          value={draft.customerName || ''}
          onChange={(e) => setDraft({ ...draft, customerName: e.target.value })}
          className="w-full px-2 py-0.5 rounded border border-slate-300 bg-white text-[11px]"
        />
      </td>
      <td className="px-3 py-2.5 space-y-1 min-w-[170px]">
        <input
          type="text"
          placeholder="Lokasi / Restoran..."
          value={draft.location}
          onChange={(e) => setDraft({ ...draft, location: e.target.value })}
          className="w-full px-2 py-1 rounded border border-slate-300 bg-white text-xs"
        />
        <input
          type="text"
          placeholder="Peserta / Attendees..."
          value={draft.attendees}
          onChange={(e) => setDraft({ ...draft, attendees: e.target.value })}
          className="w-full px-2 py-0.5 rounded border border-slate-300 bg-white text-[11px]"
        />
      </td>
      <td className="px-3 py-2.5 space-y-1 min-w-[160px]">
        <input
          type="text"
          placeholder="Tujuan / Keperluan..."
          value={draft.purpose}
          onChange={(e) => setDraft({ ...draft, purpose: e.target.value })}
          className="w-full px-2 py-1 rounded border border-slate-300 bg-white text-xs"
        />
        <label className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-slate-300 bg-white text-[10px] font-semibold cursor-pointer">
          {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
          <span>{draft.receiptFileUrl ? 'Ganti Nota' : 'Upload Nota'}</span>
          <input
            type="file"
            className="hidden"
            accept="image/*,.pdf"
            onChange={(e) => e.target.files?.[0] && handleUploadReceipt(e.target.files[0])}
          />
        </label>
      </td>
      <td className="px-3 py-2.5 space-y-1">
        <input
          type="number"
          placeholder="Estimasi"
          value={draft.estimatedAmount}
          onChange={(e) => setDraft({ ...draft, estimatedAmount: Number(e.target.value) })}
          className="w-28 px-2 py-1 rounded border border-slate-300 bg-white text-xs font-mono text-right"
        />
        <input
          type="number"
          placeholder="Aktual"
          value={draft.actualAmount}
          onChange={(e) => setDraft({ ...draft, actualAmount: Number(e.target.value) })}
          className="w-28 px-2 py-0.5 rounded border border-slate-300 bg-white text-[11px] font-mono text-right"
        />
      </td>
      <td className="px-3 py-2.5 text-center" colSpan={2}>
        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">
          {isNew ? 'PENGAJUAN BARU' : 'EDIT'}
        </span>
      </td>
      <td className="px-3 py-2.5 text-right whitespace-nowrap">
        <div className="inline-flex items-center gap-1">
          <button
            type="button"
            onClick={handleSave}
            disabled={createMutation.isPending || updateMutation.isPending || uploading}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" /> Simpan
          </button>
          <button
            type="button"
            onClick={() => {
              setIsAdding(false);
              setEditingId(null);
            }}
            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-bold cursor-pointer"
          >
            <X className="w-3.5 h-3.5" /> Batal
          </button>
        </div>
      </td>
    </tr>
  );

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari Customer / Lokasi / Tujuan..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
          >
            <option value="ALL">Semua Status</option>
            <option value="PENDING">PENDING</option>
            <option value="APPROVED">APPROVED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
        </div>

        {canCreateOrEdit && (
          <button
            type="button"
            onClick={() => {
              setEditingId(null);
              setDraft(emptyDraft());
              setIsAdding(true);
            }}
            disabled={isAdding}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>+ Ajukan Entertain</span>
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase">
                <th className="px-3 py-2.5">Tanggal</th>
                <th className="px-3 py-2.5">Customer &amp; Pemohon</th>
                <th className="px-3 py-2.5">Lokasi &amp; Peserta</th>
                <th className="px-3 py-2.5">Tujuan &amp; Nota</th>
                <th className="px-3 py-2.5 text-right">Estimasi / Aktual</th>
                <th className="px-3 py-2.5 text-center">Manager Mkt</th>
                <th className="px-3 py-2.5 text-center">Finance</th>
                <th className="px-3 py-2.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {canCreateOrEdit && isAdding && renderInlineEditor(true)}
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Memuat Entertain Sales...
                  </td>
                </tr>
              ) : list.length === 0 && !isAdding ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    Belum ada pengajuan Entertain Sales.
                  </td>
                </tr>
              ) : (
                list.map((row) => {
                  if (editingId === row.id) return <React.Fragment key={row.id}>{renderInlineEditor(false)}</React.Fragment>;
                  const notaHref = resolveFinanceFileUrl(row.receiptFileUrl);
                  const isVoid = row.status === 'CANCELLED' || row.status === 'VOID';

                  return (
                    <tr key={row.id} className={`hover:bg-slate-50/80 ${isVoid ? 'opacity-60' : ''}`}>
                      <td className="px-3 py-2.5 whitespace-nowrap font-medium">{row.entertainmentDate}</td>
                      <td className="px-3 py-2.5">
                        <div className="font-semibold text-slate-800">{row.customerName}</div>
                        <div className="text-[11px] text-slate-400">{row.requesterName}</div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-slate-700">{row.location}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[160px]">{row.attendees}</div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="truncate max-w-[180px]">{row.purpose}</div>
                        {notaHref && (
                          <a href={notaHref} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-[11px] text-blue-600 hover:underline">
                            <ExternalLink className="w-3 h-3" /> Lihat Nota
                          </a>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono whitespace-nowrap">
                        <div className="font-bold text-slate-800">{formatIDR(row.actualAmount || row.estimatedAmount)}</div>
                        <div className="text-[10px] text-slate-400">Est: {formatIDR(row.estimatedAmount)}</div>
                      </td>
                      <td className="px-3 py-2.5 text-center space-y-1">
                        <div>{renderBadge(row.managerStatus)}</div>
                        {canApproveManager && row.managerStatus === 'PENDING' && !isVoid && (
                          <div className="inline-flex gap-1">
                            <button
                              type="button"
                              onClick={() => mgrMutation.mutate({ id: row.id, action: 'APPROVE' })}
                              title="Approve Manager Mkt"
                              className="p-1 rounded bg-emerald-600 text-white cursor-pointer"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => mgrMutation.mutate({ id: row.id, action: 'REJECT' })}
                              title="Reject Manager Mkt"
                              className="p-1 rounded bg-rose-600 text-white cursor-pointer"
                            >
                              <XCircle className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center space-y-1">
                        <div>{renderBadge(row.financeStatus)}</div>
                        {canApproveFinance && row.financeStatus === 'PENDING' && !isVoid && (
                          <div className="inline-flex gap-1">
                            <button
                              type="button"
                              onClick={() => finMutation.mutate({ id: row.id, action: 'APPROVE' })}
                              title="Approve Finance"
                              className="p-1 rounded bg-emerald-600 text-white cursor-pointer"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => finMutation.mutate({ id: row.id, action: 'REJECT' })}
                              title="Reject Finance"
                              className="p-1 rounded bg-rose-600 text-white cursor-pointer"
                            >
                              <XCircle className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              printFinanceHtmlReport(`/finance/entertainments/${row.id}/print`).catch((e) =>
                                toast.error(e?.message || 'Gagal mencetak form entertain')
                              )
                            }
                            title="Cetak Form Entertain"
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          {canCreateOrEdit && row.financeStatus === 'PENDING' && !isVoid && (
                            <button
                              type="button"
                              onClick={() => {
                                setIsAdding(false);
                                setEditingId(row.id);
                                setDraft({
                                  customerId: row.customerId || '',
                                  customerName: row.customerName || '',
                                  entertainmentDate: row.entertainmentDate,
                                  location: row.location,
                                  attendees: row.attendees,
                                  purpose: row.purpose,
                                  estimatedAmount: row.estimatedAmount,
                                  actualAmount: row.actualAmount,
                                  receiptFileUrl: row.receiptFileUrl || '',
                                  notes: row.notes || '',
                                });
                              }}
                              title="Edit Inline"
                              className="p-1.5 rounded-lg border border-slate-200 hover:bg-blue-50 text-blue-600 cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {(canCreateOrEdit || canApproveFinance) && row.financeStatus === 'PENDING' && !isVoid && (
                            <button
                              type="button"
                              onClick={() => setVoidTarget(row)}
                              title="Batal / Void"
                              className="p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 text-rose-600 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Halaman {page} dari {totalPages}</span>
          <div className="flex gap-1.5">
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-2.5 py-1 rounded-lg border border-slate-200 disabled:opacity-40 cursor-pointer">Prev</button>
            <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="px-2.5 py-1 rounded-lg border border-slate-200 disabled:opacity-40 cursor-pointer">Next</button>
          </div>
        </div>
      </div>

      <ConfirmActionModal
        open={Boolean(voidTarget)}
        title="Batalkan Pengajuan Entertain?"
        message={`Anda yakin ingin membatalkan pengajuan entertain untuk ${voidTarget?.customerName || ''}?`}
        confirmLabel="Ya, Batalkan"
        variant="danger"
        loading={deleteMutation.isPending}
        onConfirm={() => voidTarget && deleteMutation.mutate(voidTarget.id)}
        onCancel={() => setVoidTarget(null)}
      />
    </div>
  );
};
