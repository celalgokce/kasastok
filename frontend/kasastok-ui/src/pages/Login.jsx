import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Zaten giriş yapmışsa dashboard'a yönlendir
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await login(username, password);

    if (result.success) {
      navigate("/dashboard");
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <div style={styles.loginBox}>
        <div style={styles.logo}>
          <span style={styles.logoIcon}>📦</span>
          <h1 style={styles.logoText}>Kasastok</h1>
        </div>
        
        <p style={styles.subtitle}>Stok ve Kasa Yönetim Sistemi</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          {error && (
            <div style={styles.error}>
              {error}
            </div>
          )}

          <div style={styles.inputGroup}>
            <label style={styles.label}>Kullanıcı Adı</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={styles.input}
              placeholder="Kullanıcı adınızı girin"
              required
              autoFocus
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Şifre</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              placeholder="Şifrenizi girin"
              required
            />
          </div>

          <button
            type="submit"
            style={{
              ...styles.button,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? "not-allowed" : "pointer",
            }}
            disabled={loading}
          >
            {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
          </button>
        </form>

        <div style={styles.footer}>
          <p style={styles.footerText}>
            Varsayılan: <strong>admin</strong> / <strong>admin123</strong>
          </p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #1e1e2f 0%, #2d2d44 100%)",
    padding: 20,
  },
  loginBox: {
    background: "#2a2a3c",
    borderRadius: 16,
    padding: 40,
    width: "100%",
    maxWidth: 400,
    boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
  },
  logo: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginBottom: 8,
  },
  logoIcon: {
    fontSize: 40,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 700,
    color: "#fff",
    margin: 0,
  },
  subtitle: {
    textAlign: "center",
    color: "#9ca3af",
    marginBottom: 32,
    fontSize: 14,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  label: {
    color: "#9ca3af",
    fontSize: 14,
    fontWeight: 500,
  },
  input: {
    padding: "12px 16px",
    borderRadius: 8,
    border: "1px solid #3d3d5c",
    background: "#1e1e2f",
    color: "#fff",
    fontSize: 16,
    outline: "none",
    transition: "border-color 0.2s",
  },
  button: {
    padding: "14px 20px",
    borderRadius: 8,
    border: "none",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "#fff",
    fontSize: 16,
    fontWeight: 600,
    marginTop: 10,
    transition: "transform 0.2s, opacity 0.2s",
  },
  error: {
    background: "rgba(239, 68, 68, 0.1)",
    border: "1px solid rgba(239, 68, 68, 0.3)",
    color: "#ef4444",
    padding: "12px 16px",
    borderRadius: 8,
    fontSize: 14,
    textAlign: "center",
  },
  footer: {
    marginTop: 24,
    paddingTop: 24,
    borderTop: "1px solid #3d3d5c",
  },
  footerText: {
    color: "#6b7280",
    fontSize: 12,
    textAlign: "center",
    margin: 0,
  },
};
