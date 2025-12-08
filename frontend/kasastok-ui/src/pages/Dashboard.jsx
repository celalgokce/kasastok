import { useState, useEffect } from "react";
import MainLayout from "../layout/MainLayout";

const API_BASE = "http://localhost:5256/api";

export default function Dashboard() {
  const [metrics, setMetrics] = useState(null);
  const [bestSellers, setBestSellers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();

    // Sayfa focus aldığında otomatik yenile
    const handleFocus = () => {
      fetchDashboardData();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [metricsRes, bestSellersRes] = await Promise.all([
        fetch(`${API_BASE}/analytics/dashboard`),
        fetch(`${API_BASE}/analytics/best-sellers?days=30`)
      ]);

      const metricsData = await metricsRes.json();
      const bestSellersData = await bestSellersRes.json();

      setMetrics(metricsData);
      setBestSellers(bestSellersData);
    } catch (error) {
      console.error("Dashboard verisi yüklenirken hata:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <MainLayout title="Genel Bakış">
        <div style={{ padding: 20, textAlign: "center" }}>Yükleniyor...</div>
      </MainLayout>
    );
  }

  const avgBasket = metrics?.today?.salesCount > 0
    ? (metrics.today.revenue / metrics.today.salesCount).toFixed(2)
    : 0;

  return (
    <MainLayout title="Genel Bakış">

      {/* METRİK SATIRI 1: Satış ve Kasa */}
      <div className="card-grid">
        <div className="card">
          <div className="card-title">Bugünkü Satış Adedi</div>
          <div className="card-value">{metrics?.today?.salesCount || 0}</div>
        </div>

        <div className="card">
          <div className="card-title">Bugünkü Gelir</div>
          <div className="card-value">₺{metrics?.today?.revenue?.toFixed(2) || 0}</div>
        </div>

        <div className="card">
          <div className="card-title">Bugünkü Gider</div>
          <div className="card-value">₺{metrics?.today?.expenses?.toFixed(2) || 0}</div>
        </div>

        <div className="card">
          <div className="card-title">Net Kasa Bakiyesi</div>
          <div className="card-value">₺{metrics?.cash?.balance?.toFixed(2) || 0}</div>
        </div>
      </div>


      {/* METRİK SATIRI 2: Stok Sağlığı */}
      <div className="card-grid" style={{ marginTop: 20 }}>
        <div className="card">
          <div className="card-title">Minimum Stok Altında Ürün</div>
          <div className="card-value">{metrics?.stock?.lowStockCount || 0}</div>
        </div>

        <div className="card">
          <div className="card-title">SKT Yaklaşan Ürün</div>
          <div className="card-value">{metrics?.stock?.expiringCount || 0}</div>
        </div>

        <div className="card">
          <div className="card-title">Toplam Stok Değeri</div>
          <div className="card-value">₺{metrics?.stock?.totalValue?.toFixed(2) || 0}</div>
        </div>

        <div className="card">
          <div className="card-title">Ortalama Sepet Tutarı</div>
          <div className="card-value">₺{avgBasket}</div>
        </div>
      </div>


      {/* EN ÇOK SATANLAR TABLOSU */}
      <div className="card" style={{ marginTop: 30 }}>
        <div className="card-title">En Çok Satılan Ürünler (Son 30 Gün)</div>

        <table className="table" style={{ marginTop: 14 }}>
          <thead>
            <tr>
              <th>Ürün</th>
              <th>Satış Adedi</th>
              <th>Toplam Ciro</th>
              <th>Kar</th>
            </tr>
          </thead>

          <tbody>
            {bestSellers.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ textAlign: "center", color: "#9ca3af" }}>
                  Henüz satış verisi bulunmuyor
                </td>
              </tr>
            ) : (
              bestSellers.map((item) => (
                <tr key={item.productId}>
                  <td>{item.productName}</td>
                  <td>{item.totalQuantity}</td>
                  <td>₺{item.totalRevenue.toFixed(2)}</td>
                  <td>₺{item.totalProfit.toFixed(2)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>


      {/* AYLIK ÖZET */}
      <div className="card" style={{ marginTop: 30 }}>
        <div className="card-title">Aylık Özet</div>

        <table className="table" style={{ marginTop: 14 }}>
          <thead>
            <tr>
              <th>Metrik</th>
              <th>Değer</th>
            </tr>
          </thead>

          <tbody>
            <tr>
              <td>Toplam Satış Adedi</td>
              <td>{metrics?.month?.salesCount || 0}</td>
            </tr>
            <tr>
              <td>Toplam Ciro</td>
              <td>₺{metrics?.month?.revenue?.toFixed(2) || 0}</td>
            </tr>
            <tr>
              <td>Toplam Gider</td>
              <td>₺{metrics?.month?.expenses?.toFixed(2) || 0}</td>
            </tr>
            <tr>
              <td>Net Kar</td>
              <td>₺{metrics?.month?.profit?.toFixed(2) || 0}</td>
            </tr>
          </tbody>
        </table>
      </div>

    </MainLayout>
  );
}
