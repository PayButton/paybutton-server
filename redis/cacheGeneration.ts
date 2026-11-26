import { redis } from './clientInstance'

// Per-address counter, bumped whenever the address's payment or balance cache is
// invalidated (or a tx for it is created). A rebuild reads it before loading txs
// from the DB and writes its result only if it is unchanged, so a rebuild that
// started before an invalidation can't publish data that predates it, e.g.
// without txs whose prices were linked while it was reading.
const getGenerationKey = (addressString: string): string => {
  return `${addressString}:cacheGeneration`
}

export const getCacheGeneration = async (addressString: string): Promise<string> => {
  return (await redis.get(getGenerationKey(addressString))) ?? '0'
}

export const bumpCacheGeneration = async (addressString: string): Promise<void> => {
  await redis.incr(getGenerationKey(addressString))
}

// KEYS[1]: generation key, KEYS[2..n]: cache keys.
// ARGV[1]: generation the rebuild started at, ARGV[2..n]: values for KEYS[2..n].
// The check and the writes run atomically, so no invalidation can land in between.
const SET_IF_GENERATION_UNCHANGED_SCRIPT = `
local current = redis.call('GET', KEYS[1]) or '0'
if current ~= ARGV[1] then
  return 0
end
for i = 2, #KEYS do
  redis.call('SET', KEYS[i], ARGV[i])
end
return 1
`

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
  const result = await redis.eval(
    SET_IF_GENERATION_UNCHANGED_SCRIPT,
    entries.length + 1,
    getGenerationKey(addressString),
    ...entries.map(([key]) => key),
    generation,
    ...entries.map(([, value]) => value)
  )
  return Number(result) === 1
}
