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

interface GunlukKalem {
  satisNo: string;
  musteriAdi: string;
  urunAdi: string;
  adet: number;
  birimFiyat: number;
  toplam: number;
}

interface GunlukSatis {
  tarih: Date;
  gun: string;
  kalemler: GunlukKalem[];
  gunlukToplam: number;
  isCumartesi: boolean;
  isPazartesi: boolean;
  haftalikToplam?: number;
  tahsilEdilen?: number;
  kalanBorc?: number;
  acilisBakiyesi?: number;
}

export function musteriDefterExcelAktar(
  musteriAdi: string,
  gunlukVeriler: GunlukSatis[]
): void {
  // Sheet 1: Günlük Satışlar
  const gunlukData: any[] = [];
  
  gunlukVeriler.forEach(gun => {
    const tarihStr = gun.tarih.toLocaleDateString('tr-TR');
    const gunStr = gun.gun;
    
    // Pazartesi açılış bakiyesi
    if (gun.isPazartesi && gun.acilisBakiyesi !== undefined) {
      gunlukData.push({
        'Tarih': tarihStr,
        'Gün': gunStr,
        'Açıklama': '📖 AÇILIŞ BAKİYESİ',
        'Ürün Adı': 'Geçen haftadan devreden',
        'Adet': '',
        'Birim Fiyat': '',
        'Toplam': formatCurrency(gun.acilisBakiyesi, 'TRY'),
      });
      gunlukData.push({
        'Tarih': '', 'Gün': '', 'Açıklama': '', 'Ürün Adı': '', 'Adet': '', 'Birim Fiyat': '', 'Toplam': ''
      });
    }
    
    // Günlük satış kalemleri
    gun.kalemler.forEach(kalem => {
      gunlukData.push({
        'Tarih': tarihStr,
        'Gün': gunStr,
        'Açıklama': kalem.satisNo,
        'Ürün Adı': kalem.urunAdi,
        'Adet': kalem.adet,
        'Birim Fiyat': formatCurrency(kalem.birimFiyat, 'TRY'),
        'Toplam': formatCurrency(kalem.toplam, 'TRY'),
      });
    });
    
    // Günlük toplam
    gunlukData.push({
      'Tarih': tarihStr,
      'Gün': gunStr,
      'Açıklama': '--- GÜN TOPLAMI ---',
      'Ürün Adı': '',
      'Adet': '',
      'Birim Fiyat': '',
      'Toplam': formatCurrency(gun.gunlukToplam, 'TRY'),
    });
    
    // Cumartesi haftalık özet
    if (gun.isCumartesi && gun.haftalikToplam !== undefined) {
      gunlukData.push({
        'Tarih': '', 'Gün': '', 'Açıklama': '', 'Ürün Adı': '', 'Adet': '', 'Birim Fiyat': '', 'Toplam': ''
      });
      gunlukData.push({
        'Tarih': tarihStr,
        'Gün': gunStr,
        'Açıklama': '⭐ HAFTALİK TOPLAM SATIŞ',
        'Ürün Adı': '',
        'Adet': '',
        'Birim Fiyat': '',
        'Toplam': formatCurrency(gun.haftalikToplam, 'TRY'),
      });
      gunlukData.push({
        'Tarih': tarihStr,
        'Gün': gunStr,
        'Açıklama': '💰 TAHSİL EDİLEN',
        'Ürün Adı': '',
        'Adet': '',
        'Birim Fiyat': '',
        'Toplam': formatCurrency(gun.tahsilEdilen || 0, 'TRY'),
      });
      gunlukData.push({
        'Tarih': tarihStr,
        'Gün': gunStr,
        'Açıklama': '📉 KALAN BORÇ',
        'Ürün Adı': '',
        'Adet': '',
        'Birim Fiyat': '',
        'Toplam': formatCurrency(gun.kalanBorc || 0, 'TRY'),
      });
    }
    
    // Boş satır ekle
    gunlukData.push({
      'Tarih': '', 'Gün': '', 'Açıklama': '', 'Ürün Adı': '', 'Adet': '', 'Birim Fiyat': '', 'Toplam': ''
    });
  });

  // Sheet 2: Haftalık Özetler
  const haftalikData: any[] = [];
  gunlukVeriler
    .filter(g => g.isCumartesi && g.haftalikToplam !== undefined)
    .forEach(g => {
      haftalikData.push({
        'Hafta Sonu': g.tarih.toLocaleDateString('tr-TR'),
        'Toplam Satış': formatCurrency(g.haftalikToplam || 0, 'TRY'),
        'Tahsilat': formatCurrency(g.tahsilEdilen || 0, 'TRY'),
        'Kalan': formatCurrency(g.kalanBorc || 0, 'TRY'),
      });
    });

  // Workbook oluştur
  const wb = XLSX.utils.book_new();
  
  // Günlük Satışlar Sheet
  const wsGunluk = XLSX.utils.json_to_sheet(gunlukData);
  wsGunluk['!cols'] = [
    { wch: 12 }, // Tarih
    { wch: 12 }, // Gün
    { wch: 25 }, // Açıklama
    { wch: 30 }, // Ürün Adı
    { wch: 8 },  // Adet
    { wch: 15 }, // Birim Fiyat
    { wch: 15 }, // Toplam
  ];
  XLSX.utils.book_append_sheet(wb, wsGunluk, 'Günlük Satışlar');
  
  // Haftalık Özetler Sheet (sadece veri varsa)
  if (haftalikData.length > 0) {
    const wsHaftalik = XLSX.utils.json_to_sheet(haftalikData);
    wsHaftalik['!cols'] = [
      { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }
    ];
    XLSX.utils.book_append_sheet(wb, wsHaftalik, 'Haftalık Özetler');
  }
  
  // Dosya adı
  const tarih = new Date().toISOString().split('T')[0];
  const dosyaAdi = `${musteriAdi.replace(/\s+/g, '_')}_defter_${tarih}.xlsx`;
  
  // Excel dosyasını indir
  XLSX.writeFile(wb, dosyaAdi);
}

