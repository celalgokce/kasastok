import { Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Stock from "./pages/Stock";
import Cash from "./pages/Cash";
import Reports from "./pages/Reports";
import Admin from "./pages/Admin";
import Pos from "./pages/Pos";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/products" element={<Products />} />
      <Route path="/stock" element={<Stock />} />
      <Route path="/cash" element={<Cash />} />
      <Route path="/reports" element={<Reports />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/pos" element={<Pos />} />
    </Routes>
  );
}

export default App;

