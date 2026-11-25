import React, { useState } from 'react';
import {
  Plus,
  Search,
  ChevronRight,
  ChevronDown,
  Pencil,
  Trash2,
  Save,
  X,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  listDeliveryRequestsApi,
  createDeliveryRequestApi,
  updateDeliveryRequestApi,
  deleteDeliveryRequestApi,
  reviewDeliveryRequestApi,
  listIncomingOrdersDropdownApi,
  extractLogisticsError,
  DeliveryRequestPayload,
} from '../../services/logisticsService';
import { listMdmCustomersApi, listMdmItemsApi, listCustomerPosApi } from '../../services/financeService';
import type { DeliveryRequest } from '../../types/logisticsRmStock';
import { ConfirmActionModal } from '../core1_hrd/ConfirmActionModal';
import { useRBAC } from '../../hooks/useRBAC';

const todayStr = () => new Date().toISOString().split('T')[0];

const emptyDraft = (): DeliveryRequestPayload => ({
  incomingOrderId: '',
  customerPoId: '',
  customerId: '',
  requestedDeliveryDate: todayStr(),
  deliverTo: '',
  poDeliveryNote: '',
  notes: '',
  items: [],
});

export const DeliveryRequestsTab: React.FC = () => {
  const queryClient = useQueryClient();
  const { isSuperAdmin, isExecutive, userDivision } = useRBAC();

  const canCreateEdit = isSuperAdmin || isExecutive || userDivision === 'SALES' || userDivision === 'DELIVERY';
  const canReview = isSuperAdmin || isExecutive || userDivision === 'DELIVERY';

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DeliveryRequestPayload>(emptyDraft);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [voidTarget, setVoidTarget] = useState<DeliveryRequest | null>(null);

  const { data: res, isLoading } = useQuery({
    queryKey: ['logisticsDeliveryRequests', page, search, statusFilter],
    queryFn: () => listDeliveryRequestsApi({ page, limit: 20, search: search || undefined, status: statusFilter }),
  });
  const list = res?.data || [];
  const totalPages = res?.meta?.totalPages || res?.meta?.total_pages || 1;

  const { data: customers = [] } = useQuery({ queryKey: ['mdmCustomersDropdown'], queryFn: listMdmCustomersApi });
  const { data: mdmItems = [] } = useQuery({ queryKey: ['mdmItemsDropdown'], queryFn: listMdmItemsApi });
  const { data: incomingOrders = [] } = useQuery({ queryKey: ['salesIoDropdown'], queryFn: listIncomingOrdersDropdownApi });
  const { data: posRes } = useQuery({ queryKey: ['financeCustomerPosDropdown'], queryFn: () => listCustomerPosApi({ page: 1, limit: 100 }) });
  const customerPos = posRes?.data || [];

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['logisticsDeliveryRequests'] });
    queryClient.invalidateQueries({ queryKey: ['logisticsRdoDropdown'] });
    queryClient.invalidateQueries({ queryKey: ['logisticsDashboardSummary'] });
  };

  const createMut = useMutation({
    mutationFn: (p: DeliveryRequestPayload) => createDeliveryRequestApi(p),
    onSuccess: () => {
      toast.success('Request Delivery Order (RDO) berhasil diajukan');
      setIsAdding(false);
      setDraft(emptyDraft());
      invalidateAll();
    },
    onError: (e: any) => toast.error(extractLogisticsError(e, 'Gagal mengajukan RDO').message),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, p }: { id: string; p: Partial<DeliveryRequestPayload> }) => updateDeliveryRequestApi(id, p),
    onSuccess: () => {
      toast.success('RDO berhasil diperbarui');
      setEditingId(null);
      invalidateAll();
    },
    onError: (e: any) => toast.error(extractLogisticsError(e, 'Gagal memperbarui RDO').message),
  });

  const reviewMut = useMutation({
    mutationFn: ({ id, action, notes }: { id: string; action: 'APPROVE' | 'REJECT'; notes?: string }) =>
      reviewDeliveryRequestApi(id, { action, notes: notes || null }),
    onSuccess: (_, vars) => {
      toast.success(vars.action === 'APPROVE' ? 'RDO disetujui Delivery' : 'RDO ditolak (Stok kurang)');
      setReviewingId(null);
      setReviewNotes('');
      invalidateAll();
    },
    onError: (e: any) => toast.error(extractLogisticsError(e, 'Gagal memproses review RDO').message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteDeliveryRequestApi(id),
    onSuccess: () => {
      toast.success('RDO berhasil dibatalkan');
      setVoidTarget(null);
      invalidateAll();
    },
    onError: (e: any) => toast.error(extractLogisticsError(e, 'Gagal membatalkan RDO').message),
  });

  const handleSave = () => {
    const payload: DeliveryRequestPayload = {
      ...draft,
      incomingOrderId: draft.incomingOrderId || null,
      customerPoId: draft.customerPoId || null,
      customerId: draft.customerId || null,
      items: draft.items.filter((it) => it.itemId && it.qtyToShip > 0),
    };
    if (editingId) updateMut.mutate({ id: editingId, p: payload });
    else createMut.mutate(payload);
  };

  const renderBadge = (status: string) => {
    const s = (status || '').toUpperCase();
    if (s === 'APPROVED_BY_LOGISTICS' || s === 'CONVERTED_TO_DO') return <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">{s}</span>;
    if (s.includes('REJECT')) return <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold">{s}</span>;
    return <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">{s || 'PENDING'}</span>;
  };

  const renderInlineEditor = (isNew: boolean) => (
    <>
      <tr className="bg-blue-50 border-b border-blue-200 align-top">
        <td className="px-3 py-2.5 font-mono text-xs font-bold text-blue-700">{isNew ? 'AUTO-RDO' : 'EDIT'}</td>
        <td className="px-3 py-2.5 space-y-1 min-w-[200px]">
          <select value={draft.customerId || ''} onChange={(e) => setDraft({ ...draft, customerId: e.target.value })} className="w-full px-2 py-1 rounded border border-slate-300 bg-white text-xs">
            <option value="">-- Pilih Customer --</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div className="flex gap-1">
            <select value={draft.incomingOrderId || ''} onChange={(e) => setDraft({ ...draft, incomingOrderId: e.target.value })} className="w-1/2 px-1 py-0.5 rounded border border-slate-300 bg-white text-[10px]">
              <option value="">-- IO --</option>
              {incomingOrders.map((io) => <option key={io.id} value={io.id}>{io.ioNumber}</option>)}
            </select>
            <select value={draft.customerPoId || ''} onChange={(e) => setDraft({ ...draft, customerPoId: e.target.value })} className="w-1/2 px-1 py-0.5 rounded border border-slate-300 bg-white text-[10px]">
              <option value="">-- PO --</option>
              {customerPos.map((po) => <option key={po.id} value={po.id}>{po.poNumber}</option>)}
            </select>
          </div>
        </td>
        <td className="px-3 py-2.5">
          <input type="date" value={draft.requestedDeliveryDate || ''} onChange={(e) => setDraft({ ...draft, requestedDeliveryDate: e.target.value })} className="px-2 py-1 rounded border border-slate-300 bg-white text-xs" />
        </td>
        <td className="px-3 py-2.5 space-y-1 min-w-[180px]">
          <input type="text" placeholder="Alamat kirim (Deliver To)..." value={draft.deliverTo || ''} onChange={(e) => setDraft({ ...draft, deliverTo: e.target.value })} className="w-full px-2 py-1 rounded border border-slate-300 bg-white text-xs" />
          <input type="text" placeholder="Catatan pengiriman PO..." value={draft.poDeliveryNote || ''} onChange={(e) => setDraft({ ...draft, poDeliveryNote: e.target.value })} className="w-full px-2 py-0.5 rounded border border-slate-300 bg-white text-[11px]" />
        </td>
        <td className="px-3 py-2.5">
          <input type="text" placeholder="Catatan..." value={draft.notes || ''} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} className="w-full px-2 py-1 rounded border border-slate-300 bg-white text-xs" />
        </td>
        <td className="px-3 py-2.5 text-center">{renderBadge(isNew ? 'PENDING' : 'EDIT')}</td>
        <td className="px-3 py-2.5 text-right whitespace-nowrap">
          <div className="inline-flex gap-1">
            <button type="button" onClick={handleSave} disabled={createMut.isPending || updateMut.isPending} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold cursor-pointer">
              <Save className="w-3.5 h-3.5" /> Simpan
            </button>
            <button type="button" onClick={() => { setIsAdding(false); setEditingId(null); }} className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-bold cursor-pointer">
              <X className="w-3.5 h-3.5" /> Batal
            </button>
          </div>
        </td>
      </tr>
      <tr className="bg-blue-50/60 border-b border-blue-200">
        <td colSpan={7} className="p-3">
          <div className="bg-white rounded-xl border border-blue-200 p-3 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-blue-800">Item RDO ({draft.items.length})</span>
              <button
                type="button"
                onClick={() => setDraft({ ...draft, items: [...draft.items, { itemId: '', qtyToShip: 1 }] })}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 text-white text-[11px] font-bold cursor-pointer"
              >
                <Plus className="w-3 h-3" /> + Item
              </button>
            </div>
            {draft.items.map((it, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <select
                  value={it.itemId}
                  onChange={(e) => setDraft({ ...draft, items: draft.items.map((x, i) => (i === idx ? { ...x, itemId: e.target.value } : x)) })}
                  className="flex-1 px-2 py-1 rounded border border-slate-300 bg-white text-xs"
                >
                  <option value="">-- Pilih Item --</option>
                  {mdmItems.map((m) => <option key={m.id} value={m.id}>{m.code ? `[${m.code}] ` : ''}{m.name}</option>)}
                </select>
                <input
                  type="number"
                  min={1}
                  value={it.qtyToShip}
                  onChange={(e) => setDraft({ ...draft, items: draft.items.map((x, i) => (i === idx ? { ...x, qtyToShip: Number(e.target.value) } : x)) })}
                  className="w-24 px-2 py-1 rounded border border-slate-300 font-mono text-right"
                />
                <button type="button" onClick={() => setDraft({ ...draft, items: draft.items.filter((_, i) => i !== idx) })} className="p-1 text-rose-600 cursor-pointer">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </td>
      </tr>
    </>
  );

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input type="text" placeholder="Cari No. RDO / Customer / PO..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs" />
          </div>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white">
            <option value="ALL">Semua Status</option>
            <option value="PENDING">PENDING</option>
            <option value="APPROVED_BY_LOGISTICS">APPROVED_BY_LOGISTICS</option>
            <option value="CONVERTED_TO_DO">CONVERTED_TO_DO</option>
            <option value="REJECTED_STOCK_UNAVAILABLE">REJECTED_STOCK_UNAVAILABLE</option>
          </select>
        </div>

        {canCreateEdit && (
          <button
            type="button"
            onClick={() => { setEditingId(null); setDraft(emptyDraft()); setIsAdding(true); }}
            disabled={isAdding}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-4 h-4" /> <span>+ Ajukan RDO (5.3.2)</span>
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase">
                <th className="px-3 py-2.5">No. RDO &amp; Tgl</th>
                <th className="px-3 py-2.5">Customer &amp; Ref. IO/PO</th>
                <th className="px-3 py-2.5">Tgl Kirim Diminta</th>
                <th className="px-3 py-2.5">Catatan Pengiriman PO</th>
                <th className="px-3 py-2.5">Pemohon</th>
                <th className="px-3 py-2.5 text-center">Status</th>
                <th className="px-3 py-2.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {canCreateEdit && isAdding && renderInlineEditor(true)}
              {isLoading ? (
                <tr><td colSpan={7} className="py-10 text-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Memuat Request DO...</td></tr>
              ) : list.length === 0 && !isAdding ? (
                <tr><td colSpan={7} className="py-10 text-center text-slate-400">Belum ada pengajuan Request Delivery Order (RDO).</td></tr>
              ) : (
                list.map((r) => {
                  if (canCreateEdit && editingId === r.id) return <React.Fragment key={r.id}>{renderInlineEditor(false)}</React.Fragment>;
                  const isExp = expandedId === r.id;
                  return (
                    <React.Fragment key={r.id}>
                      <tr className="hover:bg-slate-50/80">
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <button type="button" onClick={() => setExpandedId(isExp ? null : r.id)} className="inline-flex items-center gap-1 font-mono font-bold text-slate-800 hover:text-blue-700 cursor-pointer">
                            {isExp ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            <span>{r.requestNumber}</span>
                          </button>
                          <div className="text-[10px] text-slate-400 pl-4">{r.requestDate}</div>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="font-semibold text-slate-800">{r.customerName}</div>
                          <div className="text-[11px] font-mono text-slate-400">
                            {r.ioNumber ? `IO: ${r.ioNumber}` : ''} {r.poNumber ? `PO: ${r.poNumber}` : ''}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap font-medium">{r.requestedDeliveryDate || '-'}</td>
                        <td className="px-3 py-2.5 truncate max-w-[200px]">{r.poDeliveryNote || r.deliverTo || '-'}</td>
                        <td className="px-3 py-2.5">{r.requestedBy}</td>
                        <td className="px-3 py-2.5 text-center">{renderBadge(r.status)}</td>
                        <td className="px-3 py-2.5 text-right whitespace-nowrap">
                          <div className="inline-flex gap-1">
                            {canReview && r.status === 'PENDING' && (
                              <button
                                type="button"
                                onClick={() => { setReviewingId(r.id); setReviewNotes(''); }}
                                className="px-2 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold cursor-pointer"
                              >
                                Review
                              </button>
                            )}
                            {canCreateEdit && r.status === 'PENDING' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setIsAdding(false);
                                  setEditingId(r.id);
                                  setDraft({
                                    incomingOrderId: r.incomingOrderId || '',
                                    customerPoId: r.customerPoId || '',
                                    customerId: r.customerId || '',
                                    requestedDeliveryDate: r.requestedDeliveryDate || todayStr(),
                                    deliverTo: r.deliverTo || '',
                                    poDeliveryNote: r.poDeliveryNote || '',
                                    notes: r.notes || '',
                                    items: r.items || [],
                                  });
                                }}
                                className="p-1.5 rounded-lg border border-slate-200 hover:bg-blue-50 text-blue-600 cursor-pointer"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {canCreateEdit && r.status === 'PENDING' && (
                              <button type="button" onClick={() => setVoidTarget(r)} className="p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 text-rose-600 cursor-pointer">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {reviewingId === r.id && (
                        <tr className="bg-indigo-50 border-b border-indigo-200">
                          <td colSpan={7} className="p-3">
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <span className="font-bold text-indigo-800">Review RDO {r.requestNumber}:</span>
                              <input
                                type="text"
                                placeholder="Catatan ketersediaan stok / jadwal..."
                                value={reviewNotes}
                                onChange={(e) => setReviewNotes(e.target.value)}
                                className="flex-1 min-w-[200px] px-2.5 py-1 rounded border border-slate-300 bg-white"
                              />
                              <button
                                type="button"
                                onClick={() => reviewMut.mutate({ id: r.id, action: 'APPROVE', notes: reviewNotes })}
                                disabled={reviewMut.isPending}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold cursor-pointer"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" /> Approve RDO
                              </button>
                              <button
                                type="button"
                                onClick={() => reviewMut.mutate({ id: r.id, action: 'REJECT', notes: reviewNotes })}
                                disabled={reviewMut.isPending}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-600 text-white font-bold cursor-pointer"
                              >
                                <XCircle className="w-3.5 h-3.5" /> Tolak (Stok Kurang)
                              </button>
                              <button type="button" onClick={() => setReviewingId(null)} className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-bold cursor-pointer">Batal</button>
                            </div>
                          </td>
                        </tr>
                      )}

                      {isExp && (
                        <tr className="bg-slate-50/90 border-b border-slate-200">
                          <td colSpan={7} className="p-3.5 text-xs space-y-2">
                            <div className="text-slate-600">
                              <strong>Deliver To:</strong> {r.deliverTo || '-'} • <strong>Catatan:</strong> {r.notes || '-'}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {(r.items || []).map((it, idx) => (
                                <span key={idx} className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px]">
                                  {it.itemName || it.itemId} • Qty Kirim: <strong>{it.qtyToShip}</strong>
                                </span>
                              ))}
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
        title="Batalkan Request Delivery Order?"
        message={`Anda yakin ingin membatalkan RDO ${voidTarget?.requestNumber || ''}?`}
        confirmLabel="Ya, Batalkan"
        variant="danger"
        loading={deleteMut.isPending}
        onConfirm={() => voidTarget && deleteMut.mutate(voidTarget.id)}
        onCancel={() => setVoidTarget(null)}
      />
    </div>
  );
};
