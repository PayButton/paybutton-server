import React, { ReactElement, useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { PaybuttonPOSTParameters } from 'utils/validators'
import { WalletWithAddressesWithPaybuttons } from 'services/walletService'
import Image from 'next/image'
import style from './paybutton.module.css'
import Plus from 'assets/plus.png'

interface IProps {
  onSubmit: Function
  paybuttons: []
  wallets: WalletWithAddressesWithPaybuttons[]
  error: String
}

export default function PaybuttonForm ({ onSubmit, paybuttons, wallets, error }: IProps): ReactElement {
  const { register, handleSubmit, reset } = useForm<PaybuttonPOSTParameters>()
  const [modal, setModal] = useState(false)

  useEffect(() => {
    setModal(false)
    reset()
  }, [paybuttons])

  let walletOptions = wallets.map((wallet) => {
    return {
      "value": wallet.id,
      "label": wallet.name
    }
  })
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

                <label htmlFor='wallet'>Wallet</label>
                <select {...register('walletId')} required>
                  {walletOptions.map((w) => 
                    <option value={w.value}>
                      {w.label}
                    </option>
                  )}
                </select>


                {/* <label htmlFor='buttonData'>Button Data</label> <br />
                <textarea {...register('buttonData')} id='buttonData' name='buttonData' />
                <br /> */}

                <label className={style.labelMargin} htmlFor='addresses'>
                  Addresses
                </label>
                  <textarea {...register('addresses')} id='addresses' name='addresses' required />
                <div className={style.tip}>Place each address on a separate line. No commas or spaces needed</div>
                <div className={style.btn_row}>
                  {error !== '' && <div className={style.error_message}>{error}</div>}
                  <button type='submit' className='button_main'>Submit</button>
                  <button onClick={() => { setModal(false); reset() }} className='button_outline'>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        </div>)
    : null}
    </>
  )
}
