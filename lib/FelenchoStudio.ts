export type StudioCharacter = {
  characterId: string;
};

export type StudioMove = {
  characterId: string;
  fromStudio: string;
  toStudio: string;
};

class FelenchoStudio {
  createCharacter(character: StudioCharacter) {
    console.log("Create", character);
  }

  deleteCharacter(characterId: string) {
    console.log("Delete", characterId);
  }

  enterStudio(move: StudioMove) {
    console.log("Enter", move);
  }

  leaveStudio(move: StudioMove) {
    console.log("Leave", move);
  }

  moveCharacter(move: StudioMove) {
    console.log("Move", move);
  }

  startPodcast(studioId: string) {
    console.log("Podcast", studioId);
  }

  finishPodcast(studioId: string) {
    console.log("Finish", studioId);
  }
}

export const studio = new FelenchoStudio();