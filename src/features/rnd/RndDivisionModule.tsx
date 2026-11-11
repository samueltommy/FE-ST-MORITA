import React, { useState } from 'react';
import {
  Sparkles,
  FileCheck2,
  BookOpen,
  Send,
  Plus,
  ArrowRight,
  ExternalLink,
  FlaskConical,
} from 'lucide-react';
import { useAppStore, appStore } from '../../store/useAppStore';
import { ModulePageHeader, PageOptionItem } from '../../components/layout/ModulePageHeader';
import { ModuleFeatureHub, ModuleFeatureHubItem } from '../../components/layout/ModuleFeatureHub';
import { ModuleViewFooter } from '../../components/layout/ModuleViewFooter';

export const RndDivisionModule: React.FC = () => {
  const activeSubFeature = useAppStore((state) => state.activeSubFeature?.rnd);
  const items = useAppStore((state) => state.items);

  const [trials, setTrials] = useState([
    {
      id: 'TR-2026-001',
      formulaCode: 'FORM-ADH-A701',
      name: 'Formula Acrylic Solvent Resistant v2',
      targetSubstrate: 'BoPP Film 40 Micron',
      viscosityCps: '3,800 cPs',
      peelAdhesion: '18.5 N/25mm',
      status: 'APPROVED_FOR_BOM',
      creator: 'Dr. Hendra Wijaya',
      date: '2026-11-01',
    },
    {
      id: 'TR-2026-002',
      formulaCode: 'FORM-TAPE-HT88',
      name: 'High Temperature Masking Adhesive 150C',
      targetSubstrate: 'Crepe Paper 60 Micron',
      viscosityCps: '4,200 cPs',
      peelAdhesion: '14.2 N/25mm',
      status: 'IN_TESTING',
      creator: 'R&D Lab Tech 1',
      date: '2026-11-08',
    },
  ]);

  const [sampleRequests] = useState([
    {
      id: 'SMP-2026-101',
      customerName: 'PT Packaging Nusantara Gemilang',
      contactEmail: 'purchasing@nusantarapack.co.id',
      requestedItem: 'Double Sided Tissue Tape (Trial Formula A701)',
      qty: '5 Roll Sample (12mm x 50m)',
      status: 'DISPATCHED',
      date: '2026-11-05',
    },
    {
      id: 'SMP-2026-102',
      customerName: 'CV Sinar Mandiri Automotive',
      contactEmail: 'rnd@sinarmandiri.com',
      requestedItem: 'High Temp Crepe Masking Tape HT88',
      qty: '3 Roll Sample (24mm x 25m)',
      status: 'PENDING_LAB',
      date: '2026-11-09',
    },
  ]);

  const options: PageOptionItem[] = [
    {
      id: 'rnd_trials',
      label: '1. R&D Trial Formula',
      subtitle: '/rnd/trials • Formulasi formula uji lab',
      icon: FlaskConical,
      badge: `${trials.length} Formula`,
    },
    {
      id: 'convert_bom',
      label: '2. Konversi Formula ke Master BOM',
      subtitle: '/rnd/trials/{id}/convert-to-bom • Rilis ke PPIC',
      icon: FileCheck2,
    },
    {
      id: 'e_catalog',
      label: '3. Publikasi E-Katalog',
      subtitle: '/marketing/catalog • Katalog digital resmi',
      icon: BookOpen,
      badge: `${items.length} Produk`,
    },
    {
      id: 'sample_requests',
      label: '4. Permintaan Sampel',
      subtitle: '/public/request-sample • Sampel prospek',
      icon: Send,
      badge: `${sampleRequests.length} Permintaan`,
    },
  ];

  if (!activeSubFeature) {
    const hubItems: ModuleFeatureHubItem[] = [
      {
        id: 'rnd_trials',
        label: 'R&D Trial Formula (/rnd/trials)',
        subtitle: `Pengujian komposisi formula baru, uji adhesi & viskositas (${trials.length} Formula)`,
        icon: FlaskConical,
        iconColor: 'text-teal-600',
        badge: `${trials.length} Formula`,
        badgeColor: 'bg-teal-100 text-teal-800 border-teal-200',
        onClick: () => appStore.setActiveSubFeature('rnd', 'rnd_trials'),
      },
      {
        id: 'convert_bom',
        label: 'Konversi Formula ke Master BOM (/rnd/trials/{id}/convert-to-bom)',
        subtitle: 'Validasi kelayakan formula trial dan rilis Bill of Materials ke lini produksi PPIC',
        icon: FileCheck2,
        iconColor: 'text-emerald-600',
        badge: 'BOM Conversion',
        badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        onClick: () => appStore.setActiveSubFeature('rnd', 'convert_bom'),
      },
      {
        id: 'e_catalog',
        label: 'Publikasi E-Katalog (/marketing/catalog)',
        subtitle: `Spesifikasi teknis produk jadi & publikasi e-katalog pita perekat industri (${items.length} Item)`,
        icon: BookOpen,
        iconColor: 'text-blue-600',
        badge: `${items.length} Katalog`,
        badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
        onClick: () => appStore.setActiveSubFeature('rnd', 'e_catalog'),
      },
      {
        id: 'sample_requests',
        label: 'Permintaan Sampel (/public/request-sample)',
        subtitle: `Pelacakan permohonan sampel uji pelanggan baru & status dispatch lab (${sampleRequests.length} Permintaan)`,
        icon: Send,
        iconColor: 'text-amber-600',
        badge: `${sampleRequests.length} Permintaan`,
        badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
        onClick: () => appStore.setActiveSubFeature('rnd', 'sample_requests'),
      },
    ];

    return (
      <ModuleFeatureHub
        moduleCode="RND"
        moduleName="DIVISI RESEARCH & DEVELOPMENT (RND)"
        moduleDescription="R&D Trial Formula (/rnd/trials), Konversi Formula ke Master BOM (/rnd/trials/{id}/convert-to-bom), Publikasi E-Katalog (/marketing/catalog), dan Permintaan Sampel (/public/request-sample)."
        headerBgColor="bg-teal-700"
        items={hubItems}
        onBackToHome={() => appStore.setActiveModule('home')}
      />
    );
  }

  const currentTab = activeSubFeature;

  return (
    <div className="space-y-6">
      <ModulePageHeader
        moduleCode="RND"
        title="Divisi Research & Development (RND)"
        description="Trial Formula Adhesif, Konversi BOM PPIC, E-Katalog Produk, & Permintaan Sampel"
        badgeColor="bg-teal-50 text-teal-800 border-teal-200"
        options={options}
        activeOption={currentTab}
        onSelectOption={(opt) => appStore.setActiveSubFeature('rnd', opt)}
        onBackToMenu={() => appStore.setActiveSubFeature('rnd', null)}
        menuName="RND"
      />

      {/* 1. Trial Formula */}
      {currentTab === 'rnd_trials' && (
        <div className="p-6 rounded-3xl bg-white border-2 border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-black text-slate-900">R&D Trial Formula</h3>
              <p className="text-xs text-slate-500 font-mono">Endpoint: GET /api/v1/rnd/trials</p>
            </div>
            <button
              onClick={() => alert('Fitur Tambah Trial Formula: POST /api/v1/rnd/trials')}
              className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Form Trial Baru
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {trials.map((tr) => (
              <div key={tr.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-black text-teal-700 text-xs">{tr.id} • {tr.formulaCode}</span>
                  <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                    tr.status === 'APPROVED_FOR_BOM' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {tr.status}
                  </span>
                </div>
                <div className="font-bold text-slate-900 text-sm">{tr.name}</div>
                <div className="text-xs text-slate-600">Substrat: {tr.targetSubstrate}</div>
                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-200">
                  <div>Viskositas: <strong>{tr.viscosityCps}</strong></div>
                  <div>Peel Adhesion: <strong>{tr.peelAdhesion}</strong></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Convert to BOM */}
      {currentTab === 'convert_bom' && (
        <div className="p-6 rounded-3xl bg-white border-2 border-slate-200 shadow-sm space-y-4">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="text-lg font-black text-slate-900">Konversi Formula ke Master BOM</h3>
            <p className="text-xs text-slate-500 font-mono">Endpoint: POST /api/v1/rnd/trials/{'{id}'}/convert-to-bom</p>
          </div>

          <div className="p-4 rounded-2xl bg-teal-50/60 border border-teal-200 text-xs text-teal-900 space-y-2">
            <div className="font-bold">Alur Konversi Formula R&D ke Bill of Materials:</div>
            <p>Formula yang telah melalui uji lab dan dinyatakan lolos (APPROVED_FOR_BOM) dapat langsung dikonversikan ke master resep produksi (BOM) dengan satu klik untuk digunakan oleh tim PPIC & Produksi.</p>
          </div>

          <div className="space-y-3">
            {trials.map((tr) => (
              <div key={tr.id} className="p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-slate-900 text-sm">{tr.name} ({tr.formulaCode})</div>
                  <div className="text-xs text-slate-500 font-mono">Trial ID: {tr.id} • Dibuat oleh: {tr.creator} ({tr.date})</div>
                </div>
                <button
                  disabled={tr.status !== 'APPROVED_FOR_BOM'}
                  onClick={() => alert(`Berhasil mengonversi ${tr.formulaCode} ke Master BOM Produksi PPIC!`)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
                    tr.status === 'APPROVED_FOR_BOM'
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <FileCheck2 className="w-4 h-4" /> Konversi ke BOM
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. E-Katalog */}
      {currentTab === 'e_catalog' && (
        <div className="p-6 rounded-3xl bg-white border-2 border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-black text-slate-900">Publikasi E-Katalog Produk</h3>
              <p className="text-xs text-slate-500 font-mono">Endpoint: GET /api/v1/marketing/catalog</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold">
              {items.length} Item Tayang
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {items.map((it) => (
              <div key={it.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/40 space-y-2">
                <span className="font-mono text-xs font-bold text-blue-700">{it.code}</span>
                <div className="font-bold text-slate-900 text-sm">{it.name}</div>
                <div className="text-xs text-slate-500">Kategori: {it.category}</div>
                <div className="text-xs text-slate-600 pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span>Satuan: {it.unit}</span>
                  <span className="font-bold text-emerald-700">Rp {it.sellingPrice?.toLocaleString('id-ID')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Sample Requests */}
      {currentTab === 'sample_requests' && (
        <div className="p-6 rounded-3xl bg-white border-2 border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-black text-slate-900">Permintaan Sampel (Sample Requests)</h3>
              <p className="text-xs text-slate-500 font-mono">Endpoint: GET /api/v1/public/request-sample</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
              {sampleRequests.length} Permintaan
            </span>
          </div>

          <div className="space-y-3">
            {sampleRequests.map((s) => (
              <div key={s.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-slate-800 text-xs">{s.id}</span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                    {s.status}
                  </span>
                </div>
                <div className="font-bold text-slate-900 text-sm">{s.customerName} ({s.contactEmail})</div>
                <div className="text-xs text-slate-700">Item Sampel: <strong>{s.requestedItem}</strong></div>
                <div className="text-xs text-slate-500">Jumlah: {s.qty} • Tanggal: {s.date}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <ModuleViewFooter
        onBack={() => appStore.setActiveSubFeature('rnd', null)}
        backLabel="KEMBALI KE MENU RND"
      />
    </div>
  );
};

