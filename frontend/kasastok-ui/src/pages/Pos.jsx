import { useState } from "react";
import MainLayout from "../layout/MainLayout";

const API_BASE = "http://localhost:5256/api";

export default function Pos() {
  const [barcode, setBarcode] = useState("");
  const [cart, setCart] = useState([]);
  const [paymentType, setPaymentType] = useState(1); // 1=Nakit
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Barkod ile ürün ara ve sepete ekle
  const handleAddItem = async () => {
    if (!barcode.trim()) return;

    setLoading(true);
    setMessage("");

    try {
      const res = await fetch(`${API_BASE}/products/search?barcode=${encodeURIComponent(barcode.trim())}`);
      
      if (!res.ok) {
        const error = await res.json();
        setMessage(error.message || "Ürün bulunamadı");
        setBarcode("");
        setLoading(false);
        return;
      }

      const product = await res.json();

      // Sepette var mı kontrol et
      const existing = cart.find((x) => x.id === product.id);

      if (existing) {
        // Miktarı artır
        setCart(
          cart.map((x) =>
            x.id === product.id ? { ...x, qty: x.qty + 1 } : x
          )
        );
      } else {
        // Sepete ekle
        setCart([
          ...cart,
          {
            id: product.id,
            barcode: product.barcode,
            name: product.name,
            qty: 1,
            price: product.salePrice,
            stock: product.stock
          }
        ]);
      }

      setBarcode("");
      setMessage(`✓ ${product.name} sepete eklendi`);
    } catch (error) {
      setMessage("Ağ hatası: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Miktar değiştir
  const handleQtyChange = (id, delta) => {
    setCart(
      cart
        .map((item) =>
          item.id === id
            ? { ...item, qty: Math.max(1, item.qty + delta) }
            : item
        )
        .filter((item) => item.qty > 0)
    );
  };

  // Ürünü sepetten sil
  const handleRemoveItem = (id) => {
    setCart(cart.filter((item) => item.id !== id));
  };

  // Toplam hesapla
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  // Satışı tamamla
  const handleCompleteSale = async () => {
    if (cart.length === 0) return;

    setLoading(true);
    setMessage("");

    try {
      const payload = {
        items: cart.map((item) => ({
          productId: item.id,
          quantity: item.qty
        })),
        paymentType: paymentType,
        notes: null
      };

      const res = await fetch(`${API_BASE}/sales/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const error = await res.json();
        setMessage("❌ " + (error.message || "Satış tamamlanamadı"));
        setLoading(false);
        return;
      }

      const result = await res.json();

      // Başarı mesajı
      setMessage(`✅ Satış tamamlandı! Toplam: ₺${result.subtotal.toFixed(2)}`);
      
      // Sepeti temizle
      setCart([]);
      setPaymentType(1);

      // 3 saniye sonra mesajı temizle
      setTimeout(() => setMessage(""), 3000);

    } catch (error) {
      setMessage("❌ Ağ hatası: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Enter tuşu ile barkod ekleme
  const handleBarcodeKeyPress = (e) => {
    if (e.key === "Enter") {
      handleAddItem();
    }
  };

  return (
    <MainLayout title="Satış (POS)">
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20 }}>
        
        {/* SOL PANEL - SEPET */}
        <div className="card">
          <div className="card-title">Sepet</div>

          {/* Barkod girişi */}
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <input
              className="input"
              placeholder="Barkod okutun veya yazın"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              onKeyPress={handleBarcodeKeyPress}
              disabled={loading}
              autoFocus
            />
            <button 
              className="button" 
              onClick={handleAddItem}
              disabled={loading || !barcode.trim()}
            >
              {loading ? "..." : "Ekle"}
            </button>
          </div>

          {/* Mesaj alanı */}
          {message && (
            <div style={{
              marginTop: 12,
              padding: 10,
              borderRadius: 6,
              backgroundColor: message.includes("✅") ? "#dcfce7" : message.includes("❌") ? "#fee2e2" : "#dbeafe",
              color: message.includes("✅") ? "#166534" : message.includes("❌") ? "#991b1b" : "#1e40af",
              fontSize: 14
            }}>
              {message}
            </div>
          )}

          {/* Sepet tablosu */}
          <table className="table" style={{ marginTop: 16 }}>
            <thead>
              <tr>
                <th>Ürün</th>
                <th>Birim Fiyat</th>
                <th>Miktar</th>
                <th>Ara Toplam</th>
                <th>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {cart.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center", color: "#9ca3af", padding: 40 }}>
                    Barkod okuyarak satışa başlayın
                  </td>
                </tr>
              ) : (
                cart.map((item) => (
                  <tr key={item.id}>
                    <td>
                      {item.name}
                      <div style={{ fontSize: 12, color: "#9ca3af" }}>
                        Stok: {item.stock}
                      </div>
                    </td>
                    <td>₺{item.price.toFixed(2)}</td>
                    <td>
                      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                        <button
                          className="button secondary"
                          style={{ padding: "4px 8px", fontSize: 12 }}
                          onClick={() => handleQtyChange(item.id, -1)}
                        >
                          −
                        </button>
                        <span style={{ minWidth: 30, textAlign: "center" }}>
                          {item.qty}
                        </span>
                        <button
                          className="button secondary"
                          style={{ padding: "4px 8px", fontSize: 12 }}
                          onClick={() => handleQtyChange(item.id, 1)}
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td style={{ fontWeight: 500 }}>
                      ₺{(item.price * item.qty).toFixed(2)}
                    </td>
                    <td>
                      <button
                        className="button secondary"
                        style={{ padding: "4px 8px", fontSize: 12 }}
                        onClick={() => handleRemoveItem(item.id)}
                      >
                        Sil
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* SAĞ PANEL - ÖDEME */}
        <div className="card">
          <div className="card-title">Özet</div>
          
          <div style={{ 
            fontSize: 32, 
            fontWeight: 600, 
            color: "#1f2937",
            marginTop: 12,
            marginBottom: 24
          }}>
            ₺{subtotal.toFixed(2)}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <label style={{ fontSize: 14, fontWeight: 500, color: "#4b5563" }}>
              Ödeme Türü
            </label>
            <select 
              className="select" 
              value={paymentType}
              onChange={(e) => setPaymentType(parseInt(e.target.value))}
            >
              <option value={1}>Nakit</option>
              <option value={2}>Kredi Kartı (POS)</option>
              <option value={3}>Havale/EFT</option>
            </select>

            <button
              className="button"
              disabled={cart.length === 0 || loading}
              onClick={handleCompleteSale}
              style={{ marginTop: 8, padding: "12px 16px", fontSize: 16 }}
            >
              {loading ? "İşleniyor..." : "Satışı Tamamla"}
            </button>

            {cart.length > 0 && (
              <button
                className="button secondary"
                onClick={() => {
                  setCart([]);
                  setMessage("");
                }}
              >
                Sepeti Temizle
              </button>
            )}
          </div>

          {/* Ürün sayısı */}
          {cart.length > 0 && (
            <div style={{ 
              marginTop: 16, 
              padding: 12, 
              backgroundColor: "#f3f4f6",
              borderRadius: 6,
              fontSize: 13,
              color: "#6b7280"
            }}>
              Toplam {cart.length} ürün, {cart.reduce((sum, item) => sum + item.qty, 0)} adet
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}