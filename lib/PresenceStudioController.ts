import { presenceController } from "@/lib/PresenceController";

export type StudioCharacterId = string;

class PresenceStudioController {
  wake(character: StudioCharacterId) {
    presenceController.setLive(character);
  }

  sleep(character: StudioCharacterId) {
    presenceController.sleep(character);
  }

  think(character: StudioCharacterId) {
    presenceController.think(character);
  }

  speak(character: StudioCharacterId) {
    presenceController.speak(character);
  }

  wakeOnly(character: StudioCharacterId) {
    presenceController.resetAll();
    presenceController.setLive(character);
  }

  sleepAll() {
    presenceController.resetAll();
  }

  wakeMany(characters: StudioCharacterId[]) {
    characters.forEach((character) => {
      presenceController.setLive(character);
    });
  }

  getStatus(character: StudioCharacterId) {
    return presenceController.getStatus(character);
  }

  getAllStatuses() {
    return presenceController.getAllStatuses();
  }
}

export const presenceStudioController = new PresenceStudioController();