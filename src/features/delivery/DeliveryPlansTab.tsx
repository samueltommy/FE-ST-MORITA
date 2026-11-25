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
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  listDeliveryPlansApi,
  createDeliveryPlanApi,
  updateDeliveryPlanApi,
  deleteDeliveryPlanApi,
  listDeliveryRequestsApi,
  listIncomingOrdersDropdownApi,
  printLogisticsHtmlReport,
  extractLogisticsError,
  DeliveryPlanPayload,
} from '../../services/logisticsService';
import { listMdmCustomersApi, listMdmItemsApi } from '../../services/financeService';
import type { DeliveryPlan, DeliveryPlanItem, ShippingMethod } from '../../types/logisticsRmStock';
import { ConfirmActionModal } from '../core1_hrd/ConfirmActionModal';
import { useRBAC } from '../../hooks/useRBAC';

interface Props {
  onConvertToDo: (plan: DeliveryPlan) => void;
}

const todayStr = () => new Date().toISOString().split('T')[0];

const emptyDraft = (): DeliveryPlanPayload => ({
  planDate: todayStr(),
  customerId: '',
  incomingOrderId: '',
  deliveryRequestId: '',
  vehicleNumber: '',
  driverName: '',
  shippingMethod: 'OWN_VEHICLE',
  destinationAddress: '',
  zoning: '',
  estimatedDepartureTime: '08:30 WIB',
  priority: 'NORMAL',
  notes: '',
  items: [],
});

