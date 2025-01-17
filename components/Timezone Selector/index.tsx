import React, { useState } from 'react'
import Select from 'react-timezone-select'
import style from './timezone-selector.module.css'

interface TimezoneSelectorProps {
  value: string
  onChange: (value: string) => void
  label?: string
  isEditable?: boolean
}

const TimezoneSelector: React.FC<TimezoneSelectorProps> = ({ value }) => {
  const [selectedTimezone, setSelectedTimezone] = useState(value !== '' ? value : '')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleChange = (selectedOption: any): void => {
    const updateTimezone = async (): Promise<void> => {
      const oldTimezone = selectedTimezone
      try {
        const res = await fetch('/api/user/timezone', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ timezone: selectedOption.value })
        })
        if (res.status === 200) {
          setSelectedTimezone(selectedOption.value)
          setError('')
          setSuccess('Timezone updated successfully.')
        } else {
          setSuccess('')
          setError('Failed to update timezone.')
          setSelectedTimezone(oldTimezone)
        }
      } catch (err: any) {
        setSuccess('')
        setError('Failed to update timezone.')
        setSelectedTimezone(oldTimezone)
      } finally {
        setTimeout(() => {
          setSuccess('')
          setError('')
        }, 3000)
      }
    }

    void updateTimezone()
  }

  return (
    <>
      <Select
        value={selectedTimezone}
        onChange={handleChange}
        disabled={false}
        className={style.select_timezone}
        displayValue="UTC"
      />
      {error !== '' && <span className={style.error_message}>{error}</span>}
      {success !== '' && <span className={style.success_message}>{success}</span>}
    </>
  )
}

export default TimezoneSelector
