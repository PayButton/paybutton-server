import React, { ReactElement, useState } from 'react'
import { useForm } from 'react-hook-form'
import style from './account.module.css'
import { SUPPORTED_QUOTES, SUPPORTED_QUOTES_FROM_ID, SupportedQuotesType } from 'constants/index'
import { UserProfile } from '@prisma/client'
import { UpdatePreferredCurrencyPUTParameters } from 'utils/validators'

interface IProps {
  userProfile: UserProfile
}

export default function ChangeFiatCurrency ({ userProfile }: IProps): ReactElement {
  const preferredCurrency = SUPPORTED_QUOTES_FROM_ID[userProfile.preferredCurrencyId]
  const [currency, setCurrency] = useState(preferredCurrency)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const { register, handleSubmit } = useForm<UpdatePreferredCurrencyPUTParameters>()

  const onChangeCurrency = async (): Promise<void> => {
    try {
      const res = await fetch('/api/user/preferredCurrency', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ currency })
      })
      if (res.status === 200) {
        setError('')
        setSuccess('Updated currency successfully')
      }
    } catch (err: any) {
      setSuccess('')
      setError(err.response.data.message)
    } finally {
      setTimeout(() => {
        setSuccess('')
        setError('')
      }, 3000)
    }
  }

  return (
    <div className={style.changeCurrency_ctn}>
      <form
        onSubmit={(e) => { void handleSubmit(onChangeCurrency)(e) } }
        method="put"
      >
      <select
        id='currency'
        required
        value={currency}
        {...register('currencyId')}
        onChange={(event: React.ChangeEvent<HTMLSelectElement>) => setCurrency(event.target.value as SupportedQuotesType)}
      >
        <option value=''>Select currency</option>
        {SUPPORTED_QUOTES.map((currency: SupportedQuotesType) => (
          <option key={currency} value={currency}>
            {currency}
          </option>
        ))}
      </select>
      </form>
      {error !== '' ?? <p> {error} </p>}
      {success !== '' ?? <p> {success} </p>}
    </div>
  )
}
