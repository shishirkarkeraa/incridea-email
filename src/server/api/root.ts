import { authorizedUsersRouter } from "~/server/api/routers/authorized-users";
import { emailRouter } from "~/server/api/routers/email";
import { templatesRouter } from "~/server/api/routers/templates";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  email: emailRouter,
  templates: templatesRouter,
  authorizedUsers: authorizedUsersRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.email.send({
 *   to: ["team@example.com"],
 *   subject: "Hello",
 *   body: "Test",
 * });
 */
export const createCaller = createCallerFactory(appRouter);
