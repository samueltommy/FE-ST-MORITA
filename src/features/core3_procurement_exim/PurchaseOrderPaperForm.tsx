import React, { useMemo, useState } from 'react';
// Catatan: lebar kolom summary (150px + 160px) = kolom Harga + Jumlah pada GRID_COLS.
import { Plus, Trash2, Save, Printer, ArrowLeft, Building2, FileText } from 'lucide-react';

/* ──────────────────────────────────────────────────────────────
 * Paper-Replica Purchase Order form
 * Semua bagian (tabel + footer) memakai TEMPLATE KOLOM YANG SAMA
 * sehingga kolom "Jumlah" di tabel & nominal Subtotal/PPN/Grand Total
 * sejajar lurus.
 * ────────────────────────────────────────────────────────────── */

// No | Kode | Nama Barang | Qty | Satuan | Harga | Jumlah | (hapus)
const GRID_COLS = '44px 140px minmax(220px,1fr) 90px 84px 150px 160px 40px';
const MIN_TABLE_WIDTH = 960; // jaga bentuk kolom di monitor pabrik; scroll horizontal jika lebih sempit

export interface POLine {
  key: string;
  code: string;
  name: string;
  qty: string;
  unit: string;
  price: string;
}

export interface PurchaseOrderDraft {
  supplierName: string;
  supplierAddress: string;
  supplierContact: string;
  poNumber: string;
  poDate: string;
  reference: string;
  notes: string;
  taxRate: number;
  items: { code: string; name: string; qty: number; unit: string; price: number; amount: number }[];
  subtotal: number;
  tax: number;
  grandTotal: number;
}

interface PurchaseOrderPaperFormProps {
  onSubmit?: (draft: PurchaseOrderDraft) => void | Promise<void>;
  onBack?: () => void;
  defaultPoNumber?: string;
}

const newLine = (): POLine => ({
  key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  code: '',
  name: '',
  qty: '',
  unit: 'PCS',
  price: '',
});

const toNum = (v: string) => {
  const n = parseFloat(v.replace(/,/g, '.'));
  return Number.isFinite(n) ? n : 0;
};
const rupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);

/* Input "tanpa kotak" ala sel Excel / garis nota */
const cell =
  'w-full h-10 px-2 bg-transparent text-sm text-slate-900 placeholder:text-slate-300 border-0 outline-hidden focus:bg-blue-50 focus:ring-2 focus:ring-inset focus:ring-blue-500 transition-colors';

const fieldLabel = 'text-xs font-black uppercase tracking-wider text-slate-500';
const boxInput =
  'w-full px-2.5 py-1.5 text-sm text-slate-900 bg-white border border-slate-300 rounded-md outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-200 placeholder:text-slate-300';

