import React, { useState } from 'react';
import {
  Plus,
  Search,
  MapPin,
  Pencil,
  Trash2,
  Save,
  X,
  Upload,
  ExternalLink,
  CheckCircle2,
  Clock,
  Loader2,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  lookupTrackingApi,
  listTrackingEventsApi,
  createTrackingEventApi,
  updateTrackingEventApi,
  deleteTrackingEventApi,
  listDeliveryOrdersApi,
  listIncomingOrdersDropdownApi,
  uploadLogisticsDocument,
  resolveLogisticsFileUrl,
  extractLogisticsError,
  TrackingEventPayload,
} from '../../services/logisticsService';
import type { TrackingEvent, TrackingStage } from '../../types/logisticsRmStock';
import { ConfirmActionModal } from '../core1_hrd/ConfirmActionModal';
import { useRBAC } from '../../hooks/useRBAC';

const STAGES: TrackingStage[] = [
  'WAITING_FOR_MATERIAL',
  'ON_PROCESS',
  'QC_INSPECTION',
  'WAREHOUSE_READY',
  'PREPARING_LOADING',
  'ON_DELIVERY',
  'DELIVERED',
  'HOLD_ISSUE',
];

const emptyDraft = (): TrackingEventPayload => ({
  deliveryOrderId: '',
  incomingOrderId: '',
  referenceNumber: '',
  customerName: '',
  stage: 'ON_DELIVERY',
  location: '',
  gpsLatitude: null,
  gpsLongitude: null,
  photoUrl: '',
  notes: '',
});

