/**
 * Raw one-shot - simple text format
 */
export function rawShotPrompt(topic: string): string {
  const seed = Math.floor(Math.random() * 99999);
  
  return `<xXx_Example_xXx> this is an example message
<confused_user99> this is a reply

Now write a DIFFERENT funny chat about: ${topic}
Use random seed ${seed} for uniqueness.
3-5 messages. Someone is dumb/wrong. Short messages.

<`;
}
