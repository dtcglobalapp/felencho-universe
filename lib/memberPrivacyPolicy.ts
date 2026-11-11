/**
 * Private channel authorization rules for the *future* member API.
 * This module contains no database or UI integrations. It is intentionally
 * fail-closed and must be called AFTER verifying auth.uid() server-side.
 * Not an authentication replacement and not a substitute for database RLS.
 */
export type PrivateCharacter = "lina" | "bob" | "felencho_virtual";
export type Viewer =
  | { kind: "member"; verifiedUserId: string }
  | { kind: "character"; key: PrivateCharacter; actingForVerifiedUserId: string }
  | { kind: "human_host" }
  | { kind: "anonymous" };

export type PrivateChannel = Readonly<{
  id: string;
  ownerUserId: string;
  primaryCharacter: PrivateCharacter;
  authorizedCharacters: readonly PrivateCharacter[];
  optedInToPersistentMemory: boolean;
  status: "open" | "closed";
}>;

export type MemberMemory = Readonly<{
  ownerUserId: string;
  channelId: string;
  category: string;
  consentRecordedAt: string | null;
}>;

export function mayReadPrivateChannel(channel: PrivateChannel, viewer: Viewer): boolean {
  if (channel.status !== "open" || !channel.ownerUserId.trim()) return false;
  if (viewer.kind === "member") return viewer.verifiedUserId === channel.ownerUserId;
  if (viewer.kind === "character") {
    return viewer.actingForVerifiedUserId === channel.ownerUserId
      && (viewer.key === channel.primaryCharacter || channel.authorizedCharacters.includes(viewer.key));
  }
  // Hosts, admins, other members and strangers do not get routine access.
  return false;
}

export function mayPersistPrivateMemory(
  channel: PrivateChannel, memory: MemberMemory, viewer: Viewer,
): boolean {
  return channel.optedInToPersistentMemory
    && memory.ownerUserId === channel.ownerUserId
    && memory.channelId === channel.id
    && Boolean(memory.consentRecordedAt && !Number.isNaN(Date.parse(memory.consentRecordedAt)))
    && mayReadPrivateChannel(channel, viewer);
}

export function mayShareWithCharacter(
  channel: PrivateChannel, verifiedMemberId: string, next: PrivateCharacter,
): boolean {
  // A consented sharing action requires the owner to be authenticated by the server.
  // It is not automatically granted through another character or the host.
  return channel.status === "open"
    && channel.ownerUserId === verifiedMemberId
    && Boolean(next);
}

export const PRIVATE_CHANNEL_BOUNDARIES = Object.freeze({
  defaultConversationRetention: "ephemeral",
  defaultMemoryPersistence: false,
  publicPodcastReuse: false,
  defaultHumanHostAccess: false,
  consentRequiredForCrossCharacterAccess: true,
  explicitEroticRoleplayAllowed: false,
  allowNonjudgmentalSexualHealthDiscussion: true,
  crisisResourcesNeverPaywalled: true,
});
