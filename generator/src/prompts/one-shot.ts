import type { Format } from "./formats.js";

/**
 * Single prompt that does everything
 */
export function oneShotPrompt(topic: string, format: Format): string {
  return `Napisz KULTOWĄ rozmowę z polskiego internetu. ${format.messages} wiadomości.

TEMAT: "${topic}"

CO SPRAWIA ŻE TO JEST ŚMIESZNE:
- ktoś jest PEWNY SIEBIE ale TOTALNIE SIĘ MYLI
- ktoś nie rozumie o czym mowa i odpowiada od czapy
- absurdalna logika traktowana poważnie
- eskalacja głupoty
- zaskakująca puenta

NICKI:
- gamer style (xXx_Dark_xXx, noob_destroyer)
- ironiczne (CEO_of_Nothing, definitely_human)
- cringe (hackermaster2003, deep_thinker)
- lowercase all (janusz87, mariusz_dev)

PISANIE:
- literówki: tho, bro, ngl, idk, tbh
- po polsku ale z wtrąceniami angielskimi
- CAPS na emfazę
- niektóre msg 2-4 słowa, inne dłuższe
- naturalne, jak prawdziwy chat

[{"author": "nick", "content": "tekst"}]

JSON:`;
}
