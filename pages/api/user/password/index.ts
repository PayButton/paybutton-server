import { setSession } from 'utils/setSession'
import { parseChangePasswordPOSTRequest } from 'utils/validators'
import EmailPassword from 'supertokens-node/recipe/emailpassword'
import supertokensNode from 'supertokens-node'
import { RESPONSE_MESSAGES } from 'constants/index'

export default async (
  req: any,
  res: any
): Promise<void> => {
  await setSession(req, res)
  const values = parseChangePasswordPOSTRequest(req.body)
  if (req.method === 'POST') {
    const session = req.session
    const oldPassword = values.oldPassword
    const newPassword = values.newPassword
    const userId = session.getUserId()
    const userInfo = await supertokensNode.getUser(userId)
    if (userInfo === undefined) {
      throw new Error(RESPONSE_MESSAGES.INVALID_PASSWORD_FORM_400.message)
    }

    // call signin to check that input password is correct
    const isPasswordValid = await EmailPassword.signIn('public', userInfo.emails[0], oldPassword)
    if (isPasswordValid.status === 'WRONG_CREDENTIALS_ERROR') {
      res.status(400).json(RESPONSE_MESSAGES.WRONG_PASSWORD_400)
      return
    }

    const response = await EmailPassword.updateEmailOrPassword({
      recipeUserId: userInfo.loginMethods[0].recipeUserId,
      password: newPassword
    })

    if (response.status === 'OK') {
      res.status(200).json('')
    } else if (response.status === 'PASSWORD_POLICY_VIOLATED_ERROR') {
      res.status(400).json(RESPONSE_MESSAGES.WEAK_NEW_PASSWORD_400)
    } else {
      res.status(500).json(response.status)
    }
  }
}
