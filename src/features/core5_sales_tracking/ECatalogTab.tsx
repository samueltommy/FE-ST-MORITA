import React, { useState } from 'react';
import {
  Plus,
  Search,
  Upload,
  ExternalLink,
  Pencil,
  Trash2,
  Save,
  X,
  BookOpen,
  FileText,
  Megaphone,
  Loader2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  listECatalogApi,
  createECatalogApi,
  updateECatalogApi,
  deleteECatalogApi,
  uploadSalesDocumentApi,
  resolveSalesFileUrl,
  listSalesDropdownItemsApi,
  extractSalesErrorMessage,
  ECatalogCategory,
  ECatalogPayload,
  ECatalogRecord,
  SalesDocType,
} from '../../services/salesService';
import { ConfirmActionModal } from '../core1_hrd/ConfirmActionModal';
import { useRBAC } from '../../hooks/useRBAC';

const todayStr = () => new Date().toISOString().split('T')[0];

const CATEGORY_GROUPS = [
  { id: 'ALL', label: 'Semua Materi', icon: BookOpen },
  { id: 'PROMOTIONAL_PROFILE', label: 'Promosi & Profil Perusahaan', icon: FileText },
  { id: 'PRODUCT_KNOWLEDGE', label: 'Product Knowledge', icon: BookOpen },
  { id: 'COMMERCIAL_NOTICE', label: 'Surat Kenaikan Harga / Info Stok', icon: Megaphone },
];

const CATEGORIES: Array<{ value: ECatalogCategory; label: string; group: string; docType: SalesDocType }> = [
  { value: 'INTRODUCTION_LETTER', label: 'Surat Perkenalan', group: 'PROMOTIONAL_PROFILE', docType: 'introduction_letter' },
  { value: 'BROCHURE', label: 'Brosur Produk', group: 'PROMOTIONAL_PROFILE', docType: 'brochure' },
  { value: 'COMPANY_PROFILE', label: 'Company Profile', group: 'PROMOTIONAL_PROFILE', docType: 'company_profile' },
  { value: 'PRODUCT_KNOWLEDGE', label: 'Product Knowledge / TDS', group: 'PRODUCT_KNOWLEDGE', docType: 'product_knowledge' },
  { value: 'PRICE_INCREASE_LETTER', label: 'Surat Kenaikan Harga', group: 'COMMERCIAL_NOTICE', docType: 'price_increase_letter' },
  { value: 'STOCK_DELAY_INFO', label: 'Info Keterlambatan Stok', group: 'COMMERCIAL_NOTICE', docType: 'stock_delay_info' },
];

const emptyDraft = (): ECatalogPayload => ({
  title: '',
  category: 'BROCHURE',
  description: '',
  itemId: '',
  fileUrl: '',
  fileName: '',
  fileType: '',
  version: '1.0',
  effectiveDate: todayStr(),
  isPublished: true,
});

