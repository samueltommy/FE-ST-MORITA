import React, { useState } from 'react';
import {
  Plus,
  CheckCircle2,
  Pencil,
  Trash2,
  Save,
  X,
  Upload,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  listFinancePaymentsApi,
  listFinanceInvoicesApi,
  createInvoicePaymentApi,
  updateFinancePaymentApi,
  deleteFinancePaymentApi,
  reconcileFinancePaymentApi,
  uploadFinanceDocument,
  resolveFinanceFileUrl,
  extractFinanceErrorMessage,
  ArPaymentRecord,
  ArPaymentPayload,
} from '../../services/financeService';
import { formatIDR } from '../../utils/invoiceCalculator';
import { ConfirmActionModal } from '../core1_hrd/ConfirmActionModal';

interface Props {
  canMutate: boolean;
}

interface PaymentDraft {
  salesInvoiceId: string;
  paymentDate: string;
  paymentAmount: number;
  paymentMethod: ArPaymentPayload['paymentMethod'];
  bankAccount: string;
  referenceNumber: string;
  proofFileUrl: string;
  notes: string;
}

const todayStr = () => new Date().toISOString().split('T')[0];

const emptyDraft = (): PaymentDraft => ({
  salesInvoiceId: '',
  paymentDate: todayStr(),
  paymentAmount: 0,
  paymentMethod: 'BANK_TRANSFER',
  bankAccount: '',
  referenceNumber: '',
  proofFileUrl: '',
  notes: '',
});

