import React, { ReactElement, useState, useEffect } from 'react'
import { PaybuttonWithAddresses } from 'services/paybuttonService'
import { useForm } from 'react-hook-form'
import { PaybuttonPOSTParameters, PaybuttonPATCHParameters } from 'utils/validators'
import Image from 'next/image'
import style from '../Paybutton/paybutton.module.css'
import s from '../Wallet/wallet.module.css'
import EditIcon from 'assets/edit-icon.png'
import TrashIcon from 'assets/trash-icon.png'
import axios from 'axios'
import Router from 'next/router'
import config from 'config'

interface IProps {
  paybutton: PaybuttonWithAddresses
  refreshPaybutton: Function
}

export default function EditButtonForm ({ paybutton, refreshPaybutton }: IProps): ReactElement {
  const { register, handleSubmit, reset } = useForm<PaybuttonPOSTParameters>()
  const [modal, setModal] = useState(false)
  const [deleteModal, setDeleteModal] = useState(false)
  const [error, setError] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [name, setName] = useState(paybutton.name)
  const [url, setURL] = useState(paybutton.url)
  const [description, setDescription] = useState(paybutton.description)
  const [addresses, setAddresses] = useState(paybutton.addresses.map((conn) => conn.address.address).join('\n'))

  useEffect(() => {
    setModal(false)
    setURL(paybutton.url)
    reset()
  }, [paybutton])

  useEffect(() => {
    setError('')
  }, [modal])

  async function onSubmit (params: PaybuttonPATCHParameters): Promise<void> {
    if (params.name === '' || params.name === undefined) {
      params.name = paybutton.name
    }
    try {
      void await axios.patch(`/api/paybutton/${paybutton.id}`, params)
      refreshPaybutton()
    } catch (err: any) {
      setError(err.response.data.message)
    }
  }

  async function onDelete (paybuttonId: string): Promise<void> {
    try {
      const res = await axios.delete<PaybuttonWithAddresses>(`/api/paybutton/${paybuttonId}`)
      if (res.status === 200) {
        void Router.push(`${config.websiteDomain}/buttons/`)
      }
    } catch (err: any) {
      setDeleteError(err.response.data.message)
    }
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
                <label htmlFor='name'>Name*</label>
                <input {...register('name')} type='text' id='name' name='name' placeholder={paybutton.name} value={name} onChange={(e) => setName(e.target.value)} />
                <label className={style.labelMargin} htmlFor='addresses'>
                  Addresses*
                </label>
                  <textarea {...register('addresses')} id='addresses' name='addresses' placeholder={paybutton.addresses.map((conn) => conn.address.address).join('\n')} value={addresses} onChange={(e) => setAddresses(e.target.value)} />
                <div className={style.tip}>Place each address on a separate line. No commas or spaces needed</div>
                <label htmlFor='url'>Website</label>
                <input {...register('url')} type='text' id='url' name='url' placeholder={paybutton.url} value={url} onChange={(e) => setURL(e.target.value)}/>
                <label htmlFor='description'>Description</label>
                <textarea {...register('description')} id='description' name='description' placeholder={paybutton.description} value={description} onChange={(e) => setDescription(e.target.value)}/>
                <div className={style.btn_row2}>
                  {(error === undefined || error === '') ? null : <div className={style.error_message}>{error}</div>}
                  <button onClick={() => { setModal(false); reset(); setDeleteModal(true) }} className={style.delete_btn}>Delete Button<div> <Image src={TrashIcon} alt='delete' /></div></button>
                  <div>
      <button type='submit' className='button_main'>Submit</button>
                    <button onClick={() => { setModal(false); reset() }} className='button_outline'>Cancel</button>
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
                  {(deleteError === undefined || deleteError === '') ? null : <div className={style.error_message}>{deleteError}</div>}
                  <div>

                    <button onClick={() => { void onDelete(paybutton.id) }} className={style.delete_confirm_btn}>Yes, Delete This Button</button>
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
