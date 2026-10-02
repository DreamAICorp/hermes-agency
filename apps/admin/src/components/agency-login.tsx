"use client";
import { useTranslation } from "react-i18next";
import { Card,CardContent } from "@/components/ui/card";
export function AgencyLogin(){const {t,i18n}=useTranslation("agency");return <main className="flex min-h-svh items-center justify-center bg-background p-6"><Card className="w-full max-w-sm rounded-xl"><CardContent className="p-8"><p className="mb-2 text-sm text-muted-foreground">4U Corp</p><h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1><p className="my-6 text-sm text-muted-foreground">{t("loginHelp")}</p><a className="flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 py-3 font-medium text-primary-foreground" href={"/api/auth/google/start?locale="+encodeURIComponent(i18n.language)}>{t("google")}</a></CardContent></Card></main>;}
