import * as v from './validators'
import { RESPONSE_MESSAGES } from 'constants/index'


// region: test `validateAddresses`
test('Accept example addresses', () => {
  expect(v.validateAddresses(
    ['ecash:qpz274aaj98xxnnkus8hzv367za28j900c7tv5v8pc',
      'bitcoincash:qz0dqjf6w6dp0lcs8cc68s720q9dv5zv8cs8fc0lt4',]
  )).toBe(undefined)
});

test('Accept addresses for testnets', () => {
  expect(v.validateAddresses(
    ['bchreg:qpz274aaj98xxnnkus8hzv367za28j900c7tv5v8pc',
      'bchtest:qz0dqjf6w6dp0lcs8cc68s720q9dv5zv8cs8fc0lt4',]
  )).toBe(undefined)
});

test('Accept example addresses uppercase', () => {
  expect(v.validateAddresses(
    ['ecash:QPZ274AAJ98XXNNKUS8HZV367ZA28J900C7TV5V8PC',
      'bitcoincash:QZ0DQJF6W6DP0LCS8CC68S720Q9DV5ZV8CS8FC0LT4',]
  )).toBe(undefined)
});

test('Accept example address one uppercase other lowercase', () => {
  expect(v.validateAddresses(
    ['ecash:QPZ274AAJ98XXNNKUS8HZV367ZA28J900C7TV5V8PC',
      'bitcoincash:qz0dqjf6w6dp0lcs8cc68s720q9dv5zv8cs8fc0lt4',]
  )).toBe(undefined)
});

test('Accept chain uppercase', () => {
  expect(v.validateAddresses(
    ['ECASH:QPZ274AAJ98XXNNKUS8HZV367ZA28J900C7TV5V8PC',
      'BiTcoinCash:qz0dqjf6w6dp0lcs8cc68s720q9dv5zv8cs8fc0lt4',]
  )).toBe(undefined)
});


test('Reject address with disallowed characters', () => {
  expect(() => {
    v.validateAddresses(
      ['ecash:qpz274aaj98xxnnkus8hzv367za28j900c7tv5v8pc',  // this is valid
        'bitcoincash:qz0dqjf6w6dp0lcs8cc68s720q9dv5zv8cs1fc0lt4',]  // this has '1' in it
    )
  }).toThrow(RESPONSE_MESSAGES.INVALID_INPUT_400.message)
  expect(() => {
    v.validateAddresses(
      ['ecash:qpz274aaj98xxnnkus8hzv367za28j900c7tv5v8pc',  // this is valid
        'bitcoincash:qz0dqjf6w6dp0lcs8cc68s720q9dv5zv8csbfc0lt4',]  // this has 'b' in it
    )
  }).toThrow(RESPONSE_MESSAGES.INVALID_INPUT_400.message)
  expect(() => {
    v.validateAddresses(
      ['ecash:qpz274aaj98xxnnkus8hzv367za28j900c7tv5v8pc',  // this is valid
        'bitcoincash:qz0dqjf6w6dp0lcs8cc68s720q9dv5zv8csifc0lt4',]  // this has 'i' in it
    )
  }).toThrow(RESPONSE_MESSAGES.INVALID_INPUT_400.message)
  expect(() => {
    v.validateAddresses(
      ['ecash:qpz274aaj98xxnnkus8hzv367za28j900c7tv5v8pc',  // this is valid
        'bitcoincash:qz0dqjf6w6dp0lcs8cc68s720q9dv5zv8csofc0lt4',]  // this has 'o' in it
    )
  }).toThrow(RESPONSE_MESSAGES.INVALID_INPUT_400.message)
});

test('Reject mixed case address', () => {
  expect(() => {
    v.validateAddresses(
      ['bitcoincash:qpz274aaJ98XXNNKUS8HZV367ZA28J900C7tv5v8pc']
    )
  }).toThrow(RESPONSE_MESSAGES.INVALID_INPUT_400.message)
});

test('Reject legacy address', () => {
  expect(() => {
    v.validateAddresses(
      ['ecash:1Nkmzb49MCUJThkpNWaVX9xCPmZvMKeu7Q']
    )
  }).toThrow(RESPONSE_MESSAGES.INVALID_INPUT_400.message)
});

test('Reject address without chain', () => {
  expect(() => {
    v.validateAddresses(
      ['qpz274aaj98xxnnkus8hzv367za28j900c7tv5v8pc']
    )
  }).toThrow(RESPONSE_MESSAGES.INVALID_INPUT_400.message)
});

test('Reject non-supported chain', () => {
  expect(() => {
    v.validateAddresses(
      ['ecash:qpz274aaj98xxnnkus8hzv367za28j900c7tv5v8pc',  // this is valid
        'bitcoin:qpz274aaj98xxnnkus8hzv367za28j900c7tv5v8pc'] // this is not
    )
  }).toThrow(RESPONSE_MESSAGES.INVALID_INPUT_400.message)
});

test('Reject non-supported address format', () => {
  expect(() => {
    v.validateAddresses(
      ['ecash:qpz274aaj98xxnnkus8hzv367za28j900c7tv5v8pc',  // this is valid
        'bitcoincash:bc1qvwhdfujkyulp8jxuql7h55zzxlsap6zg9f5wmj']  // this is not
    )
  }).toThrow(RESPONSE_MESSAGES.INVALID_INPUT_400.message)
});

test('Reject valid addresses of repeated chain', () => {
  expect(() => {
    v.validateAddresses(
      ['ecash:qpz274aaj98xxnnkus8hzv367za28j900c7tv5v8pc',
        'ecash:qz0dqjf6w6dp0lcs8cc68s720q9dv5zv8cs8fc0lt4',]
    )
  }).toThrow(RESPONSE_MESSAGES.INVALID_INPUT_400.message)
});

test('Reject empty list', () => {
  expect(() => {
    v.validateAddresses(
      []
    )
  }).toThrow(RESPONSE_MESSAGES.ADDRESSES_NOT_PROVIDED_400.message)
});
// end region
