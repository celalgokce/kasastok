import MainLayout from "../layout/MainLayout";

export default function Cash() {
  return (
    <MainLayout title="Kasa">
      <div className="card-grid" style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="card-title">Güncel Kasa Bakiyesi</div>
          <div className="card-value">₺0</div>
        </div>
        <div className="card">
          <div className="card-title">Bugünkü Gelir</div>
          <div className="card-value">₺0</div>
        </div>
        <div className="card">
          <div className="card-title">Bugünkü Gider</div>
          <div className="card-value">₺0</div>
        </div>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>Tarih</th>
            <th>Tür</th>
            <th>Açıklama</th>
            <th>Tutar</th>
            <th>Ödeme Tipi</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>23.11.2025</td>
            <td>Gelir</td>
            <td>Örnek Satış</td>
            <td>₺100,00</td>
            <td>Nakit</td>
          </tr>
        </tbody>
      </table>
    </MainLayout>
  );
}
