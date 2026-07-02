import {
  FelenchoBrainClient,
  FelenchoBrainRequest,
} from "./FelenchoBrainClient";

type FelenchoBrainRestClientOptions = {
  endpoint?: string;
  debug?: boolean;
};

type FelenchoBrainResponse = {
  reply?: string;
  text?: string;
  message?: string;
  answer?: string;
  response?: string;

  data?: {
    reply?: string;
    text?: string;
    message?: string;
    answer?: string;
    response?: string;
  };

  [key: string]: unknown;
};

export default class FelenchoBrainRestClient
  implements FelenchoBrainClient
{
  private endpoint: string;
  private debug: boolean;

  constructor(options: FelenchoBrainRestClientOptions = {}) {
    this.endpoint = options.endpoint || "/api/felencho-brain/chat";
    this.debug = options.debug ?? false;
  }

  public async ask(request: FelenchoBrainRequest): Promise<string> {
    this.log("Sending request", request);

    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text();

      throw new Error(
        `Felencho Brain request failed (${response.status}): ${errorText}`
      );
    }

    const json = (await response.json()) as FelenchoBrainResponse;
    const reply = this.extractReply(json);

    this.log("Reply", reply);

    return reply;
  }

  private extractReply(response: FelenchoBrainResponse): string {
    const reply =
      response.reply ||
      response.text ||
      response.message ||
      response.answer ||
      response.response ||
      response.data?.reply ||
      response.data?.text ||
      response.data?.message ||
      response.data?.answer ||
      response.data?.response ||
      "";

    return this.cleanText(reply);
  }

  private cleanText(value: unknown): string {
    if (typeof value !== "string") return "";

    return value
      .replace(/\s+/g, " ")
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .trim();
  }

  private log(...args: unknown[]) {
    if (this.debug) {
      console.log("[FelenchoBrainRestClient]", ...args);
    }
  }
}