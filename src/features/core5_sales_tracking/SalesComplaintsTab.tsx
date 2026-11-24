import React, { useState } from 'react';
import {
  Plus,
  Upload,
  ExternalLink,
  Pencil,
  Trash2,
  Save,
  X,
  Send,
  Wrench,
  Loader2,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  listSalesComplaintsApi,
  createSalesComplaintApi,
  updateSalesComplaintApi,
  disposeSalesComplaintApi,
  submitSalesComplaintCorrectiveApi,
  deleteSalesComplaintApi,
  uploadSalesDocumentApi,
  resolveSalesFileUrl,
  listSalesDropdownCustomersApi,
  listSalesDropdownItemsApi,
  extractSalesErrorMessage,
  SalesComplaintPayload,
  SalesComplaintRecord,
} from '../../services/salesService';
import { ConfirmActionModal } from '../core1_hrd/ConfirmActionModal';
import { useRBAC } from '../../hooks/useRBAC';

const todayStr = () => new Date().toISOString().split('T')[0];

const COMPLAINT_TYPES = [
  'QUALITY_DEFECT',
  'QTY_SHORTAGE',
  'WRONG_SPEC',
  'PACKAGING_DAMAGE',
  'LATE_DELIVERY',
  'OTHER',
];

const PROPOSED_SOLUTIONS = ['REPLACEMENT', 'CREDIT_NOTE', 'REWORK', 'DISCOUNT', 'INVESTIGATION_ONLY'];
const PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'CRITICAL'];
const DEPARTMENTS = ['PRODUKSI_QC', 'WAREHOUSE_PPIC', 'DELIVERY', 'SALES', 'FINANCE', 'RND', 'PURCHASING'];

const emptyDraft = (): SalesComplaintPayload => ({
  customerId: '',
  itemId: '',
  complaintDate: todayStr(),
  complaintType: 'QUALITY_DEFECT',
  proposedSolution: 'REPLACEMENT',
  description: '',
  symptom: '',
  discoveredWhere: '',
  rejectQty: 0,
  percentReject: undefined,
  evidencePhotoUrl: '',
  priority: 'NORMAL',
  assignedDepartment: '',
  dispositionNotes: '',
});

