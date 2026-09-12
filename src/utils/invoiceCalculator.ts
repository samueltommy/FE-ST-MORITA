import { DeliveryOrder, InvoiceCalculationResult, InvoiceFormulaId } from '../types';

export interface FormulaOption {
  id: InvoiceFormulaId;
  code: string;
  name: string;
  category: string;
  description: string;
  badge: string;
}

export const INVOICE_FORMULAS: FormulaOption[] = [
  {
    id: 'FORMULA_1_STANDARD_NET',
    code: 'R-01',
    name: 'Standar Net Komersial (PPN 11%)',
    category: 'Domestik Reguler',
    description: 'Kalkulasi standar faktur penjualan: DPP Barang dikurangi diskon normal, ditambah PPN 11%.',
    badge: 'Standard',
  },
  {
    id: 'FORMULA_2_FREIGHT_ADDED',
    code: 'R-02',
    name: 'Freight Surcharge Added (+ Ongkir Kena Pajak)',
    category: 'Logistik Tambahan',
    description: 'Ongkos angkut truk ekspedisi Cikarang ditambahkan terpisah ke DPP, dikenakan PPN 11% penuh.',
    badge: 'Freight Extra',
  },
  {
    id: 'FORMULA_3_FREIGHT_INCLUSIVE',
    code: 'R-03',
    name: 'Freight Inclusive (Include Ongkir Franco Gudang)',
    category: 'Logistik Terpadu',
    description: 'Harga satuan produk sudah mencakup biaya logistik, DPP dihitung dari total harga bruto.',
    badge: 'Franco',
  },
  {
    id: 'FORMULA_4_PPN_PPH23',
    code: 'R-04',
    name: 'PPN 11% + Potongan PPh Pasal 23 (2% WHT)',
    category: 'Pajak & Jasa Slitting',
    description: 'Untuk order dengan jasa potong/slitting: Net Payable dipotong PPh 23 (2%) dari jasa olah.',
    badge: 'WHT 2%',
  },
  {
    id: 'FORMULA_5_DP_DEDUCTION',
    code: 'R-05',
    name: 'Potongan Uang Muka (Down Payment Offset)',
    category: 'Term of Payment',
    description: 'Memotong nilai DP yang telah dibayarkan di awal, PPN 11% hanya dihitung dari sisa tagihan.',
    badge: 'DP Offset',
  },
  {
    id: 'FORMULA_6_RETENTION_GUARANTEE',
    code: 'R-06',
    name: 'Retensi Jaminan Mutu 5% (QC Retention)',
    category: 'Manufaktur Khusus',
    description: 'Penahanan 5% nilai bruto sampai uji coba QC pabrik klien lulus (30 hari pasca kirim).',
    badge: 'Retention 5%',
  },
  {
    id: 'FORMULA_7_EXPORT_EXEMPT_0',
    code: 'R-07',
    name: 'Ekspor Bebas Pajak (PPN 0% Fasilitas BC 3.0)',
    category: 'Ekspor & Kawasan Berikat',
    description: 'Faktur ekspor / pengiriman antar Kawasan Berikat (BC 2.7 / BC 3.0) dengan tarif PPN 0%.',
    badge: 'PPN 0% Tax Free',
  },
  {
    id: 'FORMULA_8_PROGRESSIVE_REBATE',
    code: 'R-08',
    name: 'Rebat Progresif Volume Tinggi (Tiered Discount)',
    category: 'Insentif Volume',
    description: 'Diskon volume otomatis berjenjang jika kuantitas agregat DO melebihi 25.000 meter/unit.',
    badge: 'Rebate Tier',
  },
  {
    id: 'FORMULA_9_MULTI_DO_CONSOLIDATED',
    code: 'R-09',
    name: 'Konsolidasi Multi-DO + Biaya Palet & Asuransi',
    category: 'Konsolidasi Logistik',
    description: 'Penggabungan banyak surat jalan (DO) dengan tambahan biaya palet kayu & asuransi transit.',
    badge: 'Multi-DO',
  },
  {
    id: 'FORMULA_10_SUBSIDIZED_TRANSPORT',
    code: 'R-10',
    name: 'Subsidi Logistik 50% (Split Transport)',
    category: 'Promo Logistik',
    description: 'Perusahaan menanggung 50% ongkos angkut; klien hanya membayar 50% sisanya.',
    badge: 'Subsidy 50%',
  },
  {
    id: 'FORMULA_11_COST_CONTROL_SAFEGUARD',
    code: 'R-11',
    name: 'Cost Control Margin Safeguard (Strict 18% Floor)',
    category: 'Kepatuhan Finansial',
    description: 'Audit margin otomatis: Mengunci faktur jika proyeksi gross margin berada di bawah 18%.',
    badge: 'Margin Floor',
  },
  {
    id: 'FORMULA_12_FOREX_CURRENCY',
    code: 'R-12',
    name: 'Valuta Asing USD / Kurs Tengah Bank Indonesia',
    category: 'Valuta Asing',
    description: 'Konversi multi-currency USD ke IDR menggunakan kurs pajak KMK / JISDOR real-time.',
    badge: 'USD/IDR Forex',
  },
  {
    id: 'FORMULA_13_RETURN_NOTE_OFFSET',
    code: 'R-13',
    name: 'Kredit Retur Barang Cacat (Nota Retur Pajak)',
    category: 'Penyesuaian Mutu',
    description: 'Pemotongan nilai faktur berdasarkan Nota Retur resmi atas lot barang yang di-reject QC klien.',
    badge: 'Nota Retur',
  },
];

