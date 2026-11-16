// Felencho Mundial: explicit producer-controlled turns. No I/O, microphones or timers.
const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const nameRx = /\b(bob|lina)\b/g;
const stopRx = /\b(un momento|espera|esperen|silencio|callense|paren|detenganse|dejame terminar|dejenme terminar|no respondan|todavia no|aun no|a dormir|duerme|descansa|alto)\b/;
const invitationRx = /\b(que opinas|que opinan|que piensas|que piensan|que te parece|que les parece|que creen|que dices|que dicen|que sugieres|que sugieren|punto de vista|tu opinion|su opinion|quiero escuch|me gustaria escuch|quisiera escuch|dime|diganme|responde|respondan|contesta|contesten|te paso la palabra|les paso la palabra|tienes la palabra|tienen la palabra|que me puedes decir|que me pueden decir)\b/;
const interrogativeRx = /\b(que|como|cuando|donde|por que|cual|cuanto|quien|puedes|podrias|seria|deberia)\b/;

export function routeProducerTurn(raw) {
  const text = normalize(raw).replace(/[¿?¡!.,;:]/g, ' ').replace(/\s+/g, ' ').trim();
  const named = [...text.matchAll(nameRx)].map(m => ({who: m[1], at: m.index}));
  const ordered = [...new Set(named.map(x => x.who))];
  if (!text || !ordered.length) return {kind: 'hold', order: [], reason: 'producer_has_floor'};
  if (stopRx.test(text)) return {kind: 'hold', order: [], reason: 'producer_interruption'};
  // A reference to a character is not necessarily a request to speak.
  const openingAddress = /^(?:y\s+)?(?:oye\s+|dime\s+|ahora\s+|entonces\s+)?(?:bob|lina)\b/.test(text);
  const explicitInvite = invitationRx.test(text);
  const addressedQuestion = openingAddress && interrogativeRx.test(text.slice(Math.min(named[0].at + named[0].who.length, text.length)));
  if (!explicitInvite && !addressedQuestion) return {kind: 'hold', order: [], reason: 'no_explicit_grant'};
  // If naming both in the prompt, reply in exactly that spoken order.
  // No chain beyond the two permitted turns.
  if (ordered.length === 2) return {kind: 'grant', order: ordered, reason: 'producer_invited_both'};
  // An invitation about someone in third person must not trigger them without address.
  if (!openingAddress && !explicitInvite) return {kind: 'hold', order: [], reason: 'not_directed'};
  return {kind: 'grant', order: [ordered[0]], reason: 'producer_invited_one'};
}
