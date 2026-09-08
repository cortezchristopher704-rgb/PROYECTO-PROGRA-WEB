// ============================================
// MERCADITO - Panel de administrador
// ============================================

// 0. Cambiar de sección en el sidebar
function mostrarSeccion(idSeccion, botonClickeado) {
  document.querySelectorAll(".panel-seccion").forEach((seccion) => {
    seccion.classList.remove("visible");
  });
  document.getElementById(idSeccion).classList.add("visible");

  document.querySelectorAll(".item-sidebar").forEach((boton) => {
    boton.classList.remove("activo");
  });
  botonClickeado.classList.add("activo");
}

let categoriasDisponibles = [];
let proveedoresDisponibles = [];
let productoEnEdicion = null; // null = estamos creando uno nuevo

// 1. Verificar que quien entra sea admin; si no, lo sacamos
async function verificarEsAdmin() {
  const { data: sesion } = await supabaseClient.auth.getSession();

  if (!sesion.session) {
    alert("Debes iniciar sesión.");
    window.location.href = "login.html";
    return false;
  }

  const usuarioId = sesion.session.user.id;

  const { data: perfil, error } = await supabaseClient
    .from("perfiles")
    .select("rol_id, roles(nombre)")
    .eq("id", usuarioId)
    .single();

  if (error || !perfil || perfil.roles?.nombre !== "admin") {
    console.error("Chequeo de admin falló. error:", error, "perfil:", perfil);
    alert("No tienes permiso para entrar aquí.");
    window.location.href = "index.html";
    return false;
  }

  return true;
}

// ============================================
// CATEGORÍAS
// ============================================

async function cargarCategoriasAdmin() {
  const { data, error } = await supabaseClient
    .from("categorias")
    .select("id, nombre")
    .order("nombre");

  if (error) {
    console.error("Error al cargar categorías:", error.message);
    return;
  }

  categoriasDisponibles = data;
  renderizarListaCategorias();
  renderizarCheckboxesCategorias();
}

function renderizarListaCategorias() {
  const contenedor = document.getElementById("listaCategoriasAdmin");
  contenedor.innerHTML = "";

  categoriasDisponibles.forEach((categoria) => {
    const fila = document.createElement("div");
    fila.className = "fila-categoria";
    fila.innerHTML = `
      <span>${categoria.nombre}</span>
      <button onclick="eliminarCategoria(${categoria.id})">Borrar</button>
    `;
    contenedor.appendChild(fila);
  });
}

// Estos checkboxes son los que se usan en el formulario de producto,
// para elegir a cuáles categorías pertenece
function renderizarCheckboxesCategorias(idsSeleccionados = []) {
  const contenedor = document.getElementById("checkboxesCategorias");
  contenedor.innerHTML = "";

  categoriasDisponibles.forEach((categoria) => {
    const marcado = idsSeleccionados.includes(categoria.id) ? "checked" : "";
    const etiqueta = document.createElement("label");
    etiqueta.innerHTML = `
      <input type="checkbox" value="${categoria.id}" ${marcado}> ${categoria.nombre}
    `;
    contenedor.appendChild(etiqueta);
  });
}

async function agregarCategoria() {
  const nombre = document.getElementById("nuevaCategoria").value.trim();
  if (!nombre) return;

  const { error } = await supabaseClient.from("categorias").insert({ nombre });

  if (error) {
    alert("Error al agregar categoría: " + error.message);
  } else {
    document.getElementById("nuevaCategoria").value = "";
    cargarCategoriasAdmin();
  }
}

async function eliminarCategoria(id) {
  if (!confirm("¿Seguro que quieres borrar esta categoría?")) return;

  const { error } = await supabaseClient.from("categorias").delete().eq("id", id);

  if (error) {
    alert("Error al borrar categoría: " + error.message);
  } else {
    cargarCategoriasAdmin();
  }
}

// ============================================
// PROVEEDORES
// ============================================

