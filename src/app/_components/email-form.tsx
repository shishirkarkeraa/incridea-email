"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

import { EmailAddressField } from "~/app/_components/email-address-field";
import { api } from "~/trpc/react";
import type { RouterInputs, RouterOutputs } from "~/trpc/react";

const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_ATTACHMENTS = 5;
const MIN_BODY_HEIGHT = 220;
const REQUIRED_REPLY_TO = "incridea@nmamit.in";

type AttachmentPayload = {
  name: string;
  size: number;
  type: string;
  data: string;
};

type TemplateOption = RouterOutputs["templates"]["list"][number];
type EmailSendPayload = Omit<RouterInputs["email"]["send"], "password">;

const dedupeEmails = (values: string[]) => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result;
};

const ensureRequiredReplyTo = (values: string[]) => {
  const normalized = dedupeEmails(values);
  const hasRequired = normalized.some((entry) => entry.toLowerCase() === REQUIRED_REPLY_TO.toLowerCase());
  return hasRequired ? normalized : [REQUIRED_REPLY_TO, ...normalized];
};

type EmailFormProps = {
  defaultBody?: string;
  defaultSubject?: string;
};

export const EmailForm = ({ defaultBody, defaultSubject }: EmailFormProps) => {
  const initialSubjectValue = useMemo(
    () => defaultSubject ?? "",
    [defaultSubject],
  );
  const initialBodyValue = useMemo(() => defaultBody ?? "", [defaultBody]);
  const [subject, setSubject] = useState(initialSubjectValue);
  const [to, setTo] = useState<string[]>([]);
  const [cc, setCc] = useState<string[]>([]);
  const [bcc, setBcc] = useState<string[]>([]);
  const [replyTo, setReplyTo] = useState<string[]>(() => ensureRequiredReplyTo([REQUIRED_REPLY_TO]));
  const [body, setBody] = useState(initialBodyValue);
  const [feedback, setFeedback] = useState<null | { type: "success" | "error"; text: string }>(
    null,
  );
  const [attachments, setAttachments] = useState<AttachmentPayload[]>([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [passwordPromptOpen, setPasswordPromptOpen] = useState(false);
  const [passwordValue, setPasswordValue] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [pendingPayload, setPendingPayload] = useState<EmailSendPayload | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const sendEmailMutation = api.email.send.useMutation();
  const templatesQuery = api.templates.list.useQuery(undefined, {
    staleTime: 60 * 1000,
  });
  const authorizedUserQuery = api.authorizedUsers.current.useQuery(undefined, { staleTime: 5 * 60 * 1000 });
  const templates = templatesQuery.data ?? [];
  const mustChangePassword = authorizedUserQuery.data?.mustChangePassword ?? false;
  const [recipientResetKey, setRecipientResetKey] = useState({ to: 0, cc: 0, bcc: 0 });
  const [sentPreview, setSentPreview] = useState<EmailSendPayload | null>(null);

  useEffect(() => {
    const element = bodyRef.current;
    if (!element) return;
    element.style.height = "auto";
    const nextHeight = Math.max(element.scrollHeight, MIN_BODY_HEIGHT);
    element.style.height = `${nextHeight}px`;
  }, [body]);

  useEffect(() => {
    setReplyTo((prev) => ensureRequiredReplyTo([...prev, ...cc]));
  }, [cc]);

  const readFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result);
        } else {
          reject(new Error("Unsupported file result"));
        }
      };
      reader.onerror = () => reject(new Error("Could not read the attachment."));
      reader.readAsDataURL(file);
    });

  const handleAttachmentChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      return;
    }

    if (attachments.length + files.length > MAX_ATTACHMENTS) {
      setAttachmentError(`You can attach up to ${MAX_ATTACHMENTS} files.`);
      if (attachmentInputRef.current) {
        attachmentInputRef.current.value = "";
      }
      return;
    }

    try {
      const processed = await Promise.all(
        Array.from(files).map(async (file) => {
          if (file.size > MAX_ATTACHMENT_SIZE) {
            throw new Error(`${file.name} exceeds the 5 MB limit.`);
          }
          const dataUrl = await readFileAsDataUrl(file);
          const base64 = dataUrl.includes(",") ? dataUrl.split(",").pop() ?? "" : dataUrl;
          return {
            name: file.name,
            size: file.size,
            type: file.type || "application/octet-stream",
            data: base64,
          } satisfies AttachmentPayload;
        }),
      );

      setAttachments((prev) => [...prev, ...processed]);
      setAttachmentError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not process attachments.";
      setAttachmentError(message);
    } finally {
      if (attachmentInputRef.current) {
        attachmentInputRef.current.value = "";
      }
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, idx) => idx !== index));
    if (attachmentInputRef.current) {
      attachmentInputRef.current.value = "";
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId) {
      setBody("");
      setSubject("");
      return;
    }
    const template = templatesQuery.data?.find((item: TemplateOption) => item.id === templateId);
    if (template) {
      setBody(template.body);
      setSubject(template.subject ?? "");
    } else {
      setSubject("");
    }
  };

  const resetComposerAfterSend = () => {
    setSubject(initialSubjectValue);
    setBody(initialBodyValue);
    setSelectedTemplateId("");
    setTo([]);
    setCc([]);
    setBcc([]);
    setReplyTo(ensureRequiredReplyTo([REQUIRED_REPLY_TO]));
    setAttachments([]);
    setAttachmentError(null);
    setFeedback(null);
    setRecipientResetKey((prev) => ({
      to: prev.to + 1,
      cc: prev.cc + 1,
      bcc: prev.bcc + 1,
    }));
    if (attachmentInputRef.current) {
      attachmentInputRef.current.value = "";
    }
  };

  const handleSentPreviewClose = () => {
    resetComposerAfterSend();
    setSentPreview(null);
  };

  const closePasswordPrompt = () => {
    setPasswordPromptOpen(false);
    setPasswordValue("");
    setPendingPayload(null);
    setPasswordError(null);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    setPasswordError(null);

    if (to.length === 0) {
      setFeedback({ type: "error", text: "A primary recipient is required." });
      return;
    }

    const replyToList = ensureRequiredReplyTo([...replyTo, ...cc]);

    const payload: EmailSendPayload = {
      subject,
      body,
      to,
      cc: cc.length > 0 ? cc : undefined,
      bcc: bcc.length > 0 ? bcc : undefined,
      replyTo: replyToList,
      attachments: attachments.length > 0 ? attachments : undefined,
    };

    setPendingPayload(payload);
    setPasswordValue("");
    setPasswordPromptOpen(true);
  };

  const executeSend = async () => {
    if (!pendingPayload) {
      setPasswordError("Please resubmit the form.");
      return;
    }
    if (!passwordValue.trim()) {
      setPasswordError("Password is required.");
      return;
    }

    try {
      await sendEmailMutation.mutateAsync({
        ...pendingPayload,
        password: passwordValue,
      });
      setSentPreview(pendingPayload);
      setFeedback(null);
      closePasswordPrompt();
    } catch (error) {
      console.error("Failed to send email", error);
      const message =
        error instanceof Error
          ? error.message
          : "We could not send the email. Please verify the details and try again.";
      setPasswordError(message);
      if (!message.toLowerCase().includes("password")) {
        setFeedback({
          type: "error",
          text: message,
        });
      }
    }
  };

  return (
    <div className="grid w-full gap-8 xl:grid-cols-2">
      <form
        onSubmit={handleSubmit}
        className="flex w-full flex-col gap-6 rounded-2xl border border-slate-800 bg-slate-950/60 p-8 shadow-2xl shadow-sky-950/40 backdrop-blur"
      >
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-semibold text-slate-50">Compose Email</h2>
          <p className="text-sm text-slate-400">
            Authenticated messages are delivered via secure SMTP with the Incridea-branded template.
          </p>
        </div>

        {authorizedUserQuery.isError && (
          <div className="rounded-lg border border-rose-600/40 bg-rose-600/10 px-4 py-3 text-sm text-rose-100">
            We could not verify your sender profile. Refresh the page before sending.
          </div>
        )}

        {mustChangePassword && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-50">
            You are still using a temporary password. Use the Change Password button near the Sign out link to update it.
          </div>
        )}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-slate-100">Template</label>
          <select
            value={selectedTemplateId}
            onChange={(event) => handleTemplateSelect(event.target.value)}
            disabled={templatesQuery.isLoading || templates.length === 0}
            className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="">No template</option>
            {templates.map((template: TemplateOption) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <span>
              {templatesQuery.isLoading
                ? "Loading templates…"
                : templates.length === 0
                  ? "No templates available yet."
                  : "Selecting a template will replace the current body and subject."}
            </span>
            {templates.length > 0 && (
              <button
                type="button"
                onClick={() => handleTemplateSelect("")}
                className="text-xs font-semibold text-sky-300 transition hover:text-sky-100 disabled:opacity-50"
                disabled={!selectedTemplateId && body.length === 0}
              >
                Clear selection
              </button>
            )}
          </div>
        </div>

        <EmailAddressField
          key={`to-${recipientResetKey.to}`}
          label="To"
          addresses={to}
          onChange={setTo}
          placeholder="Type an email and press Enter"
        />

        <EmailAddressField
          key={`cc-${recipientResetKey.cc}`}
          label="CC"
          addresses={cc}
          onChange={setCc}
          placeholder="Add CC recipients"
        />

        <EmailAddressField
          key={`bcc-${recipientResetKey.bcc}`}
          label="BCC"
          addresses={bcc}
          onChange={setBcc}
          placeholder="Add BCC recipients"
        />

        <EmailAddressField
          label="Reply-To"
          addresses={replyTo}
          onChange={(value) => setReplyTo(ensureRequiredReplyTo(value))}
          placeholder="Reply address"
        />
        <p className="text-xs text-slate-500">Always includes incridea@nmamit.in and any CC recipients.</p>

        

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-slate-100">Subject</label>
          <input
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
            type="text"
            maxLength={120}
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-slate-100">Body</label>
          <textarea
            ref={bodyRef}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            className="min-h-[220px] resize-none overflow-hidden rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-3 text-sm leading-relaxed text-slate-100 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
            spellCheck={false}
            required
            maxLength={5000}
          />
          <p className="text-xs text-slate-500">
            Tip: personalise the template before sending. Separate recipients with commas if needed.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-slate-100">Attachment (optional)</label>
          <input
            ref={attachmentInputRef}
            type="file"
            multiple
            onChange={handleAttachmentChange}
            className="block w-full cursor-pointer rounded-lg border border-dashed border-slate-700 bg-slate-900/40 px-4 py-2 text-sm text-slate-300 file:mr-4 file:cursor-pointer file:rounded-md file:border-0 file:bg-slate-800 file:px-3 file:py-1 file:text-sm file:font-medium file:text-slate-100 hover:border-slate-600"
          />
          <div className="flex flex-col gap-1 text-xs text-slate-500">
            <span>Attach up to {MAX_ATTACHMENTS} files (5 MB each). Delivered as-is to the recipient.</span>
            {attachmentError && <span className="text-rose-400">{attachmentError}</span>}
          </div>
          {attachments.length > 0 && (
            <ul className="space-y-2">
              {attachments.map((file, index) => (
                <li
                  key={`${file.name}-${index}`}
                  className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-2 text-sm text-slate-100"
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{file.name}</span>
                    <span className="text-xs text-slate-400">{formatBytes(file.size)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAttachment(index)}
                    className="text-xs font-semibold text-sky-300 transition hover:text-sky-100"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {feedback && (
          <div
            className={`rounded-lg border px-4 py-3 text-sm ${
              feedback.type === "success"
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                : "border-rose-500/40 bg-rose-500/10 text-rose-200"
            }`}
          >
            {feedback.text}
          </div>
        )}

        <button
          type="submit"
          disabled={sendEmailMutation.isPending}
          className="inline-flex items-center justify-center rounded-lg bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-900/50 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 disabled:cursor-not-allowed disabled:bg-slate-600"
        >
          {sendEmailMutation.isPending ? "Sending…" : "Send Email"}
        </button>
      </form>

      <EmailPreview subject={subject} body={body} attachments={attachments} />

      {passwordPromptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-6 py-8">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-white">Confirm Your Identity</h3>
            <p className="mt-2 text-sm text-slate-400">
              Enter your mailer password to authorize this send.
            </p>
            <input
              type="password"
              value={passwordValue}
              onChange={(event) => setPasswordValue(event.target.value)}
              className="mt-4 w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-white focus:border-sky-500 focus:outline-none"
              placeholder="Password"
              autoFocus
            />
            {passwordError && (
              <p className="mt-2 text-sm text-rose-300">{passwordError}</p>
            )}
            <div className="mt-6 flex justify-end gap-3 text-sm">
              <button
                type="button"
                onClick={closePasswordPrompt}
                className="rounded-lg border border-slate-700 px-4 py-2 text-slate-200 hover:border-slate-500"
                disabled={sendEmailMutation.isPending}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeSend}
                disabled={sendEmailMutation.isPending}
                className="rounded-lg bg-sky-500 px-5 py-2 font-semibold text-white disabled:opacity-60"
              >
                {sendEmailMutation.isPending ? "Sending…" : "Send now"}
              </button>
            </div>
          </div>
        </div>
      )}

      {sentPreview && (
        <SentEmailModal payload={sentPreview} onClose={handleSentPreviewClose} />
      )}
    </div>
  );
};

type EmailPreviewProps = {
  subject: string;
  body: string;
  attachments: AttachmentPayload[];
  variant?: "default" | "compact";
};

const EmailPreview = ({ subject, body, attachments, variant = "default" }: EmailPreviewProps) => {
  const lines = body.split(/\r?\n/);
  const hasBody = lines.some((line) => line.trim().length > 0);
  const containerClasses =
    variant === "compact"
      ? "mx-auto max-w-xl gap-4 p-5 text-sm"
      : "mx-auto h-full w-full max-w-3xl gap-6 p-8";
  const subjectPadding = variant === "compact" ? "p-3.5" : "p-5";
  const logoWrapperPadding = variant === "compact" ? "p-4" : "p-6";
  const logoSize = variant === "compact" ? 72 : 120;
  const bodyPadding = variant === "compact" ? "px-4 py-5" : "px-7 py-8";
  const attachmentsPadding = variant === "compact" ? "p-3.5" : "p-5";
  const subjectFontClass = variant === "compact" ? "text-base" : "text-lg";
  const bodyTextClass = variant === "compact" ? "text-[13px]" : "text-sm";
  const attachmentMetaClass = variant === "compact" ? "text-[11px]" : "text-xs";

  return (
    <div
      className={`flex flex-col rounded-2xl border border-slate-800 bg-slate-950/60 shadow-2xl shadow-sky-950/30 backdrop-blur ${containerClasses}`}
    >
      <div className="flex flex-col gap-4">
        <div className={`rounded-2xl border border-slate-800/60 bg-slate-950/80 ${subjectPadding}`}>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Subject</p>
          <p className={`mt-1 font-medium text-slate-50 ${subjectFontClass}`}>
            {subject || "Untitled message"}
          </p>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-800/60 bg-slate-950/80">
          <div
            className={`flex flex-col items-center gap-3 bg-linear-to-br from-slate-950 via-slate-900 to-slate-800 text-center text-white ${logoWrapperPadding}`}
          >
            <Image
              src="https://idtisg3yhk.ufs.sh/f/EfXdVhpoNtwlAtbnqEeXiCHRSzQv8DJPLwYBfc0lb2jqhnAk"
              alt="Incridea logo"
                width={logoSize}
                height={logoSize}
              className="p-2 shadow-xl shadow-slate-900/40"
                style={{ height: logoSize, width: "auto" }}
            />
          </div>

          <div className={`space-y-3 bg-slate-50 leading-relaxed text-slate-700 ${bodyPadding} ${bodyTextClass}`}>
            {hasBody ? (
              lines.map((line, index) =>
                line.trim().length === 0 ? (
                  <span key={`line-${index}`} className="block h-4" />
                ) : (
                  <p key={`line-${index}`}>{line}</p>
                ),
              )
            ) : (
              <p className="text-slate-400">Start typing your message to see a live preview.</p>
            )}
          </div>
        </div>

        {attachments.length > 0 && (
          <div
            className={`rounded-2xl border border-slate-800/60 bg-slate-950/80 text-sm text-slate-100 ${attachmentsPadding}`}
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Attachments</p>
            <ul className="mt-2 space-y-2">
              {attachments.map((file, index) => (
                <li key={`${file.name}-${index}`} className="flex items-center justify-between">
                  <span className="font-medium">{file.name}</span>
                  <span className={`${attachmentMetaClass} text-slate-400`}>{formatBytes(file.size)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

type SentEmailModalProps = {
  payload: EmailSendPayload;
  onClose: () => void;
};

const SentEmailModal = ({ payload, onClose }: SentEmailModalProps) => {
  const { subject, body, attachments, to, cc, bcc, replyTo } = payload;
  const recipientGroups = [
    { label: "To", value: to },
    { label: "CC", value: cc },
    { label: "BCC", value: bcc },
    { label: "Reply-To", value: replyTo },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 px-4 py-6 text-white backdrop-blur">
      <div className="w-full max-w-3xl space-y-5 rounded-3xl border border-slate-800 bg-slate-950/80 p-5 shadow-2xl shadow-slate-950/60">
        <div className="flex flex-col gap-1 text-center">
          <p className="text-sm font-semibold text-emerald-300">Email sent successfully</p>
          <h3 className="text-2xl font-semibold text-white">Delivery preview</h3>
          <p className="text-sm text-slate-400">Review the exact message that was delivered.</p>
        </div>

        <div className="space-y-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm">
          {recipientGroups.some((group) => group.value && group.value.length > 0) ? (
            recipientGroups.map((group) =>
              group.value && group.value.length > 0 ? (
                <div key={group.label} className="flex flex-col gap-1 sm:flex-row sm:items-start">
                  <span className="w-16 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {group.label}
                  </span>
                  <span className="flex-1 text-slate-100">{group.value.join(", ")}</span>
                </div>
              ) : null,
            )
          ) : (
            <p className="text-slate-400">Recipient information unavailable.</p>
          )}
        </div>

        <EmailPreview subject={subject} body={body} attachments={attachments ?? []} variant="compact" />

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-600 px-5 py-2 text-sm font-semibold text-slate-100 transition hover:border-slate-400"
          >
            Close &amp; clear
          </button>
        </div>
      </div>
    </div>
  );
};

const formatBytes = (bytes: number) => {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};
