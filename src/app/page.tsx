"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { incidents, type Incident, type Choice } from "./incidents";
import squadData from "./squad-comments.json";
import PixelBackground from "./PixelBackground";

interface Stats {
  uptime: number;
  morale: number;
  cloud_cost: number;
  reputation: number;
}

interface SquadComment {
  option: string;
  member: string;
  comment: string;
}

const INITIAL_STATS: Stats = {
  uptime: 80,
  morale: 60,
  cloud_cost: 20,
  reputation: 80,
};

const SQUAD_INTRO_LINES = [
  "Back again. No problem, we never really logged off.",
  "We're here. Coffee is ready. What are we solving?",
  "Already on the call. Walk us through it.",
  "We had a feeling you'd need us. Let's fix this.",
  "You called, we answered. That's how this works.",
];

const SQUAD_MEMBERS = ["Aleksandar", "Marija", "Petar"];

const RANDOM_STARTUP_NAMES = [
  "ScaleForge", "Deployly", "HyperStack", "KubeCraft", "CloudForge",
  "LaunchLayer", "StackNova", "MetricPilot", "TurboDeploy", "CodeOrbit",
  "InfraSpark", "ShipStack", "CloudPulse", "DevVelocity", "ProdPilot",
];

const AVATARS = [
  "/male-1.png", "/male-2.png", "/male-3.png", "/male-4.png",
  "/female-1.png", "/female-2.png", "/female-3.png", "/female-4.png",
];

interface Scenario {
  intro: (name: string, startup: string) => string[];
  slack: (name: string) => { avatar: string; user: string; text: string }[];
  winEnding: (name: string, startup: string) => string[];
  loseEnding: (name: string, startup: string) => string[];
}

const SCENARIOS: Scenario[] = [
  // Scenario 1 — The Hypergrowth Startup
  {
    intro: (name, startup) => [
      `Welcome, ${name}.`,
      `Today is your first day as CTO at ${startup}.`,
      "The company just raised €12M in Series A funding. The product is scaling faster than anyone expected. The engineering team is confident.",
      "The previous CTO left last Friday. Nobody is sure why.",
      "Production is already on fire.",
    ],
    slack: (name) => [
      { avatar: "🧑‍💼", user: "CEO", text: `Welcome our new CTO, ${name}!` },
      { avatar: "👨‍💻", user: "Dev1", text: "finally" },
      { avatar: "👩‍💻", user: "Dev2", text: "production has been down for 20 minutes btw" },
      { avatar: "🇲🇰", user: "Skopje Squad", text: `CTO, we heard you just started. If things get rough — we're one call away. Use us wisely, we can only join 3 times.` },
    ],
    winEnding: (name, startup) => [
      `Congratulations, ${name}.`,
      `You did what the last CTO could not. ${startup} is still standing, production is stable, and the investors are cautiously optimistic.`,
      "The team has stopped updating their CVs. For now.",
    ],
    loseEnding: (name, startup) => [
      `It was a good run, ${name}.`,
      `${startup} grew too fast and collapsed under its own weight. The post-mortem document is 47 pages long and nobody agrees on what actually happened.`,
      "The CEO is already interviewing your replacement.",
    ],
  },
  // Scenario 2 — The Enterprise Pivot
  {
    intro: (name, startup) => [
      `Welcome, ${name}.`,
      `Today is your first day as CTO at ${startup}.`,
      "The company is pivoting to enterprise. The CEO just signed three Fortune 500 clients. The contracts are signed. The features do not exist yet.",
      "The engineering team found out this morning.",
      "Production is already on fire.",
    ],
    slack: (name) => [
      { avatar: "🧑‍💼", user: "CEO", text: `Excited to introduce our new CTO ${name}! Big things ahead!` },
      { avatar: "👩‍💻", user: "Dev1", text: "hey, did you see the enterprise feature list the CEO sent to the client" },
      { avatar: "👨‍💻", user: "Dev2", text: "yeah" },
      { avatar: "👩‍💻", user: "Dev1", text: "we have 6 weeks" },
      { avatar: "👨‍💻", user: "Dev2", text: "lol" },
      { avatar: "🇲🇰", user: "Skopje Squad", text: `CTO, we heard you just started. If things get rough — we're one call away. Use us wisely, we can only join 3 times.` },
    ],
    winEnding: (name, startup) => [
      `Incredible, ${name}.`,
      `Against all odds, ${startup} delivered. The enterprise clients are happy, production held together, and the CEO is already promising more features to new clients.`,
      "You have three weeks before this starts again.",
    ],
    loseEnding: (name, startup) => [
      `It was a good run, ${name}.`,
      `The enterprise clients are requesting refunds. The CEO is on a call explaining the situation. Legal has entered the building.`,
      `${startup} will be a great case study someday.`,
    ],
  },
  // Scenario 3 — The Stealth Mode Disaster
  {
    intro: (name, startup) => [
      `Welcome, ${name}.`,
      `Today is your first day as CTO at ${startup}.`,
      "The company is in stealth mode. The product is ambitious. The architecture is creative. Nobody has written any tests.",
      "You are the third CTO this year.",
      "Production is already on fire.",
    ],
    slack: (name) => [
      { avatar: "🧑‍💼", user: "CEO", text: `Please welcome ${name}, our new CTO!` },
      { avatar: "👨‍💻", user: "Dev1", text: "oh" },
      { avatar: "👩‍💻", user: "Dev2", text: "already a new one?" },
      { avatar: "👨‍💻", user: "Dev1", text: "good luck though, seriously" },
      { avatar: "🇲🇰", user: "Skopje Squad", text: `CTO, we heard you just started. If things get rough — we're one call away. Use us wisely, we can only join 3 times.` },
    ],
    winEnding: (name, startup) => [
      `Remarkable, ${name}.`,
      `You are officially the longest surviving CTO in ${startup} history. The team is impressed. The codebase is still a mystery but it is running.`,
      "Someone finally wrote a test. It failed, but it existed.",
    ],
    loseEnding: (name, startup) => [
      `It was a good run, ${name}.`,
      `Three CTOs in one year is a record even for this industry. The engineers have started a quiet tradition of leaving a coffee mug on the desk of each departing CTO.`,
      "Yours is already waiting.",
      "The CEO is posting the job listing again.",
    ],
  },
];

type GamePhase = "profile" | "intro" | "slack" | "playing" | "end-narrative" | "report";
type GameMode = "quick" | "full" | "survival";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function getStatLabel(stat: keyof Stats): string {
  const labels: Record<keyof Stats, string> = {
    uptime: "UPTIME",
    morale: "MORALE",
    cloud_cost: "CLOUD $",
    reputation: "REPUTATION",
  };
  return labels[stat];
}

