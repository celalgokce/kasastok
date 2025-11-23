import { useMemo, useState } from "react";
import MainLayout from "../layout/MainLayout";

export default function Pos() {
  const [barcode, setBarcode] = useState("");
  const [cart, setCart] = useState([]);

  const handleAddItem = () => {
    if (!barcode.trim()) return;

    // Şimdilik sahte ürün, backend hazır olduğunda /api/products?barcode= ile değişecek.
    const existing = cart.find((x) => x.barcode === barcode.trim());

    if (existing) {
      setCart(
        cart.map((x) =>
          x.barcode === barcode.trim() ? { ...x, qty: x.qty + 1 } : x
        )
      );
    } else {
      setCart([
        ...cart,
        {
          id: crypto.randomUUID(),
          barcode: barcode.trim(),
          name: `Ürün ${barcode.trim()}`,
          qty: 1,
          price: 10 // placeholder
        }
      ]);
    }

    setBarcode("");
  };

  const handleQtyChange = (id, delta) => {
    setCart(
      cart
        .map((item) =>
          item.id === id ? { ...item, qty: Math.max(1, item.qty + delta) } : item
        )
        .filter((item) => item.qty > 0)
    );
  };

  const subtotal = useMemo(
    () => cart.reduce((acc, x) => acc + x.qty * x.price, 0),
    [cart]
  );

  const handleCompleteSale = () => {
    // Backend entegrasyonu: POST /api/sales
    // Şimdilik sadece console.log
    console.log("Satış tamamlandı", cart, subtotal);
    setCart([]);
  };

  return (
    <MainLayout title="Satış Terminali (POS)">
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input
              className="input"
              autoFocus
              placeholder="Barkod okut veya gir"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddItem();
              }}
            />
            <button className="button" onClick={handleAddItem}>
              Sepete Ekle
            </button>
          </div>

          <table className="table">
            <thead>
              <tr>
                <th>Barkod</th>
                <th>Ürün</th>
                <th>Adet</th>
                <th>Birim Fiyat</th>
                <th>Toplam</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {cart.map((item) => (
                <tr key={item.id}>
                  <td>{item.barcode}</td>
                  <td>{item.name}</td>
                  <td>
                    <button
                      className="button secondary"
                      style={{ padding: "2px 8px", marginRight: 4 }}
                      onClick={() => handleQtyChange(item.id, -1)}
                    >
                      -
                    </button>
                    {item.qty}
                    <button
                      className="button secondary"
                      style={{ padding: "2px 8px", marginLeft: 4 }}
                      onClick={() => handleQtyChange(item.id, +1)}
                    >
                      +
                    </button>
                  </td>
                  <td>₺{item.price.toFixed(2)}</td>
                  <td>₺{(item.qty * item.price).toFixed(2)}</td>
                  <td>
                    <button
                      className="button secondary"
                      style={{ padding: "2px 8px" }}
                      onClick={() =>
                        setCart(cart.filter((x) => x.id !== item.id))
                      }
                    >
                      Sil
                    </button>
                  </td>
                </tr>
              ))}
              {cart.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ color: "#6b7280", fontSize: 13 }}>
                    Sepet boş. Barkod okuyarak satışa başlayın.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="card">
          <div className="card-title">Özet</div>
          <div className="card-value">₺{subtotal.toFixed(2)}</div>

          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            <select className="select">
              <option>Ödeme Türü Seçin</option>
              <option>Nakit</option>
              <option>POS</option>
              <option>Havale/EFT</option>
            </select>
            <button
              className="button"
              disabled={cart.length === 0}
              onClick={handleCompleteSale}
            >
              Satışı Tamamla ve Fiş Kes
            </button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
