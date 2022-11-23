import * as v from 'utils/validators'
import { RESPONSE_MESSAGES } from 'constants/index'
import { Prisma } from '@prisma/client'
import { exampleAddresses } from 'tests/utils'

describe('parseAddress', () => {
  it('Accept example addresses without prefix', () => {
    for (const [key, value] of Object.entries(exampleAddresses)) {
      expect(v.parseAddress(value)).toStrictEqual(key + ':' + value)
    }
  })
  it('Accept example addresses with prefix', () => {
    for (const [key, value] of Object.entries(exampleAddresses)) {
      expect(v.parseAddress(key + ':' + value)).toStrictEqual(key + ':' + value)
    }
  })

  it('Accept example address uppercase', () => {
    expect(
      v.parseAddress(exampleAddresses.ecash.toUpperCase())
    ).toStrictEqual('ecash:' + exampleAddresses.ecash)
  })

  it('Accept example address with uppercase characters in network', () => {
    expect(
      v.parseAddress('eCaSh:' + exampleAddresses.ecash)
    ).toStrictEqual('ecash:' + exampleAddresses.ecash)
    expect(
      v.parseAddress('BITCOINCASH:' + exampleAddresses.bitcoincash)
    ).toStrictEqual('bitcoincash:' + exampleAddresses.bitcoincash)
  })

  it('Reject address with disallowed characters', () => {
    expect(() => {
      v.parseAddress((
        'ecash:qpz274aaj98xxnnkus8hzv367za28j900c7tv5v8pc\n' + // this is valid
        'bitcoincash:qz0dqjf6w6dp0lcs8cc68s720q9dv5zv8cs1fc0lt4' // this has '1' in it
      ))
    }).toThrow(RESPONSE_MESSAGES.INVALID_ADDRESS_400.message)
    expect(() => {
      v.parseAddress((
        'ecash:qpz274aaj98xxnnkus8hzv367za28j900c7tv5v8pc\n' + // this is valid
        'bitcoincash:qz0dqjf6w6dp0lcs8cc68s720q9dv5zv8csbfc0lt4' // this has 'b' in it
      ))
    }).toThrow(RESPONSE_MESSAGES.INVALID_ADDRESS_400.message)
    expect(() => {
      v.parseAddress((
        'ecash:qpz274aaj98xxnnkus8hzv367za28j900c7tv5v8pc\n' + // this is valid
        'bitcoincash:qz0dqjf6w6dp0lcs8cc68s720q9dv5zv8csifc0lt4' // this has 'i' in it
      ))
    }).toThrow(RESPONSE_MESSAGES.INVALID_ADDRESS_400.message)
    expect(() => {
      v.parseAddress((
        'ecash:qpz274aaj98xxnnkus8hzv367za28j900c7tv5v8pc\n' + // this is valid
        'bitcoincash:qz0dqjf6w6dp0lcs8cc68s720q9dv5zv8csofc0lt4' // this has 'o' in it
      ))
    }).toThrow(RESPONSE_MESSAGES.INVALID_ADDRESS_400.message)
  })

  it('Reject address with wrong network prefix', () => {
    expect(() => {
      v.parseAddress('bitcoincash:' + exampleAddresses.ecash)
    }).toThrow(RESPONSE_MESSAGES.INVALID_ADDRESS_400.message)
    expect(() => {
      v.parseAddress('bitcoincash:' + exampleAddresses.bchtest)
    }).toThrow(RESPONSE_MESSAGES.INVALID_ADDRESS_400.message)
    expect(() => {
      v.parseAddress('ecash:' + exampleAddresses.bitcoincash)
    }).toThrow(RESPONSE_MESSAGES.INVALID_ADDRESS_400.message)
    expect(() => {
      v.parseAddress('ecash:' + exampleAddresses.ectest)
    }).toThrow(RESPONSE_MESSAGES.INVALID_ADDRESS_400.message)
    expect(() => {
      v.parseAddress('bchtest:' + exampleAddresses.bitcoincash)
    }).toThrow(RESPONSE_MESSAGES.INVALID_ADDRESS_400.message)
    expect(() => {
      v.parseAddress('ectest:' + exampleAddresses.ecash)
    }).toThrow(RESPONSE_MESSAGES.INVALID_ADDRESS_400.message)
  })

  it('Reject mixed case address', () => {
    expect(v.parseAddress(exampleAddresses.ecash.toUpperCase())).toStrictEqual('ecash:' + exampleAddresses.ecash)
    expect(() => {
      v.parseAddress((
        'bitcoincash:Qrju9PGZn3m84q57ldjvxph30zrm8q7dlc8r8a3eyp'
      ))
    }).toThrow(RESPONSE_MESSAGES.INVALID_ADDRESS_400.message)
  })

  it('Reject legacy address', () => {
    expect(() => {
      v.parseAddress((
        'ecash:1Nkmzb49MCUJThkpNWaVX9xCPmZvMKeu7Q'
      ))
    }).toThrow(RESPONSE_MESSAGES.INVALID_ADDRESS_400.message)
  })

  it('Reject non-supported network', () => {
    expect(() => {
      v.parseAddress((
        'bitcoin:qrju9pgzn3m84q57ldjvxph30zrm8q7dlc8r8a3eyp'
      ))
    }).toThrow(RESPONSE_MESSAGES.INVALID_ADDRESS_400.message)
  })

  it('Reject empty string', () => {
    expect(() => {
      v.parseAddress('')
    }).toThrow(RESPONSE_MESSAGES.ADDRESS_NOT_PROVIDED_400.message)
  })
})

