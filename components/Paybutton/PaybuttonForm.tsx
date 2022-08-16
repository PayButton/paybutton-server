import styled from '@emotion/styled/types/base'
import React, { ReactElement } from 'react'
import { useForm } from 'react-hook-form'
import { POSTParameters } from 'utils/validators'
import Image from 'next/image'
import style from './paybutton.module.css'
import Plus from 'assets/plus.png'

interface IProps {
  onSubmit: Function
}

export default function PaybuttonForm ({ onSubmit }: IProps): ReactElement {
  const { register, handleSubmit } = useForm<POSTParameters>()

  return (
    <div className={style.create_button_ctn}>
      <div className={style.create_button}>
        <Image src={Plus} alt='arrow' width={30} height={30} />
        <div className={style.tooltiptext}>New button</div>
      </div>
    </div>
    // <form onSubmit={handleSubmit(onSubmit)} method='post'>
    //   <label htmlFor='name'>Name</label> <br />
    //   <input {...register('name')} type='text' id='name' name='name' required />
    //   <br />

    //   <label htmlFor='buttonData'>Button Data</label> <br />
    //   <textarea {...register('buttonData')} id='buttonData' name='buttonData' />
    //   <br />

    //   <label htmlFor='addresses'>Addresses</label> <br />
    //   <textarea {...register('addresses')} id='addresses' name='addresses' required />
    //   <br />

    //   <button type='submit'>Submit</button>
    // </form>
  )
}