export const ArPaymentsTab: React.FC<Props> = ({ canMutate }) => {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [reconFilter, setReconFilter] = useState('ALL');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [invoiceFilter, setInvoiceFilter] = useState('ALL');

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<PaymentDraft>(emptyDraft);
  const [uploading, setUploading] = useState(false);
  const [voidTarget, setVoidTarget] = useState<ArPaymentRecord | null>(null);

  const { data: paymentsRes, isLoading } = useQuery({
    queryKey: ['financePayments', page, reconFilter, methodFilter, invoiceFilter],
    queryFn: () =>
      listFinancePaymentsApi({
        page,
        limit: 20,
        reconciliationStatus: reconFilter,
        paymentMethod: methodFilter,
        salesInvoiceId: invoiceFilter,
      }),
  });
  const payments = paymentsRes?.data || [];
  const totalPages = paymentsRes?.meta?.totalPages || paymentsRes?.meta?.total_pages || 1;

  const { data: allInvoicesRes } = useQuery({
    queryKey: ['financeInvoicesDropdown'],
    queryFn: () => listFinanceInvoicesApi({ page: 1, limit: 100 }),
  });
  const allInvoices = allInvoicesRes?.data || [];
  const payableInvoices = allInvoices.filter(
    (inv) => inv.status === 'UNPAID' || inv.status === 'PARTIALLY_PAID'
  );

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['financePayments'] });
    queryClient.invalidateQueries({ queryKey: ['financeInvoices'] });
    queryClient.invalidateQueries({ queryKey: ['financeInvoicesDropdown'] });
    queryClient.invalidateQueries({ queryKey: ['financeInvoicePayments'] });
    queryClient.invalidateQueries({ queryKey: ['financeArSummary'] });
  };

  const createMutation = useMutation({
    mutationFn: ({ invoiceId, payload }: { invoiceId: string; payload: ArPaymentPayload }) =>
      createInvoicePaymentApi(invoiceId, payload),
    onSuccess: () => {
      toast.success('Mutasi pelunasan AR berhasil dicatat');
      setIsAdding(false);
      setDraft(emptyDraft());
      invalidateAll();
    },
    onError: (err: any) => toast.error(extractFinanceErrorMessage(err, 'Gagal mencatat pelunasan')),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<ArPaymentPayload> }) =>
      updateFinancePaymentApi(id, payload),
    onSuccess: () => {
      toast.success('Mutasi pelunasan berhasil diperbarui');
      setEditingId(null);
      setDraft(emptyDraft());
      invalidateAll();
    },
    onError: (err: any) => toast.error(extractFinanceErrorMessage(err, 'Gagal memperbarui pelunasan')),
  });

  const reconcileMutation = useMutation({
    mutationFn: (id: string) => reconcileFinancePaymentApi(id, 'RECONCILED'),
    onSuccess: () => {
      toast.success('Mutasi berhasil direkonsiliasi');
      invalidateAll();
    },
    onError: (err: any) => toast.error(extractFinanceErrorMessage(err, 'Gagal merekonsiliasi mutasi')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteFinancePaymentApi(id),
    onSuccess: () => {
      toast.success('Mutasi pelunasan di-void & saldo AR invoice dikembalikan');
      setVoidTarget(null);
      invalidateAll();
    },
    onError: (err: any) => toast.error(extractFinanceErrorMessage(err, 'Gagal membatalkan mutasi')),
  });

  const handleUploadProof = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadFinanceDocument('payment_proof', file);
      setDraft((prev) => ({ ...prev, proofFileUrl: url }));
      toast.success('Bukti pembayaran berhasil diunggah');
    } catch (err: any) {
      toast.error(err?.message || 'Gagal mengunggah bukti bayar');
    } finally {
      setUploading(false);
    }
  };

  const startAdd = () => {
    setEditingId(null);
    setDraft(emptyDraft());
    setIsAdding(true);
  };

  const startEdit = (p: ArPaymentRecord) => {
    setIsAdding(false);
    setEditingId(p.id);
    setDraft({
      salesInvoiceId: p.salesInvoiceId,
      paymentDate: p.paymentDate || todayStr(),
      paymentAmount: p.paymentAmount,
      paymentMethod: (p.paymentMethod as ArPaymentPayload['paymentMethod']) || 'BANK_TRANSFER',
      bankAccount: p.bankAccount || '',
      referenceNumber: p.referenceNumber || '',
      proofFileUrl: p.proofFileUrl || '',
      notes: p.notes || '',
    });
  };

  const cancelEditor = () => {
    setIsAdding(false);
    setEditingId(null);
    setDraft(emptyDraft());
  };

  const handleSave = () => {
    if (!editingId && !draft.salesInvoiceId) {
      toast.error('Silakan pilih Sales Invoice terlebih dahulu');
      return;
    }
    if (!draft.paymentAmount || draft.paymentAmount <= 0) {
      toast.error('Nominal pembayaran harus lebih dari 0');
      return;
    }
    const payload: ArPaymentPayload = {
      paymentDate: draft.paymentDate,
      paymentAmount: Number(draft.paymentAmount),
      paymentMethod: draft.paymentMethod,
      bankAccount: draft.bankAccount || undefined,
      referenceNumber: draft.referenceNumber || undefined,
      proofFileUrl: draft.proofFileUrl || null,
      notes: draft.notes || null,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, payload });
    } else {
      createMutation.mutate({ invoiceId: draft.salesInvoiceId, payload });
    }
  };

  const renderInlineEditorRow = (isNew: boolean, payment?: ArPaymentRecord) => (
    <tr className="bg-blue-50 border-b border-blue-200 align-top">
      <td className="px-3 py-2.5 font-mono text-xs font-bold text-blue-800 whitespace-nowrap">
        {isNew ? 'AUTO-PAY' : payment?.paymentNumber}
      </td>
      <td className="px-3 py-2.5">
        <input
          type="date"
          value={draft.paymentDate}
          onChange={(e) => setDraft({ ...draft, paymentDate: e.target.value })}
          className="px-2 py-1 rounded-md border border-slate-300 text-xs bg-white"
        />
      </td>
      <td className="px-3 py-2.5 min-w-[210px]">
        {isNew ? (
          <select
            value={draft.salesInvoiceId}
            onChange={(e) => {
              const inv = payableInvoices.find((i) => i.id === e.target.value);
              setDraft({
                ...draft,
                salesInvoiceId: e.target.value,
                paymentAmount: inv ? inv.outstandingAmount : draft.paymentAmount,
              });
            }}
            className="w-full px-2 py-1 rounded-md border border-slate-300 text-xs bg-white"
          >
            <option value="">-- Pilih Invoice Unpaid/Partial --</option>
            {payableInvoices.map((inv) => (
              <option key={inv.id} value={inv.id}>
                {inv.invoiceNumber} — {inv.customerName} (Sisa: {formatIDR(inv.outstandingAmount)})
              </option>
            ))}
          </select>
        ) : (
          <div>
            <div className="font-mono font-semibold text-slate-800">{payment?.invoiceNumber}</div>
            <div className="text-[11px] text-slate-500">{payment?.customerName}</div>
          </div>
        )}
      </td>
      <td className="px-3 py-2.5">
        <select
          value={draft.paymentMethod}
          onChange={(e) =>
            setDraft({ ...draft, paymentMethod: e.target.value as ArPaymentPayload['paymentMethod'] })
          }
          className="px-2 py-1 rounded-md border border-slate-300 text-xs bg-white"
        >
          <option value="BANK_TRANSFER">BANK_TRANSFER</option>
          <option value="CASH">CASH</option>
          <option value="GIRO">GIRO</option>
          <option value="CHEQUE">CHEQUE</option>
          <option value="VIRTUAL_ACCOUNT">VIRTUAL_ACCOUNT</option>
        </select>
      </td>
      <td className="px-3 py-2.5 space-y-1">
        <input
          type="text"
          placeholder="Rekening Kas/Bank..."
          value={draft.bankAccount}
          onChange={(e) => setDraft({ ...draft, bankAccount: e.target.value })}
          className="w-full px-2 py-1 rounded-md border border-slate-300 text-xs bg-white"
        />
        <input
          type="text"
          placeholder="Catatan (opsional)"
          value={draft.notes}
          onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
          className="w-full px-2 py-1 rounded-md border border-slate-300 text-[11px] bg-white"
        />
      </td>
      <td className="px-3 py-2.5 space-y-1">
        <input
          type="text"
          placeholder="No. Referensi..."
          value={draft.referenceNumber}
          onChange={(e) => setDraft({ ...draft, referenceNumber: e.target.value })}
          className="w-full px-2 py-1 rounded-md border border-slate-300 text-xs bg-white"
        />
        <label className="inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 text-[11px] font-semibold cursor-pointer">
          {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
          <span>{draft.proofFileUrl ? 'Ganti Bukti' : 'Upload Bukti'}</span>
          <input
            type="file"
            className="hidden"
            accept="image/*,.pdf"
            onChange={(e) => e.target.files?.[0] && handleUploadProof(e.target.files[0])}
          />
        </label>
      </td>
      <td className="px-3 py-2.5">
        <input
          type="number"
          value={draft.paymentAmount}
          onChange={(e) => setDraft({ ...draft, paymentAmount: Number(e.target.value) })}
          className="w-32 px-2 py-1 rounded-md border border-slate-300 text-xs font-mono text-right bg-white"
        />
      </td>
      <td className="px-3 py-2.5 text-center">
        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">
          {isNew ? 'BARU' : 'EDIT'}
        </span>
      </td>
      <td className="px-3 py-2.5 text-right whitespace-nowrap">
        <div className="inline-flex items-center gap-1">
          <button
            type="button"
            onClick={handleSave}
            disabled={createMutation.isPending || updateMutation.isPending || uploading}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Simpan</span>
          </button>
          <button
            type="button"
            onClick={cancelEditor}
            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Batal</span>
          </button>
        </div>
      </td>
    </tr>
  );

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={reconFilter}
            onChange={(e) => {
              setReconFilter(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
          >
            <option value="ALL">Semua Rekonsiliasi</option>
            <option value="UNRECONCILED">UNRECONCILED</option>
            <option value="RECONCILED">RECONCILED</option>
          </select>
          <select
            value={methodFilter}
            onChange={(e) => {
              setMethodFilter(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
          >
            <option value="ALL">Semua Metode Bayar</option>
            <option value="BANK_TRANSFER">BANK_TRANSFER</option>
            <option value="CASH">CASH</option>
            <option value="GIRO">GIRO</option>
            <option value="CHEQUE">CHEQUE</option>
            <option value="VIRTUAL_ACCOUNT">VIRTUAL_ACCOUNT</option>
          </select>
          <select
            value={invoiceFilter}
            onChange={(e) => {
              setInvoiceFilter(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white max-w-[220px]"
          >
            <option value="ALL">Semua Invoice</option>
            {allInvoices.map((inv) => (
              <option key={inv.id} value={inv.id}>
                {inv.invoiceNumber} — {inv.customerName}
              </option>
            ))}
          </select>
        </div>

        {canMutate && (
          <button
            type="button"
            onClick={startAdd}
            disabled={isAdding}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>+ Catat Pelunasan</span>
          </button>
        )}
      </div>

      {/* Inline Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase">
                <th className="px-3 py-2.5">No. Pembayaran</th>
                <th className="px-3 py-2.5">Tanggal</th>
                <th className="px-3 py-2.5">No. Invoice &amp; Customer</th>
                <th className="px-3 py-2.5">Metode Bayar</th>
                <th className="px-3 py-2.5">Rekening Kas/Bank</th>
                <th className="px-3 py-2.5">No. Referensi &amp; Bukti</th>
                <th className="px-3 py-2.5 text-right">Nominal Bayar</th>
                <th className="px-3 py-2.5 text-center">Status Rekonsiliasi</th>
                <th className="px-3 py-2.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {isAdding && renderInlineEditorRow(true)}

              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Memuat mutasi pelunasan AR...
                  </td>
                </tr>
              ) : payments.length === 0 && !isAdding ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400">
                    Belum ada mutasi pelunasan AR.
                  </td>
                </tr>
              ) : (
                payments.map((p) => {
                  if (editingId === p.id) {
                    return <React.Fragment key={p.id}>{renderInlineEditorRow(false, p)}</React.Fragment>;
                  }
                  const isReconciled = p.reconciliationStatus === 'RECONCILED';
                  const fileHref = resolveFinanceFileUrl(p.proofFileUrl);

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-3 py-2.5 font-mono font-bold text-slate-800 whitespace-nowrap">
                        {p.paymentNumber}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">{p.paymentDate}</td>
                      <td className="px-3 py-2.5">
                        <div className="font-mono font-semibold text-blue-700">{p.invoiceNumber}</div>
                        <div className="text-[11px] text-slate-500">{p.customerName}</div>
                      </td>
                      <td className="px-3 py-2.5 font-medium">{p.paymentMethod}</td>
                      <td className="px-3 py-2.5">
                        <div>{p.bankAccount || '-'}</div>
                        {p.notes && <div className="text-[11px] text-slate-400 truncate max-w-[160px]">{p.notes}</div>}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-mono">{p.referenceNumber || '-'}</div>
                        {fileHref && (
                          <a
                            href={fileHref}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline mt-0.5"
                          >
                            <ExternalLink className="w-3 h-3" /> Lihat Bukti
                          </a>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                        {formatIDR(p.paymentAmount)}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {isReconciled ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-bold">
                            <CheckCircle2 className="w-3 h-3" /> RECONCILED
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold">
                            UNRECONCILED
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          {canMutate && !isReconciled && (
                            <button
                              type="button"
                              onClick={() => reconcileMutation.mutate(p.id)}
                              disabled={reconcileMutation.isPending}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold cursor-pointer"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Rekonsiliasi</span>
                            </button>
                          )}
                          {canMutate && !isReconciled && (
                            <button
                              type="button"
                              onClick={() => startEdit(p)}
                              title="Edit Inline"
                              className="p-1.5 rounded-lg border border-slate-200 hover:bg-blue-50 text-blue-600 cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {canMutate && (
                            <button
                              type="button"
                              onClick={() => setVoidTarget(p)}
                              title="Void / Batal"
                              className="p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 text-rose-600 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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

        {/* Pagination */}
        <div className="px-4 py-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>
            Halaman {page} dari {totalPages}
          </span>
          <div className="flex gap-1.5">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
            >
              Prev
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-2.5 py-1 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <ConfirmActionModal
        open={Boolean(voidTarget)}
        title="Batalkan / Void Mutasi Pelunasan?"
        message={`Anda yakin ingin membatalkan pembayaran ${voidTarget?.paymentNumber || ''}? Saldo piutang (Outstanding) pada Sales Invoice terkait akan otomatis dikembalikan.`}
        confirmLabel="Ya, Void Pembayaran"
        variant="danger"
        loading={deleteMutation.isPending}
        onConfirm={() => voidTarget && deleteMutation.mutate(voidTarget.id)}
        onCancel={() => setVoidTarget(null)}
      />
    </div>
  );
};
