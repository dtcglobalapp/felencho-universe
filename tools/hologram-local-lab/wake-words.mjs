// Local-only, text-first wake-word routing prototype.
// No microphone access, networking, speech services, or production imports.
// An ASR transcript is untrusted: this module only decides whom to address.
const normalize = (text) => String(text ?? '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const ALIASES = {
  bob: ['bob'],
  lina: ['lina']
};

export function detectAddressee(transcript) {
  const words = normalize(transcript).split(' ').filter(Boolean);
  const mentions = [];
  for (let i = 0; i < words.length; i++) {
    for (const [persona, aliases] of Object.entries(ALIASES)) {
      if (aliases.includes(words[i])) mentions.push({ persona, index: i });
    }
  }
  // Never silently assign a question to one character when both are named.
  const unique = [...new Set(mentions.map(m => m.persona))];
  return {
    target: unique.length === 1 ? unique[0] : null,
    status: unique.length === 0 ? 'no-wake-word' : unique.length === 1 ? 'addressed' : 'ambiguous',
    mentions: mentions.map(m => m.persona),
    normalized: words.join(' ')
  };
}

export function routeTranscript(transcript, previousTarget = null) {
  const match = detectAddressee(transcript);
  if (match.status === 'addressed') return { ...match, action: 'LISTENING', target: match.target };
  if (match.status === 'ambiguous') return { ...match, action: 'NONE', target: null };
  // Context can be retained only by the future conversation controller,
  // after explicit session/turn management. Not assumed by this prototype.
  return { ...match, action: 'NONE', target: null };
}
