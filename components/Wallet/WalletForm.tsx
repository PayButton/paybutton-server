import React, { ReactElement, useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { WalletPOSTParameters } from 'utils/validators'
import { AddressWithPaybuttons } from 'services/addressService'
import { Address } from '@prisma/client'
import { XEC_NETWORK_ID, BCH_NETWORK_ID } from 'constants/index'
import Image from 'next/image'
import style from '../Wallet/wallet.module.css'
import style_pb from 'components/Paybutton/paybutton.module.css'
import Plus from 'assets/plus.png'
import axios from 'axios'
import { appInfo } from 'config/appInfo'

interface IProps {
  userAddresses: AddressWithPaybuttons[]
  refreshWalletList: Function
  userId: string
}

export default function WalletForm ({ userAddresses, refreshWalletList, userId }: IProps): ReactElement {
  const { register, handleSubmit, reset } = useForm<WalletPOSTParameters>()
  const [modal, setModal] = useState(false)
  const [isXECDefaultDisabled, setIsXECDefaultDisabled] = useState(true)
  const [isBCHDefaultDisabled, setIsBCHDefaultDisabled] = useState(true)
  const [error, setError] = useState('')
  const [selectedAddressIdList, setSelectedAddressIdList] = useState([] as number[])
  const [disabledAddressList, setDisabledAddressList] = useState([] as Address[])

  async function onSubmit (params: WalletPOSTParameters): Promise<void> {
    params.userId = userId
    params.addressIdList = selectedAddressIdList
    try {
      void await axios.post(`${appInfo.websiteDomain}/api/wallet`, params)
      refreshWalletList()
      setError('')
    } catch (err: any) {
      setError(err.response.data.message)
    }
  }

  const disableLastWalletAddresses = (): void => {
    let disabledAddresses = [] as Address[]
    for (const address of userAddresses) {

      const addressHasWallet = address.walletId !== undefined && address.walletId !== null
      if (addressHasWallet) {

        const addressIsSelected = selectedAddressIdList.includes(address.id)
        if (!addressIsSelected) {

          const otherAddressesOfSameWalletRemaining = userAddresses.filter(otherAddr => {
            const otherAddressIsSelected = selectedAddressIdList.includes(otherAddr.id)
            return (
              otherAddr.walletId === address.walletId
              && otherAddr.id !== address.id
              && !otherAddressIsSelected
            )
          })

          if (otherAddressesOfSameWalletRemaining.length === 0) {
            disabledAddresses.push(address)
          }
        }
      }
    }
    setDisabledAddressList(
      disabledAddresses
    )
  }

  function handleSelectedAddressesChange(checked: boolean, addressId: number): void {
    const paybuttonIsSelected = selectedAddressIdList.includes(addressId)
    if (paybuttonIsSelected && checked === false) {
      setSelectedAddressIdList(
        selectedAddressIdList.filter(id => id !== addressId)
      )
    }
    if (!paybuttonIsSelected && checked === true) {
      setSelectedAddressIdList(
        [...selectedAddressIdList, addressId]
      )
    }
  }

  function hasAddressForNetworkId(networkId: number): boolean {
    let ret = false
    if (selectedAddressIdList === undefined) return false
    for (const selectedAddressId of selectedAddressIdList) {
      let address = userAddresses.find((addr) => addr.id === selectedAddressId)
      if (
        address !== undefined
        && address.networkId === networkId
      ) {
        ret = true
        break
      }
    }
    return ret
  }

  function disableDefaultInputFields(): void {
    if (hasAddressForNetworkId(XEC_NETWORK_ID)) {
      setIsXECDefaultDisabled(false);
    } else {
      setIsXECDefaultDisabled(true);
      let el = document.getElementById("isXECDefault") as HTMLInputElement
      if (el === null) return
      el.checked = false
    }
    if (hasAddressForNetworkId(BCH_NETWORK_ID)) {
      setIsBCHDefaultDisabled(false);
    } else {
      setIsBCHDefaultDisabled(true);
      let el = document.getElementById("isBCHDefault") as HTMLInputElement
      if (el === null) return
      el.checked = false
    }
  }
  useEffect(() => {
    disableDefaultInputFields()
    disableLastWalletAddresses()
  }, [selectedAddressIdList])

  useEffect(() => {
    setModal(false)
    reset()
  }, [userAddresses])

  useEffect(() => {
    setSelectedAddressIdList([])
    disableLastWalletAddresses()
  }, [modal])

  return (
    <>
      <div className={style_pb.create_button_ctn}>
        <div className={style_pb.create_button} onClick={() => setModal(true)}>
          <Image src={Plus} alt='arrow' width={30} height={30} />
          <div className={style_pb.tooltiptext}>New Wallet</div>
        </div>
      </div>

      {modal
        ? (
          <div className={style_pb.form_ctn_outer}>
            <div className={style_pb.form_ctn_inner}>
              <h4>Create New Wallet</h4>
              <div className={style_pb.form_ctn}>
                <p>Wallets must have a unique name and contain at least one address. Each address can only be linked to one wallet at a time.</p>
                <form onSubmit={handleSubmit(onSubmit)} method='post'>
                  <label htmlFor='name'>Wallet Name</label>
                  <input
                    {...register('name')}
                    type='text'
                    id='name'
                    name='name'
                  />

                  <h4>Addresses</h4>
                  <div className={style.buttonlist_ctn}>
                    {userAddresses.map((addr, index) => (
                      <div className={style.input_field} key={`create-addr-${addr.id}`}>
                        <input
                          type='checkbox'
                          value={addr.id}
                          id={`addressIdList.${index}`}
                          disabled={
                            disabledAddressList.map(addr => addr.id).includes(addr.id)
                          }
                          onChange={ (e) => handleSelectedAddressesChange(e.target.checked, addr.id) }
                        />
                        <label htmlFor={`addressIdList.${index}`}>
                            <b>{addr.address}</b>
                          {addr.paybuttons.map((conn) => (
                            <div>{conn.paybutton.name}</div>
                          ))}
                        </label>
                      </div>
                    ))}
                  </div>
                  <div className={style.makedefault_ctn} key={'wallet-create'}>
                    <div className={style.input_field}>
                      <input
                        {...register('isXECDefault')}
                        type="checkbox"
                        id='isXECDefault'
                        disabled={ isXECDefaultDisabled }
                      />
                      <label htmlFor='xec-default' className={style.makedefault_margin}>Make Default XEC Wallet</label>
                    </div>
                    <div className={style.input_field}>
                      <input
                        {...register('isBCHDefault')}
                        type="checkbox"
                        id='isBCHDefault'
                        disabled={ isBCHDefaultDisabled }
                      />
                      <label htmlFor='bch-default' className={style.makedefault_margin}>Make Default BCH Wallet</label>
                    </div>
                  </div>

                  <div className={style_pb.btn_row}>
                    {error !== '' && <div className={style_pb.error_message}>{error}</div>}
                    <button type='submit'>Submit</button>
                    <button onClick={() => { setModal(false); reset() }} className={style_pb.cancel_btn}>Cancel</button>
                  </div>
                </form>
              </div>
            </div>
          </div>)
          : null}
    </>
  )
}
