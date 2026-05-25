import "server-only";

import { createAdminClient, hasSupabaseAdminKey } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type FinanceSettings = {
  active: boolean;
  creditsPerUnit: number;
  id: string | null;
  ngnPerUsd: number;
  usdPerUnit: number;
  updatedAt: string | null;
};

export const defaultFinanceSettings: FinanceSettings = {
  active: true,
  creditsPerUnit: 100,
  id: null,
  ngnPerUsd: 1000,
  updatedAt: null,
  usdPerUnit: 0.5,
};

type FinanceSettingsRow = {
  active: boolean;
  credits_per_unit: number;
  id: string;
  ngn_per_usd: number | string;
  updated_at: string | null;
  usd_per_unit: number | string;
};

function normalizeFinanceSettings(row: FinanceSettingsRow | null | undefined): FinanceSettings {
  if (!row) return defaultFinanceSettings;

  return {
    active: row.active,
    creditsPerUnit: Number(row.credits_per_unit) || defaultFinanceSettings.creditsPerUnit,
    id: row.id,
    ngnPerUsd: Number(row.ngn_per_usd) || defaultFinanceSettings.ngnPerUsd,
    updatedAt: row.updated_at,
    usdPerUnit: Number(row.usd_per_unit) || defaultFinanceSettings.usdPerUnit,
  };
}

async function loadActiveFinanceSettings() {
  const supabase = hasSupabaseAdminKey() ? createAdminClient() : await createClient();
  const { data, error } = await supabase
    .from("finance_settings")
    .select("id, credits_per_unit, usd_per_unit, ngn_per_usd, active, updated_at")
    .eq("active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (error.message.includes("finance_settings")) {
      return defaultFinanceSettings;
    }
    throw new Error(error.message);
  }

  return normalizeFinanceSettings(data as FinanceSettingsRow | null);
}

export async function getActiveFinanceSettings() {
  return loadActiveFinanceSettings();
}

export async function getOrCreateFinanceSettings() {
  const supabase = hasSupabaseAdminKey() ? createAdminClient() : await createClient();
  const existing = await loadActiveFinanceSettings();

  if (existing.id) {
    return existing;
  }

  const { data, error } = await supabase
    .from("finance_settings")
    .insert({
      active: true,
      credits_per_unit: defaultFinanceSettings.creditsPerUnit,
      ngn_per_usd: defaultFinanceSettings.ngnPerUsd,
      usd_per_unit: defaultFinanceSettings.usdPerUnit,
    })
    .select("id, credits_per_unit, usd_per_unit, ngn_per_usd, active, updated_at")
    .maybeSingle();

  if (error) {
    return defaultFinanceSettings;
  }

  return normalizeFinanceSettings(data as FinanceSettingsRow | null);
}
