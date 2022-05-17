import * as v from './validators'

// region: test `validateAddresses`

test('Accept example addresses', () => {
  expect(v.validateAddresses(
    ['ecash:qpz274aaj98xxnnkus8hzv367za28j900c7tv5v8pc',
     'bitcoincash:qz0dqjf6w6dp0lcs8cc68s720q9dv5zv8cs8fc0lt4',]
  )).toBe(true)
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
