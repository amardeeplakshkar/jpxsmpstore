"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { SocialButtons, SocialIcon } from "components/store/social-buttons";
import { Button } from "components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "components/ui/card";
import { Field, Input, NativeSelect, Textarea } from "components/ui/input";
import { SwitchField } from "components/ui/switch";
import { api } from "lib/client-api";
import { SOCIAL_ICONS } from "lib/social-icons";
import type { SocialButton } from "lib/settings/schemas";

const PRESET_COLORS: Record<string, string> = {
  discord: "#5865F2", youtube: "#FF0000", kick: "#00E701", instagram: "#E4405F", x: "#000000", twitch: "#9146FF",
  tiktok: "#000000", telegram: "#26A5E4", whatsapp: "#25D366", facebook: "#0866FF", github: "#181717", reddit: "#FF4500",
  website: "#a855f7", email: "#64748b", store: "#a855f7",
};

/** Pulls only viewBox and path `d` data out of pasted SVG markup. Nothing else from the paste is kept. */
function extractSvg(markup: string): { viewBox: string; paths: string[] } | null {
  const viewBox = /viewBox="([\d.\s-]+)"/i.exec(markup)?.[1]?.trim() ?? "0 0 24 24";
  const paths = [...markup.matchAll(/\sd="([^"]+)"/gi)].map((m) => m[1].trim()).filter((d) => /^[MmLlHhVvCcSsQqTtAaZz0-9.,\s+\-eE]+$/.test(d));
  if (!paths.length && /^[MmLlHhVvCcSsQqTtAaZz0-9.,\s+\-eE]+$/.test(markup.trim()) && markup.trim()) return { viewBox, paths: [markup.trim()] };
  return paths.length ? { viewBox, paths } : null;
}

function newButton(): SocialButton {
  return { id: Math.random().toString(36).slice(2, 10), label: "Discord", url: "https://discord.gg/", icon: "discord", customViewBox: "0 0 24 24", customPaths: [], bgColor: "#5865F2", iconColor: "#FFFFFF", enabled: true };
}

