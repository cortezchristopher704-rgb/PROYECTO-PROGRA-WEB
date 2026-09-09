// ============================================
// POLIMARKET - Detalle de producto
// ============================================

let productoActualId = null;
let proveedorActualId = null;
let esAdminActual = false;
let variantesActuales = [];

// 0. Checar (sin redirigir a nadie) si quien ve la página es admin
async function verificarSiEsAdmin() {
  const { data: sesion } = await supabaseClient.auth.getSession();
  if (!sesion.session) return false;

  const { data: perfil } = await supabaseClient
    .from("perfiles")
    .select("roles(nombre)")
    .eq("id", sesion.session.user.id)
    .single();

  return perfil?.roles?.nombre === "admin";
}

// 1. Sacar el id del producto desde la URL (ej. producto-detalle.html?id=3)
function obtenerIdDeLaUrl() {
  const parametros = new URLSearchParams(window.location.search);
  return parametros.get("id");
}

// 2. Traer los datos del producto, con su proveedor y categorías
async function cargarProducto() {
  productoActualId = obtenerIdDeLaUrl();

  if (!productoActualId) {
    document.getElementById("contenidoProducto").innerHTML = "<p>Producto no especificado.</p>";
    return;
  }

  const { data, error } = await supabaseClient
    .from("productos")
    .select(`
      id, nombre, descripcion, precio, stock, imagen_url, proveedor_id, activo,
      proveedores ( nombre, contacto ),
      producto_categorias ( categorias ( nombre ) )
    `)
    .eq("id", productoActualId)
    .single();

  if (error || !data) {
    console.error("Error al cargar producto:", error?.message);
    document.getElementById("contenidoProducto").innerHTML = "<p>No se encontró el producto.</p>";
    return;
  }

  renderizarProducto(data);
  cargarVariantesDetalle();
}

async function cargarVariantesDetalle() {
  const { data, error } = await supabaseClient
    .from("variantes_producto")
    .select("id, valor, stock")
    .eq("producto_id", productoActualId);

  if (error || !data || data.length === 0) {
    variantesActuales = [];
    return;
  }

  variantesActuales = data;

  const opciones = data.map(v =>
    `<option value="${v.id}" ${v.stock === 0 ? "disabled" : ""}>${v.valor}${v.stock === 0 ? " (agotado)" : ""}</option>`
  ).join("");

  const contenedor = document.getElementById("contenidoProducto");
  const selectorHtml = `
    <label>Opción: <span style="color:red">*elige una</span>
      <select id="selectorVariante">
        <option value="" disabled selected>Selecciona una opción</option>
        ${opciones}
      </select>
    </label><br><br>
  `;
  // Lo insertamos justo antes de los botones de acción
  const divInfo = contenedor.querySelector("div");
  divInfo.insertAdjacentHTML("beforeend", selectorHtml);
}

let productoCompletoActual = null;

function renderizarProducto(producto) {
  productoCompletoActual = producto;
  proveedorActualId = producto.proveedor_id;

  const nombresCategorias = producto.producto_categorias
    .map((pc) => pc.categorias.nombre)
    .join(", ");

  const proveedorTexto = producto.proveedores
    ? `${producto.proveedores.nombre} (${producto.proveedores.contacto || "sin contacto"})`
    : "No especificado";

  const avisoInactivo = !producto.activo
    ? `<p style="background:var(--color-peligro); padding:8px 12px; border-radius:8px;">⚠️ Este producto no está disponible actualmente.</p>`
    : "";

  document.getElementById("contenidoProducto").innerHTML = `
    <img src="${producto.imagen_url}" alt="${producto.nombre}" id="imagenProducto">
    <div>
      <h1>${producto.nombre}</h1>
      <p>${producto.descripcion}</p>
      <p class="precio" id="precioMostrado">$${producto.precio}</p>
      <p>Stock disponible: <span id="stockMostrado">${producto.stock}</span></p>
      <p>Categorías: ${nombresCategorias}</p>
      <p>Proveedor: ${proveedorTexto}</p>
      ${avisoInactivo}
      <button onclick="agregarAlCarritoDesdeDetalle()" ${producto.activo ? "" : "disabled"}>Agregar al carrito</button>
      <button onclick="agregarAFavoritosDesdeDetalle()">❤ Favorito</button>
      <button onclick="mostrarFormularioContactoProveedor()">✉️ Contactar proveedor</button>

      <div id="formContactoProveedor" style="display:none; margin-top: 14px;">
        <textarea id="mensajeProveedor" placeholder="Escribe tu pregunta para el proveedor..." rows="3" style="width:100%; max-width:400px; padding:8px; box-sizing:border-box;"></textarea>
        <br>
        <button onclick="enviarMensajeProveedor()">Enviar mensaje</button>
      </div>
    </div>
  `;

  if (esAdminActual) {
    mostrarPanelEdicionRapida(producto);
  }
}

