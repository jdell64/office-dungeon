/**
 * Office encounter definitions — stepping on an enemy tile opens a prompt; choices resolve instantly.
 * Tune balance here; optional `encounterId` on layout enemies overrides random assignment.
 */

/** Marks choices that Aggressive Reply improves (+1 credits on top of base). */
export type EncounterPerkTag = "aggressive";

export type EncounterChoiceDef = {
  label: string;
  energyDelta: number;
  stressDelta: number;
  creditsDelta: number;
  /** Shown in status line when set; otherwise GameScene builds a short summary. */
  statusMessage?: string;
  perkTag?: EncounterPerkTag;
};

export type EncounterDef = {
  id: string;
  name: string;
  /** Body copy (name is shown separately in the prompt header). */
  prompt: string;
  /** Two or three options; keyboard Y / N / B when three. */
  choices: readonly [EncounterChoiceDef, EncounterChoiceDef] | readonly [EncounterChoiceDef, EncounterChoiceDef, EncounterChoiceDef];
};

export const ENCOUNTERS: readonly EncounterDef[] = [
  {
    id: "angry_manager",
    name: "Angry Manager",
    prompt:
      "Your manager is waving a printout like it personally betrayed them.\nHow do you handle it?",
    choices: [
      {
        label: "Take the blame",
        energyDelta: -1,
        stressDelta: 1,
        creditsDelta: 0,
        statusMessage: "You absorbed the heat.",
      },
      {
        label: "Blame the vendor",
        energyDelta: -1,
        stressDelta: 0,
        creditsDelta: 1,
        perkTag: "aggressive",
        statusMessage: "Deflected with flair.",
      },
      {
        label: "Nod and vanish",
        energyDelta: 0,
        stressDelta: 2,
        creditsDelta: 0,
        statusMessage: "You ghosted toward the kitchen.",
      },
    ],
  },
  {
    id: "reply_all_disaster",
    name: "Reply All Disaster",
    prompt:
      "Someone reply-alled the whole company with \"Thanks!!!\" and now 400 people are \"looping in\".\nWhat's your move?",
    choices: [
      {
        label: "Mute thread",
        energyDelta: -1,
        stressDelta: 0,
        creditsDelta: 0,
        statusMessage: "Silence is golden.",
      },
      {
        label: "Send helpful FAQ",
        energyDelta: -2,
        stressDelta: 1,
        creditsDelta: 1,
        statusMessage: "You became the unofficial IT desk.",
      },
      {
        label: "Reply-all \"Please stop replying all\"",
        energyDelta: -7,
        stressDelta: 2,
        creditsDelta: 3,
        perkTag: "aggressive",
        statusMessage: "Legend. Chaos. Same thing.",
      },
    ],
  },
  {
    id: "surprise_meeting",
    name: "Surprise Meeting",
    prompt:
      "A calendar invite materializes: \"QUICK SYNC\" starting in 60 seconds.\nYou are not mentally present.",
    choices: [
      {
        label: "Nod through it",
        energyDelta: -1,
        stressDelta: 0,
        creditsDelta: 0,
        statusMessage: "You survived on autopilot.",
      },
      {
        label: "Say you're double-booked",
        energyDelta: -1,
        stressDelta: 1,
        creditsDelta: 0,
        statusMessage: "You slipped away.",
      },
      {
        label: "Propose a follow-up deck",
        energyDelta: -2,
        stressDelta: 1,
        creditsDelta: 1,
        perkTag: "aggressive",
        statusMessage: "You traded pain for optics.",
      },
    ],
  },
  {
    id: "coffee_machine_jackpot",
    name: "Coffee Machine Jackpot",
    prompt:
      "The office machine dispenses something that actually smells like coffee.\nRare drop.",
    choices: [
      {
        label: "One modest cup",
        energyDelta: 1,
        stressDelta: 0,
        creditsDelta: 0,
        statusMessage: "Warm and dignified.",
      },
      {
        label: "Double-shot greed",
        energyDelta: 2,
        stressDelta: 1,
        creditsDelta: 0,
        statusMessage: "Jitters incoming.",
      },
    ],
  },
  {
    id: "it_ticket_swarm",
    name: "IT Ticket Swarm",
    prompt:
      "Seventeen tickets tagged \"URGENT\" and they all think they're yours.\nPick a strategy.",
    choices: [
      {
        label: "Close the easy five",
        energyDelta: -2,
        stressDelta: 1,
        creditsDelta: 1,
        statusMessage: "Inbox dented.",
      },
      {
        label: "Auto-reply: known issue",
        energyDelta: -1,
        stressDelta: 2,
        creditsDelta: 2,
        perkTag: "aggressive",
        statusMessage: "Template diplomacy.",
      },
      {
        label: "Mark as duplicate",
        energyDelta: 0,
        stressDelta: 2,
        creditsDelta: 0,
        statusMessage: "You chose peace over closure.",
      },
    ],
  },
  {
    id: "gossip_coworker",
    name: "Gossip Coworker",
    prompt:
      "A coworker leans in: \"Between us…\" You can smell drama.\nHow do you respond?",
    choices: [
      {
        label: "Hear them out",
        energyDelta: 0,
        stressDelta: 2,
        creditsDelta: 1,
        statusMessage: "You are now part of the lore.",
      },
      {
        label: "Change subject to spreadsheets",
        energyDelta: -1,
        stressDelta: 0,
        creditsDelta: 0,
        statusMessage: "Pivot masterclass.",
      },
    ],
  },
  {
    id: "broken_printer",
    name: "Broken Printer",
    prompt:
      "The printer says \"Ready\" but prints blank pages and evil laughter (metaphorical).\nDeadline in an hour.",
    choices: [
      {
        label: "Reboot it twelve times",
        energyDelta: -2,
        stressDelta: 0,
        creditsDelta: 0,
        statusMessage: "IT classic speedrun.",
      },
      {
        label: "Email PDF instead",
        energyDelta: -1,
        stressDelta: 1,
        creditsDelta: 0,
        statusMessage: "You adapted.",
      },
      {
        label: "Kick it (morally)",
        energyDelta: -1,
        stressDelta: 2,
        creditsDelta: 1,
        perkTag: "aggressive",
        statusMessage: "Therapeutic violence.",
      },
    ],
  },
  {
    id: "slack_ping_storm",
    name: "Slack Ping Storm",
    prompt:
      "Your notifications are a slot machine of @here and @channel.\nHow do you cope?",
    choices: [
      {
        label: "Do not disturb 1 hour",
        energyDelta: 0,
        stressDelta: 1,
        creditsDelta: 0,
        statusMessage: "Brief serenity.",
      },
      {
        label: "Answer everything",
        energyDelta: -3,
        stressDelta: 0,
        creditsDelta: 2,
        statusMessage: "Hero mode. Empty tank.",
      },
    ],
  },
] as const;

