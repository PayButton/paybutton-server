import { Transform } from "stream";
import { NextApiResponse } from "next";
import { valuesToCsvLine, getDataFromValues, streamToCSV, getTransform } from "utils/files";
import { RESPONSE_MESSAGES } from "constants/index";

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

        expect(result).toBe("header1,header2,header3");
    });
    it("should join headers with \t delimiter", () => {
        const headers = ["header1", "header2", "header3"];
        const result = valuesToCsvLine(headers, "\t");

        expect(result).toBe("header1\theader2\theader3");
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