export const SalesComplaintsTab: React.FC = () => {
  const queryClient = useQueryClient();
  const { isSuperAdmin, isExecutive, userDivision } = useRBAC();

  const canCreateEdit = isSuperAdmin || isExecutive || userDivision === 'SALES' || userDivision === 'FINANCE';
  const canDispose =
    isSuperAdmin || isExecutive || userDivision === 'SALES' || userDivision === 'FINANCE' || userDivision === 'PRODUKSI_QC';
  const canCorrective =
    isSuperAdmin || isExecutive || userDivision === 'PRODUKSI_QC' || userDivision === 'SALES' || userDivision === 'FINANCE';

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [custFilter, setCustFilter] = useState('ALL');

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<SalesComplaintPayload>(emptyDraft);
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SalesComplaintRecord | null>(null);

  // Disposition Modal (6.6.1)
  const [dispTarget, setDispTarget] = useState<SalesComplaintRecord | null>(null);
  const [dispDept, setDispDept] = useState('PRODUKSI_QC');
  const [dispPriority, setDispPriority] = useState('HIGH');
  const [dispStatus, setDispStatus] = useState('IN_INVESTIGATION');
  const [dispNotes, setDispNotes] = useState('');

  // Corrective Action Modal (6.6.2)
  const [corrTarget, setCorrTarget] = useState<SalesComplaintRecord | null>(null);
  const [rootCause, setRootCause] = useState('');
  const [correctiveAction, setCorrectiveAction] = useState('');
  const [preventiveAction, setPreventiveAction] = useState('');
  const [corrStatus, setCorrStatus] = useState('APPROVED_RMA');

  const { data: res, isLoading } = useQuery({
    queryKey: ['salesComplaints', page, statusFilter, custFilter],
    queryFn: () =>
      listSalesComplaintsApi({
        page,
        limit: 20,
        status: statusFilter,
        customerId: custFilter,
      }),
  });
  const complaints = res?.data || [];
  const totalPages = res?.meta?.totalPages || res?.meta?.total_pages || 1;

  const { data: customers = [] } = useQuery({
    queryKey: ['salesDropdownCustomers'],
    queryFn: listSalesDropdownCustomersApi,
  });
  const { data: items = [] } = useQuery({
    queryKey: ['salesDropdownItems'],
    queryFn: listSalesDropdownItemsApi,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['salesComplaints'] });
    queryClient.invalidateQueries({ queryKey: ['financeComplaints'] });
  };

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload: SalesComplaintPayload = {
        ...draft,
        itemId: draft.itemId || null,
        evidencePhotoUrl: draft.evidencePhotoUrl || null,
        assignedDepartment: draft.assignedDepartment || null,
        dispositionNotes: draft.dispositionNotes || null,
        percentReject: draft.percentReject !== undefined && draft.percentReject !== null ? Number(draft.percentReject) : null,
      };
      if (editingId) return updateSalesComplaintApi(editingId, payload);
      return createSalesComplaintApi(payload);
    },
    onSuccess: () => {
      toast.success(editingId ? 'Tiket E-Complaint diperbarui' : 'Tiket E-Complaint berhasil dibuat (6.6.1)');
      invalidate();
      setFormOpen(false);
      setEditingId(null);
      setDraft(emptyDraft());
    },
    onError: (err) => toast.error(extractSalesErrorMessage(err, 'Gagal menyimpan tiket E-Complaint')),
  });

  const disposeMut = useMutation({
    mutationFn: () => {
      if (!dispTarget) throw new Error('Tiket belum dipilih');
      if (!dispNotes.trim()) throw new Error('Catatan disposisi wajib diisi');
      return disposeSalesComplaintApi(dispTarget.id, {
        assignedDepartment: dispDept,
        priority: dispPriority,
        dispositionNotes: dispNotes.trim(),
        status: dispStatus,
      });
    },
    onSuccess: () => {
      toast.success('Disposisi tiket internal berhasil dicatat (6.6.1)');
      invalidate();
      setDispTarget(null);
      setDispNotes('');
    },
    onError: (err) => toast.error(extractSalesErrorMessage(err, 'Gagal menyimpan disposisi')),
  });

  const correctiveMut = useMutation({
    mutationFn: () => {
      if (!corrTarget) throw new Error('Tiket belum dipilih');
      if (!rootCause.trim() || !correctiveAction.trim()) {
        throw new Error('Root Cause dan Corrective Action wajib diisi');
      }
      return submitSalesComplaintCorrectiveApi(corrTarget.id, {
        rootCause: rootCause.trim(),
        correctiveAction: correctiveAction.trim(),
        preventiveAction: preventiveAction.trim() || undefined,
        status: corrStatus,
      });
    },
    onSuccess: () => {
      toast.success('Corrective Action & Root Cause berhasil dicatat (6.6.2)');
      invalidate();
      setCorrTarget(null);
    },
    onError: (err) => toast.error(extractSalesErrorMessage(err, 'Gagal mencatat corrective action')),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteSalesComplaintApi(id),
    onSuccess: () => {
      toast.success('Tiket E-Complaint dibatalkan');
      invalidate();
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(extractSalesErrorMessage(err, 'Gagal membatalkan tiket')),
  });

  const handleUploadEvidence = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const uploaded = await uploadSalesDocumentApi('complaint_evidence', file);
      setDraft((prev) => ({ ...prev, evidencePhotoUrl: uploaded.fileUrl }));
      toast.success(`Bukti foto (${uploaded.fileName}) berhasil diunggah`);
    } catch (err) {
      toast.error(extractSalesErrorMessage(err, 'Gagal upload bukti foto'));
    } finally {
      setUploading(false);
    }
  };

  const priorityTone = (p: string) => {
    if (p === 'CRITICAL') return 'bg-rose-600 text-white';
    if (p === 'HIGH') return 'bg-orange-100 text-orange-800';
    if (p === 'LOW') return 'bg-slate-100 text-slate-600';
    return 'bg-blue-100 text-blue-800';
  };

  const statusTone = (st: string) => {
    const s = st.toUpperCase();
    if (s.includes('RESOLVED') || s.includes('CLOSED') || s.includes('APPROVED')) return 'bg-emerald-100 text-emerald-800';
    if (s.includes('REJECTED')) return 'bg-rose-100 text-rose-800';
    return 'bg-amber-100 text-amber-800';
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={custFilter}
            onChange={(e) => {
              setCustFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-semibold max-w-[220px]"
          >
            <option value="ALL">Semua Customer</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-semibold"
          >
            <option value="ALL">Semua Status</option>
            <option value="OPEN">OPEN</option>
            <option value="IN_INVESTIGATION">IN_INVESTIGATION</option>
            <option value="APPROVED_RMA">APPROVED_RMA</option>
            <option value="RESOLVED">RESOLVED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
        </div>

        {canCreateEdit && (
          <button
            onClick={() => {
              setEditingId(null);
              setDraft(emptyDraft());
              setFormOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Tiket E-Complaint (6.6.1)</span>
          </button>
        )}
      </div>

      {/* Form Create/Edit */}
      {formOpen && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!draft.customerId || !draft.description.trim()) {
              toast.error('Customer dan Deskripsi Klaim wajib diisi');
              return;
            }
            saveMut.mutate();
          }}
          className="bg-white rounded-2xl border-2 border-rose-300 p-5 space-y-4 shadow-sm"
        >
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h3 className="text-sm font-black text-slate-900">
              {editingId ? 'Edit Tiket E-Complaint' : 'Formulir Digital Klaim Ketidaksesuaian Barang / E-Complaint (6.6.1)'}
            </h3>
            <button type="button" onClick={() => setFormOpen(false)} className="p-1 text-slate-400">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">Customer *</label>
              <select
                required
                disabled={Boolean(editingId)}
                value={draft.customerId}
                onChange={(e) => setDraft({ ...draft, customerId: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-semibold"
              >
                <option value="">-- Pilih Customer --</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Produk Terkait</label>
              <select
                value={draft.itemId || ''}
                onChange={(e) => setDraft({ ...draft, itemId: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
              >
                <option value="">-- Pilih Produk --</option>
                {items.map((it) => <option key={it.id} value={it.id}>[{it.code}] {it.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Tanggal Komplain</label>
              <input type="date" value={draft.complaintDate || todayStr()} onChange={(e) => setDraft({ ...draft, complaintDate: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-300" />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Tipe Keluhan *</label>
              <select value={draft.complaintType} onChange={(e) => setDraft({ ...draft, complaintType: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-semibold">
                {COMPLAINT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Usulan Solusi *</label>
              <select value={draft.proposedSolution} onChange={(e) => setDraft({ ...draft, proposedSolution: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-semibold">
                {PROPOSED_SOLUTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Prioritas</label>
              <select value={draft.priority || 'NORMAL'} onChange={(e) => setDraft({ ...draft, priority: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold">
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Qty Reject / % Reject</label>
              <div className="flex gap-1.5">
                <input type="number" min={0} step="any" placeholder="Qty" value={draft.rejectQty} onChange={(e) => setDraft({ ...draft, rejectQty: Number(e.target.value) || 0 })} className="w-1/2 px-2.5 py-2 rounded-xl border border-slate-300 font-mono" />
                <input type="number" min={0} max={100} step="any" placeholder="%" value={draft.percentReject ?? ''} onChange={(e) => setDraft({ ...draft, percentReject: e.target.value === '' ? undefined : Number(e.target.value) })} className="w-1/2 px-2.5 py-2 rounded-xl border border-slate-300 font-mono" />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">Gejala / Symptom</label>
              <input type="text" value={draft.symptom || ''} onChange={(e) => setDraft({ ...draft, symptom: e.target.value })} placeholder="Lem mengelupas / lebar tidak presisi..." className="w-full px-3 py-2 rounded-xl border border-slate-300" />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Ditemukan Di (Discovered Where)</label>
              <input type="text" value={draft.discoveredWhere || ''} onChange={(e) => setDraft({ ...draft, discoveredWhere: e.target.value })} placeholder="Incoming QC / Line Produksi Customer" className="w-full px-3 py-2 rounded-xl border border-slate-300" />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Upload Bukti Foto</label>
              <div className="flex items-center gap-2">
                <label className="px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-bold cursor-pointer inline-flex items-center gap-1.5">
                  {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  <span>{draft.evidencePhotoUrl ? 'Ganti Foto' : 'Upload Foto'}</span>
                  <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleUploadEvidence} />
                </label>
                {draft.evidencePhotoUrl && (
                  <a href={resolveSalesFileUrl(draft.evidencePhotoUrl) || '#'} target="_blank" rel="noreferrer" className="text-blue-600 font-bold underline">
                    Lihat
                  </a>
                )}
              </div>
            </div>
            <div className="sm:col-span-4">
              <label className="block font-bold text-slate-700 mb-1">Deskripsi Lengkap Keluhan *</label>
              <textarea rows={2} required value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-300" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <button type="button" onClick={() => setFormOpen(false)} className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold">Batal</button>
            <button type="submit" disabled={saveMut.isPending} className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5">
              {saveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Kirim E-Complaint</span>
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
                <th className="p-3">No. Tiket &amp; Prioritas</th>
                <th className="p-3">Customer &amp; Produk</th>
                <th className="p-3">Keluhan &amp; Bukti</th>
                <th className="p-3">6.6.1 Disposisi Internal</th>
                <th className="p-3">6.6.2 Corrective Action</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={7} className="p-8 text-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" /> Memuat E-Complaint...</td></tr>
              ) : complaints.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-slate-400">Belum ada tiket E-Complaint.</td></tr>
              ) : (
                complaints.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 align-top">
                    <td className="p-3">
                      <div className="font-mono font-bold text-rose-700">{c.complaintNumber}</div>
                      <div className="text-[11px] text-slate-500">{c.complaintDate}</div>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-black ${priorityTone(c.priority)}`}>
                        {c.priority}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{c.customerName}</div>
                      <div className="text-[11px] text-slate-600">{c.itemName || '-'}</div>
                      <div className="text-[11px] font-mono text-rose-600">Reject: {c.rejectQty} {c.percentReject != null ? `(${c.percentReject}%)` : ''}</div>
                    </td>
                    <td className="p-3 max-w-xs">
                      <div className="font-bold text-slate-800">{c.complaintType} → {c.proposedSolution}</div>
                      <p className="text-[11px] text-slate-600 line-clamp-2">{c.description}</p>
                      {c.evidencePhotoUrl && (
                        <a href={resolveSalesFileUrl(c.evidencePhotoUrl) || '#'} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] text-blue-600 font-bold hover:underline mt-0.5">
                          <ExternalLink className="w-3 h-3" /> Bukti Foto
                        </a>
                      )}
                    </td>
                    <td className="p-3">
                      {c.assignedDepartment ? (
                        <div className="space-y-0.5">
                          <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 text-[10px] font-bold">
                            → {c.assignedDepartment}
                          </span>
                          {c.dispositionNotes && <div className="text-[11px] text-slate-600">{c.dispositionNotes}</div>}
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Belum didisposisi</span>
                      )}
                      {canDispose && (
                        <button
                          onClick={() => {
                            setDispTarget(c);
                            setDispDept(c.assignedDepartment || 'PRODUKSI_QC');
                            setDispPriority(c.priority || 'HIGH');
                            setDispStatus(c.status === 'OPEN' ? 'IN_INVESTIGATION' : c.status);
                            setDispNotes(c.dispositionNotes || '');
                          }}
                          className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 hover:underline cursor-pointer"
                        >
                          <Send className="w-3 h-3" /> Disposisi
                        </button>
                      )}
                    </td>
                    <td className="p-3 max-w-xs">
                      {c.rootCause || c.correctiveAction ? (
                        <div className="space-y-0.5 text-[11px]">
                          <div><strong>RC:</strong> {c.rootCause}</div>
                          <div><strong>CA:</strong> {c.correctiveAction}</div>
                          {c.preventiveAction && <div><strong>PA:</strong> {c.preventiveAction}</div>}
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Belum ada CA</span>
                      )}
                      {canCorrective && (
                        <button
                          onClick={() => {
                            setCorrTarget(c);
                            setRootCause(c.rootCause || '');
                            setCorrectiveAction(c.correctiveAction || '');
                            setPreventiveAction(c.preventiveAction || '');
                            setCorrStatus('APPROVED_RMA');
                          }}
                          className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer"
                        >
                          <Wrench className="w-3 h-3" /> Input Corrective Action
                        </button>
                      )}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${statusTone(c.status)}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        {canCreateEdit && (
                          <button
                            onClick={() => {
                              setEditingId(c.id);
                              setDraft({
                                customerId: c.customerId,
                                itemId: c.itemId || '',
                                complaintDate: c.complaintDate,
                                complaintType: c.complaintType,
                                proposedSolution: c.proposedSolution,
                                description: c.description,
                                symptom: c.symptom || '',
                                discoveredWhere: c.discoveredWhere || '',
                                rejectQty: c.rejectQty,
                                percentReject: c.percentReject ?? undefined,
                                evidencePhotoUrl: c.evidencePhotoUrl || '',
                                priority: c.priority,
                                assignedDepartment: c.assignedDepartment || '',
                                dispositionNotes: c.dispositionNotes || '',
                              });
                              setFormOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 cursor-pointer"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                        {canCreateEdit && (
                          <button onClick={() => setDeleteTarget(c)} className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer">
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

      {/* Disposition Modal (6.6.1) */}
      {dispTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Send className="w-4 h-4 text-indigo-600" />
                6.6.1 Disposisi Tiket Internal
              </h3>
              <button onClick={() => setDispTarget(null)} className="p-1 text-slate-400"><X className="w-4 h-4" /></button>
            </div>
            <div className="text-xs bg-slate-50 p-3 rounded-xl">
              <div><strong>Tiket:</strong> {dispTarget.complaintNumber} — {dispTarget.customerName}</div>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Disposisi ke Divisi *</label>
                <select value={dispDept} onChange={(e) => setDispDept(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold">
                  {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Prioritas</label>
                  <select value={dispPriority} onChange={(e) => setDispPriority(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-semibold">
                    {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status Tiket</label>
                  <select value={dispStatus} onChange={(e) => setDispStatus(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-semibold">
                    <option value="OPEN">OPEN</option>
                    <option value="IN_INVESTIGATION">IN_INVESTIGATION</option>
                    <option value="RESOLVED">RESOLVED</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Instruksi / Catatan Disposisi *</label>
                <textarea rows={3} value={dispNotes} onChange={(e) => setDispNotes(e.target.value)} placeholder="Mohon tim QC periksa batch lot terkait..." className="w-full px-3 py-2 rounded-xl border border-slate-300" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDispTarget(null)} className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold">Batal</button>
              <button disabled={disposeMut.isPending} onClick={() => disposeMut.mutate()} className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5">
                {disposeMut.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Simpan Disposisi</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Corrective Action Modal (6.6.2) */}
      {corrTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Wrench className="w-4 h-4 text-emerald-600" />
                6.6.2 Root Cause &amp; Corrective Action
              </h3>
              <button onClick={() => setCorrTarget(null)} className="p-1 text-slate-400"><X className="w-4 h-4" /></button>
            </div>
            <div className="text-xs bg-slate-50 p-3 rounded-xl">
              <div><strong>Tiket:</strong> {corrTarget.complaintNumber} — {corrTarget.customerName}</div>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Akar Masalah (Root Cause) *</label>
                <textarea rows={2} value={rootCause} onChange={(e) => setRootCause(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-300" />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tindakan Perbaikan (Corrective Action) *</label>
                <textarea rows={2} value={correctiveAction} onChange={(e) => setCorrectiveAction(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-300" />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tindakan Pencegahan (Preventive Action)</label>
                <textarea rows={2} value={preventiveAction} onChange={(e) => setPreventiveAction(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-300" />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Keputusan Status</label>
                <select value={corrStatus} onChange={(e) => setCorrStatus(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-bold">
                  <option value="APPROVED_RMA">APPROVED_RMA</option>
                  <option value="RESOLVED">RESOLVED</option>
                  <option value="REJECTED">REJECTED</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setCorrTarget(null)} className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold">Batal</button>
              <button disabled={correctiveMut.isPending} onClick={() => correctiveMut.mutate()} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5">
                {correctiveMut.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Simpan Corrective Action</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmActionModal
        isOpen={Boolean(deleteTarget)}
        title="Batalkan Tiket E-Complaint"
        message={`Yakin ingin membatalkan tiket ${deleteTarget?.complaintNumber || ''}?`}
        confirmLabel="Ya, Batalkan"
        confirmTone="danger"
        isLoading={deleteMut.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
      />
    </div>
  );
};