export const PurchaseOrderPaperForm: React.FC<PurchaseOrderPaperFormProps> = ({
  onSubmit,
  onBack,
  defaultPoNumber = 'PO/AUTO',
}) => {
  const [supplierName, setSupplierName] = useState('');
  const [supplierAddress, setSupplierAddress] = useState('');
  const [supplierContact, setSupplierContact] = useState('');
  const [poNumber, setPoNumber] = useState(defaultPoNumber);
  const [poDate, setPoDate] = useState(new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [taxRate, setTaxRate] = useState(11);
  const [lines, setLines] = useState<POLine[]>(() => [newLine(), newLine(), newLine()]);
  const [saving, setSaving] = useState(false);

  const updateLine = (key: string, patch: Partial<POLine>) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const removeLine = (key: string) => setLines((ls) => (ls.length > 1 ? ls.filter((l) => l.key !== key) : ls));
  const addLine = () => setLines((ls) => [...ls, newLine()]);

  const totals = useMemo(() => {
    const subtotal = lines.reduce((s, l) => s + toNum(l.qty) * toNum(l.price), 0);
    const tax = Math.round(subtotal * (taxRate / 100));
    return { subtotal, tax, grandTotal: subtotal + tax };
  }, [lines, taxRate]);

  /** Enter pada baris terakhir → baris baru, seperti mengisi nota/Excel */
  const handleCellKey = (e: React.KeyboardEvent<HTMLInputElement>, idx: number, isLastCol: boolean) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (isLastCol && idx === lines.length - 1) addLine();
      const form = e.currentTarget.form;
      if (!form) return;
      const focusables = Array.from(form.querySelectorAll('input[data-grid-cell]')) as HTMLInputElement[];
      const i = focusables.indexOf(e.currentTarget);
      requestAnimationFrame(() => {
        const refreshed = Array.from(form.querySelectorAll('input[data-grid-cell]')) as HTMLInputElement[];
        refreshed[i + 1]?.focus();
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const items = lines
      .filter((l) => l.name.trim() || l.code.trim())
      .map((l) => {
        const qty = toNum(l.qty);
        const price = toNum(l.price);
        return { code: l.code.trim(), name: l.name.trim(), qty, unit: l.unit.trim(), price, amount: qty * price };
      });
    if (!supplierName.trim() || items.length === 0) {
      alert('Lengkapi Nama Supplier dan minimal satu baris barang.');
      return;
    }
    setSaving(true);
    try {
      await onSubmit?.({
        supplierName: supplierName.trim(),
        supplierAddress,
        supplierContact,
        poNumber,
        poDate,
        reference,
        notes,
        taxRate,
        items,
        ...totals,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full bg-gray-50 -m-1 p-1 sm:p-2 rounded-2xl">
      <form onSubmit={handleSubmit} className="max-w-[1100px] mx-auto space-y-4">
        {/* Toolbar atas */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-sm font-bold cursor-pointer transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Kembali
              </button>
            )}
            <h1 className="text-lg sm:text-xl font-black uppercase tracking-wide text-slate-900">
              Input Purchase Order
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-blue-600 text-blue-700 hover:bg-blue-50 text-sm font-bold cursor-pointer transition-colors"
            >
              <Printer className="w-4 h-4" /> Cetak
            </button>
            <button
              id="po-save"
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-700 disabled:opacity-60 text-white text-sm font-black shadow-sm cursor-pointer transition-all"
            >
              <Save className="w-4 h-4" /> {saving ? 'MENYIMPAN…' : 'SIMPAN PO'}
            </button>
          </div>
        </div>

        {/* ═════════════ KERTAS ═════════════ */}
        <article className="bg-white border border-slate-200 shadow-sm rounded-lg overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-blue-600 via-blue-500 to-emerald-500" />
          <div className="p-5 sm:p-8 space-y-6">
            {/* Judul dokumen */}
            <header className="flex items-start justify-between border-b-2 border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-base font-black tracking-wide text-slate-900">ST. MORITA INDUSTRIES</div>
                  <div className="text-xs text-slate-500">Kawasan Berikat · Departemen Purchasing</div>
                </div>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-[0.2em] text-slate-800">PURCHASE ORDER</h2>
            </header>

            {/* ── ATAS: dua kolom ── */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Kiri: Supplier */}
              <fieldset className="border border-slate-300 rounded-md p-4 space-y-3">
                <legend className="px-2 -ml-1 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-blue-700">
                  <Building2 className="w-3.5 h-3.5" /> Kepada (Supplier)
                </legend>
                <div>
                  <label htmlFor="po-supplier" className={fieldLabel}>Nama Supplier</label>
                  <input id="po-supplier" className={boxInput} value={supplierName} onChange={(e) => setSupplierName(e.target.value)} placeholder="PT. …" />
                </div>
                <div>
                  <label htmlFor="po-address" className={fieldLabel}>Alamat</label>
                  <textarea id="po-address" rows={2} className={`${boxInput} resize-none`} value={supplierAddress} onChange={(e) => setSupplierAddress(e.target.value)} placeholder="Alamat lengkap" />
                </div>
                <div>
                  <label htmlFor="po-contact" className={fieldLabel}>Kontak / Telepon</label>
                  <input id="po-contact" className={boxInput} value={supplierContact} onChange={(e) => setSupplierContact(e.target.value)} placeholder="Nama PIC / No. telepon" />
                </div>
              </fieldset>

              {/* Kanan: Nomor, Tanggal, Referensi */}
              <fieldset className="border border-slate-300 rounded-md p-4">
                <legend className="px-2 -ml-1 text-xs font-black uppercase tracking-wider text-blue-700">
                  Dokumen
                </legend>
                <dl className="grid grid-cols-[120px_1fr] items-center gap-x-3 gap-y-3">
                  <dt><label htmlFor="po-number" className={fieldLabel}>No. PO</label></dt>
                  <dd><input id="po-number" className={`${boxInput} font-mono font-bold`} value={poNumber} onChange={(e) => setPoNumber(e.target.value)} /></dd>
                  <dt><label htmlFor="po-date" className={fieldLabel}>Tanggal</label></dt>
                  <dd><input id="po-date" type="date" className={boxInput} value={poDate} onChange={(e) => setPoDate(e.target.value)} /></dd>
                  <dt><label htmlFor="po-ref" className={fieldLabel}>Referensi (PR)</label></dt>
                  <dd><input id="po-ref" className={boxInput} value={reference} onChange={(e) => setReference(e.target.value)} placeholder="No. PR / Kontrak" /></dd>
                </dl>
              </fieldset>
            </section>

            {/* ── TENGAH: Editable grid ── */}
            <section aria-label="Detail barang" className="space-y-2">
              <div className="overflow-x-auto border border-slate-300 rounded-md">
                <div style={{ minWidth: MIN_TABLE_WIDTH }}>
                  {/* Header */}
                  <div
                    className="grid bg-slate-800 text-white text-xs font-black uppercase tracking-wider"
                    style={{ gridTemplateColumns: GRID_COLS }}
                  >
                    <div className="px-2 py-2.5 text-center">No</div>
                    <div className="px-2 py-2.5 border-l border-slate-600">Kode Barang</div>
                    <div className="px-2 py-2.5 border-l border-slate-600">Nama Barang</div>
                    <div className="px-2 py-2.5 border-l border-slate-600 text-right">Qty</div>
                    <div className="px-2 py-2.5 border-l border-slate-600">Satuan</div>
                    <div className="px-2 py-2.5 border-l border-slate-600 text-right">Harga (Rp)</div>
                    <div className="px-2 py-2.5 border-l border-slate-600 text-right">Jumlah (Rp)</div>
                    <div />
                  </div>

                  {/* Rows */}
                  {lines.map((l, idx) => {
                    const amount = toNum(l.qty) * toNum(l.price);
                    return (
                      <div
                        key={l.key}
                        className="grid items-center border-t border-slate-200 odd:bg-white even:bg-slate-50/50 hover:bg-blue-50/40 group"
                        style={{ gridTemplateColumns: GRID_COLS }}
                      >
                        <div className="text-center text-xs font-bold text-slate-400">{idx + 1}</div>
                        <div className="border-l border-slate-200">
                          <input data-grid-cell aria-label={`Kode barang baris ${idx + 1}`} className={`${cell} font-mono`} value={l.code} onChange={(e) => updateLine(l.key, { code: e.target.value })} onKeyDown={(e) => handleCellKey(e, idx, false)} placeholder="Kode" />
                        </div>
                        <div className="border-l border-slate-200">
                          <input data-grid-cell aria-label={`Nama barang baris ${idx + 1}`} className={cell} value={l.name} onChange={(e) => updateLine(l.key, { name: e.target.value })} onKeyDown={(e) => handleCellKey(e, idx, false)} placeholder="Nama barang" />
                        </div>
                        <div className="border-l border-slate-200">
                          <input data-grid-cell inputMode="decimal" aria-label={`Qty baris ${idx + 1}`} className={`${cell} text-right font-mono`} value={l.qty} onChange={(e) => updateLine(l.key, { qty: e.target.value.replace(/[^0-9.,]/g, '') })} onKeyDown={(e) => handleCellKey(e, idx, false)} placeholder="0" />
                        </div>
                        <div className="border-l border-slate-200">
                          <input data-grid-cell aria-label={`Satuan baris ${idx + 1}`} className={`${cell} uppercase`} value={l.unit} onChange={(e) => updateLine(l.key, { unit: e.target.value })} onKeyDown={(e) => handleCellKey(e, idx, false)} />
                        </div>
                        <div className="border-l border-slate-200">
                          <input data-grid-cell inputMode="decimal" aria-label={`Harga baris ${idx + 1}`} className={`${cell} text-right font-mono`} value={l.price} onChange={(e) => updateLine(l.key, { price: e.target.value.replace(/[^0-9.,]/g, '') })} onKeyDown={(e) => handleCellKey(e, idx, true)} placeholder="0" />
                        </div>
                        <div className="border-l border-slate-200 px-2 h-10 flex items-center justify-end font-mono text-sm font-bold text-slate-800 tabular-nums">
                          {amount ? rupiah(amount) : <span className="text-slate-300">0</span>}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeLine(l.key)}
                          aria-label={`Hapus baris ${idx + 1}`}
                          className="h-10 flex items-center justify-center text-slate-300 hover:text-rose-600 opacity-60 group-hover:opacity-100 transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <button
                id="po-add-row"
                type="button"
                onClick={addLine}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border-2 border-dashed border-blue-400 text-blue-700 hover:bg-blue-50 hover:border-blue-600 text-sm font-black transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Tambah Baris
              </button>
              <span className="ml-3 text-xs text-slate-400">Tips: tekan Enter untuk pindah sel; Enter di kolom Harga baris terakhir menambah baris baru.</span>
            </section>

            {/* ── BAWAH: dua kolom, kanan sejajar kolom Harga/Jumlah ── */}
            <section className="overflow-x-auto">
              <div
                className="grid gap-y-4 items-start"
                style={{ minWidth: MIN_TABLE_WIDTH, gridTemplateColumns: GRID_COLS }}
              >
                {/* Kiri: Notes + Tanda tangan (kolom 1–5) */}
                <div className="col-span-5 pr-6 space-y-4">
                  <div>
                    <label htmlFor="po-notes" className={fieldLabel}>Catatan (Notes)</label>
                    <textarea id="po-notes" rows={3} className={`${boxInput} resize-none mt-1`} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Syarat pembayaran, jadwal kirim, dsb." />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {['Dibuat oleh', 'Disetujui oleh', 'Supplier'].map((role) => (
                      <div key={role} className="border border-slate-300 rounded-md h-28 flex flex-col justify-between p-2">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-500 text-center">{role}</span>
                        <div className="border-t border-slate-400 pt-1 text-center text-xs text-slate-400">( Nama & Tanda Tangan )</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Kanan: Summary (label di kolom Harga, nominal di kolom Jumlah) */}
                <div className="grid grid-cols-[150px_160px] items-center text-sm" style={{ gridColumn: '6 / span 2' }}>
                  <div className="py-2 text-right pr-3 text-slate-600 font-bold">Subtotal</div>
                  <div className="py-2 px-2 text-right font-mono font-bold tabular-nums">{rupiah(totals.subtotal)}</div>

                  <div className="py-2 text-right pr-3 text-slate-600 font-bold flex items-center justify-end gap-1.5">
                    PPN
                    <input
                      aria-label="Persentase PPN"
                      inputMode="decimal"
                      value={taxRate}
                      onChange={(e) => setTaxRate(Math.max(0, Math.min(100, toNum(e.target.value))))}
                      className="w-12 h-7 px-1 text-right text-xs font-mono border border-slate-300 rounded-sm outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-300"
                    />
                    %
                  </div>
                  <div className="py-2 px-2 text-right font-mono font-bold tabular-nums">{rupiah(totals.tax)}</div>

                  <div className="py-3 text-right pr-3 font-black uppercase tracking-wide text-slate-900 border-t-2 border-slate-800">Grand Total</div>
                  <div className="py-3 px-2 text-right font-mono font-black text-lg tabular-nums text-emerald-700 border-t-2 border-slate-800">
                    {rupiah(totals.grandTotal)}
                  </div>
                </div>
              </div>
            </section>
          </div>
        </article>
      </form>
    </div>
  );
};
