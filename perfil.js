// ============================================
// POLIMARKET - Mi perfil
// ============================================

let usuarioIdActual = null;

async function cargarPerfil() {
  const { data: sesion } = await supabaseClient.auth.getSession();
  if (!sesion.session) {
    alert("Debes iniciar sesión.");
    window.location.href = "login.html";
    return;
  }
  usuarioIdActual = sesion.session.user.id;

  const { data: perfil, error } = await supabaseClient
    .from("perfiles")
    .select("nombre, apellido_paterno, apellido_materno")
    .eq("id", usuarioIdActual)
    .single();

  if (error) {
    console.error("Error al cargar perfil:", error.message);
    return;
  }

  document.getElementById("perfilNombre").value = perfil.nombre || "";
  document.getElementById("perfilApellidoPaterno").value = perfil.apellido_paterno || "";
  document.getElementById("perfilApellidoMaterno").value = perfil.apellido_materno || "";
  document.getElementById("perfilCorreo").value = sesion.session.user.email;
}

async function guardarPerfil() {
  const nombre = document.getElementById("perfilNombre").value.trim();
  const apellidoPaterno = document.getElementById("perfilApellidoPaterno").value.trim();
  const apellidoMaterno = document.getElementById("perfilApellidoMaterno").value.trim();

  if (!nombre || !apellidoPaterno) {
    alert("Nombre y apellido paterno son obligatorios.");
    return;
  }

  const { error } = await supabaseClient
    .from("perfiles")
    .update({
      nombre,
      apellido_paterno: apellidoPaterno,
      apellido_materno: apellidoMaterno || null
    })
    .eq("id", usuarioIdActual);

  if (error) {
    alert("Error al guardar: " + error.message);
  } else {
    alert("¡Perfil actualizado!");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  cargarPerfil();
  cargarMisResenas();
});

// Cambiar contraseña estando ya logueado
// (reutiliza actualizarContrasena(), la misma función que ya usa
// actualizar-contrasena.html para el flujo de "olvidé mi contraseña")
async function cambiarContrasenaDesdePerfil() {
  const nueva = document.getElementById("nuevaContrasenaPerfil").value;
  const confirmar = document.getElementById("confirmarContrasenaPerfil").value;
  const resultado = document.getElementById("resultadoContrasena");

  if (nueva.length < 6) {
    resultado.style.color = "red";
    resultado.textContent = "La contraseña debe tener al menos 6 caracteres.";
    return;
  }

  if (nueva !== confirmar) {
    resultado.style.color = "red";
    resultado.textContent = "Las contraseñas no coinciden.";
    return;
  }

  const respuesta = await actualizarContrasena(nueva);

  if (respuesta.exito) {
    resultado.style.color = "green";
    resultado.textContent = "¡Contraseña actualizada!";
    document.getElementById("nuevaContrasenaPerfil").value = "";
    document.getElementById("confirmarContrasenaPerfil").value = "";
  } else {
    resultado.style.color = "red";
    resultado.textContent = "Error: " + respuesta.mensaje;
  }
}

// ============================================
// MIS RESEÑAS
// ============================================

async function cargarMisResenas() {
  const { data: sesion } = await supabaseClient.auth.getSession();
  if (!sesion.session) return;

  const { data, error } = await supabaseClient
    .from("resenas")
    .select(`id, calificacion, comentario, productos ( id, nombre )`)
    .eq("usuario_id", sesion.session.user.id)
    .order("id", { ascending: false });

  if (error) {
    console.error("Error al cargar mis reseñas:", error.message);
    return;
  }

  renderizarMisResenas(data);
}

function renderizarMisResenas(resenas) {
  const contenedor = document.getElementById("listaMisResenas");
  contenedor.innerHTML = "";

  if (resenas.length === 0) {
    contenedor.innerHTML = "<p>Todavía no has dejado ninguna reseña.</p>";
    return;
  }

  resenas.forEach((resena) => {
    const fila = document.createElement("div");
    fila.className = "resena";
    fila.innerHTML = `
      <p><strong>${resena.productos.nombre}</strong></p>
      <label>Calificación:
        <select id="calificacion-${resena.id}">
          ${[5,4,3,2,1].map(n => `<option value="${n}" ${n === resena.calificacion ? "selected" : ""}>${"⭐".repeat(n)} (${n})</option>`).join("")}
        </select>
      </label>
      <textarea id="comentario-${resena.id}" rows="2" style="width:100%; max-width:400px;">${resena.comentario || ""}</textarea>
      <br>
      <button onclick="guardarEdicionResena(${resena.id})">Guardar cambios</button>
      <button class="secundario" onclick="borrarMiResena(${resena.id})">Borrar reseña</button>
      <a href="producto-detalle.html?id=${resena.productos.id}">Ver producto →</a>
    `;
    contenedor.appendChild(fila);
  });
}

async function guardarEdicionResena(resenaId) {
  const calificacion = parseInt(document.getElementById(`calificacion-${resenaId}`).value);
  const comentario = document.getElementById(`comentario-${resenaId}`).value.trim();

  const { error } = await supabaseClient
    .from("resenas")
    .update({ calificacion, comentario })
    .eq("id", resenaId);

  if (error) {
    alert("Error al guardar: " + error.message);
  } else {
    alert("¡Reseña actualizada!");
  }
}

async function borrarMiResena(resenaId) {
  if (!confirm("¿Seguro que quieres borrar esta reseña?")) return;

  const { error } = await supabaseClient
    .from("resenas")
    .delete()
    .eq("id", resenaId);

  if (error) {
    alert("Error al borrar: " + error.message);
  } else {
    cargarMisResenas();
  }
}
