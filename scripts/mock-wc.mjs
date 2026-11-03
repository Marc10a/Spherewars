// Fake WooCommerce (REST v3 subset) for local testing only. Usage: node scripts/mock-wc.mjs   (PORT=4030, MOCK_WC_KEY / MOCK_WC_SECRET)
// GET  /wp-json/wc/v3/products | shipping/zones | shipping/zones/:id/{locations,methods}   (Basic auth required)
// POST /wp-json/wc/v3/orders  -> stores the order, returns its payment_url      GET /_orders -> orders received (test helper)
import http from "node:http";

const PORT = Number(process.env.PORT ?? 4030);
const KEY = process.env.MOCK_WC_KEY ?? "ck_test", SECRET = process.env.MOCK_WC_SECRET ?? "cs_test";
const HOST = `http://localhost:${PORT}`;
const img = (n) => ({ id: n, src: `${HOST}/wp-content/uploads/${n}.jpg`, alt: "Foto de prueba" });

const products = [
  { id: 11, slug: "satanor", name: "Satanor, El Volcán", status: "publish", sku: "SW-UR-01", price: "15.00", regular_price: "15.00", sale_price: "", stock_status: "instock", manage_stock: true, stock_quantity: 5,
    images: [img(1), img(2)], categories: [{ slug: "manadas-de-urueh" }], meta_data: [{ key: "sw_wiki_slug", value: "personajes/mandas-de-urueh/satanor" }] },
  { id: 12, slug: "leviatan", name: "Leviatán", status: "publish", sku: "SW-VA-01", price: "18.50", regular_price: "18.50", sale_price: "", stock_status: "instock", manage_stock: false, stock_quantity: null,
    images: [img(3)], categories: [{ slug: "vastagos-de-kurgan" }], meta_data: [] },
  { id: 13, slug: "agotada", name: "Miniatura agotada", status: "publish", sku: "", price: "9.00", regular_price: "9.00", sale_price: "", stock_status: "outofstock", manage_stock: false, stock_quantity: null,
    images: [], categories: [{ slug: "alianza" }], meta_data: [] },
  { id: 14, slug: "sin-precio", name: "Sin precio", status: "publish", sku: "", price: "", regular_price: "", sale_price: "", stock_status: "instock", manage_stock: false, stock_quantity: null,
    images: [], categories: [], meta_data: [] },
];
const zones = [{ id: 0, name: "Resto del mundo" }, { id: 1, name: "España" }, { id: 2, name: "Europa (fórmula)" }];
const locations = { 1: [{ code: "ES", type: "country" }], 2: [{ code: "FR", type: "country" }] };
const methods = {
  1: [
    { instance_id: 7, title: "Envío estándar", enabled: true, method_id: "flat_rate", settings: { cost: { value: "5.00" } } },
    { instance_id: 8, title: "Envío gratis", enabled: true, method_id: "free_shipping", settings: { requires: { value: "min_amount" }, min_amount: { value: "50" } } },
  ],
  2: [{ instance_id: 9, title: "Tarifa con fórmula", enabled: true, method_id: "flat_rate", settings: { cost: { value: "5 + [qty]" } } }],
};
const orders = [];

http.createServer((req, res) => {
  const u = new URL(req.url, HOST);
  const send = (code, body) => { res.writeHead(code, { "Content-Type": "application/json" }); res.end(JSON.stringify(body)); };
  console.log(new Date().toISOString(), req.method, u.pathname + u.search);
  if (u.pathname === "/_orders") return send(200, orders);
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
  if (req.method === "GET" && p === "shipping/zones") return send(200, zones);
  let z = p.match(/^shipping\/zones\/(\d+)\/locations$/);
  if (req.method === "GET" && z) return send(200, locations[z[1]] ?? []);
  z = p.match(/^shipping\/zones\/(\d+)\/methods$/);
  if (req.method === "GET" && z) return send(200, methods[z[1]] ?? []);
  if (req.method === "POST" && p === "orders") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const o = JSON.parse(body || "{}");
      const id = 1000 + orders.length + 1;
      orders.push({ id, ...o });
      send(201, { id, status: "pending", payment_url: `${HOST}/checkout/order-pay/${id}/?pay_for_order=true&key=wc_order_test` });
    });
    return;
  }
  return send(404, { error: "unknown" });
}).listen(PORT, () => console.log(`mock WooCommerce on ${HOST}`));
