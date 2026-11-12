import assert from "node:assert/strict";
import { test } from "node:test";
import {
  mayPersistPrivateMemory,
  mayReadPrivateChannel,
  mayShareWithCharacter,
  PRIVATE_CHANNEL_BOUNDARIES,
  type PrivateChannel,
} from "./memberPrivacyPolicy";

const channel: PrivateChannel = {
  id: "channel-001",
  ownerUserId: "member-A",
  primaryCharacter: "lina",
  authorizedCharacters: [],
  optedInToPersistentMemory: false,
  status: "open",
};

test("owner can access; other members, anonymous and Felencho human cannot", () => {
  assert.equal(mayReadPrivateChannel(channel, { kind: "member", verifiedUserId: "member-A" }), true);
  assert.equal(mayReadPrivateChannel(channel, { kind: "member", verifiedUserId: "member-B" }), false);
  assert.equal(mayReadPrivateChannel(channel, { kind: "anonymous" }), false);
  assert.equal(mayReadPrivateChannel(channel, { kind: "human_host" }), false);
});

test("only chosen character can act on behalf of verified owner", () => {
  assert.equal(mayReadPrivateChannel(channel, { kind: "character", key: "lina", actingForVerifiedUserId: "member-A" }), true);
  assert.equal(mayReadPrivateChannel(channel, { kind: "character", key: "bob", actingForVerifiedUserId: "member-A" }), false);
  assert.equal(mayReadPrivateChannel(channel, { kind: "character", key: "lina", actingForVerifiedUserId: "member-B" }), false);
});

test("sharing requires channel owner and explicit authorization", () => {
  assert.equal(mayShareWithCharacter(channel, "member-B", "bob"), false);
  assert.equal(mayShareWithCharacter(channel, "member-A", "bob"), true);
  const shared = { ...channel, authorizedCharacters: ["bob"] as const };
  assert.equal(mayReadPrivateChannel(shared, { kind: "character", key: "bob", actingForVerifiedUserId: "member-A" }), true);
  assert.equal(mayReadPrivateChannel(channel, { kind: "character", key: "bob", actingForVerifiedUserId: "member-A" }), false);
});

test("no memory persisted without opt-in and valid per-record consent", () => {
  const m = { ownerUserId: "member-A", channelId: channel.id, category: "personal", consentRecordedAt: "2026-11-11T12:00:00Z" };
  const member = { kind: "member", verifiedUserId: "member-A" } as const;
  assert.equal(mayPersistPrivateMemory(channel, m, member), false);
  assert.equal(mayPersistPrivateMemory({ ...channel, optedInToPersistentMemory: true }, { ...m, consentRecordedAt: null }, member), false);
  assert.equal(mayPersistPrivateMemory({ ...channel, optedInToPersistentMemory: true }, m, member), true);
  assert.equal(mayPersistPrivateMemory({ ...channel, optedInToPersistentMemory: true }, m, { kind: "member", verifiedUserId: "member-B" }), false);
  assert.equal(mayPersistPrivateMemory({ ...channel, optedInToPersistentMemory: true }, { ...m, channelId: "different" }, member), false);
});

test("closed channels deny all access and default policies are restrictive", () => {
  assert.equal(mayReadPrivateChannel({ ...channel, status: "closed" }, { kind: "member", verifiedUserId: "member-A" }), false);
  assert.equal(PRIVATE_CHANNEL_BOUNDARIES.defaultMemoryPersistence, false);
  assert.equal(PRIVATE_CHANNEL_BOUNDARIES.defaultHumanHostAccess, false);
  assert.equal(PRIVATE_CHANNEL_BOUNDARIES.crisisResourcesNeverPaywalled, true);
});
