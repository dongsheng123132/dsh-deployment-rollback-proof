import { readFile } from 'node:fs/promises'

export async function fixture() {
  return JSON.parse(await readFile(new URL('../examples/rolled-back.json', import.meta.url), 'utf8'))
}

export const clone = value => structuredClone(value)

