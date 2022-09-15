import React, { ReactElement, useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { POSTParameters } from 'utils/validators'
import Image from 'next/image'
import style from '../Paybutton/paybutton.module.css'
import s from '../Wallet/wallet.module.css'
import EditIcon from 'assets/edit-icon.png'

interface IProps {
  onSubmit: Function
  paybuttons: []
  error: String
  editname: boolean
  walletInfo: {}
}

export default function EditWalletForm ({ onSubmit, paybuttons, error, walletInfo }: IProps): ReactElement {
  const { register, handleSubmit, reset } = useForm<POSTParameters>()
  const [modal, setModal] = useState(false)

  useEffect(() => {
    setModal(false)
    reset()
  }, [paybuttons])

  return (
    <>
      <div className={s.edit_button} onClick={() => setModal(true)}>
        <Image src={EditIcon} alt='edit' />
      </div>

  {modal
    ? (
        <div className={style.form_ctn_outer} onClick={() => setModal(false)}>
          <div className={style.form_ctn_inner} onClick={e => e.stopPropagation()}>
            <h4>Edit {walletInfo.name}</h4>
            <div className={style.form_ctn}>
              <form onSubmit={handleSubmit(onSubmit)} method='post'>
                <label htmlFor='name'>Wallet Name</label>
                <input {...register('name')} type='text' id='name' name='name' required placeholder={walletInfo.name} />
                {walletInfo.default_wallet === false && 
                <div className={s.makedefault_ctn}>
                  <input type="checkbox" id="default" name="default" />
                  <label htmlFor='default'>Make Default Wallet</label>
                </div>
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
