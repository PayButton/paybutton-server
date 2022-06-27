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
      <label htmlFor='name'>Name</label> <br />
      <input {...register('name')} type='text' id='name' name='name' required />
      <br />

      <label htmlFor='buttonData'>Button Data</label> <br />
      <textarea {...register('buttonData')} id='buttonData' name='buttonData' />
      <br />

      <label htmlFor='addresses'>Addresses</label> <br />
      <textarea {...register('addresses')} id='addresses' name='addresses' required />
      <br />

      <label htmlFor='userId'>userId</label> <br />
      <input {...register('userId')} type='text' id='userId' name='userId' required />

      <br />
      <button type='submit'>Submit</button>
    </form>
  )
}
