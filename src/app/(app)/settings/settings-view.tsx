"use client";

import { Download, Plus, X } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";

import { BackgroundPicker } from "~/components/shared/background-picker";
import { Field } from "~/components/shared/field";
import { PageHeader } from "~/components/shared/page-header";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Skeleton } from "~/components/ui/skeleton";
import { Switch } from "~/components/ui/switch";
import { toast } from "~/components/ui/toast";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

export function SettingsView() {
  const utils = api.useUtils();
  const { setTheme } = useTheme();
  const { data: settings, isLoading } = api.settings.get.useQuery();
  const { data: rules } = api.settings.automationRules.useQuery();

  const update = api.settings.update.useMutation({
    onSuccess: () => {
      toast.success("Settings saved");
      void utils.settings.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const exportAll = api.settings.exportAll.useMutation();
  const toggleRule = api.settings.toggleAutomationRule.useMutation({
    onSuccess: () => utils.settings.automationRules.invalidate(),
  });
  const { data: cardTemplates } = api.card.cardTemplates.useQuery();
  const { data: boardTemplates } = api.board.templates.useQuery();
  const deleteCardTemplate = api.card.deleteCardTemplate.useMutation({
    onSuccess: () => utils.card.cardTemplates.invalidate(),
  });
  const deleteBoardTemplate = api.board.deleteTemplate.useMutation({
    onSuccess: () => utils.board.templates.invalidate(),
  });

  const [palette, setPalette] = useState<string[]>([]);
  const [newColor, setNewColor] = useState("#0079BF");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (settings) setPalette(settings.labelPalette as string[]);
  }, [settings]);

  if (isLoading || !settings) return <Skeleton className="h-96" />;

  async function download() {
    try {
      const payload = await exportAll.mutateAsync();
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `freelanceos-export-${payload.exportedAt.slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export downloaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export failed");
    }
  }

  return (
    <>
      <PageHeader
        title="Settings"
        description="Workspace preferences, label palette, automation and backups."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* profile & locale */}
        <section className="glass-card p-5" aria-label="Profile and locale">
          <h3 className="mb-4 font-semibold text-ink">Profile &amp; locale</h3>
          <form
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              update.mutate({
                freelancerName: String(data.get("freelancerName")),
                freelancerEmail: String(data.get("freelancerEmail")),
                baseCurrency: String(data.get("baseCurrency")).toUpperCase(),
                locale: String(data.get("locale")),
                timezone: String(data.get("timezone")),
                dateFormat: String(data.get("dateFormat")),
                invoicePrefix: String(data.get("invoicePrefix")),
              });
            }}
          >
            <Field id="freelancerName" label="Your name">
              <Input
                id="freelancerName"
                name="freelancerName"
                defaultValue={settings.freelancerName}
              />
            </Field>
            <Field id="freelancerEmail" label="Email">
              <Input
                id="freelancerEmail"
                name="freelancerEmail"
                type="email"
                defaultValue={settings.freelancerEmail}
              />
            </Field>
            <Field id="baseCurrency" label="Base currency" hint="3-letter ISO code, e.g. USD, EUR, IRR">
              <Input
                id="baseCurrency"
                name="baseCurrency"
                maxLength={3}
                defaultValue={settings.baseCurrency}
              />
            </Field>
            <Field id="locale" label="Locale" hint="Affects number & date formatting, e.g. en-US, fa-IR">
              <Input id="locale" name="locale" defaultValue={settings.locale} />
            </Field>
            <Field id="timezone" label="Timezone" hint="IANA name; heatmap days bucket in this zone">
              <Input id="timezone" name="timezone" defaultValue={settings.timezone} />
            </Field>
            <Field id="dateFormat" label="Date format">
              <Input id="dateFormat" name="dateFormat" defaultValue={settings.dateFormat} />
            </Field>
            <Field id="invoicePrefix" label="Invoice prefix" hint={`Next: ${settings.invoicePrefix}${String(settings.nextInvoiceSeq).padStart(4, "0")}`}>
              <Input id="invoicePrefix" name="invoicePrefix" defaultValue={settings.invoicePrefix} />
            </Field>
            <div className="flex items-end">
              <Button type="submit" loading={update.isPending}>
                Save settings
              </Button>
            </div>
          </form>
        </section>

        {/* appearance + palette */}
        <section className="glass-card p-5" aria-label="Appearance">
          <h3 className="mb-4 font-semibold text-ink">Appearance</h3>

          <div className="mb-4">
            <p className="mb-1.5 text-sm font-medium text-ink-secondary">App logo</p>
            <div className="flex items-center gap-3">
              {settings.appLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={settings.appLogoUrl}
                  alt="App logo"
                  className="size-12 rounded-sm border border-line-glass object-contain"
                />
              ) : (
                <span className="flex size-12 items-center justify-center rounded-sm bg-primary text-xl font-bold text-ink-onbrand">
                  F
                </span>
              )}
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  loading={uploadingLogo}
                  onClick={() => logoInputRef.current?.click()}
                >
                  Upload logo
                </Button>
                {settings.appLogoUrl ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => update.mutate({ appLogoUrl: null })}
                  >
                    Remove
                  </Button>
                ) : null}
              </div>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                aria-label="Upload app logo"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  setUploadingLogo(true);
                  try {
                    const body = new FormData();
                    body.append("file", file);
                    const res = await fetch("/api/uploads", { method: "POST", body });
                    if (!res.ok) throw new Error("Upload failed");
                    const json = (await res.json()) as { url: string };
                    await update.mutateAsync({ appLogoUrl: json.url });
                    toast.success("Logo updated");
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Upload failed");
                  } finally {
                    setUploadingLogo(false);
                  }
                }}
              />
            </div>
          </div>

          <Field id="theme" label="Theme">
            <Select
              value={settings.theme}
              onValueChange={(v) => {
                update.mutate({ theme: v as "LIGHT" | "DARK" | "SYSTEM" });
                setTheme(v.toLowerCase());
              }}
            >
              <SelectTrigger id="theme" className="max-w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LIGHT">Light</SelectItem>
                <SelectItem value="DARK">Dark</SelectItem>
                <SelectItem value="SYSTEM">System</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <h4 className="mt-5 mb-2 text-sm font-semibold text-ink-secondary">
            Label palette
          </h4>
          <div className="flex flex-wrap items-center gap-2">
            {palette.map((color) => (
              <span key={color} className="group relative">
                <span
                  className="block size-8 rounded-sm"
                  style={{ backgroundColor: color }}
                  title={color}
                />
                <button
                  type="button"
                  aria-label={`Remove ${color} from palette`}
                  onClick={() => setPalette((p) => p.filter((c) => c !== color))}
                  className="absolute -top-1.5 -end-1.5 hidden size-4 cursor-pointer items-center justify-center rounded-full bg-danger text-ink-onbrand group-hover:flex"
                >
                  <X aria-hidden className="size-3" />
                </button>
              </span>
            ))}
            <input
              type="color"
              aria-label="Pick a new palette color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              className="size-8 cursor-pointer rounded-sm border border-line bg-transparent"
            />
            <Button
              variant="secondary"
              size="iconSm"
              aria-label="Add color to palette"
              onClick={() =>
                setPalette((p) => (p.includes(newColor) ? p : [...p, newColor]))
              }
            >
              <Plus aria-hidden />
            </Button>
          </div>
          <Button
            className="mt-3"
            variant="secondary"
            size="sm"
            loading={update.isPending}
            onClick={() => update.mutate({ labelPalette: palette })}
          >
            Save palette
          </Button>

          <h4 className="mt-5 mb-2 text-sm font-semibold text-ink-secondary">
            App background
          </h4>
          <BackgroundPicker
            value={settings.appBackground}
            onSelect={(v) => update.mutate({ appBackground: v })}
            showDefault
            allowUpload
          />
        </section>

        {/* automation */}
        <section className="glass-card p-5" aria-label="Automation rules">
          <h3 className="mb-1 font-semibold text-ink">Automation</h3>
          <p className="mb-4 text-sm text-ink-subtle">
            Butler-style rules that react to board events.
          </p>
          <ul className="space-y-3">
            {rules?.map((rule) => (
              <li key={rule.id} className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink">{rule.name}</p>
                  <p className="text-sm text-ink-subtle">
                    <Badge variant="neutral" className="me-1">
                      {rule.trigger.replaceAll("_", " ").toLowerCase()}
                    </Badge>
                    {JSON.stringify(rule.conditions)} → {JSON.stringify(rule.actions)}
                  </p>
                </div>
                <Switch
                  aria-label={`Toggle rule ${rule.name}`}
                  checked={rule.isEnabled}
                  onCheckedChange={(checked) =>
                    toggleRule.mutate({ id: rule.id, isEnabled: checked })
                  }
                />
              </li>
            ))}
            {!rules?.length ? (
              <p className="text-md text-ink-subtle">No rules defined.</p>
            ) : null}
          </ul>
        </section>

        {/* templates */}
        <section className="glass-card p-5" aria-label="Templates">
          <h3 className="mb-1 font-semibold text-ink">Templates</h3>
          <p className="mb-4 text-sm text-ink-subtle">
            Created from any card ("Save as template") or board menu; used by
            "Add from template" and "New board".
          </p>
          <h4 className="mb-1.5 text-sm font-semibold text-ink-secondary">Card templates</h4>
          <ul className="mb-4 space-y-1.5">
            {cardTemplates?.map((t) => (
              <li key={t.id} className="flex items-center gap-2">
                <span className="flex-1 truncate text-md text-ink">{t.name}</span>
                <Button
                  variant="ghost"
                  size="iconSm"
                  aria-label={`Delete card template ${t.name}`}
                  onClick={() => deleteCardTemplate.mutate(t.id)}
                >
                  <X aria-hidden />
                </Button>
              </li>
            ))}
            {!cardTemplates?.length ? (
              <p className="text-md text-ink-subtle">None yet.</p>
            ) : null}
          </ul>
          <h4 className="mb-1.5 text-sm font-semibold text-ink-secondary">Board templates</h4>
          <ul className="space-y-1.5">
            {boardTemplates?.map((t) => (
              <li key={t.id} className="flex items-center gap-2">
                <span className="flex-1 truncate text-md text-ink">{t.name}</span>
                <Button
                  variant="ghost"
                  size="iconSm"
                  aria-label={`Delete board template ${t.name}`}
                  onClick={() => deleteBoardTemplate.mutate(t.id)}
                >
                  <X aria-hidden />
                </Button>
              </li>
            ))}
            {!boardTemplates?.length ? (
              <p className="text-md text-ink-subtle">None yet.</p>
            ) : null}
          </ul>
        </section>

        {/* backup */}
        <section className="glass-card p-5" aria-label="Backup and export">
          <h3 className="mb-1 font-semibold text-ink">Backup &amp; export</h3>
          <p className="mb-4 text-sm text-ink-subtle">
            Downloads every table as one JSON file. The server also runs a
            nightly <code className="font-mono">pg_dump</code> (see README).
          </p>
          <Button onClick={download} loading={exportAll.isPending}>
            <Download aria-hidden />
            Export all data (JSON)
          </Button>
        </section>
      </div>
    </>
  );
}
