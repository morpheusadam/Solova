import { type Metadata } from "next";

import { BoardsView } from "./boards-view";

export const metadata: Metadata = { title: "Boards" };

export default function BoardsPage() {
  return <BoardsView />;
}
