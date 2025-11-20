import * as XLSX from 'xlsx';
import { Musteri } from '@/types/musteri';
import { formatCurrency } from './kur-hesaplama';

export function musterileriExcelAktar(musteriler: Musteri[]): void {
  // Excel için data hazırla
  const excelData = musteriler.map(m => ({
    'Müşteri Kodu': m.kod,
    'Ad Soyad': m.adSoyad,
    'Telefon': m.telefon,
    'E-posta': m.email || '-',
    'Adres': m.adres,
    'Vergi/TC': m.vergiNoTcKimlik || '-',
    'Konum': m.konum === 'ic' ? 'İş Hanı İçi' : 'Dışarı',
    'Para Birimi': m.varsayilanParaBirimi,
    'Kredi Limiti': m.krediLimiti ? formatCurrency(m.krediLimiti, 'TRY') : '-',
    'Toplam Borç': formatCurrency(m.toplamBorc, 'TRY'),
    'Son İşlem': new Date(m.sonIslemTarihi).toLocaleDateString('tr-TR'),
    'Durum': m.durumu === 'aktif' ? 'Aktif' : 'Pasif',
  }));
  
  // Worksheet oluştur
  const ws = XLSX.utils.json_to_sheet(excelData);
  
  // Kolon genişliklerini ayarla
  ws['!cols'] = [
    { wch: 12 }, // Müşteri Kodu
    { wch: 20 }, // Ad Soyad
    { wch: 15 }, // Telefon
    { wch: 25 }, // E-posta
    { wch: 30 }, // Adres
    { wch: 15 }, // Vergi/TC
    { wch: 15 }, // Konum
    { wch: 10 }, // Para Birimi
    { wch: 15 }, // Kredi Limiti
    { wch: 15 }, // Toplam Borç
    { wch: 12 }, // Son İşlem
    { wch: 10 }, // Durum
  ];
  
  // Workbook oluştur
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Müşteriler');
  
  // Dosya adı
  const tarih = new Date().toISOString().split('T')[0];
  const dosyaAdi = `musteriler_${tarih}.xlsx`;
  
  // Excel dosyasını indir
  XLSX.writeFile(wb, dosyaAdi);
}
