export type TaxiEligibility = { allowed: boolean; reason: string };

export function taxiEligibility(input: {
  nflExperience?: number;
  contractYears: number;
  eligibilityBurned?: boolean;
  taxiSlotsOpen: number;
}): TaxiEligibility {
  if (input.eligibilityBurned)
    return {
      allowed: false,
      reason:
        "Former Taxi player — eligibility permanently burned at activation.",
    };
  if (input.contractYears > 0)
    return {
      allowed: false,
      reason: "Contracted players cannot be assigned to Taxi.",
    };
  if (input.nflExperience === undefined)
    return {
      allowed: false,
      reason: "NFL experience is not yet imported for this player.",
    };
  if (input.nflExperience > 3)
    return {
      allowed: false,
      reason: "Taxi eligibility is limited to 0–3 NFL years.",
    };
  if (input.taxiSlotsOpen < 1)
    return { allowed: false, reason: "No Taxi slots are available." };
  return {
    allowed: true,
    reason: "0–3 NFL years, no contract, and an open Taxi slot.",
  };
}

export function irEligibility(input: {
  nflDesignation?: string;
  irSlotsOpen: number;
}) {
  if (input.nflDesignation !== "IR")
    return {
      allowed: false,
      reason: "Player must carry an NFL IR designation.",
    };
  if (input.irSlotsOpen < 1)
    return { allowed: false, reason: "No IR slots are available." };
  return { allowed: true, reason: "Current NFL IR designation verified." };
}
