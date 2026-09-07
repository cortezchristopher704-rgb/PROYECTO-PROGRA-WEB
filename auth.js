// ============================================
// MARKETPLACE - Funciones de autenticación
// Conectadas a Supabase Auth
// ============================================

// 1. Conexión a tu proyecto de Supabase
// (reemplaza estos dos valores con los tuyos, los encuentras en
// Supabase > Project Settings > API)
const SUPABASE_URL = "https://duvaftchmhapnzbcfvhi.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1dmFmdGNobWhhcG56YmNmdmhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2NDMxNDEsImV4cCI6MjEwNDIxOTE0MX0.KO6NIWUhfj7k2NQR_H-8kMzpkmYdtDE72NSYMY2FiiM";


const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 2. REGISTRO de un nuevo cliente
async function registrarUsuario(correo, contrasena, nombre, apellidoPaterno, apellidoMaterno) {
  const { data, error } = await supabaseClient.auth.signUp({
    email: correo,
    password: contrasena,
    options: {
      data: {
        nombre: nombre,
        apellido_paterno: apellidoPaterno,
        apellido_materno: apellidoMaterno || null // el materno es opcional
      }
    }
  });

  if (error) {
    console.error("Error al registrar:", error.message);
    return { exito: false, mensaje: error.message };
  }

  return { exito: true, usuario: data.user };
}

// 3. INICIO DE SESIÓN
async function iniciarSesion(correo, contrasena) {
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email: correo,
    password: contrasena
  });

  if (error) {
    console.error("Error al iniciar sesión:", error.message);
    return { exito: false, mensaje: error.message };
  }

  // Ya que inició sesión, buscamos su perfil para saber su rol
  const rol = await obtenerRolDelUsuario(data.user.id);

  return { exito: true, usuario: data.user, rol: rol };
}

// 4. Saber si el usuario que inició sesión es cliente o admin
async function obtenerRolDelUsuario(usuarioId) {
  const { data, error } = await supabaseClient
    .from("perfiles")
    .select("rol_id, roles(nombre)")
    .eq("id", usuarioId)
    .single();

  if (error) {
    console.error("Error al obtener el rol:", error.message);
    return null;
  }

  return data.roles?.nombre || null; // devuelve "cliente", "admin", o null si algo anda mal
}

// 5. Pedir el correo de recuperación de contraseña
async function solicitarRecuperacion(correo) {
  const { error } = await supabaseClient.auth.resetPasswordForEmail(correo, {
    redirectTo: window.location.origin + "/actualizar-contrasena.html"
  });

  if (error) {
    return { exito: false, mensaje: error.message };
  }
  return { exito: true };
}

// 6. Poner la nueva contraseña (se usa en actualizar-contrasena.html,
// después de que la persona entra desde el link del correo)
async function actualizarContrasena(nuevaContrasena) {
  const { error } = await supabaseClient.auth.updateUser({
    password: nuevaContrasena
  });

  if (error) {
    return { exito: false, mensaje: error.message };
  }
  return { exito: true };
}

// 7. CERRAR SESIÓN
async function cerrarSesion() {
  await supabaseClient.auth.signOut();
  window.location.href = "login.html";
}

// 8. Ejemplo de uso: al hacer login, redirigir según el rol
async function manejarLogin(correo, contrasena) {
  const resultado = await iniciarSesion(correo, contrasena);

  if (!resultado.exito) {
    alert("No se pudo iniciar sesión: " + resultado.mensaje);
    return;
  }

  if (resultado.rol === "admin") {
    window.location.href = "panel-admin.html";
  } else {
    window.location.href = "catalogo.html";
  }
}
