import React, { ReactElement, useState } from 'react'
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
  const [modal, setModal] = useState(false)

  // const formSubmit = ({data}) => {
  //   handleSubmit(data)
  //   setModal(false)
  // }

  return (
    <>
      <div className={style.create_button_ctn}>
        <div className={style.create_button} onClick={() => setModal(true)}>
          <Image src={Plus} alt='arrow' width={30} height={30} />
          <div className={style.tooltiptext}>New button</div>
        </div>
      </div>

  {modal
    ? (<div className={style.form_ctn_outer} onClick={() => setModal(false)}>
          <div className={style.form_ctn_inner} onClick={e => e.stopPropagation()}>
            <h4>Create Button</h4>
            <div className={style.form_ctn}>
              <form onSubmit={handleSubmit(onSubmit)} method='post'>
                <label htmlFor='name'>Name</label> <br />
                <input {...register('name')} type='text' id='name' name='name' required />
                <br />

                {/* <label htmlFor='buttonData'>Button Data</label> <br />
                <textarea {...register('buttonData')} id='buttonData' name='buttonData' />
                <br /> */}

                <label htmlFor='addresses'>Addresses</label> <br />
                <textarea {...register('addresses')} id='addresses' name='addresses' required />
                <br />
                <div className={style.btn_row}>
                  <button onClick={() => setModal(false)} className={style.cancel_btn}>Cancel</button>
                  <button type='submit'>Submit</button>
                </div>
              </form>
            </div>
          </div>
        </div>)
    : null}
    </>
  )
}
