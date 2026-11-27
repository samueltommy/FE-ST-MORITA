import React, { useMemo, useState } from 'react';
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
  Eye,
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
import {
  ExcelColumn,
  ExcelSpreadsheetTable,
  ExcelViewToggle,
  ExcelWorksheetShell,
  EXCEL_CELL,
  TableViewStyle,
  exportExcelCsv,
} from '../../components/shared/ExcelDataKit';

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

type WorksheetMode = 'list' | 'create' | 'edit' | 'detail';

export const ProductDevelopmentsTab: React.FC = () => {
  const queryClient = useQueryClient();
  const { isSuperAdmin, isExecutive, userDivision } = useRBAC();

  const canWriteDev =
    isSuperAdmin || isExecutive || userDivision === 'SALES' || userDivision === 'RND';
  const canApproveRnd = isSuperAdmin || isExecutive || userDivision === 'RND';

  const [tableStyle, setTableStyle] = useState<TableViewStyle>('preview');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [worksheetMode, setWorksheetMode] = useState<WorksheetMode>('list');
  const [selectedDev, setSelectedDev] = useState<ProductDevelopment | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ProductDevelopmentPayload>(emptyDraft);
  const [uploading, setUploading] = useState(false);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [approvalDraft, setApprovalDraft] = useState({
    specVersion: 'v2.0-FINAL',
    specDocumentUrl: '',
    notes: '',
  });
  const [voidTarget, setVoidTarget] = useState<ProductDevelopment | null>(null);

  const { data: res, isLoading } = useQuery({
    queryKey: ['productDevelopments', page, search, statusFilter],
    queryFn: () =>
      listProductDevelopmentsApi({
        page,
        limit: 20,
        search: search || undefined,
        status: statusFilter,
      }),
  });
  const list = res?.data || [];
  const totalPages = res?.meta?.totalPages || res?.meta?.total_pages || 1;
  const totalItems = res?.meta?.total;

  const { data: customers = [] } = useQuery({
    queryKey: ['mdmCustomersDropdown'],
    queryFn: listMdmCustomersApi,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['productDevelopments'] });
    queryClient.invalidateQueries({ queryKey: ['productionDashboardSummary'] });
  };

  const createMut = useMutation({
    mutationFn: (p: ProductDevelopmentPayload) => createProductDevelopmentApi(p),
    onSuccess: () => {
      toast.success('Proyek Pengembangan Produk berhasil disimpan');
      setWorksheetMode('list');
      setSelectedDev(null);
      setEditingId(null);
      setDraft(emptyDraft());
      invalidateAll();
    },
    onError: (e: any) => toast.error(extractProductionError(e, 'Gagal menyimpan proyek').message),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, p }: { id: string; p: Partial<ProductDevelopmentPayload> }) =>
      updateProductDevelopmentApi(id, p),
    onSuccess: () => {
      toast.success('Proyek Pengembangan Produk berhasil diperbarui');
      setWorksheetMode('list');
      setSelectedDev(null);
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
      toast.success(
        vars.action === 'APPROVE'
          ? 'Sampel Akhir R&D disetujui (APPROVED)'
          : 'Sampel Akhir R&D ditolak (REJECTED)'
      );
      setExpandedId(null);
      if (worksheetMode === 'detail') {
        setWorksheetMode('list');
        setSelectedDev(null);
      }
      invalidateAll();
    },
    onError: (e: any) =>
      toast.error(extractProductionError(e, 'Gagal memproses approval sampel').message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteProductDevelopmentApi(id),
    onSuccess: () => {
      toast.success('Proyek berhasil dibatalkan');
      setVoidTarget(null);
      if (worksheetMode !== 'list') {
        setWorksheetMode('list');
        setSelectedDev(null);
      }
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

  const openCreate = () => {
    setSelectedDev(null);
    setEditingId(null);
    setDraft(emptyDraft());
    setWorksheetMode('create');
  };

  const openEdit = (d: ProductDevelopment) => {
    setSelectedDev(d);
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
    setWorksheetMode('edit');
  };

  const openDetail = (d: ProductDevelopment) => {
    setSelectedDev(d);
    setEditingId(null);
    setApprovalDraft({
      specVersion: d.specVersion || 'v2.0-FINAL',
      specDocumentUrl: d.specDocumentUrl || '',
      notes: d.approvalNotes || '',
    });
    setWorksheetMode('detail');
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
    if (s === 'APPROVED')
      return (
        <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
          APPROVED
        </span>
      );
    if (s === 'REJECTED')
      return (
        <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 text-xs font-bold">
          REJECTED
        </span>
      );
    if (s === 'TRIAL' || s === 'SPEC_REVIEW')
      return (
        <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
          {s}
        </span>
      );
    return (
      <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
        {s || 'DRAFT'}
      </span>
    );
  };

  const totalEstQty = useMemo(
    () => list.reduce((acc, d) => acc + (Number(d.monthlyQtyEstimate) || 0), 0),
    [list]
  );

  const excelColumns: ExcelColumn<ProductDevelopment>[] = useMemo(
    () => [
      {
        key: 'projectCode',
        header: 'Kode Proyek',
        mono: true,
        minWidth: 'min-w-[140px]',
        getValue: (r) => r.projectCode,
      },
      {
        key: 'category',
        header: 'Kategori',
        minWidth: 'min-w-[130px]',
        getValue: (r) => r.category || '-',
      },
      {
        key: 'productName',
        header: 'Nama Produk',
        minWidth: 'min-w-[200px]',
        getValue: (r) => r.productName,
      },
      {
        key: 'sizeSpec',
        header: 'Ukuran / Spec',
        minWidth: 'min-w-[150px]',
        getValue: (r) => r.sizeSpec || '-',
      },
      {
        key: 'targetPrice',
        header: 'Target Harga',
        align: 'right',
        mono: true,
        getValue: (r) => r.targetPrice,
        render: (r) => formatIDR(r.targetPrice),
      },
      {
        key: 'monthlyQtyEstimate',
        header: 'Est. Qty/Bln',
        align: 'right',
        mono: true,
        getValue: (r) => r.monthlyQtyEstimate,
        footer: totalEstQty.toLocaleString('id-ID'),
      },
      {
        key: 'customerName',
        header: 'Customer',
        minWidth: 'min-w-[160px]',
        getValue: (r) => r.customerName || '-',
      },
      {
        key: 'requestedByName',
        header: 'Pemohon',
        minWidth: 'min-w-[130px]',
        getValue: (r) => r.requestedByName || '-',
      },
      {
        key: 'specVersion',
        header: 'Versi Spec',
        mono: true,
        align: 'center',
        getValue: (r) => r.specVersion || '-',
      },
      {
        key: 'specDocumentUrl',
        header: 'Dok. Spec',
        align: 'center',
        getValue: (r) => (r.specDocumentUrl ? 'ADA' : '-'),
        render: (r) => {
          const href = resolveProductionFileUrl(r.specDocumentUrl);
          return href ? (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-blue-600 hover:underline font-semibold"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Spec
            </a>
          ) : (
            '-'
          );
        },
      },
      {
        key: 'status',
        header: 'Status',
        align: 'center',
        getValue: (r) => r.status,
        render: (r) => renderBadge(r.status),
      },
      {
        key: 'approvedBy',
        header: 'Disetujui Oleh',
        getValue: (r) => r.approvedBy || '-',
      },
      {
        key: 'specNotes',
        header: 'Catatan Spec',
        minWidth: 'min-w-[180px]',
        getValue: (r) => r.specNotes || '-',
      },
      {
        key: 'trialNotes',
        header: 'Catatan Trial',
        minWidth: 'min-w-[180px]',
        getValue: (r) => r.trialNotes || '-',
      },
    ],
    [totalEstQty]
  );

  if (worksheetMode !== 'list') {
    const isReadOnly = worksheetMode === 'detail';
    const detailSpecHref = resolveProductionFileUrl(selectedDev?.specDocumentUrl);

    return (
      <>
        <ExcelWorksheetShell
          onBack={() => {
            setWorksheetMode('list');
            setSelectedDev(null);
            setEditingId(null);
          }}
          docTitle={
            worksheetMode === 'create'
              ? 'AUTO-RND BARU'
              : selectedDev?.projectCode || 'PENGEMBANGAN PRODUK'
          }
          badge={renderBadge(isReadOnly ? selectedDev?.status || 'DRAFT' : 'DRAFT')}
          formCode="FORM-RND-4.2.1 / 4.2.2 (PRODUCT DEVELOPMENT & SAMPLE APPROVAL)"
          sheetTitle={
            worksheetMode === 'create'
              ? 'Lembar Kerja Proyek Pengembangan Produk Baru'
              : worksheetMode === 'edit'
              ? 'Edit Proyek Pengembangan Produk'
              : 'Detail Proyek Pengembangan Produk & Approval Sampel R&D'
          }
          modeHint={isReadOnly ? 'MODE: READ-ONLY / APPROVAL R&D' : 'MODE: EXCEL ENTRY'}
          actions={
            isReadOnly && selectedDev ? (
              <>
                <button
                  type="button"
                  onClick={() =>
                    printProductionHtmlReport(
                      `/production/product-developments/${selectedDev.id}/print-approval`
                    ).catch((e) => toast.error(e?.message || 'Gagal mencetak Approval Sheet'))
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  <Printer className="w-4 h-4" /> Cetak Approval Sheet
                </button>
                {canWriteDev && (
                  <button
                    type="button"
                    onClick={() => openEdit(selectedDev)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
                  >
                    <Pencil className="w-4 h-4" /> Edit Proyek
                  </button>
                )}
                {canWriteDev && (
                  <button
                    type="button"
                    onClick={() => setVoidTarget(selectedDev)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" /> Batalkan
                  </button>
                )}
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={createMut.isPending || updateMut.isPending || uploading}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" /> Simpan Proyek
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setWorksheetMode('list');
                    setSelectedDev(null);
                    setEditingId(null);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  <X className="w-4 h-4" /> Batal
                </button>
              </>
            )
          }
        >
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
              A. Spesifikasi &amp; Estimasi Produk Baru (4.2.1)
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <tbody>
                  <tr>
                    <td className={`${EXCEL_CELL.label} w-44`}>Kategori</td>
                    <td className={EXCEL_CELL.value}>
                      {isReadOnly ? (
                        <div className={EXCEL_CELL.readValue}>{selectedDev?.category || '-'}</div>
                      ) : (
                        <input
                          type="text"
                          placeholder="OPP Tape / Masking Tape..."
                          value={draft.category}
                          onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                          className={EXCEL_CELL.input}
                        />
                      )}
                    </td>
                    <td className={`${EXCEL_CELL.label} w-44`}>Nama Produk Baru *</td>
                    <td className={EXCEL_CELL.value}>
                      {isReadOnly ? (
                        <div className={`${EXCEL_CELL.readValue} font-semibold`}>
                          {selectedDev?.productName || '-'}
                        </div>
                      ) : (
                        <input
                          type="text"
                          placeholder="Nama produk baru..."
                          value={draft.productName}
                          onChange={(e) => setDraft({ ...draft, productName: e.target.value })}
                          className={EXCEL_CELL.input}
                        />
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className={EXCEL_CELL.label}>Ukuran / Spec</td>
                    <td className={EXCEL_CELL.value}>
                      {isReadOnly ? (
                        <div className={EXCEL_CELL.readValue}>{selectedDev?.sizeSpec || '-'}</div>
                      ) : (
                        <input
                          type="text"
                          placeholder="Contoh: 48mm x 100m"
                          value={draft.sizeSpec || ''}
                          onChange={(e) => setDraft({ ...draft, sizeSpec: e.target.value })}
                          className={EXCEL_CELL.input}
                        />
                      )}
                    </td>
                    <td className={EXCEL_CELL.label}>Customer</td>
                    <td className={EXCEL_CELL.value}>
                      {isReadOnly ? (
                        <div className={EXCEL_CELL.readValue}>
                          {selectedDev?.customerName || '-'}
                        </div>
                      ) : (
                        <select
                          value={draft.customerId || ''}
                          onChange={(e) => {
                            const c = customers.find((x) => x.id === e.target.value);
                            setDraft({
                              ...draft,
                              customerId: e.target.value,
                              customerName: c?.name || draft.customerName,
                            });
                          }}
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
                  </tr>
                  <tr>
                    <td className={EXCEL_CELL.label}>Target Harga (IDR)</td>
                    <td className={EXCEL_CELL.value}>
                      {isReadOnly ? (
                        <div className={`${EXCEL_CELL.readValue} font-mono font-bold`}>
                          {formatIDR(selectedDev?.targetPrice || 0)}
                        </div>
                      ) : (
                        <input
                          type="number"
                          min={0}
                          value={draft.targetPrice}
                          onChange={(e) =>
                            setDraft({ ...draft, targetPrice: Number(e.target.value) })
                          }
                          className={`${EXCEL_CELL.input} font-mono text-right`}
                        />
                      )}
                    </td>
                    <td className={EXCEL_CELL.label}>Estimasi Qty / Bulan</td>
                    <td className={EXCEL_CELL.value}>
                      {isReadOnly ? (
                        <div className={`${EXCEL_CELL.readValue} font-mono`}>
                          {selectedDev?.monthlyQtyEstimate || 0}
                        </div>
                      ) : (
                        <input
                          type="number"
                          min={0}
                          value={draft.monthlyQtyEstimate}
                          onChange={(e) =>
                            setDraft({ ...draft, monthlyQtyEstimate: Number(e.target.value) })
                          }
                          className={`${EXCEL_CELL.input} font-mono text-right`}
                        />
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className={EXCEL_CELL.label}>Versi Spec</td>
                    <td className={EXCEL_CELL.value}>
                      {isReadOnly ? (
                        <div className={`${EXCEL_CELL.readValue} font-mono font-bold`}>
                          {selectedDev?.specVersion || '-'}
                        </div>
                      ) : (
                        <input
                          type="text"
                          placeholder="v1.0"
                          value={draft.specVersion || ''}
                          onChange={(e) => setDraft({ ...draft, specVersion: e.target.value })}
                          className={`${EXCEL_CELL.input} font-mono`}
                        />
                      )}
                    </td>
                    <td className={EXCEL_CELL.label}>Dokumen Spesifikasi</td>
                    <td className={EXCEL_CELL.value}>
                      {isReadOnly ? (
                        <div className={EXCEL_CELL.readValue}>
                          {detailSpecHref ? (
                            <a
                              href={detailSpecHref}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-blue-600 hover:underline font-semibold"
                            >
                              <ExternalLink className="w-4 h-4" /> Buka Dokumen Spec
                            </a>
                          ) : (
                            '-'
                          )}
                        </div>
                      ) : (
                        <div className="px-3 py-2 flex items-center gap-2">
                          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-bold cursor-pointer">
                            {uploading ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Upload className="w-3.5 h-3.5" />
                            )}
                            <span>{draft.specDocumentUrl ? 'Ganti Dok. Spec' : 'Upload Spec'}</span>
                            <input
                              type="file"
                              className="hidden"
                              accept=".pdf,image/*,.doc,.docx"
                              onChange={(e) =>
                                e.target.files?.[0] && handleUploadSpec(e.target.files[0], 'draft')
                              }
                            />
                          </label>
                          {draft.specDocumentUrl && (
                            <span className="text-xs text-emerald-700 font-semibold">
                              Terunggah
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className={EXCEL_CELL.label}>Catatan Spec</td>
                    <td className={EXCEL_CELL.value} colSpan={3}>
                      {isReadOnly ? (
                        <div className={EXCEL_CELL.readValue}>{selectedDev?.specNotes || '-'}</div>
                      ) : (
                        <input
                          type="text"
                          placeholder="Catatan teknis spesifikasi..."
                          value={draft.specNotes || ''}
                          onChange={(e) => setDraft({ ...draft, specNotes: e.target.value })}
                          className={EXCEL_CELL.input}
                        />
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className={EXCEL_CELL.label}>Catatan Trial</td>
                    <td className={EXCEL_CELL.value} colSpan={3}>
                      {isReadOnly ? (
                        <div className={EXCEL_CELL.readValue}>{selectedDev?.trialNotes || '-'}</div>
                      ) : (
                        <input
                          type="text"
                          placeholder="Catatan hasil trial produksi..."
                          value={draft.trialNotes || ''}
                          onChange={(e) => setDraft({ ...draft, trialNotes: e.target.value })}
                          className={EXCEL_CELL.input}
                        />
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {isReadOnly && selectedDev && (
            <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-4 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-purple-800">
                B. 4.2.2 Approval Sampel Akhir (Khusus R&amp;D)
              </div>
              {canApproveRnd && selectedDev.status !== 'APPROVED' ? (
                <div className="flex flex-wrap items-end gap-3">
                  <label className="space-y-1">
                    <span className="text-xs font-semibold text-slate-700">Versi Spec Final</span>
                    <input
                      type="text"
                      value={approvalDraft.specVersion}
                      onChange={(e) =>
                        setApprovalDraft({ ...approvalDraft, specVersion: e.target.value })
                      }
                      className="w-36 px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono text-sm"
                    />
                  </label>
                  <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold cursor-pointer">
                    {uploading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {approvalDraft.specDocumentUrl ? 'Ganti Dok. Spec' : 'Upload Dok. Spec'}
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,image/*,.doc,.docx"
                      onChange={(e) =>
                        e.target.files?.[0] && handleUploadSpec(e.target.files[0], 'approval')
                      }
                    />
                  </label>
                  <input
                    type="text"
                    placeholder="Catatan approval R&D..."
                    value={approvalDraft.notes}
                    onChange={(e) =>
                      setApprovalDraft({ ...approvalDraft, notes: e.target.value })
                    }
                    className="flex-1 min-w-[220px] px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => approveMut.mutate({ id: selectedDev.id, action: 'APPROVE' })}
                    disabled={approveMut.isPending}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Approve Sampel
                  </button>
                  <button
                    type="button"
                    onClick={() => approveMut.mutate({ id: selectedDev.id, action: 'REJECT' })}
                    disabled={approveMut.isPending}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
                  >
                    <XCircle className="w-4 h-4" /> Reject
                  </button>
                </div>
              ) : (
                <div className="text-sm text-slate-700">
                  <strong>Disetujui Oleh:</strong> {selectedDev.approvedBy || '-'} •{' '}
                  <strong>Catatan Approval:</strong> {selectedDev.approvalNotes || '-'}
                </div>
              )}
            </div>
          )}
        </ExcelWorksheetShell>

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
      </>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari Kode Proyek / Produk / Customer..."
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
            <option value="DRAFT">DRAFT</option>
            <option value="TRIAL">TRIAL</option>
            <option value="SPEC_REVIEW">SPEC_REVIEW</option>
            <option value="APPROVED">APPROVED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ExcelViewToggle
            value={tableStyle}
            onChange={setTableStyle}
            onExport={() => exportExcelCsv('product-developments-rnd', excelColumns, list)}
            exportDisabled={list.length === 0}
          />
          {canWriteDev && (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" /> <span>+ Tambah Proyek (4.2.1)</span>
            </button>
          )}
        </div>
      </div>

      {tableStyle === 'excel' ? (
        <ExcelSpreadsheetTable
          title="Daftar Proyek Pengembangan Produk & R&D (4.2.1 / 4.2.2)"
          columns={excelColumns}
          rows={list}
          rowKey={(r) => r.id}
          isLoading={isLoading}
          emptyText="Belum ada proyek pengembangan produk."
          onRowClick={openDetail}
          footerLabel="TOTAL"
          pagination={{
            page,
            totalPages,
            totalItems,
            unitLabel: 'proyek',
            onPrev: () => setPage((p) => Math.max(1, p - 1)),
            onNext: () => setPage((p) => p + 1),
          }}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase">
                  <th className="px-4 py-3 border-r border-slate-200">Kode Proyek</th>
                  <th className="px-4 py-3 border-r border-slate-200">Kategori &amp; Nama Produk</th>
                  <th className="px-4 py-3 border-r border-slate-200">Ukuran / Spec</th>
                  <th className="px-4 py-3 border-r border-slate-200 text-right">Target Harga</th>
                  <th className="px-4 py-3 border-r border-slate-200 text-right">Est. Qty/Bln</th>
                  <th className="px-4 py-3 border-r border-slate-200">Customer &amp; Pemohon</th>
                  <th className="px-4 py-3 border-r border-slate-200">Versi &amp; Dok. Spec</th>
                  <th className="px-4 py-3 border-r border-slate-200 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      <Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Memuat Proyek
                      Pengembangan Produk...
                    </td>
                  </tr>
                ) : list.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      Belum ada proyek pengembangan produk.
                    </td>
                  </tr>
                ) : (
                  list.map((d) => {
                    const isExp = expandedId === d.id;
                    const specHref = resolveProductionFileUrl(d.specDocumentUrl);
                    return (
                      <React.Fragment key={d.id}>
                        <tr className="hover:bg-slate-50/80">
                          <td className="px-4 py-3 border-r border-slate-100 font-mono font-bold whitespace-nowrap">
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
                              {isExp ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                              <span>{d.projectCode}</span>
                            </button>
                          </td>
                          <td className="px-4 py-3 border-r border-slate-100">
                            <div className="font-semibold text-slate-800">{d.productName}</div>
                            <div className="text-xs text-slate-400">{d.category}</div>
                          </td>
                          <td className="px-4 py-3 border-r border-slate-100">
                            {d.sizeSpec || '-'}
                          </td>
                          <td className="px-4 py-3 border-r border-slate-100 text-right font-mono">
                            {formatIDR(d.targetPrice)}
                          </td>
                          <td className="px-4 py-3 border-r border-slate-100 text-right font-mono">
                            {d.monthlyQtyEstimate}
                          </td>
                          <td className="px-4 py-3 border-r border-slate-100">
                            <div className="font-medium">{d.customerName || '-'}</div>
                            <div className="text-xs text-slate-400">
                              {d.requestedByName || '-'}
                            </div>
                          </td>
                          <td className="px-4 py-3 border-r border-slate-100 whitespace-nowrap">
                            <span className="font-mono font-bold text-slate-700">
                              {d.specVersion}
                            </span>
                            {specHref && (
                              <a
                                href={specHref}
                                target="_blank"
                                rel="noreferrer"
                                className="ml-2 inline-flex items-center gap-0.5 text-blue-600 hover:underline text-xs"
                              >
                                <ExternalLink className="w-3.5 h-3.5" /> Spec
                              </a>
                            )}
                          </td>
                          <td className="px-4 py-3 border-r border-slate-100 text-center">
                            {renderBadge(d.status)}
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
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
                                  className="px-2.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold cursor-pointer"
                                >
                                  Approval R&amp;D
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => openDetail(d)}
                                title="Buka Lembar Kerja"
                                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  printProductionHtmlReport(
                                    `/production/product-developments/${d.id}/print-approval`
                                  ).catch((e) =>
                                    toast.error(e?.message || 'Gagal mencetak Approval Sheet')
                                  )
                                }
                                title="Cetak Approval Sheet"
                                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"
                              >
                                <Printer className="w-4 h-4" />
                              </button>
                              {canWriteDev && (
                                <button
                                  type="button"
                                  onClick={() => openEdit(d)}
                                  title="Edit Proyek"
                                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-blue-50 text-blue-600 cursor-pointer"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                              )}
                              {canWriteDev && (
                                <button
                                  type="button"
                                  onClick={() => setVoidTarget(d)}
                                  title="Batalkan"
                                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 text-rose-600 cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>

                        {isExp && (
                          <tr className="bg-purple-50/70 border-b border-purple-200">
                            <td colSpan={9} className="p-4 space-y-2.5 text-sm">
                              <div className="text-slate-600">
                                <strong>Catatan Spec:</strong> {d.specNotes || '-'} •{' '}
                                <strong>Catatan Trial:</strong> {d.trialNotes || '-'}
                              </div>
                              {canApproveRnd && d.status !== 'APPROVED' ? (
                                <div className="bg-white rounded-xl border border-purple-200 p-3.5 flex flex-wrap items-end gap-2.5">
                                  <span className="font-bold text-purple-800 w-full text-xs">
                                    4.2.2 Approval Sampel Akhir (Khusus R&amp;D)
                                  </span>
                                  <label className="space-y-0.5">
                                    <span className="text-xs font-semibold">Versi Spec Final</span>
                                    <input
                                      type="text"
                                      value={approvalDraft.specVersion}
                                      onChange={(e) =>
                                        setApprovalDraft({
                                          ...approvalDraft,
                                          specVersion: e.target.value,
                                        })
                                      }
                                      className="w-32 px-2.5 py-1.5 rounded border border-slate-300 font-mono text-sm"
                                    />
                                  </label>
                                  <label className="inline-flex items-center gap-1 px-3 py-2 rounded border border-slate-300 bg-slate-50 text-xs font-semibold cursor-pointer">
                                    {uploading ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <Upload className="w-3.5 h-3.5" />
                                    )}
                                    <span>
                                      {approvalDraft.specDocumentUrl
                                        ? 'Ganti Dok. Spec'
                                        : 'Upload Dok. Spec'}
                                    </span>
                                    <input
                                      type="file"
                                      className="hidden"
                                      accept=".pdf,image/*,.doc,.docx"
                                      onChange={(e) =>
                                        e.target.files?.[0] &&
                                        handleUploadSpec(e.target.files[0], 'approval')
                                      }
                                    />
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="Catatan approval R&D..."
                                    value={approvalDraft.notes}
                                    onChange={(e) =>
                                      setApprovalDraft({ ...approvalDraft, notes: e.target.value })
                                    }
                                    className="flex-1 min-w-[200px] px-2.5 py-1.5 rounded border border-slate-300 text-sm"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      approveMut.mutate({ id: d.id, action: 'APPROVE' })
                                    }
                                    disabled={approveMut.isPending}
                                    className="inline-flex items-center gap-1 px-3.5 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold cursor-pointer"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Approve Sampel
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      approveMut.mutate({ id: d.id, action: 'REJECT' })
                                    }
                                    disabled={approveMut.isPending}
                                    className="inline-flex items-center gap-1 px-3.5 py-2 rounded-lg bg-rose-600 text-white text-xs font-bold cursor-pointer"
                                  >
                                    <XCircle className="w-3.5 h-3.5" /> Reject
                                  </button>
                                </div>
                              ) : (
                                <div className="text-slate-600">
                                  <strong>Disetujui Oleh:</strong> {d.approvedBy || '-'} •{' '}
                                  <strong>Catatan Approval:</strong> {d.approvalNotes || '-'}
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

          <div className="px-4 py-3 border-t border-slate-200 bg-slate-50/70 flex items-center justify-between text-xs text-slate-600">
            <span>
              Halaman <strong>{page}</strong> dari <strong>{totalPages}</strong>
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold disabled:opacity-40 cursor-pointer"
              >
                Sebelumnya
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold disabled:opacity-40 cursor-pointer"
              >
                Berikutnya
              </button>
            </div>
          </div>
        </div>
      )}

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
