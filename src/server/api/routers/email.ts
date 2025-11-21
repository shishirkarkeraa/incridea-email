/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { TRPCError } from "@trpc/server";
import { compare } from "bcryptjs";
import * as nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import { z } from "zod";

import { env } from "~/env";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { requireAdminUser, requireAuthorizedUser } from "~/server/api/utils/authorization";

const transportOptions: SMTPTransport.Options = {
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_SECURE,
  requireTLS: env.SMTP_REQUIRE_TLS,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASSWORD,
  },
  tls: {
    minVersion: env.SMTP_TLS_MIN_VERSION,
    rejectUnauthorized: env.SMTP_TLS_REJECT_UNAUTHORIZED,
    servername: env.SMTP_HOST,
  },
};

const transporter: Transporter<SMTPTransport.SentMessageInfo, SMTPTransport.Options> =
  nodemailer.createTransport(transportOptions);
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024; // 5 MB

const LOGO_URL = "https://idtisg3yhk.ufs.sh/f/EfXdVhpoNtwlAtbnqEeXiCHRSzQv8DJPLwYBfc0lb2jqhnAk";

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const renderEmailHtml = (body: string) => {
  const safeBody = escapeHtml(body).replace(/\n/g, "<br />");

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  </head>
  <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f1f5f9; padding: 40px 0;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 45px rgba(15, 23, 42, 0.12);">
            <tr>
              <td align="center" style="padding: 32px 24px;">
                <img src="${LOGO_URL}" alt="Incridea" height="72" style="display: block; border: 0; height: 96px; width: auto;" />

              </td>
            </tr>
            <tr>
              <td style="padding: 32px;">
                <div style="font-size: 16px; line-height: 1.6; color: #1e293b;">
                  ${safeBody}
                </div>
              </td>
            </tr>
            <tr>
              <td style="background-color: #f8fafc; padding: 20px 32px; text-align: center; font-size: 12px; color: #64748b;">
                <p style="margin: 0;">Team Incridea</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
};

const attachmentSchema = z.object({
  name: z.string().trim().min(1).max(120),
  type: z.string().trim().min(1).max(120),
  size: z.number().int().positive().max(MAX_ATTACHMENT_BYTES),
  data: z.string().min(1),
});

export const emailRouter = createTRPCRouter({
  send: protectedProcedure
    .input(
      z.object({
        to: z.array(z.string().email()).min(1, "At least one recipient is required"),
        cc: z.array(z.string().email()).optional(),
        bcc: z.array(z.string().email()).optional(),
        subject: z.string().min(1, "Subject is required").max(120),
        body: z.string().min(1, "Body cannot be empty").max(5000),
        attachments: z.array(attachmentSchema).max(5).optional(),
        password: z.string().min(1, "Password is required").max(128),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { to, cc, bcc, subject, body, attachments: userAttachments, password } = input;
      const authorizedUser = await requireAuthorizedUser(ctx);
      const isValidPassword = await compare(password, authorizedUser.passwordHash);
      if (!isValidPassword) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Incorrect password." });
      }
      const html = renderEmailHtml(body);

      const attachments: NonNullable<nodemailer.SendMailOptions["attachments"]> = [];

      if (userAttachments && userAttachments.length > 0) {
        for (const file of userAttachments) {
          attachments.push({
            filename: file.name,
            content: Buffer.from(file.data, "base64"),
            contentType: file.type,
          });
        }
      }

      const fromName = env.EMAIL_FROM_NAME ?? ctx.session.user.name ?? "Incridea Mailer";

      await transporter.sendMail({
        from: {
          name: fromName,
          address: env.EMAIL_FROM_ADDRESS,
        },
        to: to.join(","),
        cc: cc && cc.length > 0 ? cc.join(",") : undefined,
        bcc: bcc && bcc.length > 0 ? bcc.join(",") : undefined,
        subject,
        html,
        replyTo: ctx.session.user.email ?? env.EMAIL_FROM_ADDRESS,
        attachments,
      });

      await ctx.db.emailLog.create({
        data: {
          userEmail: ctx.session.user.email ?? authorizedUser.email,
          subject,
          body,
          hasAttachment: Boolean(userAttachments && userAttachments.length > 0),
        },
      });

      return { success: true };
    }),

  logs: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(100).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      await requireAdminUser(ctx);
      const limit = input?.limit ?? 50;
      const logs = await ctx.db.emailLog.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
      });
      return logs;
    }),
});
