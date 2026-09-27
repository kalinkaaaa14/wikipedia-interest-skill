/** All command output is JSON on stdout. */
export function printJson(value: unknown): void {
  console.log(JSON.stringify(value, null, 1));
}
