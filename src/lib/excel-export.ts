import * as XLSX from 'xlsx';
import { Musteri } from '@/types/musteri';
import { Satis } from '@/types/satis';
import { formatCurrency } from './kur-hesaplama';
import { GunlukSatisRapor, MusteriBorcRapor, StokDurumRapor } from './rapor-olustur';

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
    'Toplam Borç': formatCurrency(m.toplamBorcTL, 'TRY'),
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

export function satislariExcelAktar(rapor: GunlukSatisRapor): void {
  // Özet bilgiler
  const ozetData = [
    { 'Bilgi': 'Tarih', 'Değer': new Date(rapor.tarih).toLocaleDateString('tr-TR') },
    { 'Bilgi': 'Toplam Satış', 'Değer': formatCurrency(rapor.toplamSatis, 'TRY') },
    { 'Bilgi': 'Toplam Adet', 'Değer': rapor.toplamAdet },
    { 'Bilgi': 'Ortalama Sepet', 'Değer': formatCurrency(rapor.ortalamaSepet, 'TRY') },
    { 'Bilgi': 'Satış Sayısı', 'Değer': rapor.satislar.length },
  ];

  // Satış detayları
  const satisData = rapor.satislar.map(s => ({
    'Satış No': s.satisNo,
    'Tarih': new Date(s.tarih).toLocaleString('tr-TR'),
    'Tür': s.satisTuru === 'hesapli' ? 'Hesaplı' : s.satisTuru === 'rezerv' ? 'Rezerv' : 'Hızlı',
    'Müşteri': s.musteriAdi || '-',
    'Ürün Sayısı': s.kalemler.length,
    'Ara Toplam': formatCurrency(s.araToplam, 'TRY'),
    'KDV': formatCurrency(s.toplamKDV, 'TRY'),
    'İndirim': formatCurrency(s.genelIndirimTL, 'TRY'),
    'Genel Toplam': formatCurrency(s.genelToplam, 'TRY'),
    'Durum': s.durum === 'tamamlandi' ? 'Tamamlandı' : s.durum === 'rezerv' ? 'Rezerv' : 'İptal',
  }));

  // Workbook oluştur
  const wb = XLSX.utils.book_new();
  
  // Özet sheet
  const wsOzet = XLSX.utils.json_to_sheet(ozetData);
  wsOzet['!cols'] = [{ wch: 20 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(wb, wsOzet, 'Özet');
  
  // Satışlar sheet
  const wsSatis = XLSX.utils.json_to_sheet(satisData);
  wsSatis['!cols'] = [
    { wch: 12 }, { wch: 18 }, { wch: 10 }, { wch: 20 }, 
    { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 12 }
  ];
  XLSX.utils.book_append_sheet(wb, wsSatis, 'Satışlar');

  // Dosya adı
  const dosyaAdi = `satis_raporu_${rapor.tarih}.xlsx`;
  XLSX.writeFile(wb, dosyaAdi);
}

export function musteriBorcExcelAktar(raporlar: MusteriBorcRapor[]): void {
  const excelData = raporlar.map(r => ({
    'Müşteri Kodu': r.musteriId,
    'Ad Soyad': r.musteriAdi,
    'Konum': r.konum === 'ic' ? 'İş Hanı İçi' : 'Dışarı',
    'Para Birimi': r.paraBirimi,
    'Borç (Orijinal)': formatCurrency(r.borcOrijinal, r.paraBirimi as any),
    'Borç (TL)': formatCurrency(r.borcTL, 'TRY'),
  }));

  const ws = XLSX.utils.json_to_sheet(excelData);
  ws['!cols'] = [
    { wch: 15 }, { wch: 25 }, { wch: 15 }, 
    { wch: 12 }, { wch: 18 }, { wch: 18 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Müşteri Borçları');

  const tarih = new Date().toISOString().split('T')[0];
  const dosyaAdi = `musteri_borc_raporu_${tarih}.xlsx`;
  XLSX.writeFile(wb, dosyaAdi);
}

export function stokDurumuExcelAktar(raporlar: StokDurumRapor[]): void {
  const excelData = raporlar.map(r => ({
    'Kategori': r.kategori,
    'Toplam Ürün': r.toplamUrun,
    'Stok Değeri': formatCurrency(r.toplamStokDegeri, 'TRY'),
    'Kritik Stok Ürün': r.kritikStokUrunler,
  }));

  const ws = XLSX.utils.json_to_sheet(excelData);
  ws['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 18 }, { wch: 18 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Stok Durumu');

  const tarih = new Date().toISOString().split('T')[0];
  const dosyaAdi = `stok_durum_raporu_${tarih}.xlsx`;
  XLSX.writeFile(wb, dosyaAdi);
}

export function karZararExcelAktar(analiz: any, baslangic: Date, bitis: Date): void {
  const ozetData = [
    { 'Bilgi': 'Başlangıç Tarihi', 'Değer': baslangic.toLocaleDateString('tr-TR') },
    { 'Bilgi': 'Bitiş Tarihi', 'Değer': bitis.toLocaleDateString('tr-TR') },
    { 'Bilgi': 'Toplam Satış', 'Değer': formatCurrency(analiz.toplamSatis, 'TRY') },
    { 'Bilgi': 'Toplam Maliyet', 'Değer': formatCurrency(analiz.toplamMaliyet, 'TRY') },
    { 'Bilgi': 'Brüt Kar', 'Değer': formatCurrency(analiz.brutKar, 'TRY') },
    { 'Bilgi': 'Kar Marjı', 'Değer': `%${analiz.karMarji.toFixed(2)}` },
  ];

  const ws = XLSX.utils.json_to_sheet(ozetData);
  ws['!cols'] = [{ wch: 20 }, { wch: 25 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Kar-Zarar Analizi');

  const tarih = new Date().toISOString().split('T')[0];
  const dosyaAdi = `kar_zarar_analizi_${tarih}.xlsx`;
  XLSX.writeFile(wb, dosyaAdi);
}
