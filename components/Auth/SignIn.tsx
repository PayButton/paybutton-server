import { useForm } from 'react-hook-form'
import React, { ReactElement, useState, useEffect } from 'react'
import style from './auth.module.css'
import { emailPasswordSignIn } from 'supertokens-web-js/recipe/thirdpartyemailpassword'

export default function SignIn (): ReactElement {
  const { register, handleSubmit, reset, watch } = useForm<any>()
  const [ error, setError ] = useState('')
  const [ success, setSuccess ] = useState('')
  const [ disabled, setDisabled ] = useState(false)
  const onSubmit = async (values: any): Promise<void> => {
    const email = values.email
    const password = values.password
    //try {
      let response = await emailPasswordSignIn({
        formFields: [{
          id: "email",
          value: email
        }, {
          id: "password",
          value: password
        }]
      })

      if (response.status === "FIELD_ERROR") {
        response.formFields.forEach(formField => {
          if (formField.id === "email") {
            // Email validation failed (for example incorrect email syntax).
            window.alert(formField.error)
          }
        })
      } else if (response.status === "WRONG_CREDENTIALS_ERROR") {
        window.alert("Email password combination is incorrect.")
      } else {
        // sign in successful. The session tokens are automatically handled by
        // the frontend SDK.
        window.location.href = "/homepage"
      }
      /*
    } catch (err: any) {
      if (err.isSuperTokensGeneralError === true) {
        // this may be a custom error message sent from the API by you.
        window.alert(err.message);
      } else {
        window.alert("Oops! Something went wrong.");
      }
    }
       */
  }
  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} method='post'>
        <label htmlFor='email'>Email</label>
        <input {...register('email')} type='email' id='email' name='email' required />

        <label htmlFor='password'>Password</label>
        <input {...register('password')} type='password' id='password' name='password' required />
        <div>
          <div className={style.error_message}>
            {error !== '' ? <span>{error}</span> : <span></span>}
          </div>
          <button  disabled={disabled} type='submit'>Submit</button>
        </div>
      </form>
    </>
  )
}