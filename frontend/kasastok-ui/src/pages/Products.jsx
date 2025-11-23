import { useState, useEffect } from "react";
import MainLayout from "../layout/MainLayout";

const API = "http://localhost:5256/api/products";

export default function Products() {
  const [createMode, setCreateMode] = useState(false);
  const [editId, setEditId] = useState(null);
  const [products, setProducts] = useState([]);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [barcode, setBarcode] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [stock, setStock] = useState("");
  const [unit, setUnit] = useState("adet");
  const [hasExpiration, setHasExpiration] = useState(false);
  const [expirationDate, setExpirationDate] = useState("");

  // ------------------------------
  //  API'DEN VERİ ÇEK
  // ------------------------------
  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    const res = await fetch(API);
    const data = await res.json();
    setProducts(data);
  }

  const resetForm = () => {
    setCreateMode(false);
    setEditId(null);
    setName("");
    setCategory("");
    setBarcode("");
    setCostPrice("");
    setSalePrice("");
    setStock("");
    setUnit("adet");
    setHasExpiration(false);
    setExpirationDate("");
  };

  // ------------------------------
  //  KAYDET (CREATE + UPDATE)
  // ------------------------------
  const handleSave = async () => {
    const payload = {
      name,
      category,
      barcode,
      costPrice: parseFloat(costPrice),
      salePrice: parseFloat(salePrice),
      stock: parseFloat(stock),
      unit,
      hasExpiration,
      expirationDate: hasExpiration ? expirationDate : null
    };

    if (editId) {
      await fetch(`${API}/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    resetForm();
    loadProducts();
  };

  // ------------------------------
  //  DÜZENLE
  // ------------------------------
  const handleEdit = (p) => {
    setEditId(p.id);
    setCreateMode(true);
    setName(p.name);
    setCategory(p.category);
    setBarcode(p.barcode);
    setCostPrice(p.costPrice);
    setSalePrice(p.salePrice);
    setStock(p.stock);
    setUnit(p.unit);
    setHasExpiration(p.hasExpiration);
    setExpirationDate(p.expirationDate || "");
  };

  // ------------------------------
  //  SİL
  // ------------------------------
  const handleDelete = async (id) => {
    await fetch(`${API}/${id}`, { method: "DELETE" });
    loadProducts();
  };

  return (
    <MainLayout title="Ürün Yönetimi">
      {createMode ? (
        <div className="card" style={{ maxWidth: 450 }}>
          <h3>{editId ? "Ürünü Düzenle" : "Yeni Ürün"}</h3>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
            <input className="input" placeholder="Ürün adı" value={name} onChange={e => setName(e.target.value)} />
            <input className="input" placeholder="Kategori" value={category} onChange={e => setCategory(e.target.value)} />
            <input className="input" placeholder="Barkod" value={barcode} onChange={e => setBarcode(e.target.value)} />

            <select className="select" value={unit} onChange={e => setUnit(e.target.value)}>
              <option value="adet">Adet</option>
              <option value="kg">Kg</option>
              <option value="litre">Litre</option>
            </select>

            <input className="input" placeholder="Maliyet fiyatı" value={costPrice} type="number" onChange={e => setCostPrice(e.target.value)} />
            <input className="input" placeholder="Satış fiyatı" value={salePrice} type="number" onChange={e => setSalePrice(e.target.value)} />
            <input className="input" placeholder="Stok" value={stock} onChange={e => setStock(e.target.value)} type="number" />

            <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input type="checkbox" checked={hasExpiration} onChange={e => setHasExpiration(e.target.checked)} />
              Son kullanma tarihi var
            </label>

            {hasExpiration && (
              <input type="date" className="input" value={expirationDate} onChange={e => setExpirationDate(e.target.value)} />
            )}

            <button className="button" onClick={handleSave}>
              {editId ? "Güncelle" : "Kaydet"}
            </button>

            <button className="button secondary" onClick={resetForm}>
              İptal
            </button>
          </div>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 12, display: "flex", gap: 8 }}>
            <input className="input" placeholder="Ürün adı veya barkod ara" />
            <button className="button" onClick={() => setCreateMode(true)}>Yeni Ürün</button>
          </div>

          <table className="table">
            <thead>
              <tr>
                <th>Ad</th>
                <th>Kategori</th>
                <th>Barkod</th>
                <th>Stok</th>
                <th>Birimi</th>
                <th>Maliyet</th>
                <th>Satış</th>
                <th>SKT</th>
                <th>İşlem</th>
              </tr>
            </thead>

            <tbody>
              {products.map(p => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.category}</td>
                  <td>{p.barcode}</td>
                  <td>{p.stock}</td>
                  <td>{p.unit}</td>
                  <td>₺{parseFloat(p.costPrice).toFixed(2)}</td>
                  <td>₺{parseFloat(p.salePrice).toFixed(2)}</td>
                  <td>{p.hasExpiration && p.expirationDate ? new Date(p.expirationDate).toLocaleDateString("tr-TR") : "-"}</td>

                  <td style={{ display: "flex", gap: 6 }}>
                    <button className="button secondary" onClick={() => handleEdit(p)}>Düzenle</button>
                    <button className="button secondary" onClick={() => handleDelete(p.id)}>Sil</button>
                  </td>
                </tr>
              ))}

              {products.length === 0 && (
                <tr>
                  <td colSpan="9" style={{ color: "#6b7280", fontSize: 13 }}>
                    Henüz ürün eklenmedi.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </>
      )}
    </MainLayout>
  );
}
