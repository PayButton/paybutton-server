import React, { ReactElement, useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { WalletPATCHParameters } from 'utils/validators'
import { XEC_NETWORK_ID, BCH_NETWORK_ID } from 'constants/index'
import Image from 'next/image'
import style from '../Wallet/wallet.module.css'
import style_pb from '../Paybutton/paybutton.module.css'
import EditIcon from 'assets/edit-icon.png'
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
  const [isXECDefaultDisabled, setIsXECDefaultDisabled] = useState(true)
  const [isBCHDefaultDisabled, setIsBCHDefaultDisabled] = useState(true)
  const [error, setError] = useState('')
  const thisWalletAddressIdList = userAddresses.filter(addr => addr.walletId === wallet.id).map(addr => addr.id)

  const [selectedAddressIdList, setSelectedAddressIdList] = useState([] as number[])
  const [disabledAddressList, setDisabledAddressList] = useState([] as AddressWithPaybuttons[]) // WIPCheck

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

  function hasAddressForNetworkId (networkId: number): boolean {
    let ret = false
    if (selectedAddressIdList === undefined) return false
    for (const selectedAddressId of selectedAddressIdList) {
      const address = userAddresses.find((addr) => addr.id === selectedAddressId)
      if (
        address !== undefined &&
        address.networkId === networkId
      ) {
        ret = true
        break
      }
    }
    return ret
  }

  function disableDefaultInputFields (): void {
    if (hasAddressForNetworkId(XEC_NETWORK_ID)) {
      setIsXECDefaultDisabled(false)
    } else {
      setIsXECDefaultDisabled(true)
      const el = document.getElementById('isXECDefault') as HTMLInputElement
      if (el === null) return
      el.checked = false
    }
    if (hasAddressForNetworkId(BCH_NETWORK_ID)) {
      setIsBCHDefaultDisabled(false)
    } else {
      setIsBCHDefaultDisabled(true)
      const el = document.getElementById('isBCHDefault') as HTMLInputElement
      if (el === null) return
      el.checked = false
    }
  }

  const disableLastWalletAddresses = (): void => {
    const disabledAddresses = [] as AddressWithPaybuttons[]
    for (const address of userAddresses) {
      const addressHasWallet = address.walletId !== undefined && address.walletId !== null
      if (addressHasWallet) {
        const addressIsSelected = selectedAddressIdList.includes(address.id)

        if (!addressIsSelected) {
          const otherAddressesOfSameWalletRemaining = userAddresses.filter(otherPb => {
            const otherAddressIsSelected = selectedAddressIdList.includes(otherPb.id)
            return (
              otherPb.walletId === address.walletId &&
              otherPb.id !== address.id &&
              !otherAddressIsSelected
            )
          })
          if (otherAddressesOfSameWalletRemaining.length === 0) {
            disabledAddresses.push(address)
          }
        } else if (selectedAddressIdList.length <= 1) {
          disabledAddresses.push(address)
        }
      }
    }
    setDisabledAddressList(
      disabledAddresses
    )
  }

  useEffect(() => {
    setModal(false)
    reset()
  }, [wallet, userAddresses])

  useEffect(() => {
    disableDefaultInputFields()
    disableLastWalletAddresses()
  }, [selectedAddressIdList])

  useEffect(() => {
    setSelectedAddressIdList(thisWalletAddressIdList)
    disableLastWalletAddresses()
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
                          defaultChecked={addr.walletId === wallet.id}
                          disabled={
                            disabledAddressList.map(addr => addr.id).includes(addr.id)
                          }
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
                        disabled={ isXECDefaultDisabled }
                      />
                      <label htmlFor='xec-default' className={style.makedefault_margin}>Make Default XEC Wallet</label>
                    </div>
                    <div className={style.input_field}>
                      <input
                        {...register('isBCHDefault')}
                        defaultChecked={wallet.userProfile?.isBCHDefault === true}
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
