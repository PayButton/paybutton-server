import React, { ReactElement, useState, useEffect } from 'react'
import style from './account.module.css'
import { SUPPORTED_QUOTES, SUPPORTED_QUOTES_FROM_ID, SupportedQuotesType, QUOTE_IDS } from 'constants/index'

interface IProps {
  preferredCurrencyId: number
}

export default function ChangeFiatCurrency ({ preferredCurrencyId }: IProps): ReactElement {
  const preferredCurrency = SUPPORTED_QUOTES_FROM_ID[preferredCurrencyId]
  const [currency, setCurrency] = useState(preferredCurrency)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const onChangeCurrency = async (currencyId: number): Promise<void> => {
    try {
      const res = await fetch('/api/user', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ currencyId })
      })
      if (res.status === 200) {
        setError('')
        setSuccess('Updated currency successfully.')
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

  useEffect(() => {
    const currencyId = QUOTE_IDS[currency.toUpperCase()]
    void onChangeCurrency(currencyId)
  }, [currency])

  return (
    <div className={style.changeCurrency_ctn}>
      <select
        id='currency'
        required
        value={currency}
        onChange={(event: React.ChangeEvent<HTMLSelectElement>) => setCurrency(event.target.value as SupportedQuotesType)}
      >
        <option value=''>Select currency</option>
        {SUPPORTED_QUOTES.map((currency: SupportedQuotesType) => (
          <option key={currency} value={currency}>
            {currency.toUpperCase()}
          </option>
        ))}
      </select>
      {error !== '' && <p className={style.error_message}> {error} </p>}
      {success !== '' && <p className={style.success_message}> {success} </p>}
    </div>
  )
}
