import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import {
  BarChart3,
  Bell,
  Check,
  ChevronDown,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  Coffee,
  Edit3,
  FileText,
  LayoutDashboard,
  Menu as MenuIcon,
  Minus,
  Package,
  Plus,
  Printer,
  ReceiptText,
  Search,
  Settings2,
  ShoppingBag,
  Sparkles,
  Store,
  Table2,
  Trash2,
  Users,
  Utensils,
  X,
} from "lucide-react";
import { toast } from "sonner";

const CURRENCY = "৳";
const STORAGE_KEY = "restaurant-digital-management-demo-v2";
const today = () => new Date().toDateString();

type Section = "dashboard" | "orders" | "menu" | "tables" | "reports";
type OrderStatus = "Pending" | "Preparing" | "Ready" | "Completed" | "Cancelled";
type MenuItem = { id: string; name: string; category: string; price: number; available: boolean };
type OrderItem = { menuId: string; name: string; price: number; quantity: number };
type Order = {
  id: string;
  number: string;
  customer: string;
  table: number;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  createdAt: string;
};

type StoreData = { menu: MenuItem[]; orders: Order[] };

const seedMenu: MenuItem[] = [
  { id: "m1", name: "Smoked Chicken Rice", category: "Mains", price: 420, available: true },
  { id: "m2", name: "Charred Corn Salad", category: "Salads", price: 280, available: true },
  { id: "m3", name: "Citrus Prawn Pasta", category: "Mains", price: 560, available: true },
  { id: "m4", name: "House Lemonade", category: "Drinks", price: 160, available: true },
  { id: "m5", name: "Burnt Basque Cheesecake", category: "Desserts", price: 260, available: false },
  { id: "m6", name: "Classic Beef Burger", category: "Mains", price: 390, available: true },
  { id: "m7", name: "Garden Herb Pizza", category: "Mains", price: 480, available: true },
  { id: "m8", name: "Mango Iced Tea", category: "Drinks", price: 180, available: true },
  { id: "m9", name: "Crispy Calamari", category: "Starters", price: 340, available: true },
];

const navItems: { id: Section; label: string; icon: ReactNode }[] = [
  { id: "dashboard", label: "Overview", icon: <LayoutDashboard size={18} /> },
  { id: "orders", label: "Orders", icon: <ClipboardList size={18} /> },
  { id: "menu", label: "Menu", icon: <MenuIcon size={18} /> },
  { id: "tables", label: "Tables", icon: <Table2 size={18} /> },
  { id: "reports", label: "Reports", icon: <BarChart3 size={18} /> },
];

const statusOptions: OrderStatus[] = ["Pending", "Preparing", "Ready", "Completed", "Cancelled"];
const statusClass = (status: OrderStatus) => `status-pill status-${status.toLowerCase()}`;
const formatMoney = (amount: number) => `${CURRENCY}${amount.toLocaleString("en-BD")}`;
const formatDate = (date: string) => new Date(date).toLocaleString("en-BD", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const getInitials = (name: string) => name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();

function loadData(): StoreData {
  if (typeof window === "undefined") return { menu: seedMenu, orders: [] };
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored) as StoreData;
  } catch {
    // Fall back to the starter menu if storage is unavailable or corrupted.
  }
  return { menu: seedMenu, orders: [] };
}

function StatCard({ label, value, detail, icon, tone }: { label: string; value: string; detail: string; icon: ReactNode; tone: string }) {
  return (
    <div className={`stat-card ${tone}`}>
      <div className="stat-top"><span>{label}</span><span className="stat-icon">{icon}</span></div>
      <div className="stat-value">{value}</div>
      <div className="stat-detail">{detail}</div>
    </div>
  );
}

function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="page-header">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}