// Mostrar/ocultar el formulario de contacto al proveedor
function mostrarFormularioContactoProveedor() {
  const form = document.getElementById("formContactoProveedor");
  form.style.display = form.style.display === "none" ? "block" : "none";
}

async function enviarMensajeProveedor() {
  const { data: sesion } = await supabaseClient.auth.getSession();
  if (!sesion.session) {
    alert("Debes iniciar sesión para contactar a un proveedor.");
    window.location.href = "login.html";
    return;
  }

  const mensaje = document.getElementById("mensajeProveedor").value.trim();
  if (!mensaje) {
    alert("Escribe un mensaje antes de enviarlo.");
    return;
  }

  // Traemos nombre y correo del perfil, ya que mensajes_soporte los requiere
  const { data: perfil } = await supabaseClient
    .from("perfiles")
    .select("nombre, apellido_paterno")
    .eq("id", sesion.session.user.id)
    .single();

  const { error } = await supabaseClient
    .from("mensajes_soporte")
    .insert({
      usuario_id: sesion.session.user.id,
      nombre: perfil ? `${perfil.nombre} ${perfil.apellido_paterno || ""}`.trim() : "Usuario",
      correo: sesion.session.user.email,
      tipo: "proveedor",
      proveedor_id: proveedorActualId,
      producto_id: productoActualId,
      mensaje: mensaje
    });

  if (error) {
    alert("Error al enviar mensaje: " + error.message);
  } else {
    alert("¡Mensaje enviado! El equipo de PoliMarket lo hará llegar al proveedor.");
    document.getElementById("mensajeProveedor").value = "";
    document.getElementById("formContactoProveedor").style.display = "none";
  }
}

// Panel de edición rápida, solo visible para admin
function mostrarPanelEdicionRapida(producto) {
  const contenedor = document.getElementById("panelEdicionAdmin");
  contenedor.style.display = "block";
  contenedor.innerHTML = `
    <h3>✏️ Edición rápida (solo admin)</h3>
    <label>Precio: <input type="number" id="editarPrecio" value="${producto.precio}" step="0.01"></label>
    <label>Stock: <input type="number" id="editarStock" value="${producto.stock}"></label>
    <button onclick="guardarEdicionRapida()">Guardar cambios</button>
    <button class="secundario" onclick="alternarActivoProducto(${producto.activo})">
      ${producto.activo ? "🚫 Deshabilitar venta" : "✅ Reactivar producto"}
    </button>
  `;
}

async function alternarActivoProducto(estaActivo) {
  const nuevoEstado = !estaActivo;
  const confirmacion = nuevoEstado
    ? "¿Reactivar este producto para que vuelva a salir en el catálogo?"
    : "¿Deshabilitar temporalmente este producto? Dejará de salir en el catálogo hasta que lo reactives.";

  if (!confirm(confirmacion)) return;

  const { error } = await supabaseClient
    .from("productos")
    .update({ activo: nuevoEstado })
    .eq("id", productoActualId);

  if (error) {
    alert("Error al actualizar: " + error.message);
    return;
  }

  alert(nuevoEstado ? "¡Producto reactivado!" : "Producto deshabilitado.");
  cargarProducto(); // recargamos todo para reflejar el aviso y el botón actualizado
}

async function guardarEdicionRapida() {
  const nuevoPrecio = parseFloat(document.getElementById("editarPrecio").value);
  const nuevoStock = parseInt(document.getElementById("editarStock").value);

  if (isNaN(nuevoPrecio) || isNaN(nuevoStock)) {
    alert("Precio y stock deben ser números válidos.");
    return;
  }

  const { error } = await supabaseClient
    .from("productos")
    .update({ precio: nuevoPrecio, stock: nuevoStock })
    .eq("id", productoActualId);

  if (error) {
    alert("Error al actualizar: " + error.message);
    return;
  }

  alert("¡Producto actualizado!");
  // Reflejamos el cambio en pantalla sin recargar todo
  document.getElementById("precioMostrado").textContent = "$" + nuevoPrecio;
  document.getElementById("stockMostrado").textContent = nuevoStock;
}

