/**
 * Veri Yedekleme ve Geri Yükleme Sistemi
 * 
 * Şirket verilerinin yedeklenmesi ve geri yüklenmesi için kullanılır.
 * Tüm localStorage verileri JSON formatında yedeklenir.
 */

interface BackupData {
  timestamp: string;
  version: string;
  data: {
    urunler: string | null;
    musteriler: string | null;
    hareketler: string | null;
    satislar: string | null;
    tedarikciler: string | null;
    tedarikciAlimlar: string | null;
    ayarlar: string | null;
    stokHareketleri: string | null;
  };
}

/**
 * Tüm uygulama verilerini yedekler
 * @returns JSON string formatında yedek verisi
 */
export function backupAllData(): string {
  const backup: BackupData = {
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    data: {
      urunler: localStorage.getItem('kuyumcu_stok_urunler'),
      musteriler: localStorage.getItem('kuyumcu_musteriler'),
      hareketler: localStorage.getItem('kuyumcu_hesap_hareketleri'),
      satislar: localStorage.getItem('kuyumcu_satislar'),
      tedarikciler: localStorage.getItem('kuyumcu_tedarikciler'),
      tedarikciAlimlar: localStorage.getItem('kuyumcu_tedarikci_alimlar'),
      ayarlar: localStorage.getItem('kuyumcu_ayarlar'),
      stokHareketleri: localStorage.getItem('kuyumcu_stok_hareketleri'),
    }
  };
  
  return JSON.stringify(backup, null, 2);
}

/**
 * Yedeği JSON dosyası olarak indirir
 */
export function downloadBackup(): void {
  try {
    const backup = backupAllData();
    const blob = new Blob([backup], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const tarih = new Date().toISOString().split('T')[0];
    const saat = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
    
    a.href = url;
    a.download = `kuyumcu-yedek-${tarih}-${saat}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('✅ Yedek başarıyla indirildi');
  } catch (error) {
    console.error('❌ Yedek indirme hatası:', error);
    throw new Error('Yedek dosyası oluşturulamadı');
  }
}

/**
 * Yedek dosyasından verileri geri yükler
 * @param backupJson JSON string formatında yedek verisi
 * @returns Başarılı ise true, değilse false
 */
export function restoreFromBackup(backupJson: string): boolean {
  try {
    const backup: BackupData = JSON.parse(backupJson);
    
    // Versiyon kontrolü
    if (!backup.version || !backup.timestamp) {
      throw new Error('Geçersiz yedek dosyası formatı');
    }
    
    // Verileri geri yükle
    if (backup.data.urunler) {
      localStorage.setItem('kuyumcu_stok_urunler', backup.data.urunler);
    }
    if (backup.data.musteriler) {
      localStorage.setItem('kuyumcu_musteriler', backup.data.musteriler);
    }
    if (backup.data.hareketler) {
      localStorage.setItem('kuyumcu_hesap_hareketleri', backup.data.hareketler);
    }
    if (backup.data.satislar) {
      localStorage.setItem('kuyumcu_satislar', backup.data.satislar);
    }
    if (backup.data.tedarikciler) {
      localStorage.setItem('kuyumcu_tedarikciler', backup.data.tedarikciler);
    }
    if (backup.data.tedarikciAlimlar) {
      localStorage.setItem('kuyumcu_tedarikci_alimlar', backup.data.tedarikciAlimlar);
    }
    if (backup.data.ayarlar) {
      localStorage.setItem('kuyumcu_ayarlar', backup.data.ayarlar);
    }
    if (backup.data.stokHareketleri) {
      localStorage.setItem('kuyumcu_stok_hareketleri', backup.data.stokHareketleri);
    }
    
    console.log('✅ Yedek başarıyla geri yüklendi');
    return true;
  } catch (error) {
    console.error('❌ Yedek geri yükleme hatası:', error);
    return false;
  }
}

/**
 * Otomatik yedekleme - localStorage'daki her değişiklikten önce
 * @returns Yedek verisi string
 */
export function createAutoBackup(): string {
  const backup = backupAllData();
  
  // Son 5 otomatik yedeği localStorage'da sakla
  const autoBackups = JSON.parse(localStorage.getItem('kuyumcu_auto_backups') || '[]');
  autoBackups.push({
    timestamp: new Date().toISOString(),
    data: backup
  });
  
  // En fazla 5 yedek sakla
  if (autoBackups.length > 5) {
    autoBackups.shift();
  }
  
  localStorage.setItem('kuyumcu_auto_backups', JSON.stringify(autoBackups));
  
  return backup;
}

/**
 * Otomatik yedeklerden birini geri yükle
 * @param index Yedek indeksi (0 = en eski, 4 = en yeni)
 * @returns Başarılı ise true
 */
export function restoreAutoBackup(index: number): boolean {
  try {
    const autoBackups = JSON.parse(localStorage.getItem('kuyumcu_auto_backups') || '[]');
    
    if (index < 0 || index >= autoBackups.length) {
      throw new Error('Geçersiz yedek indeksi');
    }
    
    return restoreFromBackup(autoBackups[index].data);
  } catch (error) {
    console.error('❌ Otomatik yedek geri yükleme hatası:', error);
    return false;
  }
}

/**
 * Tüm otomatik yedekleri listele
 * @returns Otomatik yedeklerin listesi
 */
export function listAutoBackups(): Array<{ timestamp: string; index: number }> {
  try {
    const autoBackups = JSON.parse(localStorage.getItem('kuyumcu_auto_backups') || '[]');
    return autoBackups.map((backup: any, index: number) => ({
      timestamp: backup.timestamp,
      index
    }));
  } catch (error) {
    console.error('❌ Otomatik yedekleri listeleme hatası:', error);
    return [];
  }
}
