import { Transform } from "stream";
import { NextApiResponse } from "next";
import { valuesToCsvLine, getDataFromValues, streamToCSV, getTransform, collapseSmallPayments } from "utils/files";
import { RESPONSE_MESSAGES, SupportedQuotesType } from "constants/index";
import { Payment } from "redis/types";
import { Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

const timezone = 'America/Sao_Paulo';
const currencyUsd = 'usd' as SupportedQuotesType;
const currencyCad = 'cad' as SupportedQuotesType;

const mockedJson = jest.fn();
const delimiter = ','

const mockedRes: jest.Mocked<NextApiResponse> = {
  status: jest.fn().mockReturnValue({ json: mockedJson }),
  write: jest.fn().mockReturnValue('ok'),
} as unknown as jest.Mocked<NextApiResponse>;

describe("valuesToCsvLine", () => {
    it("should join headers with commas", () => {
        const headers = ["header1", "header2", "header3"];
        const result = valuesToCsvLine(headers, ",");

        expect(result).toBe("header1,header2,header3"+"\n");
    });
    it("should join headers with \t delimiter", () => {
        const headers = ["header1", "header2", "header3"];
        const result = valuesToCsvLine(headers, "\t");

        expect(result).toBe("header1\theader2\theader3"+"\n");
    });
});

describe("getDataFromValues", () => {
    it("should map data values to headers", () => {
        const data = { header1: "value1", header2: "value2", header3: "value3" };
        const headers = ["header1", "header2"];
        
        const result = getDataFromValues(data, headers);

        expect(result).toEqual({ header1: "value1", header2: "value2" });
    });
});

describe("getTransform", () => {
    it("should transform data chunks into CSV lines - with 1 columns", (done) => {
        const headers = ["header1"];
        const transform = getTransform(headers, delimiter);

        const dataChunk = { header1: "value1",};
        transform.on('data', (chunk: { toString: () => any; }) => {
            // test
            expect(chunk.toString()).toBe("value1\n");
            done();
        });

        transform.write(dataChunk);
        transform.end();
    });

    it("should transform data chunks into CSV lines - with 2 columns", (done) => {
        const headers = ["header1", "header2"];
        const transform = getTransform(headers, delimiter);

        const dataChunk = { header1: "value1", header2: "value2" };
        transform.on('data', (chunk: { toString: () => any; }) => {
            // test
            expect(chunk.toString()).toBe("value1,value2\n");
            done();
        });

        transform.write(dataChunk);
        transform.end();
    });

    it("should transform data chunks into CSV lines - with 3 columns", (done) => {
        const headers = ["header1", "header2", "header3"];
        const transform = getTransform(headers, delimiter);
        const dataChunk = { 
            header1: "value1",
            header2: "value2",
            header3: "value3",
        };
        const { header1, header2, header3 } = dataChunk;

        transform.on('data', (chunk: { toString: () => any; }) => {
            // test
            expect(chunk.toString()).toBe(`${header1},${header2},${header3}\n`);
            done();
        });

        transform.write(dataChunk);
        transform.end();
    });

});

describe("streamToCSV", () => {
    it("should stream data to CSV and write to response", () => {
        const sampleData = [
            {
                amount: '10.00',
                date: '2024-06-04',
                txId: 'b4c2db5e-22c5-11ef-a973-0242ac120002',
                value: '0.00',
                rate: '0.00004675000000'
            },
            {
            amount: '10.00',
            date: '2024-06-04',
            txId: 'b4c44121-22c5-11ef-a973-0242ac120002',
            value: '0.00',
            rate: '0.00004675000000'
            },
            {
            amount: '10.00',
            date: '2024-06-04',
            txId: 'b4c5833b-22c5-11ef-a973-0242ac120002',
            value: '0.00',
            rate: '0.00004675000000'
            },
            {
            amount: '10.00',
            date: '2024-06-04',
            txId: 'b4c6ec02-22c5-11ef-a973-0242ac120002',
            value: '0.00',
            rate: '0.00004675000000'
            },
        ];
        const headers = ['date', 'amount', 'value', 'rate', 'txId'];
        
        const res = mockedRes;
        const getTransformSpy = jest.spyOn(require("utils/files"), 'getTransform');

        const mockedTransform: jest.Mocked<Transform> = {
            pipe: jest.fn().mockReturnValue({}),
            end: jest.fn().mockReturnValue({}),
            write: jest.fn().mockReturnValue({}),
          } as unknown as jest.Mocked<Transform>;

        getTransformSpy.mockImplementation((headers) => mockedTransform);


        streamToCSV(sampleData, headers, delimiter, res);

        expect(res.write).toHaveBeenCalledWith("date,amount,value,rate,txId\n");
        expect(mockedTransform.write).toHaveBeenCalledWith(sampleData[0]);
        expect(mockedTransform.write).toHaveBeenCalledWith(sampleData[1]);
        expect(mockedTransform.write).toHaveBeenCalledWith(sampleData[2]);
        expect(mockedTransform.write).toHaveBeenCalledWith(sampleData[3]);
        expect(mockedTransform.end).toHaveBeenCalled()
     });

     it("should handle errors and throw a new error", () => {
        const values = [
            { header1: "value1", header2: "value2" },
            { header1: "value3", header2: "value4" }
        ];
        const headers = ["header1", "header2"];
        const res = mockedRes;

        jest.spyOn(res, 'write').mockImplementation(() => {
            throw new Error("Write error");
        });

        expect(() => streamToCSV(values, headers, delimiter, res)).toThrow(RESPONSE_MESSAGES.COULD_NOT_DOWNLOAD_FILE_500.message);
    });
});

describe('collapseSmallPayments', () => {
  const mockedPayments: Payment[] = [
    {
      timestamp: 1738950932,
      values: { 
        values: { usd: new Prisma.Decimal(1.01475), cad: new Prisma.Decimal(1.45099) },
        amount: new Decimal(41000) 
      },
      networkId: 1,
      hash: '2ea05bde5db7c1176b7047fa2e9cef9aa55608e4b1376ad7e237977a6ad9fc17',
      buttonDisplayDataList: [
        {
          name: 'LIssa',
          id: '3be87ec3-e7bf-11ef-a39b-0242ac140003',
          providerUserId: 'dev2-uid'
        }
      ],
      address: 'ecash:qzlefwhd6x7ucasvvnytu6j9n9ez2atqmc25qvk2p3'
    },
    {
      timestamp: 1738950932,
      values: { values: { 
        usd: new Prisma.Decimal(0.00037125), 
        cad: new Prisma.Decimal(0.00053085) }, 
        amount: new Decimal(15) },
      networkId: 1,
      hash: '2352d43b67b14cc60fb72a4beb4563a8cec4eef4c4d2a59910032307b4e3115f',
      buttonDisplayDataList: [
        {
          name: 'LIssa',
          id: '3be87ec3-e7bf-11ef-a39b-0242ac140003',
          providerUserId: 'dev2-uid'
        }
      ],
      address: 'ecash:qzlefwhd6x7ucasvvnytu6j9n9ez2atqmc25qvk2p3'
    },
    {
      timestamp: 1738950932,
      values: {
        values: { 
          usd: new Prisma.Decimal(0.0002475), 
          cad: new Prisma.Decimal(0.0003539) 
        }, 
          amount: new Decimal(10) 
        },
      networkId: 1,
      hash: 'fdc16a5457a4735282b94a817dcbede2b1972e4c6c596cfb22af2a3125bcfc96',
      buttonDisplayDataList: [
        {
          name: 'LIssa',
          id: '3be87ec3-e7bf-11ef-a39b-0242ac140003',
          providerUserId: 'dev2-uid'
        }
      ],
      address: 'ecash:qzlefwhd6x7ucasvvnytu6j9n9ez2atqmc25qvk2p3'
    },
    {
      timestamp: 1738950932,
      values: { values: 
        { 
        usd: new Prisma.Decimal(0.000396), 
        cad: new Prisma.Decimal(0.00056624) 
        }, 
        amount: new Decimal(16) },
      networkId: 1,
      hash: 'cc8ace1c4bb2a0dfa864ddc874127cabbf54a68abc85648567f6eed0fe1a3a19',
      buttonDisplayDataList: [
        {
          name: 'LIssa',
          id: '3be87ec3-e7bf-11ef-a39b-0242ac140003',
          providerUserId: 'dev2-uid'
        }
      ],
      address: 'ecash:qzlefwhd6x7ucasvvnytu6j9n9ez2atqmc25qvk2p3'
    },
    {
      timestamp: 1738950932,
      values: { values: { 
        usd: new Prisma.Decimal(1.00314918), 
        cad: new Prisma.Decimal(1.4344019992) 
      }, 
      amount: new Decimal(40531.28) },
      networkId: 1,
      hash: 'a9aa890850a9453bb7f39998984d5a70d4c045349b66f4b789904131e62a66d0',
      buttonDisplayDataList: [
        {
          name: 'LIssa',
          id: '3be87ec3-e7bf-11ef-a39b-0242ac140003',
          providerUserId: 'dev2-uid'
        }
      ],
      address: 'ecash:qzlefwhd6x7ucasvvnytu6j9n9ez2atqmc25qvk2p3'
    }
  ];
  const mockedSmallerThen1UsdPayments = [mockedPayments[1], mockedPayments[2], mockedPayments[3]];


  it('should collapse small payments correctly', () => {
    const result = collapseSmallPayments(mockedPayments, currencyUsd, timezone);

    expect(result).toHaveLength(3);
  });

  it('should collapse small payments threshold 2 USD', () => {
    const result = collapseSmallPayments(mockedPayments, currencyUsd, timezone, 2);

    expect(result).toHaveLength(1);
  });

  it('should collapse small payments and concatenate txIds', () => {
    const result = collapseSmallPayments(mockedPayments, currencyUsd, timezone);
    const collapsedPayment = result[1]

    expect(collapsedPayment.transactionId).toBe(mockedSmallerThen1UsdPayments.map(p => p.hash).join(';'));
  });

  it('amount should be the sum of colapsed tx amounts', () => {
    const result = collapseSmallPayments(mockedPayments, currencyUsd, timezone);
    const sumOfSmallPaymentsAmount = Number(mockedSmallerThen1UsdPayments.reduce((sum, payment) => sum.plus(payment.values.amount), new Decimal(0)));

    const collapsedPayment = result[1];

    expect(collapsedPayment.amount).toBe(sumOfSmallPaymentsAmount);
  });

  it('value should be the sum of colapsed tx values - USD', () => {
    const result = collapseSmallPayments(mockedPayments, currencyUsd, timezone);
    const sumOfSmallPaymentsAmount = Number(mockedSmallerThen1UsdPayments.reduce((sum, payment) => sum.plus(payment.values.values[currencyUsd]), new Decimal(0)));

    const collapsedPayment = result[1];

    expect(collapsedPayment.value).toBe(sumOfSmallPaymentsAmount);
  });

  it('value should be the sum of colapsed tx values - CAD', () => {
    const result = collapseSmallPayments(mockedPayments, currencyCad, timezone);
    const sumOfSmallPaymentsAmount = Number(mockedSmallerThen1UsdPayments.reduce((sum, payment) => sum.plus(payment.values.values[currencyCad]), new Decimal(0)));

    const collapsedPayment = result[1];

    expect(collapsedPayment.value).toBe(sumOfSmallPaymentsAmount);
  });

  it('rate should be the sum of colapsed total tx amounts divided by total tx values - USD', () => {
    const result = collapseSmallPayments(mockedPayments, currencyUsd, timezone);
    const sumOfSmallPaymentAmounts = Number(mockedSmallerThen1UsdPayments.reduce((sum, payment) => sum.plus(payment.values.amount), new Decimal(0)));
    const sumOfSmallPaymentValues = Number(mockedSmallerThen1UsdPayments.reduce((sum, payment) => sum.plus(payment.values.values[currencyUsd]), new Decimal(0)));
    const rate = sumOfSmallPaymentValues/sumOfSmallPaymentAmounts
    
    const collapsedPayment = result[1];

    expect(collapsedPayment.rate).toBe(rate);
  });
});
  
