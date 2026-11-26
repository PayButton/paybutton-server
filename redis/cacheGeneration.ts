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

export const getCacheGeneration = async (addressString: string): Promise<string> => {
  return (await redis.get(getGenerationKey(addressString))) ?? '0'
}

export const bumpCacheGeneration = async (addressString: string): Promise<void> => {
  await redis.incr(getGenerationKey(addressString))
}

// KEYS[1]: generation key, KEYS[2]: built marker key, KEYS[3..n]: cache keys.
// ARGV[1]: generation the writer read, ARGV[2]: '1' to also require the built
// marker, ARGV[3..n]: values for KEYS[3..n].
// The checks and the writes run atomically, so no invalidation can land in between.
const SET_IF_GENERATION_UNCHANGED_SCRIPT = `
local current = redis.call('GET', KEYS[1]) or '0'
if current ~= ARGV[1] then
  return 0
end
if ARGV[2] == '1' and redis.call('EXISTS', KEYS[2]) == 0 then
  return 0
end
for i = 3, #KEYS do
  redis.call('SET', KEYS[i], ARGV[i])
end
return 1
`

/**
 * Writes the given cache entries only if the address's cache generation is still
 * `generation` (and, with `requireBuilt`, its payment cache is still built).
 * Returns false (and writes nothing) otherwise.
 */
export const setIfGenerationUnchanged = async (
  addressString: string,
  generation: string,
  entries: Array<[key: string, value: string]>,
  { requireBuilt = false }: { requireBuilt?: boolean } = {}
): Promise<boolean> => {
  const result = await redis.eval(
    SET_IF_GENERATION_UNCHANGED_SCRIPT,
    entries.length + 2,
    getGenerationKey(addressString),
    getCacheBuiltKey(addressString),
    ...entries.map(([key]) => key),
    generation,
    requireBuilt ? '1' : '0',
    ...entries.map(([, value]) => value)
  )
  return Number(result) === 1
}