async function cargarProveedoresAdmin() {
  const { data, error } = await supabaseClient
    .from("proveedores")
    .select("id, nombre, contacto")
    .order("nombre");

  if (error) {
    console.error("Error al cargar proveedores:", error.message);
    return;
  }

  proveedoresDisponibles = data;
  renderizarListaProveedores();
  renderizarSelectProveedor();
}

function renderizarListaProveedores() {
  const contenedor = document.getElementById("listaProveedoresAdmin");
  contenedor.innerHTML = "";

  proveedoresDisponibles.forEach((proveedor) => {
    const fila = document.createElement("div");
    fila.className = "fila-categoria";
    fila.innerHTML = `
      <span>${proveedor.nombre} (${proveedor.contacto || "sin contacto"})</span>
      <button onclick="eliminarProveedor(${proveedor.id})">Borrar</button>
    `;
    contenedor.appendChild(fila);
  });
}

function renderizarSelectProveedor(idSeleccionado = null) {
  const select = document.getElementById("productoProveedor");
  select.innerHTML = `<option value="" disabled ${idSeleccionado ? "" : "selected"}>Selecciona un proveedor</option>`;

  proveedoresDisponibles.forEach((proveedor) => {
    const opcion = document.createElement("option");
    opcion.value = proveedor.id;
    opcion.textContent = proveedor.nombre;
    if (idSeleccionado === proveedor.id) opcion.selected = true;
    select.appendChild(opcion);
  });
}

async function agregarProveedor() {
  const nombre = document.getElementById("nuevoProveedorNombre").value.trim();
  const contacto = document.getElementById("nuevoProveedorContacto").value.trim();
  if (!nombre) return;

  const { error } = await supabaseClient.from("proveedores").insert({ nombre, contacto });

  if (error) {
    alert("Error al agregar proveedor: " + error.message);
  } else {
    document.getElementById("nuevoProveedorNombre").value = "";
    document.getElementById("nuevoProveedorContacto").value = "";
    cargarProveedoresAdmin();
  }
}

async function eliminarProveedor(id) {
  if (!confirm("¿Seguro que quieres borrar este proveedor?")) return;

  const { error } = await supabaseClient.from("proveedores").delete().eq("id", id);

  if (error) {
    alert("No se pudo borrar: " + error.message);
  } else {
    cargarProveedoresAdmin();
  }
}

// ============================================
// PRODUCTOS
// ============================================

async function cargarProductosAdmin() {
  const { data, error } = await supabaseClient
    .from("productos")
    .select(`
      id, nombre, descripcion, precio, stock, imagen_url, proveedor_id, activo,
      producto_categorias ( categoria_id, categorias ( nombre ) )
    `)
    .order("id");

  if (error) {
    console.error("Error al cargar productos:", error.message);
    return;
  }

  renderizarTablaProductos(data);
}

function renderizarTablaProductos(lista) {
  const cuerpo = document.getElementById("cuerpoTablaProductos");
  cuerpo.innerHTML = "";

  lista.forEach((producto) => {
    const nombresCategorias = producto.producto_categorias
      .map((pc) => pc.categorias.nombre)
      .join(", ");

    const fila = document.createElement("tr");
    fila.innerHTML = `
      <td>${producto.nombre}</td>
      <td>$${producto.precio}</td>
      <td>${producto.stock}</td>
      <td>${nombresCategorias}</td>
      <td>${producto.activo ? "✅ Activo" : "🚫 Deshabilitado"}</td>
      <td>
        <button onclick='cargarProductoParaEditar(${JSON.stringify(producto)})'>Editar</button>
        <button class="secundario" onclick="alternarActivoProductoAdmin(${producto.id}, ${producto.activo})">
          ${producto.activo ? "Deshabilitar" : "Reactivar"}
        </button>
        <button onclick="eliminarProducto(${producto.id})">Borrar</button>
      </td>
    `;
    cuerpo.appendChild(fila);
  });
}

