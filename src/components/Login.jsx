import { useState } from "react";
import { allowedEmail, loginWithEmail } from "../firebase/firebaseClient";

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
      setError(err.message || "No se pudo iniciar sesión.");
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