export function SocialButtonsEditor({ initial }: { initial: { title: string; buttons: SocialButton[] } }) {
  const router = useRouter();
  const [title, setTitle] = React.useState(initial.title);
  const [buttons, setButtons] = React.useState<SocialButton[]>(initial.buttons);
  const [svgDrafts, setSvgDrafts] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);
  const upd = (i: number, patch: Partial<SocialButton>) => setButtons((b) => b.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const move = (i: number, d: -1 | 1) => setButtons((b) => { const n = [...b]; const t = n[i + d]; if (!t) return b; n[i + d] = n[i]; n[i] = t; return n; });

  async function save() {
    for (const b of buttons) {
      if (b.icon === "custom" && b.customPaths.length === 0) return toast.error(`"${b.label}" uses a custom icon but has no valid SVG yet.`);
      if (!/^https?:\/\//.test(b.url)) return toast.error(`"${b.label}" needs a full link starting with https://`);
    }
    setBusy(true);
    try {
      await api("/api/admin/settings", { method: "PUT", json: { section: "social", value: { title, buttons } } });
      toast.success("Footer buttons saved");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Footer buttons</CardTitle>
        <CardDescription>Square icon buttons shown in the footer, like Discord, Kick and YouTube. Pick a preset icon or paste your own SVG.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-2xl border border-border bg-[#0b0f15] p-6">
          <p className="mb-4 text-sm font-black uppercase tracking-wide">{title || "Community"}</p>
          {buttons.some((b) => b.enabled) ? <SocialButtons buttons={buttons} /> : <p className="text-sm text-muted">No visible buttons yet. Preview appears here.</p>}
        </div>
        <Field label="Section title" htmlFor="social-title"><Input id="social-title" value={title} maxLength={40} onChange={(e) => setTitle(e.target.value)} /></Field>

        {buttons.map((b, i) => (
          <div key={b.id} className="space-y-4 rounded-xl border border-border bg-elevated/50 p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-lg" style={{ background: b.bgColor }}><SocialIcon button={b} className="size-5" /></span>
                <p className="font-bold">{b.label || "Untitled"}</p>
              </div>
              <div className="flex gap-1">
                <Button type="button" variant="ghost" size="icon" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp /></Button>
                <Button type="button" variant="ghost" size="icon" aria-label="Move down" disabled={i === buttons.length - 1} onClick={() => move(i, 1)}><ArrowDown /></Button>
                <Button type="button" variant="ghost" size="icon" aria-label="Remove button" onClick={() => setButtons(buttons.filter((_, j) => j !== i))}><Trash2 /></Button>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Label (for screen readers and hover)" htmlFor={`l-${b.id}`}><Input id={`l-${b.id}`} value={b.label} maxLength={40} onChange={(e) => upd(i, { label: e.target.value })} /></Field>
              <Field label="Link" htmlFor={`u-${b.id}`}><Input id={`u-${b.id}`} type="url" value={b.url} placeholder="https://" onChange={(e) => upd(i, { url: e.target.value })} /></Field>
              <Field label="Icon" htmlFor={`i-${b.id}`}>
                <NativeSelect id={`i-${b.id}`} value={b.icon} onChange={(e) => {
                  const icon = e.target.value;
                  upd(i, { icon, ...(PRESET_COLORS[icon] ? { bgColor: PRESET_COLORS[icon] } : {}), ...(SOCIAL_ICONS[icon] && b.label === (SOCIAL_ICONS[b.icon]?.label ?? "") ? { label: SOCIAL_ICONS[icon].label } : {}) });
                }}>
                  {Object.entries(SOCIAL_ICONS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  <option value="custom">Custom SVG</option>
                </NativeSelect>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Background" htmlFor={`bg-${b.id}`}>
                  <div className="flex gap-2"><input id={`bg-${b.id}`} type="color" value={b.bgColor} onChange={(e) => upd(i, { bgColor: e.target.value })} className="h-10 w-12 cursor-pointer rounded border border-border bg-transparent" /><Input aria-label="Background hex" value={b.bgColor} onChange={(e) => upd(i, { bgColor: e.target.value })} /></div>
                </Field>
                <Field label="Icon colour" htmlFor={`ic-${b.id}`}>
                  <div className="flex gap-2"><input id={`ic-${b.id}`} type="color" value={b.iconColor} onChange={(e) => upd(i, { iconColor: e.target.value })} className="h-10 w-12 cursor-pointer rounded border border-border bg-transparent" /><Input aria-label="Icon hex" value={b.iconColor} onChange={(e) => upd(i, { iconColor: e.target.value })} /></div>
                </Field>
              </div>
              {b.icon === "custom" && (
                <Field label="Custom SVG" htmlFor={`svg-${b.id}`} hint="Paste the SVG code (or just the path data). Only the shape is kept; scripts and styles are stripped." className="sm:col-span-2">
                  <Textarea id={`svg-${b.id}`} rows={4} value={svgDrafts[b.id] ?? (b.customPaths.length ? `<svg viewBox="${b.customViewBox}">${b.customPaths.map((d) => `<path d="${d}"/>`).join("")}</svg>` : "")}
                    onChange={(e) => {
                      const v = e.target.value;
                      setSvgDrafts((s) => ({ ...s, [b.id]: v }));
                      const r = extractSvg(v);
                      upd(i, r ? { customViewBox: r.viewBox, customPaths: r.paths.slice(0, 20) } : { customPaths: [] });
                    }} />
                </Field>
              )}
            </div>
            <SwitchField id={`en-${b.id}`} label="Visible" checked={b.enabled} onCheckedChange={(x) => upd(i, { enabled: x })} />
          </div>
        ))}
        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="outline" disabled={buttons.length >= 12} onClick={() => setButtons([...buttons, newButton()])}><Plus /> Add button</Button>
          <Button type="button" loading={busy} onClick={save}>Save footer buttons</Button>
        </div>
      </CardContent>
    </Card>
  );
}
