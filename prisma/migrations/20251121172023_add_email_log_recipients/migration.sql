-- AlterTable
ALTER TABLE "EmailLog" ADD COLUMN     "bccRecipients" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "ccRecipients" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "toRecipients" TEXT[] DEFAULT ARRAY[]::TEXT[];
