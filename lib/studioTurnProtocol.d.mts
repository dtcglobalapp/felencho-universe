export type StudioPersona = 'bob' | 'lina';
export interface StudioTurnDecision {
  kind: 'hold' | 'grant';
  order: StudioPersona[];
  reason: string;
}
export declare function routeProducerTurn(text: string): StudioTurnDecision;
