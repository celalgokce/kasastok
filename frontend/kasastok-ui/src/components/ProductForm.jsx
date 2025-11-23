import { useState } from "react";

export default function ProductForm({ onSubmit, onCancel }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [barcode, setBarcode] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [unit, setUnit] = useState("adet");
  const [hasExpiration, setHasExpiration] = useState(false);
  const [expirationDate, setExpirationDate] = useState("");

  return (
    <div className="card" style={{ maxWidth: 450 }}>
      <h3>Yeni Ürün</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>

        <input
          className="input"
          placeholder="Ürün adı"
          value={name}
          onChange={e => setName(e.target.value)}
        />

        <input
          className="input"
          placeholder="Kategori"
          value={category}
          onChange={e => setCategory(e.target.value)}
        />

        <input
          className="input"
          placeholder="Barkod"
          value={barcode}
          onChange={e => setBarcode(e.target.value)}
        />

        <select className="select" value={unit} onChange={e => setUnit(e.target.value)}>
          <option value="adet">Adet</option>
          <option value="kg">Kg</option>
          <option value="litre">Litre</option>
        </select>

        <input
          className="input"
          placeholder="Birim fiyat"
          value={price}
          onChange={e => setPrice(e.target.value)}
        />

        <input
          className="input"
          placeholder="Başlangıç stok"
          value={stock}
          onChange={e => setStock(e.target.value)}
        />

        <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={hasExpiration}
            onChange={e => setHasExpiration(e.target.checked)}
          />
          Son kullanma tarihi var
        </label>

        {hasExpiration && (
          <input
            type="date"
            className="input"
            value={expirationDate}
            onChange={e => setExpirationDate(e.target.value)}
          />
        )}

        <button
          className="button"
          onClick={() =>
            onSubmit({
              name,
              category,
              barcode,
              price,
              stock,
              unit,
              hasExpiration,
              expirationDate: hasExpiration ? expirationDate : null
            })
          }
        >
          Kaydet
        </button>

        <button className="button secondary" onClick={onCancel}>
          İptal
        </button>

      </div>
    </div>
  );
}
