import { NextApiResponse, NextApiRequest } from "next/types"
import { PayButton } from "types"

const fetchResource = (payButtonId: string): PayButton => {
    const id = payButtonId || "test-id"
    const temp_addresses = ['ecash:qpz274aaj98xxnnkus8hzv367za28j900c7tv5v8pc', 'bitcoincash:qrw5fzqlxzf639m8s7fq7wn33as7nfw9wg9zphxlxe']
    return { 
		userId: btoa(payButtonId + Math.random()).slice(10,20),
		id,
		addresses: temp_addresses
    }
}

export default (
    req: NextApiRequest,
    res: NextApiResponse
) => {
    const payButtonId = req.query.id as string
    const response = fetchResource(payButtonId);
    if (response && payButtonId) res.status(200).json(response)
    if (!response) res.status(404).json({ error: 'Not found' });
}
