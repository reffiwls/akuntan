import React from 'react';
import { Transaction, AppSettings } from '../types';
import { formatRupiah, formatDateIndo, formatDateShort } from '../utils/formatters';

interface PrintableReportProps {
  transactions: Transaction[];
  settings: AppSettings;
  periodTitle?: string;
  customRange?: { start?: string; end?: string };
}

export const PrintableReport: React.FC<PrintableReportProps> = ({
  transactions,
  settings,
  periodTitle,
  customRange
}) => {
  const totalPengeluaran = transactions.reduce((sum, t) => sum + t.total, 0);
  const totalTunai = transactions.filter((t) => t.metodeBayar === 'Tunai').reduce((sum, t) => sum + t.total, 0);
  const totalTransfer = transactions.filter((t) => t.metodeBayar === 'Transfer Bank').reduce((sum, t) => sum + t.total, 0);

  // Group by category for summary box
  const categorySummary = transactions.reduce((acc, t) => {
    acc[t.kategori] = (acc[t.kategori] || 0) + t.total;
    return acc;
  }, {} as Record<string, number>);

  const printDateStr = new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'full',
    timeStyle: 'short'
  }).format(new Date());

  const periodText = periodTitle || (customRange?.start && customRange?.end
    ? `${formatDateShort(customRange.start)} s/d ${formatDateShort(customRange.end)}`
    : 'Semua Transaksi Tercatat');

  return (
    <div className="print-document hidden print:block text-black bg-white p-6 sm:p-8 font-sans text-xs leading-normal">
      {/* KOP / HEADER RESMI */}
      <div className="border-b-2 border-black pb-4 mb-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-bold tracking-widest uppercase text-stone-600 block">
              BADAN GIZI NASIONAL • PROGRAM MAKAN BERGIZI GRATIS (MBG)
            </span>
            <h1 className="text-lg font-black tracking-tight text-black uppercase mt-0.5">
              REKAP OPERASIONAL & PERTANGGUNGJAWABAN BELANJA
            </h1>
            <p className="text-xs font-bold text-stone-800">
              Satuan Pelayanan Pemenuhan Gizi (SPPG): {settings.unitName || 'SPPG Mandiri'}
            </p>
          </div>
          <div className="text-right text-[10px] text-stone-600 font-mono">
            <p>ID Unit: {settings.unitId || 'SPPG-MBG-01'}</p>
            <p>Petugas: {settings.cashierName || 'Admin SPPG'}</p>
            <p>Dicetak: {printDateStr}</p>
          </div>
        </div>
      </div>

      {/* METADATA PERIODE & RINGKASAN FINANSIAL */}
      <div className="grid grid-cols-3 gap-3 mb-5 border border-stone-300 rounded-lg p-3 bg-stone-50">
        <div>
          <span className="text-[10px] text-stone-500 font-semibold uppercase block">Periode Laporan</span>
          <span className="font-bold text-black text-xs">{periodText}</span>
        </div>
        <div>
          <span className="text-[10px] text-stone-500 font-semibold uppercase block">Rincian Pembayaran</span>
          <span className="font-medium text-stone-800 text-[11px]">
            Tunai: {formatRupiah(totalTunai)} | Transfer: {formatRupiah(totalTransfer)}
          </span>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-stone-500 font-semibold uppercase block">Total Pengeluaran</span>
          <span className="font-black text-sm text-black font-mono">{formatRupiah(totalPengeluaran)}</span>
        </div>
      </div>

      {/* RINGKASAN PER KATEGORI (MINI TABLE) */}
      <div className="mb-5">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-stone-700 mb-1.5">
          Rekapitulasi Kategori Anggaran
        </h3>
        <div className="grid grid-cols-3 gap-2 text-[11px]">
          {Object.entries(categorySummary).map(([cat, amount]) => (
            <div key={cat} className="flex justify-between border-b border-stone-200 py-1">
              <span className="text-stone-700">{cat}:</span>
              <span className="font-bold font-mono text-black">{formatRupiah(Number(amount))}</span>
            </div>
          ))}
        </div>
      </div>

      {/* TABEL RINCIAN TRANSAKSI */}
      <div className="mb-6">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-stone-700 mb-1.5">
          Rincian Transaksi Belanja ({transactions.length} Item)
        </h3>
        <table className="w-full border-collapse border border-black text-[10px]">
          <thead>
            <tr className="bg-stone-200 text-black font-bold text-center">
              <th className="border border-black p-1.5 w-8">No</th>
              <th className="border border-black p-1.5 w-20">Tanggal</th>
              <th className="border border-black p-1.5 w-28">Kategori</th>
              <th className="border border-black p-1.5 text-left">Uraian Belanja / Barang</th>
              <th className="border border-black p-1.5 w-16">Volume</th>
              <th className="border border-black p-1.5 text-right w-24">Harga Satuan</th>
              <th className="border border-black p-1.5 w-16">Metode</th>
              <th className="border border-black p-1.5 text-right w-28">Total (Rp)</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={8} className="border border-black p-4 text-center text-stone-500 italic">
                  Tidak ada transaksi yang tercatat pada periode ini.
                </td>
              </tr>
            ) : (
              transactions.map((t, idx) => (
                <tr key={t.id} className="even:bg-stone-50">
                  <td className="border border-black p-1.5 text-center font-mono">{idx + 1}</td>
                  <td className="border border-black p-1.5 text-center whitespace-nowrap">{t.tanggal}</td>
                  <td className="border border-black p-1.5">{t.kategori}</td>
                  <td className="border border-black p-1.5">
                    <span className="font-semibold block">{t.item}</span>
                    {t.catatan && (
                      <span className="text-[9px] text-stone-600 italic block">
                        Ket: {t.catatan}
                      </span>
                    )}
                  </td>
                  <td className="border border-black p-1.5 text-center font-mono">
                    {t.qty} {t.satuan}
                  </td>
                  <td className="border border-black p-1.5 text-right font-mono">
                    {formatRupiah(t.hargaSatuan, false)}
                  </td>
                  <td className="border border-black p-1.5 text-center">{t.metodeBayar}</td>
                  <td className="border border-black p-1.5 text-right font-bold font-mono">
                    {formatRupiah(t.total, false)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="bg-stone-200 text-black font-black text-[11px]">
              <td colSpan={7} className="border border-black p-2 text-right uppercase tracking-wider">
                GRAND TOTAL PENGELUARAN:
              </td>
              <td className="border border-black p-2 text-right font-mono">
                {formatRupiah(totalPengeluaran)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* KOLOM TANDA TANGAN RESMI (3 PIHAK) */}
      <div className="pt-4 page-break-inside-avoid">
        <div className="grid grid-cols-3 gap-4 text-center text-[10px]">
          {/* Kolom 1: Kasir / Akuntan */}
          <div className="flex flex-col justify-between h-28">
            <div>
              <p className="font-semibold text-stone-700">Dibuat Oleh,</p>
              <p className="font-bold text-black uppercase">Petugas Kasir / Akuntan SPPG</p>
            </div>
            <div>
              <p className="font-bold text-black border-b border-black pb-1 inline-block min-w-[140px]">
                {settings.cashierName || '( ................................... )'}
              </p>
              <p className="text-[9px] text-stone-600">Kasir Lapangan MBG</p>
            </div>
          </div>

          {/* Kolom 2: Kepala Dapur */}
          <div className="flex flex-col justify-between h-28">
            <div>
              <p className="font-semibold text-stone-700">Diperiksa Oleh,</p>
              <p className="font-bold text-black uppercase">Kepala Dapur MBG</p>
            </div>
            <div>
              <p className="font-bold text-black border-b border-black pb-1 inline-block min-w-[140px]">
                ( ................................... )
              </p>
              <p className="text-[9px] text-stone-600">Manajer Operasional Dapur</p>
            </div>
          </div>

          {/* Kolom 3: Koordinator SPPG */}
          <div className="flex flex-col justify-between h-28">
            <div>
              <p className="font-semibold text-stone-700">Disetujui & Disahkan,</p>
              <p className="font-bold text-black uppercase">Koordinator SPPG</p>
            </div>
            <div>
              <p className="font-bold text-black border-b border-black pb-1 inline-block min-w-[140px]">
                ( ................................... )
              </p>
              <p className="text-[9px] text-stone-600">Penanggung Jawab Unit</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
