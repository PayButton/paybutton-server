import { setSession } from 'utils/setSession'
import { parsePasswordPOSTRequest } from 'utils/validators'
import ThirdPartyEmailPasswordNode from 'supertokens-node/recipe/thirdpartyemailpassword'
import { RESPONSE_MESSAGES } from 'constants/index'

export default async (
  req: any,
  res: any
): Promise<void> => {
  await setSession(req, res)
  const values = parsePasswordPOSTRequest(req.body)
  if (req.method === 'POST') {
    const session = req.session
    const oldPassword = values.oldPassword
    const newPassword = values.newPassword
    const userId = session.getUserId()
    const userInfo = await ThirdPartyEmailPasswordNode.getUserById(userId)
    if (userInfo === undefined) {
      throw new Error(RESPONSE_MESSAGES.INVALID_PASSWORD_FORM_400.message)
    }

    // call signin to check that input password is correct
    const isPasswordValid = await ThirdPartyEmailPasswordNode.emailPasswordSignIn(userInfo.email, oldPassword)
    if (isPasswordValid.status === 'WRONG_CREDENTIALS_ERROR') {
      res.status(400).json(RESPONSE_MESSAGES.WRONG_PASSWORD_400)
      return
    }

    const response = await ThirdPartyEmailPasswordNode.updateEmailOrPassword({
      userId,
      password: newPassword
    })

    if (response.status === 'OK') {
      res.status(200).json('')
    } else {
      res.status(500).json(response.status)
    }
  }
}