export interface FormulaCustomParameters {
  freightCost?: number;
  discountRatePercent?: number;
  downPaymentAmount?: number;
  retentionPercent?: number;
  returnNoteAmount?: number;
  currency?: 'IDR' | 'USD';
  exchangeRate?: number;
  minimumMarginPercent?: number;
  estimatedCostOfGoods?: number;
}

export function calculateSalesInvoice(
  formulaId: InvoiceFormulaId,
  selectedDos: DeliveryOrder[],
  customParams: FormulaCustomParameters = {}
): InvoiceCalculationResult {
  const formulaMeta = INVOICE_FORMULAS.find((f) => f.id === formulaId) || INVOICE_FORMULAS[0];

  // Base raw calculations from selected DOs
  const subtotalGoods = selectedDos.reduce(
    (sum, item) => sum + (item.totalBeforeTax ?? item.totalGrossValue ?? 0),
    0
  );
  const totalQuantity = selectedDos.reduce(
    (sum, item) =>
      sum +
      (item.qtyDelivered ?? (item.items ? item.items.reduce((s, it) => s + it.quantity, 0) : 0)),
    0
  );

  // Defaults
  let freightAmount = customParams.freightCost ?? 1850000;
  let discountOrRebate = 0;
  let downPaymentDeduction = customParams.downPaymentAmount ?? 0;
  let retentionWithheld = 0;
  let taxableBaseDpp = 0;
  let ppnRate = 0.11; // Standard Indonesia PPN 11%
  let pph23Amount = 0;
  let returnCreditOffset = customParams.returnNoteAmount ?? 0;
  let estimatedMarginPercent = 24.8;
  const currency = customParams.currency ?? 'IDR';
  const exchangeRate = customParams.exchangeRate ?? 16250;

  switch (formulaId) {
    case 'FORMULA_1_STANDARD_NET': {
      const discPercent = customParams.discountRatePercent ?? 2.5;
      discountOrRebate = (subtotalGoods * discPercent) / 100;
      freightAmount = 0;
      taxableBaseDpp = Math.max(0, subtotalGoods - discountOrRebate);
      break;
    }

    case 'FORMULA_2_FREIGHT_ADDED': {
      freightAmount = customParams.freightCost ?? 2450000;
      taxableBaseDpp = subtotalGoods + freightAmount;
      break;
    }

    case 'FORMULA_3_FREIGHT_INCLUSIVE': {
      // Freight already embedded in unit prices
      freightAmount = 0;
      taxableBaseDpp = subtotalGoods;
      break;
    }

    case 'FORMULA_4_PPN_PPH23': {
      // 15% estimated as slitting service component subject to PPh 23 (2%)
      const servicePortion = subtotalGoods * 0.15;
      pph23Amount = servicePortion * 0.02;
      taxableBaseDpp = subtotalGoods;
      break;
    }

    case 'FORMULA_5_DP_DEDUCTION': {
      downPaymentDeduction = customParams.downPaymentAmount ?? Math.round(subtotalGoods * 0.3);
      taxableBaseDpp = Math.max(0, subtotalGoods - downPaymentDeduction);
      break;
    }

    case 'FORMULA_6_RETENTION_GUARANTEE': {
      const retentionPct = customParams.retentionPercent ?? 5.0;
      retentionWithheld = (subtotalGoods * retentionPct) / 100;
      taxableBaseDpp = subtotalGoods;
      break;
    }

    case 'FORMULA_7_EXPORT_EXEMPT_0': {
      ppnRate = 0.0; // 0% PPN
      taxableBaseDpp = subtotalGoods;
      break;
    }

    case 'FORMULA_8_PROGRESSIVE_REBATE': {
      // Tier: > 30,000 units = 4%, > 15,000 units = 2.5%, else 1%
      const rebatePct = totalQuantity > 30000 ? 4.0 : totalQuantity > 15000 ? 2.5 : 1.0;
      discountOrRebate = (subtotalGoods * rebatePct) / 100;
      taxableBaseDpp = Math.max(0, subtotalGoods - discountOrRebate);
      break;
    }

    case 'FORMULA_9_MULTI_DO_CONSOLIDATED': {
      const palletAndHandlingFee = 750000;
      const transitInsurance = subtotalGoods * 0.002;
      freightAmount = (customParams.freightCost ?? 1800000) + palletAndHandlingFee + transitInsurance;
      taxableBaseDpp = subtotalGoods + freightAmount;
      break;
    }

    case 'FORMULA_10_SUBSIDIZED_TRANSPORT': {
      const fullFreight = customParams.freightCost ?? 3200000;
      freightAmount = fullFreight * 0.5; // Customer pays 50%
      taxableBaseDpp = subtotalGoods + freightAmount;
      break;
    }

    case 'FORMULA_11_COST_CONTROL_SAFEGUARD': {
      taxableBaseDpp = subtotalGoods;
      const minFloor = customParams.minimumMarginPercent ?? 18.0;
      const simulatedCost = customParams.estimatedCostOfGoods ?? subtotalGoods * 0.81;
      estimatedMarginPercent = subtotalGoods > 0 ? ((subtotalGoods - simulatedCost) / subtotalGoods) * 100 : 22;
      break;
    }

    case 'FORMULA_12_FOREX_CURRENCY': {
      // In USD
      taxableBaseDpp = subtotalGoods;
      break;
    }

    case 'FORMULA_13_RETURN_NOTE_OFFSET': {
      returnCreditOffset = customParams.returnNoteAmount ?? 4850000;
      taxableBaseDpp = Math.max(0, subtotalGoods - returnCreditOffset);
      break;
    }
  }

  const ppnAmount = Math.round(taxableBaseDpp * ppnRate);
  const finalPayableAmount = Math.max(
    0,
    taxableBaseDpp + ppnAmount - pph23Amount - retentionWithheld
  );

  const minRequiredMargin = customParams.minimumMarginPercent ?? 18.0;
  const marginCheckPassed = estimatedMarginPercent >= minRequiredMargin;

  return {
    formulaId,
    formulaName: formulaMeta.name,
    formulaDescription: formulaMeta.description,
    subtotalGoods,
    freightAmount,
    discountOrRebate,
    downPaymentDeduction,
    retentionWithheld,
    taxableBaseDpp,
    ppnAmount,
    pph23Amount,
    returnCreditOffset,
    finalPayableAmount,
    marginCheckPassed,
    estimatedMarginPercent: Number(estimatedMarginPercent.toFixed(1)),
    currency,
    exchangeRate,
  };
}

export function formatIDR(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}
