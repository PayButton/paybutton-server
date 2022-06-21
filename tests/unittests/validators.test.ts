import * as v from 'utils/validators'
import { RESPONSE_MESSAGES } from 'constants/index'
import { Prisma } from '@prisma/client'

describe('parseAddresses', () => {
  it('Accept example addresses', () => {
    const addressListString = 'ecash:qpz274aaj98xxnnkus8hzv367za28j900c7tv5v8pc\nbitcoincash:qz0dqjf6w6dp0lcs8cc68s720q9dv5zv8cs8fc0lt4'
    expect(v.parseAddresses(addressListString)).toStrictEqual(addressListString.split('\n'))
  })

  it('Accept addresses for testnets', () => {
    const addressListString = 'bchreg:qpz274aaj98xxnnkus8hzv367za28j900c7tv5v8pc\nbchtest:qz0dqjf6w6dp0lcs8cc68s720q9dv5zv8cs8fc0lt4'
    expect(v.parseAddresses(addressListString)).toStrictEqual(addressListString.split('\n'))
  })

  it('Accept example addresses uppercase', () => {
    const addressListString = 'ecash:QPZ274AAJ98XXNNKUS8HZV367ZA28J900C7TV5V8PC\nbitcoincash:QZ0DQJF6W6DP0LCS8CC68S720Q9DV5ZV8CS8FC0LT4'
    expect(v.parseAddresses(addressListString)).toStrictEqual(addressListString.split('\n'))
  })

  it('Accept example address one uppercase other lowercase', () => {
    const addressListString = 'ecash:QPZ274AAJ98XXNNKUS8HZV367ZA28J900C7TV5V8PC\nbitcoincash:qz0dqjf6w6dp0lcs8cc68s720q9dv5zv8cs8fc0lt4'
    expect(v.parseAddresses(addressListString)).toStrictEqual(addressListString.split('\n'))
  })

  it('Accept chain uppercase', () => {
    const addressListString = 'ECASH:QPZ274AAJ98XXNNKUS8HZV367ZA28J900C7TV5V8PC\nBiTcoinCash:qz0dqjf6w6dp0lcs8cc68s720q9dv5zv8cs8fc0lt4'
    expect(v.parseAddresses(addressListString)).toStrictEqual(addressListString.split('\n'))
  })

  it('Reject address with disallowed characters', () => {
    expect(() => {
      v.parseAddresses((
        'ecash:qpz274aaj98xxnnkus8hzv367za28j900c7tv5v8pc\n' + // this is valid
        'bitcoincash:qz0dqjf6w6dp0lcs8cc68s720q9dv5zv8cs1fc0lt4' // this has '1' in it
      ))
    }).toThrow(RESPONSE_MESSAGES.INVALID_INPUT_400.message)
    expect(() => {
      v.parseAddresses((
        'ecash:qpz274aaj98xxnnkus8hzv367za28j900c7tv5v8pc\n' + // this is valid
        'bitcoincash:qz0dqjf6w6dp0lcs8cc68s720q9dv5zv8csbfc0lt4' // this has 'b' in it
      ))
    }).toThrow(RESPONSE_MESSAGES.INVALID_INPUT_400.message)
    expect(() => {
      v.parseAddresses((
        'ecash:qpz274aaj98xxnnkus8hzv367za28j900c7tv5v8pc\n' + // this is valid
        'bitcoincash:qz0dqjf6w6dp0lcs8cc68s720q9dv5zv8csifc0lt4' // this has 'i' in it
      ))
    }).toThrow(RESPONSE_MESSAGES.INVALID_INPUT_400.message)
    expect(() => {
      v.parseAddresses((
        'ecash:qpz274aaj98xxnnkus8hzv367za28j900c7tv5v8pc\n' + // this is valid
        'bitcoincash:qz0dqjf6w6dp0lcs8cc68s720q9dv5zv8csofc0lt4' // this has 'o' in it
      ))
    }).toThrow(RESPONSE_MESSAGES.INVALID_INPUT_400.message)
  })

  it('Reject mixed case address', () => {
    expect(() => {
      v.parseAddresses((
        'bitcoincash:qpz274aaJ98XXNNKUS8HZV367ZA28J900C7tv5v8pc'
      ))
    }).toThrow(RESPONSE_MESSAGES.INVALID_INPUT_400.message)
  })

  it('Reject legacy address', () => {
    expect(() => {
      v.parseAddresses((
        'ecash:1Nkmzb49MCUJThkpNWaVX9xCPmZvMKeu7Q'
      ))
    }).toThrow(RESPONSE_MESSAGES.INVALID_INPUT_400.message)
  })

  it('Reject address without chain', () => {
    expect(() => {
      v.parseAddresses((
        'qpz274aaj98xxnnkus8hzv367za28j900c7tv5v8pc'
      ))
    }).toThrow(RESPONSE_MESSAGES.INVALID_INPUT_400.message)
  })

  it('Reject non-supported chain', () => {
    expect(() => {
      v.parseAddresses((
        'ecash:qpz274aaj98xxnnkus8hzv367za28j900c7tv5v8pc\n' + // this is valid
        'bitcoin:qpz274aaj98xxnnkus8hzv367za28j900c7tv5v8pc' // this is not
      ))
    }).toThrow(RESPONSE_MESSAGES.INVALID_INPUT_400.message)
  })

  it('Reject non-supported address format', () => {
    expect(() => {
      v.parseAddresses((
        'ecash:qpz274aaj98xxnnkus8hzv367za28j900c7tv5v8pc\n' + // this is valid
        'bitcoincash:bc1qvwhdfujkyulp8jxuql7h55zzxlsap6zg9f5wmj' // this is not
      ))
    }).toThrow(RESPONSE_MESSAGES.INVALID_INPUT_400.message)
  })

  it('Reject valid addresses of repeated chain', () => {
    expect(() => {
      v.parseAddresses((
        'ecash:qpz274aaj98xxnnkus8hzv367za28j900c7tv5v8pc\n' +
        'ecash:qz0dqjf6w6dp0lcs8cc68s720q9dv5zv8cs8fc0lt4'
      ))
    }).toThrow(RESPONSE_MESSAGES.INVALID_INPUT_400.message)
  })

  it('Reject empty string', () => {
    expect(() => {
      v.parseAddresses('')
    }).toThrow(RESPONSE_MESSAGES.ADDRESSES_NOT_PROVIDED_400.message)
  })
})

