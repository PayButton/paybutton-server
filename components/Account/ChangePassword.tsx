import React, { ReactElement, useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { ChangePasswordPOSTParameters } from 'utils/validators'
import style from './account.module.css'

interface IProps {
  toggleChangePassword: () => void;
}

export default function ChangePassword ({ toggleChangePassword }: IProps): ReactElement {
  const { register, handleSubmit, reset, watch } = useForm<ChangePasswordPOSTParameters>()
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [disabled, setDisabled] = useState(true)

  const onSubmit = async (values: ChangePasswordPOSTParameters): Promise<void> => {
    setDisabled(true)
    const res = await fetch('/api/user/password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(values)
    })
    const json = await res.json()
    if (res.status === 200) {
      reset()
      setError('')
      setSuccess('Password changed successfully')
      setTimeout(() => {
        toggleChangePassword()
        setSuccess('')
      }, 1500)
    } else {
      setSuccess('')
      reset({ oldPassword: '' })
      setError(json.message)
    }
    setDisabled(false)
  }

  const noEmptyValues = (value: ChangePasswordPOSTParameters): boolean => {
    return (
      value.oldPassword !== '' &&
      value.newPassword !== '' &&
      value.newPasswordConfirmed !== ''
    )
  }

  const newPasswordIsDifferent = (value: ChangePasswordPOSTParameters): boolean => {
    return (
      value.newPassword !== value.oldPassword
    )
  }

  const doPasswordsMatch = (value: ChangePasswordPOSTParameters): boolean => {
    return (
      value.newPassword === value.newPasswordConfirmed ||
      value.newPasswordConfirmed === ''
    )
  }

  useEffect(() => {
    const subscription = watch((value, { name, type }) => {
      if (!doPasswordsMatch(value)) {
        setError('Passwords do not match.')
        setDisabled(true)
      } else if (!newPasswordIsDifferent(value)) {
        setError('New password should not be the same.')
        setDisabled(true)
      } else {
        setError('')
        if (noEmptyValues(value)) {
          setDisabled(false)
        }
      }
    })
    return () => subscription.unsubscribe()
  })

  return (
    <div className={style.changepw_ctn}>
      {success !== '' && <div className={style.success_message}>{success}</div> }
      <form onSubmit={(e) => { void handleSubmit(onSubmit)(e) }} method='post'>
        <label htmlFor='oldPassword'>Old password</label>
        <input {...register('oldPassword')} type='password' id='oldPassword' name='oldPassword' required />

        <label htmlFor='newPassword'>New password</label>
        <input {...register('newPassword')} type='password' id='newPassword' name='newPassword' required />

        <label htmlFor='newPasswordConfirmed'>Confirm new password</label>
        <input {...register('newPasswordConfirmed')} type='password' id='newPasswordConfirmed' name='newPasswordConfirmed' required />
        <div>
          <div className={style.error_message}>
            {error !== '' ? <span>{error}</span> : <span></span>}
          </div>
          <button disabled={disabled} className='button_main' type='submit'>Submit</button>
        </div>
      </form>
    </div>
  )
}
