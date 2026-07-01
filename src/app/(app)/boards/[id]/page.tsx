import { type Metadata } from "next";

import { BoardScreen } from "~/components/board/board-screen";

export const metadata: Metadata = { title: "Board" };

export default async function BoardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <BoardScreen boardId={id} />;
}
