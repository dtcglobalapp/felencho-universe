import assert from "node:assert/strict";
import test from "node:test";

import {
  FELENCHO_STUDIO_PERMISSIONS,
  accessAreaForPath,
  canAccessFelenchoStudio,
  normalizeFelenchoStudioPermissions,
  normalizeFelenchoStudioRole,
} from "./GenesisAccessPolicy";

test("normalizes current and legacy Studio roles", () => {
  assert.equal(
    normalizeFelenchoStudioRole("developer"),
    "developer",
  );
  assert.equal(
    normalizeFelenchoStudioRole("admin"),
    "developer",
  );
  assert.equal(
    normalizeFelenchoStudioRole("producer"),
    "artist",
  );
  assert.equal(
    normalizeFelenchoStudioRole("viewer"),
    "tester",
  );
  assert.equal(
    normalizeFelenchoStudioRole("unknown"),
    null,
  );
});

test("owner and developer receive full access", () => {
  for (const role of [
    "owner",
    "developer",
  ] as const) {
    assert.equal(
      canAccessFelenchoStudio(
        role,
        [],
        "advanced",
      ),
      true,
    );
    assert.equal(
      canAccessFelenchoStudio(
        role,
        [],
        "operations",
      ),
      true,
    );
  }
});

test("artist access requires an explicit area permission", () => {
  assert.equal(
    canAccessFelenchoStudio(
      "artist",
      [],
      "advanced",
    ),
    false,
  );
  assert.equal(
    canAccessFelenchoStudio(
      "artist",
      [
        FELENCHO_STUDIO_PERMISSIONS
          .advancedMode,
      ],
      "advanced",
    ),
    true,
  );
  assert.equal(
    canAccessFelenchoStudio(
      "artist",
      [
        FELENCHO_STUDIO_PERMISSIONS
          .advancedMode,
      ],
      "operations",
    ),
    false,
  );
});

test("tester and guest cannot enter professional tools", () => {
  for (const role of [
    "tester",
    "guest",
  ] as const) {
    assert.equal(
      canAccessFelenchoStudio(
        role,
        [],
        "advanced",
      ),
      false,
    );
    assert.equal(
      canAccessFelenchoStudio(
        role,
        [],
        "operations",
      ),
      false,
    );
    assert.equal(
      canAccessFelenchoStudio(
        role,
        [],
        "invitation",
      ),
      true,
    );
  }
});

test("normalizes permissions and removes duplicates", () => {
  assert.deepEqual(
    normalizeFelenchoStudioPermissions([
      " felencho-studio.advanced ",
      "felencho-studio.advanced",
      null,
    ]),
    ["felencho-studio.advanced"],
  );
});

test("maps protected paths to their access areas", () => {
  assert.equal(
    accessAreaForPath(
      "/felencho-studio/advanced",
    ),
    "advanced",
  );
  assert.equal(
    accessAreaForPath(
      "/avatar-engine/studio",
    ),
    "advanced",
  );
  assert.equal(
    accessAreaForPath("/studio/podcast"),
    "operations",
  );
  assert.equal(
    accessAreaForPath("/felencho-studio"),
    null,
  );
});
