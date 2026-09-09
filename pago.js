// ============================================
// POLIMARKET - Pago (simulado)
// ============================================

let itemsParaPagar = [];
let usuarioIdActual = null;

async function iniciarPago() {
  const { data: sesion } = await supabaseClient.auth.getSession();
  if (!sesion.session) {
    alert("Debes iniciar sesión.");
    window.location.href = "login.html";
    return;
  }
  usuarioIdActual = sesion.session.user.id;

  // Precargamos nombre, para no pedirlo completamente desde cero
  const { data: perfil } = await supabaseClient
    .from("perfiles")
    .select("nombre, apellido_paterno")
    .eq("id", usuarioIdActual)
    .single();

  if (perfil) {
    document.getElementById("pagoNombre").value = `${perfil.nombre} ${perfil.apellido_paterno || ""}`.trim();
  }

  await cargarResumenCarrito();
}

async function cargarResumenCarrito() {
  const { data, error } = await supabaseClient
    .from("carrito")
    .select(`
      id, cantidad,
      productos ( id, nombre, precio, stock ),
      variantes_producto ( id, valor, stock )
    `);

  if (error) {
    console.error("Error al cargar el carrito para pago:", error.message);
    return;
  }

  if (data.length === 0) {
    document.getElementById("resumenCompra").innerHTML = "<p>Tu carrito está vacío.</p>";
    document.getElementById("formPago").style.display = "none";
    return;
  }

  itemsParaPagar = data;
  renderizarResumen();
}

function renderizarResumen() {
  const contenedor = document.getElementById("resumenCompra");
  let total = 0;

  const filas = itemsParaPagar.map((item) => {
    const subtotal = item.productos.precio * item.cantidad;
    total += subtotal;
    const varianteTexto = item.variantes_producto ? ` — ${item.variantes_producto.valor}` : "";
    return `<p>${item.productos.nombre}${varianteTexto} x${item.cantidad} — $${subtotal.toFixed(2)}</p>`;
  }).join("");

  contenedor.innerHTML = `${filas}<p class="precio">Total: $${total.toFixed(2)}</p>`;
}

// Mostrar/ocultar los campos de tarjeta según el método elegido
function actualizarMetodoPago() {
  const metodo = document.querySelector('input[name="metodoPago"]:checked').value;
  document.getElementById("camposTarjeta").style.display = metodo === "tarjeta" ? "block" : "none";
}

async function confirmarPago() {
  const nombre = document.getElementById("pagoNombre").value.trim();
  const direccion = document.getElementById("pagoDireccion").value.trim();
  const metodo = document.querySelector('input[name="metodoPago"]:checked')?.value;

  if (!nombre || !direccion || !metodo) {
    alert("Completa tus datos y elige un método de pago.");
    return;
  }

  if (metodo === "tarjeta") {
    const numero = document.getElementById("tarjetaNumero").value.trim();
    const vencimiento = document.getElementById("tarjetaVencimiento").value.trim();
    const cvv = document.getElementById("tarjetaCvv").value.trim();
    if (!numero || !vencimiento || !cvv) {
      alert("Completa los datos de la tarjeta (esto es solo una simulación, no se guarda ni se procesa realmente).");
      return;
    }
  }

  const total = itemsParaPagar.reduce(
    (suma, item) => suma + item.productos.precio * item.cantidad,
    0
  );

  // Paso 0: volvemos a checar el stock justo ahora, por si cambió desde
  // que agregaste al carrito (alguien más pudo haber comprado lo último)
  const revalidacion = await revalidarStockAntesDePagar();
  if (!revalidacion.ok) {
    alert("Ya no hay suficiente stock de: " + revalidacion.nombre + ". Ajusta tu carrito e intenta de nuevo.");
    window.location.href = "carrito.html";
    return;
  }

  // Paso A: crear el pedido, con la dirección y el método (nunca datos de tarjeta)
  const { data: pedido, error: errorPedido } = await supabaseClient
    .from("pedidos")
    .insert({
      usuario_id: usuarioIdActual,
      total: total,
      estado: "pendiente",
      direccion_envio: direccion,
      metodo_pago: metodo
    })
    .select()
    .single();

  if (errorPedido) {
    alert("Error al crear el pedido: " + errorPedido.message);
    return;
  }

  // Paso B: el detalle, guardando también el "nombre" de la variante como foto histórica
  const detalles = itemsParaPagar.map((item) => ({
    pedido_id: pedido.id,
    producto_id: item.productos.id,
    cantidad: item.cantidad,
    precio_unitario: item.productos.precio,
    variante_valor: item.variantes_producto ? item.variantes_producto.valor : null
  }));

  const { error: errorDetalle } = await supabaseClient
    .from("detalle_pedido")
    .insert(detalles);

  if (errorDetalle) {
    alert("Error al guardar el detalle del pedido: " + errorDetalle.message);
    return;
  }

  // Paso B.5: ahora sí, descontamos el stock de verdad, uno por producto/variante
  for (const item of itemsParaPagar) {
    await supabaseClient.rpc("descontar_stock", {
      p_producto_id: item.productos.id,
      p_variante_id: item.variantes_producto ? item.variantes_producto.id : null,
      p_cantidad: item.cantidad
    });
  }

  // Paso C: vaciar el carrito
  const idsCarrito = itemsParaPagar.map((item) => item.id);
  await supabaseClient.from("carrito").delete().in("id", idsCarrito);

  mostrarPantallaExito(pedido.id);
}

function mostrarPantallaExito(pedidoId) {
  document.getElementById("formPago").style.display = "none";
  document.getElementById("resumenCompra").style.display = "none";
  document.getElementById("pantallaExito").style.display = "block";
  document.getElementById("numeroPedidoExito").textContent = pedidoId;
}

// Vuelve a checar en la base de datos (fresco, no lo que ya teníamos cargado)
// si todavía hay suficiente stock de cada cosa en el carrito, justo antes de pagar
async function revalidarStockAntesDePagar() {
  for (const item of itemsParaPagar) {
    if (item.variantes_producto) {
      const { data } = await supabaseClient
        .from("variantes_producto")
        .select("stock")
        .eq("id", item.variantes_producto.id)
        .single();

      if (!data || data.stock < item.cantidad) {
        return { ok: false, nombre: `${item.productos.nombre} (${item.variantes_producto.valor})` };
      }
    } else {
      const { data } = await supabaseClient
        .from("productos")
        .select("stock")
        .eq("id", item.productos.id)
        .single();

      if (!data || data.stock < item.cantidad) {
        return { ok: false, nombre: item.productos.nombre };
      }
    }
  }

  return { ok: true };
}

document.addEventListener("DOMContentLoaded", iniciarPago);
