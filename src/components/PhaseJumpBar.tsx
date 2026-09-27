"use client";

type Props = {
  phases: readonly string[];
  activePhase: string | null;
  onJump: (phase: string) => void;
};

export function PhaseJumpBar({ phases, activePhase, onJump }: Props) {
  return (
    <div className="phase-jump" role="toolbar" aria-label="Aller à une phase">
      {phases.map((phase) => (
        <button
          key={phase}
          type="button"
          className={[
            "phase-jump-chip",
            activePhase === phase ? "phase-jump-chip--active" : "",
          ].join(" ")}
          onClick={() => onJump(phase)}
          aria-pressed={activePhase === phase}
        >
          {phase.replace("Phase ", "P")}
        </button>
      ))}
    </div>
  );
}
