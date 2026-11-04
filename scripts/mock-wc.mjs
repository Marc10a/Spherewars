// Fake WooCommerce (REST v3 subset) for local testing only. Usage: node scripts/mock-wc.mjs   (PORT=4030, MOCK_WC_KEY / MOCK_WC_SECRET)
// GET  /wp-json/wc/v3/products | shipping/zones | shipping/zones/:id/{locations,methods} | payment_gateways | data/continents/:code | orders | orders/:id   (Basic auth required)
// POST /wp-json/wc/v3/orders  -> stores the order, returns its payment_url
// Test helpers (a real WooCommerce has none of these): GET /_orders -> orders received; POST /_control {reset, set: {...}, hangNextOrder, payOrder}
// It reproduces shapes documented by WooCommerce, not its behaviour: it computes no taxes, renders no payment page and sends no customer back.
import http from "node:http";

const PORT = Number(process.env.PORT ?? 4030);
const KEY = process.env.MOCK_WC_KEY ?? "ck_test", SECRET = process.env.MOCK_WC_SECRET ?? "cs_test";
const HOST = `http://localhost:${PORT}`;
const img = (n) => ({ id: n, src: `${HOST}/wp-content/uploads/${n}.jpg`, alt: "Foto de prueba" });

const products = [
  { id: 11, slug: "satanor", name: "Satanor, El Volcán", status: "publish", sku: "SW-UR-01", price: "15.00", regular_price: "15.00", sale_price: "", on_sale: false, stock_status: "instock", manage_stock: true, stock_quantity: 5,
    images: [img(1), img(2)], categories: [{ slug: "manadas-de-urueh" }], meta_data: [{ key: "sw_wiki_slug", value: "personajes/mandas-de-urueh/satanor" }] },
  { id: 12, slug: "leviatan", name: "Leviatán", status: "publish", sku: "SW-VA-01", price: "18.50", regular_price: "18.50", sale_price: "", on_sale: false, stock_status: "instock", manage_stock: false, stock_quantity: null,
    images: [img(3)], categories: [{ slug: "vastagos-de-kurgan" }], meta_data: [] },
  { id: 13, slug: "agotada", name: "Miniatura agotada", status: "publish", sku: "", price: "9.00", regular_price: "9.00", sale_price: "", on_sale: false, stock_status: "outofstock", manage_stock: false, stock_quantity: null,
    images: [], categories: [{ slug: "alianza" }], meta_data: [] },
  { id: 14, slug: "sin-precio", name: "Sin precio", status: "publish", sku: "", price: "", regular_price: "", sale_price: "", on_sale: false, stock_status: "instock", manage_stock: false, stock_quantity: null,
    images: [], categories: [], meta_data: [] },
  { id: 15, slug: "defensores-de-caldara", name: "Defensores de Caldara — Starter Pack", status: "publish", sku: "", price: "39.99", regular_price: "39.99", sale_price: "", on_sale: false, stock_status: "instock", manage_stock: false, stock_quantity: null,
    images: [], categories: [{ slug: "alianza" }, { slug: "starter-packs" }], meta_data: [{ key: "sw_wiki_slug", value: "packs/alianza" }] },
  { id: 16, slug: "cohorte-de-postulantes", name: "Cohorte de Postulantes", status: "publish", sku: "", price: "12.00", regular_price: "16.99", sale_price: "12.00", on_sale: true, stock_status: "instock", manage_stock: false, stock_quantity: null,
    images: [], categories: [{ slug: "alianza" }], meta_data: [{ key: "sw_wiki_slug", value: "personajes/alianza/corazon-postulante" }] },
  { id: 17, slug: "Producto Roto", name: "Roto: slug inválido", status: "publish", sku: "", price: "5.00", regular_price: "5.00", sale_price: "", on_sale: false, stock_status: "instock", manage_stock: false, stock_quantity: null,
    images: [], categories: [{ slug: "alianza" }], meta_data: [] },
];
const initial = () => ({
  zones: [{ id: 0, name: "Resto del mundo", order: 0 }, { id: 1, name: "España", order: 0 }, { id: 2, name: "Francia (fórmula)", order: 1 }, { id: 3, name: "Europa", order: 2 }],
  locations: { 1: [{ code: "ES", type: "country" }], 2: [{ code: "FR", type: "country" }], 3: [{ code: "EU", type: "continent" }] },
  methods: {
    1: [
      { instance_id: 7, title: "Envío estándar", enabled: true, method_id: "flat_rate", settings: { cost: { value: "5.00" } } },
      { instance_id: 8, title: "Envío gratis", enabled: true, method_id: "free_shipping", settings: { requires: { value: "min_amount" }, min_amount: { value: "50" } } },
    ],
    2: [{ instance_id: 9, title: "Tarifa con fórmula", enabled: true, method_id: "flat_rate", settings: { cost: { value: "5 + [qty]" } } }],
    3: [{ instance_id: 10, title: "Envío Europa", enabled: true, method_id: "flat_rate", settings: { cost: { value: "12.00" } } }],
  },
  continents: { EU: { code: "EU", name: "Europe", countries: ["ES", "FR", "PT", "DE", "IT"].map((code) => ({ code, name: code })) } },
  gateways: [{ id: "bacs", title: "Transferencia", enabled: false }, { id: "stripe", title: "Tarjeta", enabled: true }],
});
let world = initial();
let hangNextOrder = false;
const orders = [];