describe('parseError', () => {
  it('Prisma unique name constraint violation turns into custom error', () => {
    const error = new Prisma.PrismaClientKnownRequestError(
      'Error message: Paybutton_name_providerUserId_unique_constraint',
      'P2002',
      'foo'
    )
    expect(v.parseError(error)).toStrictEqual(new Error(RESPONSE_MESSAGES.NAME_ALREADY_EXISTS_400.message))
  })
})

describe('parseButtonData', () => {
  it('Empty values give empty JSON string', () => {
    expect(v.parseButtonData(undefined)).toBe('{}')
    expect(v.parseButtonData('')).toBe('{}')
    expect(v.parseButtonData('{}')).toBe('{}')
  })
  it('Invalid JSON string throws error', () => {
    expect(() => {
      v.parseButtonData('bla')
    }).toThrow(RESPONSE_MESSAGES.INVALID_BUTTON_DATA_400.message)
    expect(() => {
      v.parseButtonData('{bla:2}')
    }).toThrow(RESPONSE_MESSAGES.INVALID_BUTTON_DATA_400.message)
    expect(() => {
      v.parseButtonData('{"bla": 2')
    }).toThrow(RESPONSE_MESSAGES.INVALID_BUTTON_DATA_400.message)
  })
  it('Valid JSON string returns itself minimized', () => {
    const expectedJSONString = '{"bla":3,"foo":"bar"}'
    expect(v.parseButtonData(expectedJSONString)).toBe(expectedJSONString)
    expect(v.parseButtonData('{"bla": 3, "foo": "bar"}')).toBe(expectedJSONString)
    expect(v.parseButtonData('{"bla":\n3,      "foo"\n: "bar"  } ')).toBe(expectedJSONString)
  })
})

describe('parsePaybuttonPOSTRequest', () => {
  const data: v.POSTParameters = {
    name: 'somename',
    buttonData: undefined,
    addresses: 'ecash:qz0dqjf6w6dp0lcs8cc68s720q9dv5zv8cs8fc0lt4'
  }
  it('Missing userId throws errors', () => {
    expect(() => {
      v.parsePaybuttonPOSTRequest(data, undefined)
    }).toThrow(RESPONSE_MESSAGES.USER_ID_NOT_PROVIDED_400.message)
    expect(() => {
      v.parsePaybuttonPOSTRequest(data, '')
    }).toThrow(RESPONSE_MESSAGES.USER_ID_NOT_PROVIDED_400.message)
  })
  it('Missing name throws errors', () => {
    expect(() => {
      data.name = undefined
      v.parsePaybuttonPOSTRequest(data, 'some user')
    }).toThrow(RESPONSE_MESSAGES.NAME_NOT_PROVIDED_400.message)
    expect(() => {
      data.name = ''
      v.parsePaybuttonPOSTRequest(data, 'some user')
    }).toThrow(RESPONSE_MESSAGES.NAME_NOT_PROVIDED_400.message)
  })
  it('Missing address throws errors', () => {
    expect(() => {
      data.name = 'some name'
      data.addresses = ''
      v.parsePaybuttonPOSTRequest(data, 'some user')
    }).toThrow(RESPONSE_MESSAGES.ADDRESSES_NOT_PROVIDED_400.message)
  })
})
