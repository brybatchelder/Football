import Link from "next/link";
import type { Position, RosterStatus } from "@/domain/types";
export type LineupSlot =
  Position | "FLEX" | "DFLEX" | "SUPERFLEX" | "BENCH" | "IR" | "TAXI";
export function PageHeader({
  eyebrow = "Front Office Football League",
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <>
      <div className="breadcrumbs">
        <Link href="/league">League</Link> / <span>{title}</span>
      </div>
      <header className="page-header">
        <div>
          <div className="eyebrow">{eyebrow}</div>
          <h1>{title}</h1>
          {description && <p>{description}</p>}
        </div>
        {actions && <div className="button-row">{actions}</div>}
      </header>
    </>
  );
}
export function Card({
  title,
  action,
  children,
  className = "",
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`card ${className}`}>
      {title && (
        <div className="card-header">
          <h2>{title}</h2>
          {action}
        </div>
      )}
      <div className="card-body">{children}</div>
    </section>
  );
}
export function StatusBadge({ status }: { status: RosterStatus }) {
  const labels = { active: "Active", injured_reserve: "IR", taxi: "Taxi" };
  return (
    <span
      className={`badge badge-${status === "injured_reserve" ? "ir" : status}`}
    >
      {labels[status]}
    </span>
  );
}
export function PositionBadge({ position }: { position: Position }) {
  return (
    <span
      className={`position-badge position-${position.toLowerCase()}`}
      aria-label={`${position} position`}
    >
      {position}
    </span>
  );
}
export function SlotBadge({ slot }: { slot: LineupSlot }) {
  return (
    <span
      className={`position-badge slot-badge slot-${slot.toLowerCase()}`}
      aria-label={`${slot} lineup slot`}
    >
      {slot === "SUPERFLEX" ? "SFLEX" : slot}
    </span>
  );
}
export function PlayerIdentity({
  name,
  position,
}: {
  name: string;
  position: Position;
}) {
  return (
    <span className="player-identity">
      <PositionBadge position={position} />
      <span className="player-name">{name}</span>
    </span>
  );
}
export function Money({
  value,
  className = "",
}: {
  value: string | number;
  className?: string;
}) {
  return (
    <span className={className}>
      $
      {Number(value).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}
    </span>
  );
}
export function FranchiseMark({
  abbreviation,
  color,
}: {
  abbreviation: string;
  color: string;
}) {
  return (
    <span className="franchise-mark" style={{ background: color }}>
      {abbreviation}
    </span>
  );
}
