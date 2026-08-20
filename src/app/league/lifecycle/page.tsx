import Link from "next/link";
import { ArrowRight, Check, Circle, Flag, Trophy } from "lucide-react";
import { Card, PageHeader } from "@/components/ui";
import {
  currentLifecycleStageId,
  leagueLifecycle,
  lifecycleStages,
  nextLifecycleStage,
} from "@/domain/league-lifecycle";

export default function LifecyclePage() {
  const stages = lifecycleStages();
  const currentIndex = stages.findIndex(
    (stage) => stage.id === currentLifecycleStageId,
  );
  const next = nextLifecycleStage(currentLifecycleStageId);
  return (
    <div className="page lifecycle-page">
      <PageHeader
        title="League Lifecycle"
        description="The operating stages that move FOFL from roster building through the championship and into the next league year."
        actions={
          <Link className="btn" href="/league">
            League HQ
          </Link>
        }
      />
      <section className="lifecycle-now">
        <div>
          <span className="eyebrow">Current stage</span>
          <h2>Roster Cutdown / Contracts / Final Compliance</h2>
          <p>
            Franchises reach legal roster limits, assign contract years, resolve
            status moves, and certify opening-day rosters.
          </p>
        </div>
        <div>
          <span>Up next</span>
          <b>{next?.name}</b>
          <small>{next?.primaryAction}</small>
        </div>
      </section>
      <div className="lifecycle-summary">
        <span>
          <b>4</b>
          <small>League phases</small>
        </span>
        <span>
          <b>{stages.length}</b>
          <small>Defined stages</small>
        </span>
        <span>
          <b>
            {currentIndex + 1} / {stages.length}
          </b>
          <small>Current position</small>
        </span>
        <span>
          <b>2026</b>
          <small>League year</small>
        </span>
      </div>
      <section className="lifecycle-flow" aria-label="League lifecycle flow">
        {leagueLifecycle.map((phase, phaseIndex) => {
          const phaseStages = lifecycleStages([phase]);
          const isCurrentPhase = phaseStages.some(
            (stage) => stage.id === currentLifecycleStageId,
          );
          const completedPhase =
            lifecycleStages().findIndex(
              (stage) => stage.id === phaseStages.at(-1)?.id,
            ) < currentIndex;
          return (
            <article
              className={`lifecycle-phase ${isCurrentPhase ? "current" : ""} ${completedPhase ? "complete" : ""}`}
              key={phase.id}
            >
              <header>
                <span>
                  {completedPhase ? (
                    <Check size={16} />
                  ) : phase.id === "postseason" ? (
                    <Trophy size={16} />
                  ) : phase.id === "celebration" ? (
                    <Flag size={16} />
                  ) : (
                    <Circle size={16} />
                  )}
                </span>
                <div>
                  <small>Phase {phaseIndex + 1}</small>
                  <h2>{phase.name}</h2>
                  <p>{phase.description}</p>
                </div>
              </header>
              <div className="lifecycle-stage-list">
                {phase.stages.map((stage) => {
                  const stageIndex = stages.findIndex(
                    (item) => item.id === stage.id,
                  );
                  const status =
                    stage.id === currentLifecycleStageId
                      ? "current"
                      : stageIndex < currentIndex
                        ? "complete"
                        : "upcoming";
                  return (
                    <div className={`lifecycle-stage ${status}`} key={stage.id}>
                      <span>
                        {status === "complete" ? (
                          <Check size={12} />
                        ) : (
                          stageIndex + 1
                        )}
                      </span>
                      <div>
                        <b>{stage.name}</b>
                        <p>{stage.purpose}</p>
                        <small>{stage.primaryAction}</small>
                      </div>
                      {status === "current" && <em>Current</em>}
                    </div>
                  );
                })}
              </div>
            </article>
          );
        })}
      </section>
      <div className="lifecycle-bottom">
        <Card title="Lifecycle rules">
          <ul className="list">
            <li>
              <div>
                <div className="list-title">One active stage</div>
                <div className="list-sub">
                  The active stage controls the most relevant deadlines,
                  modules, and owner actions.
                </div>
              </div>
            </li>
            <li>
              <div>
                <div className="list-title">Data-backed transitions</div>
                <div className="list-sub">
                  A stage advances only after its required reconciliation and
                  compliance gates are complete.
                </div>
              </div>
            </li>
            <li>
              <div>
                <div className="list-title">Season-aware navigation</div>
                <div className="list-sub">
                  League HQ can prioritize the tools that matter for the current
                  lifecycle stage.
                </div>
              </div>
            </li>
          </ul>
        </Card>
        <Card title="Current-stage actions">
          <div className="lifecycle-actions">
            <Link className="btn btn-primary" href="/transactions/roster-moves">
              Manage roster moves <ArrowRight size={14} />
            </Link>
            <Link className="btn" href="/my-team/contracts">
              Assign contracts
            </Link>
            <Link className="btn" href="/league/rosters">
              Review league rosters
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
