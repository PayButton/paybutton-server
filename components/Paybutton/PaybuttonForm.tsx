import React, { ReactElement } from 'react'
import { useForm } from 'react-hook-form'
import { POSTParameters } from 'utils/validators'

interface IProps {
  onSubmit: Function
}

export default function PaybuttonForm ({ onSubmit }: IProps): ReactElement {
  const { register, handleSubmit } = useForm<POSTParameters>()

  return (
    <form onSubmit={handleSubmit(onSubmit)} method='post'>
      <label htmlFor='name'>Name</label>
      <input {...register('name')} type='text' id='name' name='name' required />
      <br />

      <label htmlFor='buttonData'>Button Data</label>
      <textarea {...register('buttonData')} id='buttonData' name='buttonData' />
      <br />

      <label htmlFor='addresses'>Addresses</label>
      <textarea {...register('addresses')} id='addresses' name='addresses' required />
      <br />

      <label htmlFor='userId'>userId</label>
      <textarea {...register('userId')} id='userId' name='userId' required />

      <button type='submit'>Submit</button>
    </form>
  )
}
