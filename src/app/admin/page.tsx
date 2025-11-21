import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminDashboard } from "~/app/admin/_components/admin-dashboard";
import { auth } from "~/server/auth";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/api/auth/signin");
  }

  if (session.user.role !== "ADMIN") {
    return (
      <main className="min-h-screen bg-slate-950 pb-24 pt-24 text-slate-100">
        <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-6 px-6 text-center">
          <h1 className="text-3xl font-bold">Restricted Area</h1>
          <p className="text-sm text-slate-400">Only administrator accounts may view this page.</p>
          <Link href="/" className="text-sky-400 hover:text-sky-200">
            Return to the mailer
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 pb-24 text-slate-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 pt-20">
        <header className="rounded-3xl border border-slate-800 bg-slate-950/70 p-10 shadow-2xl shadow-sky-950/30 backdrop-blur">
          <p className="text-sm uppercase tracking-wider text-sky-400">Admin Panel</p>
          <h1 className="mt-3 text-4xl font-bold text-white">Incridea Email Operations</h1>
          <p className="mt-2 text-sm text-slate-300">Review email activity, manage templates, and control which users can send mail.</p>
          <div className="mt-4 text-xs text-slate-400">
            Signed in as {session.user.email} · Role: {session.user.role}
          </div>
        </header>

        <AdminDashboard />
      </div>
    </main>
  );
}
