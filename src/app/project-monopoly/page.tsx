"use client";

import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
import { useLanguage } from "@/app/_ui/LanguageProvider";

type ProjectType =
  | "LA_JOYA"
  | "LA_JOYA_PERLA"
  | "LA_JOYA_PERLA_II"
  | "LAGOON_VERDE";

type UnitTypeKey =
  | "STUDIO"
  | "ONE_PLUS_ONE"
  | "TWO_PLUS_ONE"
  | "THREE_PLUS_ONE"
  | "FOUR_PLUS_ONE"
  | "VILLA"
  | "PENTHOUSE"
  | "OTHER";

type PlayerId = "investor" | "family" | "holiday" | "rental";
type TurnPhase = "READY" | "DECISION" | "DONE";

type ProjectMeta = {
  value: ProjectType;
  label: string;
  short: string;
  color: string;
  bg: string;
};

type UnitTypeMeta = {
  key: UnitTypeKey;
  label: string;
  short: string;
  multiplier: number;
};

type Player = {
  id: PlayerId;
  name: string;
  profileTr: string;
  profileEn: string;
  initials: string;
  color: string;
  cash: number;
  position: number;
  missedTurns: number;
};

type PropertySpace = {
  kind: "property";
  id: string;
  project: ProjectType;
  unitType: UnitTypeKey;
  price: number;
  rent: number;
  ownerId?: PlayerId;
};

type BoardSpace =
  | PropertySpace
  | {
      kind: "start" | "visit" | "contract" | "followup" | "chance";
      id: string;
      titleTr: string;
      titleEn: string;
      subtitleTr: string;
      subtitleEn: string;
    };

type Activity = {
  id: number;
  text: string;
  tone?: "good" | "warn" | "info";
};

type ChanceCard = {
  titleTr: string;
  titleEn: string;
  detailTr: string;
  detailEn: string;
  cashDelta: number;
};

const BOARD_SIZE = 11;
const START_BONUS = 200;

const PROJECTS: ProjectMeta[] = [
  {
    value: "LA_JOYA",
    label: "La Joya",
    short: "LJ",
    color: "#ef4444",
    bg: "rgba(239, 68, 68, 0.12)",
  },
  {
    value: "LA_JOYA_PERLA",
    label: "La Joya Perla",
    short: "LJP",
    color: "#2563eb",
    bg: "rgba(37, 99, 235, 0.12)",
  },
  {
    value: "LA_JOYA_PERLA_II",
    label: "La Joya Perla II",
    short: "LJP II",
    color: "#eab308",
    bg: "rgba(234, 179, 8, 0.14)",
  },
  {
    value: "LAGOON_VERDE",
    label: "Lagoon Verde",
    short: "LV",
    color: "#22c55e",
    bg: "rgba(34, 197, 94, 0.12)",
  },
];

const UNIT_TYPES: UnitTypeMeta[] = [
  { key: "STUDIO", label: "Studio", short: "Studio", multiplier: 1 },
  { key: "ONE_PLUS_ONE", label: "1+1", short: "1+1", multiplier: 1.16 },
  { key: "TWO_PLUS_ONE", label: "2+1", short: "2+1", multiplier: 1.36 },
  { key: "THREE_PLUS_ONE", label: "3+1", short: "3+1", multiplier: 1.58 },
  { key: "FOUR_PLUS_ONE", label: "4+1", short: "4+1", multiplier: 1.82 },
  { key: "VILLA", label: "Villa", short: "Villa", multiplier: 2.1 },
  { key: "PENTHOUSE", label: "Penthouse", short: "Pent.", multiplier: 2.32 },
  { key: "OTHER", label: "Custom", short: "Custom", multiplier: 1.08 },
];

const INITIAL_PLAYERS: Player[] = [
  {
    id: "investor",
    name: "Investor",
    profileTr: "Yatırımcı",
    profileEn: "Investor",
    initials: "IN",
    color: "#ef4444",
    cash: 4200,
    position: 0,
    missedTurns: 0,
  },
  {
    id: "family",
    name: "Family",
    profileTr: "Aile",
    profileEn: "Family",
    initials: "FA",
    color: "#2563eb",
    cash: 3900,
    position: 0,
    missedTurns: 0,
  },
  {
    id: "holiday",
    name: "Holiday",
    profileTr: "Tatil evi",
    profileEn: "Holiday",
    initials: "HO",
    color: "#22c55e",
    cash: 3600,
    position: 0,
    missedTurns: 0,
  },
  {
    id: "rental",
    name: "Rental",
    profileTr: "Kira odaklı",
    profileEn: "Rental focus",
    initials: "RE",
    color: "#d97706",
    cash: 4500,
    position: 0,
    missedTurns: 0,
  },
];

