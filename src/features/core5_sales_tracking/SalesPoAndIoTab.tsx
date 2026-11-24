import React, { useState } from 'react';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Save,
  X,
  Upload,
  ExternalLink,
  ArrowRightCircle,
  Printer,
  CheckCircle2,
  Loader2,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  listSalesCustomerPosApi,
  createSalesCustomerPoApi,
  updateSalesCustomerPoApi,
  deleteSalesCustomerPoApi,
  listSalesIncomingOrdersApi,
  createSalesIncomingOrderApi,
  createSalesIncomingOrderFromQuotationApi,
  deleteSalesIncomingOrderApi,
  confirmSalesIoManagerMarketingApi,
  confirmSalesIoCostControlApi,
  printSalesIncomingOrderApi,
  listSalesQuotationsApi,
  listSalesDropdownCustomersApi,
  listSalesDropdownItemsApi,
  uploadSalesDocumentApi,
  resolveSalesFileUrl,
  extractSalesErrorMessage,
  SalesCustomerPoPayload,
  SalesCustomerPoRecord,
  SalesCustomerPoItemPayload,
  SalesIncomingOrderRecord,
} from '../../services/salesService';
import { formatIDR } from '../../utils/invoiceCalculator';
import { ConfirmActionModal } from '../core1_hrd/ConfirmActionModal';
import { useRBAC } from '../../hooks/useRBAC';

const todayStr = () => new Date().toISOString().split('T')[0];

interface Props {
  initialSection?: 'po' | 'io';
}

const emptyPoDraft = (): SalesCustomerPoPayload => ({
  poNumber: '',
  customerId: '',
  quotationId: '',
  date: todayStr(),
  paymentTerm: 'NET 30',
  discount: 0,
  freight: 0,
  taxRate: 11,
  fileUrl: '',
  emailSender: '',
  emailSubject: '',
  notes: '',
  status: 'OPEN',
  items: [{ itemId: '', qty: 1, unitPrice: 0, deliveryDeadline: '' }],
});

