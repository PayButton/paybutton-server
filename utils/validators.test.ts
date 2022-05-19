import * as v from './validators'


// region: test `validateAddresses`
test('Accept example addresses', () => {
  expect(v.validateAddresses(
    ['ecash:qpz274aaj98xxnnkus8hzv367za28j900c7tv5v8pc',
     'bitcoincash:qz0dqjf6w6dp0lcs8cc68s720q9dv5zv8cs8fc0lt4',]
  )).toBe(true)
});

test('Accept addresses for testnets', () => {
  expect(v.validateAddresses(
    ['bchreg:qpz274aaj98xxnnkus8hzv367za28j900c7tv5v8pc',
     'bchtest:qz0dqjf6w6dp0lcs8cc68s720q9dv5zv8cs8fc0lt4',]
  )).toBe(true)
});

test('Accept example addresses uppercase', () => {
  expect(v.validateAddresses(
    ['ecash:QPZ274AAJ98XXNNKUS8HZV367ZA28J900C7TV5V8PC',
     'bitcoincash:QZ0DQJF6W6DP0LCS8CC68S720Q9DV5ZV8CS8FC0LT4',]
  )).toBe(true)
});

test('Accept example address one uppercase other lowercase', () => {
  expect(v.validateAddresses(
    ['ecash:QPZ274AAJ98XXNNKUS8HZV367ZA28J900C7TV5V8PC',
     'bitcoincash:qz0dqjf6w6dp0lcs8cc68s720q9dv5zv8cs8fc0lt4',]
  )).toBe(true)
});

test('Accept chain uppercase', () => {
  expect(v.validateAddresses(
    ['ECASH:QPZ274AAJ98XXNNKUS8HZV367ZA28J900C7TV5V8PC',
     'BiTcoinCash:qz0dqjf6w6dp0lcs8cc68s720q9dv5zv8cs8fc0lt4',]
  )).toBe(true)
});

test('Reject address with disallowed characters', () => {
  expect(v.validateAddresses(
    ['ecash:qpz274aaj98xxnnkus8hzv367za28j900c7tv5v8pc',  // this is valid
     'bitcoincash:qz0dqjf6w6dp0lcs8cc68s720q9dv5zv8cs1fc0lt4',]  // this has '1' in it
  )).toBe(false)
  expect(v.validateAddresses(
    ['ecash:qpz274aaj98xxnnkus8hzv367za28j900c7tv5v8pc',  // this is valid
     'bitcoincash:qz0dqjf6w6dp0lcs8cc68s720q9dv5zv8csbfc0lt4',]  // this has 'b' in it
  )).toBe(false)
  expect(v.validateAddresses(
    ['ecash:qpz274aaj98xxnnkus8hzv367za28j900c7tv5v8pc',  // this is valid
     'bitcoincash:qz0dqjf6w6dp0lcs8cc68s720q9dv5zv8csifc0lt4',]  // this has 'i' in it
  )).toBe(false)
  expect(v.validateAddresses(
    ['ecash:qpz274aaj98xxnnkus8hzv367za28j900c7tv5v8pc',  // this is valid
     'bitcoincash:qz0dqjf6w6dp0lcs8cc68s720q9dv5zv8csofc0lt4',]  // this has 'o' in it
  )).toBe(false)
});

test('Reject mixed case address', () => {
  expect(v.validateAddresses(
    ['bitcoincash:qpz274aaJ98XXNNKUS8HZV367ZA28J900C7tv5v8pc']
  )).toBe(false)
});

test('Reject legacy address', () => {
  expect(v.validateAddresses(
    ['ecash:1Nkmzb49MCUJThkpNWaVX9xCPmZvMKeu7Q']
  )).toBe(false)
});

test('Reject address without chain', () => {
  expect(v.validateAddresses(
    ['qpz274aaj98xxnnkus8hzv367za28j900c7tv5v8pc']
  )).toBe(false)
});

test('Reject non-supported chain', () => {
  expect(v.validateAddresses(
    ['ecash:qpz274aaj98xxnnkus8hzv367za28j900c7tv5v8pc',  // this is valid
    'bitcoin:qpz274aaj98xxnnkus8hzv367za28j900c7tv5v8pc'] // this is not
  )).toBe(false)
});

test('Reject non-supported address format', () => {
  expect(v.validateAddresses(
    ['ecash:qpz274aaj98xxnnkus8hzv367za28j900c7tv5v8pc',  // this is valid
     'bitcoincash:bc1qvwhdfujkyulp8jxuql7h55zzxlsap6zg9f5wmj']  // this is not
  )).toBe(false)
});

test('Reject valid addresses of repeated chain', () => {
  expect(v.validateAddresses(
    ['ecash:qpz274aaj98xxnnkus8hzv367za28j900c7tv5v8pc',
     'ecash:qz0dqjf6w6dp0lcs8cc68s720q9dv5zv8cs8fc0lt4',]
  )).toBe(false)
});

test('Reject empty list', () => {
  expect(v.validateAddresses(
    []
  )).toBe(false)
});
// end region
