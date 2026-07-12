import { redirect } from "next/navigation";

/**
 * Teams / multiplayer is hidden for launch — the types aren't regenerated and the
 * surface isn't polished. This layout guards every /teams/** route. To re-enable
 * Teams: delete this file and restore the nav item in components/dashboard/sidebar.tsx.
 */
export default function TeamsLayout() {
  redirect("/today");
}