async function alternarActivoProductoAdmin(id, estaActivo) {
  const { error } = await supabaseClient
    .from("productos")
    .update({ activo: !estaActivo })
    .eq("id", id);

  if (error) {
    alert("Error al actualizar: " + error.message);
  } else {
    cargarProductosAdmin();
  }
}

function cargarProductoParaEditar(producto) {
  productoEnEdicion = producto.id;

  document.getElementById("formTitulo").textContent = "Editar producto";
  document.getElementById("productoNombre").value = producto.nombre;
  document.getElementById("productoDescripcion").value = producto.descripcion || "";
  document.getElementById("productoPrecio").value = producto.precio;
  document.getElementById("productoStock").value = producto.stock;
  document.getElementById("productoImagen").value = producto.imagen_url || "";
  renderizarSelectProveedor(producto.proveedor_id);

  const idsCategorias = producto.producto_categorias.map((pc) => pc.categoria_id);
  renderizarCheckboxesCategorias(idsCategorias);

  document.getElementById("btnGuardarProducto").textContent = "Guardar cambios";
  window.scrollTo(0, document.getElementById("formularioProducto").offsetTop);

  // Las variantes solo tienen sentido cuando el producto ya existe
  document.getElementById("seccionVariantes").style.display = "block";
  cargarVariantesDelProducto(producto.id);
}

function limpiarFormularioProducto() {
  productoEnEdicion = null;
  document.getElementById("formTitulo").textContent = "Agregar producto nuevo";
  document.getElementById("productoNombre").value = "";
  document.getElementById("productoDescripcion").value = "";
  document.getElementById("productoPrecio").value = "";
  document.getElementById("productoStock").value = "";
  document.getElementById("productoImagen").value = "";
  renderizarSelectProveedor(null);
  renderizarCheckboxesCategorias([]);
  document.getElementById("btnGuardarProducto").textContent = "Agregar producto";
  document.getElementById("seccionVariantes").style.display = "none";
}

// ============================================
// VARIANTES DE PRODUCTO
// ============================================

async function cargarVariantesDelProducto(productoId) {
  const { data, error } = await supabaseClient
    .from("variantes_producto")
    .select("id, valor, stock")
    .eq("producto_id", productoId)
    .order("id");

  if (error) {
    console.error("Error al cargar variantes:", error.message);
    return;
  }

  const contenedor = document.getElementById("listaVariantes");
  contenedor.innerHTML = "";

  if (data.length === 0) {
    contenedor.innerHTML = "<p>Este producto todavía no tiene variantes.</p>";
    return;
  }

  data.forEach((variante) => {
    const fila = document.createElement("div");
    fila.className = "fila-categoria";
    fila.innerHTML = `
      <span>${variante.valor} — stock: ${variante.stock}</span>
      <button onclick="eliminarVariante(${variante.id})">Borrar</button>
    `;
    contenedor.appendChild(fila);
  });
}

async function agregarVariante() {
  if (!productoEnEdicion) {
    alert("Primero guarda el producto antes de agregarle variantes.");
    return;
  }

  const valor = document.getElementById("nuevaVarianteValor").value.trim();
  const stock = parseInt(document.getElementById("nuevaVarianteStock").value);

  if (!valor || isNaN(stock)) {
    alert("Escribe el valor de la variante (ej. 'Rojo') y su stock.");
    return;
  }

  const { error } = await supabaseClient
    .from("variantes_producto")
    .insert({ producto_id: productoEnEdicion, nombre: "Color", valor, stock });

  if (error) {
    alert("Error al agregar variante: " + error.message);
  } else {
    document.getElementById("nuevaVarianteValor").value = "";
    document.getElementById("nuevaVarianteStock").value = "";
    cargarVariantesDelProducto(productoEnEdicion);
  }
}

