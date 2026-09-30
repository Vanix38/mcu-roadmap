"use client";

import {
  getChainDisplayItem,
  getChainProgress,
  getChainRangeLabel,
  type CollapsedChain,
} from "@/lib/chains";
import { canCheckItem } from "@/lib/dependency-graph";
import { getSeasonLabel } from "@/lib/mcu";
import { BottomSheet } from "./BottomSheet";
import { McuPoster } from "./McuPoster";

type Props = {
  chain: CollapsedChain | null;
  checked: Set<string>;
  onClose: () => void;
  onToggle: (item: import("@/lib/mcu").McuItem) => void;
  onSelectMember: (item: import("@/lib/mcu").McuItem) => void;
};

export function StackDetailSheet({
  chain,
  checked,
  onClose,
  onToggle,
  onSelectMember,
}: Props) {
  if (!chain) return null;

  const { done, total } = getChainProgress(chain, checked);
  const display = getChainDisplayItem(chain, checked);

  const markAvailable = () => {
    for (const member of chain.members) {
      if (checked.has(member.id)) continue;
      if (!canCheckItem(member, checked)) continue;
      onToggle(member);
      break; // one at a time to respect cascading unlocks in UI state
    }
  };

  const availableCount = chain.members.filter(
    (m) => !checked.has(m.id) && canCheckItem(m, checked),
  ).length;

  return (
    <BottomSheet
      open={Boolean(chain)}
      onClose={onClose}
      title={chain.title}
      size="half"
    >
      <div className="detail-hero">
        <div className="detail-poster">
          <McuPoster item={display} />
        </div>
        <div className="detail-info">
          <h3 className="detail-title">{chain.title}</h3>
          <p className="detail-meta">
            {getChainRangeLabel(chain)}
            {chain.kind === "series" ? " · saisons" : " · films"}
            <br />
            Progression {done}/{total}
          </p>
        </div>
      </div>

      <section className="detail-section">
        <h4 className="detail-section-title">Épisodes de la chaîne</h4>
        <ul className="stack-member-list">
          {chain.members.map((member) => {
            const isChecked = checked.has(member.id);
            const locked = !isChecked && !canCheckItem(member, checked);
            const season = getSeasonLabel(member);
            return (
              <li key={member.id} className="stack-member-row">
                <button
                  type="button"
                  className="stack-member-main"
                  onClick={() => onSelectMember(member)}
                >
                  <div className="list-poster">
                    <McuPoster item={member} />
                  </div>
                  <div className="stack-member-body">
                    <span className="list-title">{member.title}</span>
                    <span className="list-meta">
                      {member.releaseDate.slice(0, 4)}
                      {season ? ` · ${season}` : ""}
                      {locked ? " · 🔒" : ""}
                      {isChecked ? " · Vu" : ""}
                    </span>
                  </div>
                </button>
                <button
                  type="button"
                  className={[
                    "journey-card-btn",
                    isChecked ? "journey-card-btn--ghost" : "",
                  ].join(" ")}
                  disabled={locked && !isChecked}
                  onClick={() => onToggle(member)}
                  aria-label={
                    isChecked
                      ? `Retirer ${member.title}`
                      : `Marquer ${member.title} comme vu`
                  }
                >
                  {isChecked ? "Retirer" : "Vu"}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {availableCount > 0 ? (
        <div className="detail-actions">
          <button
            type="button"
            className="detail-btn detail-btn--primary"
            onClick={markAvailable}
          >
            Marquer le prochain disponible
          </button>
        </div>
      ) : null}
    </BottomSheet>
  );
}