export const ECatalogTab: React.FC = () => {
  const queryClient = useQueryClient();
  const { isSuperAdmin, isExecutive, isAdminBidang, userDivision } = useRBAC();

  const canCreateEdit = isSuperAdmin || isExecutive || userDivision === 'SALES' || userDivision === 'RND';
  const canDelete = isSuperAdmin || isExecutive || (isAdminBidang && (userDivision === 'SALES' || userDivision === 'RND'));

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ECatalogPayload>(emptyDraft);
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ECatalogRecord | null>(null);

  const { data: res, isLoading } = useQuery({
    queryKey: ['salesECatalog', page, search, groupFilter, categoryFilter],
    queryFn: () =>
      listECatalogApi({
        page,
        limit: 20,
        search: search || undefined,
        categoryGroup: groupFilter,
        category: categoryFilter,
      }),
  });
  const materials = res?.data || [];
  const totalPages = res?.meta?.totalPages || res?.meta?.total_pages || 1;

  const { data: items = [] } = useQuery({
    queryKey: ['salesDropdownItems'],
    queryFn: listSalesDropdownItemsApi,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['salesECatalog'] });

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload: ECatalogPayload = {
        ...draft,
        itemId: draft.itemId || null,
        effectiveDate: draft.effectiveDate || null,
      };
      if (editingId) return updateECatalogApi(editingId, payload);
      return createECatalogApi(payload);
    },
    onSuccess: () => {
      toast.success(editingId ? 'Materi E-Katalog diperbarui' : 'Materi baru ditambahkan ke E-Katalog');
      invalidate();
      setFormOpen(false);
      setEditingId(null);
      setDraft(emptyDraft());
    },
    onError: (err) => toast.error(extractSalesErrorMessage(err, 'Gagal menyimpan materi E-Katalog')),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteECatalogApi(id),
    onSuccess: () => {
      toast.success('Materi E-Katalog dihapus');
      invalidate();
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(extractSalesErrorMessage(err, 'Gagal menghapus materi')),
  });

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const catMeta = CATEGORIES.find((c) => c.value === draft.category);
    const docType: SalesDocType = catMeta?.docType || 'e_catalog';
    setUploading(true);
    try {
      const uploaded = await uploadSalesDocumentApi(docType, file);
      setDraft((prev) => ({
        ...prev,
        fileUrl: uploaded.fileUrl,
        fileName: uploaded.fileName,
        fileType: uploaded.fileType,
      }));
      toast.success(`File ${uploaded.fileName} berhasil diunggah`);
    } catch (err) {
      toast.error(extractSalesErrorMessage(err, 'Gagal mengunggah file materi'));
    } finally {
      setUploading(false);
    }
  };

  const getCategoryLabel = (val: string) => CATEGORIES.find((c) => c.value === val)?.label || val;

  return (
    <div className="space-y-4">
      {/* Category Group Filter Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 p-2 flex flex-wrap gap-2">
        {CATEGORY_GROUPS.map((g) => {
          const Icon = g.icon;
          const active = groupFilter === g.id;
          return (
            <button
              key={g.id}
              onClick={() => {
                setGroupFilter(g.id);
                setCategoryFilter('ALL');
                setPage(1);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                active ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{g.label}</span>
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Cari judul, kode materi..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-semibold"
          >
            <option value="ALL">Semua Sub-Kategori</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        {canCreateEdit && (
          <button
            onClick={() => {
              setEditingId(null);
              setDraft(emptyDraft());
              setFormOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Unggah Materi Baru (5.5)</span>
          </button>
        )}
      </div>

      {/* Form Panel */}
      {formOpen && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!draft.title.trim()) {
              toast.error('Judul materi wajib diisi');
              return;
            }
            saveMut.mutate();
          }}
          className="bg-white rounded-2xl border-2 border-amber-300 p-5 space-y-4 shadow-sm"
        >
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h3 className="text-sm font-black text-slate-900">
              {editingId ? 'Edit Materi E-Katalog' : 'Tambah Materi Pemasaran Digital (5.5)'}
            </h3>
            <button type="button" onClick={() => setFormOpen(false)} className="p-1 text-slate-400">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Judul Dokumen / Materi *</label>
              <input
                type="text"
                required
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="Brosur Automotive Masking Tape 2026"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Kategori Materi *</label>
              <select
                value={draft.category}
                onChange={(e) => setDraft({ ...draft, category: e.target.value as ECatalogCategory })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-semibold"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Versi &amp; Tanggal Efektif</label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={draft.version || '1.0'}
                  onChange={(e) => setDraft({ ...draft, version: e.target.value })}
                  placeholder="1.0"
                  className="w-20 px-2.5 py-2 text-xs rounded-xl border border-slate-300 font-mono"
                />
                <input
                  type="date"
                  value={draft.effectiveDate || ''}
                  onChange={(e) => setDraft({ ...draft, effectiveDate: e.target.value })}
                  className="flex-1 px-2.5 py-2 text-xs rounded-xl border border-slate-300"
                />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Tautkan Produk (Opsional)</label>
              <select
                value={draft.itemId || ''}
                onChange={(e) => setDraft({ ...draft, itemId: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white"
              >
                <option value="">-- Umum / Semua Produk --</option>
                {items.map((it) => (
                  <option key={it.id} value={it.id}>[{it.code}] {it.name}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Upload File Lampiran (PDF / Gambar / PPTX)</label>
              <div className="flex items-center gap-2">
                <label className="px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-bold cursor-pointer inline-flex items-center gap-1.5">
                  {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  <span>{draft.fileName || 'Pilih & Upload File'}</span>
                  <input type="file" className="hidden" onChange={handleUploadFile} />
                </label>
                {draft.fileUrl && (
                  <a
                    href={resolveSalesFileUrl(draft.fileUrl) || '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 text-xs font-bold underline"
                  >
                    Buka File
                  </a>
                )}
              </div>
            </div>
            <div className="sm:col-span-4">
              <label className="block text-xs font-bold text-slate-700 mb-1">Deskripsi / Ringkasan Isi</label>
              <textarea
                rows={2}
                value={draft.description || ''}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-200">
            <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={draft.isPublished !== false}
                onChange={(e) => setDraft({ ...draft, isPublished: e.target.checked })}
              />
              <span>Publikasikan ke E-Katalog Aktif</span>
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saveMut.isPending}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5"
              >
                {saveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Simpan Materi</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Cards Grid */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-xs text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" /> Memuat Repositori E-Katalog...
        </div>
      ) : materials.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center text-xs text-slate-400">
          Belum ada materi E-Katalog untuk filter ini.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {materials.map((m) => (
            <div
              key={m.id}
              className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between gap-3 hover:border-amber-300 transition-colors"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                    {m.materialCode} • v{m.version}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                      m.isPublished ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {m.isPublished ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    {m.isPublished ? 'Published' : 'Draft'}
                  </span>
                </div>
                <h4 className="text-sm font-black text-slate-900 leading-snug">{m.title}</h4>
                <div className="flex flex-wrap gap-1.5">
                  <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[11px] font-bold">
                    {getCategoryLabel(m.category)}
                  </span>
                  {m.itemCode && (
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-mono">
                      {m.itemCode}
                    </span>
                  )}
                </div>
                {m.description && <p className="text-xs text-slate-600 line-clamp-3">{m.description}</p>}
                <div className="text-[11px] text-slate-400">
                  Efektif: {m.effectiveDate || '-'} {m.uploadedBy ? `• oleh ${m.uploadedBy}` : ''}
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                {m.fileUrl ? (
                  <a
                    href={resolveSalesFileUrl(m.fileUrl) || '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold inline-flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Buka Lampiran {m.fileType ? `(${m.fileType.toUpperCase()})` : ''}</span>
                  </a>
                ) : (
                  <span className="text-[11px] text-slate-400 italic">Tanpa file lampiran</span>
                )}
                <div className="flex items-center gap-1">
                  {canCreateEdit && (
                    <button
                      onClick={() => {
                        setEditingId(m.id);
                        setDraft({
                          title: m.title,
                          category: m.category as ECatalogCategory,
                          description: m.description || '',
                          itemId: m.itemId || '',
                          fileUrl: m.fileUrl || '',
                          fileName: m.fileName || '',
                          fileType: m.fileType || '',
                          version: m.version,
                          effectiveDate: m.effectiveDate || '',
                          isPublished: m.isPublished,
                        });
                        setFormOpen(true);
                      }}
                      className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 cursor-pointer"
                      title="Edit Materi"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => setDeleteTarget(m)}
                      className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer"
                      title="Hapus Materi"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white rounded-2xl border border-slate-200 px-4 py-3 flex items-center justify-between text-xs text-slate-600">
          <span>Halaman <strong>{page}</strong> dari <strong>{totalPages}</strong></span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-1 rounded-lg border border-slate-300 font-bold disabled:opacity-40">Sebelumnya</button>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1 rounded-lg border border-slate-300 font-bold disabled:opacity-40">Selanjutnya</button>
          </div>
        </div>
      )}

      <ConfirmActionModal
        isOpen={Boolean(deleteTarget)}
        title="Hapus Materi E-Katalog"
        message={`Yakin ingin menghapus materi "${deleteTarget?.title || ''}"?`}
        confirmLabel="Ya, Hapus"
        confirmTone="danger"
        isLoading={deleteMut.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
      />
    </div>
  );
};

