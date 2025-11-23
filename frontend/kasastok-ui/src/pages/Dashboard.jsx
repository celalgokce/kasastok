import MainLayout from "../layout/MainLayout";

export default function Dashboard() {
  return (
    <MainLayout title="Genel Bakış">

      {/* METRİK SATIRI 1: Satış ve Kasa */}
      <div className="card-grid">
        <div className="card">
          <div className="card-title">Bugünkü Satış Adedi</div>
          <div className="card-value">0</div>
        </div>

        <div className="card">
          <div className="card-title">Bugünkü Gelir</div>
          <div className="card-value">₺0</div>
        </div>

        <div className="card">
          <div className="card-title">Bugünkü Gider</div>
          <div className="card-value">₺0</div>
        </div>

        <div className="card">
          <div className="card-title">Net Kasa Bakiyesi</div>
          <div className="card-value">₺0</div>
        </div>
      </div>


      {/* METRİK SATIRI 2: Stok Sağlığı */}
      <div className="card-grid" style={{ marginTop: 20 }}>
        <div className="card">
          <div className="card-title">Minimum Stok Altında Ürün</div>
          <div className="card-value">0</div>
        </div>

        <div className="card">
          <div className="card-title">SKT Yaklaşan Ürün</div>
          <div className="card-value">0</div>
        </div>

        <div className="card">
          <div className="card-title">Toplam Stok Değeri</div>
          <div className="card-value">₺0</div>
        </div>

        <div className="card">
          <div className="card-title">Ortalama Sepet Tutarı</div>
          <div className="card-value">₺0</div>
        </div>
      </div>


      {/* EN ÇOK SATANLAR TABLOSU */}
      <div className="card" style={{ marginTop: 30 }}>
        <div className="card-title">En Çok Satılan Ürünler</div>

        <table className="table" style={{ marginTop: 14 }}>
          <thead>
            <tr>
              <th>Ürün</th>
              <th>Satış Adedi</th>
              <th>Toplam Ciro</th>
            </tr>
          </thead>

          <tbody>
            <tr>
              <td>Örnek Ürün</td>
              <td>25</td>
              <td>₺500</td>
            </tr>

            <tr>
              <td>Örnek Ürün 2</td>
              <td>12</td>
              <td>₺240</td>
            </tr>
          </tbody>
        </table>
      </div>


      {/* STOK BİTİŞ TAHMİNİ (Risk Yönetimi) */}
      <div className="card" style={{ marginTop: 30 }}>
        <div className="card-title">Stok Bitiş Tahmini</div>

        <table className="table" style={{ marginTop: 14 }}>
          <thead>
            <tr>
              <th>Ürün</th>
              <th>Mevcut Stok</th>
              <th>Günlük Tüketim</th>
              <th>Tahmini Bitiş</th>
            </tr>
          </thead>

          <tbody>
            <tr>
              <td>Örnek Ürün</td>
              <td>50</td>
              <td>5 / gün</td>
              <td>10 gün</td>
            </tr>
          </tbody>
        </table>
      </div>


      {/* KATEGORİ BAZLI SATIŞ DAĞILIMI (grafik placeholder) */}
      <div className="card" style={{ marginTop: 30 }}>
        <div className="card-title">Kategori Bazlı Satış Dağılımı</div>
        <div style={{ marginTop: 16, color: "#9ca3af", fontSize: 13 }}>
          Grafik burada gösterilecek. Chart.js entegrasyonu backend hazır olduğunda yapılacak.
        </div>
      </div>

    </MainLayout>
  );
}
