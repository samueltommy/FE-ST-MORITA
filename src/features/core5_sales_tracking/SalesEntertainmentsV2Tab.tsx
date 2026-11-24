import React, { useState } from 'react';
import {
  Plus,
  Upload,
  ExternalLink,
  Printer,
  Pencil,
  Trash2,
  Save,
  X,
  Loader2,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  listSalesEntertainmentsV2Api,
  createSalesEntertainmentV2Api,
  updateSalesEntertainmentV2Api,
  deleteSalesEntertainmentV2Api,
  approveSalesEntertainmentManagerApi,
  approveSalesEntertainmentFinanceApi,
  printSalesEntertainmentV2Api,
  uploadSalesDocumentApi,
  resolveSalesFileUrl,
  listSalesDropdownCustomersApi,
  extractSalesErrorMessage,
  SalesEntertainmentPayloadV2,
  SalesEntertainmentRecordV2,
} from '../../services/salesService';
import { formatIDR } from '../../utils/invoiceCalculator';
import { ConfirmActionModal } from '../core1_hrd/ConfirmActionModal';
import { useRBAC } from '../../hooks/useRBAC';

const todayStr = () => new Date().toISOString().split('T')[0];

const emptyDraft = (): SalesEntertainmentPayloadV2 => ({
  customerId: '',
  customerName: '',
  entertainmentDate: todayStr(),
  location: '',
  attendees: '',
  purpose: '',
  estimatedAmount: 0,
  actualAmount: undefined,
  attachmentUrl: '',
});

