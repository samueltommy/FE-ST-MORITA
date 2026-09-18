import React, { useState } from 'react';
import { X, ShieldAlert, CheckCircle2, AlertTriangle, FileSpreadsheet, Lock, Unlock, Sparkles, Award } from 'lucide-react';
import { useAppStore, appStore } from '../../store/useAppStore';
import { WorkOrderSpk, QcInspectionRecord, QcStatus } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'spk' | 'qc_test' | 'hold_override';
}

const CONTENT = {
  id: {
    title: 'Formulir Produksi & Kontrol Mutu (SPK & QC Hold Lockout)',
    desc: 'Penerbitan SPK (validasi blokir bahan baku), Formulir Uji Lab IQC/PQC, & Otorisasi Buka Kunci (Release Hold)',
    tabSpk: 'Penerbitan SPK (Work Order)',
    tabQc: 'Input Uji Mutu QC (IQC & PQC)',
    tabHold: 'Otorisasi Release QC Hold',
    spkNum: 'Nomor SPK Produksi',
    spkIo: 'Referensi IO / PO Pelanggan',
    spkItem: 'Kode Produk',
    spkName: 'Nama Produk yang Dikonversi',
    spkQty: 'Target Qty',
    spkW: 'Lebar (mm)',
    spkL: 'Panjang (m)',
    spkT: 'Tebal (µm)',
    spkLine: 'Mesin Produksi',
    spkOp: 'Operator Penanggung Jawab',
    spkDue: 'Target Selesai (Due Date)',
    btnCancel: 'Batal',
    btnSpk: 'Terbitkan SPK Produksi',
    qcLot: 'Nomor Lot Uji',
    qcItem: 'Kode Item',
    qcBatch: 'Ukuran Batch (Jumlah Roll)',
    qcName: 'Nama Produk / Lot Diuji',
    qcResultHeader: 'Hasil Parameter Uji Laboratorium',
    qcThick: 'Ketebalan Tape (Micron)',
    qcAdhesion: 'Daya Rekat (Adhesion N/25mm)',
    qcLiner: 'Pelepasan Liner (g/25mm)',
    qcStandard: 'Standar:',
    qcStatusTitle: 'Keputusan Status Mutu QC',
    qcPass: '[PASS] LULUS',
    qcPassDesc: 'Terbitkan COA Resmi',
    qcHold: '[HOLD] CEKAL',
    qcHoldDesc: 'Kunci Blokir Sistem',
    qcRework: '[REWORK] PROSES ULANG',
    qcReworkDesc: 'Slitting / Trimming Ulang',
    qcDefectLabel: 'Alasan Pencekalan / Catatan Penyimpangan Mutu (Wajib diisi jika HOLD / REWORK)',
    qcDefectPl: 'Contoh: Ketebalan lapisan adhesive melampaui toleransi atas (+5.2 µm) sehingga berisiko bleeding lem...',
    btnQcSubmit: 'Simpan Keputusan QC',
    overrideTitle: 'Otorisasi Khusus Level 1 (QC Manager / Direksi):',
    overrideDesc: 'Membuka cekal QC Hold secara manual memerlukan justifikasi teknis formal yang akan direkam dalam log audit SHA-256 dan dilaporkan ke Board of Directors.',
    overrideLotLabel: 'Pilih Batch Lot yang Sedang Dicekal (HOLD)',
    overrideReasonLabel: 'Justifikasi Teknis Pelepasan Cekal (Dispensasi QC)',
    overrideReasonPl: 'Contoh: Telah dilakukan uji komparasi suhu ruangan 30°C dan aplikasi non-kritis dengan persetujuan Section Head QC & Direksi...',
    btnOverrideSubmit: 'Buka Kunci Cekal (Release Hold)',
    msgSpkHold: 'berhasil diterbitkan namun DIBLOKIR SEMENTARA (Status: HOLD_BLOCKED) karena bahan baku terkait sedang dicekal QC.',
    msgSpkSuccess: 'berhasil diterbitkan dan siap dikerjakan di',
    msgQcHold: 'PERINGATAN: Lot',
    msgQcHoldDesc: 'BERSTATUS [QC HOLD]! Sistem Lockout otomatis mengunci transfer & penerbitan DO untuk lot ini.',
    msgQcSuccess: 'Hasil Pengujian QC Lot',
    msgQcSuccessDesc: 'berhasil dicatat & diterbitkan.',
    msgOverride: 'Otorisasi Override QC Hold berhasil. Kunci blokir sistem untuk lot tersebut telah dibuka resmi.',
  },
  en: {
    title: 'Production & Quality Control Forms (SPK & QC Hold Lockout)',
    desc: 'SPK Issuance (raw material block validation), IQC/PQC Lab Test Forms, & Unlock Authorization (Release Hold)',
    tabSpk: 'SPK Issuance (Work Order)',
    tabQc: 'QC Quality Test Input (IQC & PQC)',
    tabHold: 'QC Hold Release Authorization',
    spkNum: 'Production SPK Number',
    spkIo: 'Customer IO / PO Reference',
    spkItem: 'Product Code',
    spkName: 'Converted Product Name',
    spkQty: 'Target Qty',
    spkW: 'Width (mm)',
    spkL: 'Length (m)',
    spkT: 'Thickness (µm)',
    spkLine: 'Production Line',
    spkOp: 'Responsible Operator',
    spkDue: 'Target Completion (Due Date)',
    btnCancel: 'Cancel',
    btnSpk: 'Issue Production SPK',
    qcLot: 'Test Lot Number',
    qcItem: 'Item Code',
    qcBatch: 'Batch Size (Number of Rolls)',
    qcName: 'Tested Product / Lot Name',
    qcResultHeader: 'Laboratory Test Parameter Results',
    qcThick: 'Tape Thickness (Micron)',
    qcAdhesion: 'Adhesion Force (N/25mm)',
    qcLiner: 'Liner Release (g/25mm)',
    qcStandard: 'Standard:',
    qcStatusTitle: 'QC Quality Status Decision',
    qcPass: '[PASS] PASSED',
    qcPassDesc: 'Issue Official COA',
    qcHold: '[HOLD] BLOCKED',
    qcHoldDesc: 'System Lock Block',
    qcRework: '[REWORK] REPROCESS',
    qcReworkDesc: 'Re-Slitting / Trimming',
    qcDefectLabel: 'Block Reason / Quality Deviation Note (Required if HOLD / REWORK)',
    qcDefectPl: 'Example: Adhesive layer thickness exceeds upper tolerance (+5.2 µm) risking glue bleeding...',
    btnQcSubmit: 'Save QC Decision',
    overrideTitle: 'Level 1 Special Authorization (QC Manager / Directors):',
    overrideDesc: 'Manually unlocking QC Hold requires formal technical justification that will be recorded in SHA-256 audit log and reported to Board of Directors.',
    overrideLotLabel: 'Select Batch Lot Currently on HOLD',
    overrideReasonLabel: 'Technical Justification for Release (QC Dispensation)',
    overrideReasonPl: 'Example: 30°C room temperature comparison test and non-critical application approved by QC Section Head & Directors...',
    btnOverrideSubmit: 'Unlock Hold (Release Hold)',
    msgSpkHold: 'successfully issued but TEMPORARILY BLOCKED (Status: HOLD_BLOCKED) because related raw materials are blocked by QC.',
    msgSpkSuccess: 'successfully issued and ready to work in',
    msgQcHold: 'WARNING: Lot',
    msgQcHoldDesc: 'IS ON [QC HOLD] STATUS! Automatic Lockout system locks transfer & DO issuance for this lot.',
    msgQcSuccess: 'QC Test Results for Lot',
    msgQcSuccessDesc: 'successfully recorded & issued.',
    msgOverride: 'QC Hold Override Authorization successful. System block lock for the lot has been officially released.',
  }
};