export const DeliveryPlansTab: React.FC<Props> = ({ onConvertToDo }) => {
  const queryClient = useQueryClient();
  const { isSuperAdmin, isExecutive, userDivision } = useRBAC();
  const canWrite = isSuperAdmin || isExecutive || userDivision === 'DELIVERY';

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DeliveryPlanPayload>(emptyDraft);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [voidTarget, setVoidTarget] = useState<DeliveryPlan | null>(null);

  const { data: res, isLoading } = useQuery({
    queryKey: ['logisticsDeliveryPlans', page, search, statusFilter],
    queryFn: () => listDeliveryPlansApi({ page, limit: 20, search: search || undefined, status: statusFilter }),
  });
  const list = res?.data || [];
  const totalPages = res?.meta?.totalPages || res?.meta?.total_pages || 1;

  const { data: customers = [] } = useQuery({ queryKey: ['mdmCustomersDropdown'], queryFn: listMdmCustomersApi });
  const { data: mdmItems = [] } = useQuery({ queryKey: ['mdmItemsDropdown'], queryFn: listMdmItemsApi });
  const { data: incomingOrders = [] } = useQuery({ queryKey: ['salesIoDropdown'], queryFn: listIncomingOrdersDropdownApi });
  const { data: rdoRes } = useQuery({
    queryKey: ['logisticsRdoDropdown'],
    queryFn: () => listDeliveryRequestsApi({ page: 1, limit: 100 }),
  });
  const rdoList = rdoRes?.data || [];

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['logisticsDeliveryPlans'] });
    queryClient.invalidateQueries({ queryKey: ['logisticsDashboardSummary'] });
  };

  const createMut = useMutation({
    mutationFn: (p: DeliveryPlanPayload) => createDeliveryPlanApi(p),
    onSuccess: () => {
      toast.success('Delivery Plan berhasil disimpan');
      setIsAdding(false);
      setDraft(emptyDraft());
      invalidateAll();
    },
    onError: (e: any) => toast.error(extractLogisticsError(e, 'Gagal menyimpan Delivery Plan').message),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, p }: { id: string; p: Partial<DeliveryPlanPayload> }) => updateDeliveryPlanApi(id, p),
    onSuccess: () => {
      toast.success('Delivery Plan berhasil diperbarui');
      setEditingId(null);
      invalidateAll();
    },
    onError: (e: any) => toast.error(extractLogisticsError(e, 'Gagal memperbarui Delivery Plan').message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteDeliveryPlanApi(id),
    onSuccess: () => {
      toast.success('Delivery Plan berhasil dibatalkan');
      setVoidTarget(null);
      invalidateAll();
    },
    onError: (e: any) => toast.error(extractLogisticsError(e, 'Gagal membatalkan Delivery Plan').message),
  });

  const handleSave = () => {
    const payload: DeliveryPlanPayload = {
      ...draft,
      customerId: draft.customerId || null,
      incomingOrderId: draft.incomingOrderId || null,
      deliveryRequestId: draft.deliveryRequestId || null,
      items: draft.items.filter((it) => it.itemId && it.plannedQty > 0),
    };
    if (editingId) updateMut.mutate({ id: editingId, p: payload });
    else createMut.mutate(payload);
  };

  const renderBadge = (status: string) => {
    const s = (status || '').toUpperCase();
    if (s === 'COMPLETED' || s === 'CONVERTED_TO_DO') return <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">{s}</span>;
    if (s === 'READY_TO_SHIP') return <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">{s}</span>;
    if (s === 'CANCELLED') return <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold">{s}</span>;
    return <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">{s || 'PLANNED'}</span>;
  };

  const renderInlineEditor = (isNew: boolean) => (
    <>
      <tr className="bg-blue-50 border-b border-blue-200 align-top">
        <td className="px-3 py-2.5 space-y-1">
          <div className="font-mono text-xs font-bold text-blue-700">{isNew ? 'AUTO-DPL' : 'EDIT'}</div>
          <input type="date" value={draft.planDate} onChange={(e) => setDraft({ ...draft, planDate: e.target.value })} className="px-1.5 py-0.5 rounded border border-slate-300 bg-white text-[11px]" />
        </td>
        <td className="px-3 py-2.5 space-y-1 min-w-[190px]">
          <select value={draft.customerId || ''} onChange={(e) => setDraft({ ...draft, customerId: e.target.value })} className="w-full px-2 py-1 rounded border border-slate-300 bg-white text-xs">
            <option value="">-- Pilih Customer --</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input type="text" placeholder="Zonasi (KIIC / Cikarang)" value={draft.zoning || ''} onChange={(e) => setDraft({ ...draft, zoning: e.target.value })} className="w-full px-2 py-0.5 rounded border border-slate-300 bg-white text-[11px]" />
        </td>
        <td className="px-3 py-2.5 space-y-1 min-w-[150px]">
          <input type="text" placeholder="Nopol Armada (B 9123...)" value={draft.vehicleNumber || ''} onChange={(e) => setDraft({ ...draft, vehicleNumber: e.target.value })} className="w-full px-2 py-1 rounded border border-slate-300 bg-white font-mono text-xs" />
          <input type="text" placeholder="Nama Sopir" value={draft.driverName || ''} onChange={(e) => setDraft({ ...draft, driverName: e.target.value })} className="w-full px-2 py-0.5 rounded border border-slate-300 bg-white text-[11px]" />
        </td>
        <td className="px-3 py-2.5 space-y-1">
          <select value={draft.shippingMethod} onChange={(e) => setDraft({ ...draft, shippingMethod: e.target.value as ShippingMethod })} className="w-full px-2 py-1 rounded border border-slate-300 bg-white text-xs">
            <option value="OWN_VEHICLE">OWN_VEHICLE</option>
            <option value="CUSTOMER_PICKUP">CUSTOMER_PICKUP</option>
            <option value="THIRD_PARTY_FORWARDER">THIRD_PARTY_FORWARDER</option>
          </select>
          <input type="text" placeholder="08:30 WIB" value={draft.estimatedDepartureTime || ''} onChange={(e) => setDraft({ ...draft, estimatedDepartureTime: e.target.value })} className="w-full px-2 py-0.5 rounded border border-slate-300 bg-white text-[11px]" />
        </td>
        <td className="px-3 py-2.5">
          <select value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: e.target.value as 'NORMAL' | 'URGENT' })} className="px-2 py-1 rounded border border-slate-300 bg-white text-xs font-bold">
            <option value="NORMAL">NORMAL</option>
            <option value="URGENT">URGENT</option>
          </select>
        </td>
        <td className="px-3 py-2.5 text-center">{renderBadge(isNew ? 'PLANNED' : 'EDIT')}</td>
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

      {/* Inline Sub-Row: Ref IO/RDO, Address & Items */}
      <tr className="bg-blue-50/60 border-b border-blue-200">
        <td colSpan={7} className="p-3">
          <div className="bg-white rounded-xl border border-blue-200 p-3 space-y-2.5 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <select
                value={draft.deliveryRequestId || ''}
                onChange={(e) => {
                  const rdo = rdoList.find((r) => r.id === e.target.value);
                  setDraft({
                    ...draft,
                    deliveryRequestId: e.target.value,
                    customerId: rdo?.customerId || draft.customerId,
                    incomingOrderId: rdo?.incomingOrderId || draft.incomingOrderId,
                    destinationAddress: rdo?.deliverTo || draft.destinationAddress,
                    items:
                      rdo && rdo.items.length > 0
                        ? rdo.items.map((it) => ({ itemId: it.itemId, plannedQty: it.qtyToShip }))
                        : draft.items,
                  });
                }}
                className="px-2 py-1 rounded border border-slate-300 bg-white text-xs"
              >
                <option value="">-- Opsional Ref. RDO --</option>
                {rdoList.map((r) => <option key={r.id} value={r.id}>{r.requestNumber} — {r.customerName}</option>)}
              </select>
              <select value={draft.incomingOrderId || ''} onChange={(e) => setDraft({ ...draft, incomingOrderId: e.target.value })} className="px-2 py-1 rounded border border-slate-300 bg-white text-xs">
                <option value="">-- Opsional Ref. IO --</option>
                {incomingOrders.map((io) => <option key={io.id} value={io.id}>{io.ioNumber} — {io.customerName}</option>)}
              </select>
              <input type="text" placeholder="Alamat Tujuan..." value={draft.destinationAddress || ''} onChange={(e) => setDraft({ ...draft, destinationAddress: e.target.value })} className="px-2 py-1 rounded border border-slate-300 text-xs" />
              <input type="text" placeholder="Catatan..." value={draft.notes || ''} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} className="px-2 py-1 rounded border border-slate-300 text-xs" />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="font-bold text-blue-800">Rincian Item Delivery Plan ({draft.items.length})</span>
              <button
                type="button"
                onClick={() => setDraft({ ...draft, items: [...draft.items, { itemId: '', plannedQty: 1, lotNumber: '', notes: '' }] })}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 text-white text-[11px] font-bold cursor-pointer"
              >
                <Plus className="w-3 h-3" /> + Item
              </button>
            </div>

            {draft.items.map((it, idx) => (
              <div key={idx} className="flex flex-wrap items-center gap-2">
                <select
                  value={it.itemId}
                  onChange={(e) => {
                    const next: DeliveryPlanItem[] = draft.items.map((x, i) => (i === idx ? { ...x, itemId: e.target.value } : x));
                    setDraft({ ...draft, items: next });
                  }}
                  className="flex-1 min-w-[200px] px-2 py-1 rounded border border-slate-300 bg-white text-xs"
                >
                  <option value="">-- Pilih Item --</option>
                  {mdmItems.map((m) => <option key={m.id} value={m.id}>{m.code ? `[${m.code}] ` : ''}{m.name}</option>)}
                </select>
                <input
                  type="number"
                  min={1}
                  placeholder="Qty"
                  value={it.plannedQty}
                  onChange={(e) => setDraft({ ...draft, items: draft.items.map((x, i) => (i === idx ? { ...x, plannedQty: Number(e.target.value) } : x)) })}
                  className="w-24 px-2 py-1 rounded border border-slate-300 font-mono text-right"
                />
                <input
                  type="text"
                  placeholder="No. LOT"
                  value={it.lotNumber || ''}
                  onChange={(e) => setDraft({ ...draft, items: draft.items.map((x, i) => (i === idx ? { ...x, lotNumber: e.target.value } : x)) })}
                  className="w-28 px-2 py-1 rounded border border-slate-300 font-mono"
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
            <input type="text" placeholder="Cari No. Plan / Customer / Armada..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs" />
          </div>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white">
            <option value="ALL">Semua Status</option>
            <option value="PLANNED">PLANNED</option>
            <option value="READY_TO_SHIP">READY_TO_SHIP</option>
            <option value="CONVERTED_TO_DO">CONVERTED_TO_DO</option>
            <option value="COMPLETED">COMPLETED</option>
          </select>
        </div>

        {canWrite && (
          <button
            type="button"
            onClick={() => { setEditingId(null); setDraft(emptyDraft()); setIsAdding(true); }}
            disabled={isAdding}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-4 h-4" /> <span>+ Tambah Delivery Plan (5.3.1)</span>
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase">
                <th className="px-3 py-2.5">No. Plan &amp; Tgl</th>
                <th className="px-3 py-2.5">Customer &amp; Zonasi</th>
                <th className="px-3 py-2.5">Armada &amp; Sopir</th>
                <th className="px-3 py-2.5">Metode &amp; Est. Berangkat</th>
                <th className="px-3 py-2.5 text-center">Prioritas</th>
                <th className="px-3 py-2.5 text-center">Status</th>
                <th className="px-3 py-2.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {canWrite && isAdding && renderInlineEditor(true)}
              {isLoading ? (
                <tr><td colSpan={7} className="py-10 text-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Memuat Delivery Plan...</td></tr>
              ) : list.length === 0 && !isAdding ? (
                <tr><td colSpan={7} className="py-10 text-center text-slate-400">Belum ada data Delivery Plan.</td></tr>
              ) : (
                list.map((p) => {
                  if (canWrite && editingId === p.id) return <React.Fragment key={p.id}>{renderInlineEditor(false)}</React.Fragment>;
                  const isExp = expandedId === p.id;
                  const isVoid = p.status === 'CANCELLED';

                  return (
                    <React.Fragment key={p.id}>
                      <tr className={`hover:bg-slate-50/80 ${isVoid ? 'opacity-60' : ''}`}>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <button type="button" onClick={() => setExpandedId(isExp ? null : p.id)} className="inline-flex items-center gap-1 font-mono font-bold text-slate-800 hover:text-blue-700 cursor-pointer">
                            {isExp ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            <span>{p.planNumber}</span>
                          </button>
                          <div className="text-[10px] text-slate-400 pl-4">{p.planDate}</div>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="font-semibold text-slate-800">{p.customerName}</div>
                          <div className="text-[11px] text-slate-400">{p.zoning || '-'}</div>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="font-mono font-semibold">{p.vehicleNumber || '-'}</div>
                          <div className="text-[11px] text-slate-400">{p.driverName || '-'}</div>
                        </td>
                        <td className="px-3 py-2.5">
                          <div>{p.shippingMethod}</div>
                          <div className="text-[11px] text-slate-400">{p.estimatedDepartureTime || '-'}</div>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${p.priority === 'URGENT' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>
                            {p.priority}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center">{renderBadge(p.status)}</td>
                        <td className="px-3 py-2.5 text-right whitespace-nowrap">
                          <div className="inline-flex gap-1">
                            {canWrite && p.status !== 'CONVERTED_TO_DO' && p.status !== 'COMPLETED' && !isVoid && (
                              <button
                                type="button"
                                onClick={() => onConvertToDo(p)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold cursor-pointer"
                              >
                                <ArrowRight className="w-3 h-3" /> Terbitkan DO
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() =>
                                printLogisticsHtmlReport(`/logistics/delivery-plans/${p.id}/print`).catch((e) =>
                                  toast.error(e?.message || 'Gagal mencetak Delivery Plan')
                                )
                              }
                              title="Cetak Delivery Plan"
                              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            {canWrite && !isVoid && (
                              <button
                                type="button"
                                onClick={() => {
                                  setIsAdding(false);
                                  setEditingId(p.id);
                                  setDraft({
                                    planDate: p.planDate,
                                    customerId: p.customerId || '',
                                    incomingOrderId: p.incomingOrderId || '',
                                    deliveryRequestId: p.deliveryRequestId || '',
                                    vehicleNumber: p.vehicleNumber || '',
                                    driverName: p.driverName || '',
                                    shippingMethod: (p.shippingMethod as ShippingMethod) || 'OWN_VEHICLE',
                                    destinationAddress: p.destinationAddress || '',
                                    zoning: p.zoning || '',
                                    estimatedDepartureTime: p.estimatedDepartureTime || '',
                                    priority: (p.priority as 'NORMAL' | 'URGENT') || 'NORMAL',
                                    notes: p.notes || '',
                                    items: p.items || [],
                                  });
                                }}
                                className="p-1.5 rounded-lg border border-slate-200 hover:bg-blue-50 text-blue-600 cursor-pointer"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {canWrite && !isVoid && (
                              <button type="button" onClick={() => setVoidTarget(p)} className="p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 text-rose-600 cursor-pointer">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {isExp && (
                        <tr className="bg-slate-50/90 border-b border-slate-200">
                          <td colSpan={7} className="p-3.5 text-xs space-y-2">
                            <div className="text-slate-600">
                              <strong>Alamat:</strong> {p.destinationAddress || '-'} • <strong>Ref RDO:</strong> {p.requestNumber || '-'} • <strong>Ref IO:</strong> {p.ioNumber || '-'}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {(p.items || []).map((it, idx) => (
                                <span key={idx} className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px]">
                                  {it.itemName || it.itemId} • Qty: <strong>{it.plannedQty}</strong> {it.lotNumber ? `(LOT: ${it.lotNumber})` : ''}
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
        title="Batalkan Delivery Plan?"
        message={`Anda yakin ingin membatalkan Delivery Plan ${voidTarget?.planNumber || ''}?`}
        confirmLabel="Ya, Batalkan"
        variant="danger"
        loading={deleteMut.isPending}
        onConfirm={() => voidTarget && deleteMut.mutate(voidTarget.id)}
        onCancel={() => setVoidTarget(null)}
      />
    </div>
  );
};
