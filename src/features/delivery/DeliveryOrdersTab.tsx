import React, { useState, useEffect } from 'react';
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
  Truck,
  Loader2,
  Info,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  listDeliveryOrdersApi,
  createDeliveryOrderApi,
  updateDeliveryOrderApi,
  deleteDeliveryOrderApi,
  updateDeliveryOrderStatusApi,
  uploadLogisticsDocument,
  resolveLogisticsFileUrl,
  printLogisticsHtmlReport,
  extractLogisticsError,
  DeliveryOrderPayload,
  DeliveryOrderStatusPayload,
} from '../../services/logisticsService';
import { listAvailableStocksForSpkApi, listQcInspectionsApi } from '../../services/productionService';
import { listMdmCustomersApi, listMdmItemsApi } from '../../services/financeService';
import type { DeliveryOrderRecord, DeliveryPlan } from '../../types/logisticsRmStock';
import { ConfirmActionModal } from '../core1_hrd/ConfirmActionModal';
import { useRBAC } from '../../hooks/useRBAC';

interface Props {
  prefillPlan?: DeliveryPlan | null;
  onClearPrefill?: () => void;
}

const todayStr = () => new Date().toISOString().split('T')[0];

const emptyDraft = (): DeliveryOrderPayload => ({
  deliveryPlanId: '',
  deliveryRequestId: '',
  incomingOrderId: '',
  customerId: '',
  doDate: todayStr(),
  vehicleNumber: '',
  driverName: '',
  shippingMethod: 'OWN_VEHICLE',
  customsDocType: 'NONE',
  customsDocNumber: '',
  deliverTo: '',
  recipientName: '',
  recipientPhone: '',
  coaNumber: '',
  oqcInspectionId: '',
  notes: '',
  items: [],
});

