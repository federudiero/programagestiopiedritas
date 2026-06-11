import { useEffect, useMemo, useState } from "react";
import BackupsPage from "./components/BackupsPage";
import AuditoriaPage from "./components/AuditoriaPage";
import CajaPage from "./components/CajaPage";
import ComisionesPage from "./components/ComisionesPage";
import CuentaCorrientePage from "./components/CuentaCorrientePage";
import HojaRutaPage from "./components/HojaRutaPage";
import StockPage from "./components/StockPage";
import ZonasPage from "./components/ZonasPage";
import Calculator from "./components/Calculator";
import ClientesPage from "./components/ClientesPage";
import DashboardPage from "./components/DashboardPage";
import EstadisticasPage from "./components/EstadisticasPage";
import Login from "./components/Login";
import PedidosPage from "./components/PedidosPage";
import ProductForm from "./components/ProductForm";
import ProductTable from "./components/ProductTable";
import VendedoresPage from "./components/VendedoresPage";
import {
  allowedEmail,
  getFirebaseRouteLabel,
  isFirebaseConfigured,
  logout,
  subscribeToAuth,
} from "./firebase/firebaseClient";
import { deleteProducto, listProductos, saveProducto } from "./services/productosService";
import { listPedidos } from "./services/pedidosService";
import { listClientes } from "./services/clientesService";
import { listVendedores } from "./services/vendedoresService";

const tabs = [
  { id: "inicio", label: "Inicio", icon: "⌂", group: "Operación" },
  { id: "pedidos", label: "Pedidos", icon: "✦", group: "Operación" },
  { id: "caja", label: "Caja", icon: "$", group: "Operación" },
  { id: "hojaRuta", label: "Hoja de ruta", icon: "⇢", group: "Operación" },
  { id: "productos", label: "Productos", icon: "▦", group: "Comercial" },
  { id: "calculadora", label: "Calculadora", icon: "∑", group: "Comercial" },
  { id: "stock", label: "Stock", icon: "▤", group: "Comercial" },
  { id: "clientes", label: "Clientes", icon: "◇", group: "Gestión" },
  { id: "vendedores", label: "Vendedores", icon: "◎", group: "Gestión" },
  { id: "comisiones", label: "Comisiones", icon: "%", group: "Gestión" },
  { id: "cuentaCorriente", label: "Cuenta corriente", icon: "≡", group: "Gestión" },
  { id: "zonas", label: "Zonas / mapa", icon: "⌖", group: "Reportes" },
  { id: "estadisticas", label: "Estadísticas", icon: "⌁", group: "Reportes" },
  { id: "auditoria", label: "Auditoría", icon: "◷", group: "Sistema" },
  { id: "backups", label: "Backups", icon: "↧", group: "Sistema" },
];

const groupedTabs = tabs.reduce((acc, tab) => {
  if (!acc[tab.group]) acc[tab.group] = [];
  acc[tab.group].push(tab);
  return acc;
}, {});

