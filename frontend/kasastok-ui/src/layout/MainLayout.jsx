import Sidebar from "../components/Sidebar";

export default function MainLayout({ title, children }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main">
        <header className="main-header">
          <div style={{ fontSize: 18, fontWeight: 500 }}>{title}</div>
          <div style={{ fontSize: 13, color: "#9ca3af" }}>
            22290410 · Celal Gökçe · Kasa ve Stok Yönetimi
          </div>
        </header>
        <main className="main-content">{children}</main>
      </div>
    </div>
  );
}
