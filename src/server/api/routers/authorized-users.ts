/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { TRPCError } from "@trpc/server";
import { compare, hash } from "bcryptjs";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { requireAdminUser, requireAuthorizedUser } from "~/server/api/utils/authorization";

const passwordSchema = z.string().min(8, "Password must be at least 8 characters.").max(128);
const ROLE_VALUES = ["USER", "ADMIN"] as const;
const roleSchema = z.enum(ROLE_VALUES);

export const authorizedUsersRouter = createTRPCRouter({
  current: protectedProcedure.query(async ({ ctx }) => {
    const record = await requireAuthorizedUser(ctx);
    return {
      id: record.id,
      email: record.email,
      role: record.role,
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

      return { success: true };
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    await requireAdminUser(ctx);
    const users = await ctx.db.authorizedUser.findMany({
      orderBy: { email: "asc" },
      select: { id: true, email: true, role: true, mustChangePassword: true, createdAt: true },
    });
    return users;
  }),

  create: protectedProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: passwordSchema,
        role: roleSchema.optional().default("USER"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireAdminUser(ctx);
      const hashValue = await hash(input.password, 12);

      const existing = await ctx.db.authorizedUser.findUnique({ where: { email: input.email } });
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "Email is already authorized." });
      }

      const created = await ctx.db.authorizedUser.create({
        data: {
          email: input.email,
          passwordHash: hashValue,
          role: input.role ?? "USER",
          mustChangePassword: true,
        },
        select: { id: true, email: true, role: true, mustChangePassword: true },
      });

      return created;
    }),

  resetPassword: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
        password: passwordSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireAdminUser(ctx);
      const hashValue = await hash(input.password, 12);
      await ctx.db.authorizedUser.update({
        where: { id: input.id },
        data: { passwordHash: hashValue, mustChangePassword: true },
      });
      return { success: true };
    }),

  remove: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await requireAdminUser(ctx);
      await ctx.db.authorizedUser.delete({ where: { id: input.id } });
      return { success: true };
    }),
});
