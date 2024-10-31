import React, { ReactElement, useState } from 'react'
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

  const onChangeCurrency = async (thisCurrency: string): Promise<void> => {
    const oldCurrency = currency
    const currencyId = QUOTE_IDS[thisCurrency.toUpperCase()]
    setCurrency(SUPPORTED_QUOTES_FROM_ID[currencyId])
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
      setCurrency(oldCurrency)
    } finally {
      setTimeout(() => {
        setSuccess('')
        setError('')
      }, 3000)
    }
  }

  return (<>
    <div className={style.changeCurrency_ctn}>
      <select
        id='currency'
        required
        value={currency}
        onChange={(e) => { void onChangeCurrency(e.target.value) }}
      >
        {SUPPORTED_QUOTES.map((currency: SupportedQuotesType) => (
          <option key={currency} value={currency}>
            {currency.toUpperCase()}
          </option>
        ))}
      </select>
    </div>
    {error !== '' && <span className={style.error_message}> {error} </span>}
    {success !== '' && <span className={style.success_message}> {success} </span>}
    </>)
}
