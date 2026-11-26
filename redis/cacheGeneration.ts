import { redis } from './clientInstance'

// Per-address counter, bumped whenever the address's payment or balance cache is
// invalidated (or a tx for it is created). A rebuild reads it before loading txs
// from the DB and writes its result only if it is unchanged, so a rebuild that
// started before an invalidation can't publish data that predates it, e.g.
// without txs whose prices were linked while it was reading.
const getGenerationKey = (addressString: string): string => {
  return `${addressString}:cacheGeneration`
}

// Set when a full rebuild writes the address's payment cache and deleted when
// that cache is cleared. Incremental writes (catch-up after a rebuild) require
// it, so they can't recreate a few weeks of a cache that was cleared meanwhile
// and make it look complete. Not under `:payments:`, so not taken for a week key.
export const getCacheBuiltKey = (addressString: string): string => {
  return `${addressString}:cacheBuilt`
}

// Per-address counter bumped only when a payment cache clear starts (new txs
// don't bump it, unlike the generation), plus a flag set while the clear is
// deleting week keys. Rebuild writes require the epoch read when the rebuild
// started and no clear in progress, so none can land during or after a clear
// that started meanwhile and leave a partially deleted cache marked as built.
// The flag expires, so a clear that dies midway doesn't block writes forever.
const getClearEpochKey = (addressString: string): string => {
  return `${addressString}:cacheClearEpoch`
}
const getClearingKey = (addressString: string): string => {
  return `${addressString}:cacheClearing`
}
const CLEARING_FLAG_TTL_MS = 60_000

export const getCacheGeneration = async (addressString: string): Promise<string> => {
  return (await redis.get(getGenerationKey(addressString))) ?? '0'
}

export const bumpCacheGeneration = async (addressString: string): Promise<void> => {
  await redis.incr(getGenerationKey(addressString))
}

export const getCacheClearEpoch = async (addressString: string): Promise<string> => {
  return (await redis.get(getClearEpochKey(addressString))) ?? '0'
}

/** Marks a payment cache clear as started: bumps the clear epoch and sets the clearing flag. */
export const beginCacheClear = async (addressString: string): Promise<void> => {
  await redis.set(getClearingKey(addressString), '1', 'PX', CLEARING_FLAG_TTL_MS)
  await redis.incr(getClearEpochKey(addressString))
}

/** Marks a payment cache clear as finished. */
export const endCacheClear = async (addressString: string): Promise<void> => {
  await redis.del(getClearingKey(addressString), () => {})
}

// KEYS[1]: generation key, KEYS[2]: built marker key, KEYS[3]: clear epoch key,
// KEYS[4]: clearing flag key, KEYS[5..n]: cache keys.
// ARGV[1]: generation the writer read ('' to skip the check), ARGV[2]: '1' to
// require the built marker, ARGV[3]: clear epoch the writer read ('' to skip;
// otherwise it must be unchanged with no clear in progress), ARGV[4]: unused,
// ARGV[5..n]: values for KEYS[5..n].
// The checks and the writes run atomically, so no invalidation can land in between.
const SET_IF_UNCHANGED_SCRIPT = `
if ARGV[1] ~= '' and (redis.call('GET', KEYS[1]) or '0') ~= ARGV[1] then
  return 0
end
if ARGV[2] == '1' and redis.call('EXISTS', KEYS[2]) == 0 then
  return 0
end
if ARGV[3] ~= '' then
  if (redis.call('GET', KEYS[3]) or '0') ~= ARGV[3] or redis.call('EXISTS', KEYS[4]) == 1 then
    return 0
  end
end
for i = 5, #KEYS do
  redis.call('SET', KEYS[i], ARGV[i])
end
return 1
`

interface SetIfUnchangedConditions {
  // Generation the writer read; omitted to skip the check.
  generation?: string
  // Require the payment cache to still be marked as built.
  requireBuilt?: boolean
  // Clear epoch the writer read; omitted to skip the check.
  clearEpoch?: string
}

/**
 * Writes the given cache entries only if all the given conditions still hold.
 * Returns false (and writes nothing) otherwise.
 */
export const setCacheEntriesIfUnchanged = async (
  addressString: string,
  entries: Array<[key: string, value: string]>,
  { generation, requireBuilt = false, clearEpoch }: SetIfUnchangedConditions
): Promise<boolean> => {
  const result = await redis.eval(
    SET_IF_UNCHANGED_SCRIPT,
    entries.length + 4,
    getGenerationKey(addressString),
    getCacheBuiltKey(addressString),
    getClearEpochKey(addressString),
    getClearingKey(addressString),
    ...entries.map(([key]) => key),
    generation ?? '',
    requireBuilt ? '1' : '0',
    clearEpoch ?? '',
    '',
    ...entries.map(([, value]) => value)
  )
  return Number(result) === 1
}

/**
 * Writes the given cache entries only if the address's cache generation is still
 * `generation`. Returns false (and writes nothing) if the address was invalidated
 * since, in which case the result is stale and the next read rebuilds it.
 */
export const setIfGenerationUnchanged = async (
  addressString: string,
  generation: string,
  entries: Array<[key: string, value: string]>
): Promise<boolean> => {
  return await setCacheEntriesIfUnchanged(addressString, entries, { generation })
}
