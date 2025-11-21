"use client";

import { useState } from "react";

import { api, type RouterOutputs } from "~/trpc/react";

type UserLogRecord = RouterOutputs["email"]["myLogs"][number];

export const EmailsSentButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const logsQuery = api.email.myLogs.useQuery({ limit: 50 }, { enabled: isOpen });
  const logs: UserLogRecord[] = logsQuery.data ?? [];

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center justify-center rounded-full border border-slate-700 px-5 py-2 font-semibold text-sky-200 transition hover:border-slate-500 hover:text-white"
      >
        Emails Sent
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-6 text-white backdrop-blur"
          style={{ zIndex: 200 }}
          onClick={() => setIsOpen(false)}
        >
          <div
            className="w-full max-w-3xl rounded-3xl border border-slate-800 bg-slate-900/90 p-6 text-slate-100 shadow-2xl shadow-sky-900/50"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-400">History</p>
                <h3 className="text-xl font-semibold text-white">Emails you have sent</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-300 hover:border-slate-500 hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="mt-4 max-h-[440px] overflow-y-auto pr-1">
              {logsQuery.isLoading && <p className="text-sm text-slate-300">Loading your recent emails…</p>}
              {logsQuery.isError && (
                <p className="text-sm text-rose-300">Could not load your email history. Please try again.</p>
              )}
              {!logsQuery.isLoading && !logsQuery.isError && logs.length === 0 && (
                <p className="text-sm text-slate-400">You haven&apos;t sent any emails yet.</p>
              )}

              {!logsQuery.isLoading && !logsQuery.isError && logs.length > 0 && (
                <ul className="flex flex-col gap-4">
                  {logs.map((log) => (
                    <li key={log.id} className="rounded-2xl border border-slate-800/60 bg-slate-950/40 p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-white">{log.subject}</p>
                          <p className="text-xs text-slate-400">{new Date(log.createdAt).toLocaleString()}</p>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                            log.hasAttachment
                              ? "bg-emerald-500/20 text-emerald-100"
                              : "bg-slate-800/80 text-slate-300"
                          }`}
                        >
                          {log.hasAttachment ? "Attachment" : "No attachment"}
                        </span>
                      </div>
                      <p className="mt-3 whitespace-pre-line text-xs text-slate-300">{log.body}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
