import { NavLink } from "react-router-dom";

const links = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/products", label: "Ürünler" },
  { to: "/stock", label: "Stok Hareketleri" },
  { to: "/cash", label: "Kasa" },
  { to: "/pos", label: "Satış (POS)" },
  { to: "/reports", label: "Raporlar" },
  { to: "/admin", label: "Yönetim" }
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-title">Kasastok</div>
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
    </aside>
  );
}