async function eliminarVariante(id) {
  const { error } = await supabaseClient
    .from("variantes_producto")
    .delete()
    .eq("id", id);

  if (error) {
    alert("Error al borrar variante: " + error.message);
  } else {
    cargarVariantesDelProducto(productoEnEdicion);
  }
}

async function guardarProducto() {
  const nombre = document.getElementById("productoNombre").value.trim();
  const descripcion = document.getElementById("productoDescripcion").value.trim();
  const precio = parseFloat(document.getElementById("productoPrecio").value);
  const stock = parseInt(document.getElementById("productoStock").value);
  const imagenUrl = document.getElementById("productoImagen").value.trim();
  const proveedorSeleccionado = document.getElementById("productoProveedor").value;

  if (!nombre || isNaN(precio) || isNaN(stock) || !proveedorSeleccionado) {
    alert("Nombre, precio, stock y proveedor son obligatorios.");
    return;
  }

  const idsCategoriasSeleccionadas = Array.from(
    document.querySelectorAll("#checkboxesCategorias input:checked")
  ).map((casilla) => parseInt(casilla.value));

  const datosProducto = {
    nombre,
    descripcion,
    precio,
    stock,
    imagen_url: imagenUrl,
    proveedor_id: proveedorSeleccionado ? parseInt(proveedorSeleccionado) : null
  };

  let productoId;

  if (productoEnEdicion) {
    // Actualizar producto existente
    const { error } = await supabaseClient
      .from("productos")
      .update(datosProducto)
      .eq("id", productoEnEdicion);

    if (error) {
      alert("Error al actualizar: " + error.message);
      return;
    }
    productoId = productoEnEdicion;

    // Borramos sus categorías anteriores para reemplazarlas por las nuevas
    await supabaseClient.from("producto_categorias").delete().eq("producto_id", productoId);
  } else {
    // Crear producto nuevo
    const { data, error } = await supabaseClient
      .from("productos")
      .insert(datosProducto)
      .select()
      .single();

    if (error) {
      alert("Error al crear producto: " + error.message);
      return;
    }
    productoId = data.id;
  }

  // Insertamos las categorías seleccionadas (nuevas o actualizadas)
  if (idsCategoriasSeleccionadas.length > 0) {
    const filasCategorias = idsCategoriasSeleccionadas.map((categoriaId) => ({
      producto_id: productoId,
      categoria_id: categoriaId
    }));
    await supabaseClient.from("producto_categorias").insert(filasCategorias);
  }

  alert("¡Producto guardado con éxito! Ahora puedes agregarle variantes si quiere.");
  productoEnEdicion = productoId;
  document.getElementById("formTitulo").textContent = "Editar producto";
  document.getElementById("btnGuardarProducto").textContent = "Guardar cambios";
  document.getElementById("seccionVariantes").style.display = "block";
  cargarVariantesDelProducto(productoId);
  cargarProductosAdmin();
}

async function eliminarProducto(id) {
  if (!confirm("¿Seguro que quieres borrar este producto?")) return;

  const { error } = await supabaseClient.from("productos").delete().eq("id", id);

  if (error) {
    // Esto pasará si el producto ya tiene pedidos asociados (a propósito, ver nota en el SQL)
    alert("No se pudo borrar: " + error.message + "\n\n(Es probable que este producto ya tenga pedidos asociados.)");
  } else {
    cargarProductosAdmin();
  }
}

// ============================================
// PEDIDOS (vista admin)
// ============================================

async function cargarPedidosAdmin() {
  const { data, error } = await supabaseClient
    .from("pedidos")
    .select(`
      id, total, estado, creado_en,
      perfiles ( nombre, apellido_paterno ),
      detalle_pedido ( cantidad, precio_unitario, productos ( nombre ) )
    `)
    .order("creado_en", { ascending: false });

  if (error) {
    console.error("Error al cargar pedidos (admin):", error.message);
    return;
  }

  renderizarPedidosAdmin(data);
}

