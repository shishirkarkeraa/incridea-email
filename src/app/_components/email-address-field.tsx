"use client";

import { useMemo, useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";

const DEFAULT_DOMAIN_SUGGESTIONS = ["gmail.com", "nmamit.in", "nitte.edu.in"] as const;

const isValidEmail = (value: string) => /[^\s@]+@[^\s@]+\.[^\s@]+/.test(value);

export type EmailAddressFieldProps = {
  label: string;
  addresses: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  domainSuggestions?: readonly string[];
};

export const EmailAddressField = ({
  label,
  addresses,
  onChange,
  placeholder,
  domainSuggestions = DEFAULT_DOMAIN_SUGGESTIONS,
}: EmailAddressFieldProps) => {
  const [inputValue, setInputValue] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const atIndex = inputValue.lastIndexOf("@");
  const domainFragment = atIndex >= 0 ? inputValue.slice(atIndex + 1).toLowerCase() : "";

  const filteredSuggestions = useMemo(
    () =>
      domainSuggestions.filter((domain) =>
        domainFragment.length === 0 ? true : domain.toLowerCase().startsWith(domainFragment),
      ),
    [domainFragment, domainSuggestions],
  );

  const shouldShowSuggestions =
    domainSuggestions.length > 0 && atIndex >= 0 && filteredSuggestions.length > 0;

  const splitCandidates = (raw: string) =>
    raw
      .split(/[\s,]+/)
      .map((value) => value.trim())
      .filter(Boolean);

  const addAddresses = (raw: string) => {
    const candidates = splitCandidates(raw);
    if (candidates.length === 0) {
      setInputValue("");
      return;
    }

    const next = [...addresses];
    let didChange = false;
    for (const candidate of candidates) {
      if (!isValidEmail(candidate)) {
        setLocalError("Enter a valid email address.");
        continue;
      }
      if (next.includes(candidate)) {
        continue;
      }
      next.push(candidate);
      didChange = true;
    }

    if (didChange) {
      onChange(next);
      setLocalError(null);
    }

    setInputValue("");
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const shouldCommit =
      event.key === "Enter" ||
      event.key === "," ||
      event.key === "Tab" ||
      event.key === " " ||
      event.key === "Spacebar";

    if (shouldCommit && inputValue.trim()) {
      event.preventDefault();
      addAddresses(inputValue);
      return;
    }

    if (event.key === "Backspace" && inputValue.length === 0 && addresses.length > 0) {
      event.preventDefault();
      const next = [...addresses];
      const restored = next.pop();
      if (restored) {
        onChange(next);
        setInputValue(restored);
      }
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData("text");
    if (!pasted) {
      return;
    }
    if (splitCandidates(pasted).length <= 1) {
      return;
    }
    event.preventDefault();
    addAddresses(pasted);
  };

  const handleSuggestion = (domain: string) => {
    const nextValue = `${inputValue.slice(0, atIndex + 1)}${domain}`;
    setInputValue(nextValue);
    setLocalError(null);
    inputRef.current?.focus();
  };

  const handleRemove = (index: number) => {
    const next = addresses.filter((_, idx) => idx !== index);
    onChange(next);
  };

  const handleWrapperClick = () => {
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-slate-100">{label}</label>
      <div
        className="flex min-h-[42px] flex-wrap gap-2 rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-1 text-sm text-slate-100 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/40"
        onClick={handleWrapperClick}
      >
        {addresses.map((email, index) => (
          <span
            key={`${email}-${index}`}
            className="inline-flex items-center gap-2 rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-100"
          >
            {email}
            <button
              type="button"
              aria-label={`Remove ${email}`}
              className="text-slate-400 transition hover:text-white"
              onClick={() => handleRemove(index)}
            >
              &times;
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={inputValue}
          onChange={(event) => {
            setInputValue(event.target.value);
            if (localError) setLocalError(null);
          }}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onBlur={() => {
            addAddresses(inputValue);
          }}
          placeholder={addresses.length === 0 ? placeholder : undefined}
          className="flex-1 min-w-[120px] bg-transparent py-1 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
          type="text"
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      {shouldShowSuggestions && (
        <div className="flex flex-wrap gap-2">
          {filteredSuggestions.map((domain) => (
            <button
              key={domain}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => handleSuggestion(domain)}
              className="rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-200 transition hover:border-sky-400/40 hover:bg-sky-500/20 hover:text-sky-100"
            >
              @{domain}
            </button>
          ))}
        </div>
      )}
      {localError && <p className="text-xs text-rose-400">{localError}</p>}
    </div>
  );
};
