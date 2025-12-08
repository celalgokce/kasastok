import { useState, useEffect } from "react";
import MainLayout from "../layout/MainLayout";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from "chart.js";
import { Line, Bar, Pie } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const API_BASE = "http://localhost:5256/api";

export default function Reports() {
  const [salesTrend, setSalesTrend] = useState([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState([]);
  const [cashTrend, setCashTrend] = useState([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    fetchReportData();
  }, [days]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const [salesRes, categoryRes, cashRes] = await Promise.all([
        fetch(`${API_BASE}/analytics/sales-trend?days=${days}`),
        fetch(`${API_BASE}/analytics/category-breakdown?days=${days}`),
        fetch(`${API_BASE}/analytics/cash-trend?days=${days}`)
      ]);

      const salesData = await salesRes.json();
      const categoryData = await categoryRes.json();
      const cashData = await cashRes.json();

      setSalesTrend(salesData);
      setCategoryBreakdown(categoryData);
      setCashTrend(cashData);
    } catch (error) {
      console.error("Rapor verisi yüklenirken hata:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <MainLayout title="Raporlar">
        <div style={{ padding: 20, textAlign: "center" }}>Yükleniyor...</div>
      </MainLayout>
    );
  }

  // Satış Trendi Grafiği
  const salesTrendData = {
    labels: salesTrend.map(s => new Date(s.date).toLocaleDateString("tr-TR")),
    datasets: [
      {
        label: "Ciro (₺)",
        data: salesTrend.map(s => s.revenue),
        borderColor: "rgb(59, 130, 246)",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        tension: 0.4
      },
      {
        label: "Kar (₺)",
        data: salesTrend.map(s => s.profit),
        borderColor: "rgb(16, 185, 129)",
        backgroundColor: "rgba(16, 185, 129, 0.1)",
        tension: 0.4
      }
    ]
  };

  // Kategori Dağılımı Grafiği (Pie)
  const categoryData = {
    labels: categoryBreakdown.map(c => c.category || "Kategorisiz"),
    datasets: [
      {
        label: "Ciro (₺)",
        data: categoryBreakdown.map(c => c.totalRevenue),
        backgroundColor: [
          "rgba(59, 130, 246, 0.8)",
          "rgba(16, 185, 129, 0.8)",
          "rgba(245, 158, 11, 0.8)",
          "rgba(239, 68, 68, 0.8)",
          "rgba(139, 92, 246, 0.8)",
          "rgba(236, 72, 153, 0.8)"
        ]
      }
    ]
  };

  // Kategori Kar Grafiği (Bar)
  const categoryProfitData = {
    labels: categoryBreakdown.map(c => c.category || "Kategorisiz"),
    datasets: [
      {
        label: "Kar (₺)",
        data: categoryBreakdown.map(c => c.totalProfit),
        backgroundColor: "rgba(16, 185, 129, 0.7)",
        borderColor: "rgb(16, 185, 129)",
        borderWidth: 1
      }
    ]
  };

  // Gelir-Gider Trendi
  const cashTrendData = {
    labels: cashTrend.map(c => new Date(c.date).toLocaleDateString("tr-TR")),
    datasets: [
      {
        label: "Gelir (₺)",
        data: cashTrend.map(c => c.income),
        borderColor: "rgb(16, 185, 129)",
        backgroundColor: "rgba(16, 185, 129, 0.1)",
        tension: 0.4
      },
      {
        label: "Gider (₺)",
        data: cashTrend.map(c => c.expense),
        borderColor: "rgb(239, 68, 68)",
        backgroundColor: "rgba(239, 68, 68, 0.1)",
        tension: 0.4
      }
    ]
  };

  return (
    <MainLayout title="Raporlar">
      <div style={{ marginBottom: 20 }}>
        <label style={{ marginRight: 10 }}>Zaman Aralığı:</label>
        <select value={days} onChange={(e) => setDays(parseInt(e.target.value))}>
          <option value={7}>Son 7 Gün</option>
          <option value={30}>Son 30 Gün</option>
          <option value={90}>Son 90 Gün</option>
        </select>
      </div>

      {/* Satış Trendi */}
      <div className="card" style={{ marginBottom: 30 }}>
        <div className="card-title">Satış Trendi (Son {days} Gün)</div>
        {salesTrend.length === 0 ? (
          <div style={{ padding: 20, textAlign: "center", color: "#9ca3af" }}>
            Bu dönem için veri bulunmuyor
          </div>
        ) : (
          <div style={{ padding: 20 }}>
            <Line data={salesTrendData} options={{ responsive: true, maintainAspectRatio: true }} />
          </div>
        )}
      </div>

      {/* Kategori Dağılımı */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 30 }}>
        <div className="card">
          <div className="card-title">Kategori Bazlı Ciro Dağılımı</div>
          {categoryBreakdown.length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", color: "#9ca3af" }}>
              Veri bulunmuyor
            </div>
          ) : (
            <div style={{ padding: 20, maxHeight: 400 }}>
              <Pie data={categoryData} options={{ responsive: true, maintainAspectRatio: true }} />
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-title">Kategori Bazlı Kar</div>
          {categoryBreakdown.length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", color: "#9ca3af" }}>
              Veri bulunmuyor
            </div>
          ) : (
            <div style={{ padding: 20 }}>
              <Bar data={categoryProfitData} options={{ responsive: true, maintainAspectRatio: true }} />
            </div>
          )}
        </div>
      </div>

      {/* Gelir-Gider Trendi */}
      <div className="card">
        <div className="card-title">Gelir-Gider Trendi</div>
        {cashTrend.length === 0 ? (
          <div style={{ padding: 20, textAlign: "center", color: "#9ca3af" }}>
            Bu dönem için veri bulunmuyor
          </div>
        ) : (
          <div style={{ padding: 20 }}>
            <Line data={cashTrendData} options={{ responsive: true, maintainAspectRatio: true }} />
          </div>
        )}
      </div>

      {/* Kategori Detay Tablosu */}
      {categoryBreakdown.length > 0 && (
        <div className="card" style={{ marginTop: 30 }}>
          <div className="card-title">Kategori Detayları</div>
          <table className="table" style={{ marginTop: 14 }}>
            <thead>
              <tr>
                <th>Kategori</th>
                <th>Satış Adedi</th>
                <th>Toplam Ciro</th>
                <th>Toplam Kar</th>
                <th>Satılan Ürün</th>
              </tr>
            </thead>
            <tbody>
              {categoryBreakdown.map((cat, idx) => (
                <tr key={idx}>
                  <td>{cat.category || "Kategorisiz"}</td>
                  <td>{cat.salesCount}</td>
                  <td>₺{cat.totalRevenue.toFixed(2)}</td>
                  <td>₺{cat.totalProfit.toFixed(2)}</td>
                  <td>{cat.itemsSold}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </MainLayout>
  );
}
