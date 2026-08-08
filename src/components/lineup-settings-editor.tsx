"use client";

import { useState } from "react";
import {
  defaultStarterCounts,
  LINEUP_SETTINGS_STORAGE_KEY,
  normalizeStarterCounts,
  starterRuleDetails,
  starterRuleKeys,
  totalStarters,
  type StarterCounts,
} from "@/domain/lineup-config";

export function LineupSettingsEditor() {
  const [counts, setCounts] = useState<StarterCounts>(() => {
    if (typeof window === "undefined") return defaultStarterCounts;
    try {
      const savedCounts = window.localStorage.getItem(
        LINEUP_SETTINGS_STORAGE_KEY,
      );
      return savedCounts
        ? normalizeStarterCounts(JSON.parse(savedCounts))
        : defaultStarterCounts;
    } catch {
      return defaultStarterCounts;
    }
  });
  const [saved, setSaved] = useState(false);

  const offense = starterRuleKeys.filter(
    (key) => starterRuleDetails[key].side === "Offense",
  );
  const defense = starterRuleKeys.filter(
    (key) => starterRuleDetails[key].side === "Defense",
  );

  function update(key: keyof StarterCounts, value: string) {
    setSaved(false);
    setCounts((current) => ({
      ...current,
      [key]: Math.min(10, Math.max(0, Number.parseInt(value || "0", 10))),
    }));
  }

  function save() {
    window.localStorage.setItem(
      LINEUP_SETTINGS_STORAGE_KEY,
      JSON.stringify(counts),
    );
    window.dispatchEvent(new Event("football:lineup-settings-changed"));
    setSaved(true);
  }

  return (
    <div className="stack">
      {(["Offense", "Defense"] as const).map((side) => (
        <div key={side}>
          <h3 className="settings-group-title">{side}</h3>
          <div className="starter-settings-grid">
            {(side === "Offense" ? offense : defense).map((key) => (
              <label className="starter-setting" key={key}>
                <span>
                  <strong>{starterRuleDetails[key].label}</strong>
                  <small>{starterRuleDetails[key].eligibilityLabel}</small>
                </span>
                <input
                  className="input"
                  type="number"
                  min="0"
                  max="10"
                  inputMode="numeric"
                  value={counts[key]}
                  suppressHydrationWarning
                  onChange={(event) => update(key, event.target.value)}
                  aria-label={`${starterRuleDetails[key].label} starters`}
                />
              </label>
            ))}
          </div>
        </div>
      ))}
      <div className="lineup-settings-footer">
        <div>
          <strong>{totalStarters(counts)} starters</strong>
          <span> across offense and defense</span>
        </div>
        <div className="button-row">
          <button
            className="btn"
            type="button"
            onClick={() => {
              setCounts(defaultStarterCounts);
              setSaved(false);
            }}
          >
            Reset league defaults
          </button>
          <button className="btn btn-primary" type="button" onClick={save}>
            {saved ? "Starter rules saved" : "Save starter rules"}
          </button>
        </div>
      </div>
      <div className="notice notice-info">
        This local preview saves starter rules in this browser. Database-backed
        league-wide settings will take over when PostgreSQL is connected.
      </div>
    </div>
  );
}
