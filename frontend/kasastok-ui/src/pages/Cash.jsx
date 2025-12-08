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
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? "Formu Kapat" : "+ Yeni İşlem Ekle"}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3>Yeni İşlem</h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
              <div>
                <label>Tutar (₺)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                />
              </div>

              <div>
                <label>İşlem Türü</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: parseInt(e.target.value) })}
                >
                  <option value={1}>Gelir</option>
                  <option value={2}>Gider</option>
                </select>
              </div>

              <div>
                <label>Kategori</label>
                <input
                  type="text"
                  required
                  placeholder="Satış, Kira, Maaş, vb."
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                />
              </div>

              <div>
                <label>Ödeme Tipi</label>
                <select
                  value={formData.paymentType}
                  onChange={(e) => setFormData({ ...formData, paymentType: parseInt(e.target.value) })}
                >
                  <option value={1}>Nakit</option>
                  <option value={2}>Kredi Kartı</option>
                  <option value={3}>Banka Transferi</option>
                </select>
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <label>Açıklama</label>
                <input
                  type="text"
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <label>Referans (Opsiyonel)</label>
                <input
                  type="text"
                  placeholder="Satış ID, Fatura No, vb."
                  value={formData.reference}
                  onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                />
              </div>
            </div>

            <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
              <button type="submit" className="btn-primary">Kaydet</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
                İptal
              </button>
            </div>
          </form>
        </div>
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
