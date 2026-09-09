// ============================================
// MARKETPLACE - Catálogo de productos
// ============================================

let todosLosProductos = []; // aquí guardamos todo, para filtrar sin repetir consultas

// 1. Traer todos los productos, junto con sus categorías
// (usamos la tabla puente producto_categorias para conectar ambas cosas)
async function cargarProductos() {
  const { data, error } = await supabaseClient
    .from("productos")
    .select(`
      id,
      nombre,
      descripcion,
      precio,
      imagen_url,
      stock,
      producto_categorias (
        categoria_id,
        categorias ( nombre )
      ),
      variantes_producto ( id )
    `)
    .eq("activo", true);

  if (error) {
    console.error("Error al cargar productos:", error.message);
    return;
  }

  todosLosProductos = data;
  renderizarProductos(todosLosProductos);
}

// 2. Traer todas las categorías, para llenar el filtro (<select>)
async function cargarCategoriasEnFiltro() {
  const { data, error } = await supabaseClient
    .from("categorias")
    .select("id, nombre")
    .order("nombre");

  if (error) {
    console.error("Error al cargar categorías:", error.message);
    return;
  }

  const selectFiltro = document.getElementById("filtroCategoria");
  data.forEach((categoria) => {
    const opcion = document.createElement("option");
    opcion.value = categoria.id;
    opcion.textContent = categoria.nombre;
    selectFiltro.appendChild(opcion);
  });
}

// 3. Dibujar las tarjetas de producto en la página
function renderizarProductos(lista) {
  const contenedor = document.getElementById("contenedorProductos");
  contenedor.innerHTML = ""; // limpiamos antes de volver a pintar

  if (lista.length === 0) {
    contenedor.innerHTML = "<p>No se encontraron productos.</p>";
    return;
  }

  lista.forEach((producto) => {
    // Sacamos los nombres de las categorías de este producto
    const nombresCategorias = producto.producto_categorias
      .map((pc) => pc.categorias.nombre)
      .join(", ");

    const tarjeta = document.createElement("div");
    tarjeta.className = "tarjeta-producto";
    tarjeta.innerHTML = `
      <img src="${producto.imagen_url}" alt="${producto.nombre}">
      <h3>${producto.nombre}</h3>
      <p>${producto.descripcion}</p>
      <p><strong>$${producto.precio}</strong></p>
      <p class="categorias-texto">Categorías: ${nombresCategorias}</p>
      <a href="producto-detalle.html?id=${producto.id}">Ver detalle</a><br>
      ${producto.variantes_producto.length > 0
        ? `<a href="producto-detalle.html?id=${producto.id}"><button>Elegir opción →</button></a>`
        : producto.stock <= 0
          ? `<button disabled>Agotado</button>`
          : `<button onclick="agregarAlCarrito(${producto.id})">Agregar al carrito</button>`
      }
      <button onclick="agregarAFavoritos(${producto.id})">❤ Favorito</button>
    `;
    contenedor.appendChild(tarjeta);
  });
}

// 4. Filtrar por categoría y/o texto de búsqueda
// (filtramos en el navegador, sobre los datos que ya trajimos - funciona
// muy bien para catálogos chicos como el de un proyecto escolar)
function filtrarProductos() {
  const categoriaSeleccionada = document.getElementById("filtroCategoria").value;
  const textoBusqueda = document.getElementById("buscador").value.toLowerCase();

  let resultado = todosLosProductos;

  if (categoriaSeleccionada !== "todas") {
    resultado = resultado.filter((producto) =>
      producto.producto_categorias.some(
        (pc) => pc.categoria_id === parseInt(categoriaSeleccionada)
      )
    );
  }

  if (textoBusqueda !== "") {
    resultado = resultado.filter((producto) =>
      producto.nombre.toLowerCase().includes(textoBusqueda)
    );
  }

  renderizarProductos(resultado);
}

// 5. Agregar un producto al carrito (necesita sesión iniciada)
async function agregarAlCarrito(productoId) {
  const { data: sesion } = await supabaseClient.auth.getSession();

  if (!sesion.session) {
    alert("Debes iniciar sesión para agregar al carrito.");
    window.location.href = "login.html";
    return;
  }

  const producto = todosLosProductos.find((p) => p.id === productoId);
  if (producto.stock <= 0) {
    alert("Este producto está agotado.");
    return;
  }

  const usuarioId = sesion.session.user.id;

  const { error } = await supabaseClient
    .from("carrito")
    .insert({ usuario_id: usuarioId, producto_id: productoId, cantidad: 1 });

  if (error) {
    alert("Error al agregar al carrito: " + error.message);
  } else {
    alert("¡Producto agregado al carrito!");
  }
}

// 6. Agregar un producto a favoritos (necesita sesión iniciada)
async function agregarAFavoritos(productoId) {
  const { data: sesion } = await supabaseClient.auth.getSession();

  if (!sesion.session) {
    alert("Debes iniciar sesión para agregar a favoritos.");
    window.location.href = "login.html";
    return;
  }

  const usuarioId = sesion.session.user.id;

  const { error } = await supabaseClient
    .from("favoritos")
    .insert({ usuario_id: usuarioId, producto_id: productoId });

  if (error) {
    // Código 23505 = violación de restricción "unique" (ya existía esa combinación)
    if (error.code === "23505") {
      alert("Ese producto ya está en tus favoritos.");
    } else {
      alert("Error al agregar a favoritos: " + error.message);
    }
  } else {
    alert("¡Agregado a favoritos!");
  }
}

// Cuando cargue la página, traemos todo
document.addEventListener("DOMContentLoaded", async () => {
  await cargarCategoriasEnFiltro();
  await cargarProductos();

  // Si venimos del index.html con un filtro ya elegido, lo aplicamos
  const parametros = new URLSearchParams(window.location.search);
  const categoriaUrl = parametros.get("categoria");
  const buscarUrl = parametros.get("buscar");

  if (categoriaUrl) {
    document.getElementById("filtroCategoria").value = categoriaUrl;
  }
  if (buscarUrl) {
    document.getElementById("buscador").value = buscarUrl;
  }
  if (categoriaUrl || buscarUrl) {
    filtrarProductos();
  }
});