const CHANCE_CARDS: ChanceCard[] = [
  {
    titleTr: "Rezervasyon ilgisi",
    titleEn: "Reservation interest",
    detailTr: "Müşteri aynı tipte ikinci seçenek istedi. Ek bütçe açıldı.",
    detailEn: "The prospect asked for a second option of the same type. Extra budget opened.",
    cashDelta: 180,
  },
  {
    titleTr: "Fiyat itirazı",
    titleEn: "Price objection",
    detailTr: "Karşılaştırmalı fiyat çalışması gerekiyor.",
    detailEn: "A comparative pricing note is needed.",
    cashDelta: -120,
  },
  {
    titleTr: "Saha turu etkisi",
    titleEn: "Site visit effect",
    detailTr: "Saha gezisi karar hızını artırdı.",
    detailEn: "The site visit improved decision momentum.",
    cashDelta: 220,
  },
  {
    titleTr: "Takip gecikti",
    titleEn: "Follow-up delayed",
    detailTr: "Takip geç yapıldı, ilgi zayıfladı.",
    detailEn: "Follow-up was delayed and intent softened.",
    cashDelta: -160,
  },
];

let logId = 0;

function projectMeta(project: ProjectType) {
  return PROJECTS.find((item) => item.value === project) || PROJECTS[0];
}

function unitMeta(unitType: UnitTypeKey) {
  return UNIT_TYPES.find((item) => item.key === unitType) || UNIT_TYPES[0];
}

function money(value: number, locale: string) {
  const formatted = new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US").format(Math.max(0, value));
  return `£${formatted}k`;
}

function playerProfile(player: Player, locale: string) {
  return locale === "tr" ? player.profileTr : player.profileEn;
}

function spaceTitle(space: BoardSpace, locale: string) {
  if (space.kind === "property") {
    return `${projectMeta(space.project).short} ${unitMeta(space.unitType).short}`;
  }

  return locale === "tr" ? space.titleTr : space.titleEn;
}

function spaceSubtitle(space: BoardSpace, locale: string) {
  if (space.kind === "property") {
    const unitType = unitMeta(space.unitType);
    return `${projectMeta(space.project).label} / ${unitType.label}`;
  }

  return locale === "tr" ? space.subtitleTr : space.subtitleEn;
}

function getPerimeterPositions() {
  const positions: Array<{ row: number; col: number }> = [];

  for (let col = BOARD_SIZE; col >= 1; col -= 1) positions.push({ row: BOARD_SIZE, col });
  for (let row = BOARD_SIZE - 1; row >= 1; row -= 1) positions.push({ row, col: 1 });
  for (let col = 2; col <= BOARD_SIZE; col += 1) positions.push({ row: 1, col });
  for (let row = 2; row <= BOARD_SIZE - 1; row += 1) positions.push({ row, col: BOARD_SIZE });

  return positions;
}

function createProperty(project: ProjectMeta, unitType: UnitTypeMeta, projectIndex: number, unitIndex: number): PropertySpace {
  const base = 130 + projectIndex * 35 + unitIndex * 34;
  const price = Math.round(base * unitType.multiplier);
  return {
    kind: "property",
    id: `${project.value}-${unitType.key}`,
    project: project.value,
    unitType: unitType.key,
    price,
    rent: Math.round(price * 0.18),
  };
}

function createBoardSpaces(): BoardSpace[] {
  const spaces: BoardSpace[] = [
    {
      kind: "start",
      id: "start",
      titleTr: "START",
      titleEn: "START",
      subtitleTr: "£200k lead bonus",
      subtitleEn: "£200k lead bonus",
    },
  ];

  PROJECTS.forEach((project, projectIndex) => {
    UNIT_TYPES.forEach((unitType, unitIndex) => {
      spaces.push(createProperty(project, unitType, projectIndex, unitIndex));
    });

    spaces.push({
      kind: "chance",
      id: `chance-${project.value}`,
      titleTr: "Şans",
      titleEn: "Chance",
      subtitleTr: "Kart çek",
      subtitleEn: "Draw card",
    });

    if (projectIndex === 0) {
      spaces.push({
        kind: "visit",
        id: "site-visit",
        titleTr: "Saha Turu",
        titleEn: "Site Visit",
        subtitleTr: "İlgi güçlenir",
        subtitleEn: "Intent improves",
      });
    } else if (projectIndex === 1) {
      spaces.push({
        kind: "contract",
        id: "contract",
        titleTr: "Kontrat",
        titleEn: "Contract",
        subtitleTr: "Masraf öde",
        subtitleEn: "Pay cost",
      });
    } else if (projectIndex === 2) {
      spaces.push({
        kind: "followup",
        id: "follow-up",
        titleTr: "Takip",
        titleEn: "Follow-up",
        subtitleTr: "Aksiyon al",
        subtitleEn: "Take action",
      });
    }
  });

  return spaces.slice(0, 40);
}

