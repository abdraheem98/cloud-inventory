import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const money = value => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value || 0);

function App() {
  const [products, setProducts] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [form, setForm] = useState({ sku: '', name: '', price: '', quantity: '0' });

  async function load() {
    setLoading(true);
    try {
      setError('');
      const r = await fetch(`${API}/api/products`);
      if (!r.ok) throw new Error(`API returned ${r.status}. Check that the backend is running.`);
      setProducts(await r.json());
    } catch (e) {
      setError(`Unable to connect to the application service. Start the FastAPI backend at ${API}, then refresh.`);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);
  const filtered = useMemo(() => products.filter(p => `${p.sku} ${p.name}`.toLowerCase().includes(query.toLowerCase())), [products, query]);
  const units = products.reduce((s, p) => s + Number(p.quantity || 0), 0);
  const value = products.reduce((s, p) => s + Number(p.price || 0) * Number(p.quantity || 0), 0);
  function change(e) { setForm({ ...form, [e.target.name]: e.target.value }); }
  async function submit(e) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const r = await fetch(`${API}/api/products`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, price: Number(form.price), quantity: Number(form.quantity) }) });
      if (!r.ok) { let d = {}; try { d = await r.json(); } catch {} throw new Error(d.detail || `Save failed (${r.status})`); }
      setForm({ sku: '', name: '', price: '', quantity: '0' }); await load();
    } catch (e) { setError(e.message === 'Failed to fetch' ? `Cannot reach ${API}. Confirm the backend is running.` : e.message); }
    finally { setBusy(false); }
  }
  async function remove(id) {
    if (!window.confirm('Remove this product from the catalog?')) return;
    try { const r = await fetch(`${API}/api/products/${id}`, { method: 'DELETE' }); if (!r.ok) throw new Error('Delete failed'); await load(); }
    catch { setError('Could not delete the product. Check the backend connection and try again.'); }
  }
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">C</div><div><strong>Cloudstock</strong><small>INVENTORY WORKSPACE</small></div></div>
      <div className="nav-label">WORKSPACE</div>
      <div className="nav-item active"><span className="nav-icon">▦</span> Overview</div>
      <div className="nav-item"><span className="nav-icon">▤</span> Products <span className="nav-count">{products.length}</span></div>
      <div className="nav-item muted"><span className="nav-icon">⇄</span> Stock movements</div>
      <div className="nav-item muted"><span className="nav-icon">▧</span> Documents</div>
      <div className="sidebar-bottom"><div className="status-dot"></div><div><b>Workspace status</b><small>{error ? 'Backend connection needed' : loading ? 'Checking service…' : 'Ready'}</small></div></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><div className="breadcrumb">Workspace <span>/</span> Overview</div><div className="profile"><div className="avatar">A</div><div><b>Administrator</b><small>Workspace owner</small></div><span className="chevron">⌄</span></div></header>
      <div className="content">
        <section className="page-heading"><div><div className="kicker">INVENTORY MANAGEMENT</div><h1>Overview</h1><p>Track your product catalog, stock levels, and inventory value.</p></div><button className="refresh" onClick={load} disabled={loading}><span>↻</span> Refresh</button></section>
        {error && <div className="alert"><span className="alert-icon">!</span><div><b>Connection issue</b><p>{error}</p></div><button className="alert-action" onClick={load}>Retry</button></div>}
        <section className="metrics">
          <article className="metric-card"><div className="metric-top"><span className="metric-label">Total products</span><span className="metric-icon blue">▦</span></div><strong>{products.length}</strong><small>Products in your catalog</small></article>
          <article className="metric-card"><div className="metric-top"><span className="metric-label">Units in stock</span><span className="metric-icon green">▤</span></div><strong>{units.toLocaleString('en-IN')}</strong><small>Across all listed products</small></article>
          <article className="metric-card"><div className="metric-top"><span className="metric-label">Inventory value</span><span className="metric-icon violet">₹</span></div><strong className="value">{money(value)}</strong><small>Based on price × quantity</small></article>
        </section>
        <section className="panel add-panel"><div className="panel-heading"><div><h2>Add a product</h2><p>Enter the product details to add it to your catalog.</p></div><span className="panel-symbol">＋</span></div>
          <form onSubmit={submit} className="product-form">
            <label>SKU<input name="sku" value={form.sku} onChange={change} placeholder="e.g. PAN-MG-001" required maxLength="50" /></label>
            <label>Product name<input name="name" value={form.name} onChange={change} placeholder="Enter product name" required maxLength="150" /></label>
            <label>Unit price <span className="hint">(INR)</span><div className="input-prefix"><span>₹</span><input name="price" type="number" min="0" step="0.01" value={form.price} onChange={change} placeholder="0.00" required /></div></label>
            <label>Opening quantity<input name="quantity" type="number" min="0" step="1" value={form.quantity} onChange={change} required /></label>
            <div className="form-actions"><button className="primary" disabled={busy}>{busy ? 'Saving product…' : '＋  Add product'}</button><span>SKU must be unique.</span></div>
          </form>
        </section>
        <section className="panel catalog-panel"><div className="catalog-heading"><div><h2>Product catalog</h2><p>Manage the products available in your workspace.</p></div><div className="catalog-tools"><div className="search"><span>⌕</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search products…" aria-label="Search products" /></div><span className="record-count">{filtered.length} {filtered.length === 1 ? 'product' : 'products'}</span></div></div>
          <div className="table-wrap"><table><thead><tr><th>PRODUCT</th><th>SKU</th><th>UNIT PRICE</th><th>QUANTITY</th><th>INVENTORY VALUE</th><th></th></tr></thead><tbody>
            {filtered.map(p => <tr key={p.id}><td><div className="product-cell"><div className="product-avatar">{String(p.name || '?').slice(0,1).toUpperCase()}</div><b>{p.name}</b></div></td><td><code>{p.sku}</code></td><td>{money(Number(p.price))}</td><td><span className={`stock ${p.quantity > 0 ? 'in-stock' : 'out-stock'}`}><i></i>{p.quantity > 0 ? `${p.quantity} in stock` : 'Out of stock'}</span></td><td className="amount">{money(Number(p.price) * Number(p.quantity))}</td><td><button className="delete" onClick={() => remove(p.id)} title="Delete product" aria-label={`Delete ${p.name}`}>⋯</button></td></tr>)}
            {!filtered.length && <tr><td colSpan="6"><div className="empty-state"><div className="empty-icon">▤</div><b>{query ? 'No matching products' : 'Your catalog is ready'}</b><p>{query ? 'Try another search term.' : 'Add your first product using the form above. Your products will appear here.'}</p></div></td></tr>}
          </tbody></table></div>
        </section>
        <footer><span>Cloudstock</span><span>Inventory workspace</span></footer>
      </div>
    </main>
  </div>;
}
createRoot(document.getElementById('root')).render(<App />);
