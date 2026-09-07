// ============================================
// POLIMARKET - Página de inicio
// ============================================

// 1. Abrir / cerrar el menú lateral (drawer)
function abrirDrawer() {
  document.getElementById("drawerCuenta").classList.add("abierto");
  document.getElementById("drawerOverlay").classList.add("visible");
}

function cerrarDrawer() {
  document.getElementById("drawerCuenta").classList.remove("abierto");
  document.getElementById("drawerOverlay").classList.remove("visible");
}

// 2. Llenar el ícono circular y el contenido del drawer,
// según si hay sesión iniciada o no
async function pintarCuenta() {
  const { data } = await supabaseClient.auth.getSession();
  const icono = document.getElementById("iconoPerfil");
  const contenidoDrawer = document.getElementById("contenidoDrawer");

  if (data.session) {
    const usuarioId = data.session.user.id;

    const { data: perfil, error } = await supabaseClient
      .from("perfiles")
      .select("nombre, apellido_paterno, roles(nombre)")
      .eq("id", usuarioId)
      .single();

    if (error) {
      console.error("Error al traer el perfil para el header:", error.message);
    }

    const nombre = perfil ? perfil.nombre : "Usuario";
    icono.textContent = nombre.charAt(0).toUpperCase();

    const esAdmin = perfil?.roles?.nombre === "admin";

    contenidoDrawer.innerHTML = `
      <p>Hola, <strong>${nombre} ${perfil?.apellido_paterno || ""}</strong></p>
      <a href="perfil.html">👤 Mi perfil</a>
      <a href="mis-pedidos.html">📦 Mis pedidos</a>
      ${esAdmin ? '<a href="panel-admin.html">🛠️ Panel Admin</a>' : ""}
      <a href="soporte.html">💬 Contacto a soporte</a>
      <button class="opcion-drawer" onclick="cerrarSesion()">🚪 Cerrar sesión</button>
    `;
  } else {
    icono.textContent = "👤";

    contenidoDrawer.innerHTML = `
      <a href="login.html">🔑 Iniciar sesión</a>
      <a href="registro.html">📝 Registrarse</a>
      <a href="soporte.html">💬 Contacto a soporte</a>
    `;
  }
}

// 3. Buscar desde el header de inicio: manda al catálogo con el texto ya aplicado
function buscarDesdeInicio() {
  const texto = document.getElementById("inputBuscador").value;
  window.location.href = "catalogo.html?buscar=" + encodeURIComponent(texto);
}

// 4. Cargar categorías como "pastillas" (pills) que llevan al catálogo filtrado
async function cargarCategoriasEnInicio() {
  const { data, error } = await supabaseClient
    .from("categorias")
    .select("id, nombre")
    .order("nombre");

  if (error) {
    console.error("Error al cargar categorías:", error.message);
    return;
  }

  const contenedor = document.getElementById("listaCategorias");
  data.forEach((categoria) => {
    const pastilla = document.createElement("a");
    pastilla.className = "pill-categoria";
    pastilla.href = "catalogo.html?categoria=" + categoria.id;
    pastilla.textContent = categoria.nombre;
    contenedor.appendChild(pastilla);
  });
}

// 5. Traer unos cuantos productos para la sección de "destacados"
async function cargarDestacados() {
  const { data, error } = await supabaseClient
    .from("productos")
    .select("id, nombre, precio, imagen_url")
    .limit(25);

  if (error) {
    console.error("Error al cargar destacados:", error.message);
    return;
  }

  const contenedor = document.getElementById("destacados");
  data.forEach((producto) => {
    const tarjeta = document.createElement("div");
    tarjeta.className = "tarjeta-destacado";
    tarjeta.innerHTML = `
      <img src="${producto.imagen_url}" alt="${producto.nombre}">
      <h4>${producto.nombre}</h4>
      <p>$${producto.precio}</p>
    `;
    tarjeta.style.cursor = "pointer";
    tarjeta.onclick = () => window.location.href = "producto-detalle.html?id=" + producto.id;
    contenedor.appendChild(tarjeta);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  pintarCuenta();
  cargarCategoriasEnInicio();
  cargarDestacados();
});
