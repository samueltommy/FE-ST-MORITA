import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Search,
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
  Eye,
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
import type {
  DeliveryOrderRecord,
  DeliveryOrderItem,
  DeliveryPlan,
} from '../../types/logisticsRmStock';
import { ConfirmActionModal } from '../core1_hrd/ConfirmActionModal';
import { useRBAC } from '../../hooks/useRBAC';
import {
  EXCEL_CELL,
  ExcelColumn,
  ExcelSpreadsheetTable,
  ExcelViewToggle,
  ExcelWorksheetShell,
  TableViewStyle,
  exportExcelCsv,
} from '../../components/shared/ExcelDataKit';

interface Props {
  prefillPlan?: DeliveryPlan | null;
  onClearPrefill?: () => void;
}

type ViewMode = 'list' | 'detail' | 'create' | 'edit';

const todayStr = () => new Date().toISOString().split('T')[0];

const emptyItem = (): DeliveryOrderItem => ({
  itemId: '',
  stockInventoryId: '',
  qtyShipped: 1,
  lotNumber: '',
  notes: '',
});

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
  items: [emptyItem()],
});

const SHIPPING_METHOD_LABELS: Record<string, string> = {
  OWN_VEHICLE: 'Armada Sendiri (OWN_VEHICLE)',
  CUSTOMER_PICKUP: 'Ambil Sendiri (CUSTOMER_PICKUP)',
  THIRD_PARTY_FORWARDER: 'Ekspedisi / Forwarder (3PL)',
};

interface DoExcelRow {
  record: DeliveryOrderRecord;
  itemCode: string;
  itemName: string;
  lotNumber: string;
  qtyShipped: number;
  itemNotes: string;
  itemIdx: number;
}

