"use client";

import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Loader2, RotateCcw, Save, Settings2, Undo2 } from "lucide-react";
import { Alert } from "@/components/app/alert";
import { AsyncBoundary } from "@/components/app/async-boundary";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/ui/empty-state";
import { ApiError } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";
import { settingsApi } from "@/lib/api/settings";
import { formatDateTime } from "@/lib/format";
import { useAsync } from "@/lib/hooks/use-async";
import type {
  StoredSystemSetting,
  SystemSettingChange,
  SystemSettingDescriptor,
  SystemSettingsResponse,
} from "@/lib/api/types";

/**
 * The draft is kept as text. A number input that parses on every keystroke turns a half-typed
 * value into a wrong one - clearing the field would read as 0 - and the administrator would be
 * shown a limit error for a number they are still typing.
 */
type SettingsDraft = Record<string, string>;

function toDraft(settings: Record<string, number>): SettingsDraft {
  return Object.fromEntries(Object.entries(settings).map(([key, value]) => [key, String(value)]));
}

/** Mirrors the server bounds so a mistake is caught here instead of as a 422 after a save. */
function issueFor(definition: SystemSettingDescriptor, raw: string): string | null {
  if (raw.trim() === "") {
    return "Enter a value.";
  }

  const value = Number(raw);

  if (!Number.isFinite(value)) {
    return "Enter a number.";
  }

  if (!Number.isInteger(value)) {
    return "Enter a whole number.";
  }

  if (value < definition.min || value > definition.max) {
    return `Enter a value between ${definition.min} and ${definition.max}.`;
  }

  return null;
}

function summarize(changes: SystemSettingChange[], definitions: SystemSettingDescriptor[]): string {
  const byKey = new Map(definitions.map((definition) => [definition.key, definition]));

  const parts = changes.map((change) => {
    const definition = byKey.get(change.key);
    const unit = definition?.unit ? ` ${definition.unit}` : "";

    return `${definition?.label ?? change.key} is now ${change.to}${unit}`;
  });

  return parts.length > 0 ? `Saved: ${parts.join("; ")}.` : "There was nothing to save.";
}

export function SettingsView() {
  const state = useAsync("system-settings", () => settingsApi.get());

  return (
    <div className="space-y-5">
      <PageHeader
        title="System configuration"
        description="Runtime settings an administrator can change without a redeploy. The backend stays authoritative; these are the values it applies."
      />

      <AsyncBoundary state={state} loadingLabel="Loading system settings">
        {(data) => <SettingsForm initial={data} />}
      </AsyncBoundary>
    </div>
  );
}