function getStatIcon(stat: keyof Stats): string {
  const icons: Record<keyof Stats, string> = {
    uptime: "▲",
    morale: "♥",
    cloud_cost: "$",
    reputation: "★",
  };
  return icons[stat];
}

function getBarColorClass(stat: keyof Stats, value: number): string {
  if (stat === "cloud_cost") {
    if (value >= 80) return "bg-[var(--red)]";
    if (value >= 50) return "bg-[var(--orange)]";
    return "bg-[var(--green)]";
  }
  if (value <= 20) return "bg-[var(--red)]";
  if (value <= 40) return "bg-[var(--orange)]";
  return "bg-[var(--green)]";
}

type KillStat = "uptime" | "reputation" | "cloud_cost" | "morale";

interface GameOverInfo {
  killStat: KillStat;
  headline: string;
  flavor: string;
}

function getGameOverInfo(stats: Stats): GameOverInfo | null {
  if (stats.uptime <= 0)
    return {
      killStat: "uptime",
      headline: "TOTAL SYSTEM FAILURE",
      flavor: "Everything is down. The status page is also down. The page that monitors the status page is also down.",
    };
  if (stats.morale <= 0)
    return {
      killStat: "morale",
      headline: "THE TEAM QUIT",
      flavor: "Your entire engineering team handed in their resignations. The Slack workspace is now a ghost town.",
    };
  if (stats.reputation <= 0)
    return {
      killStat: "reputation",
      headline: "REPUTATION DESTROYED",
      flavor: "Customers have moved on. Your Glassdoor reviews now require a content warning.",
    };
  if (stats.cloud_cost >= 100)
    return {
      killStat: "cloud_cost",
      headline: "BUDGET OBLITERATED",
      flavor: "The CFO pulled the plug. Your AWS bill is now classified as a national security threat.",
    };
  return null;
}

function getCTOTitle(survived: number, k8sBlames: number, squadCalls: number, killStat: KillStat | null, stats?: Stats, won?: boolean): { title: string; description: string } {
  // Win titles — based on player choices
  if (killStat === null && won && stats) {
    if (stats.uptime >= 70 && stats.morale >= 70 && stats.cloud_cost <= 30 && stats.reputation >= 70)
      return { title: "The Unicorn CTO", description: "All stats above 70, costs under control. Investors are speechless." };
    if (stats.morale >= 70 && stats.cloud_cost <= 40)
      return { title: "People-First CTO", description: "Happy team, healthy budget. The engineers actually like working here." };
    if (stats.uptime >= 70 && stats.cloud_cost >= 60)
      return { title: "Reliability at Any Cost", description: "Production never went down. The cloud bill, however, went up. Way up." };
    if (k8sBlames >= 2)
      return { title: "The Kubernetes Whisperer", description: "You blamed Kubernetes so often it started to feel personal." };
    if (squadCalls >= 3)
      return { title: "Delegation Master", description: "Why solve it yourself when you have a squad in Skopje?" };
    if (stats.morale <= 30 && stats.uptime >= 60)
      return { title: "The Machine", description: "Production is flawless. The team is broken. But hey, uptime is uptime." };
    if (stats.reputation <= 20)
      return { title: "Chaos Survived", description: "Reputation in tatters, but you're still standing. Barely." };
    if (squadCalls === 0)
      return { title: "The Lone Wolf", description: "No help needed. No help wanted. You handled every incident solo." };
    return { title: "Veteran CTO", description: "You survived every incident. The stuff of startup legends." };
  }

  // Loss titles
  if (k8sBlames >= 2) return { title: "Kubernetes Blamer", description: "When in doubt, blame the orchestrator. A time-honored tradition." };
  if (killStat === "cloud_cost") return { title: "Budget Destroyer", description: "You spent money like AWS was a charity. It is not." };
  if (killStat === "morale") return { title: "Burnout Architect", description: "You drove the team into the ground. HR has concerns." };
  if (squadCalls >= 3) return { title: "Delegation Specialist", description: "Why fix it yourself when you can call Macedonia?" };
  if (survived <= 3) return { title: "YOLO Engineer", description: "Your tenure was short but spectacular. Like a deploy on Friday at 5pm." };
  if (survived <= 6) return { title: "Chaos Architect", description: "You didn't just encounter chaos — you designed it." };
  if (survived <= 10) return { title: "Incident Survivor", description: "Not bad. Not great. Your LinkedIn still says 'passionate about uptime.'" };
  if (survived <= 15) return { title: "Steady Hand", description: "Calm under pressure. The on-call engineer everyone wants on their team." };
  if (survived <= 20) return { title: "Production Whisperer", description: "The servers trust you. The team trusts you. Even the interns trust you." };
  return { title: "Almost Legend", description: "You reached the final boss of DevOps and almost won." };
}

function getWinVerdict(stats: Stats, k8sBlames: number, squadCalls: number): string {
  const avgHealth = (stats.uptime + stats.morale + stats.reputation) / 3;
  const costPain = stats.cloud_cost;

  if (avgHealth >= 70 && costPain <= 40) return "Flawless execution. The board wants to give you equity.";
  if (avgHealth >= 70 && costPain > 40) return "Everything works, but Finance would like a word about the bill.";
  if (costPain >= 80) return "The cloud bill will haunt you. And your children. And their children.";
  if (stats.morale <= 20) return "Production is alive. Your team's will to live is not.";
  if (stats.uptime <= 30) return "Production is alive. Barely. Like a server held together with duct tape.";
  if (stats.reputation <= 30) return "You survived, but Twitter will never forget.";
  if (k8sBlames >= 2 && squadCalls >= 2) return "You blamed Kubernetes and outsourced the rest. A true executive.";
  if (squadCalls >= 3) return "The Skopje Squad did the heavy lifting. You managed the Slack threads.";
  if (k8sBlames >= 2) return "Kubernetes took the blame so you didn't have to. A classic.";
  if (avgHealth >= 50) return "A masterclass in controlled chaos. The postmortem will be legendary.";
  return "You survived through sheer stubbornness. Respect.";
}

function getSquadComments(incidentTitle: string): SquadComment[] {
  const entry = squadData.find((d) => d.incident === incidentTitle);
  return entry ? (entry.comments as SquadComment[]) : [];
}

function getMoraleLabel(morale: number): string {
  if (morale >= 80) return "Thriving";
  if (morale >= 60) return "Content";
  if (morale >= 40) return "Stressed";
  if (morale >= 20) return "Burned out";
  return "Mutinous";
}