export const SalesPoAndIoTab: React.FC<Props> = ({ initialSection = 'po' }) => {
  const queryClient = useQueryClient();
  const { isSuperAdmin, isExecutive, isAdminBidang, userDivision, hasPermission } = useRBAC();

  const canMutatePo = isSuperAdmin || isExecutive || userDivision === 'SALES' || userDivision === 'FINANCE';
  const canConfirmMgrMkt = isSuperAdmin || isExecutive || (isAdminBidang && userDivision === 'SALES');
  const canConfirmCostCtrl =
    isSuperAdmin || isExecutive || (isAdminBidang && userDivision === 'FINANCE') || hasPermission('cost_control:margin:approve');

  const [section, setSection] = useState<'po' | 'io'>(initialSection);

  // PO States
  const [poPage, setPoPage] = useState(1);
  const [poSearch, setPoSearch] = useState('');
  const [poStatus, setPoStatus] = useState('ALL');
  const [poFormOpen, setPoFormOpen] = useState(false);
  const [editingPoId, setEditingPoId] = useState<string | null>(null);
  const [poDraft, setPoDraft] = useState<SalesCustomerPoPayload>(emptyPoDraft);
  const [uploadingPo, setUploadingPo] = useState(false);
  const [deletePoTarget, setDeletePoTarget] = useState<SalesCustomerPoRecord | null>(null);

  // Convert PO -> IO Modal
  const [convertPoTarget, setConvertPoTarget] = useState<SalesCustomerPoRecord | null>(null);
  const [ioEstDate, setIoEstDate] = useState('');
  const [ioDeliverTo, setIoDeliverTo] = useState('');
  const [ioNotes, setIoNotes] = useState('');

  // Create IO Directly from Quotation Modal
  const [fromQuoteOpen, setFromQuoteOpen] = useState(false);
  const [fqQuotationId, setFqQuotationId] = useState('');
  const [fqPoNumber, setFqPoNumber] = useState('');
  const [fqPoDate, setFqPoDate] = useState(todayStr());
  const [fqNotes, setFqNotes] = useState('');

  // IO States
  const [ioPage, setIoPage] = useState(1);
  const [ioStatus, setIoStatus] = useState('ALL');
  const [deleteIoTarget, setDeleteIoTarget] = useState<SalesIncomingOrderRecord | null>(null);

  const { data: poRes, isLoading: poLoading } = useQuery({
    queryKey: ['salesCustomerPos', poPage, poSearch, poStatus],
    queryFn: () =>
      listSalesCustomerPosApi({
        page: poPage,
        limit: 20,
        search: poSearch || undefined,
        status: poStatus,
      }),
  });
  const pos = poRes?.data || [];
  const poTotalPages = poRes?.meta?.totalPages || poRes?.meta?.total_pages || 1;

  const { data: ioRes, isLoading: ioLoading } = useQuery({
    queryKey: ['salesIncomingOrders', ioPage, ioStatus],
    queryFn: () => listSalesIncomingOrdersApi({ page: ioPage, limit: 20, status: ioStatus }),
  });
  const ios = ioRes?.data || [];
  const ioTotalPages = ioRes?.meta?.totalPages || ioRes?.meta?.total_pages || 1;

  const { data: customers = [] } = useQuery({
    queryKey: ['salesDropdownCustomers'],
    queryFn: listSalesDropdownCustomersApi,
  });
  const { data: items = [] } = useQuery({
    queryKey: ['salesDropdownItems'],
    queryFn: listSalesDropdownItemsApi,
  });
  const { data: approvedQuotesRes } = useQuery({
    queryKey: ['salesApprovedQuotationsDropdown'],
    queryFn: () => listSalesQuotationsApi({ page: 1, limit: 100 }),
  });
  const allQuotes = approvedQuotesRes?.data || [];

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['salesCustomerPos'] });
    queryClient.invalidateQueries({ queryKey: ['salesIncomingOrders'] });
    queryClient.invalidateQueries({ queryKey: ['financeCustomerPos'] });
    queryClient.invalidateQueries({ queryKey: ['financeIncomingOrders'] });
  };

  const poSubtotal = poDraft.items.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.unitPrice) || 0), 0);
  const poDpp = Math.max(0, poSubtotal - (Number(poDraft.discount) || 0) + (Number(poDraft.freight) || 0));
  const poGrandTotal = poDpp + poDpp * ((Number(poDraft.taxRate) || 0) / 100);

  const savePoMut = useMutation({
    mutationFn: async () => {
      const cleanItems = poDraft.items.filter((x) => x.itemId).map((x) => ({
        itemId: x.itemId,
        qty: Number(x.qty) || 1,
        unitPrice: Number(x.unitPrice) || 0,
        deliveryDeadline: x.deliveryDeadline || null,
      }));
      const payload: SalesCustomerPoPayload = {
        ...poDraft,
        quotationId: poDraft.quotationId || null,
        totalAmount: Math.round(poGrandTotal),
        items: cleanItems,
      };
      if (editingPoId) return updateSalesCustomerPoApi(editingPoId, payload);
      return createSalesCustomerPoApi(payload);
    },
    onSuccess: () => {
      toast.success(editingPoId ? 'PO Customer berhasil diperbarui' : 'PO Customer berhasil disimpan');
      invalidate();
      setPoFormOpen(false);
      setEditingPoId(null);
      setPoDraft(emptyPoDraft());
    },
    onError: (err) => toast.error(extractSalesErrorMessage(err, 'Gagal menyimpan PO Customer')),
  });

  const deletePoMut = useMutation({
    mutationFn: (id: string) => deleteSalesCustomerPoApi(id),
    onSuccess: () => {
      toast.success('PO Customer berhasil dihapus');
      invalidate();
      setDeletePoTarget(null);
    },
    onError: (err) => toast.error(extractSalesErrorMessage(err, 'Gagal menghapus PO Customer')),
  });

  const convertToIoMut = useMutation({
    mutationFn: () => {
      if (!convertPoTarget) throw new Error('PO belum dipilih');
      return createSalesIncomingOrderApi({
        customerPoId: convertPoTarget.id,
        date: todayStr(),
        estimatedDeliveryDate: ioEstDate || null,
        deliverTo: ioDeliverTo || null,
        notes: ioNotes || null,
      });
    },
    onSuccess: () => {
      toast.success('PO Customer berhasil dikonversi menjadi Incoming Order (IO)');
      invalidate();
      setConvertPoTarget(null);
      setIoEstDate('');
      setIoDeliverTo('');
      setIoNotes('');
      setSection('io');
    },
    onError: (err) => toast.error(extractSalesErrorMessage(err, 'Gagal mengonversi PO ke IO')),
  });

  const createFromQuoteMut = useMutation({
    mutationFn: async () => {
      const q = allQuotes.find((x) => x.id === fqQuotationId);
      if (!q) throw new Error('Pilih Quotation terlebih dahulu');
      if (!fqPoNumber.trim()) throw new Error('Nomor PO Customer wajib diisi');
      return createSalesIncomingOrderFromQuotationApi({
        quotationId: q.id,
        customerPoNumber: fqPoNumber.trim(),
        customerPoDate: fqPoDate,
        notes: fqNotes || null,
        items: q.items.map((it) => ({
          itemId: it.itemId,
          orderedQty: it.qty,
          unitPrice: it.unitPrice,
        })),
      });
    },
    onSuccess: () => {
      toast.success('Incoming Order berhasil diterbitkan langsung dari Quotation');
      invalidate();
      setFromQuoteOpen(false);
      setFqQuotationId('');
      setFqPoNumber('');
      setFqNotes('');
    },
    onError: (err) => toast.error(extractSalesErrorMessage(err, 'Gagal membuat IO dari Quotation')),
  });

  const deleteIoMut = useMutation({
    mutationFn: (id: string) => deleteSalesIncomingOrderApi(id),
    onSuccess: () => {
      toast.success('Incoming Order berhasil dibatalkan');
      invalidate();
      setDeleteIoTarget(null);
    },
    onError: (err) => toast.error(extractSalesErrorMessage(err, 'Gagal membatalkan IO')),
  });

  const confirmIoMgrMut = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'APPROVE' | 'REJECT' }) =>
      confirmSalesIoManagerMarketingApi(id, action),
    onSuccess: () => {
      toast.success('Konfirmasi Manager Marketing pada IO berhasil');
      invalidate();
    },
    onError: (err) => toast.error(extractSalesErrorMessage(err, 'Gagal konfirmasi Manager Marketing')),
  });

  const confirmIoCcMut = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'APPROVE' | 'REJECT' }) =>
      confirmSalesIoCostControlApi(id, action),
    onSuccess: () => {
      toast.success('Konfirmasi Cost Control pada IO berhasil');
      invalidate();
    },
    onError: (err) => toast.error(extractSalesErrorMessage(err, 'Gagal konfirmasi Cost Control')),
  });

  const handleUploadPoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPo(true);
    try {
      const uploaded = await uploadSalesDocumentApi('customer_po', file);
      setPoDraft((prev) => ({ ...prev, fileUrl: uploaded.fileUrl }));
      toast.success(`Lampiran PO (${uploaded.fileName}) berhasil diunggah`);
    } catch (err) {
      toast.error(extractSalesErrorMessage(err, 'Gagal mengunggah file PO'));
    } finally {
      setUploadingPo(false);
    }
  };

  const updatePoItem = (idx: number, patch: Partial<SalesCustomerPoItemPayload>) => {
    setPoDraft((prev) => ({
      ...prev,
      items: prev.items.map((row, i) => (i === idx ? { ...row, ...patch } : row)),
    }));
  };

  const badgeTone = (st: string) => {
    const s = st.toUpperCase();
    if (s.includes('APPROVED') || s.includes('CONFIRMED') || s.includes('CONVERTED')) return 'bg-emerald-100 text-emerald-800';
    if (s.includes('REJECTED') || s.includes('CANCELLED')) return 'bg-rose-100 text-rose-800';
    if (s.includes('PENDING') || s === 'OPEN') return 'bg-amber-100 text-amber-800';
    return 'bg-slate-100 text-slate-700';
  };

  return (
    <div className="space-y-4">
      {/* Sub-tab Switcher */}
      <div className="bg-white rounded-2xl border border-slate-200 p-2 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setSection('po')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            section === 'po' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>5.2.1 Customer Purchase Order ({pos.length})</span>
        </button>
        <button
          onClick={() => setSection('io')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            section === 'io' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>5.2.2 &amp; 5.2.3 Incoming Order (IO) &amp; Konfirmasi ({ios.length})</span>
        </button>
      </div>

      {/* SECTION A: 5.2.1 CUSTOMER PO */}
      {section === 'po' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={poSearch}
                  onChange={(e) => {
                    setPoSearch(e.target.value);
                    setPoPage(1);
                  }}
                  placeholder="Cari No. PO / Customer..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <select
                value={poStatus}
                onChange={(e) => {
                  setPoStatus(e.target.value);
                  setPoPage(1);
                }}
                className="px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-semibold"
              >
                <option value="ALL">Semua Status PO</option>
                <option value="OPEN">OPEN</option>
                <option value="CONVERTED_TO_IO">CONVERTED_TO_IO</option>
              </select>
            </div>
            {canMutatePo && (
              <button
                onClick={() => {
                  setEditingPoId(null);
                  setPoDraft(emptyPoDraft());
                  setPoFormOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Input PO Customer (5.2.1)</span>
              </button>
            )}
          </div>

          {poFormOpen && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!poDraft.poNumber.trim() || !poDraft.customerId) {
                  toast.error('Nomor PO dan Customer wajib diisi');
                  return;
                }
                savePoMut.mutate();
              }}
              className="bg-white rounded-2xl border-2 border-amber-300 p-5 space-y-4 shadow-sm"
            >
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h3 className="text-sm font-black text-slate-900">
                  {editingPoId ? 'Edit PO Customer' : 'Input Customer Purchase Order (5.2.1)'}
                </h3>
                <button type="button" onClick={() => setPoFormOpen(false)} className="p-1 text-slate-400">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nomor PO Customer *</label>
                  <input
                    type="text"
                    required
                    value={poDraft.poNumber}
                    onChange={(e) => setPoDraft({ ...poDraft, poNumber: e.target.value })}
                    placeholder="PO/CUST/2026/001"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Customer *</label>
                  <select
                    required
                    value={poDraft.customerId}
                    onChange={(e) => {
                      const cid = e.target.value;
                      const c = customers.find((x) => x.id === cid);
                      setPoDraft({ ...poDraft, customerId: cid, paymentTerm: c?.paymentTerm || poDraft.paymentTerm });
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-semibold"
                  >
                    <option value="">-- Pilih Customer --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Referensi Quotation (Opsional)</label>
                  <select
                    value={poDraft.quotationId || ''}
                    onChange={(e) => {
                      const qid = e.target.value;
                      const q = allQuotes.find((x) => x.id === qid);
                      if (q) {
                        setPoDraft((prev) => ({
                          ...prev,
                          quotationId: qid,
                          customerId: q.customerId,
                          paymentTerm: q.paymentTerm || prev.paymentTerm,
                          taxRate: q.taxRate,
                          freight: q.freightCost,
                          items: q.items.map((it) => ({
                            itemId: it.itemId,
                            qty: it.qty,
                            unitPrice: it.unitPrice,
                            deliveryDeadline: '',
                          })),
                        }));
                      } else {
                        setPoDraft((prev) => ({ ...prev, quotationId: '' }));
                      }
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white"
                  >
                    <option value="">-- Tanpa Quotation --</option>
                    {allQuotes.map((q) => (
                      <option key={q.id} value={q.id}>
                        {q.quotationNumber} — {q.customerName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal PO *</label>
                  <input
                    type="date"
                    required
                    value={poDraft.date}
                    onChange={(e) => setPoDraft({ ...poDraft, date: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Payment Term</label>
                  <input
                    type="text"
                    value={poDraft.paymentTerm || ''}
                    onChange={(e) => setPoDraft({ ...poDraft, paymentTerm: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Pengirim Email PO</label>
                  <input
                    type="text"
                    value={poDraft.emailSender || ''}
                    onChange={(e) => setPoDraft({ ...poDraft, emailSender: e.target.value })}
                    placeholder="purchasing@customer.co.id"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Subjek Email PO</label>
                  <input
                    type="text"
                    value={poDraft.emailSubject || ''}
                    onChange={(e) => setPoDraft({ ...poDraft, emailSubject: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Upload File PO (PDF/Gambar)</label>
                  <div className="flex items-center gap-2">
                    <label className="px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-bold cursor-pointer inline-flex items-center gap-1.5">
                      {uploadingPo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      <span>{poDraft.fileUrl ? 'Ganti File' : 'Upload PO'}</span>
                      <input type="file" className="hidden" onChange={handleUploadPoFile} />
                    </label>
                    {poDraft.fileUrl && (
                      <a
                        href={resolveSalesFileUrl(poDraft.fileUrl) || '#'}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 text-xs font-bold underline"
                      >
                        Lihat
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* PO Items */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-800 uppercase">Item PO Customer</span>
                  <button
                    type="button"
                    onClick={() =>
                      setPoDraft((prev) => ({
                        ...prev,
                        items: [...prev.items, { itemId: '', qty: 1, unitPrice: 0, deliveryDeadline: '' }],
                      }))
                    }
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Tambah Item
                  </button>
                </div>
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 font-bold text-slate-700">
                      <tr>
                        <th className="p-2 text-left min-w-[200px]">Produk</th>
                        <th className="p-2 text-right w-24">Qty</th>
                        <th className="p-2 text-right w-32">Harga Satuan</th>
                        <th className="p-2 text-left w-36">Deadline Kirim</th>
                        <th className="p-2 text-right w-32">Subtotal</th>
                        <th className="p-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {poDraft.items.map((line, idx) => (
                        <tr key={idx}>
                          <td className="p-2">
                            <select
                              value={line.itemId}
                              onChange={(e) => {
                                const it = items.find((x) => x.id === e.target.value);
                                updatePoItem(idx, { itemId: e.target.value, unitPrice: it?.sellingPrice || 0 });
                              }}
                              className="w-full px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
                            >
                              <option value="">-- Pilih Produk --</option>
                              {items.map((it) => (
                                <option key={it.id} value={it.id}>[{it.code}] {it.name}</option>
                              ))}
                            </select>
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              min={0.01}
                              step="any"
                              value={line.qty}
                              onChange={(e) => updatePoItem(idx, { qty: Number(e.target.value) || 0 })}
                              className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-right font-mono"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="number"
                              min={0}
                              step="any"
                              value={line.unitPrice}
                              onChange={(e) => updatePoItem(idx, { unitPrice: Number(e.target.value) || 0 })}
                              className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-right font-mono"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="date"
                              value={line.deliveryDeadline || ''}
                              onChange={(e) => updatePoItem(idx, { deliveryDeadline: e.target.value })}
                              className="w-full px-2 py-1.5 rounded-lg border border-slate-300"
                            />
                          </td>
                          <td className="p-2 text-right font-mono font-bold">
                            {formatIDR((Number(line.qty) || 0) * (Number(line.unitPrice) || 0))}
                          </td>
                          <td className="p-2 text-center">
                            {poDraft.items.length > 1 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setPoDraft((prev) => ({
                                    ...prev,
                                    items: prev.items.filter((_, i) => i !== idx),
                                  }))
                                }
                                className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Diskon (IDR)</label>
                  <input
                    type="number"
                    min={0}
                    value={poDraft.discount}
                    onChange={(e) => setPoDraft({ ...poDraft, discount: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Ongkir / Freight</label>
                  <input
                    type="number"
                    min={0}
                    value={poDraft.freight}
                    onChange={(e) => setPoDraft({ ...poDraft, freight: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">PPN (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={poDraft.taxRate}
                    onChange={(e) => setPoDraft({ ...poDraft, taxRate: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono"
                  />
                </div>
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-right">
                  <div className="text-[11px] text-amber-800 font-semibold">Total Nilai PO</div>
                  <div className="text-sm font-black font-mono text-amber-950">{formatIDR(poGrandTotal)}</div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setPoFormOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savePoMut.isPending}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5"
                >
                  {savePoMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Simpan PO Customer</span>
                </button>
              </div>
            </form>
          )}

          {/* PO Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-bold uppercase border-b border-slate-200">
                  <tr>
                    <th className="p-3">No. PO &amp; Tanggal</th>
                    <th className="p-3">Customer</th>
                    <th className="p-3">Termin &amp; Lampiran</th>
                    <th className="p-3 text-right">Total Nilai PO</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {poLoading ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" /> Memuat PO Customer...
                      </td>
                    </tr>
                  ) : pos.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">Belum ada data PO Customer.</td>
                    </tr>
                  ) : (
                    pos.map((po) => (
                      <tr key={po.id} className="hover:bg-slate-50/70">
                        <td className="p-3">
                          <div className="font-mono font-bold text-blue-700">{po.poNumber}</div>
                          <div className="text-[11px] text-slate-500">{po.date} • {po.items.length} item</div>
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-slate-900">{po.customerName}</div>
                          {po.emailSender && <div className="text-[11px] text-slate-500">Email: {po.emailSender}</div>}
                        </td>
                        <td className="p-3">
                          <div className="font-semibold">{po.paymentTerm}</div>
                          {po.fileUrl && (
                            <a
                              href={resolveSalesFileUrl(po.fileUrl) || '#'}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-blue-600 font-bold hover:underline"
                            >
                              <ExternalLink className="w-3 h-3" /> Lampiran PO
                            </a>
                          )}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900">
                          {formatIDR(po.totalAmount)}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${badgeTone(po.status)}`}>
                            {po.status}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            {canMutatePo && po.status !== 'CONVERTED_TO_IO' && (
                              <button
                                onClick={() => {
                                  setConvertPoTarget(po);
                                  setIoEstDate('');
                                  setIoDeliverTo('');
                                  setIoNotes('');
                                }}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                                title="5.2.2 Konversi PO ke Incoming Order"
                              >
                                <ArrowRightCircle className="w-3.5 h-3.5" />
                                <span>→ IO</span>
                              </button>
                            )}
                            {canMutatePo && (
                              <button
                                onClick={() => {
                                  setEditingPoId(po.id);
                                  setPoDraft({
                                    poNumber: po.poNumber,
                                    customerId: po.customerId,
                                    quotationId: po.quotationId || '',
                                    date: po.date,
                                    paymentTerm: po.paymentTerm || 'NET 30',
                                    discount: po.discount,
                                    freight: po.freight,
                                    taxRate: po.taxRate,
                                    fileUrl: po.fileUrl || '',
                                    emailSender: po.emailSender || '',
                                    emailSubject: po.emailSubject || '',
                                    notes: po.notes || '',
                                    status: po.status,
                                    items:
                                      po.items.length > 0
                                        ? po.items
                                        : [{ itemId: '', qty: 1, unitPrice: 0, deliveryDeadline: '' }],
                                  });
                                  setPoFormOpen(true);
                                }}
                                className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 cursor-pointer"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                            )}
                            {canMutatePo && (
                              <button
                                onClick={() => setDeletePoTarget(po)}
                                className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
              <span>Halaman <strong>{poPage}</strong> dari <strong>{poTotalPages}</strong></span>
              <div className="flex gap-2">
                <button disabled={poPage <= 1} onClick={() => setPoPage((p) => Math.max(1, p - 1))} className="px-3 py-1 rounded-lg border border-slate-300 font-bold disabled:opacity-40">Sebelumnya</button>
                <button disabled={poPage >= poTotalPages} onClick={() => setPoPage((p) => p + 1)} className="px-3 py-1 rounded-lg border border-slate-300 font-bold disabled:opacity-40">Selanjutnya</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION B: 5.2.2 & 5.2.3 INCOMING ORDERS */}
      {section === 'io' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3">
            <select
              value={ioStatus}
              onChange={(e) => {
                setIoStatus(e.target.value);
                setIoPage(1);
              }}
              className="px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-semibold"
            >
              <option value="ALL">Semua Status IO</option>
              <option value="OPEN">OPEN / PENDING</option>
              <option value="CONFIRMED">CONFIRMED</option>
              <option value="APPROVED">APPROVED</option>
            </select>
            {canMutatePo && (
              <button
                onClick={() => setFromQuoteOpen(true)}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Buat IO dari Quotation (5.2.2)</span>
              </button>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-bold uppercase border-b border-slate-200">
                  <tr>
                    <th className="p-3">No. IO &amp; PO Ref</th>
                    <th className="p-3">Customer &amp; Kirim</th>
                    <th className="p-3 text-right">Total Nilai IO</th>
                    <th className="p-3">5.2.3 Konfirmasi Mgr Mkt</th>
                    <th className="p-3">5.2.3 Konfirmasi Cost Ctrl</th>
                    <th className="p-3">Status IO</th>
                    <th className="p-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ioLoading ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" /> Memuat Incoming Orders...
                      </td>
                    </tr>
                  ) : ios.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">Belum ada Incoming Order (IO).</td>
                    </tr>
                  ) : (
                    ios.map((io) => (
                      <tr key={io.id} className="hover:bg-slate-50/70">
                        <td className="p-3">
                          <div className="font-mono font-bold text-blue-700">{io.ioNumber}</div>
                          <div className="text-[11px] text-slate-500">PO: {io.customerPoNumber} • {io.date}</div>
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-slate-900">{io.customerName}</div>
                          <div className="text-[11px] text-slate-500">
                            Est. Kirim: {io.estimatedDeliveryDate || '-'} {io.deliverTo ? `• ${io.deliverTo}` : ''}
                          </div>
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900">
                          {formatIDR(io.totalAmount)}
                        </td>
                        <td className="p-3 space-y-1">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold ${badgeTone(io.managerMarketingStatus)}`}>
                            {io.managerMarketingStatus}
                          </span>
                          {io.managerMarketingApprovedBy && (
                            <div className="text-[10px] text-slate-500">oleh {io.managerMarketingApprovedBy}</div>
                          )}
                          {canConfirmMgrMkt && io.managerMarketingStatus === 'PENDING' && (
                            <div className="flex gap-1">
                              <button
                                onClick={() => confirmIoMgrMut.mutate({ id: io.id, action: 'APPROVE' })}
                                className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold cursor-pointer"
                              >
                                Konfirmasi
                              </button>
                              <button
                                onClick={() => confirmIoMgrMut.mutate({ id: io.id, action: 'REJECT' })}
                                className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold cursor-pointer"
                              >
                                Tolak
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="p-3 space-y-1">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold ${badgeTone(io.costControlStatus)}`}>
                            {io.costControlStatus}
                          </span>
                          {io.costControlApprovedBy && (
                            <div className="text-[10px] text-slate-500">oleh {io.costControlApprovedBy}</div>
                          )}
                          {canConfirmCostCtrl && io.costControlStatus === 'PENDING' && (
                            <div className="flex gap-1">
                              <button
                                onClick={() => confirmIoCcMut.mutate({ id: io.id, action: 'APPROVE' })}
                                className="px-2 py-0.5 rounded bg-blue-700 hover:bg-blue-800 text-white text-[10px] font-bold cursor-pointer"
                              >
                                Konfirmasi
                              </button>
                              <button
                                onClick={() => confirmIoCcMut.mutate({ id: io.id, action: 'REJECT' })}
                                className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold cursor-pointer"
                              >
                                Tolak
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${badgeTone(io.status)}`}>
                            {io.status}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() =>
                                printSalesIncomingOrderApi(io.id).catch((e) => toast.error(extractSalesErrorMessage(e)))
                              }
                              className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50 cursor-pointer"
                              title="Cetak IO (HTML/PDF)"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            {canMutatePo && (
                              <button
                                onClick={() => setDeleteIoTarget(io)}
                                className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 cursor-pointer"
                                title="Batalkan IO"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
              <span>Halaman <strong>{ioPage}</strong> dari <strong>{ioTotalPages}</strong></span>
              <div className="flex gap-2">
                <button disabled={ioPage <= 1} onClick={() => setIoPage((p) => Math.max(1, p - 1))} className="px-3 py-1 rounded-lg border border-slate-300 font-bold disabled:opacity-40">Sebelumnya</button>
                <button disabled={ioPage >= ioTotalPages} onClick={() => setIoPage((p) => p + 1)} className="px-3 py-1 rounded-lg border border-slate-300 font-bold disabled:opacity-40">Selanjutnya</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Convert PO -> IO */}
      {convertPoTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                5.2.2 Konversi PO ke Incoming Order (IO)
              </h3>
              <button onClick={() => setConvertPoTarget(null)} className="p-1 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="text-xs bg-slate-50 p-3 rounded-xl space-y-1">
              <div><strong>No. PO:</strong> {convertPoTarget.poNumber}</div>
              <div><strong>Customer:</strong> {convertPoTarget.customerName}</div>
              <div><strong>Total:</strong> {formatIDR(convertPoTarget.totalAmount)}</div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Estimasi Tanggal Kirim</label>
                <input
                  type="date"
                  value={ioEstDate}
                  onChange={(e) => setIoEstDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Alamat Tujuan Kirim (Deliver To)</label>
                <input
                  type="text"
                  value={ioDeliverTo}
                  onChange={(e) => setIoDeliverTo(e.target.value)}
                  placeholder="Plant / Gudang Customer..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Catatan IO</label>
                <textarea
                  rows={2}
                  value={ioNotes}
                  onChange={(e) => setIoNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConvertPoTarget(null)} className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold">Batal</button>
              <button
                disabled={convertToIoMut.isPending}
                onClick={() => convertToIoMut.mutate()}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5"
              >
                {convertToIoMut.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Terbitkan IO</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create IO directly from Quotation */}
      {fromQuoteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900">Buat Incoming Order dari Quotation</h3>
              <button onClick={() => setFromQuoteOpen(false)} className="p-1 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Pilih Quotation *</label>
                <select
                  value={fqQuotationId}
                  onChange={(e) => setFqQuotationId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-semibold"
                >
                  <option value="">-- Pilih Quotation --</option>
                  {allQuotes.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.quotationNumber} — {q.customerName} ({q.status})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nomor PO Customer *</label>
                <input
                  type="text"
                  value={fqPoNumber}
                  onChange={(e) => setFqPoNumber(e.target.value)}
                  placeholder="PO/CUST/2026/..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal PO Customer *</label>
                <input
                  type="date"
                  value={fqPoDate}
                  onChange={(e) => setFqPoDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Catatan</label>
                <input
                  type="text"
                  value={fqNotes}
                  onChange={(e) => setFqNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setFromQuoteOpen(false)} className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold">Batal</button>
              <button
                disabled={createFromQuoteMut.isPending}
                onClick={() => createFromQuoteMut.mutate()}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5"
              >
                {createFromQuoteMut.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Buat IO</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmActionModal
        isOpen={Boolean(deletePoTarget)}
        title="Hapus PO Customer"
        message={`Yakin ingin menghapus PO ${deletePoTarget?.poNumber || ''}?`}
        confirmLabel="Ya, Hapus"
        confirmTone="danger"
        isLoading={deletePoMut.isPending}
        onCancel={() => setDeletePoTarget(null)}
        onConfirm={() => deletePoTarget && deletePoMut.mutate(deletePoTarget.id)}
      />

      <ConfirmActionModal
        isOpen={Boolean(deleteIoTarget)}
        title="Batalkan Incoming Order"
        message={`Yakin ingin membatalkan IO ${deleteIoTarget?.ioNumber || ''}?`}
        confirmLabel="Ya, Batalkan"
        confirmTone="danger"
        isLoading={deleteIoMut.isPending}
        onCancel={() => setDeleteIoTarget(null)}
        onConfirm={() => deleteIoTarget && deleteIoMut.mutate(deleteIoTarget.id)}
      />
    </div>
  );
};

