import { redirect } from "next/navigation";

// The block editor is now integrated into the diary.
// Redirect any bookmarks/links pointing to the old standalone editor.
export default function EditorRedirect() {
  redirect("/app/diario");
}
