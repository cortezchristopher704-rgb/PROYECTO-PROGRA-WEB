// ============================================
// MARKETPLACE - Carrito de compras
// ============================================

let itemsDelCarrito = [];

// 1. Verificar que haya sesión iniciada, si no, mandar a login
async function verificarSesion() {
  const { data } = await supabaseClient.auth.getSession();
  if (!data.session) {
    alert("Debes iniciar sesión para ver tu carrito.");
    window.location.href = "login.html";
    return null;
  }
  return data.session.user.id;
}

// 2. Traer los productos del carrito del usuario, con su info de producto
// (no hace falta filtrar por usuario_id a mano: RLS ya solo deja ver lo propio)
async function cargarCarrito() {
  const { data, error } = await supabaseClient
    .from("carrito")
    .select(`
      id,
      cantidad,
      productos ( id, nombre, precio, imagen_url )
    `);

  if (error) {
    console.error("Error al cargar el carrito:", error.message);
    return;
  }

  itemsDelCarrito = data;
  renderizarCarrito();
}

// 3. Dibujar la lista del carrito y el total
function renderizarCarrito() {
  const contenedor = document.getElementById("contenedorCarrito");
  contenedor.innerHTML = "";

  if (itemsDelCarrito.length === 0) {
    contenedor.innerHTML = "<p>Tu carrito está vacío.</p>";
    document.getElementById("totalCarrito").textContent = "";
    document.getElementById("btnFinalizar").style.display = "none";
    return;
  }

  let total = 0;

  itemsDelCarrito.forEach((item) => {
    const subtotal = item.productos.precio * item.cantidad;
    total += subtotal;

    const fila = document.createElement("div");
    fila.className = "fila-carrito";
    fila.innerHTML = `
      <img src="${item.productos.imagen_url}" alt="${item.productos.nombre}">
      <span>${item.productos.nombre}</span>
      <span>$${item.productos.precio}</span>
      <input type="number" min="1" value="${item.cantidad}"
        onchange="actualizarCantidad(${item.id}, this.value)">
      <span>Subtotal: $${subtotal.toFixed(2)}</span>
      <button onclick="eliminarDelCarrito(${item.id})">Eliminar</button>
    `;
    contenedor.appendChild(fila);
  });

  document.getElementById("totalCarrito").textContent = `Total: $${total.toFixed(2)}`;
  document.getElementById("btnFinalizar").style.display = "inline-block";
}

// 4. Cambiar la cantidad de un producto en el carrito
async function actualizarCantidad(carritoId, nuevaCantidad) {
  const cantidad = parseInt(nuevaCantidad);
  if (cantidad < 1) return;

  const { error } = await supabaseClient
    .from("carrito")
    .update({ cantidad: cantidad })
    .eq("id", carritoId);

  if (error) {
    alert("Error al actualizar cantidad: " + error.message);
  } else {
    cargarCarrito(); // recargamos para reflejar el nuevo total
  }
}

// 5. Quitar un producto del carrito
async function eliminarDelCarrito(carritoId) {
  const { error } = await supabaseClient
    .from("carrito")
    .delete()
    .eq("id", carritoId);

  if (error) {
    alert("Error al eliminar: " + error.message);
  } else {
    cargarCarrito();
  }
}

// 6. Finalizar compra: crear el pedido y su detalle, luego vaciar el carrito
async function finalizarCompra() {
  const usuarioId = await verificarSesion();
  if (!usuarioId) return;

  if (itemsDelCarrito.length === 0) return;

  const total = itemsDelCarrito.reduce(
    (suma, item) => suma + item.productos.precio * item.cantidad,
    0
  );

  // Paso A: crear el "recibo" general (pedido)
  const { data: pedido, error: errorPedido } = await supabaseClient
    .from("pedidos")
    .insert({ usuario_id: usuarioId, total: total, estado: "pendiente" })
    .select()
    .single();

  if (errorPedido) {
    alert("Error al crear el pedido: " + errorPedido.message);
    return;
  }

  // Paso B: crear una línea de detalle por cada producto del carrito
  const detalles = itemsDelCarrito.map((item) => ({
    pedido_id: pedido.id,
    producto_id: item.productos.id,
    cantidad: item.cantidad,
    precio_unitario: item.productos.precio
  }));

  const { error: errorDetalle } = await supabaseClient
    .from("detalle_pedido")
    .insert(detalles);

  if (errorDetalle) {
    alert("Error al guardar el detalle del pedido: " + errorDetalle.message);
    return;
  }

  // Paso C: vaciar el carrito, ya que se convirtió en un pedido
  const idsCarrito = itemsDelCarrito.map((item) => item.id);
  await supabaseClient.from("carrito").delete().in("id", idsCarrito);

  alert("¡Compra realizada con éxito! Pedido #" + pedido.id);
  cargarCarrito();

  if (confirm("¿Quieres ver tu pedido en 'Mis pedidos' ahora?")) {
    window.location.href = "mis-pedidos.html";
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const usuarioId = await verificarSesion();
  if (usuarioId) cargarCarrito();
});
