import { RESPONSE_MESSAGES } from "../constants/index";
import { NextApiResponse } from "next";
import { Transform } from "stream";

export function valuesToCsvLine(values: string[], delimiter: string): string {
    return values.join(delimiter);
}
interface DataObject {
    [key: string]: any;
}

export function getDataFromValues(data: DataObject, headers: string[]): Partial<DataObject> {
    const result: Partial<DataObject> = {};
    headers.forEach(header => {
        result[header] = data[header];
    });

    return result;
}

export const getTransform = (headers: string[], delimiter: string) => new Transform({
    objectMode: true,
    transform(chunk: any, encoding: BufferEncoding, callback: () => void) {
        const csvLine = valuesToCsvLine(headers.map(header => chunk[header]), delimiter) + '\n';
        this.push(csvLine);
        callback();
    },
});

export function streamToCSV(values: object[], headers: string[], delimiter: string, res: NextApiResponse) {
    const maxRecords = 10;
    const csvLineHeaders = valuesToCsvLine(headers, delimiter);
    const transform = getTransform(headers, delimiter);

    try {
        res.write(csvLineHeaders + '\n');
        values.slice(0, maxRecords).forEach((data: object) => {
            const formattedData = getDataFromValues(data, headers);
            transform.write(formattedData);
        });

        transform.end();
        transform.pipe(res);
    } catch (error: any) {
        console.error(error.message);
        throw new Error(RESPONSE_MESSAGES.COULD_NOT_DOWNLOAD_FILE_500.message);
    }
}
