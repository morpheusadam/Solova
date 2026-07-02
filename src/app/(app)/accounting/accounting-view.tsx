"use client";

import { AccountsTab } from "~/components/accounting/accounts-tab";
import { ExpensesTab } from "~/components/accounting/expenses-tab";
import { InvoicesTab } from "~/components/accounting/invoices-tab";
import { JournalTab } from "~/components/accounting/journal-tab";
import { PaymentsTab } from "~/components/accounting/payments-tab";
import { ProductsTab } from "~/components/accounting/products-tab";
import { ReportsTab } from "~/components/accounting/reports-tab";
import { PageHeader } from "~/components/shared/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";

export function AccountingView() {
  return (
    <>
      <PageHeader
        title="Accounting"
        description="Double-entry ledger: invoices, payments and expenses post automatically."
      />
      <Tabs defaultValue="reports">
        <TabsList className="mb-4 max-w-full overflow-x-auto">
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="journal">Journal</TabsTrigger>
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
        </TabsList>

        <TabsContent value="reports">
          <ReportsTab />
        </TabsContent>
        <TabsContent value="invoices">
          <InvoicesTab />
        </TabsContent>
        <TabsContent value="payments">
          <PaymentsTab />
        </TabsContent>
        <TabsContent value="products">
          <ProductsTab />
        </TabsContent>
        <TabsContent value="expenses">
          <ExpensesTab />
        </TabsContent>
        <TabsContent value="journal">
          <JournalTab />
        </TabsContent>
        <TabsContent value="accounts">
          <AccountsTab />
        </TabsContent>
      </Tabs>
    </>
  );
}
