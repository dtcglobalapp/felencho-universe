export type FelenchoBrainRequest = {
  character_key: string;
  message: string;

  avatar_id?: string;
  session_id?: string;
  user_id?: string;
  participant_name?: string;
  language?: string;
  source?: string;
};

export type FelenchoBrainClient = {
  ask(request: FelenchoBrainRequest): Promise<string>;
};