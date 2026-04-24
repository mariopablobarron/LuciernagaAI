import { permanentRedirect } from "next/navigation";

// /perfil es el alias en español de /profile. La ruta canónica es /profile
// (estructura del repo en inglés); /perfil redirige permanentemente para que
// los usuarios hispanohablantes que tipean la URL natural lleguen siempre.
export default function PerfilAlias() {
  permanentRedirect("/profile");
}
