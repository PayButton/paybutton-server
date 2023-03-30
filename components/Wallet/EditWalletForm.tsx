import React, { ReactElement, useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { WalletPATCHParameters } from 'utils/validators'
import Image from 'next/image'
import style from '../Wallet/wallet.module.css'
import style_pb from '../Paybutton/paybutton.module.css'
import EditIcon from 'assets/edit-icon.png'
import TrashIcon from 'assets/trash-icon.png'
import { WalletWithAddressesWithPaybuttons } from 'services/walletService'
import { AddressWithPaybuttons } from 'services/addressService'
import axios from 'axios'
import { appInfo } from 'config/appInfo'

interface IProps {
  wallet: WalletWithAddressesWithPaybuttons
  userAddresses: AddressWithPaybuttons[]
  refreshWalletList: Function
}

export default function EditWalletForm ({ wallet, userAddresses, refreshWalletList }: IProps): ReactElement {
  const { register, handleSubmit, reset } = useForm<WalletPATCHParameters>()
  const [modal, setModal] = useState(false)
  const [deleteModal, setDeleteModal] = useState(false)
  const [error, setError] = useState('')
  const thisWalletAddressIdList = wallet.userAddresses.map((addr) => addr.addressId)

  const [selectedAddressIdList, setSelectedAddressIdList] = useState([] as number[])

  async function onSubmit (params: WalletPATCHParameters): Promise<void> {
    params.addressIdList = selectedAddressIdList
    if (params.name === '' || params.name === undefined) {
      params.name = wallet.name
    }
    try {
      void await axios.patch(`${appInfo.websiteDomain}/api/wallet/${wallet.id}`, params)
      refreshWalletList()
      setError('')
    } catch (err: any) {
      setError(err.response.data.message)
    }
  }

  async function onDelete (walletId: string): Promise<void> {
    const res = await axios.delete<WalletWithAddressesWithPaybuttons>(`${appInfo.websiteDomain}/api/wallet/${walletId}`)
    if (res.status === 200) {
      refreshWalletList()
    }
  }

  function handleSelectedAddressesChange (checked: boolean, addressId: number): void {
    if (selectedAddressIdList.includes(addressId) && !checked) {
      setSelectedAddressIdList(
        selectedAddressIdList.filter(id => id !== addressId)
      )
    }
    if (!selectedAddressIdList.includes(addressId) && checked) {
      setSelectedAddressIdList(
        [...selectedAddressIdList, addressId]
      )
    }
  }

  useEffect(() => {
    setModal(false)
    reset()
  }, [wallet, userAddresses])

  useEffect(() => {
  }, [selectedAddressIdList])

  useEffect(() => {
    setSelectedAddressIdList(thisWalletAddressIdList)
  }, [modal])

  return (
    <>
      <div className={style.edit_button} onClick={() => setModal(true)}>
        <Image src={EditIcon} alt='edit' />
      </div>

      {modal
        ? (
          <div className={style_pb.form_ctn_outer}>
            <div className={style_pb.form_ctn_inner}>
              <h4>Edit {wallet.name}</h4>
              <div className={style_pb.form_ctn}>
                <form onSubmit={(e) => { void handleSubmit(onSubmit)(e) }} method='post'>
                  <label htmlFor='name'>Wallet Name</label>
                  <input
                    {...register('name')}
                    type='text'
                    id='name'
                    name='name'
                    placeholder={wallet.name}
                  />
                  <h4>Addresses</h4>
                  <div className={style.buttonlist_ctn}>
                    {userAddresses.map((addr, index) => (
                      <div className={style.input_field} key={`edit-addr-${addr.id}`}>
                        <input
                          type='checkbox'
                          value={addr.id}
                          id={`addressIdList.${index}`}
                          defaultChecked={thisWalletAddressIdList.includes(addr.id)}
                          onChange={ (e) => handleSelectedAddressesChange(e.target.checked, addr.id) }
                        />
                        <label htmlFor={`addressIdList.${index}`}>
                          {addr.paybuttons.map((conn) => (
                            <div className={style.buttonpill}>{conn.paybutton.name}</div>
                          ))}
                          <div className={style.addresslabel}>{addr.address}</div>
                        </label>
                      </div>
                    ))}
                  </div>
                  <hr/>
                  <div className={style.makedefault_ctn} key={`edit-wallet-${wallet.id}`}>
                    <div className={style.input_field}>
                      <input
                        {...register('isXECDefault')}
                        defaultChecked={wallet.userProfile?.isXECDefault === true}
                        type="checkbox"
                        id='isXECDefault'
                        disabled={wallet.userProfile?.isXECDefault === true}
                      />
                      <label htmlFor='xec-default' className={style.makedefault_margin}>Default XEC Wallet</label>
                    </div>
                    <div className={style.input_field}>
                      <input
                        {...register('isBCHDefault')}
                        defaultChecked={wallet.userProfile?.isBCHDefault === true}
                        type="checkbox"
                        id='isBCHDefault'
                        disabled={wallet.userProfile?.isBCHDefault === true}
                      />
                      <label htmlFor='bch-default' className={style.makedefault_margin}>Default BCH Wallet</label>
                    </div>
                  </div>

                  <div className={style_pb.btn_row2}>
                    {error !== '' && <div className={style_pb.error_message}>{error}</div>}
                    {wallet.userProfile === null || (wallet.userProfile.isXECDefault === true || wallet.userProfile.isBCHDefault === true)
                      ? (<div></div>)
                      : (
                      <button onClick={() => { setModal(false); reset(); setDeleteModal(true) }} className={style_pb.delete_btn}>Delete Wallet<div> <Image src={TrashIcon} alt='delete' /></div></button>
                        )}
                    <div>
                      <button type='submit'>Submit</button>
                      <button onClick={() => { setModal(false); reset() }} className={style_pb.cancel_btn}>Cancel</button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>)
        : null}
      {deleteModal
        ? (
          <div className={style_pb.form_ctn_outer}>
            <div className={style_pb.form_ctn_inner}>
              <h4>Delete {wallet.name}?</h4>
              <div className={`${style_pb.form_ctn} ${style_pb.delete_button_form_ctn}`}>
                <label htmlFor='name'>Are you sure you want to delete {wallet.name}?<br />This action cannot be undone.</label>
                <div className={style_pb.btn_row}>
                  <div>

                    <button onClick={() => { void onDelete(wallet.id) }} className={style_pb.delete_confirm_btn}>Yes, Delete This Wallet</button>
                    <button onClick={() => { setDeleteModal(false); reset(); setModal(true) }} className={style_pb.cancel_btn}>Cancel</button>
                  </div>
                </div>
              </div>
            </div>
          </div>)
        : null}
    </>
  )
}
