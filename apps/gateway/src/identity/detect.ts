/**
 * Agent identity detection. The demo uses a User-Agent tag / X-Agent-Name header.
 * Production adapters plug in here: Web Bot Auth (RFC 9421 HTTP Message Signatures),
 * Proof x401, Meta/Sierra Personal Agent Protocol, Visa TAP, behavioral signals.
 */
export interface AgentIdentity {
  name: string;
  method: 'user-agent-tag' | 'x-agent-name';
}

export interface AgentDetector {
  readonly id: string;
  detect(headers: Headers): AgentIdentity | null;
}

/** Demo detector: User-Agent contains e.g. "InstinctDemo/1.0", or an X-Agent-Name header is present. */
export class DemoTagDetector implements AgentDetector {
  readonly id = 'demo-tag';
  constructor(private readonly tag: string) {}

  detect(headers: Headers): AgentIdentity | null {
    const explicit = headers.get('x-agent-name');
    if (explicit) return { name: explicit.slice(0, 60), method: 'x-agent-name' };
    const ua = headers.get('user-agent') ?? '';
    if (this.tag && ua.includes(this.tag)) return { name: this.tag.split('/')[0], method: 'user-agent-tag' };
    return null;
  }
}

export function detectAgent(headers: Headers, detectors: AgentDetector[]): AgentIdentity | null {
  for (const d of detectors) {
    const id = d.detect(headers);
    if (id) return id;
  }
  return null;
}
