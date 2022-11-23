import React, { ReactElement, useState, useEffect } from 'react'
import { PaybuttonWithAddresses } from 'services/paybuttonService'
import { useForm } from 'react-hook-form'
import { paybuttonPOSTParameters, paybuttonPATCHParameters } from 'utils/validators'
import Image from 'next/image'
import style from '../Paybutton/paybutton.module.css'
import s from '../Wallet/wallet.module.css'
import EditIcon from 'assets/edit-icon.png'
import TrashIcon from 'assets/trash-icon.png'
import axios from 'axios'
import { appInfo } from 'config/appInfo'

interface IProps {
  onDelete: Function
  paybutton: PaybuttonWithAddresses
  refreshPaybutton: Function
  error: String
  editname: boolean
}

export default function EditButtonForm ({ paybutton, error, onDelete, refreshPaybutton }: IProps): ReactElement {
  const { register, handleSubmit, reset } = useForm<paybuttonPOSTParameters>()
  const [modal, setModal] = useState(false)
  const [deleteModal, setDeleteModal] = useState(false)
  const [multipleAddresses, setMultipleAddresses] = useState(false)

  useEffect(() => {
    setModal(false)
    reset()
  }, [paybutton])

  async function onSubmit (params: paybuttonPATCHParameters): Promise<void> {
    if (params.name === '' || params.name === undefined) {
      params.name = paybutton.name
    }
    void await axios.patch(`${appInfo.websiteDomain}/api/paybutton/${paybutton.id}`, params)
    refreshPaybutton()
  }

  return (
    <>
      <div className={s.edit_button} onClick={() => setModal(true)}>
        <Image src={EditIcon} alt='edit' />
      </div>

  {modal
    ? (
        <div className={style.form_ctn_outer}>
          <div className={style.form_ctn_inner}>
            <h4>Edit {paybutton.name}</h4>
            <div className={style.form_ctn}>
              <form onSubmit={(e) => { void handleSubmit(onSubmit)(e) }} method='post'>
                <label htmlFor='name'>Button Name</label>
                <input {...register('name')} type='text' id='name' name='name' placeholder={paybutton.name}/>
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
                <div className={style.btn_row2}>
                  {(error === undefined) ? null : <div className={style.error_message}>{error}</div>}
                  <button onClick={() => { setModal(false); reset(); setDeleteModal(true) }} className={style.delete_btn}>Delete Button<div> <Image src={TrashIcon} alt='delete' /></div></button>
                  <div>
                    <button type='submit'>Submit</button>
                    <button onClick={() => { setModal(false); reset() }} className={style.cancel_btn}>Cancel</button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>)
    : null}

{deleteModal
  ? (
        <div className={style.form_ctn_outer}>
          <div className={style.form_ctn_inner}>
            <h4>Delete {paybutton.name}?</h4>
            <div className={`${style.form_ctn} ${style.delete_button_form_ctn}`}>
                <label htmlFor='name'>Are you sure you want to delete {paybutton.name}?<br />This action cannot be undone.</label>
                <div className={style.btn_row}>
                  <div>

                    <button onClick={() => { onDelete(paybutton.id) }} className={style.delete_confirm_btn}>Yes, Delete This Button</button>
                    <button onClick={() => { setDeleteModal(false); reset(); setModal(true) }} className={style.cancel_btn}>Cancel</button>
                  </div>
                </div>
            </div>
          </div>
        </div>)
  : null}
    </>
  )
}
