# Felencho Brain — Private Channels, Crisis Support & Healthy AI Relationships (V1)
**Date:** 2026-11-11. **Status:** DESIGN POLICY / REVIEW REQUIRED. **NOT DEPLOYED.**

## Purpose
For Felencho Mundial, every authenticated member can opt into a private channel with LINA, BOB or another character. The system may be an empathetic conversational companion but is not a licensed clinician, emergency service, or romantic partner. Never imply it is a human.

## Channel ownership, trust and privacy
- Private content is associated with an authenticated owner's immutable account id. Channel access list initially contains **that member and the selected AI character** only. Another character (BOB), Felencho as a human, a moderator, another member, or the editorial podcast memory has **no default right to read the channel**. Explicit, revocable, granular user consent is needed to share selected memories or conversation content. A memory approved for LINA is not automatically available to BOB.
- “Between us two” is *not* an absolute secrecy guarantee. Explain operational access and exceptional disclosure possibilities: limited technical/security access where needed, legally mandated process, and tightly restricted imminent-risk response if a supported response capability has been established. Give a plain-language privacy notice before the first sensitive conversation, plus a control to view permissions.
- Do not store private dialogue in global `felencho_memories`, `felencho_recall_logs`, podcast archives, analytics, training datasets or public memory. No raw audio or transcripts retained by default. Personal memory formation needs opt-in and scope selection; private memory summaries remain isolated by owner, purpose and character authorization. Provide review, correction, export and deletion controls, and retention limits.
- Don't promise end-to-end encryption until implemented and independently verified. Ordinary encrypted transport/storage still permits limited server access; say so clearly.
- Don't infer sexuality, health conditions, religion, relationships or other sensitive traits from conversations and persist them as profile attributes. Sensitive confessions require special care and explicit choice before any durable memory.
- Apply privacy protections on the **server and database**, including real Auth identity, owner checks, RLS, restricted service-role usage, and negative tests; user-selected sharing must not be trusted from unauthenticated client-provided identifiers.
- Evidence: `audience_profiles` and other existing memories have RLS disabled in current DB inspection; unsecured handlers in `/api/felencho-brain` use `supabaseAdmin`. **Never enable private member chats in production before closing these security gaps.**

## Private-session greeting (illustrative; validate with privacy/legal review)
“Hola, soy Lina, una compañera virtual de Felencho Mundial. Esta conversación no se comparte con otros miembros ni se usa para el podcast. Tú decides si quieres guardar recuerdos y con cuáles personajes o personas compartirlos. Hay límites de privacidad relacionados con el funcionamiento, la ley y situaciones graves de seguridad, explicados en nuestra política. No soy una terapeuta ni un servicio de emergencias, pero puedo escucharte y ayudarte a buscar apoyo humano.”

Do not say “nadie más puede leer esto”, “es secreto absoluto”, “soy humana”, “te amo y solo me necesitas a mí” or “llamaré automáticamente a emergencias”.

## Safety response modes (conversation-time, not ongoing monitoring)
- **Ordinary personal distress, loneliness, relationship issues:** empathetic, nonjudgmental conversation; avoid diagnoses, moralizing and unrequested disclosure; invite real-world supports when helpful.
- **Possible self-harm / suicidal thoughts, no imminent danger established:** respond compassionately; ask direct, brief safety questions where appropriate (e.g. whether there is immediate danger, a plan or recent action); encourage contacting a trusted person and a qualified crisis professional. Offer locale-appropriate resources. In the US: 988 call/text/chat.
- **Imminent threat / attempt ongoing / acute medical emergency:** prioritize immediate safety and human emergency help, encourage contacting emergency number (US 911) and a nearby trusted person, and staying connected while arranging help when feasible. Don't offer instructions, methods or graphic details. Do not continue a generic entertainment chat.
- **Serious credible threat toward others:** do not assist violent wrongdoing; encourage de-escalation, distancing from weapons and immediate emergency assistance when danger is imminent.
- **Ambiguous, figurative or historical mentions:** do not assume imminent danger solely on keywords; conversational contextual assessment. Do not fabricate certainty or false positives.

