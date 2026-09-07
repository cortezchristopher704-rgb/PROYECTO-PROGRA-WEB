// ============================================
// MARKETPLACE - Favoritos
// ============================================

async function cargarFavoritos() {
  const { data, error } = await supabaseClient
    .from("favoritos")
    .select(`
      id,
      productos ( id, nombre, precio, imagen_url )
    `);

  if (error) {
    console.error("Error al cargar favoritos:", error.message);
    return;
  }

  renderizarFavoritos(data);
}

function renderizarFavoritos(lista) {
  const contenedor = document.getElementById("contenedorFavoritos");
  contenedor.innerHTML = "";

  if (lista.length === 0) {
    contenedor.innerHTML = "<p>No tienes favoritos todavía.</p>";
    return;
  }

  lista.forEach((favorito) => {
    const fila = document.createElement("div");
    fila.className = "fila-favorito";
    fila.innerHTML = `
      <img src="${favorito.productos.imagen_url}" alt="${favorito.productos.nombre}">
      <span>${favorito.productos.nombre}</span>
      <span>$${favorito.productos.precio}</span>
      <button onclick="moverAlCarrito(${favorito.productos.id})">Agregar al carrito</button>
      <button onclick="quitarDeFavoritos(${favorito.id})">Quitar</button>
    `;
    contenedor.appendChild(fila);
  });
}

async function quitarDeFavoritos(favoritoId) {
  const { error } = await supabaseClient
    .from("favoritos")
    .delete()
    .eq("id", favoritoId);

  if (error) {
    alert("Error al quitar de favoritos: " + error.message);
  } else {
    cargarFavoritos();
  }
}

async function moverAlCarrito(productoId) {
  const { data: sesion } = await supabaseClient.auth.getSession();
  const usuarioId = sesion.session.user.id;

  const { error } = await supabaseClient
    .from("carrito")
    .insert({ usuario_id: usuarioId, producto_id: productoId, cantidad: 1 });

  if (error) {
    alert("Error al agregar al carrito: " + error.message);
  } else {
    alert("¡Agregado al carrito!");
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const { data } = await supabaseClient.auth.getSession();
  if (!data.session) {
    alert("Debes iniciar sesión para ver tus favoritos.");
    window.location.href = "login.html";
    return;
  }
  cargarFavoritos();
});