function EmptyState({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return <div className="empty-state"><div className="empty-icon">{icon}</div><h3>{title}</h3><p>{text}</p></div>;
}

export default function Home() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const isStaticDemo = import.meta.env.VITE_STATIC_DEMO === "true";
  const [{ menu, orders }, setData] = useState<StoreData>(() => loadData());
  const [section, setSection] = useState<Section>("dashboard");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [menuSearch, setMenuSearch] = useState("");
  const [orderSearch, setOrderSearch] = useState("");
  const [orderFilter, setOrderFilter] = useState<"All" | OrderStatus>("All");
  const [menuModal, setMenuModal] = useState<{ open: boolean; item?: MenuItem }>({ open: false });
  const [orderModal, setOrderModal] = useState(false);
  const [billOrder, setBillOrder] = useState<Order | null>(null);

  const displayName = isStaticDemo ? "Demo Manager" : user?.name?.trim() || user?.email?.split("@")[0] || "User";
  const displayEmail = user?.email || "Signed in with Manus";

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ menu, orders }));
  }, [menu, orders]);

  const completedOrders = orders.filter((order) => order.status === "Completed");
  const pendingOrders = orders.filter((order) => ["Pending", "Preparing", "Ready"].includes(order.status));
  const todayOrders = orders.filter((order) => new Date(order.createdAt).toDateString() === today());
  const todaySales = completedOrders.filter((order) => new Date(order.createdAt).toDateString() === today()).reduce((sum, order) => sum + order.total, 0);
  const occupiedTables = new Set(orders.filter((order) => ["Pending", "Preparing", "Ready"].includes(order.status)).map((order) => order.table));

  const navigate = (nextSection: Section) => {
    setSection(nextSection);
    setMobileNavOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const saveMenuItem = (item: MenuItem) => {
    setData((current) => ({ ...current, menu: current.menu.some((existing) => existing.id === item.id) ? current.menu.map((existing) => existing.id === item.id ? item : existing) : [item, ...current.menu] }));
    setMenuModal({ open: false });
    toast.success(`${item.name} ${menu.some((existing) => existing.id === item.id) ? "updated" : "added"} to the menu`);
  };

  const deleteMenuItem = (id: string) => {
    const item = menu.find((menuItem) => menuItem.id === id);
    if (!item) return;
    setData((current) => ({ ...current, menu: current.menu.filter((menuItem) => menuItem.id !== id) }));
    toast.success(`${item.name} removed from the menu`);
  };

  const toggleAvailability = (id: string) => {
    setData((current) => ({ ...current, menu: current.menu.map((item) => item.id === id ? { ...item, available: !item.available } : item) }));
  };

  const createOrder = (order: Order) => {
    setData((current) => ({ ...current, orders: [order, ...current.orders] }));
    setOrderModal(false);
    toast.success(`${order.number} created successfully`);
  };

  const updateOrderStatus = (id: string, status: OrderStatus) => {
    setData((current) => ({ ...current, orders: current.orders.map((order) => order.id === id ? { ...order, status } : order) }));
    toast.success(`Order marked ${status.toLowerCase()}`);
  };

  const filteredMenu = menu.filter((item) => item.name.toLowerCase().includes(menuSearch.toLowerCase()) || item.category.toLowerCase().includes(menuSearch.toLowerCase()));
  const filteredOrders = orders.filter((order) => (orderFilter === "All" || order.status === orderFilter) && `${order.number} ${order.customer} ${order.table}`.toLowerCase().includes(orderSearch.toLowerCase()));

  if (!isStaticDemo && loading) return <AuthLoadingScreen />;
  if (!isStaticDemo && !isAuthenticated) return <LoginScreen />;

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNavOpen ? "sidebar-open" : ""}`}>
        <div className="brand-lockup"><div className="brand-mark"><Utensils size={19} /></div><div><div className="brand-name">Plated</div><div className="brand-subtitle">Restaurant OS</div></div></div>
        <div className="sidebar-section-label">Workspace</div>
        <nav className="sidebar-nav">
          {navItems.map((item) => <button key={item.id} className={`nav-item ${section === item.id ? "active" : ""}`} onClick={() => navigate(item.id)}>{item.icon}<span>{item.label}</span>{item.id === "orders" && pendingOrders.length > 0 && <span className="nav-count">{pendingOrders.length}</span>}</button>)}
        </nav>
        <div className="sidebar-bottom"><div className="sidebar-note"><Sparkles size={16} /><div><strong>Today at Plated</strong><span>{todayOrders.length} orders · {formatMoney(todaySales)} sales</span></div></div><button className="settings-link" onClick={() => toast.info("Settings are intentionally kept out of this simple system.")}><Settings2 size={16} /> Simple setup</button></div>
      </aside>
      {mobileNavOpen && <button className="mobile-backdrop" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />}
      <main className="main-content">
        <header className="topbar"><button className="mobile-menu-button" onClick={() => setMobileNavOpen(true)}><MenuIcon size={20} /></button><div className="breadcrumb"><span>Plated</span><span className="breadcrumb-slash">/</span><strong>{navItems.find((item) => item.id === section)?.label}</strong></div><div className="topbar-actions"><div className="open-status"><span className="live-dot" /> Open today <span className="topbar-time">· {new Date().toLocaleDateString("en-BD", { weekday: "short", day: "numeric", month: "short" })}</span></div><button className="icon-button" onClick={() => toast.info(pendingOrders.length ? `${pendingOrders.length} active orders need attention.` : "You're all caught up.")} aria-label="Notifications"><Bell size={18} />{pendingOrders.length > 0 && <span className="notification-dot" />}</button><button className="account-chip" onClick={() => { void logout().then(() => toast.success("Signed out of Plated")).catch(() => toast.error("Could not sign out. Please try again.")); }} title={`Sign out ${displayEmail}`}><span className="user-avatar">{getInitials(displayName)}</span><span className="account-copy"><strong>{displayName}</strong><small>Sign out</small></span></button></div></header>
        <div className="content-wrap">
          {section === "dashboard" && <DashboardSection displayName={displayName} orders={orders} todayOrders={todayOrders} pendingOrders={pendingOrders} completedOrders={completedOrders} todaySales={todaySales} onNavigate={navigate} onCreateOrder={() => setOrderModal(true)} onUpdateStatus={updateOrderStatus} onBill={setBillOrder} />}
          {section === "orders" && <OrdersSection orders={filteredOrders} search={orderSearch} filter={orderFilter} onSearch={setOrderSearch} onFilter={setOrderFilter} onCreateOrder={() => setOrderModal(true)} onUpdateStatus={updateOrderStatus} onBill={setBillOrder} />}
          {section === "menu" && <MenuSection items={filteredMenu} search={menuSearch} onSearch={setMenuSearch} onCreate={() => setMenuModal({ open: true })} onEdit={(item) => setMenuModal({ open: true, item })} onDelete={deleteMenuItem} onToggle={toggleAvailability} />}
          {section === "tables" && <TablesSection occupiedTables={occupiedTables} orders={orders} onNavigate={navigate} />}
          {section === "reports" && <ReportsSection orders={orders} completedOrders={completedOrders} todaySales={todaySales} />}
        </div>
      </main>
      {menuModal.open && <MenuModal item={menuModal.item} onClose={() => setMenuModal({ open: false })} onSave={saveMenuItem} />}
      {orderModal && <OrderModal menu={menu} occupiedTables={occupiedTables} onClose={() => setOrderModal(false)} onCreate={createOrder} />}
      {billOrder && <BillModal order={billOrder} onClose={() => setBillOrder(null)} />}
      <div className="toast-host"><div id="sonner" /></div>
    </div>
  );
}

function AuthLoadingScreen() {
  return <div className="auth-screen"><div className="auth-card auth-loading"><div className="brand-mark"><Utensils size={19} /></div><div className="auth-spinner" /><p>Preparing your restaurant workspace…</p></div></div>;
}

function LoginScreen() {
  return <div className="auth-screen"><div className="auth-art"><div className="auth-art-glow" /><div className="auth-art-content"><div className="brand-lockup"><div className="brand-mark"><Utensils size={19} /></div><div><div className="brand-name">Plated</div><div className="brand-subtitle">Restaurant OS</div></div></div><div className="auth-quote"><span>“</span><p>Make every service feel considered.</p><small>One calm workspace for the whole room.</small></div><div className="auth-art-footer"><span className="live-dot" /> Simple, local restaurant operations</div></div></div><div className="auth-card"><div className="auth-card-kicker">Welcome to Plated</div><h1>Run the room<br /><em>with clarity.</em></h1><p className="auth-description">Sign in to manage your menu, orders, tables, bills, and daily reports.</p><button className="primary-button auth-login-button" onClick={() => startLogin()}><span className="login-icon"><Users size={16} /></span> Sign in to continue <span className="login-arrow">→</span></button><div className="auth-demo-note"><Sparkles size={15} /><span>Demo menu included<br /><small>No payment gateway or extra setup required.</small></span></div><p className="auth-footnote">Authentication is handled securely by Manus OAuth.</p></div></div>;
}

function DashboardSection({ displayName, orders, todayOrders, pendingOrders, completedOrders, todaySales, onNavigate, onCreateOrder, onUpdateStatus, onBill }: { displayName: string; orders: Order[]; todayOrders: Order[]; pendingOrders: Order[]; completedOrders: Order[]; todaySales: number; onNavigate: (section: Section) => void; onCreateOrder: () => void; onUpdateStatus: (id: string, status: OrderStatus) => void; onBill: (order: Order) => void }) {
  const recentOrders = orders.slice(0, 5);
  return <>
    <PageHeader eyebrow="Monday · Service at a glance" title={`Good morning, ${displayName}`} description="Here’s what’s happening in your restaurant today." action={<button className="primary-button" onClick={onCreateOrder}><Plus size={17} /> New order</button>} />
    <div className="stats-grid"><StatCard label="Total orders" value={String(orders.length)} detail={`${todayOrders.length} placed today`} icon={<ClipboardList size={19} />} tone="tone-ink" /><StatCard label="Pending orders" value={String(pendingOrders.length)} detail={pendingOrders.length ? "Needs your attention" : "All caught up"} icon={<Clock3 size={19} />} tone="tone-coral" /><StatCard label="Completed orders" value={String(completedOrders.length)} detail="Across all service days" icon={<Check size={19} />} tone="tone-olive" /><StatCard label="Today's sales" value={formatMoney(todaySales)} detail="Completed orders only" icon={<CircleDollarSign size={19} />} tone="tone-cream" /></div>
    <div className="dashboard-grid">
      <section className="panel recent-panel"><div className="panel-heading"><div><div className="panel-kicker">Live service</div><h2>Recent orders</h2></div><button className="text-button" onClick={() => onNavigate("orders")}>View all <span>→</span></button></div>{recentOrders.length ? <div className="order-table-wrap"><table className="data-table"><thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th /></tr></thead><tbody>{recentOrders.map((order) => <OrderRow key={order.id} order={order} compact onUpdateStatus={onUpdateStatus} onBill={onBill} />)}</tbody></table></div> : <EmptyState icon={<ClipboardList size={22} />} title="No orders yet" text="Create your first order to see service activity here." />}</section>
      <section className="panel quick-panel"><div className="panel-kicker">At a glance</div><h2>Service pulse</h2><div className="pulse-visual"><div className="pulse-ring"><span>{pendingOrders.length}</span><small>active</small></div><div className="pulse-legend"><div><span className="legend-dot dot-coral" /> Waiting <strong>{pendingOrders.filter((order) => order.status === "Pending").length}</strong></div><div><span className="legend-dot dot-gold" /> Preparing <strong>{pendingOrders.filter((order) => order.status === "Preparing").length}</strong></div><div><span className="legend-dot dot-olive" /> Ready <strong>{pendingOrders.filter((order) => order.status === "Ready").length}</strong></div></div></div><div className="quick-actions"><button onClick={onCreateOrder}><ShoppingBag size={16} /> Take an order</button><button onClick={() => onNavigate("menu")}><MenuIcon size={16} /> Manage menu</button></div></section>
    </div>
    <section className="dashboard-callout"><div className="callout-icon"><Store size={22} /></div><div><div className="panel-kicker">Tables & floor</div><h3>Keep the room moving</h3><p>See which tables are occupied and jump back into an open check.</p></div><button className="secondary-button" onClick={() => onNavigate("tables")}>View tables <span>→</span></button></section>
  </>;
}

function OrdersSection({ orders, search, filter, onSearch, onFilter, onCreateOrder, onUpdateStatus, onBill }: { orders: Order[]; search: string; filter: "All" | OrderStatus; onSearch: (value: string) => void; onFilter: (value: "All" | OrderStatus) => void; onCreateOrder: () => void; onUpdateStatus: (id: string, status: OrderStatus) => void; onBill: (order: Order) => void }) {
  return <><PageHeader eyebrow="Service desk" title="Orders" description="Track every table, ticket, and total from one place." action={<button className="primary-button" onClick={onCreateOrder}><Plus size={17} /> New order</button>} /><section className="panel page-panel"><div className="toolbar"><div className="search-box"><Search size={16} /><input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Search order, customer or table" /></div><div className="filter-tabs">{["All", ...statusOptions].map((option) => <button key={option} className={filter === option ? "active" : ""} onClick={() => onFilter(option as "All" | OrderStatus)}>{option}</button>)}</div></div>{orders.length ? <div className="order-table-wrap"><table className="data-table orders-full"><thead><tr><th>Order</th><th>Customer</th><th>Table</th><th>Items</th><th>Total</th><th>Status</th><th>Date / time</th><th /></tr></thead><tbody>{orders.map((order) => <OrderRow key={order.id} order={order} onUpdateStatus={onUpdateStatus} onBill={onBill} />)}</tbody></table></div> : <EmptyState icon={<Search size={22} />} title="No matching orders" text="Try a different search or status filter." />}</section></>;
}

function OrderRow({ order, compact, onUpdateStatus, onBill }: { order: Order; compact?: boolean; onUpdateStatus: (id: string, status: OrderStatus) => void; onBill: (order: Order) => void }) {
  return <tr><td><strong className="order-number">{order.number}</strong></td><td><div className="customer-cell"><span className="mini-avatar">{getInitials(order.customer)}</span><span>{order.customer}</span></div></td>{!compact && <td><span className="table-number">T{order.table}</span></td>}<td><span className="items-cell">{order.items.map((item) => `${item.quantity}× ${item.name}`).join(", ")}</span></td><td><strong>{formatMoney(order.total)}</strong></td><td><select className={statusClass(order.status)} value={order.status} onChange={(event) => onUpdateStatus(order.id, event.target.value as OrderStatus)} aria-label={`Update ${order.number} status`}>{statusOptions.map((status) => <option key={status}>{status}</option>)}</select></td>{!compact && <td><span className="date-cell">{formatDate(order.createdAt)}</span></td>}<td><button className="row-action" onClick={() => onBill(order)} title="View bill"><ReceiptText size={16} /></button></td></tr>;
}

function MenuSection({ items, search, onSearch, onCreate, onEdit, onDelete, onToggle }: { items: MenuItem[]; search: string; onSearch: (value: string) => void; onCreate: () => void; onEdit: (item: MenuItem) => void; onDelete: (id: string) => void; onToggle: (id: string) => void }) {
  return <><PageHeader eyebrow="Kitchen catalog" title="Menu management" description="Keep your menu fresh, available, and easy to order from." action={<button className="primary-button" onClick={onCreate}><Plus size={17} /> Add food item</button>} /><section className="panel page-panel"><div className="toolbar menu-toolbar"><div className="search-box"><Search size={16} /><input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Search menu items or categories" /></div><div className="menu-count"><span className="live-dot" /> {items.filter((item) => item.available).length} of {items.length} available</div></div>{items.length ? <div className="menu-grid">{items.map((item) => <div className="menu-card" key={item.id}><div className={`menu-card-art category-${item.category.toLowerCase()}`}><span>{item.category}</span><div className="food-symbol">{item.category === "Drinks" ? <Coffee size={28} /> : item.category === "Desserts" ? <Sparkles size={27} /> : <Utensils size={28} />}</div></div><div className="menu-card-body"><div className="menu-card-title"><div><h3>{item.name}</h3><span>{item.category}</span></div><strong>{formatMoney(item.price)}</strong></div><div className="menu-card-footer"><button className={`availability-toggle ${item.available ? "is-available" : "is-off"}`} onClick={() => onToggle(item.id)}><span /> {item.available ? "Available" : "Unavailable"}</button><div className="card-actions"><button onClick={() => onEdit(item)} title="Edit"><Edit3 size={15} /></button><button onClick={() => onDelete(item.id)} title="Delete"><Trash2 size={15} /></button></div></div></div></div>)}</div> : <EmptyState icon={<MenuIcon size={22} />} title="Your menu is empty" text="Add your first food item to start taking orders." />}</section></>;
}

function TablesSection({ occupiedTables, orders, onNavigate }: { occupiedTables: Set<number>; orders: Order[]; onNavigate: (section: Section) => void }) {
  return <><PageHeader eyebrow="Floor plan" title="Tables" description="A simple view of your ten tables and current seating status." action={<button className="secondary-button" onClick={() => onNavigate("orders")}><ClipboardList size={16} /> View orders</button>} /><div className="table-summary"><div><span className="table-summary-dot available-dot" /> Available <strong>{10 - occupiedTables.size}</strong></div><div><span className="table-summary-dot occupied-dot" /> Occupied <strong>{occupiedTables.size}</strong></div><div className="table-summary-note"><Clock3 size={15} /> Status updates from active orders</div></div><section className="floor-grid">{Array.from({ length: 10 }, (_, index) => { const table = index + 1; const occupied = occupiedTables.has(table); const activeOrder = orders.find((order) => order.table === table && ["Pending", "Preparing", "Ready"].includes(order.status)); return <div className={`floor-table ${occupied ? "occupied" : "available"}`} key={table}><div className="table-number-large">{table}</div><div className="table-caption">Table {table}</div><div className={`table-status ${occupied ? "occupied-status" : "available-status"}`}><span />{occupied ? "Occupied" : "Available"}</div>{activeOrder && <div className="table-order">{activeOrder.number} · {formatMoney(activeOrder.total)}</div>}<div className="table-shape"><span /><span /><span /><span /></div></div>})}</section></>;
}

function ReportsSection({ orders, completedOrders, todaySales }: { orders: Order[]; completedOrders: Order[]; todaySales: number }) {
  const cancelled = orders.filter((order) => order.status === "Cancelled");
  const pending = orders.filter((order) => ["Pending", "Preparing", "Ready"].includes(order.status));
  const max = Math.max(completedOrders.length, cancelled.length, pending.length, 1);
  return <><PageHeader eyebrow="Performance snapshot" title="Reports" description="A clear read on sales and order activity, without the extra noise." action={<div className="report-date"><Clock3 size={15} /> {new Date().toLocaleDateString("en-BD", { day: "numeric", month: "long", year: "numeric" })}</div>} /><div className="report-grid"><StatCard label="Today's total sales" value={formatMoney(todaySales)} detail="Completed orders only" icon={<CircleDollarSign size={19} />} tone="tone-ink" /><StatCard label="Total orders" value={String(orders.length)} detail="All service days" icon={<ClipboardList size={19} />} tone="tone-cream" /><StatCard label="Completed orders" value={String(completedOrders.length)} detail="Successfully served" icon={<Check size={19} />} tone="tone-olive" /><StatCard label="Cancelled orders" value={String(cancelled.length)} detail="Keep an eye on this" icon={<X size={19} />} tone="tone-coral" /></div><section className="panel report-panel"><div className="panel-heading"><div><div className="panel-kicker">Order status</div><h2>Service mix</h2></div><span className="report-total">{orders.length} total orders</span></div><div className="bar-chart"><div className="bar-row"><div className="bar-label"><span>Completed</span><strong>{completedOrders.length}</strong></div><div className="bar-track"><div className="bar-fill bar-olive" style={{ width: `${(completedOrders.length / max) * 100}%` }} /></div></div><div className="bar-row"><div className="bar-label"><span>In service</span><strong>{pending.length}</strong></div><div className="bar-track"><div className="bar-fill bar-gold" style={{ width: `${(pending.length / max) * 100}%` }} /></div></div><div className="bar-row"><div className="bar-label"><span>Cancelled</span><strong>{cancelled.length}</strong></div><div className="bar-track"><div className="bar-fill bar-coral" style={{ width: `${(cancelled.length / max) * 100}%` }} /></div></div></div><div className="report-footnote"><FileText size={16} /> Sales are counted when an order is marked <strong>Completed</strong>.</div></section></>;
}

function ModalShell({ title, eyebrow, children, onClose, width = "520px" }: { title: string; eyebrow: string; children: ReactNode; onClose: () => void; width?: string }) {
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="modal-card" style={{ maxWidth: width }}><div className="modal-header"><div><div className="eyebrow">{eyebrow}</div><h2>{title}</h2></div><button className="modal-close" onClick={onClose} aria-label="Close"><X size={19} /></button></div>{children}</div></div>;
}

function MenuModal({ item, onClose, onSave }: { item?: MenuItem; onClose: () => void; onSave: (item: MenuItem) => void }) {
  const [name, setName] = useState(item?.name ?? "");
  const [category, setCategory] = useState(item?.category ?? "Mains");
  const [price, setPrice] = useState(item?.price ? String(item.price) : "");
  const [available, setAvailable] = useState(item?.available ?? true);
  const submit = (event: FormEvent) => { event.preventDefault(); if (!name.trim() || !price || Number(price) <= 0) { toast.error("Add a food name and a valid price first."); return; } onSave({ id: item?.id ?? `m-${Date.now()}`, name: name.trim(), category, price: Number(price), available }); };
  return <ModalShell title={item ? "Edit food item" : "Add food item"} eyebrow="Menu catalog" onClose={onClose}><form onSubmit={submit} className="modal-form"><label>Food name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Grilled sea bass" autoFocus /></label><div className="form-row"><label>Category<select value={category} onChange={(event) => setCategory(event.target.value)}><option>Mains</option><option>Starters</option><option>Salads</option><option>Drinks</option><option>Desserts</option></select></label><label>Price<input type="number" min="1" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="0" /></label></div><label className="switch-row"><span><strong>Available for ordering</strong><small>Customers can add this item to new orders.</small></span><button type="button" className={`switch ${available ? "on" : ""}`} onClick={() => setAvailable((current) => !current)} aria-label="Toggle availability"><span /></button></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button"><Check size={16} /> {item ? "Save changes" : "Add to menu"}</button></div></form></ModalShell>;
}

function OrderModal({ menu, occupiedTables, onClose, onCreate }: { menu: MenuItem[]; occupiedTables: Set<number>; onClose: () => void; onCreate: (order: Order) => void }) {
  const availableMenu = menu.filter((item) => item.available);
  const [customer, setCustomer] = useState("");
  const [table, setTable] = useState("");
  const [selected, setSelected] = useState<Record<string, number>>({});
  const selectedItems = availableMenu.filter((item) => selected[item.id]).map((item) => ({ ...item, quantity: selected[item.id] }));
  const total = selectedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const setQuantity = (id: string, quantity: number) => setSelected((current) => { const next = { ...current }; if (quantity <= 0) delete next[id]; else next[id] = quantity; return next; });
  const submit = (event: FormEvent) => { event.preventDefault(); if (!customer.trim() || !table || !selectedItems.length) { toast.error("Add a customer, table, and at least one item."); return; } const number = `#${String(Date.now()).slice(-4)}`; onCreate({ id: `o-${Date.now()}`, number, customer: customer.trim(), table: Number(table), items: selectedItems.map((item) => ({ menuId: item.id, name: item.name, price: item.price, quantity: item.quantity })), total, status: "Pending", createdAt: new Date().toISOString() }); };
  return <ModalShell title="Create new order" eyebrow="Service desk" onClose={onClose} width="760px"><form onSubmit={submit} className="order-form"><div className="order-form-fields"><label>Customer name<input value={customer} onChange={(event) => setCustomer(event.target.value)} placeholder="e.g. Alex Morgan" autoFocus /></label><label>Table number<select value={table} onChange={(event) => setTable(event.target.value)}><option value="">Select table</option>{Array.from({ length: 10 }, (_, index) => index + 1).map((number) => <option value={number} key={number} disabled={occupiedTables.has(number)}>Table {number}{occupiedTables.has(number) ? " · Occupied" : ""}</option>)}</select></label></div><div className="order-builder"><div><div className="form-section-title">Choose items <span>{selectedItems.length} selected</span></div><div className="item-picker">{availableMenu.length ? availableMenu.map((item) => <div className={`picker-item ${selected[item.id] ? "selected" : ""}`} key={item.id}><div><strong>{item.name}</strong><span>{item.category} · {formatMoney(item.price)}</span></div><div className="quantity-stepper"><button type="button" onClick={() => setQuantity(item.id, (selected[item.id] ?? 0) - 1)} disabled={!selected[item.id]}><Minus size={14} /></button><span>{selected[item.id] ?? 0}</span><button type="button" onClick={() => setQuantity(item.id, (selected[item.id] ?? 0) + 1)}><Plus size={14} /></button></div></div>) : <EmptyState icon={<MenuIcon size={20} />} title="No available items" text="Add an available food item first." />}</div></div><div className="order-summary"><div className="form-section-title">Order summary</div>{selectedItems.length ? <div className="summary-items">{selectedItems.map((item) => <div key={item.id}><span>{item.quantity}× {item.name}</span><strong>{formatMoney(item.price * item.quantity)}</strong></div>)}</div> : <p className="summary-empty">Items you add will appear here.</p>}<div className="summary-total"><span>Total amount</span><strong>{formatMoney(total)}</strong></div></div></div><div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button" disabled={!selectedItems.length}><ShoppingBag size={16} /> Create order</button></div></form></ModalShell>;
}