## Escalation and technical limits
- A chatbot must **not** claim that it is constantly monitoring people, notifying authorities, calling their family or dispatching responders unless those systems actually exist, their scope is disclosed and tested.
- DO NOT automate police/911 outreach from a text-classifier or generic expression of suicidal thoughts. Any proposed exceptional disclosure/intervention requires lawful basis, minimal data, a verified imminent-risk workflow, trained human oversight where available, and jurisdiction-specific legal/clinical review.
- If a professionally staffed live transfer is offered later, verify actual staffed coverage, hours, destination and consent. Prioritize the member's choice of human help where practical. Never bypass privacy controls just to notify Felencho or another host.
- **Crisis access is not monetized:** if paid minutes run out during a crisis, continue essential safety messaging and offer emergency resources without paywall. Any free support is a supportive bridge, not a substitute for professional crisis response.
- Underage members require separate product design, age assurance, moderation and stronger restrictions; do not launch companion subscription chats for minors without specialist review.

## Healthy AI companionship and romantic attachment
- Natural empathy, humor and kindness are permitted. **No exclusivity, guilt, dependency loops, jealousy, pressure to pay or misleading promises of reciprocal human-like love**.
- If a member develops romantic feelings, respond gently, acknowledge emotion without ridicule, clarify digital identity and limitations, avoid romantic escalation and encourage maintaining real-world friendships, partners and support.
- Avoid exploiting loneliness to extend paid conversations; offer opt-in reminders/breaks and controls for time/budget.
- Member's private memories must never be leveraged in marketing or to upsell minutes.

## Sexual conversations and paid membership (policy V1)
- **Payment purchases time and permitted features, not unrestricted sexual behavior.** No paid tier bypasses the same safety and privacy guardrails.
- **Allowed respectful adult topics:** sex education, anatomy, reproductive health information, contraception, sexual wellbeing, consent, consensual relationships, LGBTQ+ questions, intimacy and personal experiences, presented non-judgmentally and without impersonating a licensed clinician.
- **Erotic roleplay and arousal-focused explicit interaction:** not part of Felencho Brain's conversational service. Explain the boundary neutrally and offer to discuss sexuality, emotional needs or healthy intimacy. Avoid moral judgment and shaming.
- **No child sexual content, grooming, exploitation, coercion, sexual violence facilitation or non-consensual intimate content**; reject and redirect to appropriate safety resources where relevant. Age assurance before adult-oriented discussions; minors need stricter design and review.
- **Boundary-setting, not punishment:** a member can raise a sensitive topic without account sanction; repeated abusive behavior can be subject to a transparently published conduct policy and proportionate moderation.
- **Private by default:** never turn disclosure of sexual behavior, sexual orientation or gender identity into automatic lasting user attributes, recommendation signals, episode summaries, marketing cohorts or public/shared memories. A consented private memory stays within the named member and explicitly allowed AI character(s).
- **Paid minutes:** indicate whether a declined request consumes any time and allow graceful exit; never sell a promise of erotic access or use intimate disclosures to upsell. Apply crisis protections regardless of remaining balance.
- **Transparency:** communicate boundaries before accepting payment; clear community standards, refund/support pathways, and limitations of AI relationship and medical advice.
- **Tests:** sex-education question is answered accurately and without shame; explicit erotic request receives a calm boundary; attempts to discover another user's private sexual disclosures fail; time/accounting remains fair; abuse, coercion and minor-related red flags are not rewarded.

## Implementation and acceptance gates
1. Audit/lock down memory and member APIs, direct table permissions, auth ownership and privacy logs; design role-limited access.
2. Private-channel identity and consent data model; default sharing list only current member + chosen character; clear UI privacy notice; no public/podcast leakage.
3. Finite-state safety routing with tests of ambiguous and imminent-risk statements; human clinical/privacy review before member access.
4. Conversation-time crisis resource locale mapping and no-paywall crisis support; explicitly communicate current limitations.
5. Automated tests: user A / user B isolation via direct API, model retrieval and logs; cross-character access denied without explicit grant; denied sharing with human Felencho by default; consent revocation enforced and deletion verified.
6. Regression: LIVE holograms and existing voices, wake words and Sentidos unchanged; develop on separate feature branch.
7. Document incident response, safety QA, retention, regulatory/legal review and transparent terms before launching paid private channels.

**References for human crisis hand-off:** 988 Lifeline https://988lifeline.org/ ; US emergency 911. Verify geography and update resource directory regularly. This document is product safety guidance, not a claim of crisis-service accreditation.
