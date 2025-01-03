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

  const handleChange = (selectedOption: any): void => {
    const updateTimezone = async (): Promise<void> => {
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
        }
      } catch (err: any) {
        console.log(err.response.data.message)
      }
    }

    void updateTimezone()
  }

  return (
    <div className={style.timezone_selector}>
      <Select
        value={selectedTimezone}
        onChange={handleChange}
        disabled={false}
        className={style.select_timezone}
        displayValue="UTC"
      />
    </div>
  )
}

export default TimezoneSelector
