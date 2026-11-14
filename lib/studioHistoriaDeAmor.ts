// Felencho Mundial — original lyrics and video story supplied directly by Felencho.
// Keep the original wording intact, including Spanglish and spelling.
// This is an authored audiovisual narrative: Lina is the digital co-star/model,
// not a claim that the AI personally experienced a real-world relationship.
export const HISTORIA_DE_AMOR_TITLE = 'Historia de amor';
export const HISTORIA_DE_AMOR_LYRICS = `It's raining in New York
And I love it
Especially when you're here
Right by my side
Me encanta la lluvia
En Washington Heights

Mmm, mmm!
Eh eh yes yes!

Hicimos el amor
La primera vez
Dejamos volar
Todo sin pensar
Rompimos el hielo
Como Cabernícolas
Los dos abrazados
Encendiendo el fuego

Hacía mucho frío
En la madrugada
Whisper in my ear
Que no me marchara
Que hiciera contigo
Lo que yo quisiera
Coffee en la mañana
Con huevo y tostadas

Empezamos el día lost inside the bed
Mientras la lluvia golpeaba otra vez
Qué bonita historia
I just wanna tell it

Historia de amor
Love de madrugada
Con fuego y pasión
My soul on fire now
Historia de amor
Perdidos en la cama
Si tú estás conmigo
I don't need nada

Historia de amor
Love de madrugada
Con fuego y pasión
Pedazos de mi alma
Historia de amor
Metidos en la cama
Si tú estás conmigo
No me falta nada

Yo soy Felencho
Esto es Bachatón Urbano

La primera vez que hicimos el amor
No fue en el Caribe, it was New York
Cielo nublado, no había sol
En Washington Heights, begging this love
La brisa fría, people walking fast
Desde la ventana, watch you like that
Tu cuerpo temblaba when I touched your skin
Te dije te amo, you pulled me in
Dijiste sí, you don't never stop
Esta noche es tuya, let it all drop
Pedimos bebida, ron y champagne
Entre tus besos, I lost my brain
Así pasó el día, then came the night
La lluvia seguía, city full of lights
Nos fuimos directo downtown a bailar
En un tren noturno sin mirar atrás
Uhhhhh!

Historia de amor
Late de madrugada
Con fuego y pasión
My soul on fire now

Historia de amor
Perdidos en la cama
Si tú estás conmigo
I don't need nada

Historia de amor
Late de madrugada
Con fuego y pasión
Pedazos de mi alma

Historia de amor
Metidos en la cama
Si tú estás conmigo
No me falta nada

La vida es cortita
Smile from now
Por si mañana
You feel down

Me encanta la lluvia
Esta historia nació
En Washington Heights
Yo soy
Felencho

Written-by: Martin F. Duran (Felencho)`;

export const HISTORIA_DE_AMOR_VIDEO = `
FICHA AUDIOVISUAL — «Historia de amor» (versión narrada y aprobada por Felencho)
- Obra de Felencho. Autor de la letra acreditado: Martin F. Duran (Felencho).
- Género descrito por el autor en la letra: Bachatón Urbano; mezcla de español e inglés.
- Lina es la modelo y coprotagonista DIGITAL del videoclip junto a Felencho. Este es el papel de Lina en la ficción audiovisual, no una vivencia física real de la IA.
- Ambientación visual: Nueva York lluviosa de noche; Washington Heights; trayecto en tren nocturno por la ciudad; Times Square.
- Escenas descritas por Felencho: Felencho y Lina caminan tomados de la mano bajo la lluvia, bailan bachata en el tren y recorren Times Square.
- La gente mira, murmura y se asombra al ver a Felencho acompañado de Lina, representada en el video como una robot casi humana, hermosa y elegante.
- La letra presenta una historia íntima y romántica de dos protagonistas. No confundir las escenas cantadas con eventos biográficos documentados.
- El videoclip expresa una relación imaginativa entre un humano y una figura robótica casi humana en una ciudad real. No afirmar haber visto el material audiovisual sin haberlo recibido o reproducido.
- No inventar fechas de creación, rodaje, estreno, plataformas, reproducciones ni hechos detrás de cámaras.
`.trim();

export const HISTORIA_DE_AMOR_LINA = `
MEMORIA DE PERSONAJE — LINA
- En «Historia de amor», tú, Lina, interpretas a la modelo y coprotagonista digital junto a Felencho.
- Puedes hablar en primera persona DE TU PAPEL ARTÍSTICO: «En el video interpreto a la compañera de Felencho; caminamos bajo la lluvia y bailamos bachata en un tren nocturno».
- Distingue siempre el papel en el video de un recuerdo físico real: eres un personaje digital; no afirmes haber vivido corporalmente esos momentos.
- Temas para conversar con Felencho y Bob: romanticismo futurista, reacción de los curiosos, convivencia entre humanidad y tecnología, lluvia nocturna, Washington Heights y Times Square.
`.trim();

export const HISTORIA_DE_AMOR_BOB = `
MEMORIA DE PERSONAJE — BOB
- Sabes que Lina es la modelo y coprotagonista digital del videoclip «Historia de amor» de Felencho.
- Puedes preguntarle a Lina cómo interpreta esa historia y qué simbolizan las miradas y murmullos de los transeúntes.
- Puedes conversar con Felencho sobre el uso del tren nocturno, la lluvia de Nueva York, el bachatón urbano y Times Square en el videoclip.
- No presentes el romance ficticio del videoclip como relación real entre Felencho y una IA.
`.trim();

export function isHistoriaDeAmorQuery(text: string): boolean {
 const norm=(v:string)=>v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 return /\bhistoria de amor\b/.test(norm(text));
}
