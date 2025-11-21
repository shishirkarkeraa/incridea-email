
import { TRPCError } from "@trpc/server";
import { compare, hash } from "bcryptjs";
import { z } from "zod";

import { adminProcedure, createTRPCRouter, protectedProcedure, type TRPCContext } from "~/server/api/trpc";
import { requireAuthorizedUser } from "~/server/api/utils/authorization";

const passwordSchema = z.string().min(8, "Password must be at least 8 characters.").max(128);

const recordAuditLog = async (ctx: TRPCContext, description: string) => {
  const sessionUser = ctx.session?.user;
  await ctx.db.auditLog.create({
    data: {
      description,
      userId: sessionUser?.id ?? null,
      userEmail: sessionUser?.email ?? null,
    },
  });
};

export const authorizedUsersRouter = createTRPCRouter({
  current: protectedProcedure.query(async ({ ctx }) => {
    const record = await requireAuthorizedUser(ctx);
    return {
      id: record.id,
      email: record.email,
      mustChangePassword: record.mustChangePassword,
    };
  }),

  changePassword: protectedProcedure
    .input(
      z.object({
        currentPassword: z.string().min(1, "Current password is required."),
        newPassword: passwordSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const record = await requireAuthorizedUser(ctx);
      const isValid = await compare(input.currentPassword, record.passwordHash);
      if (!isValid) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Current password is incorrect." });
      }

      const hashValue = await hash(input.newPassword, 12);
      await ctx.db.authorizedUser.update({
        where: { id: record.id },
        data: { passwordHash: hashValue, mustChangePassword: false },
      });

      await recordAuditLog(ctx, `Changed password for ${record.email}`);
      return { success: true };
    }),

  list: adminProcedure.query(async ({ ctx }) => {
    const users = await ctx.db.authorizedUser.findMany({
      orderBy: { email: "asc" },
      select: { id: true, email: true, mustChangePassword: true, createdAt: true },
    });
    return users;
  }),

  create: adminProcedure
    .input(
      z.object({
        emails: z.array(z.string().email()).min(1).max(100),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const normalizedEmails = Array.from(
        new Set(
          input.emails
            .map((email) => email.trim().toLowerCase())
            .filter((email) => email.length > 0),
        ),
      );

      if (normalizedEmails.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No valid email addresses provided." });
      }

      const results: { email: string; status: "created" | "duplicate" }[] = [];

      for (const email of normalizedEmails) {
        const existing = await ctx.db.authorizedUser.findUnique({ where: { email } });
        if (existing) {
          results.push({ email, status: "duplicate" });
          continue;
        }

        const hashValue = await hash(email, 12);
        await ctx.db.authorizedUser.create({
          data: {
            email,
            passwordHash: hashValue,
            mustChangePassword: true,
          },
        });
        await recordAuditLog(ctx, `Added authorized user ${email}`);
        results.push({ email, status: "created" });
      }

      return { results };
    }),

  resetPassword: adminProcedure
    .input(
      z.object({
        id: z.string().min(1),
        password: passwordSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const hashValue = await hash(input.password, 12);
      const updated = await ctx.db.authorizedUser.update({
        where: { id: input.id },
        data: { passwordHash: hashValue, mustChangePassword: true },
        select: { email: true },
      });
      await recordAuditLog(ctx, `Reset password for authorized user ${updated.email}`);
      return { success: true };
    }),

  remove: adminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const removed = await ctx.db.authorizedUser.delete({
        where: { id: input.id },
        select: { email: true },
      });
      await recordAuditLog(ctx, `Removed authorized user ${removed.email}`);
      return { success: true };
    }),
});
