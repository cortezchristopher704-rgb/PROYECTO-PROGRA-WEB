// ============================================
// POLIMARKET - Carrito de compras
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

// 2. Traer los productos del carrito del usuario, con su info de producto y variante
// (no hace falta filtrar por usuario_id a mano: RLS ya solo deja ver lo propio)
async function cargarCarrito() {
  const { data, error } = await supabaseClient
    .from("carrito")
    .select(`
      id,
      cantidad,
      productos ( id, nombre, precio, imagen_url, stock ),
      variantes_producto ( id, valor, stock )
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

    const varianteTexto = item.variantes_producto ? ` — ${item.variantes_producto.valor}` : "";

    const fila = document.createElement("div");
    fila.className = "fila-carrito";
    fila.innerHTML = `
      <img src="${item.productos.imagen_url}" alt="${item.productos.nombre}">
      <span>${item.productos.nombre}${varianteTexto}</span>
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

  const item = itemsDelCarrito.find((i) => i.id === carritoId);
  const stockDisponible = item.variantes_producto ? item.variantes_producto.stock : item.productos.stock;

  if (cantidad > stockDisponible) {
    alert(`Solo hay ${stockDisponible} disponibles de este producto.`);
    cargarCarrito(); // recargamos para regresar el input al valor real
    return;
  }

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

// 6. "Finalizar compra" ya no crea el pedido directo aquí:
// ahora manda a la página de pago, donde se piden los datos y el método.
function irAPagar() {
  if (itemsDelCarrito.length === 0) return;
  window.location.href = "pago.html";
}

document.addEventListener("DOMContentLoaded", async () => {
  const usuarioId = await verificarSesion();
  if (usuarioId) cargarCarrito();
});
