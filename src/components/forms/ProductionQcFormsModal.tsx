import React, { useState } from 'react';
import { X, ShieldAlert, CheckCircle2, AlertTriangle, FileSpreadsheet, Lock, Unlock, Sparkles, Award } from 'lucide-react';
import { useAppStore, appStore } from '../../store/useAppStore';
import { WorkOrderSpk, QcInspectionRecord, QcStatus } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'spk' | 'qc_test' | 'hold_override' | 'coa';
}

export const ProductionQcFormsModal: React.FC<Props> = ({ isOpen, onClose, defaultTab = 'spk' }) => {
  const [activeTab, setActiveTab] = useState<'spk' | 'qc_test' | 'hold_override' | 'coa'>(defaultTab);
  const currentUnit = useAppStore((state) => state.currentBusinessUnit);
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
    const onHoldItems = qcRecords.filter((r) => r.status === 'HOLD' && r.businessUnit === currentUnit);
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
      businessUnit: currentUnit,
    };

    appStore.addWorkOrder(newSpk);
    if (isMaterialBlocked) {
      setSuccessMessage(`SPK ${spkNumber} berhasil diterbitkan namun DIBLOKIR SEMENTARA (Status: HOLD_BLOCKED) karena bahan baku terkait sedang dicekal QC.`);
    } else {
      setSuccessMessage(`SPK ${spkNumber} berhasil diterbitkan dan siap dikerjakan di ${spkLine}.`);
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
      businessUnit: currentUnit,
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
      coaNumber: testStatus === 'PASS' ? `COA/SM-${currentUnit.slice(0, 3)}/${new Date().getFullYear()}/${Math.floor(Math.random() * 9000 + 1000)}` : undefined,
    };

    appStore.addQcInspection(newQc);

    if (isHold) {
      setSuccessMessage(`PERINGATAN: Lot ${testLotNumber} BERSTATUS [QC HOLD]! Sistem Lockout otomatis mengunci transfer & penerbitan DO untuk lot ini.`);
    } else {
      setSuccessMessage(`Hasil Pengujian QC Lot ${testLotNumber} [${testStatus}] berhasil dicatat & diterbitkan.`);
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
    setSuccessMessage(`Otorisasi Override QC Hold berhasil. Kunci blokir sistem untuk lot tersebut telah dibuka resmi.`);
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
              <span>Formulir Produksi & Kontrol Mutu (SPK & QC Hold Lockout)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Penerbitan SPK (validasi blokir bahan baku), Formulir Uji Lab IQC/PQC, & Otorisasi Buka Kunci (Release Hold)
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
            <span>Penerbitan SPK (Work Order)</span>
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
            <span>Input Uji Mutu QC (IQC & PQC)</span>
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
            <span>Otorisasi Release QC Hold</span>
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nomor SPK Produksi</label>
                  <input
                    type="text"
                    required
                    value={spkNumber}
                    onChange={(e) => setSpkNumber(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Referensi IO / PO Pelanggan</label>
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kode Produk</label>
                  <input
                    type="text"
                    required
                    value={spkItemCode}
                    onChange={(e) => setSpkItemCode(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nama Produk yang Dikonversi</label>
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">Target Qty</label>
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">Lebar (mm)</label>
                  <input
                    type="number"
                    required
                    value={spkWidthMm}
                    onChange={(e) => setSpkWidthMm(Number(e.target.value) || 1)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Panjang (m)</label>
                  <input
                    type="number"
                    required
                    value={spkLengthM}
                    onChange={(e) => setSpkLengthM(Number(e.target.value) || 1)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tebal (µm)</label>
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mesin Produksi</label>
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">Operator Penanggung Jawab</label>
                  <input
                    type="text"
                    required
                    value={spkOperator}
                    onChange={(e) => setSpkOperator(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Target Selesai (Due Date)</label>
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
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
                >
                  Terbitkan SPK Produksi
                </button>
              </div>
            </form>
          )}

          {/* 2. Form Input Uji Mutu QC */}
          {activeTab === 'qc_test' && (
            <form onSubmit={handleQcTestSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nomor Lot Uji</label>
                  <input
                    type="text"
                    required
                    value={testLotNumber}
                    onChange={(e) => setTestLotNumber(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kode Item</label>
                  <input
                    type="text"
                    required
                    value={testItemCode}
                    onChange={(e) => setTestItemCode(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Ukuran Batch (Jumlah Roll)</label>
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
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Produk / Lot Diuji</label>
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
                  Hasil Parameter Uji Laboratorium
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Ketebalan Tape (Micron)</label>
                    <input
                      type="text"
                      value={testMicronActual}
                      onChange={(e) => setTestMicronActual(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Standar: 135 ± 3 µm</span>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Daya Rekat (Adhesion N/25mm)</label>
                    <input
                      type="text"
                      value={testAdhesionActual}
                      onChange={(e) => setTestAdhesionActual(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Standar: ≥ 14.0 N</span>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Pelepasan Liner (g/25mm)</label>
                    <input
                      type="text"
                      value={testLinerActual}
                      onChange={(e) => setTestLinerActual(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">Standar: 20 - 30 g</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Keputusan Status Mutu QC</label>
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
                    <span className="text-xs font-black block">[PASS] LULUS</span>
                    <span className="text-[10px] text-slate-500">Terbitkan COA Resmi</span>
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
                    <span className="text-xs font-black block">[HOLD] CEKAL</span>
                    <span className="text-[10px] text-slate-500">Kunci Blokir Sistem</span>
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
                    <span className="text-xs font-black block">[REWORK] PROSES ULANG</span>
                    <span className="text-[10px] text-slate-500">Slitting / Trimming Ulang</span>
                  </label>
                </div>
              </div>

              {testStatus !== 'PASS' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Alasan Pencekalan / Catatan Penyimpangan Mutu (Wajib diisi jika HOLD / REWORK)
                  </label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Contoh: Ketebalan lapisan adhesive melampaui toleransi atas (+5.2 µm) sehingga berisiko bleeding lem..."
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
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
                >
                  Simpan Keputusan QC
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
                  <strong className="font-bold">Otorisasi Khusus Level 1 (QC Manager / Direksi):</strong>
                  <div className="text-[11px] text-rose-800 mt-0.5">
                    Membuka cekal QC Hold secara manual memerlukan justifikasi teknis formal yang akan direkam dalam log audit SHA-256 dan dilaporkan ke Board of Directors.
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Pilih Batch Lot yang Sedang Dicekal (HOLD)</label>
                <select
                  value={overrideLot}
                  onChange={(e) => setOverrideLot(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white font-mono font-bold"
                >
                  {qcRecords
                    .filter((r) => r.status === 'HOLD' && r.businessUnit === currentUnit)
                    .map((rec) => (
                      <option key={rec.id} value={rec.id}>
                        {rec.lotNumber} - {rec.itemName} ({rec.defectReason || 'Penyimpangan teknis'})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Justifikasi Teknis Pelepasan Cekal (Dispensasi QC)
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Contoh: Telah dilakukan uji komparasi suhu ruangan 30°C dan aplikasi non-kritis dengan persetujuan Section Head QC & Direksi..."
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
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
                >
                  Buka Kunci Cekal (Release Hold)
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
