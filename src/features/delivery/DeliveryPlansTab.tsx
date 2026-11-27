import React, { useState } from 'react';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Printer,
  Save,
  X,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Eye,
  FileSpreadsheet,
  Table2,
  LayoutList,
  Download,
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

type ViewMode = 'list' | 'detail' | 'create' | 'edit';

const todayStr = () => new Date().toISOString().split('T')[0];

const emptyItem = (): DeliveryPlanItem => ({
  itemId: '',
  plannedQty: 1,
  lotNumber: '',
  notes: '',
});

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
  items: [emptyItem()],
});

const SHIPPING_METHOD_LABELS: Record<string, string> = {
  OWN_VEHICLE: 'Armada Sendiri (OWN_VEHICLE)',
  CUSTOMER_PICKUP: 'Ambil Sendiri (CUSTOMER_PICKUP)',
  THIRD_PARTY_FORWARDER: 'Ekspedisi / Forwarder (3PL)',
};

export const DeliveryPlansTab: React.FC<Props> = ({ onConvertToDo }) => {
  const queryClient = useQueryClient();
  const { isSuperAdmin, isExecutive, userDivision } = useRBAC();
  const canWrite = isSuperAdmin || isExecutive || userDivision === 'DELIVERY';

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [tableStyle, setTableStyle] = useState<'preview' | 'excel'>('preview');
  const [selectedPlan, setSelectedPlan] = useState<DeliveryPlan | null>(null);
  const [draft, setDraft] = useState<DeliveryPlanPayload>(emptyDraft);
  const [voidTarget, setVoidTarget] = useState<DeliveryPlan | null>(null);

  const { data: res, isLoading } = useQuery({
    queryKey: ['logisticsDeliveryPlans', page, search, statusFilter],
    queryFn: () =>
      listDeliveryPlansApi({ page, limit: 20, search: search || undefined, status: statusFilter }),
  });
  const list = res?.data || [];
  const totalPages = res?.meta?.totalPages || res?.meta?.total_pages || 1;
  const totalItems = res?.meta?.total ?? res?.meta?.totalItems ?? list.length;

  const { data: customers = [] } = useQuery({
    queryKey: ['mdmCustomersDropdown'],
    queryFn: listMdmCustomersApi,
  });
  const { data: mdmItems = [] } = useQuery({
    queryKey: ['mdmItemsDropdown'],
    queryFn: listMdmItemsApi,
  });
  const { data: incomingOrders = [] } = useQuery({
    queryKey: ['salesIoDropdown'],
    queryFn: listIncomingOrdersDropdownApi,
  });
  const { data: rdoRes } = useQuery({
    queryKey: ['logisticsRdoDropdown'],
    queryFn: () => listDeliveryRequestsApi({ page: 1, limit: 100 }),
  });
  const rdoList = rdoRes?.data || [];

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['logisticsDeliveryPlans'] });
    queryClient.invalidateQueries({ queryKey: ['logisticsDashboardSummary'] });
  };

  const planToDraft = (p: DeliveryPlan): DeliveryPlanPayload => ({
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
    items: p.items && p.items.length > 0 ? p.items.map((it) => ({ ...it })) : [emptyItem()],
  });

  const openCreateSheet = () => {
    setSelectedPlan(null);
    setDraft(emptyDraft());
    setViewMode('create');
  };

  const openDetailSheet = (p: DeliveryPlan) => {
    setSelectedPlan(p);
    setDraft(planToDraft(p));
    setViewMode('detail');
  };

  const openEditSheet = (p: DeliveryPlan) => {
    setSelectedPlan(p);
    setDraft(planToDraft(p));
    setViewMode('edit');
  };

  const backToList = () => {
    setViewMode('list');
    setSelectedPlan(null);
  };

  const createMut = useMutation({
    mutationFn: (p: DeliveryPlanPayload) => createDeliveryPlanApi(p),
    onSuccess: () => {
      toast.success('Delivery Plan berhasil disimpan');
      invalidateAll();
      backToList();
    },
    onError: (e: any) =>
      toast.error(extractLogisticsError(e, 'Gagal menyimpan Delivery Plan').message),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, p }: { id: string; p: Partial<DeliveryPlanPayload> }) =>
      updateDeliveryPlanApi(id, p),
    onSuccess: () => {
      toast.success('Delivery Plan berhasil diperbarui');
      invalidateAll();
      backToList();
    },
    onError: (e: any) =>
      toast.error(extractLogisticsError(e, 'Gagal memperbarui Delivery Plan').message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteDeliveryPlanApi(id),
    onSuccess: () => {
      toast.success('Delivery Plan berhasil dibatalkan');
      setVoidTarget(null);
      invalidateAll();
      if (viewMode !== 'list') backToList();
    },
    onError: (e: any) =>
      toast.error(extractLogisticsError(e, 'Gagal membatalkan Delivery Plan').message),
  });

  const handleSave = () => {
    if (!draft.planDate) {
      toast.error('Tanggal pengiriman wajib diisi.');
      return;
    }
    const validItems = draft.items.filter((it) => it.itemId && Number(it.plannedQty) > 0);
    const payload: DeliveryPlanPayload = {
      ...draft,
      customerId: draft.customerId || null,
      incomingOrderId: draft.incomingOrderId || null,
      deliveryRequestId: draft.deliveryRequestId || null,
      items: validItems,
    };
    if (viewMode === 'edit' && selectedPlan) {
      updateMut.mutate({ id: selectedPlan.id, p: payload });
    } else {
      createMut.mutate(payload);
    }
  };

  const renderBadge = (status: string) => {
    const s = (status || '').toUpperCase();
    if (s === 'COMPLETED' || s === 'CONVERTED_TO_DO') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
          {s}
        </span>
      );
    }
    if (s === 'READY_TO_SHIP') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-bold">
          {s}
        </span>
      );
    }
    if (s === 'CANCELLED') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-600 text-xs font-bold">
          {s}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
        {s || 'PLANNED'}
      </span>
    );
  };

  const isReadOnly = viewMode === 'detail';
  const isSheetOpen = viewMode !== 'list';

  // ═══════════════════════════════════════════════════════════════════════════
  // MODE 2: EXCEL-STYLE FULL-PAGE WORKSHEET (DETAIL / CREATE / EDIT)
  // ═══════════════════════════════════════════════════════════════════════════
  if (isSheetOpen) {
    const isVoid = selectedPlan?.status === 'CANCELLED';
    const displayItems = isReadOnly ? selectedPlan?.items || [] : draft.items;
    const totalPlannedQty = displayItems.reduce(
      (acc, it) => acc + (Number(it.plannedQty) || 0),
      0
    );

    const resolveCustomerName = () => {
      if (isReadOnly) return selectedPlan?.customerName || '-';
      return customers.find((c) => c.id === draft.customerId)?.name || '-';
    };
    const resolveItemName = (it: DeliveryPlanItem) => {
      if (it.itemName) return it.itemName;
      const found = mdmItems.find((m) => m.id === it.itemId);
      return found ? `${found.code ? `[${found.code}] ` : ''}${found.name}` : it.itemId || '-';
    };

    const cellInputClass =
      'w-full h-full px-3 py-2.5 text-sm text-slate-900 bg-white focus:outline-none focus:bg-blue-50/50 focus:ring-2 focus:ring-inset focus:ring-blue-500 transition-colors';
    const cellLabelClass =
      'px-3.5 py-2.5 bg-slate-100/90 text-xs font-bold text-slate-700 uppercase tracking-wide border border-slate-300 w-[16%] align-middle';
    const cellValueClass =
      'p-0 bg-white border border-slate-300 w-[34%] align-middle text-sm text-slate-900';

    return (
      <div className="space-y-4">
        {/* Sticky Worksheet Action Toolbar */}
        <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={backToList}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 text-sm font-bold cursor-pointer transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali ke Daftar</span>
            </button>
            <div className="h-6 w-px bg-slate-200 hidden sm:block" />
            <div className="flex items-center gap-2.5 flex-wrap">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="text-base font-black text-slate-900 font-mono">
                {viewMode === 'create'
                  ? 'DOKUMEN BARU (AUTO-DPL)'
                  : selectedPlan?.planNumber || 'Delivery Plan'}
              </span>
              {viewMode === 'create' ? (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                  MODE INPUT BARU
                </span>
              ) : viewMode === 'edit' ? (
                <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-bold">
                  MODE EDIT
                </span>
              ) : (
                renderBadge(selectedPlan?.status || 'PLANNED')
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isReadOnly && selectedPlan ? (
              <>
                {canWrite &&
                  selectedPlan.status !== 'CONVERTED_TO_DO' &&
                  selectedPlan.status !== 'COMPLETED' &&
                  !isVoid && (
                    <button
                      type="button"
                      onClick={() => onConvertToDo(selectedPlan)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold cursor-pointer"
                    >
                      <ArrowRight className="w-4 h-4" />
                      <span>Terbitkan DO</span>
                    </button>
                  )}
                <button
                  type="button"
                  onClick={() =>
                    printLogisticsHtmlReport(`/logistics/delivery-plans/${selectedPlan.id}/print`).catch(
                      (e) => toast.error(e?.message || 'Gagal mencetak Delivery Plan')
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-bold cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak</span>
                </button>
                {canWrite && !isVoid && (
                  <>
                    <button
                      type="button"
                      onClick={() => openEditSheet(selectedPlan)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold cursor-pointer"
                    >
                      <Pencil className="w-4 h-4" />
                      <span>Edit Dokumen</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setVoidTarget(selectedPlan)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-sm font-bold cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Batalkan</span>
                    </button>
                  </>
                )}
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => (selectedPlan ? setViewMode('detail') : backToList())}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-bold cursor-pointer"
                >
                  <X className="w-4 h-4" />
                  <span>Batal</span>
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={createMut.isPending || updateMut.isPending}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {createMut.isPending || updateMut.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>Simpan Delivery Plan</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Excel-Style Document Sheet */}
        <div className="bg-white rounded-xl border border-slate-300 border-t-4 border-t-emerald-600 shadow-sm overflow-hidden">
          {/* Sheet Header Banner */}
          <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-300 flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700">
                PT ST. MORITA INDUSTRIES — FORMULIR LOGISTIK 5.3.1
              </div>
              <h2 className="text-base font-black text-slate-900">
                RENCANA PENGIRIMAN BARANG (DELIVERY PLAN WORKSHEET)
              </h2>
            </div>
            <div className="text-xs text-slate-500 font-mono">
              {isReadOnly ? 'Sheet View (Read-Only)' : 'Excel Grid Input Mode — Gunakan Tab untuk pindah sel'}
            </div>
          </div>

          <div className="p-5 space-y-6">
            {/* Section 1: Header Information Table (Spreadsheet Key-Value Grid) */}
            <div>
              <div className="text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-2 flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-emerald-600 text-white inline-flex items-center justify-center text-[11px] font-bold">
                  1
                </span>
                <span>Informasi Utama &amp; Armada Pengiriman</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse table-fixed min-w-[780px]">
                  <tbody>
                    {/* Row 1 */}
                    <tr>
                      <th className={cellLabelClass}>No. Delivery Plan</th>
                      <td className={cellValueClass}>
                        <div className="px-3 py-2.5 font-mono font-bold text-slate-800 bg-slate-50/70">
                          {viewMode === 'create'
                            ? 'AUTO-GENERATED (DP/YYYYMM/NNN)'
                            : selectedPlan?.planNumber || '-'}
                        </div>
                      </td>
                      <th className={cellLabelClass}>Tanggal Kirim *</th>
                      <td className={cellValueClass}>
                        {isReadOnly ? (
                          <div className="px-3 py-2.5 font-mono font-semibold">
                            {selectedPlan?.planDate || '-'}
                          </div>
                        ) : (
                          <input
                            type="date"
                            value={draft.planDate}
                            onChange={(e) => setDraft({ ...draft, planDate: e.target.value })}
                            className={cellInputClass}
                          />
                        )}
                      </td>
                    </tr>

                    {/* Row 2 */}
                    <tr>
                      <th className={cellLabelClass}>Customer *</th>
                      <td className={cellValueClass}>
                        {isReadOnly ? (
                          <div className="px-3 py-2.5 font-semibold">{resolveCustomerName()}</div>
                        ) : (
                          <select
                            value={draft.customerId || ''}
                            onChange={(e) => setDraft({ ...draft, customerId: e.target.value })}
                            className={cellInputClass}
                          >
                            <option value="">-- Pilih Customer --</option>
                            {customers.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <th className={cellLabelClass}>Zonasi / Area</th>
                      <td className={cellValueClass}>
                        {isReadOnly ? (
                          <div className="px-3 py-2.5">{selectedPlan?.zoning || '-'}</div>
                        ) : (
                          <input
                            type="text"
                            placeholder="Contoh: KIIC Karawang / Jababeka Cikarang"
                            value={draft.zoning || ''}
                            onChange={(e) => setDraft({ ...draft, zoning: e.target.value })}
                            className={cellInputClass}
                          />
                        )}
                      </td>
                    </tr>

                    {/* Row 3 */}
                    <tr>
                      <th className={cellLabelClass}>Ref. RDO (Opsional)</th>
                      <td className={cellValueClass}>
                        {isReadOnly ? (
                          <div className="px-3 py-2.5 font-mono">
                            {selectedPlan?.requestNumber || '-'}
                          </div>
                        ) : (
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
                                    ? rdo.items.map((it) => ({
                                        itemId: it.itemId,
                                        plannedQty: it.qtyToShip,
                                        lotNumber: '',
                                        notes: '',
                                      }))
                                    : draft.items,
                              });
                            }}
                            className={cellInputClass}
                          >
                            <option value="">-- Tanpa Referensi RDO --</option>
                            {rdoList.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.requestNumber} — {r.customerName}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <th className={cellLabelClass}>Ref. IO (Opsional)</th>
                      <td className={cellValueClass}>
                        {isReadOnly ? (
                          <div className="px-3 py-2.5 font-mono">
                            {selectedPlan?.ioNumber || '-'}
                          </div>
                        ) : (
                          <select
                            value={draft.incomingOrderId || ''}
                            onChange={(e) =>
                              setDraft({ ...draft, incomingOrderId: e.target.value })
                            }
                            className={cellInputClass}
                          >
                            <option value="">-- Tanpa Referensi IO --</option>
                            {incomingOrders.map((io) => (
                              <option key={io.id} value={io.id}>
                                {io.ioNumber} — {io.customerName}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                    </tr>

                    {/* Row 4 */}
                    <tr>
                      <th className={cellLabelClass}>Nopol Armada</th>
                      <td className={cellValueClass}>
                        {isReadOnly ? (
                          <div className="px-3 py-2.5 font-mono font-semibold">
                            {selectedPlan?.vehicleNumber || '-'}
                          </div>
                        ) : (
                          <input
                            type="text"
                            placeholder="Contoh: B 9482 MOR"
                            value={draft.vehicleNumber || ''}
                            onChange={(e) =>
                              setDraft({ ...draft, vehicleNumber: e.target.value })
                            }
                            className={`${cellInputClass} font-mono`}
                          />
                        )}
                      </td>
                      <th className={cellLabelClass}>Nama Sopir</th>
                      <td className={cellValueClass}>
                        {isReadOnly ? (
                          <div className="px-3 py-2.5">{selectedPlan?.driverName || '-'}</div>
                        ) : (
                          <input
                            type="text"
                            placeholder="Nama lengkap sopir"
                            value={draft.driverName || ''}
                            onChange={(e) => setDraft({ ...draft, driverName: e.target.value })}
                            className={cellInputClass}
                          />
                        )}
                      </td>
                    </tr>

                    {/* Row 5 */}
                    <tr>
                      <th className={cellLabelClass}>Metode Kirim</th>
                      <td className={cellValueClass}>
                        {isReadOnly ? (
                          <div className="px-3 py-2.5">
                            {SHIPPING_METHOD_LABELS[selectedPlan?.shippingMethod || ''] ||
                              selectedPlan?.shippingMethod ||
                              '-'}
                          </div>
                        ) : (
                          <select
                            value={draft.shippingMethod}
                            onChange={(e) =>
                              setDraft({
                                ...draft,
                                shippingMethod: e.target.value as ShippingMethod,
                              })
                            }
                            className={cellInputClass}
                          >
                            <option value="OWN_VEHICLE">Armada Sendiri (OWN_VEHICLE)</option>
                            <option value="CUSTOMER_PICKUP">Ambil Sendiri (CUSTOMER_PICKUP)</option>
                            <option value="THIRD_PARTY_FORWARDER">
                              Ekspedisi / Forwarder (THIRD_PARTY_FORWARDER)
                            </option>
                          </select>
                        )}
                      </td>
                      <th className={cellLabelClass}>Est. Berangkat</th>
                      <td className={cellValueClass}>
                        {isReadOnly ? (
                          <div className="px-3 py-2.5">
                            {selectedPlan?.estimatedDepartureTime || '-'}
                          </div>
                        ) : (
                          <input
                            type="text"
                            placeholder="Contoh: 08:30 WIB"
                            value={draft.estimatedDepartureTime || ''}
                            onChange={(e) =>
                              setDraft({ ...draft, estimatedDepartureTime: e.target.value })
                            }
                            className={cellInputClass}
                          />
                        )}
                      </td>
                    </tr>

                    {/* Row 6 */}
                    <tr>
                      <th className={cellLabelClass}>Prioritas</th>
                      <td className={cellValueClass}>
                        {isReadOnly ? (
                          <div className="px-3 py-2.5">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                selectedPlan?.priority === 'URGENT'
                                  ? 'bg-rose-100 text-rose-700'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {selectedPlan?.priority || 'NORMAL'}
                            </span>
                          </div>
                        ) : (
                          <select
                            value={draft.priority}
                            onChange={(e) =>
                              setDraft({
                                ...draft,
                                priority: e.target.value as 'NORMAL' | 'URGENT',
                              })
                            }
                            className={`${cellInputClass} font-bold`}
                          >
                            <option value="NORMAL">NORMAL</option>
                            <option value="URGENT">URGENT</option>
                          </select>
                        )}
                      </td>
                      <th className={cellLabelClass}>Status Dokumen</th>
                      <td className={cellValueClass}>
                        <div className="px-3 py-2.5 bg-slate-50/70">
                          {renderBadge(
                            viewMode === 'create' ? 'PLANNED' : selectedPlan?.status || 'PLANNED'
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Row 7: Full-width Address */}
                    <tr>
                      <th className={cellLabelClass}>Alamat Tujuan</th>
                      <td colSpan={3} className="p-0 bg-white border border-slate-300 align-middle">
                        {isReadOnly ? (
                          <div className="px-3 py-2.5 text-sm text-slate-800">
                            {selectedPlan?.destinationAddress || '-'}
                          </div>
                        ) : (
                          <input
                            type="text"
                            placeholder="Alamat lengkap lokasi bongkar customer..."
                            value={draft.destinationAddress || ''}
                            onChange={(e) =>
                              setDraft({ ...draft, destinationAddress: e.target.value })
                            }
                            className={cellInputClass}
                          />
                        )}
                      </td>
                    </tr>

                    {/* Row 8: Full-width Notes */}
                    <tr>
                      <th className={cellLabelClass}>Catatan</th>
                      <td colSpan={3} className="p-0 bg-white border border-slate-300 align-middle">
                        {isReadOnly ? (
                          <div className="px-3 py-2.5 text-sm text-slate-800">
                            {selectedPlan?.notes || '-'}
                          </div>
                        ) : (
                          <input
                            type="text"
                            placeholder="Catatan khusus sopir / gudang / penerimaan..."
                            value={draft.notes || ''}
                            onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                            className={cellInputClass}
                          />
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section 2: Excel-Style Items Grid */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-emerald-600 text-white inline-flex items-center justify-center text-[11px] font-bold">
                    2
                  </span>
                  <span>Rincian Item Pengiriman ({displayItems.length} Baris)</span>
                </div>
                {!isReadOnly && (
                  <button
                    type="button"
                    onClick={() => setDraft({ ...draft, items: [...draft.items, emptyItem()] })}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Baris Item</span>
                  </button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-[780px]">
                  <thead>
                    <tr className="bg-slate-100 text-xs font-bold text-slate-700 uppercase">
                      <th className="border border-slate-300 px-2 py-2.5 text-center w-12">No</th>
                      <th className="border border-slate-300 px-3 py-2.5 text-left min-w-[280px]">
                        Item / Produk *
                      </th>
                      <th className="border border-slate-300 px-3 py-2.5 text-right w-36">
                        Qty Rencana *
                      </th>
                      <th className="border border-slate-300 px-3 py-2.5 text-left w-48">
                        No. LOT / Batch
                      </th>
                      <th className="border border-slate-300 px-3 py-2.5 text-left min-w-[200px]">
                        Catatan Item
                      </th>
                      {!isReadOnly && (
                        <th className="border border-slate-300 px-2 py-2.5 text-center w-16">
                          Hapus
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {displayItems.length === 0 ? (
                      <tr>
                        <td
                          colSpan={isReadOnly ? 5 : 6}
                          className="border border-slate-300 py-8 text-center text-sm text-slate-400"
                        >
                          Belum ada item pengiriman pada Delivery Plan ini.
                        </td>
                      </tr>
                    ) : (
                      displayItems.map((it, idx) => (
                        <tr key={idx} className="hover:bg-blue-50/20">
                          <td className="border border-slate-300 px-2 py-2 text-center font-mono text-xs font-bold text-slate-500 bg-slate-50/70">
                            {idx + 1}
                          </td>
                          <td className="border border-slate-300 p-0">
                            {isReadOnly ? (
                              <div className="px-3 py-2.5 text-sm font-medium text-slate-900">
                                {resolveItemName(it)}
                              </div>
                            ) : (
                              <select
                                value={it.itemId}
                                onChange={(e) =>
                                  setDraft({
                                    ...draft,
                                    items: draft.items.map((x, i) =>
                                      i === idx ? { ...x, itemId: e.target.value } : x
                                    ),
                                  })
                                }
                                className={cellInputClass}
                              >
                                <option value="">-- Pilih Item / Produk --</option>
                                {mdmItems.map((m) => (
                                  <option key={m.id} value={m.id}>
                                    {m.code ? `[${m.code}] ` : ''}
                                    {m.name}
                                  </option>
                                ))}
                              </select>
                            )}
                          </td>
                          <td className="border border-slate-300 p-0">
                            {isReadOnly ? (
                              <div className="px-3 py-2.5 text-sm font-mono font-bold text-right text-slate-900">
                                {Number(it.plannedQty || 0).toLocaleString('id-ID')}
                              </div>
                            ) : (
                              <input
                                type="number"
                                min={1}
                                value={it.plannedQty}
                                onChange={(e) =>
                                  setDraft({
                                    ...draft,
                                    items: draft.items.map((x, i) =>
                                      i === idx ? { ...x, plannedQty: Number(e.target.value) } : x
                                    ),
                                  })
                                }
                                className={`${cellInputClass} font-mono text-right font-semibold`}
                              />
                            )}
                          </td>
                          <td className="border border-slate-300 p-0">
                            {isReadOnly ? (
                              <div className="px-3 py-2.5 text-sm font-mono text-slate-700">
                                {it.lotNumber || '-'}
                              </div>
                            ) : (
                              <input
                                type="text"
                                placeholder="LOT-..."
                                value={it.lotNumber || ''}
                                onChange={(e) =>
                                  setDraft({
                                    ...draft,
                                    items: draft.items.map((x, i) =>
                                      i === idx ? { ...x, lotNumber: e.target.value } : x
                                    ),
                                  })
                                }
                                className={`${cellInputClass} font-mono`}
                              />
                            )}
                          </td>
                          <td className="border border-slate-300 p-0">
                            {isReadOnly ? (
                              <div className="px-3 py-2.5 text-sm text-slate-600">
                                {it.notes || '-'}
                              </div>
                            ) : (
                              <input
                                type="text"
                                placeholder="Catatan item..."
                                value={it.notes || ''}
                                onChange={(e) =>
                                  setDraft({
                                    ...draft,
                                    items: draft.items.map((x, i) =>
                                      i === idx ? { ...x, notes: e.target.value } : x
                                    ),
                                  })
                                }
                                className={cellInputClass}
                              />
                            )}
                          </td>
                          {!isReadOnly && (
                            <td className="border border-slate-300 px-2 py-1 text-center bg-slate-50/40">
                              <button
                                type="button"
                                onClick={() =>
                                  setDraft({
                                    ...draft,
                                    items: draft.items.filter((_, i) => i !== idx),
                                  })
                                }
                                title="Hapus baris"
                                className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-bold text-sm text-slate-900">
                      <td
                        colSpan={2}
                        className="border border-slate-300 px-3 py-2.5 text-right uppercase text-xs tracking-wide text-slate-600"
                      >
                        Total Rencana Pengiriman ({displayItems.length} Baris)
                      </td>
                      <td className="border border-slate-300 px-3 py-2.5 text-right font-mono text-emerald-700">
                        {totalPlannedQty.toLocaleString('id-ID')}
                      </td>
                      <td
                        colSpan={isReadOnly ? 2 : 3}
                        className="border border-slate-300 px-3 py-2.5"
                      />
                    </tr>
                  </tfoot>
                </table>
              </div>
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
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MODE 1: PREVIEW TABLE OR FULL EXCEL COMPARISON TABLE (LIST VIEW)
  // ═══════════════════════════════════════════════════════════════════════════
  const excelRows = list.flatMap((p) => {
    const items = p.items && p.items.length > 0 ? p.items : [null];
    return items.map((it, itemIdx) => ({
      plan: p,
      item: it,
      itemIdx,
      isFirstOfPlan: itemIdx === 0,
    }));
  });
  const totalExcelQty = excelRows.reduce(
    (sum, r) => sum + (Number(r.item?.plannedQty) || 0),
    0
  );

  const handleExportCsv = () => {
    const headers = [
      'No',
      'No. Delivery Plan',
      'Tanggal Kirim',
      'Customer',
      'Zonasi',
      'Alamat Tujuan',
      'Ref. RDO',
      'Ref. IO',
      'Nopol Armada',
      'Nama Sopir',
      'Metode Kirim',
      'Est. Berangkat',
      'Prioritas',
      'Status',
      'Item / Produk',
      'Qty Rencana',
      'No. LOT',
      'Catatan',
    ];
    const escapeCsv = (val: unknown) => {
      const s = String(val ?? '');
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = excelRows.map((r, i) => [
      i + 1,
      r.plan.planNumber,
      r.plan.planDate,
      r.plan.customerName || '',
      r.plan.zoning || '',
      r.plan.destinationAddress || '',
      r.plan.requestNumber || '',
      r.plan.ioNumber || '',
      r.plan.vehicleNumber || '',
      r.plan.driverName || '',
      r.plan.shippingMethod || '',
      r.plan.estimatedDepartureTime || '',
      r.plan.priority || '',
      r.plan.status || '',
      r.item ? r.item.itemName || r.item.itemId : '',
      r.item ? r.item.plannedQty : 0,
      r.item?.lotNumber || '',
      r.item?.notes || r.plan.notes || '',
    ]);
    const csv =
      '\uFEFF' +
      [headers, ...rows].map((line) => line.map(escapeCsv).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `delivery-plans-${todayStr()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Data Delivery Plan berhasil diekspor ke CSV (Excel)');
  };

  return (
    <div className="space-y-4">
      {/* Filter, View Switcher & Primary Action Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[260px]">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari No. Plan, Customer, Nopol Armada..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">Semua Status</option>
            <option value="PLANNED">PLANNED</option>
            <option value="READY_TO_SHIP">READY_TO_SHIP</option>
            <option value="CONVERTED_TO_DO">CONVERTED_TO_DO</option>
            <option value="COMPLETED">COMPLETED</option>
          </select>

          {/* View Mode Toggle: Ringkas vs Tabel Excel Lengkap */}
          <div className="inline-flex items-center p-1 rounded-lg bg-slate-100 border border-slate-200">
            <button
              type="button"
              onClick={() => setTableStyle('preview')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                tableStyle === 'preview'
                  ? 'bg-white text-blue-700 shadow-2xs ring-1 ring-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span>Ringkas</span>
            </button>
            <button
              type="button"
              onClick={() => setTableStyle('excel')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                tableStyle === 'excel'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Table2 className="w-3.5 h-3.5" />
              <span>Tabel Excel</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {tableStyle === 'excel' && (
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={excelRows.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-sm font-bold cursor-pointer disabled:opacity-40 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Export Excel (.csv)</span>
            </button>
          )}
          {canWrite && (
            <button
              type="button"
              onClick={openCreateSheet}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-xs cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Buat Delivery Plan Baru</span>
            </button>
          )}
        </div>
      </div>

      {/* Table Area */}
      {tableStyle === 'excel' ? (
        /* ── TRUE FULL-COLUMN EXCEL COMPARISON SPREADSHEET ── */
        <div className="bg-white rounded-xl border border-slate-300 border-t-4 border-t-emerald-600 overflow-hidden shadow-xs">
          <div className="px-4 py-2 bg-emerald-50/70 border-b border-slate-300 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-emerald-900">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Tampilan Tabel Excel Komprehensif — Seluruh Kolom &amp; Rincian Item</span>
            </div>
            <span className="text-slate-600">
              Klik baris mana saja untuk membuka Worksheet Detail • Geser horizontal untuk melihat seluruh kolom
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                {/* Excel Column Letters Row (A - R) */}
                <tr className="bg-slate-200/80 text-[10px] font-mono font-bold text-slate-500 text-center select-none">
                  <th className="border border-slate-300 px-2 py-1 sticky left-0 z-20 bg-slate-200 w-10">
                    #
                  </th>
                  {[
                    'A',
                    'B',
                    'C',
                    'D',
                    'E',
                    'F',
                    'G',
                    'H',
                    'I',
                    'J',
                    'K',
                    'L',
                    'M',
                    'N',
                    'O',
                    'P',
                    'Q',
                  ].map((col, i) => (
                    <th
                      key={col}
                      className={`border border-slate-300 px-2 py-1 ${
                        i === 0 ? 'sticky left-10 z-20 bg-slate-200' : ''
                      }`}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
                {/* Column Header Names */}
                <tr className="bg-slate-100 text-xs font-bold text-slate-700 uppercase">
                  <th className="border border-slate-300 px-2 py-2.5 text-center sticky left-0 z-20 bg-slate-100 w-10">
                    No
                  </th>
                  <th className="border border-slate-300 px-3 py-2.5 sticky left-10 z-20 bg-slate-100 min-w-[140px]">
                    No. Delivery Plan
                  </th>
                  <th className="border border-slate-300 px-3 py-2.5">Tanggal Kirim</th>
                  <th className="border border-slate-300 px-3 py-2.5 min-w-[200px]">Customer</th>
                  <th className="border border-slate-300 px-3 py-2.5">Zonasi / Area</th>
                  <th className="border border-slate-300 px-3 py-2.5 min-w-[220px]">Alamat Tujuan</th>
                  <th className="border border-slate-300 px-3 py-2.5">Ref. RDO</th>
                  <th className="border border-slate-300 px-3 py-2.5">Ref. IO</th>
                  <th className="border border-slate-300 px-3 py-2.5">Nopol Armada</th>
                  <th className="border border-slate-300 px-3 py-2.5">Nama Sopir</th>
                  <th className="border border-slate-300 px-3 py-2.5">Metode Kirim</th>
                  <th className="border border-slate-300 px-3 py-2.5">Est. Berangkat</th>
                  <th className="border border-slate-300 px-3 py-2.5 text-center">Prioritas</th>
                  <th className="border border-slate-300 px-3 py-2.5 text-center">Status</th>
                  <th className="border border-slate-300 px-3 py-2.5 min-w-[220px]">Item / Produk</th>
                  <th className="border border-slate-300 px-3 py-2.5 text-right">Qty Rencana</th>
                  <th className="border border-slate-300 px-3 py-2.5">No. LOT / Batch</th>
                  <th className="border border-slate-300 px-3 py-2.5 min-w-[180px]">Catatan</th>
                </tr>
              </thead>
              <tbody className="text-xs sm:text-sm">
                {isLoading ? (
                  <tr>
                    <td colSpan={18} className="border border-slate-300 py-12 text-center text-slate-400">
                      <Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Memuat Delivery Plan...
                    </td>
                  </tr>
                ) : excelRows.length === 0 ? (
                  <tr>
                    <td colSpan={18} className="border border-slate-300 py-12 text-center text-slate-400">
                      Belum ada data Delivery Plan.
                    </td>
                  </tr>
                ) : (
                  excelRows.map(({ plan: p, item: it, itemIdx }, rowIdx) => {
                    const isVoid = p.status === 'CANCELLED';
                    return (
                      <tr
                        key={`${p.id}-${itemIdx}`}
                        onClick={() => openDetailSheet(p)}
                        className={`hover:bg-emerald-50/50 cursor-pointer transition-colors ${
                          rowIdx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'
                        } ${isVoid ? 'opacity-60' : ''}`}
                      >
                        <td className="border border-slate-300 px-2 py-2 text-center font-mono text-xs text-slate-500 bg-slate-100/80 sticky left-0 z-10">
                          {rowIdx + 1}
                        </td>
                        <td className="border border-slate-300 px-3 py-2 font-mono font-bold text-blue-700 sticky left-10 z-10 bg-inherit">
                          {p.planNumber}
                        </td>
                        <td className="border border-slate-300 px-3 py-2 font-mono text-slate-700">
                          {p.planDate}
                        </td>
                        <td className="border border-slate-300 px-3 py-2 font-semibold text-slate-900">
                          {p.customerName || '-'}
                        </td>
                        <td className="border border-slate-300 px-3 py-2 text-slate-700">
                          {p.zoning || '-'}
                        </td>
                        <td className="border border-slate-300 px-3 py-2 text-slate-600 max-w-[260px] truncate" title={p.destinationAddress || ''}>
                          {p.destinationAddress || '-'}
                        </td>
                        <td className="border border-slate-300 px-3 py-2 font-mono text-slate-700">
                          {p.requestNumber || '-'}
                        </td>
                        <td className="border border-slate-300 px-3 py-2 font-mono text-slate-700">
                          {p.ioNumber || '-'}
                        </td>
                        <td className="border border-slate-300 px-3 py-2 font-mono font-semibold text-slate-800">
                          {p.vehicleNumber || '-'}
                        </td>
                        <td className="border border-slate-300 px-3 py-2 text-slate-700">
                          {p.driverName || '-'}
                        </td>
                        <td className="border border-slate-300 px-3 py-2 text-slate-700">
                          {p.shippingMethod || '-'}
                        </td>
                        <td className="border border-slate-300 px-3 py-2 text-slate-700">
                          {p.estimatedDepartureTime || '-'}
                        </td>
                        <td className="border border-slate-300 px-3 py-2 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                              p.priority === 'URGENT'
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {p.priority}
                          </span>
                        </td>
                        <td className="border border-slate-300 px-3 py-2 text-center">
                          {renderBadge(p.status)}
                        </td>
                        <td className="border border-slate-300 px-3 py-2 text-slate-900 font-medium">
                          {it ? it.itemName || it.itemId : <span className="text-slate-400">-</span>}
                        </td>
                        <td className="border border-slate-300 px-3 py-2 text-right font-mono font-bold text-slate-900">
                          {it ? Number(it.plannedQty || 0).toLocaleString('id-ID') : '-'}
                        </td>
                        <td className="border border-slate-300 px-3 py-2 font-mono text-slate-700">
                          {it?.lotNumber || '-'}
                        </td>
                        <td className="border border-slate-300 px-3 py-2 text-slate-600 max-w-[220px] truncate" title={it?.notes || p.notes || ''}>
                          {it?.notes || p.notes || '-'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {excelRows.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-100 font-bold text-xs sm:text-sm text-slate-900">
                    <td
                      colSpan={15}
                      className="border border-slate-300 px-3 py-2.5 text-right uppercase text-xs tracking-wide text-slate-600"
                    >
                      Total Halaman Ini ({list.length} Dokumen • {excelRows.length} Baris Item)
                    </td>
                    <td className="border border-slate-300 px-3 py-2.5 text-right font-mono text-emerald-700">
                      {totalExcelQty.toLocaleString('id-ID')}
                    </td>
                    <td colSpan={2} className="border border-slate-300 px-3 py-2.5" />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="px-4 py-3 border-t border-slate-300 bg-slate-50 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
            <span>
              Halaman <strong className="text-slate-900">{page}</strong> dari{' '}
              <strong className="text-slate-900">{totalPages}</strong> • Total{' '}
              <strong className="text-slate-900">{totalItems}</strong> Delivery Plan
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 font-semibold disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                Sebelumnya
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 font-semibold disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                Berikutnya
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ── PREVIEW TABLE (RINGKAS) ── */
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/90 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase tracking-wide">
                <th className="px-3 py-3 text-center w-12 border-r border-slate-200/70">No</th>
                <th className="px-3.5 py-3 border-r border-slate-200/70">No. Plan</th>
                <th className="px-3.5 py-3 border-r border-slate-200/70">Tanggal</th>
                <th className="px-3.5 py-3 border-r border-slate-200/70">Customer &amp; Zonasi</th>
                <th className="px-3.5 py-3 border-r border-slate-200/70">Armada &amp; Sopir</th>
                <th className="px-3.5 py-3 border-r border-slate-200/70">Metode &amp; Est.</th>
                <th className="px-3 py-3 text-center border-r border-slate-200/70">Item</th>
                <th className="px-3 py-3 text-center border-r border-slate-200/70">Prioritas</th>
                <th className="px-3 py-3 text-center border-r border-slate-200/70">Status</th>
                <th className="px-3.5 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Memuat Delivery Plan...
                  </td>
                </tr>
              ) : list.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    Belum ada data Delivery Plan.
                  </td>
                </tr>
              ) : (
                list.map((p, idx) => {
                  const isVoid = p.status === 'CANCELLED';
                  const rowNum = (page - 1) * 20 + idx + 1;
                  return (
                    <tr
                      key={p.id}
                      onClick={() => openDetailSheet(p)}
                      className={`hover:bg-blue-50/40 transition-colors cursor-pointer ${
                        isVoid ? 'opacity-60' : ''
                      }`}
                    >
                      <td className="px-3 py-3 text-center font-mono text-xs text-slate-400 bg-slate-50/50 border-r border-slate-100">
                        {rowNum}
                      </td>
                      <td className="px-3.5 py-3 whitespace-nowrap border-r border-slate-100">
                        <span className="font-mono font-bold text-blue-700 hover:underline">
                          {p.planNumber}
                        </span>
                      </td>
                      <td className="px-3.5 py-3 whitespace-nowrap font-mono text-slate-700 border-r border-slate-100">
                        {p.planDate}
                      </td>
                      <td className="px-3.5 py-3 border-r border-slate-100">
                        <div className="font-semibold text-slate-900">{p.customerName}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{p.zoning || '-'}</div>
                      </td>
                      <td className="px-3.5 py-3 border-r border-slate-100">
                        <div className="font-mono font-semibold text-slate-800">
                          {p.vehicleNumber || '-'}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">{p.driverName || '-'}</div>
                      </td>
                      <td className="px-3.5 py-3 border-r border-slate-100">
                        <div className="text-slate-800">{p.shippingMethod}</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {p.estimatedDepartureTime || '-'}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center border-r border-slate-100">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-bold">
                          {(p.items || []).length}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center border-r border-slate-100">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            p.priority === 'URGENT'
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {p.priority}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center border-r border-slate-100">
                        {renderBadge(p.status)}
                      </td>
                      <td
                        className="px-3.5 py-3 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openDetailSheet(p)}
                            title="Lihat Detail (Sheet)"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Detail</span>
                          </button>
                          {canWrite &&
                            p.status !== 'CONVERTED_TO_DO' &&
                            p.status !== 'COMPLETED' &&
                            !isVoid && (
                              <button
                                type="button"
                                onClick={() => onConvertToDo(p)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
                              >
                                <ArrowRight className="w-3.5 h-3.5" />
                                <span>Terbitkan DO</span>
                              </button>
                            )}
                          <button
                            type="button"
                            onClick={() =>
                              printLogisticsHtmlReport(`/logistics/delivery-plans/${p.id}/print`).catch(
                                (e) => toast.error(e?.message || 'Gagal mencetak Delivery Plan')
                              )
                            }
                            title="Cetak Delivery Plan"
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          {canWrite && !isVoid && (
                            <button
                              type="button"
                              onClick={() => openEditSheet(p)}
                              title="Edit Delivery Plan"
                              className="p-1.5 rounded-lg border border-slate-200 hover:bg-blue-50 text-blue-600 cursor-pointer"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}
                          {canWrite && !isVoid && (
                            <button
                              type="button"
                              onClick={() => setVoidTarget(p)}
                              title="Batalkan Delivery Plan"
                              className="p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 text-rose-600 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
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

        {/* Pagination Footer */}
        <div className="px-4 py-3 border-t border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
          <span>
            Halaman <strong className="text-slate-900">{page}</strong> dari{' '}
            <strong className="text-slate-900">{totalPages}</strong> • Total{' '}
            <strong className="text-slate-900">{totalItems}</strong> Delivery Plan
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 font-semibold disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              Sebelumnya
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 font-semibold disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              Berikutnya
            </button>
          </div>
        </div>
      </div>
      )}

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
