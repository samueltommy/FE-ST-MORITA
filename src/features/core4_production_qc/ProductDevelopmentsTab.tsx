import React, { useState } from 'react';
import {
  Plus,
  Search,
  ChevronRight,
  ChevronDown,
  Pencil,
  Trash2,
  Printer,
  Save,
  X,
  Upload,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  listProductDevelopmentsApi,
  createProductDevelopmentApi,
  updateProductDevelopmentApi,
  deleteProductDevelopmentApi,
  approveProductSampleApi,
  uploadProductionDocument,
  resolveProductionFileUrl,
  printProductionHtmlReport,
  extractProductionError,
  ProductDevelopmentPayload,
} from '../../services/productionService';
import { listMdmCustomersApi } from '../../services/financeService';
import { formatIDR } from '../../utils/invoiceCalculator';
import type { ProductDevelopment } from '../../types/productionQc';
import { ConfirmActionModal } from '../core1_hrd/ConfirmActionModal';
import { useRBAC } from '../../hooks/useRBAC';

const emptyDraft = (): ProductDevelopmentPayload => ({
  category: 'ADHESIVE_TAPE',
  productName: '',
  sizeSpec: '',
  targetPrice: 0,
  monthlyQtyEstimate: 0,
  customerId: '',
  customerName: '',
  specVersion: 'v1.0',
  specDocumentUrl: '',
  specNotes: '',
  trialNotes: '',
});

