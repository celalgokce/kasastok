import MainLayout from "../layout/MainLayout";

export default function Admin() {
  return (
    <MainLayout title="Kullanıcı ve Yetki Yönetimi">
      <button className="button" style={{ marginBottom: 12 }}>
        Yeni Kullanıcı
      </button>

      <table className="table">
        <thead>
          <tr>
            <th>Kullanıcı</th>
            <th>Rol</th>
            <th>Durum</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>admin</td>
            <td>Yönetici</td>
            <td>Aktif</td>
          </tr>
        </tbody>
      </table>
    </MainLayout>
  );
}
