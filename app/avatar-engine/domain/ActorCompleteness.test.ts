import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateActorCompleteness,
} from "./ActorCompleteness";
import {
  normalizeActorDefinition,
} from "./ActorNormalizer";

test(
  "calculates documented construction completeness from configurable requirements",
  () => {
    const actor =
      normalizeActorDefinition(
        {
          id: "complete",
          name: "Complete",
          version: "1",
          width: 100,
          height: 100,
          fps: 60,
          layers: [
            {
              id: "face",
              name: "Face",
              asset:
                "layers/face.png",
            },
            {
              id: "mouth-rest",
              name: "Neutral Mouth",
              asset:
                "layers/rest.png",
            },
          ],
          rig: {
            face: "face",
          },
          construction: {
            profile: "custom",
            requiredRoles: ["face"],
            optionalRoles: [],
            requiredMouthPoses: [
              "REST",
              "AA",
            ],
            mouthPoses: {
              REST: "mouth-rest",
            },
          },
        },
        {
          sourceActorId: "complete",
        },
      ).definition;
    const completeness =
      calculateActorCompleteness(actor);

    assert.equal(
      completeness.required,
      3,
    );
    assert.equal(
      completeness.completed,
      2,
    );
    assert.equal(
      completeness.percentage,
      67,
    );
    assert.equal(
      completeness.items.find(
        (item) =>
          item.id === "mouth:AA",
      )?.complete,
      false,
    );
  },
);
test(
  "does not force anatomy requirements on a custom actor",
  () => {
    const actor =
      normalizeActorDefinition(
        {
          id: "custom",
          name: "Custom",
          version: "1",
          width: 100,
          height: 100,
          fps: 60,
          layers: [],
          rig: {},
          construction: {
            profile: "custom",
          },
        },
        {
          sourceActorId: "custom",
        },
      ).definition;

    assert.equal(
      calculateActorCompleteness(
        actor,
      ).percentage,
      100,
    );
  },
);
