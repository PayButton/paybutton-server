import * as v from 'utils/validators'
import { RESPONSE_MESSAGES } from 'constants/index'


// region: test `parseAddresses`
test('Accept example addresses', () => {
  const addressListString = 'ecash:qpz274aaj98xxnnkus8hzv367za28j900c7tv5v8pc\nbitcoincash:qz0dqjf6w6dp0lcs8cc68s720q9dv5zv8cs8fc0lt4'
  expect(v.parseAddresses(addressListString)).toStrictEqual(addressListString.split('\n'))
});

test('Accept addresses for testnets', () => {
  const addressListString = 'bchreg:qpz274aaj98xxnnkus8hzv367za28j900c7tv5v8pc\nbchtest:qz0dqjf6w6dp0lcs8cc68s720q9dv5zv8cs8fc0lt4'
  expect(v.parseAddresses(addressListString)).toStrictEqual(addressListString.split('\n'))
});

test('Accept example addresses uppercase', () => {
  const addressListString = 'ecash:QPZ274AAJ98XXNNKUS8HZV367ZA28J900C7TV5V8PC\nbitcoincash:QZ0DQJF6W6DP0LCS8CC68S720Q9DV5ZV8CS8FC0LT4'
  expect(v.parseAddresses(addressListString)).toStrictEqual(addressListString.split('\n'))
});

test('Accept example address one uppercase other lowercase', () => {
  const addressListString = 'ecash:QPZ274AAJ98XXNNKUS8HZV367ZA28J900C7TV5V8PC\nbitcoincash:qz0dqjf6w6dp0lcs8cc68s720q9dv5zv8cs8fc0lt4'
  expect(v.parseAddresses(addressListString)).toStrictEqual(addressListString.split('\n'))
});

test('Accept chain uppercase', () => {
  const addressListString = 'ECASH:QPZ274AAJ98XXNNKUS8HZV367ZA28J900C7TV5V8PC\nBiTcoinCash:qz0dqjf6w6dp0lcs8cc68s720q9dv5zv8cs8fc0lt4'
  expect(v.parseAddresses(addressListString)).toStrictEqual(addressListString.split('\n'))
});

test('Reject address with disallowed characters', () => {
  expect(() => {
    v.parseAddresses((
      'ecash:qpz274aaj98xxnnkus8hzv367za28j900c7tv5v8pc\n'  // this is valid
      + 'bitcoincash:qz0dqjf6w6dp0lcs8cc68s720q9dv5zv8cs1fc0lt4'  // this has '1' in it
    ))
  }).toThrow(RESPONSE_MESSAGES.INVALID_INPUT_400.message)
  expect(() => {
    v.parseAddresses((
      'ecash:qpz274aaj98xxnnkus8hzv367za28j900c7tv5v8pc\n'  // this is valid
      + 'bitcoincash:qz0dqjf6w6dp0lcs8cc68s720q9dv5zv8csbfc0lt4'  // this has 'b' in it
    ))
  }).toThrow(RESPONSE_MESSAGES.INVALID_INPUT_400.message)
  expect(() => {
    v.parseAddresses((
      'ecash:qpz274aaj98xxnnkus8hzv367za28j900c7tv5v8pc\n'  // this is valid
      + 'bitcoincash:qz0dqjf6w6dp0lcs8cc68s720q9dv5zv8csifc0lt4'  // this has 'i' in it
    ))
  }).toThrow(RESPONSE_MESSAGES.INVALID_INPUT_400.message)
  expect(() => {
    v.parseAddresses((
      'ecash:qpz274aaj98xxnnkus8hzv367za28j900c7tv5v8pc\n'  // this is valid
      + 'bitcoincash:qz0dqjf6w6dp0lcs8cc68s720q9dv5zv8csofc0lt4'  // this has 'o' in it
    ))
  }).toThrow(RESPONSE_MESSAGES.INVALID_INPUT_400.message)
});

test('Reject mixed case address', () => {
  expect(() => {
    v.parseAddresses((
      'bitcoincash:qpz274aaJ98XXNNKUS8HZV367ZA28J900C7tv5v8pc'
    ))
  }).toThrow(RESPONSE_MESSAGES.INVALID_INPUT_400.message)
});

test('Reject legacy address', () => {
  expect(() => {
    v.parseAddresses((
      'ecash:1Nkmzb49MCUJThkpNWaVX9xCPmZvMKeu7Q'
    ))
  }).toThrow(RESPONSE_MESSAGES.INVALID_INPUT_400.message)
});

test('Reject address without chain', () => {
  expect(() => {
    v.parseAddresses((
      'qpz274aaj98xxnnkus8hzv367za28j900c7tv5v8pc'
    ))
  }).toThrow(RESPONSE_MESSAGES.INVALID_INPUT_400.message)
});

test('Reject non-supported chain', () => {
  expect(() => {
    v.parseAddresses((
      'ecash:qpz274aaj98xxnnkus8hzv367za28j900c7tv5v8pc\n'  // this is valid
      + 'bitcoin:qpz274aaj98xxnnkus8hzv367za28j900c7tv5v8pc' // this is not
    ))
  }).toThrow(RESPONSE_MESSAGES.INVALID_INPUT_400.message)
});

test('Reject non-supported address format', () => {
  expect(() => {
    v.parseAddresses((
      'ecash:qpz274aaj98xxnnkus8hzv367za28j900c7tv5v8pc\n'  // this is valid
      + 'bitcoincash:bc1qvwhdfujkyulp8jxuql7h55zzxlsap6zg9f5wmj'  // this is not
    ))
  }).toThrow(RESPONSE_MESSAGES.INVALID_INPUT_400.message)
});

test('Reject valid addresses of repeated chain', () => {
  expect(() => {
    v.parseAddresses((
      'ecash:qpz274aaj98xxnnkus8hzv367za28j900c7tv5v8pc\n'
      + 'ecash:qz0dqjf6w6dp0lcs8cc68s720q9dv5zv8cs8fc0lt4'
    ))
  }).toThrow(RESPONSE_MESSAGES.INVALID_INPUT_400.message)
});

test('Reject empty string', () => {
  expect(() => {
    v.parseAddresses("")
  }).toThrow(RESPONSE_MESSAGES.ADDRESSES_NOT_PROVIDED_400.message)
});
// end region
