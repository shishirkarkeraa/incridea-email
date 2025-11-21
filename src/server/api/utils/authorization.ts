
import { TRPCError } from "@trpc/server";

import type { AuthorizedUser } from "@prisma/client";
import type { TRPCContext } from "../trpc";

export const requireAuthorizedUser = async (ctx: TRPCContext): Promise<AuthorizedUser> => {
  const email = ctx.session?.user?.email;
  if (!email) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Missing email for authorization." });
  }

  const record = await ctx.db.authorizedUser.findUnique({ where: { email } });
  if (!record) {
    throw new TRPCError({ code: "FORBIDDEN", message: "You are not authorized to use this tool." });
  }

  return record;
};

export const requireAdminUser = async (ctx: TRPCContext): Promise<void> => {
  if (ctx.session?.user?.role === "ADMIN") {
    return;
  }

  throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required." });
};