export const SalesEntertainmentsV2Tab: React.FC = () => {
  const queryClient = useQueryClient();
  const { isSuperAdmin, isExecutive, isAdminBidang, userDivision } = useRBAC();

  const canCreateEdit = isSuperAdmin || isExecutive || userDivision === 'SALES';
  const canApproveManager = isSuperAdmin || isExecutive || (isAdminBidang && userDivision === 'SALES');
  const canApproveFinance = isSuperAdmin || isExecutive || userDivision === 'FINANCE';

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<SalesEntertainmentPayloadV2>(emptyDraft);
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SalesEntertainmentRecordV2 | null>(null);

  const { data: res, isLoading } = useQuery({
    queryKey: ['salesEntertainmentsV2', page, statusFilter],
    queryFn: () => listSalesEntertainmentsV2Api({ page, limit: 20, status: statusFilter }),
  });
  const list = res?.data || [];
  const totalPages = res?.meta?.totalPages || res?.meta?.total_pages || 1;

  const { data: customers = [] } = useQuery({
    queryKey: ['salesDropdownCustomers'],
    queryFn: listSalesDropdownCustomersApi,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['salesEntertainmentsV2'] });
    queryClient.invalidateQueries({ queryKey: ['financeEntertainments'] });
  };

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload: SalesEntertainmentPayloadV2 = {
        ...draft,
        customerId: draft.customerId || null,
        actualAmount: draft.actualAmount !== undefined && draft.actualAmount !== null ? Number(draft.actualAmount) : null,
        attachmentUrl: draft.attachmentUrl || null,
      };
      if (editingId) return updateSalesEntertainmentV2Api(editingId, payload);
      return createSalesEntertainmentV2Api(payload);
    },
    onSuccess: () => {
      toast.success(editingId ? 'Pengajuan entertain diperbarui' : 'Pengajuan entertain berhasil dikirim');
      invalidate();
      setFormOpen(false);
      setEditingId(null);
      setDraft(emptyDraft());
    },
    onError: (err) => toast.error(extractSalesErrorMessage(err, 'Gagal menyimpan pengajuan entertain')),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteSalesEntertainmentV2Api(id),
    onSuccess: () => {
      toast.success('Pengajuan entertain dibatalkan');
      invalidate();
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(extractSalesErrorMessage(err, 'Gagal menghapus pengajuan entertain')),
  });

  const approveMgrMut = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'APPROVE' | 'REJECT' }) =>
      approveSalesEntertainmentManagerApi(id, action),
    onSuccess: () => {
      toast.success('Approval Manager Marketing berhasil');
      invalidate();
    },
    onError: (err) => toast.error(extractSalesErrorMessage(err, 'Gagal approval manager')),
  });

  const approveFinMut = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'APPROVE' | 'REJECT' }) =>
      approveSalesEntertainmentFinanceApi(id, action),
    onSuccess: () => {
      toast.success('Approval Finance berhasil');
      invalidate();
    },
    onError: (err) => toast.error(extractSalesErrorMessage(err, 'Gagal approval finance')),
  });

  const handleUploadReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const uploaded = await uploadSalesDocumentApi('entertainment_receipt', file);
      setDraft((prev) => ({ ...prev, attachmentUrl: uploaded.fileUrl }));
      toast.success(`Nota (${uploaded.fileName}) berhasil diunggah`);
    } catch (err) {
      toast.error(extractSalesErrorMessage(err, 'Gagal upload nota entertain'));
    } finally {
      setUploading(false);
    }
  };

  const badgeTone = (st: string) => {
    const s = st.toUpperCase();
    if (s === 'APPROVED') return 'bg-emerald-100 text-emerald-800';
    if (s === 'REJECTED') return 'bg-rose-100 text-rose-800';
    return 'bg-amber-100 text-amber-800';
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3">
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-semibold"
        >
          <option value="ALL">Semua Status</option>
          <option value="PENDING">PENDING</option>
          <option value="APPROVED">APPROVED</option>
          <option value="REJECTED">REJECTED</option>
        </select>

        {canCreateEdit && (
          <button
            onClick={() => {
              setEditingId(null);
              setDraft(emptyDraft());
              setFormOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Ajukan Entertain Sales (6.4)</span>
          </button>
        )}
      </div>

      {formOpen && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!draft.customerName.trim() || !draft.location.trim() || !draft.purpose.trim()) {
              toast.error('Customer, Lokasi, dan Tujuan wajib diisi');
              return;
            }
            saveMut.mutate();
          }}
          className="bg-white rounded-2xl border-2 border-amber-300 p-5 space-y-4 shadow-sm"
        >
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h3 className="text-sm font-black text-slate-900">
              {editingId ? 'Edit Pengajuan Entertain Sales' : 'Form Pengajuan Entertain Sales (6.4)'}
            </h3>
            <button type="button" onClick={() => setFormOpen(false)} className="p-1 text-slate-400">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Pilih Customer (Master)</label>
              <select
                value={draft.customerId || ''}
                onChange={(e) => {
                  const cid = e.target.value;
                  const c = customers.find((x) => x.id === cid);
                  setDraft({ ...draft, customerId: cid, customerName: c?.name || draft.customerName });
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
              >
                <option value="">-- Input Manual --</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Nama Customer *</label>
              <input
                type="text"
                required
                value={draft.customerName}
                onChange={(e) => setDraft({ ...draft, customerName: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Tanggal Entertain *</label>
              <input
                type="date"
                required
                value={draft.entertainmentDate}
                onChange={(e) => setDraft({ ...draft, entertainmentDate: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Lokasi / Tempat *</label>
              <input
                type="text"
                required
                value={draft.location}
                onChange={(e) => setDraft({ ...draft, location: e.target.value })}
                placeholder="Restoran / Hotel / Golf..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Estimasi Biaya (IDR) *</label>
              <input
                type="number"
                min={0}
                required
                value={draft.estimatedAmount}
                onChange={(e) => setDraft({ ...draft, estimatedAmount: Number(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Realisasi / Actual (IDR)</label>
              <input
                type="number"
                min={0}
                value={draft.actualAmount ?? ''}
                onChange={(e) => setDraft({ ...draft, actualAmount: e.target.value === '' ? undefined : Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Peserta / Tamu (Attendees)</label>
              <input
                type="text"
                value={draft.attendees || ''}
                onChange={(e) => setDraft({ ...draft, attendees: e.target.value })}
                placeholder="Bpk. A (Purchasing), Ibu B..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Upload Nota / Struk</label>
              <div className="flex items-center gap-2">
                <label className="px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-bold cursor-pointer inline-flex items-center gap-1.5">
                  {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  <span>{draft.attachmentUrl ? 'Ganti Nota' : 'Upload Nota'}</span>
                  <input type="file" className="hidden" onChange={handleUploadReceipt} />
                </label>
                {draft.attachmentUrl && (
                  <a href={resolveSalesFileUrl(draft.attachmentUrl) || '#'} target="_blank" rel="noreferrer" className="text-blue-600 font-bold underline">
                    Lihat
                  </a>
                )}
              </div>
            </div>
            <div className="sm:col-span-4">
              <label className="block font-bold text-slate-700 mb-1">Tujuan &amp; Agenda Entertain *</label>
              <textarea
                rows={2}
                required
                value={draft.purpose}
                onChange={(e) => setDraft({ ...draft, purpose: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <button type="button" onClick={() => setFormOpen(false)} className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold">Batal</button>
            <button type="submit" disabled={saveMut.isPending} className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5">
              {saveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Simpan Pengajuan</span>
            </button>
          </div>
        </form>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold uppercase border-b border-slate-200">
              <tr>
                <th className="p-3">No. Dok &amp; Tanggal</th>
                <th className="p-3">Pemohon &amp; Customer</th>
                <th className="p-3">Lokasi &amp; Tujuan</th>
                <th className="p-3 text-right">Estimasi / Aktual</th>
                <th className="p-3">Approval Manager Mkt</th>
                <th className="p-3">Approval Finance</th>
                <th className="p-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={7} className="p-8 text-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" /> Memuat Entertain Sales...</td></tr>
              ) : list.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-slate-400">Belum ada pengajuan entertain sales.</td></tr>
              ) : (
                list.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/70">
                    <td className="p-3">
                      <div className="font-mono font-bold text-blue-700">{row.documentNumber}</div>
                      <div className="text-[11px] text-slate-500">{row.entertainmentDate}</div>
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{row.customerName}</div>
                      <div className="text-[11px] text-slate-500">Sales: {row.employeeName}</div>
                    </td>
                    <td className="p-3 max-w-xs">
                      <div className="font-semibold text-slate-800">{row.location}</div>
                      <div className="text-[11px] text-slate-500 truncate">{row.purpose}</div>
                      {row.attachmentUrl && (
                        <a href={resolveSalesFileUrl(row.attachmentUrl) || '#'} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] text-blue-600 font-bold hover:underline">
                          <ExternalLink className="w-3 h-3" /> Nota
                        </a>
                      )}
                    </td>
                    <td className="p-3 text-right font-mono">
                      <div className="font-bold text-slate-900">{formatIDR(row.estimatedAmount)}</div>
                      {row.actualAmount != null && <div className="text-[11px] text-emerald-700">Akt: {formatIDR(row.actualAmount)}</div>}
                    </td>
                    <td className="p-3 space-y-1">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold ${badgeTone(row.managerStatus)}`}>
                        {row.managerStatus}
                      </span>
                      {canApproveManager && row.managerStatus === 'PENDING' && (
                        <div className="flex gap-1">
                          <button onClick={() => approveMgrMut.mutate({ id: row.id, action: 'APPROVE' })} className="px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-bold cursor-pointer">Approve</button>
                          <button onClick={() => approveMgrMut.mutate({ id: row.id, action: 'REJECT' })} className="px-2 py-0.5 rounded bg-rose-600 text-white text-[10px] font-bold cursor-pointer">Reject</button>
                        </div>
                      )}
                    </td>
                    <td className="p-3 space-y-1">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold ${badgeTone(row.financeStatus)}`}>
                        {row.financeStatus}
                      </span>
                      {canApproveFinance && row.financeStatus === 'PENDING' && (
                        <div className="flex gap-1">
                          <button onClick={() => approveFinMut.mutate({ id: row.id, action: 'APPROVE' })} className="px-2 py-0.5 rounded bg-blue-700 text-white text-[10px] font-bold cursor-pointer">Approve</button>
                          <button onClick={() => approveFinMut.mutate({ id: row.id, action: 'REJECT' })} className="px-2 py-0.5 rounded bg-rose-600 text-white text-[10px] font-bold cursor-pointer">Reject</button>
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => printSalesEntertainmentV2Api(row.id).catch((e) => toast.error(extractSalesErrorMessage(e)))}
                          className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50 cursor-pointer"
                          title="Cetak Form Entertain"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        {canCreateEdit && row.status === 'PENDING' && (
                          <button
                            onClick={() => {
                              setEditingId(row.id);
                              setDraft({
                                customerId: row.customerId || '',
                                customerName: row.customerName,
                                entertainmentDate: row.entertainmentDate,
                                location: row.location,
                                attendees: row.attendees || '',
                                purpose: row.purpose,
                                estimatedAmount: row.estimatedAmount,
                                actualAmount: row.actualAmount ?? undefined,
                                attachmentUrl: row.attachmentUrl || '',
                              });
                              setFormOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 cursor-pointer"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                        {(canCreateEdit || canApproveFinance) && (
                          <button onClick={() => setDeleteTarget(row)} className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer">
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
          <span>Halaman <strong>{page}</strong> dari <strong>{totalPages}</strong></span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-1 rounded-lg border border-slate-300 font-bold disabled:opacity-40">Sebelumnya</button>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1 rounded-lg border border-slate-300 font-bold disabled:opacity-40">Selanjutnya</button>
          </div>
        </div>
      </div>

      <ConfirmActionModal
        isOpen={Boolean(deleteTarget)}
        title="Hapus Pengajuan Entertain"
        message={`Yakin ingin membatalkan pengajuan ${deleteTarget?.documentNumber || ''}?`}
        confirmLabel="Ya, Hapus"
        confirmTone="danger"
        isLoading={deleteMut.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
      />
    </div>
  );
};