export const DeliveryOrdersTab: React.FC<Props> = ({ prefillPlan, onClearPrefill }) => {
  const queryClient = useQueryClient();
  const { isSuperAdmin, isExecutive, userDivision } = useRBAC();
  const canWrite =
    isSuperAdmin || isExecutive || userDivision === 'DELIVERY' || userDivision === 'WAREHOUSE_PPIC';

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [tableStyle, setTableStyle] = useState<TableViewStyle>('preview');

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedDo, setSelectedDo] = useState<DeliveryOrderRecord | null>(null);
  const [draft, setDraft] = useState<DeliveryOrderPayload>(emptyDraft);

  // Status Update + POD state (used in Detail Worksheet)
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
      setSelectedDo(null);
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
        items:
          prefillPlan.items && prefillPlan.items.length > 0
            ? prefillPlan.items.map((it) => ({
                itemId: it.itemId,
                stockInventoryId: '',
                qtyShipped: it.plannedQty,
                lotNumber: it.lotNumber || '',
                notes: it.notes || '',
              }))
            : [emptyItem()],
      });
      setViewMode('create');
      onClearPrefill?.();
    }
  }, [prefillPlan, canWrite, onClearPrefill]);

  const { data: res, isLoading } = useQuery({
    queryKey: ['logisticsDeliveryOrders', page, search, statusFilter],
    queryFn: () =>
      listDeliveryOrdersApi({
        page,
        limit: 20,
        search: search || undefined,
        status: statusFilter,
      }),
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
  const { data: availableStocks = [] } = useQuery({
    queryKey: ['availableStocksForSpk'],
    queryFn: listAvailableStocksForSpkApi,
  });
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

  const doToDraft = (d: DeliveryOrderRecord): DeliveryOrderPayload => ({
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
    items: d.items && d.items.length > 0 ? d.items.map((it) => ({ ...it })) : [emptyItem()],
  });

  const initStatusDraft = (d: DeliveryOrderRecord) => {
    setStatusDraft({
      status: d.status === 'PREPARING_LOADING' ? 'ON_THE_WAY' : 'DELIVERED_RECEIVED',
      location: '',
      recipientName: d.recipientName || '',
      gpsLatitude: null,
      gpsLongitude: null,
      podFileUrl: d.podFileUrl || '',
      notes: '',
    });
  };

  const openCreateSheet = () => {
    setSelectedDo(null);
    setDraft(emptyDraft());
    setViewMode('create');
  };

  const openDetailSheet = (d: DeliveryOrderRecord) => {
    setSelectedDo(d);
    setDraft(doToDraft(d));
    initStatusDraft(d);
    setViewMode('detail');
  };

  const openEditSheet = (d: DeliveryOrderRecord) => {
    setSelectedDo(d);
    setDraft(doToDraft(d));
    setViewMode('edit');
  };

  const backToList = () => {
    setViewMode('list');
    setSelectedDo(null);
  };

  const createMut = useMutation({
    mutationFn: (p: DeliveryOrderPayload) => createDeliveryOrderApi(p),
    onSuccess: () => {
      toast.success('Surat Jalan (DO) terbit! Stok FG terpotong otomatis.');
      invalidateAll();
      backToList();
    },
    onError: (e: any) => handleErr(e, 'Gagal menerbitkan Surat Jalan (DO)'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, p }: { id: string; p: Partial<DeliveryOrderPayload> }) =>
      updateDeliveryOrderApi(id, p),
    onSuccess: () => {
      toast.success('Surat Jalan (DO) berhasil diperbarui');
      invalidateAll();
      backToList();
    },
    onError: (e: any) => handleErr(e, 'Gagal memperbarui DO'),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, p }: { id: string; p: DeliveryOrderStatusPayload }) =>
      updateDeliveryOrderStatusApi(id, p),
    onSuccess: () => {
      toast.success('Status pengiriman DO diperbarui & otomatis tercatat di E-Tracking (5.4)!');
      invalidateAll();
      backToList();
    },
    onError: (e: any) => handleErr(e, 'Gagal memperbarui status DO'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteDeliveryOrderApi(id),
    onSuccess: () => {
      toast.success('DO dibatalkan — Stok FG yang terpotong telah dikembalikan otomatis.');
      setVoidTarget(null);
      invalidateAll();
      if (viewMode !== 'list') backToList();
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
      items: draft.items.filter((it) => it.itemId && Number(it.qtyShipped) > 0),
    };
    if (viewMode === 'edit' && selectedDo) {
      updateMut.mutate({ id: selectedDo.id, p: payload });
    } else {
      createMut.mutate(payload);
    }
  };

  const renderStatusBadge = (status: string) => {
    const s = (status || '').toUpperCase();
    if (s === 'DELIVERED_RECEIVED') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
          DELIVERED
        </span>
      );
    }
    if (s === 'ON_THE_WAY') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-bold">
          ON_THE_WAY
        </span>
      );
    }
    if (s === 'DELIVERY_FAILED_RETURNED') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 text-xs font-bold">
          FAILED / RETURN
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
        PREPARING
      </span>
    );
  };

  const resolveItemLabel = (it: DeliveryOrderItem) => {
    if (it.itemName) return `${it.itemCode ? `[${it.itemCode}] ` : ''}${it.itemName}`;
    const found = mdmItems.find((m) => m.id === it.itemId);
    return found ? `${found.code ? `[${found.code}] ` : ''}${found.name}` : it.itemId || '-';
  };

  // Flattened rows for Excel Table Mode
  const excelRows = useMemo<DoExcelRow[]>(() => {
    const rows: DoExcelRow[] = [];
    for (const d of list) {
      if (!d.items || d.items.length === 0) {
        rows.push({
          record: d,
          itemCode: '-',
          itemName: '-',
          lotNumber: '-',
          qtyShipped: 0,
          itemNotes: '-',
          itemIdx: 0,
        });
      } else {
        d.items.forEach((it, idx) => {
          const found = mdmItems.find((m) => m.id === it.itemId);
          rows.push({
            record: d,
            itemCode: it.itemCode || found?.code || '-',
            itemName: it.itemName || found?.name || it.itemId || '-',
            lotNumber: it.lotNumber || '-',
            qtyShipped: Number(it.qtyShipped) || 0,
            itemNotes: it.notes || '-',
            itemIdx: idx,
          });
        });
      }
    }
    return rows;
  }, [list, mdmItems]);

  const totalExcelQty = useMemo(
    () => excelRows.reduce((acc, r) => acc + r.qtyShipped, 0),
    [excelRows]
  );

  const excelColumns: ExcelColumn<DoExcelRow>[] = useMemo(
    () => [
      {
        key: 'doNumber',
        header: 'No. DO',
        mono: true,
        minWidth: 'min-w-[140px]',
        getValue: (r) => r.record.doNumber,
      },
      {
        key: 'doDate',
        header: 'Tanggal DO',
        mono: true,
        getValue: (r) => r.record.doDate || '-',
      },
      {
        key: 'customerName',
        header: 'Customer',
        minWidth: 'min-w-[180px]',
        getValue: (r) => r.record.customerName || '-',
      },
      {
        key: 'planNumber',
        header: 'Ref. Plan',
        mono: true,
        getValue: (r) => r.record.planNumber || '-',
      },
      {
        key: 'requestNumber',
        header: 'Ref. RDO',
        mono: true,
        getValue: (r) => r.record.requestNumber || '-',
      },
      {
        key: 'ioNumber',
        header: 'Ref. IO',
        mono: true,
        getValue: (r) => r.record.ioNumber || '-',
      },
      {
        key: 'shippingMethod',
        header: 'Metode Kirim',
        getValue: (r) => r.record.shippingMethod || 'OWN_VEHICLE',
      },
      {
        key: 'vehicleNumber',
        header: 'Nopol Armada',
        mono: true,
        getValue: (r) => r.record.vehicleNumber || '-',
      },
      {
        key: 'driverName',
        header: 'Nama Sopir',
        getValue: (r) => r.record.driverName || '-',
      },
      {
        key: 'customsDocType',
        header: 'Jenis Dok. BC',
        mono: true,
        getValue: (r) =>
          r.record.customsDocType && r.record.customsDocType !== 'NONE'
            ? r.record.customsDocType
            : 'Non-BC',
      },
      {
        key: 'customsDocNumber',
        header: 'No. Dok. BC',
        mono: true,
        getValue: (r) => r.record.customsDocNumber || '-',
      },
      {
        key: 'coaNumber',
        header: 'No. COA',
        mono: true,
        getValue: (r) => r.record.coaNumber || '-',
      },
      {
        key: 'itemCode',
        header: 'Kode Item',
        mono: true,
        getValue: (r) => r.itemCode,
      },
      {
        key: 'itemName',
        header: 'Nama Item / Produk',
        minWidth: 'min-w-[200px]',
        getValue: (r) => r.itemName,
      },
      {
        key: 'lotNumber',
        header: 'No. LOT / Batch',
        mono: true,
        getValue: (r) => r.lotNumber,
      },
      {
        key: 'qtyShipped',
        header: 'Qty Kirim',
        align: 'right',
        mono: true,
        getValue: (r) => r.qtyShipped,
        render: (r) => (
          <span className="font-bold text-slate-900">{r.qtyShipped.toLocaleString('id-ID')}</span>
        ),
        footer: <span className="text-emerald-800">{totalExcelQty.toLocaleString('id-ID')}</span>,
      },
      {
        key: 'deliverTo',
        header: 'Alamat Kirim',
        minWidth: 'min-w-[200px]',
        getValue: (r) => r.record.deliverTo || '-',
      },
      {
        key: 'recipientName',
        header: 'Penerima (UP)',
        getValue: (r) => r.record.recipientName || '-',
      },
      {
        key: 'recipientPhone',
        header: 'Telp Penerima',
        mono: true,
        getValue: (r) => r.record.recipientPhone || '-',
      },
      {
        key: 'status',
        header: 'Status Pengiriman',
        align: 'center',
        getValue: (r) => r.record.status || 'PREPARING_LOADING',
        render: (r) => renderStatusBadge(r.record.status),
      },
      {
        key: 'deliveredAt',
        header: 'Waktu Diterima',
        mono: true,
        getValue: (r) =>
          r.record.deliveredAt
            ? String(r.record.deliveredAt).slice(0, 16).replace('T', ' ')
            : '-',
      },
      {
        key: 'podFileUrl',
        header: 'POD',
        align: 'center',
        getValue: (r) => resolveLogisticsFileUrl(r.record.podFileUrl) || '-',
        render: (r) => {
          const href = resolveLogisticsFileUrl(r.record.podFileUrl);
          return href ? (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline"
            >
              <ExternalLink className="w-3 h-3" /> POD
            </a>
          ) : (
            <span className="text-slate-400">-</span>
          );
        },
      },
      {
        key: 'issuedBy',
        header: 'Penerbit',
        getValue: (r) => r.record.issuedBy || '-',
      },
      {
        key: 'notes',
        header: 'Catatan DO',
        minWidth: 'min-w-[160px]',
        getValue: (r) => r.record.notes || '-',
      },
    ],
    [totalExcelQty]
  );

  const handleExportCsv = () => {
    exportExcelCsv('delivery-order-surat-jalan', excelColumns, excelRows);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // FULL-PAGE EXCEL WORKSHEET (DETAIL / CREATE / EDIT)
  // ═══════════════════════════════════════════════════════════════════════════
  if (viewMode !== 'list') {
    const isReadOnly = viewMode === 'detail';
    const displayItems = isReadOnly ? selectedDo?.items || [] : draft.items;
    const totalQty = displayItems.reduce((acc, it) => acc + (Number(it.qtyShipped) || 0), 0);
    const podHref = selectedDo ? resolveLogisticsFileUrl(selectedDo.podFileUrl) : null;

    const resolveCustomerName = () => {
      if (isReadOnly) return selectedDo?.customerName || '-';
      return customers.find((c) => c.id === draft.customerId)?.name || '-';
    };

    const sheetActions =
      isReadOnly && selectedDo ? (
        <>
          <button
            type="button"
            onClick={() =>
              printLogisticsHtmlReport(`/logistics/delivery-orders/${selectedDo.id}/print`).catch(
                (e) => toast.error(e?.message || 'Gagal mencetak Surat Jalan')
              )
            }
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-bold cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Surat Jalan</span>
          </button>
          {canWrite && selectedDo.status === 'PREPARING_LOADING' && (
            <button
              type="button"
              onClick={() => openEditSheet(selectedDo)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold cursor-pointer"
            >
              <Pencil className="w-4 h-4" />
              <span>Edit DO</span>
            </button>
          )}
          {canWrite && (
            <button
              type="button"
              onClick={() => setVoidTarget(selectedDo)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-sm font-bold cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Batalkan DO</span>
            </button>
          )}
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={() => (selectedDo ? setViewMode('detail') : backToList())}
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
            <span>Simpan Surat Jalan (DO)</span>
          </button>
        </>
      );

    return (
      <>
        <ExcelWorksheetShell
          onBack={backToList}
          docTitle={
            viewMode === 'create'
              ? 'DOKUMEN BARU (AUTO-DO)'
              : selectedDo?.doNumber || 'Delivery Order'
          }
          badge={
            viewMode === 'create' ? (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                MODE TERBIT DO BARU
              </span>
            ) : viewMode === 'edit' ? (
              <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-bold">
                MODE EDIT
              </span>
            ) : (
              renderStatusBadge(selectedDo?.status || 'PREPARING_LOADING')
            )
          }
          formCode="FORMULIR LOGISTIK 5.3.3"
          sheetTitle="SURAT JALAN / DELIVERY ORDER (DO WORKSHEET)"
          modeHint={
            isReadOnly
              ? 'Sheet View (Read-Only)'
              : 'Anti-HOLD Validation Aktif — Hanya batch FG berstatus AVAILABLE yang dapat dikirim'
          }
          actions={sheetActions}
        >
          {/* Section 1: Header Key-Value Excel Grid */}
          <div>
            <div className="text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-2 flex items-center gap-2">
              <span className="w-5 h-5 rounded bg-emerald-600 text-white inline-flex items-center justify-center text-[11px] font-bold">
                1
              </span>
              <span>Informasi Surat Jalan, Armada &amp; Dokumen Kepabeanan / COA</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse table-fixed min-w-[780px]">
                <tbody>
                  <tr>
                    <th className={`${EXCEL_CELL.label} w-[18%]`}>No. Surat Jalan (DO)</th>
                    <td className={`${EXCEL_CELL.value} w-[32%]`}>
                      <div className="px-3 py-2.5 font-mono font-bold text-slate-800 bg-slate-50/70">
                        {viewMode === 'create'
                          ? 'AUTO-GENERATED (DO/YYYYMM/NNN)'
                          : selectedDo?.doNumber || '-'}
                      </div>
                    </td>
                    <th className={`${EXCEL_CELL.label} w-[18%]`}>Tanggal DO *</th>
                    <td className={`${EXCEL_CELL.value} w-[32%]`}>
                      {isReadOnly ? (
                        <div className="px-3 py-2.5 font-mono font-semibold">
                          {selectedDo?.doDate || '-'}
                        </div>
                      ) : (
                        <input
                          type="date"
                          value={draft.doDate}
                          onChange={(e) => setDraft({ ...draft, doDate: e.target.value })}
                          className={EXCEL_CELL.input}
                        />
                      )}
                    </td>
                  </tr>

                  <tr>
                    <th className={EXCEL_CELL.label}>Customer *</th>
                    <td className={EXCEL_CELL.value}>
                      {isReadOnly ? (
                        <div className="px-3 py-2.5 font-semibold">{resolveCustomerName()}</div>
                      ) : (
                        <select
                          value={draft.customerId || ''}
                          onChange={(e) => setDraft({ ...draft, customerId: e.target.value })}
                          className={EXCEL_CELL.input}
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
                    <th className={EXCEL_CELL.label}>Metode Pengiriman</th>
                    <td className={EXCEL_CELL.value}>
                      {isReadOnly ? (
                        <div className={EXCEL_CELL.readValue}>
                          {SHIPPING_METHOD_LABELS[selectedDo?.shippingMethod || ''] ||
                            selectedDo?.shippingMethod ||
                            '-'}
                        </div>
                      ) : (
                        <select
                          value={draft.shippingMethod || 'OWN_VEHICLE'}
                          onChange={(e) => setDraft({ ...draft, shippingMethod: e.target.value })}
                          className={EXCEL_CELL.input}
                        >
                          <option value="OWN_VEHICLE">Armada Sendiri (OWN_VEHICLE)</option>
                          <option value="CUSTOMER_PICKUP">Ambil Sendiri (CUSTOMER_PICKUP)</option>
                          <option value="THIRD_PARTY_FORWARDER">
                            Ekspedisi / Forwarder (THIRD_PARTY_FORWARDER)
                          </option>
                        </select>
                      )}
                    </td>
                  </tr>

                  <tr>
                    <th className={EXCEL_CELL.label}>Nopol Armada</th>
                    <td className={EXCEL_CELL.value}>
                      {isReadOnly ? (
                        <div className="px-3 py-2.5 font-mono font-semibold">
                          {selectedDo?.vehicleNumber || '-'}
                        </div>
                      ) : (
                        <input
                          type="text"
                          placeholder="Contoh: B 9482 MOR"
                          value={draft.vehicleNumber || ''}
                          onChange={(e) => setDraft({ ...draft, vehicleNumber: e.target.value })}
                          className={`${EXCEL_CELL.input} font-mono`}
                        />
                      )}
                    </td>
                    <th className={EXCEL_CELL.label}>Nama Sopir</th>
                    <td className={EXCEL_CELL.value}>
                      {isReadOnly ? (
                        <div className={EXCEL_CELL.readValue}>{selectedDo?.driverName || '-'}</div>
                      ) : (
                        <input
                          type="text"
                          placeholder="Nama lengkap sopir"
                          value={draft.driverName || ''}
                          onChange={(e) => setDraft({ ...draft, driverName: e.target.value })}
                          className={EXCEL_CELL.input}
                        />
                      )}
                    </td>
                  </tr>

                  <tr>
                    <th className={EXCEL_CELL.label}>Jenis Dok. BC</th>
                    <td className={EXCEL_CELL.value}>
                      {isReadOnly ? (
                        <div className="px-3 py-2.5 font-mono">
                          {selectedDo?.customsDocType && selectedDo.customsDocType !== 'NONE'
                            ? selectedDo.customsDocType
                            : 'Non-BC'}
                        </div>
                      ) : (
                        <select
                          value={draft.customsDocType || 'NONE'}
                          onChange={(e) => setDraft({ ...draft, customsDocType: e.target.value })}
                          className={EXCEL_CELL.input}
                        >
                          <option value="NONE">Non-BC</option>
                          <option value="BC_4.0">BC 4.0</option>
                          <option value="BC_2.7">BC 2.7</option>
                          <option value="BC_2.3">BC 2.3</option>
                        </select>
                      )}
                    </td>
                    <th className={EXCEL_CELL.label}>No. Dok. BC</th>
                    <td className={EXCEL_CELL.value}>
                      {isReadOnly ? (
                        <div className="px-3 py-2.5 font-mono">
                          {selectedDo?.customsDocNumber || '-'}
                        </div>
                      ) : (
                        <input
                          type="text"
                          placeholder="Nomor dokumen kepabeanan (opsional)"
                          value={draft.customsDocNumber || ''}
                          onChange={(e) => setDraft({ ...draft, customsDocNumber: e.target.value })}
                          className={`${EXCEL_CELL.input} font-mono`}
                        />
                      )}
                    </td>
                  </tr>

                  <tr>
                    <th className={EXCEL_CELL.label}>Ref. OQC (PASSED)</th>
                    <td className={EXCEL_CELL.value}>
                      {isReadOnly ? (
                        <div className="px-3 py-2.5 font-mono">
                          {selectedDo?.oqcInspectionId || '-'}
                        </div>
                      ) : (
                        <select
                          value={draft.oqcInspectionId || ''}
                          onChange={(e) => {
                            const oqc = passedOqc.find((x) => x.id === e.target.value);
                            setDraft({
                              ...draft,
                              oqcInspectionId: e.target.value,
                              coaNumber: oqc?.coaNumber || draft.coaNumber,
                            });
                          }}
                          className={EXCEL_CELL.input}
                        >
                          <option value="">-- Opsional OQC/COA --</option>
                          {passedOqc.map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.coaNumber || o.inspectionNumber} ({o.lotNumber})
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <th className={EXCEL_CELL.label}>No. COA</th>
                    <td className={EXCEL_CELL.value}>
                      {isReadOnly ? (
                        <div className="px-3 py-2.5 font-mono font-bold text-emerald-700">
                          {selectedDo?.coaNumber || '-'}
                        </div>
                      ) : (
                        <input
                          type="text"
                          placeholder="Nomor Certificate of Analysis (opsional)"
                          value={draft.coaNumber || ''}
                          onChange={(e) => setDraft({ ...draft, coaNumber: e.target.value })}
                          className={`${EXCEL_CELL.input} font-mono`}
                        />
                      )}
                    </td>
                  </tr>

                  <tr>
                    <th className={EXCEL_CELL.label}>Nama Penerima (UP)</th>
                    <td className={EXCEL_CELL.value}>
                      {isReadOnly ? (
                        <div className={EXCEL_CELL.readValue}>
                          {selectedDo?.recipientName || '-'}
                        </div>
                      ) : (
                        <input
                          type="text"
                          placeholder="Nama PIC penerima di lokasi customer"
                          value={draft.recipientName || ''}
                          onChange={(e) => setDraft({ ...draft, recipientName: e.target.value })}
                          className={EXCEL_CELL.input}
                        />
                      )}
                    </td>
                    <th className={EXCEL_CELL.label}>Telp Penerima</th>
                    <td className={EXCEL_CELL.value}>
                      {isReadOnly ? (
                        <div className="px-3 py-2.5 font-mono">
                          {selectedDo?.recipientPhone || '-'}
                        </div>
                      ) : (
                        <input
                          type="text"
                          placeholder="Nomor telepon / HP penerima"
                          value={draft.recipientPhone || ''}
                          onChange={(e) => setDraft({ ...draft, recipientPhone: e.target.value })}
                          className={`${EXCEL_CELL.input} font-mono`}
                        />
                      )}
                    </td>
                  </tr>

                  {isReadOnly && (
                    <tr>
                      <th className={EXCEL_CELL.label}>Ref. Plan / RDO / IO</th>
                      <td className={EXCEL_CELL.value}>
                        <div className="px-3 py-2.5 font-mono text-xs text-slate-700">
                          Plan: {selectedDo?.planNumber || '-'} • RDO:{' '}
                          {selectedDo?.requestNumber || '-'} • IO: {selectedDo?.ioNumber || '-'}
                        </div>
                      </td>
                      <th className={EXCEL_CELL.label}>Bukti POD &amp; Diterima</th>
                      <td className={EXCEL_CELL.value}>
                        <div className="px-3 py-2.5 flex items-center gap-3 text-sm">
                          {podHref ? (
                            <a
                              href={podHref}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 font-bold text-blue-600 hover:underline"
                            >
                              <ExternalLink className="w-3.5 h-3.5" /> Lihat Foto POD
                            </a>
                          ) : (
                            <span className="text-slate-400">Belum ada POD</span>
                          )}
                          {selectedDo?.deliveredAt && (
                            <span className="font-mono text-xs text-slate-500">
                              ({String(selectedDo.deliveredAt).slice(0, 16).replace('T', ' ')})
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}

                  <tr>
                    <th className={EXCEL_CELL.label}>Alamat Kirim (Deliver To)</th>
                    <td colSpan={3} className={EXCEL_CELL.value}>
                      {isReadOnly ? (
                        <div className={EXCEL_CELL.readValue}>{selectedDo?.deliverTo || '-'}</div>
                      ) : (
                        <input
                          type="text"
                          placeholder="Alamat tujuan pengiriman lengkap..."
                          value={draft.deliverTo || ''}
                          onChange={(e) => setDraft({ ...draft, deliverTo: e.target.value })}
                          className={EXCEL_CELL.input}
                        />
                      )}
                    </td>
                  </tr>

                  <tr>
                    <th className={EXCEL_CELL.label}>Catatan Surat Jalan</th>
                    <td colSpan={3} className={EXCEL_CELL.value}>
                      {isReadOnly ? (
                        <div className={EXCEL_CELL.readValue}>{selectedDo?.notes || '-'}</div>
                      ) : (
                        <input
                          type="text"
                          placeholder="Catatan surat jalan / instruksi bongkar..."
                          value={draft.notes || ''}
                          onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                          className={EXCEL_CELL.input}
                        />
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Items Grid + Anti-HOLD FG Batch Picker */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-emerald-600 text-white inline-flex items-center justify-center text-[11px] font-bold">
                  2
                </span>
                <span>
                  Item Surat Jalan &amp; Batch FG ({displayItems.length} Baris — Anti-HOLD)
                </span>
              </div>
              {!isReadOnly && (
                <button
                  type="button"
                  onClick={() => setDraft({ ...draft, items: [...draft.items, emptyItem()] })}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Baris Item DO</span>
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[820px]">
                <thead>
                  <tr className="bg-slate-100 text-xs font-bold text-slate-700 uppercase">
                    <th className="border border-slate-300 px-2 py-2.5 text-center w-12">No</th>
                    {!isReadOnly && (
                      <th className="border border-slate-300 px-3 py-2.5 text-left min-w-[260px]">
                        Batch FG (AVAILABLE — Anti-HOLD)
                      </th>
                    )}
                    <th className="border border-slate-300 px-3 py-2.5 text-left min-w-[220px]">
                      Item / Produk *
                    </th>
                    <th className="border border-slate-300 px-3 py-2.5 text-left w-40">
                      No. LOT / Batch
                    </th>
                    <th className="border border-slate-300 px-3 py-2.5 text-right w-32">
                      Qty Kirim *
                    </th>
                    <th className="border border-slate-300 px-3 py-2.5 text-left min-w-[160px]">
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
                        colSpan={isReadOnly ? 5 : 7}
                        className="border border-slate-300 py-8 text-center text-sm text-slate-400"
                      >
                        Belum ada item pada Surat Jalan ini.
                      </td>
                    </tr>
                  ) : (
                    displayItems.map((it, idx) => (
                      <tr key={idx} className="hover:bg-blue-50/20">
                        <td className="border border-slate-300 px-2 py-2 text-center font-mono text-xs font-bold text-slate-500 bg-slate-50/70">
                          {idx + 1}
                        </td>
                        {!isReadOnly && (
                          <td className="border border-slate-300 p-0">
                            <select
                              value={it.stockInventoryId || ''}
                              onChange={(e) => {
                                const st = availableStocks.find((s) => s.id === e.target.value);
                                setDraft({
                                  ...draft,
                                  items: draft.items.map((x, i) =>
                                    i === idx
                                      ? {
                                          ...x,
                                          stockInventoryId: e.target.value,
                                          itemId: st?.itemId || x.itemId,
                                          lotNumber: st?.lotNumber || x.lotNumber,
                                        }
                                      : x
                                  ),
                                });
                              }}
                              className={EXCEL_CELL.input}
                            >
                              <option value="">-- Pilih Batch FG (AVAILABLE) --</option>
                              {availableStocks.map((st) => (
                                <option key={st.id} value={st.id}>
                                  [{st.lotNumber}] {st.itemName} — Stok: {st.qty} {st.unit || ''}
                                </option>
                              ))}
                            </select>
                          </td>
                        )}
                        <td className="border border-slate-300 p-0">
                          {isReadOnly ? (
                            <div className="px-3 py-2.5 text-sm font-medium text-slate-900">
                              {resolveItemLabel(it)}
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
                              className={EXCEL_CELL.input}
                            >
                              <option value="">-- Pilih Item --</option>
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
                            <div className="px-3 py-2.5 font-mono text-sm text-slate-800">
                              {it.lotNumber || '-'}
                            </div>
                          ) : (
                            <input
                              type="text"
                              placeholder="No. LOT"
                              value={it.lotNumber || ''}
                              onChange={(e) =>
                                setDraft({
                                  ...draft,
                                  items: draft.items.map((x, i) =>
                                    i === idx ? { ...x, lotNumber: e.target.value } : x
                                  ),
                                })
                              }
                              className={`${EXCEL_CELL.input} font-mono`}
                            />
                          )}
                        </td>
                        <td className="border border-slate-300 p-0">
                          {isReadOnly ? (
                            <div className="px-3 py-2.5 text-right font-mono font-bold text-slate-900 text-sm">
                              {Number(it.qtyShipped).toLocaleString('id-ID')}
                            </div>
                          ) : (
                            <input
                              type="number"
                              min={1}
                              value={it.qtyShipped}
                              onChange={(e) =>
                                setDraft({
                                  ...draft,
                                  items: draft.items.map((x, i) =>
                                    i === idx ? { ...x, qtyShipped: Number(e.target.value) } : x
                                  ),
                                })
                              }
                              className={`${EXCEL_CELL.input} font-mono text-right font-bold`}
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
                              className={EXCEL_CELL.input}
                            />
                          )}
                        </td>
                        {!isReadOnly && (
                          <td className="border border-slate-300 px-2 py-2 text-center">
                            <button
                              type="button"
                              onClick={() =>
                                setDraft({
                                  ...draft,
                                  items: draft.items.filter((_, i) => i !== idx),
                                })
                              }
                              className="p-1.5 rounded hover:bg-rose-50 text-rose-600 cursor-pointer"
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
                      colSpan={isReadOnly ? 3 : 4}
                      className="border border-slate-300 px-3 py-2.5 text-right uppercase text-xs text-slate-600"
                    >
                      Total Qty Dikirim
                    </td>
                    <td className="border border-slate-300 px-3 py-2.5 text-right font-mono text-emerald-800">
                      {totalQty.toLocaleString('id-ID')}
                    </td>
                    <td colSpan={isReadOnly ? 1 : 2} className="border border-slate-300" />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Section 3: Update Status Pengiriman & Upload POD (Detail View) */}
          {isReadOnly && selectedDo && canWrite && (
            <div className="bg-blue-50/60 rounded-xl border border-blue-200 p-4 space-y-3">
              <div className="text-xs font-extrabold uppercase tracking-wider text-blue-900 flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-blue-600 text-white inline-flex items-center justify-center text-[11px] font-bold">
                  3
                </span>
                <span>Update Status Pengiriman &amp; Upload POD ({selectedDo.doNumber})</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 items-end">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Status Baru
                  </label>
                  <select
                    value={statusDraft.status}
                    onChange={(e) =>
                      setStatusDraft({
                        ...statusDraft,
                        status: e.target.value as DeliveryOrderStatusPayload['status'],
                      })
                    }
                    className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-sm font-bold"
                  >
                    <option value="ON_THE_WAY">ON_THE_WAY</option>
                    <option value="DELIVERED_RECEIVED">DELIVERED_RECEIVED</option>
                    <option value="DELIVERY_FAILED_RETURNED">DELIVERY_FAILED_RETURNED</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Lokasi / Checkpoint
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Gerbang KIIC / Gudang Customer"
                    value={statusDraft.location || ''}
                    onChange={(e) => setStatusDraft({ ...statusDraft, location: e.target.value })}
                    className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Nama Penerima
                  </label>
                  <input
                    type="text"
                    placeholder="Nama PIC penerima"
                    value={statusDraft.recipientName || ''}
                    onChange={(e) =>
                      setStatusDraft({ ...statusDraft, recipientName: e.target.value })
                    }
                    className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Catatan</label>
                  <input
                    type="text"
                    placeholder="Catatan pengiriman..."
                    value={statusDraft.notes || ''}
                    onChange={(e) => setStatusDraft({ ...statusDraft, notes: e.target.value })}
                    className="w-full px-2.5 py-2 rounded-lg border border-slate-300 bg-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Bukti Foto POD
                  </label>
                  <label className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold cursor-pointer">
                    {uploadingPod ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )}
                    <span>{statusDraft.podFileUrl ? 'Ganti POD' : 'Upload POD'}</span>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*,.pdf"
                      onChange={(e) => e.target.files?.[0] && handleUploadPod(e.target.files[0])}
                    />
                  </label>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => statusMut.mutate({ id: selectedDo.id, p: statusDraft })}
                    disabled={statusMut.isPending || uploadingPod}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold cursor-pointer disabled:opacity-50"
                  >
                    <Truck className="w-4 h-4" />
                    <span>Simpan Status</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <Info className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  Setiap perubahan status DO otomatis tercatat di <strong>E-Tracking (5.4)</strong>.
                </span>
              </div>
            </div>
          )}
        </ExcelWorksheetShell>

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
      </>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LIST VIEW (RINGKAS PREVIEW & TABEL EXCEL)
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari No. DO / Customer / COA / BC..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
          >
            <option value="ALL">Semua Status</option>
            <option value="PREPARING_LOADING">PREPARING_LOADING</option>
            <option value="ON_THE_WAY">ON_THE_WAY</option>
            <option value="DELIVERED_RECEIVED">DELIVERED_RECEIVED</option>
            <option value="DELIVERY_FAILED_RETURNED">DELIVERY_FAILED_RETURNED</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ExcelViewToggle
            value={tableStyle}
            onChange={setTableStyle}
            onExport={handleExportCsv}
            exportDisabled={excelRows.length === 0}
          />
          {canWrite && (
            <button
              type="button"
              onClick={openCreateSheet}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Terbitkan DO (5.3.3)</span>
            </button>
          )}
        </div>
      </div>

      {tableStyle === 'excel' ? (
        <ExcelSpreadsheetTable
          title={`Tabel Excel Delivery Order / Surat Jalan — ${excelRows.length} Baris Item`}
          columns={excelColumns}
          rows={excelRows}
          rowKey={(row) => `${row.record.id}-${row.itemIdx}`}
          isLoading={isLoading}
          emptyText="Belum ada Surat Jalan (DO)."
          onRowClick={(row) => openDetailSheet(row.record)}
          footerLabel="TOTAL QTY"
          pagination={{
            page,
            totalPages,
            totalItems,
            unitLabel: 'DO',
            onPrev: () => setPage((p) => Math.max(1, p - 1)),
            onNext: () => setPage((p) => p + 1),
          }}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-xs font-bold text-slate-600 uppercase">
                  <th className="border-b border-r border-slate-200 px-3.5 py-3">No. DO &amp; Tgl</th>
                  <th className="border-b border-r border-slate-200 px-3.5 py-3">Customer &amp; Alamat</th>
                  <th className="border-b border-r border-slate-200 px-3.5 py-3">Armada &amp; Sopir</th>
                  <th className="border-b border-r border-slate-200 px-3.5 py-3">Dok. BC &amp; COA</th>
                  <th className="border-b border-r border-slate-200 px-3.5 py-3 text-center">Status &amp; POD</th>
                  <th className="border-b border-slate-200 px-3.5 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Memuat Delivery Order
                      (Surat Jalan)...
                    </td>
                  </tr>
                ) : list.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      Belum ada Surat Jalan (DO).
                    </td>
                  </tr>
                ) : (
                  list.map((d) => {
                    const podHref = resolveLogisticsFileUrl(d.podFileUrl);
                    const totalQty = (d.items || []).reduce(
                      (acc, it) => acc + (Number(it.qtyShipped) || 0),
                      0
                    );
                    return (
                      <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="border-r border-slate-200 px-3.5 py-3 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => openDetailSheet(d)}
                            className="font-mono font-bold text-blue-700 hover:underline cursor-pointer"
                          >
                            {d.doNumber}
                          </button>
                          <div className="text-xs text-slate-500 mt-0.5">
                            {d.doDate} • {(d.items || []).length} item ({totalQty.toLocaleString('id-ID')})
                          </div>
                        </td>
                        <td className="border-r border-slate-200 px-3.5 py-3">
                          <div className="font-semibold text-slate-900">{d.customerName}</div>
                          <div className="text-xs text-slate-500 truncate max-w-[220px] mt-0.5">
                            {d.deliverTo || '-'}
                          </div>
                        </td>
                        <td className="border-r border-slate-200 px-3.5 py-3">
                          <div className="font-mono font-semibold text-slate-800">
                            {d.vehicleNumber || '-'}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">{d.driverName || '-'}</div>
                        </td>
                        <td className="border-r border-slate-200 px-3.5 py-3">
                          <div className="font-mono text-xs text-slate-800">
                            {d.customsDocType && d.customsDocType !== 'NONE'
                              ? `${d.customsDocType}: ${d.customsDocNumber || '-'}`
                              : 'Non-BC'}
                          </div>
                          <div className="text-xs font-mono text-emerald-700 mt-0.5">
                            {d.coaNumber || '-'}
                          </div>
                        </td>
                        <td className="border-r border-slate-200 px-3.5 py-3 text-center">
                          <div>{renderStatusBadge(d.status)}</div>
                          {podHref && (
                            <a
                              href={podHref}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-0.5 text-xs font-semibold text-blue-600 hover:underline mt-1"
                            >
                              <ExternalLink className="w-3 h-3" /> POD
                            </a>
                          )}
                        </td>
                        <td className="px-3.5 py-3 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openDetailSheet(d)}
                              title="Detail Worksheet"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" /> Detail
                            </button>
                            {canWrite && d.status !== 'DELIVERED_RECEIVED' && (
                              <button
                                type="button"
                                onClick={() => openDetailSheet(d)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
                              >
                                <Truck className="w-3.5 h-3.5" /> Update Status
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() =>
                                printLogisticsHtmlReport(
                                  `/logistics/delivery-orders/${d.id}/print`
                                ).catch((e) => toast.error(e?.message || 'Gagal mencetak Surat Jalan'))
                              }
                              title="Cetak Surat Jalan"
                              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            {canWrite && d.status === 'PREPARING_LOADING' && (
                              <button
                                type="button"
                                onClick={() => openEditSheet(d)}
                                title="Edit DO"
                                className="p-1.5 rounded-lg border border-slate-200 hover:bg-blue-50 text-blue-600 cursor-pointer"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                            )}
                            {canWrite && (
                              <button
                                type="button"
                                onClick={() => setVoidTarget(d)}
                                title="Batalkan DO"
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
          <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
            <span>
              Halaman <strong className="text-slate-900">{page}</strong> dari{' '}
              <strong className="text-slate-900">{totalPages}</strong> • Total{' '}
              <strong className="text-slate-900">{totalItems}</strong> DO
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 font-semibold disabled:opacity-40 cursor-pointer"
              >
                Sebelumnya
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 font-semibold disabled:opacity-40 cursor-pointer"
              >
                Berikutnya
              </button>
            </div>
          </div>
        </div>
      )}

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