const orderView = (o) => ({ ...o, number: String(o.id), payment_url: `${HOST}/checkout/order-pay/${o.id}/?pay_for_order=true&key=${o.order_key}`, needs_payment: o.status === "pending" });

const readBody = (req) => new Promise((done) => { let b = ""; req.on("data", (c) => (b += c)); req.on("end", () => done(b)); });

http.createServer(async (req, res) => {
  const u = new URL(req.url, HOST);
  const send = (code, body) => { res.writeHead(code, { "Content-Type": "application/json" }); res.end(JSON.stringify(body)); };
  if (u.pathname === "/_orders") return send(200, orders.map(orderView));
  if (u.pathname === "/_control" && req.method === "POST") {
    const c = JSON.parse((await readBody(req)) || "{}");
    if (c.reset) { world = initial(); orders.length = 0; hangNextOrder = false; }
    if (c.set) Object.assign(world, c.set);
    if (c.hangNextOrder) hangNextOrder = true;
    if (c.payOrder) { const o = orders.find((x) => x.id === c.payOrder); if (o) o.status = "processing"; }
    if (c.ageOrders) for (const o of orders) o.date_created_gmt = new Date(Date.now() - c.ageOrders).toISOString().slice(0, 19);
    return send(200, { ok: true });
  }
  console.log(new Date().toISOString(), req.method, u.pathname + u.search);
  const ok = req.headers.authorization === `Basic ${Buffer.from(`${KEY}:${SECRET}`).toString("base64")}`;
  const m = u.pathname.match(/^\/wp-json\/wc\/v3\/(.+)$/);
  if (!m) return send(404, { error: "not found" });
  if (!ok) return send(401, { code: "woocommerce_rest_cannot_view" });
  const p = m[1];

  if (req.method === "GET" && p === "products") {
    let list = products.filter((x) => x.status === (u.searchParams.get("status") ?? x.status));
    const inc = u.searchParams.get("include");
    if (inc) list = list.filter((x) => inc.split(",").includes(String(x.id)));
    return send(200, list);
  }
  if (req.method === "GET" && p === "shipping/zones") return send(200, world.zones);
  if (req.method === "GET" && p === "payment_gateways") return world.gateways ? send(200, world.gateways) : send(403, { code: "woocommerce_rest_cannot_view" });
  let z = p.match(/^data\/continents\/([\w-]+)$/);
  if (req.method === "GET" && z) { const c = world.continents[z[1].toUpperCase()]; return c ? send(200, c) : send(404, { code: "woocommerce_rest_data_invalid_location" }); }
  z = p.match(/^shipping\/zones\/(\d+)\/locations$/);
  if (req.method === "GET" && z) return send(200, world.locations[z[1]] ?? []);
  z = p.match(/^shipping\/zones\/(\d+)\/methods$/);
  if (req.method === "GET" && z) return send(200, world.methods[z[1]] ?? []);
  z = p.match(/^orders\/(\d+)$/);
  if (req.method === "GET" && z) { const o = orders.find((x) => x.id === Number(z[1])); return o ? send(200, orderView(o)) : send(404, { code: "woocommerce_rest_shop_order_invalid_id" }); }
  if (req.method === "GET" && p === "orders") {
    if (world.ordersDown) return send(500, { code: "internal_error" });
    const status = u.searchParams.get("status");
    return send(200, orders.filter((o) => !status || status === "any" || o.status === status).slice(-Number(u.searchParams.get("per_page") ?? 10)).reverse().map(orderView));
  }
  if (req.method === "POST" && p === "orders") {
    const o = JSON.parse((await readBody(req)) || "{}");
    const id = 1000 + orders.length + 1;
    orders.push({ ...o, id, status: "pending", order_key: `wc_order_test${id}`, date_created_gmt: new Date().toISOString().slice(0, 19) });
    if (hangNextOrder) { hangNextOrder = false; return; } // the order exists, but the response never arrives (timeout on the other side)
    return send(201, orderView(orders.at(-1)));
  }
  return send(404, { error: "unknown" });
}).listen(PORT, () => console.log(`mock WooCommerce on ${HOST}`));
