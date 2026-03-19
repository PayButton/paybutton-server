import React, { ReactElement, useState } from 'react'
import style from './account.module.css'
import { DEFAULT_CSV_COLLAPSE_THRESHOLD } from 'constants/index'

interface IProps {
  csvCollapseThreshold: number
}

export default function ChangeCsvCollapseThreshold ({ csvCollapseThreshold }: IProps): ReactElement {
  const [threshold, setThreshold] = useState(csvCollapseThreshold ?? DEFAULT_CSV_COLLAPSE_THRESHOLD)
  const [inputValue, setInputValue] = useState(String(csvCollapseThreshold ?? DEFAULT_CSV_COLLAPSE_THRESHOLD))
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [disabled, setDisabled] = useState(true)

  const onSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    const newThreshold = parseInt(inputValue, 10)
    if (isNaN(newThreshold) || newThreshold < 0) {
      setError('Please enter a valid non-negative number')
      return
    }

    const oldThreshold = threshold
    setThreshold(newThreshold)
    setDisabled(true)

    try {
      const res = await fetch('/api/user/csvCollapseThreshold', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ csvCollapseThreshold: newThreshold })
      })
      if (res.status === 200) {
        setError('')
        setSuccess('Updated successfully.')
        setTimeout(() => {
          setSuccess('')
        }, 3000)
      } else {
        throw new Error('Failed to update threshold')
      }
    } catch (err: any) {
      setSuccess('')
      setError(err.message ?? 'Failed to update threshold')
      setThreshold(oldThreshold)
      setInputValue(String(oldThreshold))
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const value = e.target.value
    setInputValue(value)
    const numValue = parseInt(value, 10)
    if (!isNaN(numValue) && numValue >= 0 && numValue !== threshold) {
      setDisabled(false)
      setError('')
    } else if (numValue === threshold) {
      setDisabled(true)
    } else {
      setDisabled(true)
      if (value !== '') {
        setError('Please enter a valid non-negative number')
      }
    }
  }

  return (
    <div className={style.threshold_ctn}>
      <form onSubmit={(e) => { void onSubmit(e) }}>
        <div className={style.threshold_row}>
          <input
            id="csvCollapseThreshold"
            type="text"
            min="0"
            required
            value={inputValue}
            onChange={handleInputChange}
            className={style.threshold_input}
          />
          <button disabled={disabled} className='button_main' type='submit'>Update</button>
        </div>
        {error !== '' && <div className={style.error_message}>{error}</div>}
        {success !== '' && <div className={style.success_message}>{success}</div>}
      </form>
    </div>
  )
}
