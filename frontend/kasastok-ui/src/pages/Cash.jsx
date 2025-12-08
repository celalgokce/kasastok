import { useState, useEffect } from "react";
import MainLayout from "../layout/MainLayout";

const API_BASE = "http://localhost:5256/api";

export default function Cash() {
  const [ledgers, setLedgers] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    amount: "",
    type: 1, // 1 = Income, 2 = Expense
    category: "",
    paymentType: 1, // 1 = Cash, 2 = CreditCard, 3 = BankTransfer
    description: "",
    reference: ""
  });

  useEffect(() => {
    fetchData();

    // Sayfa focus aldığında otomatik yenile
    const handleFocus = () => {
      fetchData();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const fetchData = async () => {
    try {
      const [ledgersRes, metricsRes] = await Promise.all([
        fetch(`${API_BASE}/cash-ledgers`),
        fetch(`${API_BASE}/analytics/dashboard`)
      ]);

      const ledgersData = await ledgersRes.json();
      const metricsData = await metricsRes.json();

      setLedgers(ledgersData);
      setMetrics(metricsData);
    } catch (error) {
      console.error("Veri yüklenirken hata:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(`${API_BASE}/cash-ledgers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount)
        })
      });

      if (response.ok) {
        setShowForm(false);
        setFormData({
          amount: "",
          type: 1,
          category: "",
          paymentType: 1,
          description: "",
          reference: ""
        });
        fetchData();
      }
    } catch (error) {
      console.error("İşlem eklenirken hata:", error);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bu kaydı silmek istediğinize emin misiniz?")) return;

    try {
      const response = await fetch(`${API_BASE}/cash-ledgers/${id}`, {
        method: "DELETE"
      });

      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error("Silme hatası:", error);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString("tr-TR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getTypeName = (type) => type === 1 ? "Gelir" : "Gider";
  const getPaymentTypeName = (type) => {
    const types = { 1: "Nakit", 2: "Kredi Kartı", 3: "Banka Transferi" };
    return types[type] || "Bilinmiyor";
  };

  if (loading) {
    return (
      <MainLayout title="Kasa">
        <div style={{ padding: 20, textAlign: "center" }}>Yükleniyor...</div>
      </MainLayout>
    );
  }

  const today = new Date().toISOString().split('T')[0];
  const todayIncome = ledgers
    .filter(l => l.type === 1 && l.createdAt.startsWith(today))
    .reduce((sum, l) => sum + l.amount, 0);
  const todayExpense = ledgers
    .filter(l => l.type === 2 && l.createdAt.startsWith(today))
    .reduce((sum, l) => sum + l.amount, 0);

  return (
    <MainLayout title="Kasa">
      <div className="card-grid" style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="card-title">Güncel Kasa Bakiyesi</div>
          <div className="card-value">₺{metrics?.cash?.balance?.toFixed(2) || 0}</div>
        </div>
        <div className="card">
          <div className="card-title">Bugünkü Gelir</div>
          <div className="card-value">₺{todayIncome.toFixed(2)}</div>
        </div>
        <div className="card">
          <div className="card-title">Bugünkü Gider</div>
          <div className="card-value">₺{todayExpense.toFixed(2)}</div>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <button
          onClick={() => setShowForm(true)}
          style={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
            border: "none",
            padding: "12px 24px",
            borderRadius: "8px",
            fontSize: "14px",
            fontWeight: 600,
            cursor: "pointer",
            boxShadow: "0 4px 6px rgba(102, 126, 234, 0.3)",
            transition: "transform 0.2s"
          }}
          onMouseOver={(e) => e.target.style.transform = "translateY(-2px)"}
          onMouseOut={(e) => e.target.style.transform = "translateY(0)"}
        >
          + Yeni İşlem Ekle
        </button>
      </div>

      {/* Modern Modal */}
      {showForm && (
        <>
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0, 0, 0, 0.5)",
              zIndex: 999,
              backdropFilter: "blur(4px)"
            }}
            onClick={() => setShowForm(false)}
          />
          <div style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "white",
            borderRadius: "16px",
            padding: "32px",
            maxWidth: "500px",
            width: "90%",
            maxHeight: "90vh",
            overflow: "auto",
            zIndex: 1000,
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)"
          }}>
            <h2 style={{ margin: "0 0 24px 0", fontSize: "24px", fontWeight: 700 }}>Yeni İşlem</h2>
            <form onSubmit={handleSubmit}>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={{ display: "block", marginBottom: 8, fontWeight: 600, fontSize: 14 }}>Tutar (₺)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "12px",
                      border: "2px solid #e5e7eb",
                      borderRadius: "8px",
                      fontSize: "14px",
                      transition: "border-color 0.2s"
                    }}
                    onFocus={(e) => e.target.style.borderColor = "#667eea"}
                    onBlur={(e) => e.target.style.borderColor = "#e5e7eb"}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <label style={{ display: "block", marginBottom: 8, fontWeight: 600, fontSize: 14 }}>İşlem Türü</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: parseInt(e.target.value) })}
                      style={{
                        width: "100%",
                        padding: "12px",
                        border: "2px solid #e5e7eb",
                        borderRadius: "8px",
                        fontSize: "14px"
                      }}
                    >
                      <option value={1}>💰 Gelir</option>
                      <option value={2}>💸 Gider</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", marginBottom: 8, fontWeight: 600, fontSize: 14 }}>Ödeme Tipi</label>
                    <select
                      value={formData.paymentType}
                      onChange={(e) => setFormData({ ...formData, paymentType: parseInt(e.target.value) })}
                      style={{
                        width: "100%",
                        padding: "12px",
                        border: "2px solid #e5e7eb",
                        borderRadius: "8px",
                        fontSize: "14px"
                      }}
                    >
                      <option value={1}>💵 Nakit</option>
                      <option value={2}>💳 Kredi Kartı</option>
                      <option value={3}>🏦 Banka Transferi</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: 8, fontWeight: 600, fontSize: 14 }}>Kategori</label>
                  <input
                    type="text"
                    required
                    placeholder="Kira, Maaş, Elektrik, vb."
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "12px",
                      border: "2px solid #e5e7eb",
                      borderRadius: "8px",
                      fontSize: "14px"
                    }}
                    onFocus={(e) => e.target.style.borderColor = "#667eea"}
                    onBlur={(e) => e.target.style.borderColor = "#e5e7eb"}
                  />
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: 8, fontWeight: 600, fontSize: 14 }}>Açıklama</label>
                  <textarea
                    required
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    style={{
                      width: "100%",
                      padding: "12px",
                      border: "2px solid #e5e7eb",
                      borderRadius: "8px",
                      fontSize: "14px",
                      resize: "vertical"
                    }}
                    onFocus={(e) => e.target.style.borderColor = "#667eea"}
                    onBlur={(e) => e.target.style.borderColor = "#e5e7eb"}
                  />
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: 8, fontWeight: 600, fontSize: 14 }}>Referans (Opsiyonel)</label>
                  <input
                    type="text"
                    placeholder="Fatura No, Dekont No, vb."
                    value={formData.reference}
                    onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "12px",
                      border: "2px solid #e5e7eb",
                      borderRadius: "8px",
                      fontSize: "14px"
                    }}
                  />
                </div>
              </div>

              <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    color: "white",
                    border: "none",
                    padding: "14px",
                    borderRadius: "8px",
                    fontSize: "15px",
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  Kaydet
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  style={{
                    flex: 1,
                    background: "#f3f4f6",
                    color: "#374151",
                    border: "none",
                    padding: "14px",
                    borderRadius: "8px",
                    fontSize: "15px",
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  İptal
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      <table className="table">
        <thead>
          <tr>
            <th>Tarih</th>
            <th>Tür</th>
            <th>Kategori</th>
            <th>Açıklama</th>
            <th>Tutar</th>
            <th>Ödeme Tipi</th>
            <th>İşlem</th>
          </tr>
        </thead>
        <tbody>
          {ledgers.length === 0 ? (
            <tr>
              <td colSpan="7" style={{ textAlign: "center", color: "#9ca3af" }}>
                Henüz kayıt bulunmuyor
              </td>
            </tr>
          ) : (
            ledgers.map((ledger) => (
              <tr key={ledger.id}>
                <td>{formatDate(ledger.createdAt)}</td>
                <td>
                  <span style={{
                    color: ledger.type === 1 ? "#10b981" : "#ef4444",
                    fontWeight: 500
                  }}>
                    {getTypeName(ledger.type)}
                  </span>
                </td>
                <td>{ledger.category}</td>
                <td>{ledger.description}</td>
                <td style={{
                  color: ledger.type === 1 ? "#10b981" : "#ef4444",
                  fontWeight: 500
                }}>
                  {ledger.type === 1 ? "+" : "-"}₺{ledger.amount.toFixed(2)}
                </td>
                <td>{getPaymentTypeName(ledger.paymentType)}</td>
                <td>
                  <button
                    onClick={() => handleDelete(ledger.id)}
                    style={{
                      background: "#ef4444",
                      color: "white",
                      border: "none",
                      padding: "6px 12px",
                      borderRadius: "4px",
                      cursor: "pointer"
                    }}
                  >
                    Sil
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </MainLayout>
  );
}
