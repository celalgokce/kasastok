import MainLayout from "../layout/MainLayout";

export default function Stock() {
  return (
    <MainLayout title="Stok Hareketleri">
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input type="date" className="input" />
        <input type="date" className="input" />
        <select className="select">
          <option>Tüm türler</option>
          <option>Giriş</option>
          <option>Çıkış</option>
          <option>İade</option>
        </select>
        <button className="button secondary">Filtrele</button>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>Tarih</th>
            <th>Ürün</th>
            <th>Tür</th>
            <th>Miktar</th>
            <th>Birim Fiyat</th>
            <th>Toplam</th>
            <th>Kullanıcı</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>23.11.2025</td>
            <td>Örnek Ürün</td>
            <td>Giriş</td>
            <td>10</td>
            <td>₺10,00</td>
            <td>₺100,00</td>
            <td>admin</td>
          </tr>
        </tbody>
      </table>
    </MainLayout>
  );
}
