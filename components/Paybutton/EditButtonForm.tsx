import React, { ReactElement, useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { paybuttonPOSTParameters } from 'utils/validators'
import Image from 'next/image'
import style from '../Paybutton/paybutton.module.css'
import s from '../Wallet/wallet.module.css'
import EditIcon from 'assets/edit-icon.png'
import TrashIcon from 'assets/trash-icon.png'

interface IProps {
  onSubmit: Function
  paybutton: {}
  error: String
  editname: boolean
}

export default function EditButtonForm ({ onSubmit, paybutton, error }: IProps): ReactElement {
  const { register, handleSubmit, reset } = useForm<paybuttonPOSTParameters>()
  const [modal, setModal] = useState(false)
  const [buttonname, setButtonName] = useState(paybutton.name)
  const [deletemodal, setDeleteModal] = useState(false)

  useEffect(() => {
    setModal(false)
    reset()
  }, [paybutton])

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
              <form onSubmit={handleSubmit(onSubmit)} method='post'>
                <label htmlFor='name'>Button Name</label>
                <input {...register('name')} type='text' id='name' name='name' required placeholder={paybutton.name} value={buttonname} onChange={(e) => setButtonName(e.target.value)} />
                <div className={style.btn_row2}>
                  {(error === undefined) ? null : <div className={style.error_message}>{error}</div>}
                  <button onClick={() => { setModal(false); reset(); setButtonName(paybutton.name); setDeleteModal(true) }} className={style.delete_btn}>Delete Button<div> <Image src={TrashIcon} alt='delete' /></div></button>
                  <div>
                    <button type='submit'>Submit</button>
                    <button onClick={() => { setModal(false); reset(); setButtonName(paybutton.name) }} className={style.cancel_btn}>Cancel</button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>)
    : null}

{deletemodal
  ? (
        <div className={style.form_ctn_outer}>
          <div className={style.form_ctn_inner}>
            <h4>Delete {paybutton.name}?</h4>
            <div className={`${style.form_ctn} ${style.delete_button_form_ctn}`}>
              <form onSubmit={handleSubmit(onSubmit)} method='post'>
                <label htmlFor='name'>Are you sure you want to delete {paybutton.name}?<br />This action cannot be undone.</label>
                <div className={style.btn_row}>
                  <div>
                    <button type='submit' className={style.delete_confirm_btn}>Yes, Delete This Button</button>
                    <button onClick={() => { setDeleteModal(false); reset(); setModal(true) }} className={style.cancel_btn}>Cancel</button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>)
  : null}
    </>
  )
}