export const ProductDevelopmentsTab: React.FC = () => {
  const queryClient = useQueryClient();
  const { isSuperAdmin, isExecutive, userDivision } = useRBAC();

  const canWriteDev = isSuperAdmin || isExecutive || userDivision === 'SALES' || userDivision === 'RND';
  const canApproveRnd = isSuperAdmin || isExecutive || userDivision === 'RND';

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ProductDevelopmentPayload>(emptyDraft);
  const [uploading, setUploading] = useState(false);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [approvalDraft, setApprovalDraft] = useState({ specVersion: 'v2.0-FINAL', specDocumentUrl: '', notes: '' });
  const [voidTarget, setVoidTarget] = useState<ProductDevelopment | null>(null);

  const { data: res, isLoading } = useQuery({
    queryKey: ['productDevelopments', page, search, statusFilter],
    queryFn: () => listProductDevelopmentsApi({ page, limit: 20, search: search || undefined, status: statusFilter }),
  });
  const list = res?.data || [];
  const totalPages = res?.meta?.totalPages || res?.meta?.total_pages || 1;

  const { data: customers = [] } = useQuery({ queryKey: ['mdmCustomersDropdown'], queryFn: listMdmCustomersApi });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['productDevelopments'] });
    queryClient.invalidateQueries({ queryKey: ['productionDashboardSummary'] });
  };

  const createMut = useMutation({
    mutationFn: (p: ProductDevelopmentPayload) => createProductDevelopmentApi(p),
    onSuccess: () => {
      toast.success('Proyek Pengembangan Produk berhasil disimpan');
      setIsAdding(false);
      setDraft(emptyDraft());
      invalidateAll();
    },
    onError: (e: any) => toast.error(extractProductionError(e, 'Gagal menyimpan proyek').message),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, p }: { id: string; p: Partial<ProductDevelopmentPayload> }) => updateProductDevelopmentApi(id, p),
    onSuccess: () => {
      toast.success('Proyek Pengembangan Produk berhasil diperbarui');
      setEditingId(null);
      invalidateAll();
    },
    onError: (e: any) => toast.error(extractProductionError(e, 'Gagal memperbarui proyek').message),
  });

  const approveMut = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'APPROVE' | 'REJECT' }) =>
      approveProductSampleApi(id, {
        action,
        specVersion: approvalDraft.specVersion || undefined,
        specDocumentUrl: approvalDraft.specDocumentUrl || null,
        notes: approvalDraft.notes || null,
      }),
    onSuccess: (_, vars) => {
      toast.success(vars.action === 'APPROVE' ? 'Sampel Akhir R&D disetujui (APPROVED)' : 'Sampel Akhir R&D ditolak (REJECTED)');
      setExpandedId(null);
      invalidateAll();
    },
    onError: (e: any) => toast.error(extractProductionError(e, 'Gagal memproses approval sampel').message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteProductDevelopmentApi(id),
    onSuccess: () => {
      toast.success('Proyek berhasil dibatalkan');
      setVoidTarget(null);
      invalidateAll();
    },
    onError: (e: any) => toast.error(extractProductionError(e, 'Gagal membatalkan proyek').message),
  });

  const handleUploadSpec = async (file: File, target: 'draft' | 'approval') => {
    setUploading(true);
    try {
      const url = await uploadProductionDocument('spec_document', file);
      if (target === 'draft') setDraft((prev) => ({ ...prev, specDocumentUrl: url }));
      else setApprovalDraft((prev) => ({ ...prev, specDocumentUrl: url }));
      toast.success('Dokumen spesifikasi berhasil diunggah');
    } catch (e: any) {
      toast.error(e?.message || 'Gagal mengunggah dokumen spesifikasi');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = () => {
    if (!draft.productName.trim()) return toast.error('Nama produk wajib diisi');
    const payload: ProductDevelopmentPayload = {
      ...draft,
      customerId: draft.customerId || null,
      specDocumentUrl: draft.specDocumentUrl || null,
    };
    if (editingId) updateMut.mutate({ id: editingId, p: payload });
    else createMut.mutate(payload);
  };

  const renderBadge = (status: string) => {
    const s = (status || '').toUpperCase();
    if (s === 'APPROVED') return <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">APPROVED</span>;
    if (s === 'REJECTED') return <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold">REJECTED</span>;
    if (s === 'TRIAL' || s === 'SPEC_REVIEW') return <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">{s}</span>;
    return <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">{s || 'DRAFT'}</span>;
  };

  const renderInlineEditor = (isNew: boolean) => (
    <tr className="bg-blue-50 border-b border-blue-200 align-top">
      <td className="px-3 py-2.5 font-mono text-xs font-bold text-blue-700">{isNew ? 'AUTO-RND' : 'EDIT'}</td>
      <td className="px-3 py-2.5 space-y-1 min-w-[180px]">
        <input type="text" placeholder="Kategori (OPP Tape...)" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} className="w-full px-2 py-0.5 rounded border border-slate-300 bg-white text-[11px]" />
        <input type="text" placeholder="Nama Produk Baru..." value={draft.productName} onChange={(e) => setDraft({ ...draft, productName: e.target.value })} className="w-full px-2 py-1 rounded border border-slate-300 bg-white text-xs" />
      </td>
      <td className="px-3 py-2.5 space-y-1">
        <input type="text" placeholder="Ukuran / Spec (48mm x 100m)" value={draft.sizeSpec || ''} onChange={(e) => setDraft({ ...draft, sizeSpec: e.target.value })} className="w-36 px-2 py-1 rounded border border-slate-300 bg-white text-xs" />
        <input type="text" placeholder="Catatan Spec..." value={draft.specNotes || ''} onChange={(e) => setDraft({ ...draft, specNotes: e.target.value })} className="w-36 px-2 py-0.5 rounded border border-slate-300 bg-white text-[11px]" />
      </td>
      <td className="px-3 py-2.5">
        <input type="number" value={draft.targetPrice} onChange={(e) => setDraft({ ...draft, targetPrice: Number(e.target.value) })} className="w-24 px-2 py-1 rounded border border-slate-300 bg-white font-mono text-xs text-right" />
      </td>
      <td className="px-3 py-2.5">
        <input type="number" value={draft.monthlyQtyEstimate} onChange={(e) => setDraft({ ...draft, monthlyQtyEstimate: Number(e.target.value) })} className="w-20 px-2 py-1 rounded border border-slate-300 bg-white font-mono text-xs text-right" />
      </td>
      <td className="px-3 py-2.5 min-w-[160px] space-y-1">
        <select
          value={draft.customerId || ''}
          onChange={(e) => {
            const c = customers.find((x) => x.id === e.target.value);
            setDraft({ ...draft, customerId: e.target.value, customerName: c?.name || draft.customerName });
          }}
          className="w-full px-2 py-1 rounded border border-slate-300 bg-white text-xs"
        >
          <option value="">-- Pilih Customer --</option>
          {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input type="text" placeholder="Catatan Trial..." value={draft.trialNotes || ''} onChange={(e) => setDraft({ ...draft, trialNotes: e.target.value })} className="w-full px-2 py-0.5 rounded border border-slate-300 bg-white text-[11px]" />
      </td>
      <td className="px-3 py-2.5 space-y-1">
        <input type="text" placeholder="v1.0" value={draft.specVersion || ''} onChange={(e) => setDraft({ ...draft, specVersion: e.target.value })} className="w-20 px-2 py-0.5 rounded border border-slate-300 bg-white font-mono text-xs" />
        <label className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-slate-300 bg-white text-[10px] font-semibold cursor-pointer">
          {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
          <span>{draft.specDocumentUrl ? 'Ganti Spec' : 'Upload Spec'}</span>
          <input type="file" className="hidden" accept=".pdf,image/*,.doc,.docx" onChange={(e) => e.target.files?.[0] && handleUploadSpec(e.target.files[0], 'draft')} />
        </label>
      </td>
      <td className="px-3 py-2.5 text-center">{renderBadge(isNew ? 'DRAFT' : 'EDIT')}</td>
      <td className="px-3 py-2.5 text-right whitespace-nowrap">
        <div className="inline-flex gap-1">
          <button type="button" onClick={handleSave} disabled={createMut.isPending || updateMut.isPending || uploading} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold cursor-pointer">
            <Save className="w-3.5 h-3.5" /> Simpan
          </button>
          <button type="button" onClick={() => { setIsAdding(false); setEditingId(null); }} className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-bold cursor-pointer">
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
            <input type="text" placeholder="Cari Kode Proyek / Produk / Customer..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs" />
          </div>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white">
            <option value="ALL">Semua Status</option>
            <option value="DRAFT">DRAFT</option>
            <option value="TRIAL">TRIAL</option>
            <option value="SPEC_REVIEW">SPEC_REVIEW</option>
            <option value="APPROVED">APPROVED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
        </div>

        {canWriteDev && (
          <button
            type="button"
            onClick={() => { setEditingId(null); setDraft(emptyDraft()); setIsAdding(true); }}
            disabled={isAdding}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-4 h-4" /> <span>+ Tambah Proyek (4.2.1)</span>
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase">
                <th className="px-3 py-2.5">Kode Proyek</th>
                <th className="px-3 py-2.5">Kategori &amp; Nama Produk</th>
                <th className="px-3 py-2.5">Ukuran / Spec</th>
                <th className="px-3 py-2.5 text-right">Target Harga</th>
                <th className="px-3 py-2.5 text-right">Est. Qty/Bln</th>
                <th className="px-3 py-2.5">Customer &amp; Pemohon</th>
                <th className="px-3 py-2.5">Versi &amp; Dok. Spec</th>
                <th className="px-3 py-2.5 text-center">Status</th>
                <th className="px-3 py-2.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {canWriteDev && isAdding && renderInlineEditor(true)}
              {isLoading ? (
                <tr><td colSpan={9} className="py-10 text-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Memuat Proyek Pengembangan Produk...</td></tr>
              ) : list.length === 0 && !isAdding ? (
                <tr><td colSpan={9} className="py-10 text-center text-slate-400">Belum ada proyek pengembangan produk.</td></tr>
              ) : (
                list.map((d) => {
                  if (canWriteDev && editingId === d.id) return <React.Fragment key={d.id}>{renderInlineEditor(false)}</React.Fragment>;
                  const isExp = expandedId === d.id;
                  const specHref = resolveProductionFileUrl(d.specDocumentUrl);
                  return (
                    <React.Fragment key={d.id}>
                      <tr className="hover:bg-slate-50/80">
                        <td className="px-3 py-2.5 font-mono font-bold whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => {
                              const next = isExp ? null : d.id;
                              setExpandedId(next);
                              if (next) {
                                setApprovalDraft({
                                  specVersion: d.specVersion || 'v2.0-FINAL',
                                  specDocumentUrl: d.specDocumentUrl || '',
                                  notes: d.approvalNotes || '',
                                });
                              }
                            }}
                            className="inline-flex items-center gap-1 hover:text-blue-700 cursor-pointer"
                          >
                            {isExp ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            <span>{d.projectCode}</span>
                          </button>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="font-semibold text-slate-800">{d.productName}</div>
                          <div className="text-[10px] text-slate-400">{d.category}</div>
                        </td>
                        <td className="px-3 py-2.5">{d.sizeSpec || '-'}</td>
                        <td className="px-3 py-2.5 text-right font-mono">{formatIDR(d.targetPrice)}</td>
                        <td className="px-3 py-2.5 text-right font-mono">{d.monthlyQtyEstimate}</td>
                        <td className="px-3 py-2.5">
                          <div className="font-medium">{d.customerName || '-'}</div>
                          <div className="text-[10px] text-slate-400">{d.requestedByName || '-'}</div>
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <span className="font-mono font-bold text-slate-700">{d.specVersion}</span>
                          {specHref && (
                            <a href={specHref} target="_blank" rel="noreferrer" className="ml-2 inline-flex items-center gap-0.5 text-blue-600 hover:underline">
                              <ExternalLink className="w-3 h-3" /> Spec
                            </a>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-center">{renderBadge(d.status)}</td>
                        <td className="px-3 py-2.5 text-right whitespace-nowrap">
                          <div className="inline-flex gap-1">
                            {canApproveRnd && d.status !== 'APPROVED' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setExpandedId(d.id);
                                  setApprovalDraft({
                                    specVersion: d.specVersion || 'v2.0-FINAL',
                                    specDocumentUrl: d.specDocumentUrl || '',
                                    notes: '',
                                  });
                                }}
                                className="px-2 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-bold cursor-pointer"
                              >
                                Approval R&amp;D
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() =>
                                printProductionHtmlReport(`/production/product-developments/${d.id}/print-approval`).catch((e) =>
                                  toast.error(e?.message || 'Gagal mencetak Approval Sheet')
                                )
                              }
                              title="Cetak Approval Sheet"
                              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            {canWriteDev && (
                              <button
                                type="button"
                                onClick={() => {
                                  setIsAdding(false);
                                  setEditingId(d.id);
                                  setDraft({
                                    category: d.category,
                                    productName: d.productName,
                                    sizeSpec: d.sizeSpec || '',
                                    targetPrice: d.targetPrice,
                                    monthlyQtyEstimate: d.monthlyQtyEstimate,
                                    customerId: d.customerId || '',
                                    customerName: d.customerName || '',
                                    specVersion: d.specVersion,
                                    specDocumentUrl: d.specDocumentUrl || '',
                                    specNotes: d.specNotes || '',
                                    trialNotes: d.trialNotes || '',
                                  });
                                }}
                                className="p-1.5 rounded-lg border border-slate-200 hover:bg-blue-50 text-blue-600 cursor-pointer"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {canWriteDev && (
                              <button type="button" onClick={() => setVoidTarget(d)} className="p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 text-rose-600 cursor-pointer">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {isExp && (
                        <tr className="bg-purple-50/70 border-b border-purple-200">
                          <td colSpan={9} className="p-3.5 space-y-2 text-xs">
                            <div className="text-slate-600">
                              <strong>Catatan Spec:</strong> {d.specNotes || '-'} • <strong>Catatan Trial:</strong> {d.trialNotes || '-'}
                            </div>
                            {canApproveRnd && d.status !== 'APPROVED' ? (
                              <div className="bg-white rounded-xl border border-purple-200 p-3 flex flex-wrap items-end gap-2">
                                <span className="font-bold text-purple-800 w-full">4.2.2 Approval Sampel Akhir (Khusus R&amp;D)</span>
                                <label className="space-y-0.5">
                                  <span className="text-[10px] font-semibold">Versi Spec Final</span>
                                  <input type="text" value={approvalDraft.specVersion} onChange={(e) => setApprovalDraft({ ...approvalDraft, specVersion: e.target.value })} className="w-32 px-2 py-1 rounded border border-slate-300 font-mono" />
                                </label>
                                <label className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-slate-300 bg-slate-50 text-[11px] font-semibold cursor-pointer">
                                  {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                                  <span>{approvalDraft.specDocumentUrl ? 'Ganti Dok. Spec' : 'Upload Dok. Spec'}</span>
                                  <input type="file" className="hidden" accept=".pdf,image/*,.doc,.docx" onChange={(e) => e.target.files?.[0] && handleUploadSpec(e.target.files[0], 'approval')} />
                                </label>
                                <input type="text" placeholder="Catatan approval R&D..." value={approvalDraft.notes} onChange={(e) => setApprovalDraft({ ...approvalDraft, notes: e.target.value })} className="flex-1 min-w-[200px] px-2 py-1.5 rounded border border-slate-300" />
                                <button type="button" onClick={() => approveMut.mutate({ id: d.id, action: 'APPROVE' })} disabled={approveMut.isPending} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold cursor-pointer">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Approve Sampel
                                </button>
                                <button type="button" onClick={() => approveMut.mutate({ id: d.id, action: 'REJECT' })} disabled={approveMut.isPending} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-600 text-white font-bold cursor-pointer">
                                  <XCircle className="w-3.5 h-3.5" /> Reject
                                </button>
                              </div>
                            ) : (
                              <div className="text-slate-600">
                                <strong>Disetujui Oleh:</strong> {d.approvedBy || '-'} • <strong>Catatan Approval:</strong> {d.approvalNotes || '-'}
                              </div>
                            )}
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
        title="Batalkan Proyek Pengembangan Produk?"
        message={`Anda yakin ingin membatalkan proyek ${voidTarget?.projectCode || ''}?`}
        confirmLabel="Ya, Batalkan"
        variant="danger"
        loading={deleteMut.isPending}
        onConfirm={() => voidTarget && deleteMut.mutate(voidTarget.id)}
        onCancel={() => setVoidTarget(null)}
      />
    </div>
  );
};
