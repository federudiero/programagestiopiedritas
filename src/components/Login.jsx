import { useState } from "react";
import { allowedEmail, firebaseDiagnostics, loginWithEmail } from "../firebase/firebaseClient";

export default function Login() {
  const [email, setEmail] = useState(allowedEmail || "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      await loginWithEmail(email, password);
    } catch (err) {
      const message = err?.code === "auth/unauthorized-domain"
        ? "Dominio no autorizado en Firebase Authentication. Agregá el dominio de Vercel en Firebase > Authentication > Settings > Authorized domains."
        : err.message || "No se pudo iniciar sesión.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <p className="eyebrow">Acceso privado</p>
        <h1>Gestión de costos y pedidos</h1>
        <p>Ingresá con la cuenta autorizada para administrar productos, pedidos, clientes y estadísticas.</p>

        {firebaseDiagnostics.source === "fallback" && (
          <div className="alert alert-warning">
            La app está usando la configuración Firebase interna porque Vercel no entregó todas las variables VITE_. Revisá que en Vercel la primera variable sea <strong>VITE_FIREBASE_API_KEY</strong>, no <strong>ITE_FIREBASE_API_KEY</strong>.
          </div>
        )}

        <div className="login-diagnostics">
          <span>Proyecto Firebase</span>
          <strong>{firebaseDiagnostics.projectId || "No configurado"}</strong>
          <small>Origen: {firebaseDiagnostics.source === "env" ? "variables de Vercel/.env" : "configuración interna de respaldo"}</small>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <label>
          Email
          <input value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" />
        </label>

        <label>
          Contraseña
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" />
        </label>

        <button className="btn btn-primary full" disabled={loading} type="submit">
          {loading ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
    </main>
  );
}
