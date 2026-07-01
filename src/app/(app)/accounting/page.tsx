import { type Metadata } from "next";

import { AccountingView } from "./accounting-view";

export const metadata: Metadata = { title: "Accounting" };

export default function AccountingPage() {
  return <AccountingView />;
}