describe('parseError', () => {
  it('Prisma unique name constraint violation turns into custom error', () => {
    const error = new Prisma.PrismaClientKnownRequestError(
      'Error message: Paybutton_name_providerUserId_unique_constraint',
      'P2002',
      'foo'
    )
    expect(v.parseError(error)).toStrictEqual(new Error(RESPONSE_MESSAGES.PAYBUTTON_NAME_ALREADY_EXISTS_400.message))
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
  const data: v.paybuttonPOSTParameters = {
    userId: undefined,
    name: 'somename',
    buttonData: undefined,
    addresses: 'ecash:qz0dqjf6w6dp0lcs8cc68s720q9dv5zv8cs8fc0lt4'
  }
  it('Missing userId throws errors', () => {
    expect(() => {
      v.parsePaybuttonPOSTRequest(data)
    }).toThrow(RESPONSE_MESSAGES.USER_ID_NOT_PROVIDED_400.message)
    expect(() => {
      data.userId = ''
      v.parsePaybuttonPOSTRequest(data)
    }).toThrow(RESPONSE_MESSAGES.USER_ID_NOT_PROVIDED_400.message)
  })
  it('Missing name throws errors', () => {
    expect(() => {
      data.userId = 'some user'
      data.name = undefined
      v.parsePaybuttonPOSTRequest(data)
    }).toThrow(RESPONSE_MESSAGES.NAME_NOT_PROVIDED_400.message)
    expect(() => {
      data.name = ''
      v.parsePaybuttonPOSTRequest(data)
    }).toThrow(RESPONSE_MESSAGES.NAME_NOT_PROVIDED_400.message)
  })
  it('Missing address throws errors', () => {
    expect(() => {
      data.name = 'some name'
      data.addresses = ''
      v.parsePaybuttonPOSTRequest(data)
    }).toThrow(RESPONSE_MESSAGES.ADDRESSES_NOT_PROVIDED_400.message)
  })
})

describe('parsePaybuttonPATCHRequest', () => {
  const data: v.paybuttonPOSTParameters = {
    name: 'somename',
    addresses: undefined
  }
  it('Invalid addresses throws error', () => {
    expect(() => {
      data.addresses = 'ecash:lkajsdl\nll'
      v.parsePaybuttonPATCHRequest(data)
    }).toThrow(RESPONSE_MESSAGES.INVALID_ADDRESS_400.message)
  })
  it('Addresses text is split', () => {
    data.addresses = `ecash:${exampleAddresses.ecash}\nbitcoincash:${exampleAddresses.bitcoincash}`
    const res = v.parsePaybuttonPATCHRequest(data)
    expect(res.prefixedAddressList).toStrictEqual([
      `ecash:${exampleAddresses.ecash}`,
      `bitcoincash:${exampleAddresses.bitcoincash}`
    ])
  })
})
