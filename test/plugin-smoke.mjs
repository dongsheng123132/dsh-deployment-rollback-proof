import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createDefinitions } from '../index.js'

const manifestJson = await readFile(new URL('../examples/rolled-back.json', import.meta.url), 'utf8')
const tools = createDefinitions()
assert.deepEqual(tools.map(tool => tool.name), ['dsh_deployment_rollback_inspect', 'dsh_deployment_rollback_verify'])
const inspect = tools[0]
const result = await inspect.execute({ manifestJson })
assert.equal(result.declaredTargetCount, 3)
process.stdout.write(`${JSON.stringify({ ok: true, tools: tools.map(tool => tool.name), declaredTargetCount: result.declaredTargetCount })}\n`)

