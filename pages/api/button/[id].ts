import { NextApiResponse, NextApiRequest } from "next/types"
import { ButtonResource } from "types"

const fetchResource = (userId: string): ButtonResource[] => {
    const temp_addresses = ['ecash:qpz274aaj98xxnnkus8hzv367za28j900c7tv5v8pc', 'bitcoincash:qrw5fzqlxzf639m8s7fq7wn33as7nfw9wg9zphxlxe']
    return [{
        id: btoa(userId + Math.random()).slice(10,20),
        userId,
        addresses: temp_addresses
    }]
}

export default (
    req: NextApiRequest,
    res: NextApiResponse
) => {
    const userId = req.query.id as string
    const response = fetchResource(userId);
    if (response) res.status(200).json(response);
    if (!response) res.status(404).json({ error: 'Not found' });
}
