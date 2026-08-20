"use client";

import { useState } from "react";
import {
  defaultRosterLimits,
  normalizeRosterLimits,
  ROSTER_SETTINGS_STORAGE_KEY,
  rosterPositions,
  type RosterLimits,
} from "@/domain/roster-config";

function optionalValue(value: string) {
  return value === ""
    ? null
    : Math.min(200, Math.max(0, Number.parseInt(value, 10)));
}

export function RosterSettingsEditor() {
  const [limits, setLimits] = useState<RosterLimits>(() => {
    if (typeof window === "undefined") return defaultRosterLimits;
    try {
      const saved = window.localStorage.getItem(ROSTER_SETTINGS_STORAGE_KEY);
      return saved
        ? normalizeRosterLimits(JSON.parse(saved))
        : defaultRosterLimits;
    } catch {
      return defaultRosterLimits;
    }
  });
  const [saved, setSaved] = useState(false);

  function updateRequired(
    key: "inSeasonActive" | "offseasonActive" | "taxi",
    value: string,
  ) {
    setSaved(false);
    setLimits((current) => ({
      ...current,
      [key]: Math.min(200, Math.max(0, Number.parseInt(value || "0", 10))),
    }));
  }

  function save() {
    window.localStorage.setItem(
      ROSTER_SETTINGS_STORAGE_KEY,
      JSON.stringify(limits),
    );
    setSaved(true);
  }

  return (
    <div className="stack">
      <div className="starter-settings-grid">
        <LimitField
          label="In-season active roster"
          detail="Enforced during the regular season"
          value={limits.inSeasonActive}
          onChange={(value) => updateRequired("inSeasonActive", value)}
        />
        <LimitField
          label="Offseason active roster"
          detail="RFA and draft flexibility"
          value={limits.offseasonActive}
          onChange={(value) => updateRequired("offseasonActive", value)}
        />
        <LimitField
          label="Taxi squad"
          detail="Maximum taxi assignments"
          value={limits.taxi}
          onChange={(value) => updateRequired("taxi", value)}
        />
        <LimitField
          label="Injured reserve"
          detail="Blank means no configured cap"
          value={limits.injuredReserve}
          optional
          onChange={(value) => {
            setSaved(false);
            setLimits((current) => ({
              ...current,
              injuredReserve: optionalValue(value),
            }));
          }}
        />
      </div>

      <div>
        <h3 className="settings-group-title">Optional position caps</h3>
        <p className="settings-group-help">
          Leave a position blank for no separate cap beyond the overall roster
          limit.
        </p>
        <div className="position-limit-grid">
          {rosterPositions.map((position) => (
            <label className="field" key={position}>
              <span>{position}</span>
              <input
                className="input"
                type="number"
                min="0"
                max="200"
                inputMode="numeric"
                placeholder="No cap"
                value={limits.positionLimits[position] ?? ""}
                suppressHydrationWarning
                onChange={(event) => {
                  setSaved(false);
                  setLimits((current) => ({
                    ...current,
                    positionLimits: {
                      ...current.positionLimits,
                      [position]: optionalValue(event.target.value),
                    },
                  }));
                }}
                aria-label={`${position} roster cap`}
              />
            </label>
          ))}
        </div>
      </div>

      <div className="lineup-settings-footer">
        <div>
          <strong>{limits.inSeasonActive} in season</strong>
          <span>
            {" "}
            · {limits.offseasonActive} offseason · {limits.taxi} taxi
          </span>
        </div>
        <div className="button-row">
          <button
            className="btn"
            type="button"
            onClick={() => {
              setLimits(defaultRosterLimits);
              setSaved(false);
            }}
          >
            Reset league defaults
          </button>
          <button className="btn btn-primary" type="button" onClick={save}>
            {saved ? "Roster limits saved" : "Save roster limits"}
          </button>
        </div>
      </div>
    </div>
  );
}

function LimitField({
  label,
  detail,
  value,
  optional = false,
  onChange,
}: {
  label: string;
  detail: string;
  value: number | null;
  optional?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="starter-setting">
      <span>
        <strong>{label}</strong>
        <small>{detail}</small>
      </span>
      <input
        className="input"
        type="number"
        min="0"
        max="200"
        inputMode="numeric"
        placeholder={optional ? "No cap" : undefined}
        value={value ?? ""}
        suppressHydrationWarning
        onChange={(event) => onChange(event.target.value)}
        aria-label={`${label} limit`}
      />
    </label>
  );
}
