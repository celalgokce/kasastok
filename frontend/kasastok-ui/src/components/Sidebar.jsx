import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const links = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/products", label: "Ürünler" },
  { to: "/stock", label: "Stok Hareketleri" },
  { to: "/cash", label: "Kasa" },
  { to: "/pos", label: "Satış (POS)" },
  { to: "/reports", label: "Raporlar" },
];

export default function Sidebar() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    if (window.confirm("Çıkış yapmak istediğinize emin misiniz?")) {
      logout();
      navigate("/login");
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case "Admin": return "Yönetici";
      case "Manager": return "Müdür";
      default: return "Kasiyer";
    }
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-title">Kasastok</div>
      
      {/* Kullanıcı Bilgisi */}
      {user && (
        <div style={{
          padding: "12px 20px",
          borderBottom: "1px solid #3d3d5c",
          marginBottom: "10px",
          fontSize: "13px",
          color: "#9ca3af"
        }}>
          <div style={{ color: "#fff", fontWeight: 600 }}>{user.fullName}</div>
          <div>{getRoleLabel(user.role)}</div>
        </div>
      )}

      {/* Ana Menü */}
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          className={({ isActive }) =>
            "sidebar-link" + (isActive ? " active" : "")
          }
        >
          {link.label}
        </NavLink>
      ))}

      {/* Admin Menü */}
      {isAdmin && (
        <NavLink
          to="/admin"
          className={({ isActive }) =>
            "sidebar-link" + (isActive ? " active" : "")
          }
        >
          Yönetim
        </NavLink>
      )}

      {/* Çıkış Butonu */}
      <div style={{ 
        marginTop: "auto", 
        padding: "20px 10px",
        borderTop: "1px solid #3d3d5c"
      }}>
        <button
          onClick={handleLogout}
          style={{
            width: "100%",
            padding: "10px",
            background: "rgba(239, 68, 68, 0.15)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: "8px",
            color: "#ef4444",
            cursor: "pointer",
            fontSize: "14px"
          }}
        >
          Çıkış Yap
        </button>
      </div>
    </aside>
  );
}
