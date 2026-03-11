/**
 * PROVEEDOR: AuthContext (Motor de Sesión Global)
 * ----------------------------------------------
 * Gestiona el ciclo de vida de la autenticación en toda la aplicación.
 * 
 * FUNCIONALIDADES MOTOR:
 * 1. PERSISTENCIA: Recupera la sesión activa de Supabase al hidratar la app.
 * 2. REAL-TIME AUTH: Implementa un 'onAuthStateChange' para reaccionar 
 *    instantáneamente a inicios/cierres de sesión sin recargar.
 * 3. ABSTRACCIÓN: Expone el hook 'useAuth' para simplificar el acceso 
 *    al objeto 'user' y métodos de salida.
 */
// Importamos las herramientas de React
import { createContext, useContext, useEffect, useState } from "react";
// Importamos nuestra conexión a Supabase
import { supabase } from "../app/supabase";

// 1. Creamos el "Contexto" (La variable global que guardará al usuario)
const AuthContext = createContext();

// 2. Creamos el "Proveedor" (El componente que envuelve a toda la app)
export const AuthProvider = ({ children }) => {
  // Estado para guardar al usuario (null = nadie logueado)
  const [user, setUser] = useState(null);
  // Estado para saber si estamos cargando la sesión (para no mostrar nada mientras verificamos)
  const [loading, setLoading] = useState(true);

  // useEffect se ejecuta al iniciar la app para preguntar: "¿Hay alguien logueado?"
  useEffect(() => {
    // A. Preguntamos a Supabase si hay una sesión activa guardada en el navegador
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      // Si hay sesión, guardamos el usuario en el estado
      setUser(session?.user ?? null);
      setLoading(false); // Terminamos de cargar
    };

    checkSession();

    // B. ESCUCHADOR DE CAMBIOS (Listener)
    // Esto detecta automáticamente si inicias sesión o cierras sesión
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("Evento de Auth:", event); // Para ver en consola qué pasa
        setUser(session?.user ?? null); // Actualizamos el usuario
        setLoading(false);
      }
    );

    // Limpieza: Cuando cerramos la app, quitamos el escuchador
    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // 3. Función para Cerrar Sesión (Logout)
  const signOut = async () => {
    await supabase.auth.signOut();
  };

  // 4. Qué datos compartimos con toda la app
  const value = {
    user, // El objeto usuario (email, id, etc.)
    signOut, // La función para salir
    loading, // Para saber si seguimos verificando
  };

  // Si está cargando la sesión inicial, mostramos un spinner o nada (para evitar parpadeos)
  // De lo contrario, mostramos la app normal (children)
  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

// 5. Un Hook personalizado para usar este contexto fácil en otros archivos
// En vez de importar useContext y AuthContext cada vez, solo llamamos a useAuth()
export const useAuth = () => {
  return useContext(AuthContext);
};