function initialLog(locale: string): Activity[] {
  return [
    {
      id: logId += 1,
      text:
        locale === "tr"
          ? "Oyun hazır. İlk potansiyel müşteri Investor, START noktasında."
          : "Game ready. First prospect Investor is on START.",
      tone: "info",
    },
  ];
}

function DiceFace({ value }: { value: number }) {
  const dotMap: Record<number, number[]> = {
    1: [5],
    2: [1, 9],
    3: [1, 5, 9],
    4: [1, 3, 7, 9],
    5: [1, 3, 5, 7, 9],
    6: [1, 3, 4, 6, 7, 9],
  };

  return (
    <span className="dice-face" aria-label={`Dice ${value}`}>
      {dotMap[value].map((cell) => (
        <span key={cell} className="dice-dot" style={{ gridArea: `p${cell}` }} />
      ))}
    </span>
  );
}

export default function ProjectMonopolyPage() {
  const { locale } = useLanguage();
  const [spaces, setSpaces] = useState<BoardSpace[]>(() => createBoardSpaces());
  const [players, setPlayers] = useState<Player[]>(() => INITIAL_PLAYERS.map((player) => ({ ...player })));
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [dice, setDice] = useState<[number, number]>([1, 1]);
  const [phase, setPhase] = useState<TurnPhase>("READY");
  const [turnCount, setTurnCount] = useState(0);
  const [activities, setActivities] = useState<Activity[]>(() => initialLog(locale));
  const [lastChance, setLastChance] = useState<ChanceCard | null>(null);

  const positions = useMemo(() => getPerimeterPositions(), []);
  const currentPlayer = players[currentPlayerIndex];
  const selectedSpace = spaces[selectedIndex] || spaces[0];
  const holdings = spaces.filter(
    (space): space is PropertySpace =>
      space.kind === "property" && space.ownerId === currentPlayer.id,
  );
  const ownedCountByPlayer = useMemo(
    () =>
      players.reduce<Record<PlayerId, number>>((acc, player) => {
        acc[player.id] = spaces.filter(
          (space) => space.kind === "property" && space.ownerId === player.id,
        ).length;
        return acc;
      }, {} as Record<PlayerId, number>),
    [players, spaces],
  );
  const round = Math.floor(turnCount / players.length) + 1;
  const selectedOwner =
    selectedSpace.kind === "property" && selectedSpace.ownerId
      ? players.find((player) => player.id === selectedSpace.ownerId)
      : null;

  function addActivity(text: string, tone: Activity["tone"] = "info") {
    setActivities((current) => [
      { id: logId += 1, text, tone },
      ...current,
    ].slice(0, 6));
  }

  function resetGame() {
    setSpaces(createBoardSpaces());
    setPlayers(INITIAL_PLAYERS.map((player) => ({ ...player })));
    setCurrentPlayerIndex(0);
    setSelectedIndex(0);
    setDice([1, 1]);
    setPhase("READY");
    setTurnCount(0);
    setLastChance(null);
    setActivities(initialLog(locale));
  }

  function finishTurn() {
    const nextIndex = (currentPlayerIndex + 1) % players.length;
    setCurrentPlayerIndex(nextIndex);
    setSelectedIndex(players[nextIndex].position);
    setPhase("READY");
    setLastChance(null);
    setTurnCount((current) => current + 1);
  }

  function rollDice() {
    if (phase !== "READY") return;

    if (currentPlayer.missedTurns > 0) {
      setPlayers((current) =>
        current.map((player, index) =>
          index === currentPlayerIndex
            ? { ...player, missedTurns: Math.max(0, player.missedTurns - 1) }
            : player,
        ),
      );
      addActivity(
        locale === "tr"
          ? `${playerProfile(currentPlayer, locale)} takip turunu bekledi.`
          : `${playerProfile(currentPlayer, locale)} waited one follow-up turn.`,
        "warn",
      );
      setPhase("DONE");
      return;
    }

    const first = Math.floor(Math.random() * 6) + 1;
    const second = Math.floor(Math.random() * 6) + 1;
    const total = first + second;
    const nextPosition = (currentPlayer.position + total) % spaces.length;
    const passedStart = currentPlayer.position + total >= spaces.length;
    const landed = spaces[nextPosition];
    let nextPlayers = players.map((player) => ({ ...player }));
    const actingPlayer = nextPlayers[currentPlayerIndex];
    let nextPhase: TurnPhase = "DONE";
    let tone: Activity["tone"] = "info";
    let message =
      locale === "tr"
        ? `${playerProfile(actingPlayer, locale)} ${total} ilerledi: ${spaceTitle(landed, locale)}.`
        : `${playerProfile(actingPlayer, locale)} moved ${total}: ${spaceTitle(landed, locale)}.`;

    if (passedStart) {
      actingPlayer.cash += START_BONUS;
      message += locale === "tr" ? ` START bonusu +${money(START_BONUS, locale)}.` : ` START bonus +${money(START_BONUS, locale)}.`;
      tone = "good";
    }

    if (landed.kind === "property") {
      const ownerIndex = landed.ownerId
        ? nextPlayers.findIndex((player) => player.id === landed.ownerId)
        : -1;

      if (!landed.ownerId) {
        nextPhase = "DECISION";
        message +=
          locale === "tr"
            ? ` Rezerve edilebilir: ${money(landed.price, locale)}.`
            : ` Available to reserve: ${money(landed.price, locale)}.`;
      } else if (ownerIndex === currentPlayerIndex) {
        message += locale === "tr" ? " Bu portföy zaten sende." : " You already own this portfolio tile.";
        tone = "good";
      } else if (ownerIndex >= 0) {
        const payment = Math.min(actingPlayer.cash, landed.rent);
        actingPlayer.cash -= payment;
        nextPlayers[ownerIndex].cash += payment;
        message +=
          locale === "tr"
            ? ` ${playerProfile(nextPlayers[ownerIndex], locale)} tarafına ${money(payment, locale)} kira ödedi.`
            : ` Paid ${money(payment, locale)} rent to ${playerProfile(nextPlayers[ownerIndex], locale)}.`;
        tone = "warn";
      }
    } else if (landed.kind === "chance") {
      const card = CHANCE_CARDS[Math.floor(Math.random() * CHANCE_CARDS.length)];
      actingPlayer.cash = Math.max(0, actingPlayer.cash + card.cashDelta);
      setLastChance(card);
      message += ` ${locale === "tr" ? card.titleTr : card.titleEn}: ${
        locale === "tr" ? card.detailTr : card.detailEn
      } ${card.cashDelta >= 0 ? "+" : ""}${money(card.cashDelta, locale)}.`;
      tone = card.cashDelta >= 0 ? "good" : "warn";
    } else if (landed.kind === "visit") {
      actingPlayer.cash += 140;
      message += locale === "tr" ? ` Saha turu etkisi +${money(140, locale)}.` : ` Site visit effect +${money(140, locale)}.`;
      tone = "good";
    } else if (landed.kind === "contract") {
      actingPlayer.cash = Math.max(0, actingPlayer.cash - 110);
      message += locale === "tr" ? ` Kontrat masrafı -${money(110, locale)}.` : ` Contract cost -${money(110, locale)}.`;
      tone = "warn";
    } else if (landed.kind === "followup") {
      actingPlayer.missedTurns += 1;
      message += locale === "tr" ? " Bir sonraki tur takip bekler." : " Skips one follow-up turn.";
      tone = "warn";
    } else if (landed.kind === "start") {
      actingPlayer.cash += START_BONUS;
      message += locale === "tr" ? ` Lead bonusu +${money(START_BONUS, locale)}.` : ` Lead bonus +${money(START_BONUS, locale)}.`;
      tone = "good";
    }

    actingPlayer.position = nextPosition;
    setDice([first, second]);
    setPlayers(nextPlayers);
    setSelectedIndex(nextPosition);
    setPhase(nextPhase);
    addActivity(message, tone);
  }

  function reserveSelectedSpace() {
    if (phase !== "DECISION" || selectedSpace.kind !== "property") return;

    if (selectedSpace.ownerId) {
      setPhase("DONE");
      return;
    }

    if (currentPlayer.cash < selectedSpace.price) {
      addActivity(
        locale === "tr"
          ? `${playerProfile(currentPlayer, locale)} için bütçe yetmedi.`
          : `${playerProfile(currentPlayer, locale)} does not have enough budget.`,
        "warn",
      );
      setPhase("DONE");
      return;
    }

    setSpaces((current) =>
      current.map((space, index) =>
        index === selectedIndex && space.kind === "property"
          ? { ...space, ownerId: currentPlayer.id }
          : space,
      ),
    );
    setPlayers((current) =>
      current.map((player, index) =>
        index === currentPlayerIndex
          ? { ...player, cash: Math.max(0, player.cash - selectedSpace.price) }
          : player,
      ),
    );
    addActivity(
      locale === "tr"
        ? `${playerProfile(currentPlayer, locale)} ${spaceSubtitle(selectedSpace, locale)} opsiyonladı.`
        : `${playerProfile(currentPlayer, locale)} reserved ${spaceSubtitle(selectedSpace, locale)}.`,
      "good",
    );
    setPhase("DONE");
  }

  function passSelectedSpace() {
    addActivity(
      locale === "tr"
        ? `${playerProfile(currentPlayer, locale)} opsiyonu pas geçti.`
        : `${playerProfile(currentPlayer, locale)} passed on the option.`,
      "info",
    );
    setPhase("DONE");
  }

  return (
    <div className="game-page">
      <style jsx>{styles}</style>

      <aside className="side-panel">
        <div className="brand-card">
          <img src="/dndblack.png" alt="DND" />
          <div>
            <span>{locale === "tr" ? "Potansiyel müşteri oyunu" : "Prospect game"}</span>
            <h1>{locale === "tr" ? "Proje Monopoly" : "Project Monopoly"}</h1>
          </div>
        </div>

        <div className="players-list">
          {players.map((player, index) => (
            <button
              key={player.id}
              type="button"
              className={`player-card ${index === currentPlayerIndex ? "active" : ""}`}
              onClick={() => setSelectedIndex(player.position)}
            >
              <span className="avatar" style={{ "--player-color": player.color } as CSSProperties}>
                {player.initials}
              </span>
              <span className="player-meta">
                <strong>{playerProfile(player, locale)}</strong>
                <em>{money(player.cash, locale)}</em>
              </span>
              <span className="owned-count">{ownedCountByPlayer[player.id]}</span>
            </button>
          ))}
        </div>

        <section className="portfolio-card">
          <div className="panel-title">
            <span>{locale === "tr" ? "Portföy" : "Portfolio"}</span>
            <strong>{playerProfile(currentPlayer, locale)}</strong>
          </div>
          <div className="portfolio-list">
            {holdings.length ? (
              holdings.slice(0, 6).map((space) => {
                const project = projectMeta(space.project);
                return (
                  <div key={space.id} className="holding-row">
                    <span style={{ "--project-color": project.color } as CSSProperties} />
                    <strong>{spaceTitle(space, locale)}</strong>
                    <em>{money(space.rent, locale)}</em>
                  </div>
                );
              })
            ) : (
              <p>{locale === "tr" ? "Henüz opsiyonlanan unit yok." : "No reserved unit yet."}</p>
            )}
            {holdings.length > 6 ? (
              <small>+{holdings.length - 6} {locale === "tr" ? "daha" : "more"}</small>
            ) : null}
          </div>
        </section>

        <button type="button" className="surrender-button" onClick={resetGame}>
          {locale === "tr" ? "Yeni oyun" : "New game"}
        </button>
      </aside>

      <main className="board-stage">
        <div className="game-board">
          {spaces.map((space, index) => {
            const position = positions[index];
            const playersHere = players.filter((player) => player.position === index);
            const isSelected = selectedIndex === index;

            if (space.kind === "property") {
              const project = projectMeta(space.project);
              const unitType = unitMeta(space.unitType);
              const owner = space.ownerId ? players.find((player) => player.id === space.ownerId) : null;

              return (
                <button
                  key={space.id}
                  type="button"
                  className={`board-space property-space ${isSelected ? "selected" : ""}`}
                  style={
                    {
                      gridColumn: position.col,
                      gridRow: position.row,
                      "--project-color": project.color,
                      "--project-bg": project.bg,
                    } as CSSProperties
                  }
                  onClick={() => setSelectedIndex(index)}
                >
                  <span className="color-strip" />
                  <span className="project-code">{project.short}</span>
                  <strong>{unitType.short}</strong>
                  <em>{money(space.price, locale)}</em>
                  {owner ? <span className="owner-dot" style={{ "--owner-color": owner.color } as CSSProperties} /> : null}
                  <span className="token-stack">
                    {playersHere.map((player) => (
                      <span key={player.id} style={{ "--player-color": player.color } as CSSProperties} />
                    ))}
                  </span>
                </button>
              );
            }

            return (
              <button
                key={space.id}
                type="button"
                className={`board-space special-space ${space.kind} ${isSelected ? "selected" : ""}`}
                style={{ gridColumn: position.col, gridRow: position.row }}
                onClick={() => setSelectedIndex(index)}
              >
                <strong>{spaceTitle(space, locale)}</strong>
                <em>{spaceSubtitle(space, locale)}</em>
                <span className="token-stack">
                  {playersHere.map((player) => (
                    <span key={player.id} style={{ "--player-color": player.color } as CSSProperties} />
                  ))}
                </span>
              </button>
            );
          })}

          <section className="center-console">
            <div className="round-pill">
              {locale === "tr" ? "Tur" : "Round"} {round}
            </div>

            <div className="dice-row">
              <DiceFace value={dice[0]} />
              <DiceFace value={dice[1]} />
            </div>

            <div className="main-actions">
              <button type="button" className="roll-button" onClick={rollDice} disabled={phase !== "READY"}>
                {locale === "tr" ? "Zar at" : "Roll dice"}
              </button>
              <button type="button" className="next-button" onClick={finishTurn} disabled={phase === "READY"}>
                {locale === "tr" ? "Sıradaki" : "Next turn"}
              </button>
            </div>

            <article className="landed-card">
              <div className="landed-heading">
                <span>
                  {locale === "tr" ? "Sıradaki potansiyel" : "Current prospect"}
                </span>
                <strong>{playerProfile(currentPlayer, locale)}</strong>
              </div>
              <div className="landed-title">
                <h2>{spaceTitle(selectedSpace, locale)}</h2>
                <p>{spaceSubtitle(selectedSpace, locale)}</p>
              </div>

              {selectedSpace.kind === "property" ? (
                <div className="property-deal">
                  <div>
                    <span>{locale === "tr" ? "Opsiyon bedeli" : "Option price"}</span>
                    <strong>{money(selectedSpace.price, locale)}</strong>
                  </div>
                  <div>
                    <span>{locale === "tr" ? "Kira etkisi" : "Rent impact"}</span>
                    <strong>{money(selectedSpace.rent, locale)}</strong>
                  </div>
                  <div>
                    <span>{locale === "tr" ? "Sahip" : "Owner"}</span>
                    <strong>{selectedOwner ? playerProfile(selectedOwner, locale) : locale === "tr" ? "Boş" : "Free"}</strong>
                  </div>
                </div>
              ) : lastChance && selectedSpace.kind === "chance" ? (
                <div className="chance-card">
                  <strong>{locale === "tr" ? lastChance.titleTr : lastChance.titleEn}</strong>
                  <p>{locale === "tr" ? lastChance.detailTr : lastChance.detailEn}</p>
                </div>
              ) : (
                <div className="chance-card">
                  <strong>{locale === "tr" ? "Satış hareketi" : "Sales move"}</strong>
                  <p>
                    {locale === "tr"
                      ? "Bu kare potansiyel müşterinin karar yolculuğunu değiştirir."
                      : "This square changes the potential customer decision path."}
                  </p>
                </div>
              )}

              <div className="decision-actions">
                <button
                  type="button"
                  onClick={reserveSelectedSpace}
                  disabled={phase !== "DECISION" || selectedSpace.kind !== "property" || Boolean(selectedSpace.ownerId)}
                >
                  {locale === "tr" ? "Opsiyonla" : "Reserve"}
                </button>
                <button type="button" onClick={passSelectedSpace} disabled={phase !== "DECISION"}>
                  {locale === "tr" ? "Pas geç" : "Pass"}
                </button>
              </div>
            </article>

            <section className="activity-log">
              <div className="activity-title">{locale === "tr" ? "Oyun akışı" : "Game feed"}</div>
              {activities.map((activity) => (
                <p key={activity.id} className={activity.tone || "info"}>
                  {activity.text}
                </p>
              ))}
            </section>
          </section>
        </div>
      </main>
    </div>
  );
}

