"use client";

import { useState, type FormEvent } from "react";

import { api } from "~/trpc/react";

type ChangePasswordButtonProps = {
  mustChangePassword?: boolean;
};

export const ChangePasswordButton = ({ mustChangePassword = false }: ChangePasswordButtonProps) => {
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [inlineMessage, setInlineMessage] = useState<null | { type: "error" | "success"; text: string }>(null);

  const changePasswordMutation = api.authorizedUsers.changePassword.useMutation();

  const resetForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const closeModal = () => {
    if (changePasswordMutation.isPending) return;
    setOpen(false);
    setInlineMessage(null);
    resetForm();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      setInlineMessage({ type: "error", text: "New passwords must match." });
      return;
    }

    try {
      await changePasswordMutation.mutateAsync({ currentPassword, newPassword });
      setInlineMessage({ type: "success", text: "Password updated successfully." });
      resetForm();
      setOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not update password.";
      setInlineMessage({ type: "error", text: message });
    }
  };

  return (
    <div className="flex flex-col gap-2 text-sm text-slate-300">
      <button
        type="button"
        onClick={() => {
          setInlineMessage(null);
          setOpen(true);
        }}
        className="inline-flex items-center justify-center rounded-full border border-slate-700 px-5 py-2 font-semibold text-slate-100 transition hover:border-slate-500 hover:text-white"
      >
        Change password
      </button>
      {mustChangePassword && (
        <p className="text-xs text-amber-300">A temporary password is active. Please update it.</p>
      )}
      {inlineMessage?.type === "success" && (
        <p className="text-xs text-emerald-300">{inlineMessage.text}</p>
      )}
      {inlineMessage?.type === "error" && !open && (
        <p className="text-xs text-rose-300">{inlineMessage.text}</p>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-6 py-8 text-white backdrop-blur"
          style={{ zIndex: 70 }}
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-white">Update Password</h3>
            <p className="mt-2 text-sm text-slate-400">Enter your current password and choose a new one.</p>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Current password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  New password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
                  required
                  minLength={8}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Confirm new password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
                  required
                  minLength={8}
                />
              </div>

              {inlineMessage?.type === "error" && open && (
                <p className="text-xs text-rose-300">{inlineMessage.text}</p>
              )}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg border border-slate-700 px-4 py-2 text-slate-200 hover:border-slate-500"
                  disabled={changePasswordMutation.isPending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={changePasswordMutation.isPending}
                  className="rounded-lg bg-sky-500 px-5 py-2 font-semibold text-white disabled:opacity-60"
                >
                  {changePasswordMutation.isPending ? "Saving…" : "Save password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
