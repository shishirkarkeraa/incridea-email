import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { requireAdminUser } from "~/server/api/utils/authorization";

export const auditRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(500).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      await requireAdminUser(ctx);
      const limit = input?.limit ?? 100;
      const logs = await ctx.db.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
          id: true,
          description: true,
          createdAt: true,
          userEmail: true,
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      });
      return logs;
    }),
});