function AppNavigation({ activeTab, activeLabel, onSelectTab, onRefresh, loading, user }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  function selectTab(tabId) {
    onSelectTab(tabId);
    setMobileOpen(false);
  }

  return (
    <>
      <header className="topbar">
        <button
          type="button"
          className="nav-toggle"
          onClick={() => setMobileOpen((current) => !current)}
          aria-label="Abrir menú"
        >
          <span />
          <span />
          <span />
        </button>

        <div className="brand-block">
          <div className="brand-mark">GP</div>
          <div>
            <p className="eyebrow">Sistema privado</p>
            <h1>Gestión comercial</h1>
          </div>
        </div>

        <div className="topbar-center">
          <span className="section-pill">{activeLabel}</span>
          <small>{isFirebaseConfigured ? getFirebaseRouteLabel() : "Modo local"}</small>
        </div>

        <div className="topbar-actions">
          <button type="button" className="btn btn-secondary" onClick={onRefresh} disabled={loading}>
            Actualizar datos
          </button>
          {isFirebaseConfigured && (
            <button type="button" className="btn btn-dark" onClick={logout}>
              Salir
            </button>
          )}
        </div>
      </header>

      <aside className={`sidebar ${mobileOpen ? "open" : ""}`}>
        <div className="sidebar-head">
          <div className="brand-mark">GP</div>
          <div>
            <strong>Gestión</strong>
            <small>{user?.email || "Sesión local"}</small>
          </div>
        </div>

        <nav className="side-nav">
          {Object.entries(groupedTabs).map(([group, items]) => (
            <div className="nav-group" key={group}>
              <p>{group}</p>
              {items.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={activeTab === tab.id ? "active" : ""}
                  onClick={() => selectTab(tab.id)}
                >
                  <span className="nav-icon">{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      {mobileOpen && <button type="button" className="nav-backdrop" aria-label="Cerrar menú" onClick={() => setMobileOpen(false)} />}
    </>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState("inicio");
  const [productos, setProductos] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [vendedores, setVendedores] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const unsubscribe = subscribeToAuth((currentUser) => {
      const userEmail = String(currentUser?.email || "").toLowerCase();

      if (currentUser && allowedEmail && userEmail !== allowedEmail) {
        logout();
        setUser(null);
      } else {
        setUser(currentUser);
      }

      setAuthLoading(false);
    });

    return unsubscribe;
  }, []);

  async function loadAll() {
    setLoading(true);
    setError("");

    try {
      const [productosData, pedidosData, clientesData, vendedoresData] = await Promise.all([
        listProductos(),
        listPedidos(),
        listClientes(),
        listVendedores(),
      ]);

      setProductos(productosData);
      setPedidos(pedidosData);
      setClientes(clientesData);
      setVendedores(vendedoresData);
    } catch (err) {
      setError(err.message || "No se pudieron cargar los datos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isFirebaseConfigured || user) {
      loadAll();
    }
  }, [user]);

  function handleSelectTab(tabId) {
    setActiveTab(tabId);
    setError("");
    setSuccess("");
  }

  async function handleSaveProduct(producto) {
    setError("");
    setSuccess("");

    try {
      await saveProducto(producto);
      setSelectedProduct(null);
      await loadAll();
      setSuccess("Producto guardado correctamente.");
    } catch (err) {
      setError(err.message || "No se pudo guardar el producto.");
    }
  }

  async function handleDeleteProduct(productId) {
    const confirmed = window.confirm("¿Eliminar este producto?");
    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      await deleteProducto(productId);
      await loadAll();
      setSuccess("Producto eliminado.");
    } catch (err) {
      setError(err.message || "No se pudo eliminar el producto.");
    }
  }

  const activeLabel = useMemo(() => tabs.find((tab) => tab.id === activeTab)?.label || "Inicio", [activeTab]);

  if (isFirebaseConfigured && authLoading) {
    return <main className="app-shell"><div className="alert">Verificando sesión...</div></main>;
  }

  if (isFirebaseConfigured && !user) {
    return <Login />;
  }

  return (
    <div className="layout-shell">
      <AppNavigation
        activeTab={activeTab}
        activeLabel={activeLabel}
        onSelectTab={handleSelectTab}
        onRefresh={loadAll}
        loading={loading}
        user={user}
      />

      <main className="app-shell">
        <section className="page-hero">
          <div>
            <p className="eyebrow">{isFirebaseConfigured ? "Firebase conectado" : "Modo local"}</p>
            <h2>{activeLabel}</h2>
            <p>Operación diaria, costos, pedidos, clientes, reportes y backups en una interfaz responsive.</p>
          </div>
          <div className="status-box compact-status">
            <span>Cuenta</span>
            <strong>{user?.email || "Local"}</strong>
            <small>{isFirebaseConfigured ? `Ruta: ${getFirebaseRouteLabel()}` : "Datos en navegador"}</small>
          </div>
        </section>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}
        {loading && <div className="alert">Cargando datos...</div>}

        {!loading && activeTab === "inicio" && (
          <DashboardPage pedidos={pedidos} productos={productos} clientes={clientes} vendedores={vendedores} />
        )}

        {!loading && activeTab === "productos" && (
          <div className="stack">
            <ProductForm selectedProduct={selectedProduct} onSave={handleSaveProduct} onCancel={() => setSelectedProduct(null)} />
            <ProductTable productos={productos} onEdit={(producto) => { setSelectedProduct(producto); window.scrollTo({ top: 0, behavior: "smooth" }); }} onDelete={handleDeleteProduct} />
          </div>
        )}

        {!loading && activeTab === "calculadora" && <Calculator productos={productos} />}

        {!loading && activeTab === "pedidos" && (
          <PedidosPage productos={productos} vendedores={vendedores} pedidos={pedidos} onRefresh={loadAll} setError={setError} setSuccess={setSuccess} />
        )}

        {!loading && activeTab === "clientes" && <ClientesPage clientes={clientes} pedidos={pedidos} />}

        {!loading && activeTab === "vendedores" && (
          <VendedoresPage vendedores={vendedores} onRefresh={loadAll} setError={setError} setSuccess={setSuccess} />
        )}

        {!loading && activeTab === "caja" && (
          <CajaPage pedidos={pedidos} setError={setError} setSuccess={setSuccess} />
        )}

        {!loading && activeTab === "hojaRuta" && (
          <HojaRutaPage pedidos={pedidos} setError={setError} />
        )}

        {!loading && activeTab === "stock" && (
          <StockPage productos={productos} onRefresh={loadAll} setError={setError} setSuccess={setSuccess} />
        )}

        {!loading && activeTab === "comisiones" && (
          <ComisionesPage pedidos={pedidos} vendedores={vendedores} setError={setError} setSuccess={setSuccess} />
        )}

        {!loading && activeTab === "cuentaCorriente" && (
          <CuentaCorrientePage pedidos={pedidos} onRefresh={loadAll} setError={setError} setSuccess={setSuccess} />
        )}

        {!loading && activeTab === "zonas" && <ZonasPage pedidos={pedidos} />}

        {!loading && activeTab === "estadisticas" && <EstadisticasPage pedidos={pedidos} />}

        {!loading && activeTab === "auditoria" && <AuditoriaPage setError={setError} />}

        {!loading && activeTab === "backups" && (
          <BackupsPage pedidos={pedidos} onRefresh={loadAll} setError={setError} setSuccess={setSuccess} />
        )}
      </main>
    </div>
  );
}