const styles = `
  :global(html),
  :global(body) {
    overflow: hidden;
  }

  .game-page {
    box-sizing: border-box;
    height: 100vh;
    width: 100vw;
    overflow: hidden;
    display: grid;
    grid-template-columns: 294px minmax(0, 1fr);
    gap: 20px;
    padding: 22px;
    background:
      linear-gradient(135deg, rgba(37, 99, 235, 0.06), transparent 34%),
      linear-gradient(315deg, rgba(34, 197, 94, 0.08), transparent 38%),
      #f3f6fb;
    color: #101827;
  }

  .side-panel {
    min-height: 0;
    height: 100%;
    display: grid;
    grid-template-rows: auto auto minmax(0, 1fr) auto;
    gap: 14px;
  }

  .brand-card,
  .player-card,
  .portfolio-card {
    border: 1px solid rgba(148, 163, 184, 0.28);
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.92);
    box-shadow: 0 18px 42px rgba(15, 23, 42, 0.08);
  }

  .brand-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px;
  }

  .brand-card img {
    width: 74px;
    object-fit: contain;
  }

  .brand-card span,
  .panel-title span,
  .landed-heading span,
  .property-deal span,
  .activity-title {
    display: block;
    color: #64748b;
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 0;
    text-transform: uppercase;
  }

  .brand-card h1 {
    margin: 3px 0 0;
    color: #101827;
    font-size: 23px;
    line-height: 1;
    letter-spacing: 0;
  }

  .players-list {
    display: grid;
    gap: 12px;
  }

  .player-card {
    min-width: 0;
    height: 74px;
    display: grid;
    grid-template-columns: 54px minmax(0, 1fr) auto;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    text-align: left;
    color: #101827;
    cursor: pointer;
  }

  .player-card.active {
    border-color: #ef4444;
    box-shadow: 0 18px 42px rgba(239, 68, 68, 0.16);
  }

  .avatar {
    width: 44px;
    height: 44px;
    border-radius: 14px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 3px solid var(--player-color);
    color: var(--player-color);
    background: color-mix(in srgb, var(--player-color) 13%, white);
    font-weight: 1000;
  }

  .player-meta {
    min-width: 0;
    display: grid;
    gap: 3px;
  }

  .player-meta strong,
  .player-meta em {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .player-meta strong {
    font-size: 15px;
  }

  .player-meta em {
    color: #101827;
    font-style: normal;
    font-weight: 900;
    font-size: 18px;
  }

  .owned-count {
    color: #94a3b8;
    font-weight: 900;
    font-size: 13px;
  }

  .portfolio-card {
    min-height: 0;
    padding: 14px;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    gap: 10px;
    overflow: hidden;
  }

  .panel-title {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 10px;
  }

  .panel-title strong {
    font-size: 13px;
    color: #ef4444;
  }

  .portfolio-list {
    min-height: 0;
    display: grid;
    align-content: start;
    gap: 8px;
    overflow: hidden;
  }

  .portfolio-list p,
  .portfolio-list small {
    margin: 0;
    color: #64748b;
    font-weight: 750;
    font-size: 13px;
  }

  .holding-row {
    display: grid;
    grid-template-columns: 10px minmax(0, 1fr) auto;
    align-items: center;
    gap: 8px;
    min-height: 34px;
    padding: 6px 8px;
    border-radius: 9px;
    background: #f8fafc;
  }

  .holding-row > span {
    width: 8px;
    height: 18px;
    border-radius: 99px;
    background: var(--project-color);
  }

  .holding-row strong {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 13px;
  }

  .holding-row em {
    color: #64748b;
    font-style: normal;
    font-weight: 900;
    font-size: 12px;
  }

  .surrender-button {
    justify-self: center;
    min-width: 128px;
    min-height: 42px;
    border: 1px solid rgba(239, 68, 68, 0.26);
    border-radius: 12px;
    background: white;
    color: #dc2626;
    font-weight: 900;
    cursor: pointer;
  }

  .board-stage {
    min-width: 0;
    min-height: 0;
    display: grid;
    place-items: center;
  }

  .game-board {
    width: min(calc(100vh - 44px), calc(100vw - 358px));
    max-width: 100%;
    aspect-ratio: 1 / 1;
    display: grid;
    grid-template-columns: repeat(11, minmax(0, 1fr));
    grid-template-rows: repeat(11, minmax(0, 1fr));
    gap: 2px;
    padding: 2px;
    border: 1px solid rgba(148, 163, 184, 0.5);
    border-radius: 14px;
    background: #dbe3ec;
    box-shadow: 0 28px 60px rgba(15, 23, 42, 0.16);
    overflow: hidden;
  }

  .board-space {
    min-width: 0;
    min-height: 0;
    position: relative;
    border: 0;
    background: rgba(255, 255, 255, 0.92);
    color: #101827;
    text-align: center;
    cursor: pointer;
    overflow: hidden;
  }

  .board-space.selected {
    outline: 3px solid #38c784;
    outline-offset: -3px;
    z-index: 2;
  }

  .property-space {
    display: grid;
    align-content: center;
    justify-items: center;
    gap: 1px;
    padding: 11px 4px 4px;
    background:
      linear-gradient(180deg, var(--project-bg), rgba(255, 255, 255, 0.92) 58%),
      #fff;
  }

  .color-strip {
    position: absolute;
    inset: 0 0 auto;
    height: 10px;
    background: var(--project-color);
  }

  .project-code {
    color: var(--project-color);
    font-size: clamp(9px, 0.72vw, 11px);
    font-weight: 1000;
    line-height: 1;
  }

  .property-space strong {
    display: block;
    max-width: 100%;
    color: #0f172a;
    font-size: clamp(14px, 1.04vw, 19px);
    line-height: 1.05;
    font-weight: 1000;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    opacity: 1;
  }

  .property-space em {
    color: #64748b;
    font-style: normal;
    font-weight: 900;
    font-size: clamp(9px, 0.72vw, 11px);
  }

  .owner-dot {
    position: absolute;
    left: 5px;
    bottom: 5px;
    width: 8px;
    height: 8px;
    border-radius: 999px;
    background: var(--owner-color);
  }

  .special-space {
    display: grid;
    place-items: center;
    align-content: center;
    gap: 4px;
    padding: 6px;
  }

  .special-space strong {
    color: #101827;
    font-size: clamp(12px, 0.98vw, 17px);
    line-height: 1;
    text-transform: uppercase;
  }

  .special-space em {
    color: #64748b;
    font-style: normal;
    font-weight: 800;
    font-size: clamp(9px, 0.68vw, 11px);
    line-height: 1.1;
  }

  .special-space.start {
    background: #ecfdf5;
  }

  .special-space.visit,
  .special-space.followup {
    background: #eff6ff;
  }

  .special-space.contract {
    background: #fff7ed;
  }

  .special-space.chance {
    background: #f8fafc;
  }

  .special-space.chance strong {
    color: #7c3aed;
  }

  .token-stack {
    position: absolute;
    right: 4px;
    bottom: 4px;
    display: flex;
    gap: 2px;
    flex-wrap: wrap;
    justify-content: flex-end;
    max-width: 34px;
  }

  .token-stack span {
    width: 11px;
    height: 11px;
    border-radius: 99px;
    background: var(--player-color);
    border: 2px solid white;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.22);
  }

  .center-console {
    grid-column: 2 / 11;
    grid-row: 2 / 11;
    min-width: 0;
    min-height: 0;
    display: grid;
    grid-template-rows: auto auto auto minmax(0, 1fr) auto;
    justify-items: center;
    align-content: center;
    gap: 12px;
    padding: 22px;
    background:
      linear-gradient(135deg, rgba(248, 250, 252, 0.96), rgba(239, 246, 255, 0.94));
    border: 1px solid rgba(148, 163, 184, 0.45);
    border-radius: 14px;
  }

  .round-pill {
    min-height: 34px;
    padding: 0 18px;
    border-radius: 999px;
    background: white;
    color: #64748b;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-weight: 900;
    font-size: 13px;
  }

  .dice-row {
    display: flex;
    gap: 12px;
  }

  .dice-face {
    width: 50px;
    height: 50px;
    border-radius: 13px;
    background: white;
    display: grid;
    grid-template:
      "p1 p2 p3" 1fr
      "p4 p5 p6" 1fr
      "p7 p8 p9" 1fr / 1fr 1fr 1fr;
    padding: 8px;
    box-shadow: 0 8px 18px rgba(15, 23, 42, 0.08);
  }

  .dice-dot {
    place-self: center;
    width: 8px;
    height: 8px;
    border-radius: 999px;
    background: #334155;
  }

  .main-actions,
  .decision-actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    justify-content: center;
  }

  .main-actions button,
  .decision-actions button {
    min-height: 44px;
    border-radius: 12px;
    border: 1px solid transparent;
    padding: 0 22px;
    font-weight: 1000;
    cursor: pointer;
  }

  .roll-button,
  .decision-actions button:first-child {
    background: #38c784;
    color: #082114;
    box-shadow: 0 14px 30px rgba(56, 199, 132, 0.26);
  }

  .next-button,
  .decision-actions button:last-child {
    background: white;
    color: #334155;
    border-color: rgba(148, 163, 184, 0.38) !important;
  }

  .main-actions button:disabled,
  .decision-actions button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
    box-shadow: none;
  }

  .landed-card {
    width: min(540px, 100%);
    min-height: 0;
    display: grid;
    gap: 10px;
    padding: 14px;
    border: 1px solid rgba(148, 163, 184, 0.28);
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.94);
    box-shadow: 0 18px 42px rgba(15, 23, 42, 0.08);
  }

  .landed-heading {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    align-items: center;
  }

  .landed-heading strong {
    color: #38c784;
  }

  .landed-title h2,
  .landed-title p {
    margin: 0;
  }

  .landed-title h2 {
    color: #101827;
    font-size: 24px;
    line-height: 1.05;
  }

  .landed-title p {
    margin-top: 3px;
    color: #64748b;
    font-weight: 750;
  }

  .property-deal {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }

  .property-deal div,
  .chance-card {
    min-width: 0;
    border-radius: 10px;
    padding: 10px;
    background: #f8fafc;
  }

  .property-deal strong {
    display: block;
    margin-top: 4px;
    font-size: 14px;
    line-height: 1.1;
  }

  .chance-card strong {
    display: block;
    font-size: 15px;
  }

  .chance-card p {
    margin: 5px 0 0;
    color: #64748b;
    font-size: 13px;
    line-height: 1.35;
    font-weight: 720;
  }

  .activity-log {
    width: min(540px, 100%);
    min-height: 0;
    display: grid;
    align-content: end;
    gap: 6px;
    padding: 12px;
    border: 1px solid rgba(148, 163, 184, 0.26);
    border-radius: 14px;
    background: white;
    overflow: hidden;
  }

  .activity-log p {
    margin: 0;
    padding: 7px 10px;
    border-radius: 999px;
    color: #475569;
    background: #f8fafc;
    font-size: 12px;
    line-height: 1.25;
    font-weight: 720;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .activity-log p.good {
    background: #dcfce7;
    color: #166534;
  }

  .activity-log p.warn {
    background: #ffedd5;
    color: #9a3412;
  }

  @media (max-height: 820px) {
    .game-page {
      padding: 14px;
      gap: 14px;
      grid-template-columns: 270px minmax(0, 1fr);
    }

    .player-card {
      height: 62px;
    }

    .brand-card {
      padding: 10px;
    }

    .brand-card h1 {
      font-size: 20px;
    }

    .game-board {
      width: min(calc(100vh - 28px), calc(100vw - 316px));
    }

    .center-console {
      gap: 8px;
      padding: 16px;
    }

    .landed-card {
      padding: 10px;
      gap: 7px;
    }

    .activity-log p:nth-of-type(n + 5) {
      display: none;
    }

    .dice-face {
      width: 42px;
      height: 42px;
    }
  }

  @media (max-width: 1050px) {
    .game-page {
      grid-template-columns: minmax(0, 1fr);
      padding: 10px;
    }

    .side-panel {
      display: none;
    }

    .game-board {
      width: min(calc(100vh - 20px), calc(100vw - 20px));
    }
  }
`;
