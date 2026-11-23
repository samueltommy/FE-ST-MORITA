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
  Loader2,
  RotateCcw,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  listQcInspectionsApi,
  createQcInspectionApi,
  updateQcInspectionApi,
  deleteQcInspectionApi,
  listProductionStocksApi,
  listProductionPlansApi,
  uploadProductionDocument,
  printProductionHtmlReport,
  extractProductionError,
  QCInspectionPayload,
} from '../../services/productionService';
import { listMdmCustomersApi } from '../../services/financeService';
import type { QCType, QCInspectionRecord } from '../../types/productionQc';
import { ConfirmActionModal } from '../core1_hrd/ConfirmActionModal';
import { useRBAC } from '../../hooks/useRBAC';

interface Props {
  qcType: QCType;
}

interface ParamRow {
  key: string;
  value: string;
}

interface QcDraft {
  stockInventoryId: string;
  productionPlanId: string;
  itemId: string;
  lotNumber: string;
  tdsStandard: string;
  customerName: string;
  coaNumber: string;
  sampleSizeQty: number;
  passQty: number;
  failQty: number;
  status: string;
  routeToRework: boolean;
  reworkInstruction: string;
  notes: string;
  params: ParamRow[];
}

const defaultParamsFor = (qcType: QCType): ParamRow[] =>
  qcType === 'IQC'
    ? [
        { key: 'thickness_mm', value: '' },
        { key: 'width_mm', value: '' },
        { key: 'adhesion_gf', value: '' },
        { key: 'visual', value: 'OK' },
      ]
    : qcType === 'PQC'
    ? [
        { key: 'width_mm', value: '' },
        { key: 'length_m', value: '' },
        { key: 'visual', value: 'OK' },
      ]
    : [
        { key: 'thickness_um', value: '' },
        { key: 'adhesion_180', value: '' },
        { key: 'tensile_strength', value: '' },
        { key: 'visual', value: 'OK' },
      ];

const emptyDraft = (qcType: QCType): QcDraft => ({
  stockInventoryId: '',
  productionPlanId: '',
  itemId: '',
  lotNumber: '',
  tdsStandard: '',
  customerName: '',
  coaNumber: '',
  sampleSizeQty: 10,
  passQty: 10,
  failQty: 0,
  status: 'PASSED',
  routeToRework: false,
  reworkInstruction: '',
  notes: '',
  params: defaultParamsFor(qcType),
});

