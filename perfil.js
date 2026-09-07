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

document.addEventListener("DOMContentLoaded", cargarPerfil);
