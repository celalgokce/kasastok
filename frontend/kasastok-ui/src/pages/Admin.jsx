import { useState, useEffect } from "react";
import MainLayout from "../layout/MainLayout";
import { useAuth, getAuthHeader } from "../context/AuthContext";

const API_BASE = "http://localhost:5256/api";

const ROLES = [
  { value: 1, label: "Yönetici (Admin)" },
  { value: 2, label: "Müdür (Manager)" },
  { value: 3, label: "Kasiyer (Cashier)" },
];

export default function Admin() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    fullName: "",
    role: 3,
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_BASE}/users`, {
        headers: getAuthHeader(),
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      } else if (response.status === 403) {
        setError("Bu sayfaya erişim yetkiniz yok");
      }
    } catch (err) {
      setError("Kullanıcılar yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      if (editingUser) {
        // Güncelleme
        const updateData = {
          fullName: formData.fullName,
          role: formData.role,
        };
        if (formData.password) {
          updateData.password = formData.password;
        }

        const response = await fetch(`${API_BASE}/users/${editingUser.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeader(),
          },
          body: JSON.stringify(updateData),
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.message || "Güncelleme başarısız");
        }

        setSuccess("Kullanıcı güncellendi");
      } else {
        // Yeni kullanıcı
        const response = await fetch(`${API_BASE}/users`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeader(),
          },
          body: JSON.stringify(formData),
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.message || "Kullanıcı oluşturulamadı");
        }

        setSuccess("Kullanıcı oluşturuldu");
      }

      fetchUsers();
      closeModal();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleToggleActive = async (user) => {
    try {
      const response = await fetch(`${API_BASE}/users/${user.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader(),
        },
        body: JSON.stringify({ isActive: !user.isActive }),
      });

      if (!response.ok) {
        throw new Error("Durum değiştirilemedi");
      }

      setSuccess(`Kullanıcı ${!user.isActive ? "aktif" : "pasif"} edildi`);
      fetchUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (user) => {
    if (!window.confirm(`"${user.fullName}" kullanıcısını silmek istediğinize emin misiniz?`)) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/users/${user.id}`, {
        method: "DELETE",
        headers: getAuthHeader(),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Silme başarısız");
      }

      setSuccess("Kullanıcı silindi");
      fetchUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const openModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        username: user.username,
        password: "",
        fullName: user.fullName,
        role: ROLES.find((r) => r.label.includes(user.role))?.value || 3,
      });
    } else {
      setEditingUser(null);
      setFormData({
        username: "",
        password: "",
        fullName: "",
        role: 3,
      });
    }
    setShowModal(true);
    setError("");
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setFormData({
      username: "",
      password: "",
      fullName: "",
      role: 3,
    });
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case "Admin":
        return { bg: "rgba(239, 68, 68, 0.2)", color: "#ef4444" };
      case "Manager":
        return { bg: "rgba(245, 158, 11, 0.2)", color: "#f59e0b" };
      default:
        return { bg: "rgba(59, 130, 246, 0.2)", color: "#3b82f6" };
    }
  };

  if (loading) {
    return (
      <MainLayout title="Kullanıcı Yönetimi">
        <div style={{ padding: 20, textAlign: "center" }}>Yükleniyor...</div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Kullanıcı Yönetimi">
      {/* Mesajlar */}
      {error && (
        <div style={styles.errorBox}>{error}</div>
      )}
      {success && (
        <div style={styles.successBox}>{success}</div>
      )}

      {/* Yeni Kullanıcı Butonu */}
      <button className="button" style={{ marginBottom: 20 }} onClick={() => openModal()}>
        + Yeni Kullanıcı
      </button>

      {/* Kullanıcı Tablosu */}
      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Kullanıcı Adı</th>
              <th>Ad Soyad</th>
              <th>Rol</th>
              <th>Durum</th>
              <th>Son Giriş</th>
              <th>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const roleBadge = getRoleBadgeColor(user.role);
              return (
                <tr key={user.id}>
                  <td>{user.username}</td>
                  <td>{user.fullName}</td>
                  <td>
                    <span
                      style={{
                        ...styles.badge,
                        background: roleBadge.bg,
                        color: roleBadge.color,
                      }}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td>
                    <span
                      style={{
                        ...styles.badge,
                        background: user.isActive
                          ? "rgba(16, 185, 129, 0.2)"
                          : "rgba(107, 114, 128, 0.2)",
                        color: user.isActive ? "#10b981" : "#6b7280",
                      }}
                    >
                      {user.isActive ? "Aktif" : "Pasif"}
                    </span>
                  </td>
                  <td>
                    {user.lastLoginAt
                      ? new Date(user.lastLoginAt).toLocaleString("tr-TR")
                      : "-"}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        style={styles.actionBtn}
                        onClick={() => openModal(user)}
                        title="Düzenle"
                      >
                        ✏️
                      </button>
                      {user.id !== currentUser?.id && (
                        <>
                          <button
                            style={styles.actionBtn}
                            onClick={() => handleToggleActive(user)}
                            title={user.isActive ? "Pasif Yap" : "Aktif Yap"}
                          >
                            {user.isActive ? "🔒" : "🔓"}
                          </button>
                          <button
                            style={{ ...styles.actionBtn, color: "#ef4444" }}
                            onClick={() => handleDelete(user)}
                            title="Sil"
                          >
                            🗑️
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0 }}>
                {editingUser ? "Kullanıcı Düzenle" : "Yeni Kullanıcı"}
              </h3>
              <button style={styles.closeBtn} onClick={closeModal}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {error && <div style={styles.errorBox}>{error}</div>}

              <div style={styles.formGroup}>
                <label style={styles.label}>Kullanıcı Adı</label>
                <input
                  type="text"
                  className="input"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  disabled={!!editingUser}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Şifre {editingUser && "(boş bırakılırsa değişmez)"}
                </label>
                <input
                  type="password"
                  className="input"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required={!editingUser}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Ad Soyad</label>
                <input
                  type="text"
                  className="input"
                  value={formData.fullName}
                  onChange={(e) =>
                    setFormData({ ...formData, fullName: e.target.value })
                  }
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Rol</label>
                <select
                  className="select"
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: parseInt(e.target.value) })
                  }
                >
                  {ROLES.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.modalFooter}>
                <button
                  type="button"
                  className="button secondary"
                  onClick={closeModal}
                >
                  İptal
                </button>
                <button type="submit" className="button">
                  {editingUser ? "Güncelle" : "Oluştur"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </MainLayout>
  );
}

