// Chatting with NPCs: after you talk to someone (E), whatever you say in chat for the next minute
// is also heard by them, and they answer in character. Replies come from a local Ollama model when
// one is configured (OLLAMA_URL / OLLAMA_MODEL, like v1), with friendly scripted fallbacks so it
// always works, and back-off if the model is unreachable.

import type { NpcDef } from "../../shared/game/npcs";
import type { Npc, Player } from "./entities";
import type { World } from "./world";

const AI_ENABLED = process.env.AI_NPC_ENABLED !== "false";
const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://192.168.10.90:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "qwen2.5:3b";
const TIMEOUT_MS = 12_000;
const PLAYER_COOLDOWN_MS = 2500;
const LISTEN_MS = 60_000;

export interface ChatContext {
  hour(): number;
  reply(world: World, npc: Npc, p: Player, text: string): void;
}

export class NpcChatService {
  /** Who each player is talking to (and until when they're listening). */
  private listening = new Map<string, { npcId: string; until: number }>();
  private busy = new Set<string>();
  private lastAt = new Map<string, number>();
  private failures = 0;
  private retryAt = 0;

  constructor(private ctx: ChatContext) {}

  /** Called when a player talks to an NPC (E). */
  startListening(p: Player, npc: Npc, now: number): void {
    this.listening.set(p.id, { npcId: npc.id, until: now + LISTEN_MS });
  }

  /** A normal chat line: if the player is mid-conversation, the NPC answers. */
  heard(p: Player, world: World, text: string, now: number): void {
    const l = this.listening.get(p.id);
    if (!l || now > l.until) return;
    const npc = world.npcs.get(l.npcId);
    if (!npc || Math.hypot(npc.x - p.x, npc.y - p.y) > 6) return;
    if (this.busy.has(p.id) || now - (this.lastAt.get(p.id) ?? 0) < PLAYER_COOLDOWN_MS) return;
    this.lastAt.set(p.id, now);
    l.until = now + LISTEN_MS;
    npc.talkUntil = now + 6000;
    npc.f = Math.atan2(p.y - npc.y, p.x - npc.x);
    if (!AI_ENABLED || now < this.retryAt) {
      this.ctx.reply(world, npc, p, scripted(npc.def, p, text));
      return;
    }
    this.busy.add(p.id);
    void this.ask(npc.def, p, world, text)
      .then((reply) => {
        this.failures = 0;
        this.ctx.reply(world, npc, p, reply ?? scripted(npc.def, p, text));
      })
      .catch(() => {
        // Model unreachable: answer from the script, and stop trying for a while after a few misses.
        this.failures += 1;
        if (this.failures >= 3) this.retryAt = Date.now() + 5 * 60_000;
        this.ctx.reply(world, npc, p, scripted(npc.def, p, text));
      })
      .finally(() => this.busy.delete(p.id));
  }

  forget(p: Player): void {
    this.listening.delete(p.id);
    this.busy.delete(p.id);
    this.lastAt.delete(p.id);
  }

  private async ask(def: NpcDef, p: Player, world: World, text: string): Promise<string | null> {
    const hour = Math.floor(this.ctx.hour());
    const system = [
      `You are ${def.name}, a ${def.role} in Balathor, a cosy, cute multiplayer fantasy world (it also has a sci-fi space station and a pirate ocean).`,
      `You are currently in ${world.def.name}. It is ${hour}:00 in the game.`,
      `Things you often say: ${def.lines.map((l) => `"${l}"`).join(" ")}`,
      "Reply in character to the adventurer in one or two short, warm sentences. Be playful and kind.",
      "Never mention being an AI, never break character, and don't invent rewards or game rules. For quests suggest the quest log (L); for shopping, talking to you (E)."
    ].join("\n");
    const user = `${p.name} (a level ${p.save.lv} ${p.save.cls}) says: ${text.slice(0, 200)}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(`${OLLAMA_URL}/api/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ model: OLLAMA_MODEL, stream: false, messages: [{ role: "system", content: system }, { role: "user", content: user }], options: { num_predict: 90, temperature: 0.8 } }),
        signal: controller.signal
      });
      if (!res.ok) throw new Error(`ollama ${res.status}`);
      const data = (await res.json()) as { message?: { content?: string } };
      const reply = cleanReply(data.message?.content ?? "");
      return reply || null;
    } finally {
      clearTimeout(timer);
    }
  }
}

/** Trim model output to a short, safe, single-paragraph line. */
function cleanReply(raw: string): string {
  let s = raw.replace(/<think>[\s\S]*?<\/think>/g, "").replace(/\s+/g, " ").trim();
  s = s.replace(/^["'“]+|["'”]+$/g, "");
  // Drop an unfinished trailing fragment (the model ran out of tokens mid-sentence).
  if (!/[.!?…)]$/.test(s)) {
    const end = Math.max(s.lastIndexOf("."), s.lastIndexOf("!"), s.lastIndexOf("?"));
    if (end > 20) s = s.slice(0, end + 1);
  }
  if (s.length > 220) {
    const cut = s.slice(0, 220);
    const end = Math.max(cut.lastIndexOf("."), cut.lastIndexOf("!"), cut.lastIndexOf("?"));
    s = end > 60 ? cut.slice(0, end + 1) : `${cut}…`;
  }
  return s;
}

/** In-character replies without a model: a few keyword topics, else one of their usual lines. */
export function scripted(def: NpcDef, p: Player, text: string): string {
  const t = text.toLowerCase();
  const pick = <T>(a: T[]) => a[Math.floor(Math.random() * a.length)];
  if (/\b(hi|hello|hey|howdy|greetings|morning|evening)\b/.test(t)) return pick([`Hello, ${p.name}! Lovely to see you.`, `Oh, hi ${p.name}! What brings you by?`, `Well met, ${p.name}!`]);
  if (/\b(thank|thanks|ty|cheers)\b/.test(t)) return pick(["Any time, friend!", "Happy to help!", "You're very welcome."]);
  if (/\b(bye|goodbye|farewell|see you|later)\b/.test(t)) return pick(["Safe travels!", `Come back soon, ${p.name}!`, "Mind the slimes out there!"]);
  if (/\b(quest|job|task|help|work)\b/.test(t)) return pick(["Look for the golden ! over folks' heads, and check your quest log with L.", "If I have something for you, talk to me with E and I'll tell you all about it."]);
  if (def.shopId && /\b(buy|sell|shop|price|wares|gold)\b/.test(t)) return pick(["Have a look at my wares! Talk to me with E.", "Everything's fairly priced. Mostly."]);
  if (/\b(where|how|way|find)\b/.test(t)) return pick(["The minimap (top right) is your friend, and the obelisks along the roads let you travel quickly.", "Follow the roads, and keep an eye on the golden star on your map."]);
  if (/\b(king|castle)\b/.test(t)) return "King Aldric holds court in the castle at the very top of the city. He's ever so kind.";
  if (/\b(name|who are you)\b/.test(t)) return `I'm ${def.name}! Pleased to meet you.`;
  return pick(def.lines);
}
