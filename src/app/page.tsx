
import Link from "next/link";

import { ChangePasswordButton } from "~/app/_components/change-password-button";
import { EmailForm } from "~/app/_components/email-form";
import { EmailsSentButton } from "~/app/_components/emails-sent-button";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

export default async function Home() {
  const session = await auth();
  const userName = session?.user?.name ?? session?.user?.email ?? "Member";
  const authorizedUser = session?.user?.email
    ? await db.authorizedUser.findUnique({ where: { email: session.user.email } })
    : null;
  const isAuthorized = Boolean(authorizedUser);

  return (
    <main className="min-h-screen bg-slate-950 pb-24 text-slate-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 pt-24">
        <header className="flex flex-col gap-6 rounded-3xl border border-slate-800 bg-slate-950/70 p-10 shadow-2xl shadow-sky-950/30 backdrop-blur">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-wider text-sky-400">incridea@nmamit.in</p>
              <h1 className="mt-1 text-4xl font-bold text-white md:text-5xl">Incridea Mailer</h1>
              <p className="mt-3 max-w-2xl text-base text-slate-300">
                Draft and deliver official communications with a single, secure workflow. Authenticated members can send beautifully formatted emails through the Incridea SMTP service.
              </p>
            </div>
            <div className="flex flex-col items-start gap-3 text-sm text-slate-300">
              {session?.user ? (
                <>
                  <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-4 py-1 text-sky-100">
                    {userName}
                  </span>
                  <Link
                    href="/api/auth/signout"
                    className="inline-flex items-center justify-center rounded-full border border-slate-700 px-5 py-2 font-semibold text-sky-200 transition hover:border-slate-500 hover:text-white"
                  >
                    Sign out
                  </Link>
                  {isAuthorized && (
                    <>
                      <ChangePasswordButton mustChangePassword={authorizedUser?.mustChangePassword ?? false} />
                      <EmailsSentButton />
                    </>
                  )}
                </>
              ) : (
                <>
                  <span className="rounded-full border border-slate-700 bg-slate-900/60 px-4 py-1">You need to authenticate to send email.</span>
                  <Link
                    href="/api/auth/signin"
                    className="inline-flex items-center justify-center rounded-full border border-sky-500/20 px-5 py-2 text-sm font-semibold text-sky-200 transition hover:border-sky-500/40 hover:bg-sky-500/10"
                  >
                    Sign in with your account
                  </Link>
                </>
              )}
            </div>
          </div>
        </header>

        {session?.user ? (
          isAuthorized ? (
            <EmailForm />
          ) : (
            <section className="rounded-3xl border border-amber-600/40 bg-amber-950/40 p-10 text-center shadow-2xl shadow-amber-900/30 backdrop-blur">
              <h2 className="text-2xl font-semibold text-white">Awaiting Authorization</h2>
              <p className="mt-4 text-sm text-amber-100/80">
                You are signed in as {session.user.email}. An administrator must add your email to the authorized
                senders list before you can compose messages.
              </p>
              <p className="mt-3 text-xs text-amber-100/70">Contact the communications team if you believe this is an error.</p>
            </section>
          )
        ) : (
          <section className="rounded-3xl border border-slate-800 bg-slate-950/70 p-10 text-center shadow-2xl shadow-sky-950/30 backdrop-blur">
            <h2 className="text-2xl font-semibold text-white">Access Restricted</h2>
            <p className="mt-4 text-sm text-slate-300">
              Please sign in with your authorised account to prepare and send official Incridea communications.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