const styles = {
  errorBox: {
    background: "rgba(239, 68, 68, 0.1)",
    border: "1px solid rgba(239, 68, 68, 0.3)",
    color: "#ef4444",
    padding: "12px 16px",
    borderRadius: 8,
    marginBottom: 16,
  },
  successBox: {
    background: "rgba(16, 185, 129, 0.1)",
    border: "1px solid rgba(16, 185, 129, 0.3)",
    color: "#10b981",
    padding: "12px 16px",
    borderRadius: 8,
    marginBottom: 16,
  },
  badge: {
    padding: "4px 10px",
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 600,
  },
  actionBtn: {
    background: "transparent",
    border: "none",
    cursor: "pointer",
    fontSize: 16,
    padding: 4,
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0, 0, 0, 0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modal: {
    background: "#2a2a3c",
    borderRadius: 12,
    padding: 24,
    width: "100%",
    maxWidth: 450,
    maxHeight: "90vh",
    overflow: "auto",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    color: "#fff",
  },
  closeBtn: {
    background: "transparent",
    border: "none",
    color: "#9ca3af",
    fontSize: 20,
    cursor: "pointer",
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    display: "block",
    color: "#9ca3af",
    fontSize: 14,
    marginBottom: 6,
  },
  modalFooter: {
    display: "flex",
    gap: 12,
    justifyContent: "flex-end",
    marginTop: 24,
  },
};
