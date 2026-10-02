"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AgencyCreate() {
  const { t } = useTranslation("agency");
  const router = useRouter();
  const queries = useQueryClient();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function create(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/agency/businesses", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
      });
      if (!response.ok) throw Error(t("createFailed"));
      await queries.invalidateQueries({ queryKey: ["businesses"] });
      router.push("/"); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : t("createFailed")); }
    finally { setSaving(false); }
  }
  return <section className="mx-auto w-full max-w-xl p-6 md:p-10">
    <h1 className="text-2xl font-semibold">{t("createAgency")}</h1>
    <p className="mt-2 text-sm text-muted-foreground">{t("createAgencyHelp")}</p>
    <form onSubmit={create} className="mt-8 space-y-5">
      <div className="space-y-2"><Label htmlFor="agency-name">{t("agencyName")}</Label>
      <Input id="agency-name" value={name} onChange={event => setName(event.target.value)} minLength={2} maxLength={120} required autoComplete="organization" /></div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={saving}>{saving ? t("creating") : t("createAgency")}</Button>
    </form>
  </section>;
}
