// ============================================
// POLIMARKET - Mis pedidos (cliente)
// ============================================

async function verificarSesionPedidos() {
  const { data } = await supabaseClient.auth.getSession();
  if (!data.session) {
    alert("Debes iniciar sesión para ver tus pedidos.");
    window.location.href = "login.html";
    return null;
  }
  return data.session.user.id;
}

// Traemos los pedidos del usuario, junto con el detalle de cada uno
// (RLS ya se encarga de que solo veas los tuyos)
async function cargarMisPedidos() {
  const { data, error } = await supabaseClient
    .from("pedidos")
    .select(`
      id, total, estado, creado_en, direccion_envio, metodo_pago,
      detalle_pedido ( cantidad, precio_unitario, variante_valor, productos ( nombre, imagen_url ) )
    `)
    .order("creado_en", { ascending: false });

  if (error) {
    console.error("Error al cargar pedidos:", error.message);
    return;
  }

  renderizarPedidos(data);
}

function renderizarPedidos(pedidos) {
  const contenedor = document.getElementById("contenedorPedidos");
  contenedor.innerHTML = "";

  if (pedidos.length === 0) {
    contenedor.innerHTML = "<p>Todavía no has hecho ningún pedido.</p>";
    return;
  }

  pedidos.forEach((pedido) => {
    const fecha = new Date(pedido.creado_en).toLocaleDateString("es-MX", {
      year: "numeric", month: "long", day: "numeric"
    });

    const filasProductos = pedido.detalle_pedido.map((linea) => `
      <div class="linea-pedido">
        <img src="${linea.productos.imagen_url}" alt="${linea.productos.nombre}">
        <span>${linea.productos.nombre}${linea.variante_valor ? " — " + linea.variante_valor : ""}</span>
        <span>x${linea.cantidad}</span>
        <span>$${linea.precio_unitario}</span>
      </div>
    `).join("");

    const metodoTexto = pedido.metodo_pago === "tarjeta" ? "💳 Tarjeta" : pedido.metodo_pago === "efectivo" ? "💵 Efectivo" : "";

    const tarjeta = document.createElement("div");
    tarjeta.className = "tarjeta-pedido";
    tarjeta.innerHTML = `
      <div class="encabezado-pedido">
        <strong>Pedido #${pedido.id}</strong>
        <span>${fecha}</span>
        <span class="estado estado-${pedido.estado}">${pedido.estado}</span>
      </div>
      ${filasProductos}
      ${pedido.direccion_envio ? `<p style="font-size:13px; color:var(--color-texto-suave, #777);">📍 ${pedido.direccion_envio} ${metodoTexto ? "— " + metodoTexto : ""}</p>` : ""}
      <p class="total-pedido">Total: $${pedido.total}</p>
    `;
    contenedor.appendChild(tarjeta);
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  const usuarioId = await verificarSesionPedidos();
  if (usuarioId) cargarMisPedidos();
});
