import { redirect } from "next/navigation";

// The global tasks table was replaced by the sticky Notes board.
export default function TasksPage() {
  redirect("/notes");
}