export const DeliveryOrdersTab: React.FC<Props> = ({ prefillPlan, onClearPrefill }) => {
  const queryClient = useQueryClient();
  const { isSuperAdmin, isExecutive, userDivision } = useRBAC();
  const canWrite = isSuperAdmin || isExecutive || userDivision === 'DELIVERY' || userDivision === 'WAREHOUSE_PPIC';

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DeliveryOrderPayload>(emptyDraft);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Inline Status Update + POD state
  const [statusDraft, setStatusDraft] = useState<DeliveryOrderStatusPayload>({
    status: 'ON_THE_WAY',
    location: '',
    recipientName: '',
    gpsLatitude: null,
    gpsLongitude: null,
    podFileUrl: '',
    notes: '',
  });
  const [uploadingPod, setUploadingPod] = useState(false);
  const [voidTarget, setVoidTarget] = useState<DeliveryOrderRecord | null>(null);

  useEffect(() => {
    if (prefillPlan && canWrite) {
      setEditingId(null);
      setDraft({
        deliveryPlanId: prefillPlan.id,
        deliveryRequestId: prefillPlan.deliveryRequestId || '',
        incomingOrderId: prefillPlan.incomingOrderId || '',
        customerId: prefillPlan.customerId || '',
        doDate: todayStr(),
        vehicleNumber: prefillPlan.vehicleNumber || '',
        driverName: prefillPlan.driverName || '',
        shippingMethod: prefillPlan.shippingMethod || 'OWN_VEHICLE',
        customsDocType: 'NONE',
        customsDocNumber: '',
        deliverTo: prefillPlan.destinationAddress || '',
        recipientName: '',
        recipientPhone: '',
        coaNumber: '',
        oqcInspectionId: '',
        notes: prefillPlan.notes || '',
        items: (prefillPlan.items || []).map((it) => ({
          itemId: it.itemId,
          stockInventoryId: '',
          qtyShipped: it.plannedQty,
          lotNumber: it.lotNumber || '',
          notes: it.notes || '',
        })),
      });
      setIsAdding(true);
      onClearPrefill?.();
    }
  }, [prefillPlan, canWrite, onClearPrefill]);

  const { data: res, isLoading } = useQuery({
    queryKey: ['logisticsDeliveryOrders', page, search, statusFilter],
    queryFn: () => listDeliveryOrdersApi({ page, limit: 20, search: search || undefined, status: statusFilter }),
  });
  const list = res?.data || [];
  const totalPages = res?.meta?.totalPages || res?.meta?.total_pages || 1;

  const { data: customers = [] } = useQuery({ queryKey: ['mdmCustomersDropdown'], queryFn: listMdmCustomersApi });
  const { data: mdmItems = [] } = useQuery({ queryKey: ['mdmItemsDropdown'], queryFn: listMdmItemsApi });
  const { data: availableStocks = [] } = useQuery({ queryKey: ['availableStocksForSpk'], queryFn: listAvailableStocksForSpkApi });
  const { data: passedOqcRes } = useQuery({
    queryKey: ['passedOqcDropdown'],
    queryFn: () => listQcInspectionsApi({ qcType: 'OQC', status: 'PASSED', limit: 100 }),
  });
  const passedOqc = passedOqcRes?.data || [];

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['logisticsDeliveryOrders'] });
    queryClient.invalidateQueries({ queryKey: ['logisticsDeliveryPlans'] });
    queryClient.invalidateQueries({ queryKey: ['logisticsDeliveryRequests'] });
    queryClient.invalidateQueries({ queryKey: ['logisticsTrackingEvents'] });
    queryClient.invalidateQueries({ queryKey: ['logisticsDashboardSummary'] });
    queryClient.invalidateQueries({ queryKey: ['availableStocksForSpk'] });
    queryClient.invalidateQueries({ queryKey: ['productionStocks'] });
  };

  const handleErr = (e: any, fallback: string) => {
    const { message, isHoldLockout, isInsufficientStock } = extractLogisticsError(e, fallback);
    if (isHoldLockout) toast.error(`HOLD LOCKOUT (4.5.3): ${message}`, { duration: 6000 });
    else if (isInsufficientStock) toast.error(`STOK TIDAK CUKUP: ${message}`, { duration: 6000 });
    else toast.error(message);
  };

  const createMut = useMutation({
    mutationFn: (p: DeliveryOrderPayload) => createDeliveryOrderApi(p),
    onSuccess: () => {
      toast.success('Surat Jalan (DO) terbit! Stok FG terpotong otomatis.');
      setIsAdding(false);
      setDraft(emptyDraft());
      invalidateAll();
    },
    onError: (e: any) => handleErr(e, 'Gagal menerbitkan Surat Jalan (DO)'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, p }: { id: string; p: Partial<DeliveryOrderPayload> }) => updateDeliveryOrderApi(id, p),
    onSuccess: () => {
      toast.success('Surat Jalan (DO) berhasil diperbarui');
      setEditingId(null);
      invalidateAll();
    },
    onError: (e: any) => handleErr(e, 'Gagal memperbarui DO'),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, p }: { id: string; p: DeliveryOrderStatusPayload }) => updateDeliveryOrderStatusApi(id, p),
    onSuccess: () => {
      toast.success('Status pengiriman DO diperbarui & otomatis tercatat di E-Tracking (5.4)!');
      setExpandedId(null);
      invalidateAll();
    },
    onError: (e: any) => handleErr(e, 'Gagal memperbarui status DO'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteDeliveryOrderApi(id),
    onSuccess: () => {
      toast.success('DO dibatalkan — Stok FG yang terpotong telah dikembalikan otomatis.');
      setVoidTarget(null);
      invalidateAll();
    },
    onError: (e: any) => handleErr(e, 'Gagal membatalkan DO'),
  });

  const handleUploadPod = async (file: File) => {
    setUploadingPod(true);
    try {
      const url = await uploadLogisticsDocument('pod_photo', file);
      setStatusDraft((prev) => ({ ...prev, podFileUrl: url }));
      toast.success('Foto POD berhasil diunggah');
    } catch (e: any) {
      toast.error(e?.message || 'Gagal mengunggah POD');
    } finally {
      setUploadingPod(false);
    }
  };

  const handleSave = () => {
    const payload: DeliveryOrderPayload = {
      ...draft,
      deliveryPlanId: draft.deliveryPlanId || null,
      deliveryRequestId: draft.deliveryRequestId || null,
      incomingOrderId: draft.incomingOrderId || null,
      customerId: draft.customerId || null,
      oqcInspectionId: draft.oqcInspectionId || null,
      items: draft.items.filter((it) => it.itemId && it.qtyShipped > 0),
    };
    if (editingId) updateMut.mutate({ id: editingId, p: payload });
    else createMut.mutate(payload);
  };

  const renderStatusBadge = (status: string) => {
    const s = (status || '').toUpperCase();
    if (s === 'DELIVERED_RECEIVED') return <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">DELIVERED</span>;
    if (s === 'ON_THE_WAY') return <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">ON_THE_WAY</span>;
    if (s === 'DELIVERY_FAILED_RETURNED') return <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold">FAILED / RETURN</span>;
    return <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">PREPARING</span>;
  };

  const renderInlineEditor = (isNew: boolean) => (
    <>
      <tr className="bg-blue-50 border-b border-blue-200 align-top">
        <td className="px-3 py-2.5 space-y-1">
          <div className="font-mono text-xs font-bold text-blue-700">{isNew ? 'AUTO-DO' : 'EDIT'}</div>
          <input type="date" value={draft.doDate} onChange={(e) => setDraft({ ...draft, doDate: e.target.value })} className="px-1.5 py-0.5 rounded border border-slate-300 bg-white text-[11px]" />
        </td>
        <td className="px-3 py-2.5 space-y-1 min-w-[190px]">
          <select value={draft.customerId || ''} onChange={(e) => setDraft({ ...draft, customerId: e.target.value })} className="w-full px-2 py-1 rounded border border-slate-300 bg-white text-xs">
            <option value="">-- Pilih Customer --</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input type="text" placeholder="Alamat kirim..." value={draft.deliverTo || ''} onChange={(e) => setDraft({ ...draft, deliverTo: e.target.value })} className="w-full px-2 py-0.5 rounded border border-slate-300 bg-white text-[11px]" />
        </td>
        <td className="px-3 py-2.5 space-y-1">
          <input type="text" placeholder="Nopol Armada" value={draft.vehicleNumber || ''} onChange={(e) => setDraft({ ...draft, vehicleNumber: e.target.value })} className="w-full px-2 py-1 rounded border border-slate-300 bg-white font-mono text-xs" />
          <input type="text" placeholder="Nama Sopir" value={draft.driverName || ''} onChange={(e) => setDraft({ ...draft, driverName: e.target.value })} className="w-full px-2 py-0.5 rounded border border-slate-300 bg-white text-[11px]" />
        </td>
        <td className="px-3 py-2.5 space-y-1 min-w-[180px]">
          <div className="flex gap-1">
            <select value={draft.customsDocType || 'NONE'} onChange={(e) => setDraft({ ...draft, customsDocType: e.target.value })} className="w-1/2 px-1 py-0.5 rounded border border-slate-300 bg-white text-[10px]">
              <option value="NONE">Non-BC</option>
              <option value="BC_4.0">BC 4.0</option>
              <option value="BC_2.7">BC 2.7</option>
              <option value="BC_2.3">BC 2.3</option>
            </select>
            <input type="text" placeholder="No. BC" value={draft.customsDocNumber || ''} onChange={(e) => setDraft({ ...draft, customsDocNumber: e.target.value })} className="w-1/2 px-1.5 py-0.5 rounded border border-slate-300 bg-white font-mono text-[10px]" />
          </div>
          <select
            value={draft.oqcInspectionId || ''}
            onChange={(e) => {
              const oqc = passedOqc.find((x) => x.id === e.target.value);
              setDraft({ ...draft, oqcInspectionId: e.target.value, coaNumber: oqc?.coaNumber || draft.coaNumber });
            }}
            className="w-full px-1.5 py-0.5 rounded border border-slate-300 bg-white text-[10px]"
          >
            <option value="">-- Opsional OQC/COA --</option>
            {passedOqc.map((o) => <option key={o.id} value={o.id}>{o.coaNumber || o.inspectionNumber} ({o.lotNumber})</option>)}
          </select>
        </td>
        <td className="px-3 py-2.5 text-center">{renderStatusBadge('PREPARING_LOADING')}</td>
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

      {/* Inline Sub-Row: Items + Anti-HOLD FG Batch Picker */}
      <tr className="bg-blue-50/60 border-b border-blue-200">
        <td colSpan={6} className="p-3">
          <div className="bg-white rounded-xl border border-blue-200 p-3 space-y-2.5 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold text-blue-800">Item Surat Jalan &amp; Pilih Batch FG (Hanya Batch AVAILABLE — Anti-HOLD)</span>
              <button
                type="button"
                onClick={() => setDraft({ ...draft, items: [...draft.items, { itemId: '', stockInventoryId: '', qtyShipped: 1, lotNumber: '' }] })}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 text-white text-[11px] font-bold cursor-pointer"
              >
                <Plus className="w-3 h-3" /> + Item DO
              </button>
            </div>

            {draft.items.map((it, idx) => (
              <div key={idx} className="flex flex-wrap items-center gap-2">
                <select
                  value={it.stockInventoryId || ''}
                  onChange={(e) => {
                    const st = availableStocks.find((s) => s.id === e.target.value);
                    setDraft({
                      ...draft,
                      items: draft.items.map((x, i) =>
                        i === idx
                          ? { ...x, stockInventoryId: e.target.value, itemId: st?.itemId || x.itemId, lotNumber: st?.lotNumber || x.lotNumber }
                          : x
                      ),
                    });
                  }}
                  className="flex-1 min-w-[240px] px-2 py-1 rounded border border-slate-300 bg-white text-xs"
                >
                  <option value="">-- Pilih Batch FG (AVAILABLE) --</option>
                  {availableStocks.map((st) => (
                    <option key={st.id} value={st.id}>
                      [{st.lotNumber}] {st.itemName} — Stok: {st.qty} {st.unit || ''}
                    </option>
                  ))}
                </select>
                <select
                  value={it.itemId}
                  onChange={(e) => setDraft({ ...draft, items: draft.items.map((x, i) => (i === idx ? { ...x, itemId: e.target.value } : x)) })}
                  className="w-48 px-2 py-1 rounded border border-slate-300 bg-white text-xs"
                >
                  <option value="">-- Item --</option>
                  {mdmItems.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                <input
                  type="number"
                  min={1}
                  placeholder="Qty Kirim"
                  value={it.qtyShipped}
                  onChange={(e) => setDraft({ ...draft, items: draft.items.map((x, i) => (i === idx ? { ...x, qtyShipped: Number(e.target.value) } : x)) })}
                  className="w-24 px-2 py-1 rounded border border-slate-300 font-mono text-right"
                />
                <button type="button" onClick={() => setDraft({ ...draft, items: draft.items.filter((_, i) => i !== idx) })} className="p-1 text-rose-600 cursor-pointer">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input type="text" placeholder="No. COA (opsional)" value={draft.coaNumber || ''} onChange={(e) => setDraft({ ...draft, coaNumber: e.target.value })} className="px-2 py-1 rounded border border-slate-300 font-mono text-xs" />
              <input type="text" placeholder="Nama Penerima (UP)" value={draft.recipientName || ''} onChange={(e) => setDraft({ ...draft, recipientName: e.target.value })} className="px-2 py-1 rounded border border-slate-300 text-xs" />
              <input type="text" placeholder="Catatan Surat Jalan..." value={draft.notes || ''} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} className="px-2 py-1 rounded border border-slate-300 text-xs" />
            </div>
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
            <input type="text" placeholder="Cari No. DO / Customer / COA / BC..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs" />
          </div>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white">
            <option value="ALL">Semua Status</option>
            <option value="PREPARING_LOADING">PREPARING_LOADING</option>
            <option value="ON_THE_WAY">ON_THE_WAY</option>
            <option value="DELIVERED_RECEIVED">DELIVERED_RECEIVED</option>
            <option value="DELIVERY_FAILED_RETURNED">DELIVERY_FAILED_RETURNED</option>
          </select>
        </div>

        {canWrite && (
          <button
            type="button"
            onClick={() => { setEditingId(null); setDraft(emptyDraft()); setIsAdding(true); }}
            disabled={isAdding}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-4 h-4" /> <span>+ Terbitkan DO (5.3.3)</span>
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase">
                <th className="px-3 py-2.5">No. DO &amp; Tgl</th>
                <th className="px-3 py-2.5">Customer &amp; Alamat</th>
                <th className="px-3 py-2.5">Armada &amp; Sopir</th>
                <th className="px-3 py-2.5">Dok. BC &amp; COA</th>
                <th className="px-3 py-2.5 text-center">Status Pengiriman</th>
                <th className="px-3 py-2.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {canWrite && isAdding && renderInlineEditor(true)}
              {isLoading ? (
                <tr><td colSpan={6} className="py-10 text-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Memuat Delivery Order (Surat Jalan)...</td></tr>
              ) : list.length === 0 && !isAdding ? (
                <tr><td colSpan={6} className="py-10 text-center text-slate-400">Belum ada Surat Jalan (DO).</td></tr>
              ) : (
                list.map((d) => {
                  if (canWrite && editingId === d.id) return <React.Fragment key={d.id}>{renderInlineEditor(false)}</React.Fragment>;
                  const isExp = expandedId === d.id;
                  const podHref = resolveLogisticsFileUrl(d.podFileUrl);
                  return (
                    <React.Fragment key={d.id}>
                      <tr className="hover:bg-slate-50/80">
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => {
                              const next = isExp ? null : d.id;
                              setExpandedId(next);
                              if (next) {
                                setStatusDraft({
                                  status: d.status === 'PREPARING_LOADING' ? 'ON_THE_WAY' : 'DELIVERED_RECEIVED',
                                  location: '',
                                  recipientName: d.recipientName || '',
                                  gpsLatitude: null,
                                  gpsLongitude: null,
                                  podFileUrl: d.podFileUrl || '',
                                  notes: '',
                                });
                              }
                            }}
                            className="inline-flex items-center gap-1 font-mono font-bold text-slate-800 hover:text-blue-700 cursor-pointer"
                          >
                            {isExp ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            <span>{d.doNumber}</span>
                          </button>
                          <div className="text-[10px] text-slate-400 pl-4">{d.doDate}</div>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="font-semibold text-slate-800">{d.customerName}</div>
                          <div className="text-[11px] text-slate-400 truncate max-w-[200px]">{d.deliverTo || '-'}</div>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="font-mono font-semibold">{d.vehicleNumber || '-'}</div>
                          <div className="text-[11px] text-slate-400">{d.driverName || '-'}</div>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="font-mono text-[11px]">
                            {d.customsDocType && d.customsDocType !== 'NONE' ? `${d.customsDocType}: ${d.customsDocNumber || '-'}` : 'Non-BC'}
                          </div>
                          <div className="text-[11px] font-mono text-emerald-700">{d.coaNumber || '-'}</div>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <div>{renderStatusBadge(d.status)}</div>
                          {podHref && (
                            <a href={podHref} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-[10px] text-blue-600 hover:underline mt-0.5">
                              <ExternalLink className="w-2.5 h-2.5" /> POD
                            </a>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right whitespace-nowrap">
                          <div className="inline-flex gap-1">
                            {canWrite && d.status !== 'DELIVERED_RECEIVED' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setExpandedId(d.id);
                                  setStatusDraft({
                                    status: d.status === 'PREPARING_LOADING' ? 'ON_THE_WAY' : 'DELIVERED_RECEIVED',
                                    location: '',
                                    recipientName: d.recipientName || '',
                                    gpsLatitude: null,
                                    gpsLongitude: null,
                                    podFileUrl: d.podFileUrl || '',
                                    notes: '',
                                  });
                                }}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold cursor-pointer"
                              >
                                <Truck className="w-3 h-3" /> Update Status
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() =>
                                printLogisticsHtmlReport(`/logistics/delivery-orders/${d.id}/print`).catch((e) =>
                                  toast.error(e?.message || 'Gagal mencetak Surat Jalan')
                                )
                              }
                              title="Cetak Surat Jalan"
                              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            {canWrite && d.status === 'PREPARING_LOADING' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setIsAdding(false);
                                  setEditingId(d.id);
                                  setDraft({
                                    deliveryPlanId: d.deliveryPlanId || '',
                                    deliveryRequestId: d.deliveryRequestId || '',
                                    incomingOrderId: d.incomingOrderId || '',
                                    customerId: d.customerId || '',
                                    doDate: d.doDate,
                                    vehicleNumber: d.vehicleNumber || '',
                                    driverName: d.driverName || '',
                                    shippingMethod: d.shippingMethod || 'OWN_VEHICLE',
                                    customsDocType: d.customsDocType || 'NONE',
                                    customsDocNumber: d.customsDocNumber || '',
                                    deliverTo: d.deliverTo || '',
                                    recipientName: d.recipientName || '',
                                    recipientPhone: d.recipientPhone || '',
                                    coaNumber: d.coaNumber || '',
                                    oqcInspectionId: d.oqcInspectionId || '',
                                    notes: d.notes || '',
                                    items: d.items || [],
                                  });
                                }}
                                className="p-1.5 rounded-lg border border-slate-200 hover:bg-blue-50 text-blue-600 cursor-pointer"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {canWrite && (
                              <button type="button" onClick={() => setVoidTarget(d)} title="Batalkan DO" className="p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 text-rose-600 cursor-pointer">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {isExp && (
                        <tr className="bg-slate-50/90 border-b border-slate-200">
                          <td colSpan={6} className="p-3.5 space-y-3 text-xs">
                            <div className="flex flex-wrap gap-2">
                              {(d.items || []).map((it, idx) => (
                                <span key={idx} className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px]">
                                  {it.itemName || it.itemId} • Qty: <strong>{it.qtyShipped}</strong> {it.lotNumber ? `(LOT: ${it.lotNumber})` : ''}
                                </span>
                              ))}
                            </div>

                            {canWrite && (
                              <div className="bg-white rounded-xl border border-blue-200 p-3 space-y-2">
                                <div className="font-bold text-blue-800">Update Status Pengiriman &amp; Upload POD ({d.doNumber})</div>
                                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 items-end">
                                  <select value={statusDraft.status} onChange={(e) => setStatusDraft({ ...statusDraft, status: e.target.value as DeliveryOrderStatusPayload['status'] })} className="px-2 py-1.5 rounded border border-slate-300 bg-white font-bold">
                                    <option value="ON_THE_WAY">ON_THE_WAY</option>
                                    <option value="DELIVERED_RECEIVED">DELIVERED_RECEIVED</option>
                                    <option value="DELIVERY_FAILED_RETURNED">DELIVERY_FAILED_RETURNED</option>
                                  </select>
                                  <input type="text" placeholder="Lokasi / Checkpoint" value={statusDraft.location || ''} onChange={(e) => setStatusDraft({ ...statusDraft, location: e.target.value })} className="px-2 py-1.5 rounded border border-slate-300" />
                                  <input type="text" placeholder="Nama Penerima" value={statusDraft.recipientName || ''} onChange={(e) => setStatusDraft({ ...statusDraft, recipientName: e.target.value })} className="px-2 py-1.5 rounded border border-slate-300" />
                                  <input type="text" placeholder="Catatan..." value={statusDraft.notes || ''} onChange={(e) => setStatusDraft({ ...statusDraft, notes: e.target.value })} className="px-2 py-1.5 rounded border border-slate-300" />
                                  <label className="inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded border border-slate-300 bg-slate-50 hover:bg-slate-100 text-[11px] font-bold cursor-pointer">
                                    {uploadingPod ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                                    <span>{statusDraft.podFileUrl ? 'Ganti POD' : 'Upload POD'}</span>
                                    <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => e.target.files?.[0] && handleUploadPod(e.target.files[0])} />
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => statusMut.mutate({ id: d.id, p: statusDraft })}
                                    disabled={statusMut.isPending || uploadingPod}
                                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
                                  >
                                    Simpan Status
                                  </button>
                                </div>
                                <div className="flex items-center gap-1 text-[11px] text-slate-500">
                                  <Info className="w-3.5 h-3.5 text-blue-600" />
                                  <span>Setiap perubahan status DO otomatis tercatat di <strong>E-Tracking (5.4)</strong>.</span>
                                </div>
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
        title="Batalkan Delivery Order (Surat Jalan)?"
        message={`Anda yakin ingin membatalkan DO ${voidTarget?.doNumber || ''}? Stok FG yang sudah terpotong akan dikembalikan otomatis.`}
        confirmLabel="Ya, Batalkan & Kembalikan Stok"
        variant="danger"
        loading={deleteMut.isPending}
        onConfirm={() => voidTarget && deleteMut.mutate(voidTarget.id)}
        onCancel={() => setVoidTarget(null)}
      />
    </div>
  );
};
