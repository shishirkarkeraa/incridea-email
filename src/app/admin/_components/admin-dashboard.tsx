
 
 
"use client";

import { useState } from "react";

import type { AuthorizedUser, EmailLog, Template } from "@prisma/client";
import { api } from "~/trpc/react";

const tabs = [
  { key: "emails", label: "Emails Sent" },
  { key: "templates", label: "Templates" },
  { key: "users", label: "Authorized Users" },
] as const;

type TabKey = (typeof tabs)[number]["key"];

type EmailLogRecord = EmailLog;
type TemplateRecord = Pick<Template, "id" | "name" | "body" | "updatedAt">;
type AuthorizedUserRecord = Pick<AuthorizedUser, "id" | "email" | "role" | "mustChangePassword" | "createdAt">;

export const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState<TabKey>("emails");

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap gap-3">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-full border px-5 py-2 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 ${
              activeTab === tab.key
                ? "border-sky-500 bg-sky-500/10 text-sky-50"
                : "border-slate-700 bg-slate-900/50 text-slate-300 hover:border-slate-500 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <section className="rounded-3xl border border-slate-800 bg-slate-950/70 p-8 shadow-2xl shadow-sky-950/30 backdrop-blur">
        {activeTab === "emails" && <EmailsTab />}
        {activeTab === "templates" && <TemplatesTab />}
        {activeTab === "users" && <UsersTab />}
      </section>
    </div>
  );
};

