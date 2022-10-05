import React, { ReactElement, useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { paybuttonPOSTParameters } from 'utils/validators'
import Image from 'next/image'
import style from './paybutton.module.css'
import Plus from 'assets/plus.png'

interface IProps {
  onSubmit: Function
  paybuttons: []
  error: String
}

export default function PaybuttonForm ({ onSubmit, paybuttons, error }: IProps): ReactElement {
  const { register, handleSubmit, reset } = useForm<paybuttonPOSTParameters>()
  const [modal, setModal] = useState(false)
  const [multipleAddresses, setMultipleAddresses] = useState(false)

  useEffect(() => {
    setModal(false)
    reset()
  }, [paybuttons])

  return (
    <>
      <div className={style.create_button_ctn}>
        <div className={style.create_button} onClick={() => setModal(true)}>
          <Image src={Plus} alt='arrow' width={30} height={30} />
          <div className={style.tooltiptext}>New button</div>
        </div>
      </div>

  {modal
    ? (<div className={style.form_ctn_outer}>
          <div className={style.form_ctn_inner}>
            <h4>Create Button</h4>
            <div className={style.form_ctn}>
              <form onSubmit={handleSubmit(onSubmit)} method='post'>
                <label htmlFor='name'>Name</label>
                <input {...register('name')} type='text' id='name' name='name' required />

                {/* <label htmlFor='buttonData'>Button Data</label> <br />
                <textarea {...register('buttonData')} id='buttonData' name='buttonData' />
                <br /> */}

                <label className={style.labelMargin} htmlFor='addresses'>
                  Address{multipleAddresses && 'es'}
                  <div className={style.multiple_address} onClick={() => setMultipleAddresses(!multipleAddresses)}>
                    {multipleAddresses ? 'Single Address' : 'Multiple Addresses'}
                  </div>
                </label>
                {multipleAddresses
                  ? <textarea {...register('addresses')} id='addresses' name='addresses' required />
                  : <input {...register('addresses')} id='addresses' name='addresses' required />
                }
                {multipleAddresses &&
                <div className={style.tip}>Place each address on a seperate line. No commas or spaces needed</div>
                }
                <div className={style.btn_row}>
                  {error !== '' && <div className={style.error_message}>{error}</div>}
                  <button type='submit'>Submit</button>
                  <button onClick={() => { setModal(false); reset() }} className={style.cancel_btn}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        </div>)
    : null}
    </>
  )
}
