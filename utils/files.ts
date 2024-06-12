import { RESPONSE_MESSAGES } from "../constants/index";
import { NextApiResponse } from "next";
import { Transform } from "stream";

export function resolveHeaders(headers:string[]): string {
    return headers.join(',');
}

export function getDataFromValues(data:any, headers: string[]): any {
    const result: any = {};
    headers.forEach(header => {
        result[header] = data[header];
    });

    return result;
}

export const getTransform = (headers:string[]) => new Transform({
    objectMode: true,
    transform(chunk: any, encoding: BufferEncoding, callback: () => void) {
        const csvLine = headers.map(header => chunk[header]).join(',') + '\n';
        this.push(csvLine);
        callback();
    },
});

export function streamtoCSV(values: object[], headers: string[], res: NextApiResponse | any) {
    const maxRecords = 10; 
    const formattedHeaders = resolveHeaders(headers);
    const transform = getTransform(headers)

    try {
        res.write(formattedHeaders + '\n');
        values.slice(0, maxRecords).forEach((data: object) => {
            const formattedData = getDataFromValues(data, headers);
            transform.write(formattedData);
        });

        transform.end();
        transform.pipe(res);
    } catch (error: any) {
        console.log(error.message)
        
        throw new Error(RESPONSE_MESSAGES.COULD__NOT_DOWNLOAD_FILE_500.message)
    }
}