// 3. Agregar al carrito / favoritos desde esta página
// (usa la misma lógica que ya teníamos en el catálogo)
async function agregarAlCarritoDesdeDetalle() {
  const { data: sesion } = await supabaseClient.auth.getSession();
  if (!sesion.session) {
    alert("Debes iniciar sesión para agregar al carrito.");
    window.location.href = "login.html";
    return;
  }

  let varianteId = null;

  if (variantesActuales.length > 0) {
    const selector = document.getElementById("selectorVariante");
    if (!selector.value) {
      alert("Selecciona una opción (color/talla) antes de agregar al carrito.");
      return;
    }
    varianteId = parseInt(selector.value);

    const variante = variantesActuales.find((v) => v.id === varianteId);
    if (variante.stock <= 0) {
      alert("Esa opción está agotada.");
      return;
    }
  } else if (productoCompletoActual.stock <= 0) {
    alert("Este producto está agotado.");
    return;
  }

  const { error } = await supabaseClient
    .from("carrito")
    .insert({
      usuario_id: sesion.session.user.id,
      producto_id: productoActualId,
      variante_id: varianteId,
      cantidad: 1
    });

  if (error) {
    alert("Error al agregar al carrito: " + error.message);
  } else {
    alert("¡Producto agregado al carrito!");
  }
}

async function agregarAFavoritosDesdeDetalle() {
  const { data: sesion } = await supabaseClient.auth.getSession();
  if (!sesion.session) {
    alert("Debes iniciar sesión para agregar a favoritos.");
    window.location.href = "login.html";
    return;
  }

  const { error } = await supabaseClient
    .from("favoritos")
    .insert({ usuario_id: sesion.session.user.id, producto_id: productoActualId });

  if (error) {
    if (error.code === "23505") {
      alert("Ese producto ya está en tus favoritos.");
    } else {
      alert("Error al agregar a favoritos: " + error.message);
    }
  } else {
    alert("¡Agregado a favoritos!");
  }
}

// ============================================
// RESEÑAS
// ============================================

// 4. Traer todas las reseñas de este producto, con el nombre de quien las escribió
async function cargarResenas() {
  const { data, error } = await supabaseClient
    .from("resenas")
    .select(`
      id, calificacion, comentario, creado_en,
      perfiles ( nombre, apellido_paterno )
    `)
    .eq("producto_id", productoActualId)
    .order("creado_en", { ascending: false });

  if (error) {
    console.error("Error al cargar reseñas:", error.message);
    return;
  }

  renderizarResenas(data);
  renderizarCalificacionPromedio(data);
}

function renderizarCalificacionPromedio(resenas) {
  const contenedor = document.getElementById("calificacionPromedio");

  if (resenas.length === 0) {
    contenedor.textContent = "Sin calificaciones todavía.";
    return;
  }

  const suma = resenas.reduce((total, r) => total + r.calificacion, 0);
  const promedio = (suma / resenas.length).toFixed(1);

  contenedor.textContent = `⭐ ${promedio} de 5 (${resenas.length} reseña${resenas.length === 1 ? "" : "s"})`;
}

function renderizarResenas(lista) {
  const contenedor = document.getElementById("listaResenas");
  contenedor.innerHTML = "";

  if (lista.length === 0) {
    contenedor.innerHTML = "<p>Todavía no hay reseñas para este producto. ¡Sé el primero!</p>";
    return;
  }

  lista.forEach((resena) => {
    const nombreAutor = resena.perfiles
      ? `${resena.perfiles.nombre} ${resena.perfiles.apellido_paterno || ""}`
      : "Usuario";

    const fila = document.createElement("div");
    fila.className = "resena";
    fila.innerHTML = `
      <p><strong>${nombreAutor}</strong> — ${"⭐".repeat(resena.calificacion)}</p>
      <p>${resena.comentario || ""}</p>
    `;
    contenedor.appendChild(fila);
  });
}

// 5. Enviar una reseña nueva
async function enviarResena() {
  const { data: sesion } = await supabaseClient.auth.getSession();
  if (!sesion.session) {
    alert("Debes iniciar sesión para dejar una reseña.");
    window.location.href = "login.html";
    return;
  }

  const calificacion = parseInt(document.getElementById("inputCalificacion").value);
  const comentario = document.getElementById("inputComentario").value.trim();

  const { error } = await supabaseClient
    .from("resenas")
    .insert({
      producto_id: productoActualId,
      usuario_id: sesion.session.user.id,
      calificacion: calificacion,
      comentario: comentario
    });

  if (error) {
    if (error.code === "23505") {
      alert("Ya dejaste una reseña para este producto antes.");
    } else {
      alert("Error al enviar reseña: " + error.message);
    }
  } else {
    alert("¡Gracias por tu reseña!");
    document.getElementById("inputComentario").value = "";
    cargarResenas();
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  esAdminActual = await verificarSiEsAdmin();
  cargarProducto();
  cargarResenas();
});
