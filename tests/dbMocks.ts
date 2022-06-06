interface FindProps {
  where: {
    id: string
    providerUserId: string
  }
  include: boolean
}

export const mockedPaybuttonsFindOne = ({ where, include }: FindProps): object => {
  if (include == null) {
    return {
      id: parseInt(where.id),
      providerUserId: 'mocked-uid',
      createdAt: '2022-05-27T15:18:42.000Z',
      updatedAt: '2022-05-27T15:18:42.000Z'
    }
  } else {
    return {
      id: parseInt(where.id),
      providerUserId: 'mocked-uid',
      createdAt: '2022-05-27T15:18:42.000Z',
      updatedAt: '2022-05-27T15:18:42.000Z',
      addresses: [
        {
          id: 1,
          address: 'mockedaddress0nkus8hzv367za28j900c7tv5v8pc',
          createdAt: '2022-05-27T15:18:42.000Z',
          updatedAt: '2022-05-27T15:18:42.000Z',
          chainId: 1,
          paybuttonId: 1,
          chain: {
            id: 1,
            slug: 'bitcoincash',
            title: 'Bitcoin Cash',
            createdAt: '2022-05-27T12:06:21.000Z',
            updatedAt: '2022-05-27T12:06:21.000Z'
          }
        },
        {
          id: 2,
          address: 'mockedaddress0nkush83z76az28900c7tj5vpc8f',
          createdAt: '2022-05-27T15:18:42.000Z',
          updatedAt: '2022-05-27T15:18:42.000Z',
          chainId: 2,
          paybuttonId: 1,
          chain: {
            id: 2,
            slug: 'ecash',
            title: 'eCash',
            createdAt: '2022-05-27T12:06:21.000Z',
            updatedAt: '2022-05-27T12:06:21.000Z'
          }
        }
      ]
    }
  }
}

export const mockedPaybuttonsFindAll = ({ where, include }: FindProps): object => {
  if (include == null) {
    return [
      {
        id: 1,
        providerUserId: where.providerUserId,
        createdAt: '2022-05-27T15:18:42.000Z',
        updatedAt: '2022-05-27T15:18:42.000Z'
      },
      {
        id: 2,
        providerUserId: where.providerUserId,
        createdAt: '2022-05-27T15:18:42.000Z',
        updatedAt: '2022-05-27T15:18:42.000Z'
      }
    ]
  } else {
    return [
      {
        id: 1,
        providerUserId: where.providerUserId,
        createdAt: '2022-05-27T15:18:42.000Z',
        updatedAt: '2022-05-27T15:18:42.000Z',
        addresses: [
          {
            id: 1,
            address: 'mockedaddress0nkus8hzv367za28j900c7tv5v8pc',
            createdAt: '2022-05-27T15:18:42.000Z',
            updatedAt: '2022-05-27T15:18:42.000Z',
            chainId: 1,
            paybuttonId: 1,
            chain: {
              id: 1,
              slug: 'bitcoincash',
              title: 'Bitcoin Cash',
              createdAt: '2022-05-27T12:06:21.000Z',
              updatedAt: '2022-05-27T12:06:21.000Z'
            }
          },
          {
            id: 2,
            address: 'mockedaddress0nkush83z76az28900c7tj5vpc8f',
            createdAt: '2022-05-27T15:18:42.000Z',
            updatedAt: '2022-05-27T15:18:42.000Z',
            chainId: 2,
            paybuttonId: 1,
            chain: {
              id: 2,
              slug: 'ecash',
              title: 'eCash',
              createdAt: '2022-05-27T12:06:21.000Z',
              updatedAt: '2022-05-27T12:06:21.000Z'
            }
          }
        ]
      },
      {
        id: 2,
        providerUserId: where.providerUserId,
        createdAt: '2022-05-27T15:18:42.000Z',
        updatedAt: '2022-05-27T15:18:42.000Z',
        addresses: [
          {
            id: 3,
            address: 'mockedaddress0nkus8hzv367za28j900c7tv5v8pc',
            createdAt: '2022-05-27T15:18:42.000Z',
            updatedAt: '2022-05-27T15:18:42.000Z',
            chainId: 1,
            paybuttonId: 2,
            chain: {
              id: 1,
              slug: 'bitcoincash',
              title: 'Bitcoin Cash',
              createdAt: '2022-05-27T12:06:21.000Z',
              updatedAt: '2022-05-27T12:06:21.000Z'
            }
          },
          {
            id: 4,
            address: 'mockedaddress0nkush83z76az28900c7tj5vpc8f',
            createdAt: '2022-05-27T15:18:42.000Z',
            updatedAt: '2022-05-27T15:18:42.000Z',
            chainId: 2,
            paybuttonId: 2,
            chain: {
              id: 2,
              slug: 'ecash',
              title: 'eCash',
              createdAt: '2022-05-27T12:06:21.000Z',
              updatedAt: '2022-05-27T12:06:21.000Z'
            }
          }
        ]
      }
    ]
  }
}
