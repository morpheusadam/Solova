import { type Metadata } from "next";

import { TimeView } from "./time-view";

export const metadata: Metadata = { title: "Time" };

export default function TimePage() {
  return <TimeView />;
}
