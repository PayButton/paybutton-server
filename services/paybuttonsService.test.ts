import models from 'db/models/index'
import * as paybuttonsService from 'services/paybuttonsService'
import * as dbMocks from 'tests/dbMocks'


models.paybuttons.findOne = jest.fn(dbMocks.mockedPaybuttonsFindOne);
models.paybuttons.findAll = jest.fn(dbMocks.mockedPaybuttonsFindAll);
models.sequelize.transaction = jest.fn((_) => { return { id: 4 }});


describe('Fetch services', () => {
  it('Should fetch paybutton by id', async () => {
    const result = await paybuttonsService.fetchPaybuttonById('4')
    expect(result).toEqual(expect.objectContaining({
        id: 4,
        providerUserId: expect.any(String),
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
    }));
  });

  it('Should fetch paybutton by id nested', async () => {
    const result = await paybuttonsService.fetchPaybuttonById(4, true)
    expect(result).toEqual(expect.objectContaining({
        id: 4,
        providerUserId: expect.any(String),
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
        addresses: expect.arrayContaining([])
    }));
  });

  it('Should fetch all paybuttons by userId', async () => {
    const result = await paybuttonsService.fetchPaybuttonArrayByUserId('mocked-uid')
    expect(result).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id:  expect.any(Number),
        providerUserId:"mocked-uid",
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      }),
      expect.objectContaining({
        id:  expect.any(Number),
        providerUserId:"mocked-uid",
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      })
    ]));
  });

  it('Should fetch all paybuttons by userId nested', async () => {
    const result = await paybuttonsService.fetchPaybuttonArrayByUserId('mocked-uid', true)
    expect(result).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id:  expect.any(Number),
        providerUserId: "mocked-uid",
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
        addresses: expect.arrayContaining([])
      }),
      expect.objectContaining({
        id:  expect.any(Number),
        providerUserId: "mocked-uid",
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
        addresses: expect.arrayContaining([])
      })
    ]));
  });
});

describe('Create services', () => {
  it('Should return paybutton nested', async () => {
    const result = await paybuttonsService.createPaybutton('mocked-uid', ['mockedchain:mockaddress'])
    expect(result).toEqual(expect.objectContaining({
        id: expect.any(Number),
        providerUserId: expect.any(String),
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
        addresses: expect.arrayContaining([])
    }));
  });
});