function BillModal({ order, onClose }: { order: Order; onClose: () => void }) {
  const printBill = () => { window.print(); };
  return <ModalShell title={`Bill ${order.number}`} eyebrow="Simple billing" onClose={onClose} width="540px"><div className="bill-sheet"><div className="bill-brand"><div className="brand-mark"><Utensils size={16} /></div><div><strong>Plated</strong><span>Restaurant OS</span></div></div><div className="bill-meta"><div><span>Customer</span><strong>{order.customer}</strong></div><div><span>Table</span><strong>T{order.table}</strong></div><div><span>Date</span><strong>{formatDate(order.createdAt)}</strong></div><div><span>Status</span><strong className={statusClass(order.status)}>{order.status}</strong></div></div><div className="bill-lines"><div className="bill-line bill-line-header"><span>Item</span><span>Qty</span><span>Price</span><span>Subtotal</span></div>{order.items.map((item) => <div className="bill-line" key={item.menuId}><span>{item.name}</span><span>{item.quantity}</span><span>{formatMoney(item.price)}</span><strong>{formatMoney(item.price * item.quantity)}</strong></div>)}</div><div className="bill-total"><span>Total amount</span><strong>{formatMoney(order.total)}</strong></div><div className="bill-thanks">Thank you for dining with us.</div></div><div className="modal-actions"><button className="secondary-button" onClick={onClose}>Close</button><button className="primary-button" onClick={printBill}><Printer size={16} /> Print bill</button></div></ModalShell>;
}