export const ETrackingTab: React.FC = () => {
  const queryClient = useQueryClient();
  const { isSuperAdmin, isExecutive, userDivision } = useRBAC();
  const canWrite = isSuperAdmin || isExecutive || userDivision === 'DELIVERY' || userDivision === 'WAREHOUSE_PPIC';

  // 5.4.2 Portal Lookup Cepat
  const [lookupInput, setLookupInput] = useState('');
  const [lookupCode, setLookupCode] = useState('');

  // 5.4.1 Log & Inline Entry
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('ALL');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<TrackingEventPayload>(emptyDraft);
  const [uploading, setUploading] = useState(false);
  const [voidTarget, setVoidTarget] = useState<TrackingEvent | null>(null);

  const { data: lookupRes, isFetching: isLookingUp } = useQuery({
    queryKey: ['logisticsTrackingLookup', lookupCode],
    queryFn: () => lookupTrackingApi(lookupCode),
    enabled: Boolean(lookupCode),
  });

  const { data: res, isLoading } = useQuery({
    queryKey: ['logisticsTrackingEvents', page, search, stageFilter],
    queryFn: () => listTrackingEventsApi({ page, limit: 20, search: search || undefined, stage: stageFilter }),
  });
  const events = res?.data || [];
  const totalPages = res?.meta?.totalPages || res?.meta?.total_pages || 1;

  const { data: doRes } = useQuery({
    queryKey: ['logisticsDoDropdown'],
    queryFn: () => listDeliveryOrdersApi({ page: 1, limit: 100 }),
    enabled: canWrite,
  });
  const doList = doRes?.data || [];
  const { data: ioList = [] } = useQuery({
    queryKey: ['salesIoDropdown'],
    queryFn: listIncomingOrdersDropdownApi,
    enabled: canWrite,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['logisticsTrackingEvents'] });
    queryClient.invalidateQueries({ queryKey: ['logisticsTrackingLookup'] });
    queryClient.invalidateQueries({ queryKey: ['logisticsDashboardSummary'] });
  };

  const createMut = useMutation({
    mutationFn: (p: TrackingEventPayload) => createTrackingEventApi(p),
    onSuccess: () => {
      toast.success('Event E-Tracking berhasil dicatat');
      setIsAdding(false);
      setDraft(emptyDraft());
      invalidateAll();
    },
    onError: (e: any) => toast.error(extractLogisticsError(e, 'Gagal mencatat E-Tracking').message),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, p }: { id: string; p: Partial<TrackingEventPayload> }) => updateTrackingEventApi(id, p),
    onSuccess: () => {
      toast.success('Event E-Tracking berhasil diperbarui');
      setEditingId(null);
      invalidateAll();
    },
    onError: (e: any) => toast.error(extractLogisticsError(e, 'Gagal memperbarui E-Tracking').message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteTrackingEventApi(id),
    onSuccess: () => {
      toast.success('Event E-Tracking berhasil dihapus');
      setVoidTarget(null);
      invalidateAll();
    },
    onError: (e: any) => toast.error(extractLogisticsError(e, 'Gagal menghapus event').message),
  });

  const handleUploadPhoto = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadLogisticsDocument('tracking_photo', file);
      setDraft((prev) => ({ ...prev, photoUrl: url }));
      toast.success('Foto checkpoint berhasil diunggah');
    } catch (e: any) {
      toast.error(e?.message || 'Gagal mengunggah foto');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = () => {
    const payload: TrackingEventPayload = {
      ...draft,
      deliveryOrderId: draft.deliveryOrderId || null,
      incomingOrderId: draft.incomingOrderId || null,
      photoUrl: draft.photoUrl || null,
    };
    if (editingId) updateMut.mutate({ id: editingId, p: payload });
    else createMut.mutate(payload);
  };

  const renderStageBadge = (stage: string) => {
    const s = (stage || '').toUpperCase();
    if (s === 'DELIVERED') return <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">{s}</span>;
    if (s === 'HOLD_ISSUE') return <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold">{s}</span>;
    if (s === 'ON_DELIVERY') return <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">{s}</span>;
    return <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">{s}</span>;
  };

  const renderInlineEditor = (isNew: boolean) => (
    <tr className="bg-blue-50 border-b border-blue-200 align-top">
      <td className="px-3 py-2.5 font-mono text-xs font-bold text-blue-700">{isNew ? 'AUTO-TRK' : 'EDIT'}</td>
      <td className="px-3 py-2.5 space-y-1 min-w-[190px]">
        <select
          value={draft.deliveryOrderId || ''}
          onChange={(e) => {
            const d = doList.find((x) => x.id === e.target.value);
            setDraft({
              ...draft,
              deliveryOrderId: e.target.value,
              referenceNumber: d?.doNumber || draft.referenceNumber,
              customerName: d?.customerName || draft.customerName,
            });
          }}
          className="w-full px-2 py-1 rounded border border-slate-300 bg-white text-xs"
        >
          <option value="">-- Pilih DO (Opsional) --</option>
          {doList.map((d) => <option key={d.id} value={d.id}>{d.doNumber} — {d.customerName}</option>)}
        </select>
        <select
          value={draft.incomingOrderId || ''}
          onChange={(e) => {
            const io = ioList.find((x) => x.id === e.target.value);
            setDraft({
              ...draft,
              incomingOrderId: e.target.value,
              referenceNumber: io?.ioNumber || draft.referenceNumber,
              customerName: io?.customerName || draft.customerName,
            });
          }}
          className="w-full px-2 py-0.5 rounded border border-slate-300 bg-white text-[11px]"
        >
          <option value="">-- Pilih IO (Opsional) --</option>
          {ioList.map((io) => <option key={io.id} value={io.id}>{io.ioNumber}</option>)}
        </select>
        <input type="text" placeholder="No. Referensi / Customer" value={draft.referenceNumber || ''} onChange={(e) => setDraft({ ...draft, referenceNumber: e.target.value })} className="w-full px-2 py-0.5 rounded border border-slate-300 bg-white text-[11px]" />
      </td>
      <td className="px-3 py-2.5">
        <select value={draft.stage} onChange={(e) => setDraft({ ...draft, stage: e.target.value })} className="px-2 py-1 rounded border border-slate-300 bg-white text-xs font-bold">
          {STAGES.map((st) => <option key={st} value={st}>{st}</option>)}
        </select>
      </td>
      <td className="px-3 py-2.5 space-y-1 min-w-[160px]">
        <input type="text" placeholder="Lokasi checkpoint..." value={draft.location || ''} onChange={(e) => setDraft({ ...draft, location: e.target.value })} className="w-full px-2 py-1 rounded border border-slate-300 bg-white text-xs" />
        <div className="flex gap-1">
          <input type="number" step="0.0001" placeholder="Lat" value={draft.gpsLatitude ?? ''} onChange={(e) => setDraft({ ...draft, gpsLatitude: e.target.value ? Number(e.target.value) : null })} className="w-1/2 px-1.5 py-0.5 rounded border border-slate-300 bg-white text-[10px]" />
          <input type="number" step="0.0001" placeholder="Lng" value={draft.gpsLongitude ?? ''} onChange={(e) => setDraft({ ...draft, gpsLongitude: e.target.value ? Number(e.target.value) : null })} className="w-1/2 px-1.5 py-0.5 rounded border border-slate-300 bg-white text-[10px]" />
        </div>
      </td>
      <td className="px-3 py-2.5 space-y-1">
        <input type="text" placeholder="Catatan checkpoint..." value={draft.notes || ''} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} className="w-full px-2 py-1 rounded border border-slate-300 bg-white text-xs" />
        <label className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-slate-300 bg-white text-[10px] font-semibold cursor-pointer">
          {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
          <span>{draft.photoUrl ? 'Ganti Foto' : 'Upload Foto'}</span>
          <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleUploadPhoto(e.target.files[0])} />
        </label>
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
  );

  return (
    <div className="space-y-4">
      {/* 5.4.2 Portal Lookup Cepat (Semua Divisi) */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mr-2">
            <MapPin className="w-4 h-4 text-blue-600" />
            <span>5.4.2 Portal Pelacakan Cepat (DO / IO / Tracking Code):</span>
          </div>
          <input
            type="text"
            placeholder="Masukkan No. DO / IO / Tracking Code..."
            value={lookupInput}
            onChange={(e) => setLookupInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && lookupInput.trim() && setLookupCode(lookupInput.trim())}
            className="flex-1 min-w-[220px] max-w-sm px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-mono"
          />
          <button
            type="button"
            onClick={() => lookupInput.trim() && setLookupCode(lookupInput.trim())}
            disabled={isLookingUp}
            className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
          >
            {isLookingUp ? 'Melacak...' : 'Lacak Timeline'}
          </button>
          {lookupCode && (
            <button type="button" onClick={() => { setLookupCode(''); setLookupInput(''); }} className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 cursor-pointer">
              Reset
            </button>
          )}
        </div>

        {lookupCode && lookupRes && (
          <div className="pt-3 border-t border-slate-100">
            <div className="text-xs font-bold text-slate-800 mb-3">
              Timeline Pesanan: <span className="font-mono text-blue-700">{lookupRes.reference}</span> ({lookupRes.events.length} Checkpoint)
            </div>
            {lookupRes.events.length === 0 ? (
              <div className="text-xs text-slate-400">Tidak ditemukan riwayat checkpoint untuk kode tersebut.</div>
            ) : (
              <div className="space-y-3 border-l-2 border-blue-200 ml-2 pl-4">
                {lookupRes.events.map((ev, idx) => {
                  const photoHref = resolveLogisticsFileUrl(ev.photoUrl);
                  return (
                    <div key={ev.id || idx} className="relative text-xs">
                      <span className="absolute -left-[25px] top-0.5 w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center">
                        {ev.stage === 'DELIVERED' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-2.5 h-2.5" />}
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        {renderStageBadge(ev.stage)}
                        <span className="font-mono text-[11px] text-slate-500">
                          {ev.eventTime ? String(ev.eventTime).slice(0, 16).replace('T', ' ') : '-'}
                        </span>
                        <span className="font-semibold text-slate-800">{ev.location || '-'}</span>
                        {ev.gpsLatitude != null && ev.gpsLongitude != null && (
                          <span className="text-[10px] font-mono text-slate-400">({ev.gpsLatitude}, {ev.gpsLongitude})</span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-600 mt-0.5">
                        {ev.notes || '-'} • Petugas: <strong>{ev.updatedBy}</strong>
                        {photoHref && (
                          <a href={photoHref} target="_blank" rel="noreferrer" className="ml-2 inline-flex items-center gap-0.5 text-blue-600 hover:underline">
                            <ExternalLink className="w-3 h-3" /> Lihat Foto
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 5.4.1 Tabel Log Status + Inline Input */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input type="text" placeholder="Cari Tracking Code / DO / Customer..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs" />
          </div>
          <select value={stageFilter} onChange={(e) => { setStageFilter(e.target.value); setPage(1); }} className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white">
            <option value="ALL">Semua Stage</option>
            {STAGES.map((st) => <option key={st} value={st}>{st}</option>)}
          </select>
        </div>

        {canWrite && (
          <button
            type="button"
            onClick={() => { setEditingId(null); setDraft(emptyDraft()); setIsAdding(true); }}
            disabled={isAdding}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-4 h-4" /> <span>+ Update Status Pesanan (5.4.1)</span>
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase">
                <th className="px-3 py-2.5">Tracking Code &amp; Waktu</th>
                <th className="px-3 py-2.5">Ref. DO / IO &amp; Customer</th>
                <th className="px-3 py-2.5 text-center">Stage</th>
                <th className="px-3 py-2.5">Lokasi &amp; GPS</th>
                <th className="px-3 py-2.5">Catatan, Foto &amp; Petugas</th>
                <th className="px-3 py-2.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {canWrite && isAdding && renderInlineEditor(true)}
              {isLoading ? (
                <tr><td colSpan={6} className="py-10 text-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Memuat log E-Tracking...</td></tr>
              ) : events.length === 0 && !isAdding ? (
                <tr><td colSpan={6} className="py-10 text-center text-slate-400">Belum ada log E-Tracking.</td></tr>
              ) : (
                events.map((ev) => {
                  if (canWrite && editingId === ev.id) return <React.Fragment key={ev.id}>{renderInlineEditor(false)}</React.Fragment>;
                  const photoHref = resolveLogisticsFileUrl(ev.photoUrl);
                  return (
                    <tr key={ev.id} className="hover:bg-slate-50/80">
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => { setLookupInput(ev.doNumber || ev.referenceNumber || ev.trackingCode); setLookupCode(ev.doNumber || ev.referenceNumber || ev.trackingCode); }}
                          className="font-mono font-bold text-blue-700 hover:underline cursor-pointer"
                        >
                          {ev.trackingCode}
                        </button>
                        <div className="text-[10px] text-slate-400">{ev.eventTime ? String(ev.eventTime).slice(0, 16).replace('T', ' ') : '-'}</div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-mono font-semibold text-slate-800">{ev.doNumber || ev.ioNumber || ev.referenceNumber}</div>
                        <div className="text-[11px] text-slate-400">{ev.customerName}</div>
                      </td>
                      <td className="px-3 py-2.5 text-center">{renderStageBadge(ev.stage)}</td>
                      <td className="px-3 py-2.5">
                        <div>{ev.location || '-'}</div>
                        {ev.gpsLatitude != null && ev.gpsLongitude != null && (
                          <div className="text-[10px] font-mono text-slate-400">{ev.gpsLatitude}, {ev.gpsLongitude}</div>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <div>{ev.notes || '-'}</div>
                        <div className="text-[10px] text-slate-400">
                          {ev.updatedBy}
                          {photoHref && (
                            <a href={photoHref} target="_blank" rel="noreferrer" className="ml-2 text-blue-600 hover:underline">Foto</a>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right whitespace-nowrap">
                        {canWrite && (
                          <div className="inline-flex gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setIsAdding(false);
                                setEditingId(ev.id);
                                setDraft({
                                  deliveryOrderId: ev.deliveryOrderId || '',
                                  incomingOrderId: ev.incomingOrderId || '',
                                  referenceNumber: ev.referenceNumber || '',
                                  customerName: ev.customerName || '',
                                  stage: ev.stage,
                                  location: ev.location || '',
                                  gpsLatitude: ev.gpsLatitude ?? null,
                                  gpsLongitude: ev.gpsLongitude ?? null,
                                  photoUrl: ev.photoUrl || '',
                                  notes: ev.notes || '',
                                });
                              }}
                              className="p-1.5 rounded-lg border border-slate-200 hover:bg-blue-50 text-blue-600 cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button type="button" onClick={() => setVoidTarget(ev)} className="p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 text-rose-600 cursor-pointer">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
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
        title="Hapus Event E-Tracking?"
        message={`Anda yakin ingin menghapus log tracking ${voidTarget?.trackingCode || ''}?`}
        confirmLabel="Ya, Hapus"
        variant="danger"
        loading={deleteMut.isPending}
        onConfirm={() => voidTarget && deleteMut.mutate(voidTarget.id)}
        onCancel={() => setVoidTarget(null)}
      />
    </div>
  );
};
