import { describeClosure, describeServices, type ServiceFact, type UpcomingClosure } from "../businessFacts";

// On a call, GPT-Live phrases whatever the agent hands back, so some tool
// results need no second model step to put them into words: a list read from
// the snapshot, or confirmation that a message was saved. Stopping after those
// tools saves a whole model round trip (about a second) while the caller waits.

/** Commentary appends are capped at 500 tokens; keep a direct answer well inside that. */
export const MAX_DIRECT_ANSWER_CHARS = 1_200;

type ToolCallLike = { toolCallId: string; toolName: string };
type ToolResultLike = { toolCallId: string; toolName: string; input: unknown; output: unknown };
export type DirectAnswerStep = { toolCalls: ToolCallLike[]; toolResults: ToolResultLike[] };

type Formatter = (input: Record<string, unknown>, output: Record<string, unknown>) => string | undefined;

const text = (value: unknown): string | undefined => (typeof value === "string" && value.trim() ? value.trim() : undefined);

const FORMATTERS: Record<string, Formatter> = {
  getBusinessServices: (_input, output) => {
    const services = Array.isArray(output.services) ? output.services as ServiceFact[] : [];
    if (!services.length) return "The business hasn't listed any services. Offer to take a message so the team can follow up.";
    return `Services the business offers:\n${describeServices(services, MAX_DIRECT_ANSWER_CHARS - 200)}\nAnswer the caller's question from this list.`;
  },
  getBusinessHours: (_input, output) => {
    const timezone = text(output.timezone);
    const weekly = Array.isArray(output.weekly) ? output.weekly as string[] : [];
    if (!timezone || output.configured !== true) return "The business hasn't set its opening hours. Offer to take a message so the team can follow up.";
    const closures = Array.isArray(output.upcomingClosures) ? (output.upcomingClosures as UpcomingClosure[]).slice(0, 5) : [];
    return [
      `Opening hours (${timezone}). It is now ${text(output.now) ?? "unknown"}, and the business is ${output.openNow === true ? "open" : "closed"} right now.`,
      ...weekly,
      closures.length ? `Upcoming closures: ${closures.map((closure) => describeClosure(closure, timezone)).join("; ")}.` : "",
      "Answer the caller's question from these hours.",
    ].filter(Boolean).join("\n");
  },
  takeMessage: (input, output) => {
    if (output.ok !== true) return undefined;
    const message = text(input.message)?.replace(/[.!?]+$/, "");
    return `The message is saved for the team${message ? `: "${message}"` : ""}. Tell the caller the team will follow up.`;
  },
  requestAppointment: (input, output) => {
    if (output.ok !== true) return undefined;
    const details = [text(input.serviceName), text(input.preferredTime)].filter(Boolean).join(", ");
    return `The appointment request is saved for the team${details ? ` (${details})` : ""}. Tell the caller the team will contact them to confirm the time.`;
  },
  endCall: (_input, output) => (output.ok === true ? "The call is ending. Say a short goodbye." : undefined),
};

/** Tools whose successful result GPT-Live can speak without the agent rephrasing it. */
export const DIRECT_ANSWER_TOOLS: readonly string[] = Object.keys(FORMATTERS);

/**
 * The answer for a step whose every tool call succeeded with a direct-answer
 * tool, or undefined when the agent still needs a model step: another tool was
 * called, a tool failed or refused, or the step called no tools.
 */
export function directToolAnswer(step: DirectAnswerStep | undefined): string | undefined {
  if (!step?.toolCalls.length) return undefined;
  const answers: string[] = [];
  for (const call of step.toolCalls) {
    const formatter = FORMATTERS[call.toolName];
    const result = step.toolResults.find((item) => item.toolCallId === call.toolCallId);
    if (!formatter || !result || typeof result.output !== "object" || result.output === null) return undefined;
    const input = typeof result.input === "object" && result.input !== null ? result.input as Record<string, unknown> : {};
    const answer = formatter(input, result.output as Record<string, unknown>);
    if (!answer) return undefined;
    if (!answers.includes(answer)) answers.push(answer);
  }
  return answers.join("\n\n").slice(0, MAX_DIRECT_ANSWER_CHARS);
}
