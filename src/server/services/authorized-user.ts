import { db } from "~/server/db";

export type AuthorizedUserSummary = {
  id: string;
  email: string;
  mustChangePassword: boolean;
  createdAt: Date;
};

export const getAuthorizedUserByEmail = async (email: string): Promise<AuthorizedUserSummary | null> => {
  return db.authorizedUser.findUnique({
    where: { email },
    select: { id: true, email: true, mustChangePassword: true, createdAt: true },
  });
};
