import MainLayout from "../layout/MainLayout";

export default function Reports() {
  return (
    <MainLayout title="Raporlar">
      <div className="card">
        <div className="card-title">Satış Raporları</div>
        <div style={{ marginTop: 8, fontSize: 14 }}>
          Grafikleri backend hazır olduğunda Chart.js ile bağlayacağız. Şu an
          için bu ekran, rapor filtreleri ve grafik placeholder’ı olarak
          davranıyor.
        </div>
      </div>
    </MainLayout>
  );
}