const EmailsTab = () => {
  const logsQuery = api.email.logs.useQuery({ limit: 100 }, { refetchInterval: 60_000 });
  const logs: EmailLogRecord[] = logsQuery.data ?? [];

  if (logsQuery.isLoading) {
    return <p className="text-sm text-slate-300">Loading recent deliveries…</p>;
  }

  if (logsQuery.isError) {
    return <p className="text-sm text-rose-300">Could not load email logs. Please try again.</p>;
  }

  if (logs.length === 0) {
    return <p className="text-sm text-slate-400">No email activity has been recorded yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-wider text-slate-400">
            <th className="px-3 py-2">Sent At</th>
            <th className="px-3 py-2">Sender</th>
            <th className="px-3 py-2">Subject</th>
            <th className="px-3 py-2">Body Preview</th>
            <th className="px-3 py-2 text-center">Attachment</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-900/70">
          {logs.map((log) => (
            <tr key={log.id} className="text-slate-100">
              <td className="whitespace-nowrap px-3 py-3 text-xs text-slate-400">
                {new Date(log.createdAt).toLocaleString()}
              </td>
              <td className="px-3 py-3 text-sm">{log.userEmail}</td>
              <td className="px-3 py-3 font-medium">{log.subject}</td>
              <td className="px-3 py-3 text-xs text-slate-300">
                {log.body.length > 120 ? `${log.body.slice(0, 120)}…` : log.body}
              </td>
              <td className="px-3 py-3 text-center">
                {log.hasAttachment ? (
                  <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-200">
                    Yes
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-400">
                    No
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const TemplatesTab = () => {
  const templatesQuery = api.templates.list.useQuery(undefined, { refetchInterval: 120_000 });
  const templates: TemplateRecord[] = templatesQuery.data ?? [];
  const utils = api.useUtils();
  const createTemplateMutation = api.templates.create.useMutation({
    onSuccess: async () => {
      await utils.templates.list.invalidate();
    },
  });
  const updateTemplateMutation = api.templates.update.useMutation({
    onSuccess: async () => {
      await utils.templates.list.invalidate();
    },
  });
  const deleteTemplateMutation = api.templates.remove.useMutation({
    onSuccess: async () => {
      await utils.templates.list.invalidate();
    },
  });

  const [newTemplate, setNewTemplate] = useState({ name: "", body: "" });
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editingState, setEditingState] = useState({ name: "", body: "" });

  const startEdit = (template: TemplateRecord) => {
    setEditingTemplateId(template.id);
    setEditingState({ name: template.name, body: template.body });
  };

  const resetEditState = () => {
    setEditingTemplateId(null);
    setEditingState({ name: "", body: "" });
  };

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newTemplate.name || !newTemplate.body) return;
    await createTemplateMutation.mutateAsync(newTemplate);
    setNewTemplate({ name: "", body: "" });
  };

  const handleUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingTemplateId) return;
    await updateTemplateMutation.mutateAsync({
      id: editingTemplateId,
      name: editingState.name,
      body: editingState.body,
    });
    resetEditState();
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm("Delete this template? This cannot be undone.");
    if (!confirmed) return;
    await deleteTemplateMutation.mutateAsync({ id });
    if (editingTemplateId === id) {
      resetEditState();
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <form onSubmit={handleCreate} className="rounded-2xl border border-slate-800/60 bg-slate-900/40 p-5">
        <h3 className="text-lg font-semibold text-white">Create Template</h3>
        <p className="mb-4 text-sm text-slate-400">Provide a friendly name and default body. Users can still modify content before sending.</p>
        <div className="grid gap-4 lg:grid-cols-2">
          <input
            value={newTemplate.name}
            onChange={(event) => setNewTemplate((prev) => ({ ...prev, name: event.target.value }))}
            placeholder="Template name"
            className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
            maxLength={80}
            required
          />
          <textarea
            value={newTemplate.body}
            onChange={(event) => setNewTemplate((prev) => ({ ...prev, body: event.target.value }))}
            placeholder="Template body"
            className="min-h-[120px] rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none lg:col-span-2"
            maxLength={5000}
            required
          />
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="submit"
            disabled={createTemplateMutation.isPending}
            className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {createTemplateMutation.isPending ? "Creating…" : "Save Template"}
          </button>
        </div>
      </form>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Existing Templates</h3>
        {templatesQuery.isLoading && <p className="text-sm text-slate-300">Loading templates…</p>}
        {templatesQuery.isError && <p className="text-sm text-rose-300">Could not fetch templates.</p>}
        {!templatesQuery.isLoading && templates.length === 0 && (
          <p className="text-sm text-slate-400">No templates yet.</p>
        )}

        <div className="grid gap-4">
          {templates.map((template: TemplateRecord) => (
            <div key={template.id} className="rounded-2xl border border-slate-800/60 bg-slate-900/40 p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h4 className="text-base font-semibold text-white">{template.name}</h4>
                  <p className="text-xs uppercase text-slate-500">Updated {new Date(template.updatedAt).toLocaleString()}</p>
                </div>
                <div className="flex gap-2 text-sm">
                  <button
                    type="button"
                    onClick={() => startEdit(template)}
                    className="rounded-lg border border-slate-700 px-3 py-1 text-slate-200 hover:border-sky-400 hover:text-white"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(template.id)}
                    className="rounded-lg border border-rose-600/40 px-3 py-1 text-rose-200 hover:border-rose-500 hover:text-rose-100"
                    disabled={deleteTemplateMutation.isPending}
                  >
                    Delete
                  </button>
                </div>
              </div>

              <p className="mt-3 whitespace-pre-line rounded-lg bg-slate-950/50 p-4 text-sm text-slate-200">
                {template.body}
              </p>

              {editingTemplateId === template.id && (
                <form onSubmit={handleUpdate} className="mt-4 space-y-3 rounded-lg border border-slate-800/70 bg-slate-950/50 p-4">
                  <input
                    value={editingState.name}
                    onChange={(event) => setEditingState((prev) => ({ ...prev, name: event.target.value }))}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
                    maxLength={80}
                    required
                  />
                  <textarea
                    value={editingState.body}
                    onChange={(event) => setEditingState((prev) => ({ ...prev, body: event.target.value }))}
                    className="min-h-40 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
                    maxLength={5000}
                    required
                  />
                  <div className="flex items-center gap-3">
                    <button
                      type="submit"
                      disabled={updateTemplateMutation.isPending}
                      className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      {updateTemplateMutation.isPending ? "Saving…" : "Update Template"}
                    </button>
                    <button type="button" onClick={resetEditState} className="text-sm text-slate-400">
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const UsersTab = () => {
  const utils = api.useUtils();
  const usersQuery = api.authorizedUsers.list.useQuery(undefined, { refetchInterval: 60_000 });
  const users: AuthorizedUserRecord[] = usersQuery.data ?? [];
  const createUserMutation = api.authorizedUsers.create.useMutation({
    onSuccess: async () => {
      await utils.authorizedUsers.list.invalidate();
    },
  });
  const resetPasswordMutation = api.authorizedUsers.resetPassword.useMutation({
    onSuccess: async () => {
      await utils.authorizedUsers.list.invalidate();
    },
  });
  const removeUserMutation = api.authorizedUsers.remove.useMutation({
    onSuccess: async () => {
      await utils.authorizedUsers.list.invalidate();
    },
  });

  const [formState, setFormState] = useState({ email: "", password: "", role: "USER" as "USER" | "ADMIN" });

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await createUserMutation.mutateAsync(formState);
    setFormState({ email: "", password: "", role: "USER" });
  };

  const handleResetPassword = async (user: AuthorizedUserRecord) => {
    const nextPassword = window.prompt(`Enter a new password for ${user.email}`);
    if (!nextPassword) return;
    await resetPasswordMutation.mutateAsync({ id: user.id, password: nextPassword });
  };

  const handleRemove = async (user: AuthorizedUserRecord) => {
    const confirmed = window.confirm(`Remove ${user.email} from authorized users?`);
    if (!confirmed) return;
    await removeUserMutation.mutateAsync({ id: user.id });
  };

  const badgeClass = (role: string) =>
    role === "ADMIN"
      ? "bg-purple-500/20 text-purple-200"
      : "bg-slate-800 text-slate-300";

  return (
    <div className="flex flex-col gap-8">
      <form onSubmit={handleCreate} className="rounded-2xl border border-slate-800/60 bg-slate-900/40 p-5">
        <h3 className="text-lg font-semibold text-white">Add Authorized User</h3>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <input
            type="email"
            value={formState.email}
            onChange={(event) => setFormState((prev) => ({ ...prev, email: event.target.value }))}
            placeholder="user@example.com"
            className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
            required
          />
          <input
            type="text"
            value={formState.password}
            onChange={(event) => setFormState((prev) => ({ ...prev, password: event.target.value }))}
            placeholder="Temporary password"
            className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
            required
            minLength={8}
          />
          <select
            value={formState.role}
            onChange={(event) => setFormState((prev) => ({ ...prev, role: event.target.value as "USER" | "ADMIN" }))}
            className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
          >
            <option value="USER">Standard user</option>
            <option value="ADMIN">Administrator</option>
          </select>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="submit"
            disabled={createUserMutation.isPending}
            className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {createUserMutation.isPending ? "Creating…" : "Add User"}
          </button>
        </div>
      </form>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Authorized Accounts</h3>
        {usersQuery.isLoading && <p className="text-sm text-slate-300">Loading users…</p>}
        {usersQuery.isError && <p className="text-sm text-rose-300">Could not load users.</p>}
        {!usersQuery.isLoading && users.length === 0 && (
          <p className="text-sm text-slate-400">No authorized users yet.</p>
        )}

        <div className="grid gap-4">
          {users.map((user: AuthorizedUserRecord) => (
            <div key={user.id} className="rounded-2xl border border-slate-800/60 bg-slate-900/40 p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-base font-semibold text-white">{user.email}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    <span className={`rounded-full px-3 py-1 font-semibold ${badgeClass(user.role)}`}>
                      {user.role}
                    </span>
                    {user.mustChangePassword && (
                      <span className="rounded-full bg-amber-500/20 px-3 py-1 font-semibold text-amber-100">
                        Must change password
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    Added {new Date(user.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-sm">
                  <button
                    type="button"
                    onClick={() => handleResetPassword(user)}
                    className="rounded-lg border border-slate-700 px-3 py-1 text-slate-200 hover:border-sky-400 hover:text-white"
                    disabled={resetPasswordMutation.isPending}
                  >
                    Reset password
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(user)}
                    className="rounded-lg border border-rose-600/40 px-3 py-1 text-rose-200 hover:border-rose-500 hover:text-rose-100"
                    disabled={removeUserMutation.isPending}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
