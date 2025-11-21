-- Drop the role column since admin privileges now come from NextAuth user role.
ALTER TABLE "AuthorizedUser" DROP COLUMN "role";
