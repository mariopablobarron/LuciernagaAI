import { redirect } from "next/navigation";

// Hub único de configuración vive en /settings. Este path se mantiene por
// compatibilidad con bookmarks/enlaces internos y simplemente redirige.
export default function AppSettingsRedirect() {
  redirect("/settings");
}