export const QcInspectionsTab: React.FC<Props> = ({ qcType }) => {
  const queryClient = useQueryClient();
  const { isSuperAdmin, isExecutive, userDivision } = useRBAC();
  const canWrite = isSuperAdmin || isExecutive || userDivision === 'PRODUKSI_QC' || userDivision === 'RND';

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<QcDraft>(() => emptyDraft(qcType));
  const [uploading, setUploading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [voidTarget, setVoidTarget] = useState<QCInspectionRecord | null>(null);

  const { data: res, isLoading } = useQuery({
    queryKey: ['qcInspections', qcType, page, search, statusFilter],
    queryFn: () => listQcInspectionsApi({ qcType, page, limit: 20, search: search || undefined, status: statusFilter }),
  });
  const list = res?.data || [];
  const totalPages = res?.meta?.totalPages || res?.meta?.total_pages || 1;

  const { data: holdStocksRes } = useQuery({
    queryKey: ['productionHoldStocksDropdown'],
    queryFn: () => listProductionStocksApi({ page: 1, limit: 100, stockStatus: 'HOLD' }),
    enabled: qcType === 'IQC' || qcType === 'OQC',
  });
  const holdStocks = holdStocksRes?.data || [];

  const { data: plansRes } = useQuery({
    queryKey: ['productionPlansDropdown'],
    queryFn: () => listProductionPlansApi({ page: 1, limit: 100 }),
    enabled: qcType === 'PQC',
  });
  const plans = plansRes?.data || [];

  const { data: customers = [] } = useQuery({
    queryKey: ['mdmCustomersDropdown'],
    queryFn: listMdmCustomersApi,
    enabled: qcType === 'OQC',
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['qcInspections'] });
    queryClient.invalidateQueries({ queryKey: ['productionStocks'] });
    queryClient.invalidateQueries({ queryKey: ['productionHoldStocksDropdown'] });
    queryClient.invalidateQueries({ queryKey: ['availableStocksForSpk'] });
    queryClient.invalidateQueries({ queryKey: ['productionReworks'] });
    queryClient.invalidateQueries({ queryKey: ['productionDashboardSummary'] });
  };

  const createMut = useMutation({
    mutationFn: (p: QCInspectionPayload) => createQcInspectionApi(p),
    onSuccess: (created) => {
      if (qcType === 'IQC' && created.status === 'PASSED') {
        toast.success('IQC PASSED — Stok batch terkait otomatis dirilis dari HOLD → AVAILABLE!');
      } else if (qcType === 'PQC' && (created.status === 'REWORK' || created.routedToRework)) {
        toast.success('PQC tercatat — Tiket 4.5.2 Rework/Repair telah diterbitkan otomatis!');
      } else if (qcType === 'OQC' && created.status === 'PASSED') {
        toast.success(`OQC PASSED — COA ${created.coaNumber || ''} terbit & stok FG dirilis AVAILABLE!`);
      } else {
        toast.success(`Inspeksi ${qcType} berhasil disimpan`);
      }
      setIsAdding(false);
      setDraft(emptyDraft(qcType));
      invalidateAll();
    },
    onError: (e: any) => toast.error(extractProductionError(e, `Gagal menyimpan inspeksi ${qcType}`).message),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, p }: { id: string; p: Partial<QCInspectionPayload> }) => updateQcInspectionApi(id, p),
    onSuccess: () => {
      toast.success(`Inspeksi ${qcType} berhasil diperbarui`);
      setEditingId(null);
      invalidateAll();
    },
    onError: (e: any) => toast.error(extractProductionError(e, `Gagal memperbarui inspeksi ${qcType}`).message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteQcInspectionApi(id),
    onSuccess: () => {
      toast.success(`Inspeksi ${qcType} berhasil dibatalkan`);
      setVoidTarget(null);
      invalidateAll();
    },
    onError: (e: any) => toast.error(extractProductionError(e, 'Gagal membatalkan inspeksi').message),
  });

  const handleUploadAttachment = async (file: File) => {
    setUploading(true);
    try {
      const docType = qcType === 'IQC' ? 'tds_report' : qcType === 'OQC' ? 'coa_attachment' : 'qc_photo';
      const url = await uploadProductionDocument(docType, file);
      setDraft((prev) => ({
        ...prev,
        params: [...prev.params.filter((p) => p.key !== 'attachment_url'), { key: 'attachment_url', value: url }],
      }));
      toast.success('Dokumen lampiran QC berhasil diunggah');
    } catch (e: any) {
      toast.error(e?.message || 'Gagal mengunggah dokumen QC');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = () => {
    const inspectionData: Record<string, string | number> = {};
    draft.params.forEach((p) => {
      if (p.key.trim() && p.value.trim() !== '') {
        inspectionData[p.key.trim()] = p.value.trim();
      }
    });

    const payload: QCInspectionPayload = {
      qcType,
      referenceType: qcType === 'IQC' ? 'RECEIPT' : qcType === 'PQC' ? 'PRODUCTION' : 'DO',
      stockInventoryId: qcType !== 'PQC' ? draft.stockInventoryId || null : null,
      productionPlanId: qcType === 'PQC' ? draft.productionPlanId || null : null,
      itemId: draft.itemId || null,
      lotNumber: draft.lotNumber || null,
      tdsStandard: qcType === 'IQC' ? draft.tdsStandard || null : null,
      customerName: qcType === 'OQC' ? draft.customerName || null : null,
      coaNumber: qcType === 'OQC' ? draft.coaNumber || null : null,
      sampleSizeQty: Number(draft.sampleSizeQty) || 0,
      passQty: Number(draft.passQty) || 0,
      failQty: Number(draft.failQty) || 0,
      status: draft.status,
      routeToRework: qcType === 'PQC' ? draft.routeToRework || draft.status === 'REWORK' : false,
      reworkInstruction: qcType === 'PQC' ? draft.reworkInstruction || null : null,
      inspectionData,
      notes: draft.notes || null,
    };

    if (editingId) updateMut.mutate({ id: editingId, p: payload });
    else createMut.mutate(payload);
  };

  const renderBadge = (status: string) => {
    const s = (status || '').toUpperCase();
    if (s === 'PASSED') return <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">PASSED</span>;
    if (s === 'REWORK') return <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold">REWORK</span>;
    if (s === 'FAILED') return <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold">FAILED</span>;
    return <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">{s || 'HOLD'}</span>;
  };

  const printPathFor = (id: string) =>
    qcType === 'OQC' ? `/qc/inspections/${id}/print-coa` : `/qc/inspections/${id}/print-lkp`;

  const renderInlineEditor = (isNew: boolean) => (
    <>
      <tr className="bg-blue-50 border-b border-blue-200 align-top">
        <td className="px-3 py-2.5 font-mono text-xs font-bold text-blue-700">
          {isNew ? `AUTO-${qcType}` : 'EDIT'}
        </td>
        <td className="px-3 py-2.5 min-w-[210px] space-y-1">
          {qcType === 'PQC' ? (
            <select
              value={draft.productionPlanId}
              onChange={(e) => {
                const pl = plans.find((x) => x.id === e.target.value);
                setDraft({ ...draft, productionPlanId: e.target.value, itemId: pl?.itemId || draft.itemId });
              }}
              className="w-full px-2 py-1 rounded border border-slate-300 bg-white text-xs"
            >
              <option value="">-- Pilih SPK --</option>
              {plans.map((pl) => <option key={pl.id} value={pl.id}>{pl.spkNumber} — {pl.itemName}</option>)}
            </select>
          ) : (
            <select
              value={draft.stockInventoryId}
              onChange={(e) => {
                const st = holdStocks.find((x) => x.id === e.target.value);
                setDraft({
                  ...draft,
                  stockInventoryId: e.target.value,
                  itemId: st?.itemId || draft.itemId,
                  lotNumber: st?.lotNumber || draft.lotNumber,
                });
              }}
              className="w-full px-2 py-1 rounded border border-slate-300 bg-white text-xs"
            >
              <option value="">-- Pilih Batch HOLD ({qcType === 'IQC' ? 'RM' : 'FG'}) --</option>
              {holdStocks.map((st) => (
                <option key={st.id} value={st.id}>
                  [{st.lotNumber}] {st.itemName} (Qty: {st.qty})
                </option>
              ))}
            </select>
          )}
          <input
            type="text"
            placeholder="No. LOT"
            value={draft.lotNumber}
            onChange={(e) => setDraft({ ...draft, lotNumber: e.target.value })}
            className="w-full px-2 py-0.5 rounded border border-slate-300 bg-white font-mono text-[11px]"
          />
        </td>
        <td className="px-3 py-2.5 space-y-1 min-w-[160px]">
          {qcType === 'IQC' && (
            <input
              type="text"
              placeholder="Standar TDS..."
              value={draft.tdsStandard}
              onChange={(e) => setDraft({ ...draft, tdsStandard: e.target.value })}
              className="w-full px-2 py-1 rounded border border-slate-300 bg-white text-xs"
            />
          )}
          {qcType === 'OQC' && (
            <>
              <select
                value={draft.customerName}
                onChange={(e) => setDraft({ ...draft, customerName: e.target.value })}
                className="w-full px-2 py-1 rounded border border-slate-300 bg-white text-xs"
              >
                <option value="">-- Pilih Customer --</option>
                {customers.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
              <input
                type="text"
                placeholder="No. COA (auto jika kosong)"
                value={draft.coaNumber}
                onChange={(e) => setDraft({ ...draft, coaNumber: e.target.value })}
                className="w-full px-2 py-0.5 rounded border border-slate-300 bg-white font-mono text-[11px]"
              />
            </>
          )}
          {qcType === 'PQC' && (
            <label className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-700 cursor-pointer">
              <input
                type="checkbox"
                checked={draft.routeToRework}
                onChange={(e) => setDraft({ ...draft, routeToRework: e.target.checked })}
              />
              <span>Kirim ke Rework (4.5.2)</span>
            </label>
          )}
        </td>
        <td className="px-3 py-2.5">
          <div className="flex gap-1">
            <input type="number" title="Sample" placeholder="Smp" value={draft.sampleSizeQty} onChange={(e) => setDraft({ ...draft, sampleSizeQty: Number(e.target.value) })} className="w-14 px-1.5 py-1 rounded border border-slate-300 bg-white font-mono text-xs text-right" />
            <input type="number" title="Pass" placeholder="Pass" value={draft.passQty} onChange={(e) => setDraft({ ...draft, passQty: Number(e.target.value) })} className="w-14 px-1.5 py-1 rounded border border-emerald-300 bg-white font-mono text-xs text-right text-emerald-700" />
            <input type="number" title="Fail" placeholder="Fail" value={draft.failQty} onChange={(e) => setDraft({ ...draft, failQty: Number(e.target.value) })} className="w-14 px-1.5 py-1 rounded border border-rose-300 bg-white font-mono text-xs text-right text-rose-600" />
          </div>
        </td>
        <td className="px-3 py-2.5">
          <select
            value={draft.status}
            onChange={(e) => {
              const st = e.target.value;
              setDraft({ ...draft, status: st, routeToRework: st === 'REWORK' ? true : draft.routeToRework });
            }}
            className="px-2 py-1 rounded border border-slate-300 bg-white text-xs font-bold"
          >
            <option value="PASSED">PASSED</option>
            {qcType === 'PQC' && <option value="REWORK">REWORK</option>}
            <option value="HOLD">HOLD</option>
            <option value="FAILED">FAILED</option>
          </select>
        </td>
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

      {/* Inline Sub-Row: Dynamic Inspection Parameters & File Upload */}
      <tr className="bg-blue-50/60 border-b border-blue-200">
        <td colSpan={6} className="p-3">
          <div className="bg-white rounded-xl border border-blue-200 p-3 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-blue-800">Parameter Uji Dinamis ({qcType}) &amp; Lampiran</span>
              <div className="flex items-center gap-2">
                <label className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-[11px] font-bold cursor-pointer">
                  {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                  <span>Upload {qcType === 'IQC' ? 'TDS / Foto' : qcType === 'OQC' ? 'Lampiran COA' : 'Foto QC'}</span>
                  <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => e.target.files?.[0] && handleUploadAttachment(e.target.files[0])} />
                </label>
                <button
                  type="button"
                  onClick={() => setDraft({ ...draft, params: [...draft.params, { key: '', value: '' }] })}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 text-white text-[11px] font-bold cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> + Parameter
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
              {draft.params.map((p, idx) => (
                <div key={idx} className="flex gap-1 items-center">
                  <input
                    type="text"
                    placeholder="Parameter"
                    value={p.key}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        params: draft.params.map((x, i) => (i === idx ? { ...x, key: e.target.value } : x)),
                      })
                    }
                    className="w-1/2 px-2 py-1 rounded border border-slate-300 font-mono text-[11px]"
                  />
                  <input
                    type="text"
                    placeholder="Hasil"
                    value={p.value}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        params: draft.params.map((x, i) => (i === idx ? { ...x, value: e.target.value } : x)),
                      })
                    }
                    className="w-1/2 px-2 py-1 rounded border border-slate-300 text-[11px]"
                  />
                  <button
                    type="button"
                    onClick={() => setDraft({ ...draft, params: draft.params.filter((_, i) => i !== idx) })}
                    className="p-0.5 text-rose-500 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {qcType === 'PQC' && (
                <input
                  type="text"
                  placeholder="Instruksi Rework/Repair (jika status REWORK)..."
                  value={draft.reworkInstruction}
                  onChange={(e) => setDraft({ ...draft, reworkInstruction: e.target.value })}
                  className="px-2.5 py-1.5 rounded border border-indigo-200 text-xs"
                />
              )}
              <input
                type="text"
                placeholder="Catatan inspeksi QC..."
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                className="px-2.5 py-1.5 rounded border border-slate-300 text-xs"
              />
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
            <input
              type="text"
              placeholder={`Cari No. ${qcType} / LOT / Item${qcType === 'OQC' ? ' / COA' : ''}...`}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs"
            />
          </div>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white">
            <option value="ALL">Semua Status</option>
            <option value="PASSED">PASSED</option>
            {qcType === 'PQC' && <option value="REWORK">REWORK</option>}
            <option value="HOLD">HOLD</option>
            <option value="FAILED">FAILED</option>
          </select>
        </div>

        {canWrite && (
          <button
            type="button"
            onClick={() => { setEditingId(null); setDraft(emptyDraft(qcType)); setIsAdding(true); }}
            disabled={isAdding}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>+ Catat {qcType === 'OQC' ? 'OQC / COA' : qcType}</span>
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase">
                <th className="px-3 py-2.5">No. Inspeksi &amp; Tgl</th>
                <th className="px-3 py-2.5">Item, {qcType === 'PQC' ? 'SPK' : 'Batch'} &amp; LOT</th>
                <th className="px-3 py-2.5">{qcType === 'IQC' ? 'Standar TDS' : qcType === 'OQC' ? 'Customer & No. COA' : 'Routing & Inspector'}</th>
                <th className="px-3 py-2.5 text-center">Sample / Pass / Fail</th>
                <th className="px-3 py-2.5 text-center">Status</th>
                <th className="px-3 py-2.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {canWrite && isAdding && renderInlineEditor(true)}
              {isLoading ? (
                <tr><td colSpan={6} className="py-10 text-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Memuat inspeksi {qcType}...</td></tr>
              ) : list.length === 0 && !isAdding ? (
                <tr><td colSpan={6} className="py-10 text-center text-slate-400">Belum ada data inspeksi {qcType}.</td></tr>
              ) : (
                list.map((row) => {
                  if (canWrite && editingId === row.id) return <React.Fragment key={row.id}>{renderInlineEditor(false)}</React.Fragment>;
                  const isExp = expandedId === row.id;
                  const entries = Object.entries(row.inspectionData || {});
                  return (
                    <React.Fragment key={row.id}>
                      <tr className="hover:bg-slate-50/80">
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <button type="button" onClick={() => setExpandedId(isExp ? null : row.id)} className="inline-flex items-center gap-1 font-mono font-bold text-slate-800 hover:text-blue-700 cursor-pointer">
                            {isExp ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            <span>{row.inspectionNumber || row.id.slice(0, 8)}</span>
                          </button>
                          <div className="text-[10px] text-slate-400 pl-4">{row.createdAt || '-'} • {row.inspectorName}</div>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="font-semibold text-slate-800">{row.itemName}</div>
                          <div className="text-[11px] font-mono text-blue-700">
                            {row.spkNumber ? `${row.spkNumber} • ` : ''}LOT: {row.lotNumber || '-'}
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          {qcType === 'IQC' && <span>{row.tdsStandard || '-'}</span>}
                          {qcType === 'OQC' && (
                            <div>
                              <div className="font-medium text-slate-800">{row.customerName || '-'}</div>
                              <div className="text-[11px] font-mono text-emerald-700 font-bold">{row.coaNumber || '-'}</div>
                            </div>
                          )}
                          {qcType === 'PQC' && (
                            <div className="flex items-center gap-1.5">
                              {row.routedToRework && (
                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 text-[10px] font-bold">
                                  <RotateCcw className="w-3 h-3" /> → Rework
                                </span>
                              )}
                              <span className="text-slate-500">{row.inspectorName}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-center font-mono whitespace-nowrap">
                          <span>{row.sampleSizeQty}</span> /{' '}
                          <span className="text-emerald-700 font-bold">{row.passQty}</span> /{' '}
                          <span className="text-rose-600 font-bold">{row.failQty}</span>
                        </td>
                        <td className="px-3 py-2.5 text-center">{renderBadge(row.status)}</td>
                        <td className="px-3 py-2.5 text-right whitespace-nowrap">
                          <div className="inline-flex gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                printProductionHtmlReport(printPathFor(row.id)).catch((e) =>
                                  toast.error(e?.message || 'Gagal mencetak dokumen QC')
                                )
                              }
                              title={qcType === 'OQC' ? 'Cetak COA' : 'Cetak LKP'}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-[11px] font-bold cursor-pointer"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>{qcType === 'OQC' ? 'COA' : 'LKP'}</span>
                            </button>
                            {canWrite && (
                              <button
                                type="button"
                                onClick={() => {
                                  setIsAdding(false);
                                  setEditingId(row.id);
                                  setDraft({
                                    stockInventoryId: row.stockInventoryId || '',
                                    productionPlanId: row.productionPlanId || '',
                                    itemId: row.itemId || '',
                                    lotNumber: row.lotNumber || '',
                                    tdsStandard: row.tdsStandard || '',
                                    customerName: row.customerName || '',
                                    coaNumber: row.coaNumber || '',
                                    sampleSizeQty: row.sampleSizeQty,
                                    passQty: row.passQty,
                                    failQty: row.failQty,
                                    status: row.status,
                                    routeToRework: row.routedToRework,
                                    reworkInstruction: '',
                                    notes: row.notes || '',
                                    params: entries.length > 0 ? entries.map(([k, v]) => ({ key: k, value: String(v) })) : defaultParamsFor(qcType),
                                  });
                                }}
                                className="p-1.5 rounded-lg border border-slate-200 hover:bg-blue-50 text-blue-600 cursor-pointer"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {canWrite && (
                              <button type="button" onClick={() => setVoidTarget(row)} className="p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 text-rose-600 cursor-pointer">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {isExp && (
                        <tr className="bg-slate-50/90 border-b border-slate-200">
                          <td colSpan={6} className="p-3.5 text-xs space-y-2">
                            <div className="font-bold text-slate-700">Hasil Parameter Uji ({entries.length})</div>
                            {entries.length === 0 ? (
                              <div className="text-slate-400">Tidak ada parameter uji tambahan.</div>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {entries.map(([k, v]) => (
                                  <span key={k} className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px]">
                                    <span className="font-mono text-slate-500">{k}:</span> <strong>{String(v)}</strong>
                                  </span>
                                ))}
                              </div>
                            )}
                            {row.notes && <div className="text-slate-600">Catatan: {row.notes}</div>}
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
        title={`Batalkan Inspeksi ${qcType}?`}
        message={`Anda yakin ingin membatalkan catatan inspeksi ${voidTarget?.inspectionNumber || voidTarget?.lotNumber || ''}?`}
        confirmLabel="Ya, Batalkan"
        variant="danger"
        loading={deleteMut.isPending}
        onConfirm={() => voidTarget && deleteMut.mutate(voidTarget.id)}
        onCancel={() => setVoidTarget(null)}
      />
    </div>
  );
};