function SettingsForm({ initial }: { initial: SystemSettingsResponse }) {
  const [draft, setDraft] = useState<SettingsDraft>(() => toDraft(initial.settings));
  const [baseline, setBaseline] = useState<SettingsDraft>(() => toDraft(initial.settings));
  const [stored, setStored] = useState<StoredSystemSetting[]>(initial.stored);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const groups = useMemo(() => {
    const byGroup = new Map<string, SystemSettingDescriptor[]>();

    for (const definition of initial.definitions) {
      const fields = byGroup.get(definition.group) ?? [];
      fields.push(definition);
      byGroup.set(definition.group, fields);
    }

    return [...byGroup.entries()];
  }, [initial.definitions]);

  const storedByKey = useMemo(
    () => new Map(stored.map((entry) => [entry.key, entry])),
    [stored],
  );

  const issues = useMemo(() => {
    const found = new Map<string, string>();

    for (const definition of initial.definitions) {
      const issue = issueFor(definition, draft[definition.key] ?? "");

      if (issue !== null) {
        found.set(definition.key, issue);
      }
    }

    return found;
  }, [initial.definitions, draft]);

  const dirtyKeys = initial.definitions
    .map((definition) => definition.key)
    .filter((key) => draft[key] !== baseline[key]);

  const hasChanges = dirtyKeys.length > 0;
  const blocked = issues.size > 0;

  function setValue(key: string, value: string) {
    setDraft((previous) => ({ ...previous, [key]: value }));
    setNotice(null);
    setError(null);
  }

  function discardChanges() {
    setDraft(baseline);
    setNotice(null);
    setError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (blocked || !hasChanges) {
      return;
    }

    // Only the edited keys are sent, so a concurrent edit to a different setting survives.
    const values: Record<string, number> = {};

    for (const key of dirtyKeys) {
      values[key] = Number(draft[key]);
    }

    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const result = await settingsApi.update(values);
      const next = toDraft(result.settings);

      setDraft(next);
      setBaseline(next);
      setStored(result.stored);
      setNotice(summarize(result.changed, result.definitions));
    } catch (cause) {
      setError(toApiError(cause, "Could not save the settings"));
    } finally {
      setSaving(false);
    }
  }

  if (initial.definitions.length === 0) {
    return (
      <EmptyState
        title="No settings available"
        description="This build does not expose any runtime settings."
      />
    );
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit} noValidate>
      {error ? <Alert tone="danger" title={error.message} /> : null}
      {notice ? <Alert tone="success" title={notice} /> : null}

      {groups.map(([group, fields]) => (
        <Card key={group}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 aria-hidden className="size-4 text-muted-foreground" />
              {group}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {fields.map((definition) => (
              <SettingField
                key={definition.key}
                definition={definition}
                value={draft[definition.key] ?? ""}
                issue={issues.get(definition.key) ?? null}
                stored={storedByKey.get(definition.key) ?? null}
                disabled={saving}
                onChange={(next) => setValue(definition.key, next)}
              />
            ))}
          </CardContent>
        </Card>
      ))}

      <div className="sticky bottom-20 z-20 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-background/95 p-3 backdrop-blur sm:bottom-4">
        <Button type="submit" disabled={saving || blocked || !hasChanges}>
          {saving ? <Loader2 aria-hidden className="animate-spin" /> : <Save aria-hidden />}
          {saving ? "Saving" : "Save changes"}
        </Button>
        <Button type="button" variant="outline" onClick={discardChanges} disabled={saving || !hasChanges}>
          <Undo2 aria-hidden />
          Discard changes
        </Button>
        {hasChanges ? (
          <span className="text-sm text-muted-foreground">
            {dirtyKeys.length === 1 ? "1 setting changed" : `${dirtyKeys.length} settings changed`}
          </span>
        ) : null}
      </div>
    </form>
  );
}

interface SettingFieldProps {
  definition: SystemSettingDescriptor;
  value: string;
  issue: string | null;
  stored: StoredSystemSetting | null;
  disabled: boolean;
  onChange: (value: string) => void;
}

function SettingField({ definition, value, issue, stored, disabled, onChange }: SettingFieldProps) {
  const fieldId = `setting-${definition.key}`;
  const descriptionId = `${fieldId}-description`;
  const issueId = `${fieldId}-issue`;
  const unit = definition.unit;
  const atDefault = value === String(definition.defaultValue);
  // A saved row that happens to equal the deployment default is not worth flagging; the
  // "last changed" line below still records that somebody saved it.
  const overridden = stored !== null && stored.value !== definition.defaultValue;

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <Label htmlFor={fieldId}>{definition.label}</Label>
        {overridden ? <Badge variant="secondary">Changed</Badge> : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          id={fieldId}
          type="number"
          inputMode="numeric"
          className="max-w-40"
          value={value}
          min={definition.min}
          max={definition.max}
          step={definition.step}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={issue !== null}
          aria-describedby={issue === null ? descriptionId : `${descriptionId} ${issueId}`}
        />
        {unit ? <span className="text-sm text-muted-foreground">{unit}</span> : null}
        {atDefault ? null : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={() => onChange(String(definition.defaultValue))}
          >
            <RotateCcw aria-hidden />
            Use default
          </Button>
        )}
      </div>

      <p id={descriptionId} className="text-xs text-muted-foreground">
        {definition.description}
      </p>

      {issue ? (
        <p id={issueId} className="text-xs text-destructive">
          {issue}
        </p>
      ) : null}

      <p className="text-xs text-muted-foreground">
        Deployment default: {definition.defaultValue}
        {unit ? ` ${unit}` : ""}, allowed range {definition.min} to {definition.max}
        {unit ? ` ${unit}` : ""}.
      </p>

      {stored ? (
        <p className="text-xs text-muted-foreground">
          Last changed {formatDateTime(stored.updatedAt)}
          {stored.updatedBy ? ` by ${stored.updatedBy.fullName}` : ""}.
        </p>
      ) : null}
    </div>
  );
}