export const ProductionQcFormsModal: React.FC<Props> = ({ isOpen, onClose, defaultTab = 'spk' }) => {
  const language = useAppStore((state) => state.language);
  const t = CONTENT[language] || CONTENT.id;

  const [activeTab, setActiveTab] = useState<'spk' | 'qc_test' | 'hold_override' | 'coa'>(defaultTab);
  const currentUser = useAppStore((state) => state.currentUser);
  const items = useAppStore((state) => state.items);
  const qcRecords = useAppStore((state) => state.qcRecords);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
      setSuccessMessage(null);
    }
  }, [isOpen, defaultTab]);

  // Form 1: SPK state
  const [spkNumber, setSpkNumber] = useState(`SPK/PRD/2026/09/00${Math.floor(Math.random() * 90 + 10)}`);
  const [customerIoRef, setCustomerIoRef] = useState('IO/SMI/2026/09/0235');
  const [spkItemCode, setSpkItemCode] = useState('SM-MSK-KFT24');
  const [spkItemName, setSpkItemName] = useState('Automotive Masking Tape High-Temp 150°C 24mm x 50m');
  const [spkTargetQty, setSpkTargetQty] = useState(3000);
  const [spkUnit, setSpkUnit] = useState('Roll');
  const [spkWidthMm, setSpkWidthMm] = useState(24);
  const [spkLengthM, setSpkLengthM] = useState(50);
  const [spkMicron, setSpkMicron] = useState(135);
  const [spkLine, setSpkLine] = useState('Lini Slitting Otomatis 02');
  const [spkOperator, setSpkOperator] = useState('Wahyu Hidayat');
  const [spkDueDate, setSpkDueDate] = useState(new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10));

  // Form 2: QC Test state
  const [testLotNumber, setTestLotNumber] = useState(qcRecords[0]?.lotNumber || 'LOT-IND-202609-08');
  const [testItemCode, setTestItemCode] = useState('SM-MSK-KFT24');
  const [testItemName, setTestItemName] = useState('Automotive Masking Tape High-Temp 24mm');
  const [testBatchSize, setTestBatchSize] = useState(1200);
  const [testUnit, setTestUnit] = useState('Roll');
  const [testStatus, setTestStatus] = useState<QcStatus>('PASS');
  const [testMicronActual, setTestMicronActual] = useState('135.2 µm');
  const [testAdhesionActual, setTestAdhesionActual] = useState('15.4 N/25mm');
  const [testLinerActual, setTestLinerActual] = useState('24 g/25mm');
  const [defectReason, setDefectReason] = useState('');

  // Form 3: Override state
  const [overrideLot, setOverrideLot] = useState(qcRecords.find((r) => r.status === 'HOLD')?.id || '');
  const [overrideReason, setOverrideReason] = useState('');

  if (!isOpen) return null;

  const handleSpkSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Verification: check if any related raw material is currently on HOLD
    const onHoldItems = qcRecords.filter((r) => r.status === 'HOLD');
    const isMaterialBlocked = onHoldItems.some((h) => h.itemName.toLowerCase().includes('akrilik') || h.itemName.toLowerCase().includes('bopp'));

    const newSpk: WorkOrderSpk = {
      id: `SPK-${Date.now()}`,
      spkNumber: spkNumber.trim(),
      customerIoRef: customerIoRef.trim(),
      itemCode: spkItemCode.trim(),
      itemName: spkItemName.trim(),
      targetQuantity: Number(spkTargetQty) || 1,
      producedGoodQty: 0,
      producedNgQty: 0,
      unit: spkUnit.trim(),
      targetWidthMm: Number(spkWidthMm) || 24,
      targetLengthM: Number(spkLengthM) || 50,
      targetMicron: Number(spkMicron) || 135,
      productionLine: spkLine,
      operatorName: spkOperator.trim(),
      spkStatus: isMaterialBlocked ? 'HOLD_BLOCKED' : 'QUEUED',
      startDate: `${new Date().toISOString().slice(0, 10)} 08:00`,
      dueDate: `${spkDueDate} 17:00`,
      rawMaterialLotChecked: !isMaterialBlocked,
    };

    appStore.addWorkOrder(newSpk);
    if (isMaterialBlocked) {
      setSuccessMessage(`SPK ${spkNumber} ${t.msgSpkHold}`);
    } else {
      setSuccessMessage(`SPK ${spkNumber} ${t.msgSpkSuccess} ${spkLine}.`);
    }

    setTimeout(() => {
      setSuccessMessage(null);
      onClose();
    }, 1500);
  };

  const handleQcTestSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const isHold = testStatus === 'HOLD';
    const isRework = testStatus === 'REWORK';

    const newQc: QcInspectionRecord = {
      id: `QC-${Date.now()}`,
      lotNumber: testLotNumber.trim(),
      itemCode: testItemCode.trim(),
      itemName: testItemName.trim(),
      batchSize: Number(testBatchSize) || 100,
      unit: testUnit,
      status: testStatus,
      inspectionDate: new Date().toISOString().slice(0, 10),
      inspectorName: currentUser.name,
      inspectorRole: currentUser.role,
      defectReason: isHold || isRework ? (defectReason.trim() || 'Penyimpangan toleransi parameter uji lab') : undefined,
      holdTimestamp: isHold ? new Date().toISOString() : undefined,
      testedParameters: [
        { name: 'Ketebalan Tape (Micron)', standard: '135 ± 3 µm', actual: testMicronActual, result: isHold ? 'OUT_OF_SPEC' : 'OK' },
        { name: 'Adhesion Force (N/25mm)', standard: '≥ 14.0 N', actual: testAdhesionActual, result: 'OK' },
        { name: 'Pelepasan Liner Release', standard: '20 - 30 g/25mm', actual: testLinerActual, result: 'OK' },
      ],
      coaNumber: testStatus === 'PASS' ? `COA/SM-${"IND"}/${new Date().getFullYear()}/${Math.floor(Math.random() * 9000 + 1000)}` : undefined,
    };

    appStore.addQcInspection(newQc);

    if (isHold) {
      setSuccessMessage(`${t.msgQcHold} ${testLotNumber} ${t.msgQcHoldDesc}`);
    } else {
      setSuccessMessage(`${t.msgQcSuccess} ${testLotNumber} [${testStatus}] ${t.msgQcSuccessDesc}`);
    }

    setTimeout(() => {
      setSuccessMessage(null);
      onClose();
    }, 1500);
  };

  const handleOverrideSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideLot || !overrideReason.trim()) return;

    appStore.overrideQcHold(overrideLot, overrideReason.trim());
    setSuccessMessage(t.msgOverride);
    setTimeout(() => {
      setSuccessMessage(null);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
              <span>{t.title}</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {t.desc}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 bg-white overflow-x-auto">
          <button
            onClick={() => setActiveTab('spk')}
            className={`px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'spk'
                ? 'border-rose-600 text-rose-700 bg-rose-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{t.tabSpk}</span>
          </button>
          <button
            onClick={() => setActiveTab('qc_test')}
            className={`px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'qc_test'
                ? 'border-rose-600 text-rose-700 bg-rose-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>{t.tabQc}</span>
          </button>
          <button
            onClick={() => setActiveTab('hold_override')}
            className={`px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'hold_override'
                ? 'border-rose-600 text-rose-700 bg-rose-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Unlock className="w-4 h-4" />
            <span>{t.tabHold}</span>
          </button>
        </div>

        {/* Form Body with Scroll */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1">
          {successMessage && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* 1. Penerbitan SPK */}
          {activeTab === 'spk' && (
            <form onSubmit={handleSpkSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.spkNum}</label>
                  <input
                    type="text"
                    required
                    value={spkNumber}
                    onChange={(e) => setSpkNumber(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.spkIo}</label>
                  <input
                    type="text"
                    required
                    value={customerIoRef}
                    onChange={(e) => setCustomerIoRef(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.spkItem}</label>
                  <input
                    type="text"
                    required
                    value={spkItemCode}
                    onChange={(e) => setSpkItemCode(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.spkName}</label>
                  <input
                    type="text"
                    required
                    value={spkItemName}
                    onChange={(e) => setSpkItemName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.spkQty}</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={spkTargetQty}
                    onChange={(e) => setSpkTargetQty(Number(e.target.value) || 1)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.spkW}</label>
                  <input
                    type="number"
                    required
                    value={spkWidthMm}
                    onChange={(e) => setSpkWidthMm(Number(e.target.value) || 1)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.spkL}</label>
                  <input
                    type="number"
                    required
                    value={spkLengthM}
                    onChange={(e) => setSpkLengthM(Number(e.target.value) || 1)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.spkT}</label>
                  <input
                    type="number"
                    required
                    value={spkMicron}
                    onChange={(e) => setSpkMicron(Number(e.target.value) || 1)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.spkLine}</label>
                  <select
                    value={spkLine}
                    onChange={(e) => setSpkLine(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
                  >
                    <option value="Lini Slitting Otomatis 01">Lini Slitting Otomatis 01</option>
                    <option value="Lini Slitting Otomatis 02">Lini Slitting Otomatis 02</option>
                    <option value="Lini Rewinder Presisi">Lini Rewinder Presisi</option>
                    <option value="Lini Coating Adhesive A">Lini Coating Adhesive A</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.spkOp}</label>
                  <input
                    type="text"
                    required
                    value={spkOperator}
                    onChange={(e) => setSpkOperator(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.spkDue}</label>
                  <input
                    type="date"
                    required
                    value={spkDueDate}
                    onChange={(e) => setSpkDueDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700"
                >
                  {t.btnCancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
                >
                  {t.btnSpk}
                </button>
              </div>
            </form>
          )}

          {/* 2. Form Input Uji Mutu QC */}
          {activeTab === 'qc_test' && (
            <form onSubmit={handleQcTestSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.qcLot}</label>
                  <input
                    type="text"
                    required
                    value={testLotNumber}
                    onChange={(e) => setTestLotNumber(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.qcItem}</label>
                  <input
                    type="text"
                    required
                    value={testItemCode}
                    onChange={(e) => setTestItemCode(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t.qcBatch}</label>
                  <input
                    type="number"
                    required
                    value={testBatchSize}
                    onChange={(e) => setTestBatchSize(Number(e.target.value) || 1)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t.qcName}</label>
                <input
                  type="text"
                  required
                  value={testItemName}
                  onChange={(e) => setTestItemName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 font-bold"
                />
              </div>

              {/* Lab Parameters */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider block">
                  {t.qcResultHeader}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">{t.qcThick}</label>
                    <input
                      type="text"
                      value={testMicronActual}
                      onChange={(e) => setTestMicronActual(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">{t.qcStandard} 135 ± 3 µm</span>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">{t.qcAdhesion}</label>
                    <input
                      type="text"
                      value={testAdhesionActual}
                      onChange={(e) => setTestAdhesionActual(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">{t.qcStandard} ≥ 14.0 N</span>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">{t.qcLiner}</label>
                    <input
                      type="text"
                      value={testLinerActual}
                      onChange={(e) => setTestLinerActual(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">{t.qcStandard} 20 - 30 g</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t.qcStatusTitle}</label>
                <div className="grid grid-cols-3 gap-3">
                  <label
                    className={`p-3 rounded-xl border text-center cursor-pointer transition-all ${
                      testStatus === 'PASS'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800 font-bold ring-2 ring-emerald-400'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="qcStatus"
                      value="PASS"
                      checked={testStatus === 'PASS'}
                      onChange={() => setTestStatus('PASS')}
                      className="sr-only"
                    />
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                    <span className="text-xs font-black block">{t.qcPass}</span>
                    <span className="text-[10px] text-slate-500">{t.qcPassDesc}</span>
                  </label>

                  <label
                    className={`p-3 rounded-xl border text-center cursor-pointer transition-all ${
                      testStatus === 'HOLD'
                        ? 'border-rose-500 bg-rose-50 text-rose-800 font-bold ring-2 ring-rose-400'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="qcStatus"
                      value="HOLD"
                      checked={testStatus === 'HOLD'}
                      onChange={() => setTestStatus('HOLD')}
                      className="sr-only"
                    />
                    <Lock className="w-5 h-5 text-rose-600 mx-auto mb-1" />
                    <span className="text-xs font-black block">{t.qcHold}</span>
                    <span className="text-[10px] text-slate-500">{t.qcHoldDesc}</span>
                  </label>

                  <label
                    className={`p-3 rounded-xl border text-center cursor-pointer transition-all ${
                      testStatus === 'REWORK'
                        ? 'border-amber-500 bg-amber-50 text-amber-800 font-bold ring-2 ring-amber-400'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="qcStatus"
                      value="REWORK"
                      checked={testStatus === 'REWORK'}
                      onChange={() => setTestStatus('REWORK')}
                      className="sr-only"
                    />
                    <AlertTriangle className="w-5 h-5 text-amber-600 mx-auto mb-1" />
                    <span className="text-xs font-black block">{t.qcRework}</span>
                    <span className="text-[10px] text-slate-500">{t.qcReworkDesc}</span>
                  </label>
                </div>
              </div>

              {testStatus !== 'PASS' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {t.qcDefectLabel}
                  </label>
                  <textarea
                    rows={2}
                    required
                    placeholder={t.qcDefectPl}
                    value={defectReason}
                    onChange={(e) => setDefectReason(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700"
                >
                  {t.btnCancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
                >
                  {t.btnQcSubmit}
                </button>
              </div>
            </form>
          )}

          {/* 3. Otorisasi Override Release Hold */}
          {activeTab === 'hold_override' && (
            <form onSubmit={handleOverrideSubmit} className="space-y-4">
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold">{t.overrideTitle}</strong>
                  <div className="text-[11px] text-rose-800 mt-0.5">
                    {t.overrideDesc}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t.overrideLotLabel}</label>
                <select
                  value={overrideLot}
                  onChange={(e) => setOverrideLot(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white font-mono font-bold"
                >
                  {qcRecords
                    .filter((r) => r.status === 'HOLD')
                    .map((rec) => (
                      <option key={rec.id} value={rec.id}>
                        {rec.lotNumber} - {rec.itemName} ({rec.defectReason || 'Penyimpangan teknis'})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t.overrideReasonLabel}
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder={t.overrideReasonPl}
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700"
                >
                  {t.btnCancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
                >
                  {t.btnOverrideSubmit}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