function getCloudBillLabel(cost: number): string {
  if (cost >= 80) return "Catastrophic";
  if (cost >= 60) return "Alarming";
  if (cost >= 40) return "Growing";
  if (cost >= 20) return "Reasonable";
  return "Frugal";
}

function CTOPlayerCard({ playerName, startupName, avatarImage }: { playerName: string; startupName: string; avatarImage: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-[var(--card-border)]">
      <img src={avatarImage} alt="" className="w-12 h-12 rounded-lg border border-[var(--btn-border)] shrink-0" style={{ imageRendering: "pixelated" }} />
      <div className="min-w-0">
        <div className="text-sm text-[var(--text-bright)] font-bold truncate">{playerName}</div>
        <div className="text-xs text-[var(--text-dim)] truncate">CTO of {startupName}</div>
      </div>
    </div>
  );
}

// ─── Story Components ─────────────────────────────────────────────────

function CTOProfileScreen({ onComplete }: { onComplete: (name: string, startup: string, avatarImage: string, mode: GameMode) => void }) {
  const [name, setName] = useState("");
  const [startup, setStartup] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [gameMode, setGameMode] = useState<GameMode>("full");

  const canContinue = name.trim().length > 0 && selectedAvatar !== null;

  const handleSubmit = () => {
    if (!canContinue) return;
    const finalStartup = startup.trim() || RANDOM_STARTUP_NAMES[Math.floor(Math.random() * RANDOM_STARTUP_NAMES.length)];
    onComplete(name.trim(), finalStartup, selectedAvatar, gameMode);
  };

  const GAME_MODES: { key: GameMode; label: string; desc: string }[] = [
    { key: "quick", label: "Quick Run", desc: "10 incidents. For when you have 2 minutes." },
    { key: "full", label: "Full Week", desc: "25 incidents. The real CTO experience." },
    { key: "survival", label: "Survival Mode", desc: "How far can you go? Incidents never stop." },
  ];

  return (
    <div className="animate-fade-in">
      <div className="bg-[var(--cyan)]/8 border-b border-[var(--cyan)]/20 px-4 py-2.5">
        <span className="text-[var(--cyan)] text-xs font-bold tracking-wider">NEW GAME</span>
      </div>

      <div className="p-4 flex flex-col gap-4">
        <div className="text-center py-2">
          <div className="text-[var(--text-dim)] text-[10px] tracking-widest mb-2">EMPLOYEE ONBOARDING</div>
          <h2 className="text-xl font-bold text-[var(--text-bright)]">Create Your CTO Profile</h2>
          <p className="text-[var(--text-dim)] text-xs mt-1">Before you can break production, we need some details.</p>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[var(--text-dim)] text-[10px] tracking-widest">YOUR NAME</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Alex"
            maxLength={20}
            className="bg-[var(--btn)] border border-[var(--btn-border)] rounded-md px-3 py-2 text-sm text-[var(--text-bright)] placeholder:text-[var(--text-dim)]/50 outline-none focus:border-[var(--cyan)]/60 transition-colors"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[var(--text-dim)] text-[10px] tracking-widest">CHOOSE YOUR AVATAR</label>
          <div className="grid grid-cols-4 gap-2">
            {AVATARS.map((src) => (
              <button
                key={src}
                onClick={() => setSelectedAvatar(src)}
                className={`p-1.5 rounded-md border transition-all cursor-pointer ${
                  selectedAvatar === src
                    ? "border-[var(--cyan)] bg-[var(--cyan)]/10"
                    : "border-[var(--btn-border)] bg-[var(--btn)] hover:bg-[var(--btn-hover)]"
                }`}
              >
                <img src={src} alt="" className="w-full rounded" style={{ imageRendering: "pixelated" }} />
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[var(--text-dim)] text-[10px] tracking-widest">STARTUP NAME <span className="opacity-50">(optional)</span></label>
          <input
            type="text"
            value={startup}
            onChange={(e) => setStartup(e.target.value)}
            placeholder="Leave empty for a random startup name"
            maxLength={30}
            className="bg-[var(--btn)] border border-[var(--btn-border)] rounded-md px-3 py-2 text-sm text-[var(--text-bright)] placeholder:text-[var(--text-dim)]/50 outline-none focus:border-[var(--cyan)]/60 transition-colors"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[var(--text-dim)] text-[10px] tracking-widest">GAME MODE</label>
          <div className="flex flex-col gap-2">
            {GAME_MODES.map((m) => (
              <button
                key={m.key}
                onClick={() => setGameMode(m.key)}
                className={`text-left px-3 py-2.5 rounded-md border transition-all cursor-pointer ${
                  gameMode === m.key
                    ? "border-[var(--cyan)] bg-[var(--cyan)]/10"
                    : "border-[var(--btn-border)] bg-[var(--btn)] hover:bg-[var(--btn-hover)]"
                }`}
              >
                <div className="text-sm text-[var(--text-bright)] font-semibold">{m.label}</div>
                <div className="text-[var(--text-dim)] text-xs mt-0.5">{m.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!canContinue}
          className={`mt-2 w-full border rounded-md px-4 py-2.5 text-sm transition-all ${
            canContinue
              ? "border-[var(--cyan)]/40 text-[var(--cyan)] hover:bg-[var(--cyan)]/10 cursor-pointer"
              : "border-[var(--btn-border)] text-[var(--text-dim)] cursor-not-allowed opacity-40"
          }`}
        >
          [ START MY FIRST DAY ]
        </button>
      </div>
    </div>
  );
}

function IntroStoryScreen({ introLines, onContinue }: { introLines: string[]; onContinue: () => void }) {
  const [visible, setVisible] = useState(0);

  const lines = introLines.map((text, i) => ({
    text,
    size: i === 0 ? "text-2xl" : i === introLines.length - 1 ? "text-xl" : "text-sm",
  }));

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    lines.forEach((_, i) => {
      timers.push(setTimeout(() => setVisible(i + 1), 600 + i * 1200));
    });
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="min-h-[420px] flex flex-col items-center justify-center p-6">
      <div className="flex flex-col items-center gap-5 max-w-[400px]">
        {lines.slice(0, visible).map((line, i) => (
          <p
            key={i}
            className={`${line.size} text-center leading-relaxed animate-fade-in ${
              i === lines.length - 1 ? "text-[var(--orange)] font-bold" : i === 0 ? "text-[#f0e6d3] font-bold" : "text-[#c4b99a]"
            }`}
          >
            {line.text}
          </p>
        ))}

        {visible >= lines.length && (
          <button
            onClick={onContinue}
            className="mt-6 border border-[var(--orange)]/40 text-[var(--orange)] px-6 py-2.5 rounded-md
                       hover:bg-[var(--orange)]/10 transition-colors cursor-pointer text-sm animate-fade-in"
          >
            [ START MY FIRST DAY ]
          </button>
        )}
      </div>
    </div>
  );
}

function SlackWelcomeScreen({ messages, onContinue }: { messages: { avatar: string; user: string; text: string }[]; onContinue: () => void }) {
  const [visibleMessages, setVisibleMessages] = useState(0);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    messages.forEach((_, i) => {
      timers.push(setTimeout(() => setVisibleMessages(i + 1), 800 + i * 1000));
    });
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="animate-fade-in flex flex-col h-full">
      {/* Slack header */}
      <div className="bg-[#1a1d21] border-b border-[#333639] px-4 py-3 flex items-center gap-2">
        <span className="text-[#b9bbbe] text-lg font-bold">#</span>
        <span className="text-white text-sm font-bold">engineering</span>
        <div className="ml-auto flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[var(--green)]"></span>
          <span className="text-[#b9bbbe] text-[10px]">3 online</span>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 bg-[#1a1d21] px-4 py-4 flex flex-col gap-4 min-h-[220px]">
        {messages.slice(0, visibleMessages).map((msg, i) => (
          <div key={i} className="animate-slide-in flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#2b2d31] flex items-center justify-center text-lg shrink-0">
              {msg.avatar}
            </div>
            <div className="flex flex-col gap-0.5">
              <div className="flex items-baseline gap-2">
                <span className="text-white text-sm font-bold">{msg.user}</span>
                <span className="text-[#72767d] text-[10px]">today</span>
              </div>
              <p className="text-[#dcddde] text-sm">{msg.text}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Slack input bar */}
      {visibleMessages >= messages.length && (
        <div className="bg-[#1a1d21] px-4 pb-4 animate-fade-in">
          <button
            onClick={onContinue}
            className="w-full bg-[#248046] hover:bg-[#1a6334] text-white px-4 py-2.5 rounded-md
                       transition-colors cursor-pointer text-sm font-semibold"
          >
            Let&apos;s Go
          </button>
        </div>
      )}
    </div>
  );
}

function EndNarrativeScreen({
  won,
  endingLines,
  onContinue,
}: {
  won: boolean;
  endingLines: string[];
  onContinue: () => void;
}) {
  const [visible, setVisible] = useState(0);

  const lines = endingLines.map((text, i) => ({
    text,
    size: i === 0 ? "text-2xl" : "text-sm",
  }));

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    lines.forEach((_, i) => {
      timers.push(setTimeout(() => setVisible(i + 1), 600 + i * 1200));
    });
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="min-h-[350px] flex flex-col items-center justify-center p-6">
      <div className="flex flex-col items-center gap-5 max-w-[400px]">
        {lines.slice(0, visible).map((line, i) => (
          <p
            key={i}
            className={`${line.size} text-center leading-relaxed animate-fade-in ${
              i === 0 ? "text-[#f0e6d3] font-bold" : i === lines.length - 1 && !won ? "text-[var(--orange)] font-semibold" : "text-[#c4b99a]"
            }`}
          >
            {line.text}
          </p>
        ))}

        {visible >= lines.length && (
          <button
            onClick={onContinue}
            className={`mt-6 border px-6 py-2.5 rounded-md transition-colors cursor-pointer text-sm animate-fade-in ${
              won
                ? "border-[var(--green)]/40 text-[var(--green)] hover:bg-[var(--green)]/10"
                : "border-[var(--orange)]/40 text-[var(--orange)] hover:bg-[var(--orange)]/10"
            }`}
          >
            [ SEE MY REPORT ]
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Game Components ──────────────────────────────────────────────────

function StatusBar({ stats, index, total, gameMode, survivalSurvived }: { stats: Stats; index: number; total: number; gameMode: GameMode; survivalSurvived: number }) {
  const modeLabels: Record<GameMode, string> = { quick: "Quick Run", full: "Full Week", survival: "Survival" };
  return (
    <div className="border-b border-[var(--card-border)] px-4 py-3">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1.5">
          <span className="text-[var(--green)] text-sm font-bold">Deploy</span>
          <span className="text-[var(--text-dim)] text-sm">&</span>
          <span className="text-[var(--red)] text-sm font-bold">Pray</span>
          <span className="text-[var(--text-dim)] text-[9px] ml-1 opacity-60">({modeLabels[gameMode]})</span>
        </div>
        <div className="text-[var(--text-dim)] text-[10px] tracking-wider">
          {gameMode === "survival" ? (
            <>SURVIVED <span className="text-[var(--text)]">{survivalSurvived}</span></>
          ) : (
            <>INCIDENT <span className="text-[var(--text)]">{Math.min(index + 1, total)}</span>/{total}</>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {(Object.keys(stats) as (keyof Stats)[]).map((stat) => {
          const value = clamp(stats[stat], 0, 100);
          const colorClass = getBarColorClass(stat, value);
          return (
            <div key={stat} className="flex flex-col gap-0.5">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-[var(--text-dim)] flex items-center gap-1">
                  <span className="opacity-60">{getStatIcon(stat)}</span>
                  {getStatLabel(stat)}
                </span>
                <span className="text-[var(--text)] tabular-nums">{value}</span>
              </div>
              <div className="h-1 bg-[var(--btn)] rounded-full overflow-hidden">
                <div
                  className={`h-full ${colorClass} rounded-full transition-all duration-500 ease-out`}
                  style={{ width: `${value}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function IncidentCard({
  incident,
  onChoice,
  squadComments,
}: {
  incident: Incident;
  onChoice: (choice: Choice) => void;
  squadComments: SquadComment[] | null;
}) {
  return (
    <div className="animate-fade-in">
      {/* Card header */}
      <div className="px-4 py-3 border-b border-[var(--card-border)]">
        <h2 className="text-sm font-bold text-[var(--text-bright)]">
          {incident.title}
        </h2>
      </div>

      {/* Description */}
      <div className="px-4 py-3">
        <p className="text-[var(--text)] text-xs leading-relaxed">
          {incident.description}
        </p>
      </div>

      {/* Options */}
      <div className="px-4 pb-4 flex flex-col gap-2">
        {incident.options.map((option, i) => {
          const comment = squadComments?.find((c) => c.option === option.text);
          return (
            <button
              key={i}
              onClick={() => onChoice(option)}
              className="text-left bg-[var(--btn)] border border-[var(--btn-border)] rounded-md px-3 py-2
                         hover:border-[var(--cyan)]/60 hover:bg-[var(--btn-hover)]
                         transition-all duration-150 cursor-pointer group"
            >
              <div className="flex items-start gap-3">
                <span className="text-[var(--text-dim)] text-xs mt-0.5 group-hover:text-[var(--cyan)] transition-colors tabular-nums">
                  {i + 1}.
                </span>
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-[var(--text)] group-hover:text-[var(--text-bright)] transition-colors">
                    {option.text}
                  </span>
                  {comment && (
                    <div className="mt-1.5 pl-2.5 border-l-2 border-[var(--cyan)]/25 text-xs">
                      <span className="text-[var(--cyan)]/90">{comment.member}:</span>{" "}
                      <span className="italic text-[var(--text-dim)]">&quot;{comment.comment}&quot;</span>
                    </div>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SquadButton({
  usesLeft,
  onClick,
}: {
  usesLeft: number;
  onClick: () => void;
}) {
  const disabled = usesLeft <= 0;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-2 border rounded-md px-3 py-2 text-xs transition-all
        ${disabled
          ? "border-[var(--btn-border)] text-[var(--text-dim)] cursor-not-allowed opacity-40"
          : "border-[var(--cyan)]/40 text-[var(--cyan)] hover:bg-[var(--cyan)]/10 hover:border-[var(--cyan)]/60 cursor-pointer"
        }`}
    >
      <span>🇲🇰</span>
      <span className="hidden sm:inline">Call Skopje Squad</span>
      <span className="sm:hidden">Squad</span>
      <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] ${disabled ? "bg-[var(--btn)]" : "bg-[var(--cyan)]/15"}`}>
        {usesLeft}
      </span>
    </button>
  );
}

function SquadOverlay({
  callNumber,
  isFirstCall,
  playerName,
  onDismiss,
}: {
  callNumber: number;
  isFirstCall: boolean;
  playerName: string;
  onDismiss: () => void;
}) {
  const [visibleMembers, setVisibleMembers] = useState(0);
  const [showIntro, setShowIntro] = useState(false);
  const [showFirstCallIntro, setShowFirstCallIntro] = useState(false);
  const [showFirstCallQuote, setShowFirstCallQuote] = useState(false);
  const introLineRef = useRef(
    SQUAD_INTRO_LINES[Math.floor(Math.random() * SQUAD_INTRO_LINES.length)]
  );

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    if (isFirstCall) {
      timers.push(setTimeout(() => setShowFirstCallIntro(true), 300));
      SQUAD_MEMBERS.forEach((_, i) => {
        timers.push(setTimeout(() => setVisibleMembers(i + 1), 1400 + i * 600));
      });
      timers.push(setTimeout(() => setShowFirstCallQuote(true), 1400 + SQUAD_MEMBERS.length * 600 + 400));
    } else {
      if (callNumber > 1) {
        timers.push(setTimeout(() => setShowIntro(true), 400));
      }
      const baseDelay = callNumber > 1 ? 1200 : 400;
      SQUAD_MEMBERS.forEach((_, i) => {
        timers.push(setTimeout(() => setVisibleMembers(i + 1), baseDelay + i * 600));
      });
    }

    return () => timers.forEach(clearTimeout);
  }, [callNumber, isFirstCall]);

  const allReady = isFirstCall ? showFirstCallQuote : visibleMembers >= SQUAD_MEMBERS.length;

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onDismiss}
    >
      <div
        className="border border-[var(--card-border)] bg-[var(--card)] rounded-lg p-5 max-w-md w-full mx-4 shadow-2xl shadow-black/60"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[var(--card-border)]">
          <span className="text-base text-[var(--text-dim)]">#</span>
          <span className="font-bold text-[var(--text-bright)] text-sm">skopje-squad-emergency</span>
          <span className="ml-auto text-[var(--text-dim)] text-xs">
            {SQUAD_MEMBERS.length} members
          </span>
        </div>

        {isFirstCall && showFirstCallIntro && (
          <div className="mb-4 text-xs text-[var(--text-dim)] animate-fade-in italic">
            You open a Slack channel with the Skopje Squad.
          </div>
        )}

        {!isFirstCall && callNumber > 1 && showIntro && (
          <div className="mb-4 text-sm text-[var(--yellow)] italic animate-fade-in">
            &gt; {introLineRef.current}
          </div>
        )}

        <div className="flex flex-col gap-3">
          {SQUAD_MEMBERS.slice(0, visibleMembers).map((member, i) => (
            <div
              key={member}
              className="flex items-center gap-3 text-sm animate-slide-in"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <span className="text-base">🇲🇰</span>
              <span>
                <span className="text-[var(--text-bright)] font-semibold">{member}</span>{" "}
                <span className="text-[var(--text-dim)]">joined the channel</span>
              </span>
            </div>
          ))}
        </div>

        {isFirstCall && showFirstCallQuote && (
          <div className="mt-4 flex items-start gap-3 text-sm animate-fade-in">
            <span className="text-base">🇲🇰</span>
            <span>
              <span className="text-[var(--cyan)] font-semibold">Skopje Squad:</span>{" "}
              <span className="text-[var(--text)] italic">&quot;We saw the alert. We&apos;re already on it. Tell us what you need.&quot;</span>
            </span>
          </div>
        )}

        {allReady && (
          <button
            onClick={onDismiss}
            className="mt-5 w-full border border-[var(--cyan)]/40 text-[var(--cyan)] px-4 py-2 rounded-md
                       hover:bg-[var(--cyan)]/10 transition-colors cursor-pointer text-sm animate-fade-in"
          >
            [ CONTINUE ]
          </button>
        )}
      </div>
    </div>
  );
}

function ReportScreen({
  won,
  gameOverInfo,
  survived,
  total,
  stats,
  k8sBlames,
  squadCalls,
  playerName,
  startupName,
  avatarImage,
  fridayDeploys,
  onRestart,
  onNewCTO,
  gameMode,
  survivalSurvived,
}: {
  won: boolean;
  gameOverInfo: GameOverInfo | null;
  survived: number;
  total: number;
  stats: Stats;
  k8sBlames: number;
  squadCalls: number;
  playerName: string;
  startupName: string;
  avatarImage: string;
  fridayDeploys: number;
  onRestart: () => void;
  onNewCTO: () => void;
  gameMode: GameMode;
  survivalSurvived: number;
}) {
  const cto = getCTOTitle(survived, k8sBlames, squadCalls, gameOverInfo?.killStat ?? null, stats, won);
  const timestamp = new Date().toISOString().replace("T", " ").split(".")[0];

  const killStatLabels: Record<KillStat, string> = {
    uptime: "UPTIME -> 0%",
    morale: "MORALE -> 0%",
    reputation: "REPUTATION -> 0%",
    cloud_cost: "CLOUD_COST -> 100%",
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className={`${won ? "bg-[var(--green)]/8 border-b border-[var(--green)]/20" : "bg-[var(--red)]/8 border-b border-[var(--red)]/20"} px-4 py-2.5 flex items-center gap-3`}>
        <span className={`${won ? "text-[var(--green)]" : "text-[var(--red)]"} text-xs font-bold tracking-wider`}>
          CTO SURVIVAL REPORT
        </span>
        <span className="text-[var(--text-dim)] text-[10px] ml-auto">{timestamp} UTC</span>
      </div>

      <div className="p-4 flex flex-col gap-3">
        {won ? (
          <>
            {/* Win hero: avatar + name + title */}
            <div className="flex flex-col items-center gap-3 py-3">
              <img src={avatarImage} alt="" className="w-20 h-20 rounded-lg border border-[var(--green)]/40 bg-[var(--btn)] shadow-lg" style={{ imageRendering: "pixelated" }} />
              <div className="text-center">
                <div className="text-lg text-[var(--text-bright)] font-bold">{playerName}</div>
                <div className="text-xs text-[var(--text-dim)]">CTO of {startupName}</div>
                <div className="text-sm text-[var(--yellow)] mt-1 font-semibold">&quot;{cto.title}&quot;</div>
                <p className="text-[var(--text-dim)] text-xs mt-0.5">{cto.description}</p>
              </div>
            </div>

            <div className="border-t border-[var(--green)]/15" />

            {/* SURVIVED headline */}
            <div className="text-center py-2">
              <h2 className="text-5xl font-bold text-[var(--green)] tracking-tight">SURVIVED</h2>
            </div>
          </>
        ) : (
          <>
            {/* Loss hero: avatar + name + title (mirrors win layout) */}
            <div className="flex flex-col items-center gap-3 py-3">
              <img src={avatarImage} alt="" className="w-20 h-20 rounded-lg border border-[var(--red)]/40 bg-[var(--btn)] shadow-lg" style={{ imageRendering: "pixelated" }} />
              <div className="text-center">
                <div className="text-lg text-[var(--text-bright)] font-bold">{playerName}</div>
                <div className="text-xs text-[var(--text-dim)]">CTO of {startupName}</div>
                <div className="text-sm text-[var(--yellow)] mt-1 font-semibold">&quot;{cto.title}&quot;</div>
                <p className="text-[var(--text-dim)] text-xs mt-0.5">{cto.description}</p>
              </div>
            </div>

            <div className="border-t border-[var(--red)]/15" />

            {/* TERMINATED headline */}
            {gameOverInfo && gameMode === "survival" ? (
              <div className="text-center py-2">
                <div className="text-[var(--text-dim)] text-[10px] tracking-widest mb-1">SURVIVAL MODE</div>
                <h2 className="text-4xl font-bold text-[var(--orange)] tracking-tight">Incidents Survived: {survivalSurvived}</h2>
                <p className="text-[var(--text-dim)] text-xs mt-2 italic">{gameOverInfo.flavor}</p>
              </div>
            ) : gameOverInfo ? (
              <div className="text-center py-2">
                <h2 className="text-5xl font-bold text-[var(--red)] tracking-tight">{gameOverInfo.headline}</h2>
                <p className="text-[var(--text-dim)] text-xs mt-2 italic">{gameOverInfo.flavor}</p>
              </div>
            ) : null}
          </>
        )}

        <div className="border-t border-[var(--card-border)]" />

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <div className="text-[var(--text-dim)] text-[10px] mb-0.5">INCIDENTS SURVIVED</div>
            <div className="text-[var(--green)]">{survived}<span className="text-[var(--text-dim)] text-xs">/{total}</span></div>
          </div>
          {!won && gameOverInfo && (
            <div>
              <div className="text-[var(--text-dim)] text-[10px] mb-0.5">CAUSE OF DEATH</div>
              <div className="text-[var(--red)] text-xs font-mono">{killStatLabels[gameOverInfo.killStat]}</div>
            </div>
          )}
          <div>
            <div className="text-[var(--text-dim)] text-[10px] mb-0.5">UPTIME</div>
            <div className={`text-xs ${stats.uptime <= 20 ? "text-[var(--red)]" : stats.uptime >= 60 ? "text-[var(--green)]" : "text-[var(--yellow)]"}`}>
              {stats.uptime}%
            </div>
          </div>
          <div>
            <div className="text-[var(--text-dim)] text-[10px] mb-0.5">DEVELOPER MORALE</div>
            <div className="text-[var(--yellow)] text-xs">{getMoraleLabel(stats.morale)}</div>
          </div>
          <div>
            <div className="text-[var(--text-dim)] text-[10px] mb-0.5">CLOUD BILL</div>
            <div className="text-[var(--orange)] text-xs">{getCloudBillLabel(stats.cloud_cost)}</div>
          </div>
          <div>
            <div className="text-[var(--text-dim)] text-[10px] mb-0.5">FRIDAY DEPLOYS</div>
            <div className="text-[var(--yellow)] text-xs">
              {fridayDeploys}x
              {fridayDeploys === 0 && <span className="text-[var(--text-dim)] ml-1">(wise)</span>}
              {fridayDeploys >= 1 && <span className="text-[var(--text-dim)] ml-1">(brave or foolish)</span>}
            </div>
          </div>
          <div>
            <div className="text-[var(--text-dim)] text-[10px] mb-0.5">KUBERNETES BLAMED</div>
            <div className="text-[var(--cyan)] text-xs">
              {k8sBlames}x
              {k8sBlames === 0 && <span className="text-[var(--text-dim)] ml-1">(impressive restraint)</span>}
              {k8sBlames >= 2 && <span className="text-[var(--text-dim)] ml-1">(it&apos;s always Kubernetes)</span>}
            </div>
          </div>
          <div>
            <div className="text-[var(--text-dim)] text-[10px] mb-0.5">SKOPJE SQUAD CALLED</div>
            <div className="text-[var(--cyan)] text-xs">
              {squadCalls}x
              {squadCalls === 0 && <span className="text-[var(--text-dim)] ml-1">(lone wolf)</span>}
              {squadCalls >= 3 && <span className="text-[var(--text-dim)] ml-1">(they sent an invoice)</span>}
            </div>
          </div>
        </div>

        <div className="border-t border-[var(--card-border)]" />

        {/* Final system state */}
        <div>
          <div className="text-[var(--text-dim)] text-[10px] tracking-widest mb-2">FINAL SYSTEM STATE</div>
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            {(Object.keys(stats) as (keyof Stats)[]).map((s) => {
              const val = stats[s];
              const isGood = s === "cloud_cost" ? val <= 40 : val >= 60;
              const isWarn = s === "cloud_cost" ? val >= 70 : val <= 30;
              return (
                <div key={s} className={`bg-[var(--btn)] border rounded px-2 py-1.5 ${
                  isWarn ? "border-[var(--red)]/40" : isGood ? "border-[var(--green)]/40" : "border-[var(--btn-border)]"
                }`}>
                  <div className="text-[var(--text-dim)] text-[10px]">{getStatLabel(s)}</div>
                  <div className={`text-sm mt-0.5 font-bold ${
                    isWarn ? "text-[var(--red)]" : isGood ? "text-[var(--green)]" : "text-[var(--yellow)]"
                  }`}>
                    {val}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Verdict (win only) */}
        {won && (
          <>
            <div className="border-t border-[var(--green)]/15" />
            <div className="bg-[var(--green)]/5 border border-[var(--green)]/15 rounded-md px-4 py-2.5 text-center">
              <div className="text-[var(--text-dim)] text-[10px] tracking-widest mb-0.5">FINAL VERDICT</div>
              <p className="text-[var(--green)] text-xs italic">&quot;{getWinVerdict(stats, k8sBlames, squadCalls)}&quot;</p>
            </div>
          </>
        )}

        <div className="border-t border-[var(--card-border)]" />

        {/* Replay buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={onRestart}
            className="flex-1 bg-[var(--btn)] border border-[var(--green)]/40 text-[var(--green)] px-4 py-2 rounded-md
                       hover:bg-[var(--green)]/10 hover:border-[var(--green)]/60 transition-all cursor-pointer text-xs"
          >
            [ PLAY AGAIN ]
          </button>
          <button
            onClick={onNewCTO}
            className="flex-1 bg-[var(--btn)] border border-[var(--btn-border)] text-[var(--text)] px-4 py-2 rounded-md
                       hover:bg-[var(--btn-hover)] hover:border-[var(--text-dim)] transition-all cursor-pointer text-xs"
          >
            [ NEW CTO ]
          </button>
        </div>

        {/* LinkedIn share */}
        <button
          onClick={() => {
            const gameUrl = window.location.href;
            const killStatNames: Record<KillStat, string> = {
              uptime: "Uptime",
              morale: "Morale",
              reputation: "Reputation",
              cloud_cost: "Cloud Cost",
            };
            const text = won
              ? `I just survived all ${total} incidents as CTO of ${startupName} in Deploy & Pray 🙏\n\nFinal stats:\n🟢 Uptime: ${stats.uptime}%\n😤 Morale: ${stats.morale}%\n💸 Cloud Cost: ${stats.cloud_cost}%\n⭐ Reputation: ${stats.reputation}%\n\nMy CTO title: ${cto.title}\n\nCan you do better? Play here: ${gameUrl}\n\n#CTO #DevOps #StartupLife #DeployAndPray`
              : `I just failed as CTO of ${startupName} in Deploy & Pray 🙏\n\nSurvived ${survived} incidents before ${gameOverInfo ? killStatNames[gameOverInfo.killStat] : "everything"} collapsed.\n\nMy CTO title: ${cto.title}\n\nThink you can survive longer? Play here: ${gameUrl}\n\n#CTO #DevOps #StartupLife #DeployAndPray`;
            const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(gameUrl)}&summary=${encodeURIComponent(text)}`;
            window.open(linkedInUrl, "_blank", "noopener,noreferrer");
          }}
          className="w-full bg-[#0A66C2] hover:bg-[#004182] text-white px-4 py-2.5 rounded-md
                     transition-colors cursor-pointer text-xs font-semibold flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
          Share on LinkedIn
        </button>

        {/* Skopje Squad CTA */}
        <div className="bg-[#1a2332] border border-[var(--cyan)]/20 rounded-lg px-4 py-4 text-center">
          <div className="text-sm font-semibold text-[var(--text-bright)] mb-1">
            🇲🇰 Want a real Skopje Squad for your engineering team?
          </div>
          <p className="text-[var(--text-dim)] text-xs mb-3">
            We provide senior engineers from North Macedonia who show up when it matters.
          </p>
          <a
            href="mailto:hello@skopjesquad.com"
            className="inline-block border border-[var(--cyan)]/40 text-[var(--cyan)] px-5 py-2 rounded-md
                       hover:bg-[var(--cyan)]/10 transition-colors text-xs font-semibold"
          >
            Get in touch
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────

export default function Home() {
  // Profile state
  const [playerName, setPlayerName] = useState("");
  const [startupName, setStartupName] = useState("");
  const [avatarImage, setAvatarImage] = useState("");
  const [scenario, setScenario] = useState<Scenario>(() => SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)]);
  const [gameMode, setGameMode] = useState<GameMode>("full");

  // Game phase
  const [phase, setPhase] = useState<GamePhase>("profile");

  // Game state
  const [stats, setStats] = useState<Stats>(INITIAL_STATS);
  const [deck, setDeck] = useState<Incident[]>(() => shuffle(incidents).slice(0, 25));
  const [index, setIndex] = useState(0);
  const [gameOverInfo, setGameOverInfo] = useState<GameOverInfo | null>(null);
  const [won, setWon] = useState(false);
  const [squadUsesLeft, setSquadUsesLeft] = useState(3);
  const [showSquadOverlay, setShowSquadOverlay] = useState(false);
  const [activeSquadComments, setActiveSquadComments] = useState<SquadComment[] | null>(null);
  const [squadCallNumber, setSquadCallNumber] = useState(0);
  const [isFirstSquadCall, setIsFirstSquadCall] = useState(true);
  const [k8sBlames, setK8sBlames] = useState(0);
  const [fridayDeploys, setFridayDeploys] = useState(0);
  const [survivalSurvived, setSurvivalSurvived] = useState(0);

  const currentIncident = deck[index] ?? null;

  const handleChoice = useCallback(
    (choice: Choice) => {
      if (choice.text === "Blame Kubernetes") {
        setK8sBlames((n) => n + 1);
      }

      // Track Friday deploys
      if (currentIncident?.title === "Friday 16:59 deploy" &&
          (choice.text === "Deploy anyway" || choice.text === "YOLO deploy")) {
        setFridayDeploys((n) => n + 1);
      }

      const nextIndex = index + 1;

      // Stat decay: every 3 incidents, uptime and morale drop by 5
      const decayTick = nextIndex % 3 === 0 ? 5 : 0;

      // Cloud cost drift: +1 every incident
      const costDrift = 1;

      const next: Stats = {
        uptime: clamp(stats.uptime + (choice.effects.uptime ?? 0) - decayTick, 0, 100),
        morale: clamp(stats.morale + (choice.effects.morale ?? 0) - decayTick, 0, 100),
        cloud_cost: clamp(
          stats.cloud_cost + (choice.effects.cloud_cost ?? 0) + costDrift,
          0,
          100
        ),
        reputation: clamp(
          stats.reputation + (choice.effects.reputation ?? 0),
          0,
          100
        ),
      };

      setStats(next);
      setActiveSquadComments(null);
      if (gameMode === "survival") {
        setSurvivalSurvived((n) => n + 1);
      }

      const info = getGameOverInfo(next);
      if (info) {
        setGameOverInfo(info);
        setPhase("end-narrative");
        return;
      }

      if (nextIndex >= deck.length) {
        if (gameMode === "survival") {
          // Reshuffle and keep going
          setDeck(shuffle(incidents));
          setIndex(0);
          return;
        }
        setWon(true);
        setPhase("end-narrative");
        return;
      }

      setIndex(nextIndex);
    },
    [stats, index, deck.length, currentIncident, gameMode]
  );

  const callSquad = useCallback(() => {
    if (squadUsesLeft <= 0 || !currentIncident) return;
    const newCallNumber = squadCallNumber + 1;
    setSquadCallNumber(newCallNumber);
    setSquadUsesLeft((n) => n - 1);
    setShowSquadOverlay(true);
  }, [squadUsesLeft, currentIncident, squadCallNumber]);

  const dismissOverlay = useCallback(() => {
    setShowSquadOverlay(false);
    setIsFirstSquadCall(false);
    if (currentIncident) {
      setActiveSquadComments(getSquadComments(currentIncident.title));
    }
  }, [currentIncident]);

  const restart = useCallback(() => {
    setStats(INITIAL_STATS);
    const deckSize = gameMode === "quick" ? 10 : gameMode === "survival" ? 50 : 25;
    setDeck(shuffle(incidents).slice(0, deckSize));
    setIndex(0);
    setGameOverInfo(null);
    setWon(false);
    setSquadUsesLeft(3);
    setActiveSquadComments(null);
    setSquadCallNumber(0);
    setIsFirstSquadCall(true);
    setK8sBlames(0);
    setFridayDeploys(0);
    setSurvivalSurvived(0);
    setScenario(SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)]);
    setPhase("intro");
  }, [gameMode]);

  const newCTO = useCallback(() => {
    setStats(INITIAL_STATS);
    setDeck(shuffle(incidents).slice(0, 25));
    setIndex(0);
    setGameOverInfo(null);
    setWon(false);
    setSquadUsesLeft(3);
    setActiveSquadComments(null);
    setSquadCallNumber(0);
    setIsFirstSquadCall(true);
    setK8sBlames(0);
    setFridayDeploys(0);
    setSurvivalSurvived(0);
    setGameMode("full");
    setPlayerName("");
    setStartupName("");
    setAvatarImage("");
    setScenario(SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)]);
    setPhase("profile");
  }, []);

  const handleProfileComplete = useCallback((name: string, startup: string, avatarImg: string, mode: GameMode) => {
    setPlayerName(name);
    setStartupName(startup);
    setAvatarImage(avatarImg);
    setGameMode(mode);
    const deckSize = mode === "quick" ? 10 : mode === "survival" ? 50 : 25;
    setDeck(shuffle(incidents).slice(0, deckSize));
    setPhase("intro");
  }, []);

  const isGameActive = phase === "playing" && !gameOverInfo && !won;
  const showStatusBar = phase === "playing";
  const showPlayerCard = showStatusBar;

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden p-4">
      {/* Pixel art background */}
      <PixelBackground stats={stats} />

      {/* Squad Overlay */}
      {showSquadOverlay && (
        <SquadOverlay
          callNumber={squadCallNumber}
          isFirstCall={isFirstSquadCall}
          playerName={playerName}
          onDismiss={dismissOverlay}
        />
      )}

      {/* Contained game card */}
      <div className="w-full max-w-[480px] bg-[var(--card)]/95 backdrop-blur-md border border-[var(--card-border)] rounded-lg shadow-2xl shadow-black/50 overflow-hidden z-10 relative flex flex-col max-h-[calc(100vh-2rem)]">
        {/* Player card + Status bar — only during gameplay */}
        {showPlayerCard && <CTOPlayerCard playerName={playerName} startupName={startupName} avatarImage={avatarImage} />}
        {showStatusBar && <StatusBar stats={stats} index={index} total={deck.length} gameMode={gameMode} survivalSurvived={survivalSurvived} />}

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto">
          {phase === "profile" ? (
            <CTOProfileScreen onComplete={handleProfileComplete} />
          ) : phase === "intro" ? (
            <IntroStoryScreen
              introLines={scenario.intro(playerName, startupName)}
              onContinue={() => setPhase("slack")}
            />
          ) : phase === "slack" ? (
            <SlackWelcomeScreen
              messages={scenario.slack(playerName)}
              onContinue={() => setPhase("playing")}
            />
          ) : phase === "end-narrative" ? (
            <EndNarrativeScreen
              won={won}
              endingLines={won ? scenario.winEnding(playerName, startupName) : scenario.loseEnding(playerName, startupName)}
              onContinue={() => setPhase("report")}
            />
          ) : phase === "report" ? (
            <ReportScreen
              won={won}
              gameOverInfo={gameOverInfo}
              survived={gameMode === "survival" ? survivalSurvived : (won ? deck.length : index)}
              total={deck.length}
              stats={stats}
              k8sBlames={k8sBlames}
              squadCalls={3 - squadUsesLeft}
              playerName={playerName}
              startupName={startupName}
              avatarImage={avatarImage}
              fridayDeploys={fridayDeploys}
              onRestart={restart}
              onNewCTO={newCTO}
              gameMode={gameMode}
              survivalSurvived={survivalSurvived}
            />
          ) : currentIncident ? (
            <IncidentCard
              incident={currentIncident}
              onChoice={handleChoice}
              squadComments={activeSquadComments}
            />
          ) : null}
        </div>

        {/* Bottom bar — squad button */}
        {isGameActive && (
          <div className="border-t border-[var(--card-border)] px-4 py-2.5 flex items-center justify-between">
            <SquadButton usesLeft={squadUsesLeft} onClick={callSquad} />
            <span className="text-[var(--text-dim)] text-[10px]">
              <span className="text-[var(--green)]">$</span> ssh prod@{startupName.toLowerCase().replace(/\s+/g, "-")}.io
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
