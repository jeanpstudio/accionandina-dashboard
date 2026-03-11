/**
 * COMPONENTE: Login (Gateway de Acceso)
 * ------------------------------------
 * Punto de entrada único para la autenticación de usuarios.
 * 
 * SEGURIDAD:
 * - Utiliza Supabase Auth (Sign In with Password).
 * - Manejo de estados de carga y errores de red/credenciales.
 * - Redirección automática al Home tras validación exitosa.
 */
// Importamos Hooks de React
import { useState } from "react";
// Importamos el hook para navegar a otra página
import { useNavigate } from "react-router-dom";
// Importamos la conexión a Supabase
import { supabase } from "../../app/supabase";

export default function Login() {
  const navigate = useNavigate(); // Instancia para poder redirigir

  // 1. ESTADOS
  const [email, setEmail] = useState(""); // Lo que escribe el usuario
  const [password, setPassword] = useState(""); // La contraseña
  const [loading, setLoading] = useState(false); // Para desactivar el botón mientras carga
  const [errorMsg, setErrorMsg] = useState(""); // Para mostrar errores rojos si falla

  // 2. FUNCIÓN DE LOGIN (Al enviar el formulario)
  const handleLogin = async (e) => {
    e.preventDefault(); // Evita que la página se recargue
    setLoading(true); // Activamos modo "cargando"
    setErrorMsg(""); // Limpiamos errores viejos

    try {
      // 👇 LA MAGIA DE SUPABASE
      // Intentamos iniciar sesión con los datos del formulario
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) {
        // Si Supabase dice que está mal, mostramos el error
        setErrorMsg("Credenciales incorrectas o usuario no confirmado.");
        console.error("Error login:", error.message);
      } else {
        // ¡ÉXITO!
        console.log("Login correcto:", data);
        navigate("/"); // Redirigimos al Dashboard (Home)
      }
    } catch (error) {
      setErrorMsg("Ocurrió un error inesperado.");
      console.error(error);
    } finally {
      setLoading(false); // Apagamos el modo "cargando" pase lo que pase
    }
  };

  return (
    // CONTENEDOR PRINCIPAL (Centrado en pantalla, fondo oscuro)
    <div className="flex min-h-screen items-center justify-center bg-gray-900 p-4">
      {/* TARJETA DEL LOGIN */}
      <div className="w-full max-w-md bg-gray-800 rounded-xl shadow-2xl p-8 border border-gray-700">
        {/* Encabezado */}
        <h2 className="text-3xl font-bold text-center text-white mb-2">
          Bienvenido
        </h2>
        <p className="text-center text-gray-400 mb-8">
          Ingresa a tu Dashboard de Comunicaciones
        </p>

        {/* Mensaje de Error (solo se ve si hay error) */}
        {errorMsg && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500 text-red-400 text-sm rounded text-center">
            {errorMsg}
          </div>
        )}

        {/* FORMULARIO */}
        <form onSubmit={handleLogin} className="space-y-6">
          {/* Input Email */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Correo Electrónico
            </label>
            <input
              type="email"
              required
              className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand transition-all"
              placeholder="tu@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)} // Actualiza el estado al escribir
            />
          </div>

          {/* Input Password */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Contraseña
            </label>
            <input
              type="password"
              required
              className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand transition-all"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {/* Botón Submit */}
          <button
            type="submit"
            disabled={loading} //se bloquea cuando carga
            className={`w-full font-bold py-3 px-4 rounded-lg transition-colors shadow-lg text-white
    ${loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-brand hover:bg-brand-light"
              }`}
          >
            {loading ? "Entrando..." : "Iniciar Sesión"}
          </button>
        </form>
      </div>
    </div>
  );
}
