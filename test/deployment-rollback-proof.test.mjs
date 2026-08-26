import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import {
  evaluateDeploymentRollbackManifest,
  inspectDeploymentRollbackManifestJson,
  sha256,
  verifyDeploymentRollbackManifest
} from '../lib/deployment-rollback-proof.mjs'
import { clone, fixture } from './helpers.mjs'

const evaluated = async mutate => {
  const manifest = await fixture()
  mutate?.(manifest)
  return evaluateDeploymentRollbackManifest(manifest)
}

test('accepts complete last-known-good convergence', async () => {
  const result = await evaluated()
  assert.equal(result.verdict, 'rolled-back')
  assert.deepEqual(Object.values(result.checks), [true, true, true, true, true, true, true])
  assert.equal(result.destructiveActions, false)
})

test('inspection returns bounded hashes and counts only', async () => {
  const manifest = await fixture()
  const result = inspectDeploymentRollbackManifestJson(JSON.stringify(manifest))
  assert.equal(result.declaredTargetCount, 3)
  assert.equal(result.observationCount, 3)
  assert.equal(result.proofIdHash.length, 64)
  assert.equal(JSON.stringify(result).includes(manifest.proofId), false)
})

test('rejects identical failed and last-known-good digests', async () => {
  const manifest = await fixture()
  manifest.incident.lastKnownGoodArtifactSha256 = manifest.incident.failedArtifactSha256
  assert.throws(() => evaluateDeploymentRollbackManifest(manifest), { code: 'INVALID_MANIFEST' })
})

test('discloses missing target evidence', async () => {
  const result = await evaluated(manifest => manifest.observations.pop())
  assert.equal(result.verdict, 'not-rolled-back')
  assert.equal(result.checks.exactTargetCoverage, false)
})

test('discloses duplicate target observations', async () => {
  const result = await evaluated(manifest => {
    manifest.observations[2].targetIdHash = manifest.observations[1].targetIdHash
    manifest.observations[2].environmentHash = manifest.observations[1].environmentHash
    manifest.observations[2].knownGoodActiveReplicas = 3
    manifest.observations[2].totalActiveReplicas = 3
  })
  assert.equal(result.checks.exactTargetCoverage, false)
})

test('detects target environment mismatch', async () => {
  const result = await evaluated(manifest => { manifest.observations[0].environmentHash = '0'.repeat(64) })
  assert.equal(result.checks.allTargetsConverged, false)
  assert.equal(result.targets[0].environmentMatched, false)
})

test('detects a target still serving another digest', async () => {
  const result = await evaluated(manifest => { manifest.observations[1].artifactSha256 = '0'.repeat(64) })
  assert.equal(result.targets[1].digestRestored, false)
  assert.equal(result.verdict, 'not-rolled-back')
})

test('detects failed artifact replicas still active', async () => {
  const result = await evaluated(manifest => { manifest.observations[0].failedArtifactActiveReplicas = 1 })
  assert.equal(result.targets[0].noFailedArtifactActive, false)
})

test('detects replica-count convergence mismatch', async () => {
  const result = await evaluated(manifest => { manifest.observations[1].knownGoodActiveReplicas = 2 })
  assert.equal(result.targets[1].replicasConverged, false)
})

test('detects incident and rollback-plan binding mismatch', async () => {
  const result = await evaluated(manifest => { manifest.observations[2].rollbackPlanSha256 = '0'.repeat(64) })
  assert.equal(result.targets[2].incidentBound, false)
})

test('enforces distinct observer threshold', async () => {
  const result = await evaluated(manifest => {
    for (const row of manifest.observations) row.observerHash = manifest.observations[0].observerHash
  })
  assert.equal(result.checks.distinctObserversSatisfied, false)
})

test('detects an RTO miss', async () => {
  const result = await evaluated(manifest => { manifest.observations[2].observedAt = '2026-08-26T06:31:00.000Z' })
  assert.equal(result.checks.withinRto, false)
})

test('detects stale evidence', async () => {
  const result = await evaluated(manifest => { manifest.evaluationTime = '2026-08-26T09:00:01.000Z' })
  assert.equal(result.checks.evidenceFresh, false)
})

test('rejects secret-shaped and raw payload fields', async () => {
  const manifest = await fixture()
  manifest.raw = 'deployment output'
  assert.throws(() => evaluateDeploymentRollbackManifest(manifest), { code: 'SECRET_MATERIAL' })
  const second = await fixture()
  second.note = 'Bearer abcdefghijklmnopqrstuvwxyz'
  assert.throws(() => evaluateDeploymentRollbackManifest(second), { code: 'SECRET_MATERIAL' })
})

test('writes a deterministic content-addressed artifact and verifies replay', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-rollback-proof-'))
  await mkdir(join(root, 'input'))
  const manifest = await fixture()
  await writeFile(join(root, 'input', 'manifest.json'), JSON.stringify(manifest))
  const first = await verifyDeploymentRollbackManifest({ workspaceRoot: root, manifestPath: 'input/manifest.json', artifactDir: 'artifacts' })
  const second = await verifyDeploymentRollbackManifest({ workspaceRoot: root, manifestPath: 'input/manifest.json', artifactDir: 'artifacts' })
  assert.equal(first.artifact.sha256, second.artifact.sha256)
  assert.equal(first.artifact.verifiedByReadBack, true)
  assert.equal(sha256(await readFile(join(root, first.artifact.path))), first.artifact.sha256)
})

test('rejects path traversal and symlinked artifact directories', async t => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-rollback-safe-'))
  await mkdir(join(root, 'input'))
  await writeFile(join(root, 'input', 'manifest.json'), JSON.stringify(await fixture()))
  await assert.rejects(verifyDeploymentRollbackManifest({ workspaceRoot: root, manifestPath: '../manifest.json', artifactDir: 'artifacts' }), { code: 'PATH_ESCAPE' })
  const outside = await mkdtemp(join(tmpdir(), 'dsh-rollback-outside-'))
  try {
    await symlink(outside, join(root, 'linked'), process.platform === 'win32' ? 'junction' : 'dir')
  } catch (error) {
    t.skip(`symlinks unavailable: ${error.code}`)
    return
  }
  await assert.rejects(verifyDeploymentRollbackManifest({ workspaceRoot: root, manifestPath: 'input/manifest.json', artifactDir: 'linked' }), { code: 'UNSAFE_ARTIFACT_DIR' })
})