const encounterById = new Map(ENCOUNTERS.map((e) => [e.id, e] as const));

export function getEncounterById(id: string): EncounterDef {
  const e = encounterById.get(id);
  if (!e) throw new Error(`Unknown encounter: ${id}`);
  return e;
}

/** Ids for random assignment on enemy tiles (all encounters). */
export const ENCOUNTER_POOL_IDS: readonly string[] = ENCOUNTERS.map((e) => e.id);

export type ResolvedEncounterChoice = {
  energyDelta: number;
  stressDelta: number;
  creditsDelta: number;
  statusMessage?: string;
  label: string;
};

/**
 * Apply equipped perk tweaks to a single choice before difficulty scaling (stress scaled later in GameScene).
 * - Extra Coffee: +1 energy when the choice already gains energy (>0).
 * - Calm Mind: stress gains from this choice reduced by 1 (floor 0).
 * - Aggressive Reply: +1 credits on choices tagged `aggressive`.
 */
export function resolveEncounterChoiceWithPerks(
  choice: EncounterChoiceDef,
  equippedPerkId: string | null | undefined
): ResolvedEncounterChoice {
  let energyDelta = choice.energyDelta;
  let stressDelta = choice.stressDelta;
  let creditsDelta = choice.creditsDelta;

  if (equippedPerkId === "extra_coffee" && energyDelta > 0) {
    energyDelta += 1;
  }
  if (equippedPerkId === "calm_mind" && stressDelta > 0) {
    stressDelta = Math.max(0, stressDelta - 1);
  }
  if (
    equippedPerkId === "aggressive_reply" &&
    choice.perkTag === "aggressive"
  ) {
    creditsDelta += 1;
  }

  return {
    label: choice.label,
    energyDelta,
    stressDelta,
    creditsDelta,
    statusMessage: choice.statusMessage,
  };
}
