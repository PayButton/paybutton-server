import React, { ReactElement, useState } from 'react'
import style from './account.module.css'

interface IProps {
  initialValue: boolean
}

export default function CsvRowCollapsing ({ initialValue }: IProps): ReactElement {
  const [csvRowCollapsing, setCsvRowCollapsing] = useState(initialValue)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const onToggle = async (): Promise<void> => {
    const newValue = !csvRowCollapsing
    setCsvRowCollapsing(newValue)
    try {
      const res = await fetch('/api/user', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ csvRowCollapsing: newValue })
      })
      if (res.status === 200) {
        setError('')
        setSuccess('Updated successfully.')
      }
    } catch (err: any) {
      setSuccess('')
      setError(err.response?.data?.message ?? 'Failed to update setting.')
      setCsvRowCollapsing(!newValue)
    } finally {
      setTimeout(() => {
        setSuccess('')
        setError('')
      }, 3000)
    }
  }

  return (
    <div className={style.csv_collapsing_ctn}>
      <label className={style.toggle_switch}>
        <input
          type="checkbox"
          checked={csvRowCollapsing}
          onChange={() => {
            void onToggle()
          }}
        />
        <span className={style.toggle_slider}></span>
      </label>
      <span className={style.toggle_label}>
        {csvRowCollapsing ? 'Enabled' : 'Disabled'}
      </span>
      {error !== '' && <span className={style.error_message_small}>{error}</span>}
      {success !== '' && (
        <span className={style.success_message_small}>{success}</span>
      )}
    </div>
  )
}
