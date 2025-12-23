import React, { useState, useMemo } from 'react'
import { useTimezoneSelect, allTimezones } from 'react-timezone-select'
import Select from 'react-select'
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

  const { options, parseTimezone } = useTimezoneSelect({ timezones: allTimezones, displayValue: 'UTC' })

  const sortedOptions = useMemo(() => {
    return [...options].sort((a, b) => {
      if (a.offset !== b.offset) return (a.offset ?? 0) - (b.offset ?? 0)
      // secondary sort by timezone name
      return a.value.localeCompare(b.value)
    })
  }, [options])

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

  const customStyles = {
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isFocused === true ? '#669cfe' : '',
      ':hover': {
        backgroundColor: '#669cfe'
      }
    })
  }

  return (
    <>
      <Select
        value={parseTimezone(selectedTimezone)}
        onChange={handleChange}
        isDisabled={false}
        className={style.select_timezone}
        styles={customStyles}
        options={sortedOptions}
      />
      {error !== '' && <span className={style.error_message}>{error}</span>}
      {success !== '' && <span className={style.success_message}>{success}</span>}
    </>
  )
}

export default TimezoneSelector
