import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { requireAdminUser, requireAuthorizedUser } from "~/server/api/utils/authorization";

export const templatesRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    await requireAuthorizedUser(ctx);
    const templates = await ctx.db.template.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, body: true, updatedAt: true },
    });

    return templates;
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(3).max(80),
        body: z.string().min(1).max(5000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireAdminUser(ctx);
      const template = await ctx.db.template.create({
        data: {
          name: input.name,
          body: input.body,
        },
      });
      return template;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
        name: z.string().min(3).max(80),
        body: z.string().min(1).max(5000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireAdminUser(ctx);
      const template = await ctx.db.template.update({
        where: { id: input.id },
        data: {
          name: input.name,
          body: input.body,
        },
      });
      return template;
    }),

  remove: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await requireAdminUser(ctx);
      await ctx.db.template.delete({ where: { id: input.id } });
      return { success: true };
    }),
});
