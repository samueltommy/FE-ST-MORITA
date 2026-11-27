import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Save,
  X,
  CheckCircle2,
  XCircle,
  Loader2,
  Eye,
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
import {
  listMdmCustomersApi,
  listMdmItemsApi,
  listCustomerPosApi,
} from '../../services/financeService';
import type { DeliveryRequest, DeliveryRequestItem } from '../../types/logisticsRmStock';
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

type ViewMode = 'list' | 'detail' | 'create' | 'edit';

const todayStr = () => new Date().toISOString().split('T')[0];

const emptyItem = (): DeliveryRequestItem => ({
  itemId: '',
  qtyToShip: 1,
});

const emptyDraft = (): DeliveryRequestPayload => ({
  incomingOrderId: '',
  customerPoId: '',
  customerId: '',
  requestedDeliveryDate: todayStr(),
  deliverTo: '',
  poDeliveryNote: '',
  notes: '',
  items: [emptyItem()],
});

interface RdoExcelRow {
  rdo: DeliveryRequest;
  itemName: string;
  itemCode: string;
  unit: string;
  qtyToShip: number;
  itemIdx: number;
}

export const DeliveryRequestsTab: React.FC = () => {
  const queryClient = useQueryClient();
  const { isSuperAdmin, isExecutive, userDivision } = useRBAC();

  const canCreateEdit =
    isSuperAdmin || isExecutive || userDivision === 'SALES' || userDivision === 'DELIVERY';
  const canReview = isSuperAdmin || isExecutive || userDivision === 'DELIVERY';

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [tableStyle, setTableStyle] = useState<TableViewStyle>('preview');

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedRdo, setSelectedRdo] = useState<DeliveryRequest | null>(null);
  const [draft, setDraft] = useState<DeliveryRequestPayload>(emptyDraft);

  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [voidTarget, setVoidTarget] = useState<DeliveryRequest | null>(null);

  const { data: res, isLoading } = useQuery({
    queryKey: ['logisticsDeliveryRequests', page, search, statusFilter],
    queryFn: () =>
      listDeliveryRequestsApi({
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
  const { data: incomingOrders = [] } = useQuery({
    queryKey: ['salesIoDropdown'],
    queryFn: listIncomingOrdersDropdownApi,
  });
  const { data: posRes } = useQuery({
    queryKey: ['financeCustomerPosDropdown'],
    queryFn: () => listCustomerPosApi({ page: 1, limit: 100 }),
  });
  const customerPos = posRes?.data || [];

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['logisticsDeliveryRequests'] });
    queryClient.invalidateQueries({ queryKey: ['logisticsRdoDropdown'] });
    queryClient.invalidateQueries({ queryKey: ['logisticsDashboardSummary'] });
  };

  const rdoToDraft = (r: DeliveryRequest): DeliveryRequestPayload => ({
    incomingOrderId: r.incomingOrderId || '',
    customerPoId: r.customerPoId || '',
    customerId: r.customerId || '',
    requestedDeliveryDate: r.requestedDeliveryDate || todayStr(),
    deliverTo: r.deliverTo || '',
    poDeliveryNote: r.poDeliveryNote || '',
    notes: r.notes || '',
    items: r.items && r.items.length > 0 ? r.items.map((it) => ({ ...it })) : [emptyItem()],
  });

  const openCreateSheet = () => {
    setSelectedRdo(null);
    setDraft(emptyDraft());
    setViewMode('create');
  };

  const openDetailSheet = (r: DeliveryRequest) => {
    setSelectedRdo(r);
    setDraft(rdoToDraft(r));
    setReviewNotes('');
    setViewMode('detail');
  };

  const openEditSheet = (r: DeliveryRequest) => {
    setSelectedRdo(r);
    setDraft(rdoToDraft(r));
    setViewMode('edit');
  };

  const backToList = () => {
    setViewMode('list');
    setSelectedRdo(null);
    setReviewingId(null);
    setReviewNotes('');
  };

  const createMut = useMutation({
    mutationFn: (p: DeliveryRequestPayload) => createDeliveryRequestApi(p),
    onSuccess: () => {
      toast.success('Request Delivery Order (RDO) berhasil diajukan');
      invalidateAll();
      backToList();
    },
    onError: (e: any) => toast.error(extractLogisticsError(e, 'Gagal mengajukan RDO').message),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, p }: { id: string; p: Partial<DeliveryRequestPayload> }) =>
      updateDeliveryRequestApi(id, p),
    onSuccess: () => {
      toast.success('RDO berhasil diperbarui');
      invalidateAll();
      backToList();
    },
    onError: (e: any) => toast.error(extractLogisticsError(e, 'Gagal memperbarui RDO').message),
  });

  const reviewMut = useMutation({
    mutationFn: ({
      id,
      action,
      notes,
    }: {
      id: string;
      action: 'APPROVE' | 'REJECT';
      notes?: string;
    }) => reviewDeliveryRequestApi(id, { action, notes: notes || null }),
    onSuccess: (_, vars) => {
      toast.success(
        vars.action === 'APPROVE' ? 'RDO disetujui Delivery' : 'RDO ditolak (Stok kurang)'
      );
      setReviewingId(null);
      setReviewNotes('');
      invalidateAll();
      if (viewMode !== 'list') backToList();
    },
    onError: (e: any) =>
      toast.error(extractLogisticsError(e, 'Gagal memproses review RDO').message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteDeliveryRequestApi(id),
    onSuccess: () => {
      toast.success('RDO berhasil dibatalkan');
      setVoidTarget(null);
      invalidateAll();
      if (viewMode !== 'list') backToList();
    },
    onError: (e: any) => toast.error(extractLogisticsError(e, 'Gagal membatalkan RDO').message),
  });

  const handleSave = () => {
    const payload: DeliveryRequestPayload = {
      ...draft,
      incomingOrderId: draft.incomingOrderId || null,
      customerPoId: draft.customerPoId || null,
      customerId: draft.customerId || null,
      items: draft.items.filter((it) => it.itemId && Number(it.qtyToShip) > 0),
    };
    if (viewMode === 'edit' && selectedRdo) {
      updateMut.mutate({ id: selectedRdo.id, p: payload });
    } else {
      createMut.mutate(payload);
    }
  };

  const renderBadge = (status: string) => {
    const s = (status || '').toUpperCase();
    if (s === 'APPROVED_BY_LOGISTICS' || s === 'CONVERTED_TO_DO') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
          {s}
        </span>
      );
    }
    if (s.includes('REJECT')) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 text-xs font-bold">
          {s}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
        {s || 'PENDING'}
      </span>
    );
  };

  const resolveItemLabel = (it: DeliveryRequestItem) => {
    if (it.itemName) return `${it.itemCode ? `[${it.itemCode}] ` : ''}${it.itemName}`;
    const found = mdmItems.find((m) => m.id === it.itemId);
    return found ? `${found.code ? `[${found.code}] ` : ''}${found.name}` : it.itemId || '-';
  };

  // Flattened rows for Excel Table Mode
  const excelRows = useMemo<RdoExcelRow[]>(() => {
    const rows: RdoExcelRow[] = [];
    for (const r of list) {
      if (!r.items || r.items.length === 0) {
        rows.push({
          rdo: r,
          itemCode: '-',
          itemName: '-',
          unit: '-',
          qtyToShip: 0,
          itemIdx: 0,
        });
      } else {
        r.items.forEach((it, idx) => {
          const found = mdmItems.find((m) => m.id === it.itemId);
          rows.push({
            rdo: r,
            itemCode: it.itemCode || found?.code || '-',
            itemName: it.itemName || found?.name || it.itemId || '-',
            unit: it.unit || found?.unit || '-',
            qtyToShip: Number(it.qtyToShip) || 0,
            itemIdx: idx,
          });
        });
      }
    }
    return rows;
  }, [list, mdmItems]);

  const totalExcelQty = useMemo(
    () => excelRows.reduce((acc, row) => acc + row.qtyToShip, 0),
    [excelRows]
  );

  const excelColumns: ExcelColumn<RdoExcelRow>[] = useMemo(
    () => [
      {
        key: 'requestNumber',
        header: 'No. RDO',
        mono: true,
        minWidth: 'min-w-[140px]',
        getValue: (r) => r.rdo.requestNumber,
      },
      {
        key: 'requestDate',
        header: 'Tgl Pengajuan',
        mono: true,
        getValue: (r) => r.rdo.requestDate || '-',
      },
      {
        key: 'requestedDeliveryDate',
        header: 'Tgl Kirim Diminta',
        mono: true,
        getValue: (r) => r.rdo.requestedDeliveryDate || '-',
      },
      {
        key: 'customerName',
        header: 'Customer',
        minWidth: 'min-w-[180px]',
        getValue: (r) => r.rdo.customerName || '-',
      },
      {
        key: 'ioNumber',
        header: 'Ref. IO',
        mono: true,
        getValue: (r) => r.rdo.ioNumber || '-',
      },
      {
        key: 'poNumber',
        header: 'Ref. PO',
        mono: true,
        getValue: (r) => r.rdo.poNumber || '-',
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
        key: 'unit',
        header: 'Unit',
        align: 'center',
        getValue: (r) => r.unit,
      },
      {
        key: 'qtyToShip',
        header: 'Qty Kirim',
        align: 'right',
        mono: true,
        getValue: (r) => r.qtyToShip,
        render: (r) => <span className="font-bold text-slate-900">{r.qtyToShip.toLocaleString('id-ID')}</span>,
        footer: <span className="text-emerald-800">{totalExcelQty.toLocaleString('id-ID')}</span>,
      },
      {
        key: 'deliverTo',
        header: 'Alamat Kirim (Deliver To)',
        minWidth: 'min-w-[200px]',
        getValue: (r) => r.rdo.deliverTo || '-',
      },
      {
        key: 'poDeliveryNote',
        header: 'Catatan Pengiriman PO',
        minWidth: 'min-w-[180px]',
        getValue: (r) => r.rdo.poDeliveryNote || '-',
      },
      {
        key: 'requestedBy',
        header: 'Pemohon',
        getValue: (r) => r.rdo.requestedBy || '-',
      },
      {
        key: 'approvedBy',
        header: 'Disetujui Oleh',
        getValue: (r) => r.rdo.approvedBy || '-',
      },
      {
        key: 'notes',
        header: 'Catatan',
        minWidth: 'min-w-[160px]',
        getValue: (r) => r.rdo.notes || '-',
      },
      {
        key: 'status',
        header: 'Status',
        align: 'center',
        getValue: (r) => r.rdo.status || 'PENDING',
        render: (r) => renderBadge(r.rdo.status),
      },
    ],
    [totalExcelQty]
  );

  const handleExportCsv = () => {
    exportExcelCsv('request-delivery-order-rdo', excelColumns, excelRows);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // FULL-PAGE EXCEL WORKSHEET (DETAIL / CREATE / EDIT)
  // ═══════════════════════════════════════════════════════════════════════════
  if (viewMode !== 'list') {
    const isReadOnly = viewMode === 'detail';
    const displayItems = isReadOnly ? selectedRdo?.items || [] : draft.items;
    const totalQty = displayItems.reduce((acc, it) => acc + (Number(it.qtyToShip) || 0), 0);

    const resolveCustomerName = () => {
      if (isReadOnly) return selectedRdo?.customerName || '-';
      return customers.find((c) => c.id === draft.customerId)?.name || '-';
    };

    const sheetActions =
      isReadOnly && selectedRdo ? (
        <>
          {canCreateEdit && selectedRdo.status === 'PENDING' && (
            <>
              <button
                type="button"
                onClick={() => openEditSheet(selectedRdo)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold cursor-pointer"
              >
                <Pencil className="w-4 h-4" />
                <span>Edit RDO</span>
              </button>
              <button
                type="button"
                onClick={() => setVoidTarget(selectedRdo)}
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
            onClick={() => (selectedRdo ? setViewMode('detail') : backToList())}
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
            <span>Simpan RDO</span>
          </button>
        </>
      );

    return (
      <>
        <ExcelWorksheetShell
          onBack={backToList}
          docTitle={
            viewMode === 'create'
              ? 'DOKUMEN BARU (AUTO-RDO)'
              : selectedRdo?.requestNumber || 'Request Delivery Order'
          }
          badge={
            viewMode === 'create' ? (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                MODE INPUT BARU
              </span>
            ) : viewMode === 'edit' ? (
              <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-bold">
                MODE EDIT
              </span>
            ) : (
              renderBadge(selectedRdo?.status || 'PENDING')
            )
          }
          formCode="FORMULIR LOGISTIK 5.3.2"
          sheetTitle="REQUEST DELIVERY ORDER (RDO WORKSHEET)"
          modeHint={
            isReadOnly
              ? 'Sheet View (Read-Only)'
              : 'Excel Grid Input Mode — Gunakan Tab untuk pindah sel'
          }
          actions={sheetActions}
        >
          {/* Section 1: Header Key-Value Grid */}
          <div>
            <div className="text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-2 flex items-center gap-2">
              <span className="w-5 h-5 rounded bg-emerald-600 text-white inline-flex items-center justify-center text-[11px] font-bold">
                1
              </span>
              <span>Informasi Pengajuan &amp; Referensi Order</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse table-fixed min-w-[780px]">
                <tbody>
                  <tr>
                    <th className={`${EXCEL_CELL.label} w-[18%]`}>No. RDO</th>
                    <td className={`${EXCEL_CELL.value} w-[32%]`}>
                      <div className="px-3 py-2.5 font-mono font-bold text-slate-800 bg-slate-50/70">
                        {viewMode === 'create'
                          ? 'AUTO-GENERATED (RDO/YYYYMM/NNN)'
                          : selectedRdo?.requestNumber || '-'}
                      </div>
                    </td>
                    <th className={`${EXCEL_CELL.label} w-[18%]`}>Tgl Kirim Diminta *</th>
                    <td className={`${EXCEL_CELL.value} w-[32%]`}>
                      {isReadOnly ? (
                        <div className="px-3 py-2.5 font-mono font-semibold">
                          {selectedRdo?.requestedDeliveryDate || '-'}
                        </div>
                      ) : (
                        <input
                          type="date"
                          value={draft.requestedDeliveryDate || ''}
                          onChange={(e) =>
                            setDraft({ ...draft, requestedDeliveryDate: e.target.value })
                          }
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
                    <th className={EXCEL_CELL.label}>Status RDO</th>
                    <td className={EXCEL_CELL.value}>
                      <div className="px-3 py-2.5 bg-slate-50/70">
                        {renderBadge(
                          viewMode === 'create' ? 'PENDING' : selectedRdo?.status || 'PENDING'
                        )}
                      </div>
                    </td>
                  </tr>

                  <tr>
                    <th className={EXCEL_CELL.label}>Ref. Incoming Order (IO)</th>
                    <td className={EXCEL_CELL.value}>
                      {isReadOnly ? (
                        <div className="px-3 py-2.5 font-mono">{selectedRdo?.ioNumber || '-'}</div>
                      ) : (
                        <select
                          value={draft.incomingOrderId || ''}
                          onChange={(e) => setDraft({ ...draft, incomingOrderId: e.target.value })}
                          className={EXCEL_CELL.input}
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
                    <th className={EXCEL_CELL.label}>Ref. Customer PO</th>
                    <td className={EXCEL_CELL.value}>
                      {isReadOnly ? (
                        <div className="px-3 py-2.5 font-mono">{selectedRdo?.poNumber || '-'}</div>
                      ) : (
                        <select
                          value={draft.customerPoId || ''}
                          onChange={(e) => setDraft({ ...draft, customerPoId: e.target.value })}
                          className={EXCEL_CELL.input}
                        >
                          <option value="">-- Tanpa Referensi PO --</option>
                          {customerPos.map((po) => (
                            <option key={po.id} value={po.id}>
                              {po.poNumber}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                  </tr>

                  {isReadOnly && (
                    <tr>
                      <th className={EXCEL_CELL.label}>Pemohon &amp; Tgl Ajuan</th>
                      <td className={EXCEL_CELL.value}>
                        <div className={EXCEL_CELL.readValue}>
                          {selectedRdo?.requestedBy || '-'} ({selectedRdo?.requestDate || '-'})
                        </div>
                      </td>
                      <th className={EXCEL_CELL.label}>Disetujui / Review</th>
                      <td className={EXCEL_CELL.value}>
                        <div className={EXCEL_CELL.readValue}>
                          {selectedRdo?.approvedBy
                            ? `${selectedRdo.approvedBy}${
                                selectedRdo.approvedAt
                                  ? ` (${String(selectedRdo.approvedAt).slice(0, 16).replace('T', ' ')})`
                                  : ''
                              }`
                            : '-'}
                        </div>
                      </td>
                    </tr>
                  )}

                  <tr>
                    <th className={EXCEL_CELL.label}>Alamat Kirim (Deliver To)</th>
                    <td colSpan={3} className={EXCEL_CELL.value}>
                      {isReadOnly ? (
                        <div className={EXCEL_CELL.readValue}>{selectedRdo?.deliverTo || '-'}</div>
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
                    <th className={EXCEL_CELL.label}>Catatan Pengiriman PO</th>
                    <td colSpan={3} className={EXCEL_CELL.value}>
                      {isReadOnly ? (
                        <div className={EXCEL_CELL.readValue}>
                          {selectedRdo?.poDeliveryNote || '-'}
                        </div>
                      ) : (
                        <input
                          type="text"
                          placeholder="Instruksi khusus pengiriman dari PO customer..."
                          value={draft.poDeliveryNote || ''}
                          onChange={(e) => setDraft({ ...draft, poDeliveryNote: e.target.value })}
                          className={EXCEL_CELL.input}
                        />
                      )}
                    </td>
                  </tr>

                  <tr>
                    <th className={EXCEL_CELL.label}>Catatan Internal</th>
                    <td colSpan={3} className={EXCEL_CELL.value}>
                      {isReadOnly ? (
                        <div className={EXCEL_CELL.readValue}>{selectedRdo?.notes || '-'}</div>
                      ) : (
                        <input
                          type="text"
                          placeholder="Catatan tambahan untuk tim Delivery / Warehouse..."
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

          {/* Section 2: Items Excel Grid */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-emerald-600 text-white inline-flex items-center justify-center text-[11px] font-bold">
                  2
                </span>
                <span>Rincian Item RDO ({displayItems.length} Baris)</span>
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
              <table className="w-full border-collapse min-w-[680px]">
                <thead>
                  <tr className="bg-slate-100 text-xs font-bold text-slate-700 uppercase">
                    <th className="border border-slate-300 px-2 py-2.5 text-center w-12">No</th>
                    <th className="border border-slate-300 px-3 py-2.5 text-left">
                      Item / Produk *
                    </th>
                    <th className="border border-slate-300 px-3 py-2.5 text-right w-40">
                      Qty Kirim *
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
                        colSpan={isReadOnly ? 3 : 4}
                        className="border border-slate-300 py-8 text-center text-sm text-slate-400"
                      >
                        Belum ada item pada RDO ini.
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
                            <div className="px-3 py-2.5 text-right font-mono font-bold text-slate-900 text-sm">
                              {Number(it.qtyToShip).toLocaleString('id-ID')}
                            </div>
                          ) : (
                            <input
                              type="number"
                              min={1}
                              value={it.qtyToShip}
                              onChange={(e) =>
                                setDraft({
                                  ...draft,
                                  items: draft.items.map((x, i) =>
                                    i === idx ? { ...x, qtyToShip: Number(e.target.value) } : x
                                  ),
                                })
                              }
                              className={`${EXCEL_CELL.input} font-mono text-right font-bold`}
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
                      colSpan={2}
                      className="border border-slate-300 px-3 py-2.5 text-right uppercase text-xs text-slate-600"
                    >
                      Total Qty Diminta
                    </td>
                    <td className="border border-slate-300 px-3 py-2.5 text-right font-mono text-emerald-800">
                      {totalQty.toLocaleString('id-ID')}
                    </td>
                    {!isReadOnly && <td className="border border-slate-300" />}
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Section 3: Review Panel (Detail mode for PENDING RDO) */}
          {isReadOnly && selectedRdo && canReview && selectedRdo.status === 'PENDING' && (
            <div className="bg-indigo-50/70 rounded-xl border border-indigo-200 p-4 space-y-3">
              <div className="text-xs font-extrabold uppercase tracking-wider text-indigo-800 flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-indigo-600 text-white inline-flex items-center justify-center text-[11px] font-bold">
                  3
                </span>
                <span>Review Ketersediaan Stok &amp; Persetujuan Delivery</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  placeholder="Catatan ketersediaan stok / jadwal pengiriman..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="flex-1 min-w-[240px] px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm"
                />
                <button
                  type="button"
                  onClick={() =>
                    reviewMut.mutate({ id: selectedRdo.id, action: 'APPROVE', notes: reviewNotes })
                  }
                  disabled={reviewMut.isPending}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Approve RDO</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    reviewMut.mutate({ id: selectedRdo.id, action: 'REJECT', notes: reviewNotes })
                  }
                  disabled={reviewMut.isPending}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold cursor-pointer disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Tolak (Stok Kurang)</span>
                </button>
              </div>
            </div>
          )}
        </ExcelWorksheetShell>

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
              placeholder="Cari No. RDO / Customer / PO..."
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
            <option value="PENDING">PENDING</option>
            <option value="APPROVED_BY_LOGISTICS">APPROVED_BY_LOGISTICS</option>
            <option value="CONVERTED_TO_DO">CONVERTED_TO_DO</option>
            <option value="REJECTED_STOCK_UNAVAILABLE">REJECTED_STOCK_UNAVAILABLE</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ExcelViewToggle
            value={tableStyle}
            onChange={setTableStyle}
            onExport={handleExportCsv}
            exportDisabled={excelRows.length === 0}
          />
          {canCreateEdit && (
            <button
              type="button"
              onClick={openCreateSheet}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Ajukan RDO (5.3.2)</span>
            </button>
          )}
        </div>
      </div>

      {tableStyle === 'excel' ? (
        <ExcelSpreadsheetTable
          title={`Tabel Excel Request Delivery Order (RDO) — ${excelRows.length} Baris Item`}
          columns={excelColumns}
          rows={excelRows}
          rowKey={(row) => `${row.rdo.id}-${row.itemIdx}`}
          isLoading={isLoading}
          emptyText="Belum ada pengajuan Request Delivery Order (RDO)."
          onRowClick={(row) => openDetailSheet(row.rdo)}
          footerLabel="TOTAL QTY"
          pagination={{
            page,
            totalPages,
            totalItems,
            unitLabel: 'RDO',
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
                  <th className="border-b border-r border-slate-200 px-3.5 py-3">No. RDO &amp; Tgl</th>
                  <th className="border-b border-r border-slate-200 px-3.5 py-3">Customer &amp; Ref. IO/PO</th>
                  <th className="border-b border-r border-slate-200 px-3.5 py-3">Tgl Kirim Diminta</th>
                  <th className="border-b border-r border-slate-200 px-3.5 py-3">Item &amp; Catatan PO</th>
                  <th className="border-b border-r border-slate-200 px-3.5 py-3">Pemohon</th>
                  <th className="border-b border-r border-slate-200 px-3.5 py-3 text-center">Status</th>
                  <th className="border-b border-slate-200 px-3.5 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Memuat Request DO...
                    </td>
                  </tr>
                ) : list.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      Belum ada pengajuan Request Delivery Order (RDO).
                    </td>
                  </tr>
                ) : (
                  list.map((r) => {
                    const totalQty = (r.items || []).reduce(
                      (acc, it) => acc + (Number(it.qtyToShip) || 0),
                      0
                    );
                    return (
                      <React.Fragment key={r.id}>
                        <tr className="hover:bg-slate-50/80 transition-colors">
                          <td className="border-r border-slate-200 px-3.5 py-3 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => openDetailSheet(r)}
                              className="font-mono font-bold text-blue-700 hover:underline cursor-pointer"
                            >
                              {r.requestNumber}
                            </button>
                            <div className="text-xs text-slate-500 mt-0.5">{r.requestDate}</div>
                          </td>
                          <td className="border-r border-slate-200 px-3.5 py-3">
                            <div className="font-semibold text-slate-900">{r.customerName}</div>
                            <div className="text-xs font-mono text-slate-500 mt-0.5">
                              {r.ioNumber ? `IO: ${r.ioNumber}` : ''}{' '}
                              {r.poNumber ? `PO: ${r.poNumber}` : ''}
                            </div>
                          </td>
                          <td className="border-r border-slate-200 px-3.5 py-3 whitespace-nowrap font-mono font-medium text-slate-800">
                            {r.requestedDeliveryDate || '-'}
                          </td>
                          <td className="border-r border-slate-200 px-3.5 py-3 max-w-[260px]">
                            <div className="text-xs font-semibold text-slate-700">
                              {(r.items || []).length} item • Total Qty:{' '}
                              <span className="font-mono text-emerald-700">
                                {totalQty.toLocaleString('id-ID')}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 truncate mt-0.5">
                              {r.poDeliveryNote || r.deliverTo || '-'}
                            </div>
                          </td>
                          <td className="border-r border-slate-200 px-3.5 py-3 text-slate-700">
                            {r.requestedBy || '-'}
                          </td>
                          <td className="border-r border-slate-200 px-3.5 py-3 text-center">
                            {renderBadge(r.status)}
                          </td>
                          <td className="px-3.5 py-3 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => openDetailSheet(r)}
                                title="Buka Detail Worksheet"
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" /> Detail
                              </button>
                              {canReview && r.status === 'PENDING' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReviewingId(reviewingId === r.id ? null : r.id);
                                    setReviewNotes('');
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
                                >
                                  Review
                                </button>
                              )}
                              {canCreateEdit && r.status === 'PENDING' && (
                                <button
                                  type="button"
                                  onClick={() => openEditSheet(r)}
                                  title="Edit RDO"
                                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-blue-50 text-blue-600 cursor-pointer"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                              )}
                              {canCreateEdit && r.status === 'PENDING' && (
                                <button
                                  type="button"
                                  onClick={() => setVoidTarget(r)}
                                  title="Batalkan RDO"
                                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 text-rose-600 cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>

                        {reviewingId === r.id && (
                          <tr className="bg-indigo-50">
                            <td colSpan={7} className="p-3.5 border-t border-indigo-200">
                              <div className="flex flex-wrap items-center gap-2 text-sm">
                                <span className="font-bold text-indigo-800">
                                  Review RDO {r.requestNumber}:
                                </span>
                                <input
                                  type="text"
                                  placeholder="Catatan ketersediaan stok / jadwal..."
                                  value={reviewNotes}
                                  onChange={(e) => setReviewNotes(e.target.value)}
                                  className="flex-1 min-w-[220px] px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-sm"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    reviewMut.mutate({
                                      id: r.id,
                                      action: 'APPROVE',
                                      notes: reviewNotes,
                                    })
                                  }
                                  disabled={reviewMut.isPending}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Approve RDO
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    reviewMut.mutate({
                                      id: r.id,
                                      action: 'REJECT',
                                      notes: reviewNotes,
                                    })
                                  }
                                  disabled={reviewMut.isPending}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
                                >
                                  <XCircle className="w-3.5 h-3.5" /> Tolak (Stok Kurang)
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setReviewingId(null)}
                                  className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-bold cursor-pointer"
                                >
                                  Batal
                                </button>
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
          <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
            <span>
              Halaman <strong className="text-slate-900">{page}</strong> dari{' '}
              <strong className="text-slate-900">{totalPages}</strong> • Total{' '}
              <strong className="text-slate-900">{totalItems}</strong> RDO
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