function renderizarPedidosAdmin(pedidos) {
  const contenedor = document.getElementById("listaPedidosAdmin");
  contenedor.innerHTML = "";

  if (pedidos.length === 0) {
    contenedor.innerHTML = "<p>Todavía no hay pedidos.</p>";
    return;
  }

  const opcionesEstado = ["pendiente", "enviado", "entregado", "cancelado"];

  pedidos.forEach((pedido) => {
    const nombreCliente = pedido.perfiles
      ? `${pedido.perfiles.nombre} ${pedido.perfiles.apellido_paterno || ""}`
      : "Cliente";

    const fecha = new Date(pedido.creado_en).toLocaleDateString("es-MX", {
      year: "numeric", month: "long", day: "numeric"
    });

    const listaProductos = pedido.detalle_pedido
      .map((l) => `${l.productos.nombre} x${l.cantidad}`)
      .join(", ");

    const opcionesSelect = opcionesEstado
      .map((op) => `<option value="${op}" ${op === pedido.estado ? "selected" : ""}>${op}</option>`)
      .join("");

    const tarjeta = document.createElement("div");
    tarjeta.className = "tarjeta-pedido-admin";
    tarjeta.innerHTML = `
      <p><strong>Pedido #${pedido.id}</strong> — ${nombreCliente} — ${fecha}</p>
      <p>Productos: ${listaProductos}</p>
      <p>Total: $${pedido.total}</p>
      <label>Estado:
        <select onchange="actualizarEstadoPedido(${pedido.id}, this.value)">
          ${opcionesSelect}
        </select>
      </label>
    `;
    contenedor.appendChild(tarjeta);
  });
}

async function actualizarEstadoPedido(pedidoId, nuevoEstado) {
  const { error } = await supabaseClient
    .from("pedidos")
    .update({ estado: nuevoEstado })
    .eq("id", pedidoId);

  if (error) {
    alert("Error al actualizar estado: " + error.message);
  }
  // No hace falta recargar toda la lista; el <select> ya refleja el cambio.
}

// ============================================
// MENSAJES (vista admin)
// ============================================

async function cargarMensajesAdmin() {
  const { data: soporte, error: errorSoporte } = await supabaseClient
    .from("mensajes_soporte")
    .select("id, nombre, correo, mensaje, atendido, creado_en")
    .order("creado_en", { ascending: false });

  if (errorSoporte) console.error("Error al cargar mensajes de soporte:", errorSoporte.message);
  renderizarMensajesSoporte(soporte || []);

  const { data: proveedor, error: errorProveedor } = await supabaseClient
    .from("mensajes_proveedor")
    .select(`
      id, mensaje, atendido, creado_en,
      proveedores ( nombre ),
      productos ( nombre ),
      perfiles ( nombre, apellido_paterno )
    `)
    .order("creado_en", { ascending: false });

  if (errorProveedor) console.error("Error al cargar mensajes a proveedores:", errorProveedor.message);
  renderizarMensajesProveedor(proveedor || []);
}

function renderizarMensajesSoporte(lista) {
  const contenedor = document.getElementById("listaMensajesSoporte");
  contenedor.innerHTML = lista.length === 0 ? "<p>No hay mensajes de soporte.</p>" : "";

  lista.forEach((m) => {
    const fila = document.createElement("div");
    fila.className = "tarjeta-pedido-admin";
    fila.innerHTML = `
      <p><strong>${m.nombre}</strong> (${m.correo})</p>
      <p>${m.mensaje}</p>
      <label>
        <input type="checkbox" ${m.atendido ? "checked" : ""}
          onchange="marcarAtendido('mensajes_soporte', ${m.id}, this.checked)">
        Atendido
      </label>
    `;
    contenedor.appendChild(fila);
  });
}

