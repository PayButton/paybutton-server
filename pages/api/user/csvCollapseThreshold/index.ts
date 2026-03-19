import { setSession } from 'utils/setSession'
import * as userService from 'services/userService'
import { RESPONSE_MESSAGES } from 'constants/index'

export default async (
  req: any,
  res: any
): Promise<void> => {
  await setSession(req, res, true)

  if (req.method === 'PUT') {
    const session = req.session
    const { csvCollapseThreshold } = req.body

    if (csvCollapseThreshold === undefined || csvCollapseThreshold === null) {
      res.status(400).json({ message: 'csvCollapseThreshold is required' })
      return
    }

    const threshold = Number(csvCollapseThreshold)
    if (isNaN(threshold) || threshold < 0) {
      res.status(400).json({ message: 'csvCollapseThreshold must be a non-negative number' })
      return
    }

    await userService.updateCsvCollapseThreshold(session.userId, threshold)
    res.status(200).json({ success: true })
  } else {
    res.status(RESPONSE_MESSAGES.METHOD_NOT_ALLOWED_405.statusCode)
      .json(RESPONSE_MESSAGES.METHOD_NOT_ALLOWED_405)
  }
}
