export interface RobotsSnapshot {
  present: boolean;
  status: number | null;
  disallowAll: boolean;
  searchBotsBlocked: string[];
  aiBotsBlocked: string[];
}

interface RobotsGroup {
  agents: string[];
  disallows: string[];
  allows: string[];
}

const SEARCH_BOTS = ['googlebot', 'bingbot'];
const AI_BOTS = [
  'google-extended',
  'gptbot',
  'claudebot',
  'anthropic-ai',
  'perplexitybot',
  'ccbot',
  'applebot-extended',
  'bytespider',
];

export function parseRobotsGroups(text: string): RobotsGroup[] {
  const groups: RobotsGroup[] = [];
  let current: RobotsGroup | null = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim();
    if (!line) continue;
    const match = line.match(/^(user-agent|allow|disallow)\s*:\s*(.*)$/i);
    if (!match) continue;
    const key = match[1].toLowerCase();
    const value = match[2].trim();
    if (key === 'user-agent') {
      const agent = value.toLowerCase();
      if (!current || current.allows.length > 0 || current.disallows.length > 0) {
        current = { agents: [agent], disallows: [], allows: [] };
        groups.push(current);
      } else {
        current.agents.push(agent);
      }
    } else if (current) {
      if (key === 'allow') current.allows.push(value);
      else current.disallows.push(value);
    }
  }
  return groups;
}

function blocksRoot(groups: RobotsGroup[], agent: string): boolean {
  const specific = groups.filter((group) => group.agents.includes(agent));
  const pool = specific.length > 0 ? specific : groups.filter((group) => group.agents.includes('*'));
  return pool.some(
    (group) => group.disallows.some((rule) => rule === '/') && !group.allows.some((rule) => rule === '/'),
  );
}

export function inspectRobots(status: number, body: string): RobotsSnapshot {
  if (status !== 200) {
    return {
      present: false,
      status,
      disallowAll: false,
      searchBotsBlocked: [],
      aiBotsBlocked: [],
    };
  }
  const groups = parseRobotsGroups(body);
  const searchBotsBlocked = SEARCH_BOTS.filter((agent) => blocksRoot(groups, agent));
  const aiBotsBlocked = AI_BOTS.filter((agent) => blocksRoot(groups, agent));
  return {
    present: true,
    status,
    disallowAll: searchBotsBlocked.includes('googlebot'),
    searchBotsBlocked,
    aiBotsBlocked,
  };
}
