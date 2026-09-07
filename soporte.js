// ============================================
// POLIMARKET - Contacto a soporte
// ============================================

// Si la persona ya tiene sesión, le rellenamos nombre y correo solitos
async function precargarDatosSoporte() {
  const { data: sesion } = await supabaseClient.auth.getSession();
  if (!sesion.session) return;

  document.getElementById("soporteCorreo").value = sesion.session.user.email;

  const { data: perfil } = await supabaseClient
    .from("perfiles")
    .select("nombre, apellido_paterno")
    .eq("id", sesion.session.user.id)
    .single();

  if (perfil) {
    document.getElementById("soporteNombre").value = `${perfil.nombre} ${perfil.apellido_paterno || ""}`.trim();
  }
}

async function enviarMensajeSoporte() {
  const nombre = document.getElementById("soporteNombre").value.trim();
  const correo = document.getElementById("soporteCorreo").value.trim();
  const mensaje = document.getElementById("soporteMensaje").value.trim();
  const resultado = document.getElementById("resultadoSoporte");

  if (!nombre || !correo || !mensaje) {
    resultado.style.color = "red";
    resultado.textContent = "Todos los campos son obligatorios.";
    return;
  }

  const { data: sesion } = await supabaseClient.auth.getSession();
  const usuarioId = sesion.session ? sesion.session.user.id : null;

  const { error } = await supabaseClient
    .from("mensajes_soporte")
    .insert({
      usuario_id: usuarioId,
      nombre,
      correo,
      mensaje,
      tipo: "general"
    });

  if (error) {
    resultado.style.color = "red";
    resultado.textContent = "Error al enviar: " + error.message;
  } else {
    resultado.style.color = "green";
    resultado.textContent = "¡Gracias! Tu mensaje fue enviado, te responderemos pronto.";
    document.getElementById("soporteMensaje").value = "";
  }
}

document.addEventListener("DOMContentLoaded", precargarDatosSoporte);