export function detayliEkstreExcelOlustur(
  musteri: Musteri,
  baslangicTarihi: Date,
  bitisTarihi: Date
): void {
  const { getHareketlerByMusteriId } = require('./musteri-data');
  const { getSatislar } = require('./satis-data');
  const { getKur } = require('./kur-hesaplama');
  
  // Tüm hareketleri çek
  const tumHareketler = getHareketlerByMusteriId(musteri.id);
  const satislar = getSatislar().filter((s: Satis) => s.musteriId === musteri.id);
  
  // Dönem öncesi ve içi hareketleri ayır
  const donemOncesiHareketler = tumHareketler.filter((h: any) => 
    new Date(h.tarih) < baslangicTarihi
  );
  
  const donemIciHareketler = tumHareketler.filter((h: any) => {
    const t = new Date(h.tarih);
    return t >= baslangicTarihi && t <= bitisTarihi;
  }).sort((a: any, b: any) => new Date(a.tarih).getTime() - new Date(b.tarih).getTime());
  
  // Dönem başı bakiye hesapla
  let donemBasiBakiye = 0;
  donemOncesiHareketler.forEach((h: any) => {
    const tlKarsiligi = h.tutar * getKur(h.paraBirimi);
    if (h.islemTuru === 'satis') {
      donemBasiBakiye += tlKarsiligi;
    } else {
      donemBasiBakiye -= tlKarsiligi;
    }
  });
  
  // Excel satırları
  const rows: any[] = [];
  
  // Başlık bilgileri
  rows.push(['SUPHİ TİCARET - KUŞÇU ALİ']);
  rows.push(['KUYUMCU MAKİNALARI VE MALZEMELERİ']);
  rows.push([]);
  rows.push(['DETAYLI HESAP EKSTRESİ']);
  rows.push([`Müşteri: ${musteri.adSoyad}`]);
  rows.push([`Dönem: ${baslangicTarihi.toLocaleDateString('tr-TR')} - ${bitisTarihi.toLocaleDateString('tr-TR')}`]);
  rows.push([`Düzenleme: ${new Date().toLocaleDateString('tr-TR')}`]);
  rows.push([]);
  rows.push(['TARİH', 'İŞLEM', 'AÇIKLAMA', 'TUTAR', 'BAKİYE']);
  
  // İşlemleri işle
  let bakiye = donemBasiBakiye;
  let toplamSatislar = 0;
  let toplamOdemeler = 0;
  let toplamIadeler = 0;
  
  donemIciHareketler.forEach((hareket: any) => {
    const tarihStr = new Date(hareket.tarih).toLocaleDateString('tr-TR');
    const tlKarsiligi = hareket.tutar * getKur(hareket.paraBirimi);
    
    let islemTipi = '';
    let aciklama = '';
    let tutarStr = '';
    
    if (hareket.islemTuru === 'satis') {
      islemTipi = 'Satış Fatura';
      const satis = satislar.find((s: Satis) => s.id === hareket.musteriId || s.satisNo === hareket.aciklama?.split(' - ')[0]);
      aciklama = satis ? satis.satisNo : hareket.aciklama || 'Satış';
      tutarStr = `+${formatCurrency(tlKarsiligi, 'TRY')}`;
      bakiye += tlKarsiligi;
      toplamSatislar += tlKarsiligi;
      
      // Ana satış satırı
      rows.push([tarihStr, islemTipi, aciklama, tutarStr, formatCurrency(bakiye, 'TRY')]);
      
      // Ürün detayları (alt satırlar)
      if (satis && satis.kalemler) {
        satis.kalemler.forEach((kalem: any) => {
          rows.push([
            tarihStr,
            aciklama,
            `- ${kalem.urunAdi} x${kalem.adet}`,
            '',
            ''
          ]);
        });
      }
    } else if (hareket.islemTuru === 'odeme') {
      islemTipi = hareket.odemeTuru === 'nakit' ? 'Nakit' : 
                  hareket.odemeTuru === 'kredi-karti' ? 'Kredi Kartı' :
                  hareket.odemeTuru === 'eft' ? 'EFT' : 'Havale';
      aciklama = 'TAHSİLAT';
      tutarStr = `-${formatCurrency(tlKarsiligi, 'TRY')}`;
      bakiye -= tlKarsiligi;
      toplamOdemeler += tlKarsiligi;
      
      rows.push([tarihStr, islemTipi, aciklama, tutarStr, formatCurrency(bakiye, 'TRY')]);
    } else if (hareket.islemTuru === 'iade') {
      islemTipi = 'İade';
      aciklama = hareket.aciklama || 'İade İşlemi';
      tutarStr = `-${formatCurrency(tlKarsiligi, 'TRY')}`;
      bakiye -= tlKarsiligi;
      toplamIadeler += tlKarsiligi;
      
      rows.push([tarihStr, islemTipi, aciklama, tutarStr, formatCurrency(bakiye, 'TRY')]);
    }
  });
  
  // Dönem özeti
  rows.push([]);
  rows.push(['', '', 'DÖNEM ÖZETİ', '', '']);
  rows.push(['', '', 'Dönem Başı Bakiye', '', formatCurrency(donemBasiBakiye, 'TRY')]);
  rows.push(['', '', 'Toplam Satışlar', '', `+${formatCurrency(toplamSatislar, 'TRY')}`]);
  rows.push(['', '', 'Toplam Tahsilatlar', '', `-${formatCurrency(toplamOdemeler, 'TRY')}`]);
  rows.push(['', '', 'Toplam İadeler', '', `-${formatCurrency(toplamIadeler, 'TRY')}`]);
  rows.push(['', '', 'DÖNEM SONU BAKİYE', '', formatCurrency(bakiye, 'TRY')]);
  
  // Excel oluştur
  const ws = XLSX.utils.aoa_to_sheet(rows);
  
  // Kolon genişlikleri
  ws['!cols'] = [
    { wch: 12 },  // Tarih
    { wch: 15 },  // İşlem
    { wch: 40 },  // Açıklama
    { wch: 15 },  // Tutar
    { wch: 15 },  // Bakiye
  ];
  
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Hesap Ekstresi');
  
  // Dosya adı
  const tarih = new Date().toISOString().split('T')[0];
  const dosyaAdi = `${musteri.adSoyad.replace(/\s+/g, '_')}_detayli_ekstre_${tarih}.xlsx`;
  
  XLSX.writeFile(wb, dosyaAdi);
}
