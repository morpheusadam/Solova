import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { accountingRouter } from "~/server/api/routers/accounting";
import { boardRouter } from "~/server/api/routers/board";
import { cardRouter } from "~/server/api/routers/card";
import { companyRouter } from "~/server/api/routers/company";
import { contractRouter } from "~/server/api/routers/contract";
import { dashboardRouter } from "~/server/api/routers/dashboard";
import { listRouter } from "~/server/api/routers/list";
import { projectRouter } from "~/server/api/routers/project";
import { settingsRouter } from "~/server/api/routers/settings";
import { taskRouter } from "~/server/api/routers/task";
import { timeEntryRouter } from "~/server/api/routers/time-entry";

/** One router per feature module — additive, mirrors the schema modules. */
export const appRouter = createTRPCRouter({
  company: companyRouter,
  contract: contractRouter,
  project: projectRouter,
  board: boardRouter,
  list: listRouter,
  card: cardRouter,
  task: taskRouter,
  timeEntry: timeEntryRouter,
  accounting: accountingRouter,
  dashboard: dashboardRouter,
  settings: settingsRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