function renderizarMensajesProveedor(lista) {
  const contenedor = document.getElementById("listaMensajesProveedor");
  contenedor.innerHTML = lista.length === 0 ? "<p>No hay mensajes para proveedores.</p>" : "";

  lista.forEach((m) => {
    const nombreCliente = m.perfiles ? `${m.perfiles.nombre} ${m.perfiles.apellido_paterno || ""}` : "Cliente";

    const fila = document.createElement("div");
    fila.className = "tarjeta-pedido-admin";
    fila.innerHTML = `
      <p><strong>Para:</strong> ${m.proveedores?.nombre || "Proveedor"} — <strong>Producto:</strong> ${m.productos?.nombre || "N/A"}</p>
      <p><strong>De:</strong> ${nombreCliente}</p>
      <p>${m.mensaje}</p>
      <label>
        <input type="checkbox" ${m.atendido ? "checked" : ""}
          onchange="marcarAtendido('mensajes_proveedor', ${m.id}, this.checked)">
        Atendido
      </label>
    `;
    contenedor.appendChild(fila);
  });
}

async function marcarAtendido(tabla, id, valor) {
  const { error } = await supabaseClient.from(tabla).update({ atendido: valor }).eq("id", id);
  if (error) alert("Error al actualizar: " + error.message);
}

// ============================================
// MENSAJES (vista admin)
// ============================================

async function cargarMensajesAdmin() {
  const { data, error } = await supabaseClient
    .from("mensajes_soporte")
    .select(`
      id, nombre, correo, tipo, mensaje, estado, creado_en,
      proveedores ( nombre ),
      productos ( nombre )
    `)
    .order("creado_en", { ascending: false });

  if (error) {
    console.error("Error al cargar mensajes:", error.message);
    return;
  }

  const generales = data.filter((m) => m.tipo === "general");
  const deProveedor = data.filter((m) => m.tipo === "proveedor");

  renderizarMensajes("listaMensajesSoporte", generales);
  renderizarMensajes("listaMensajesProveedor", deProveedor);
}

function renderizarMensajes(idContenedor, mensajes) {
  const contenedor = document.getElementById(idContenedor);
  contenedor.innerHTML = "";

  if (mensajes.length === 0) {
    contenedor.innerHTML = "<p>No hay mensajes aquí.</p>";
    return;
  }

  mensajes.forEach((m) => {
    const fecha = new Date(m.creado_en).toLocaleDateString("es-MX", {
      year: "numeric", month: "long", day: "numeric"
    });

    const contextoExtra = m.tipo === "proveedor"
      ? `<p>Proveedor: ${m.proveedores?.nombre || "?"} — Producto: ${m.productos?.nombre || "?"}</p>`
      : "";

    const tarjeta = document.createElement("div");
    tarjeta.className = "tarjeta-pedido-admin";
    tarjeta.innerHTML = `
      <p><strong>${m.nombre}</strong> (${m.correo}) — ${fecha}
        <span style="margin-left:8px; padding:2px 8px; border-radius:10px; background:${m.estado === "nuevo" ? "#fff3cd" : "#d1e7dd"};">
          ${m.estado}
        </span>
      </p>
      ${contextoExtra}
      <p>"${m.mensaje}"</p>
      ${m.estado === "nuevo" ? `<button onclick="marcarMensajeAtendido(${m.id})">Marcar como atendido</button>` : ""}
    `;
    contenedor.appendChild(tarjeta);
  });
}

async function marcarMensajeAtendido(id) {
  const { error } = await supabaseClient
    .from("mensajes_soporte")
    .update({ estado: "atendido" })
    .eq("id", id);

  if (error) {
    alert("Error al actualizar: " + error.message);
  } else {
    cargarMensajesAdmin();
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const esAdmin = await verificarEsAdmin();
  if (!esAdmin) return;

  cargarCategoriasAdmin();
  cargarProveedoresAdmin();
  cargarProductosAdmin();
  cargarPedidosAdmin();
  cargarMensajesAdmin();
});
