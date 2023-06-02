import React, { ReactElement, useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { WalletPOSTParameters } from 'utils/validators'
import { AddressWithPaybuttons } from 'services/addressService'
import Image from 'next/image'
import style from '../Wallet/wallet.module.css'
import style_pb from 'components/Paybutton/paybutton.module.css'
import Plus from 'assets/plus.png'
import axios from 'axios'
import { appInfo } from 'config/appInfo'
import { UserNetworksInfo } from 'services/networkService'

interface IProps {
  userAddresses: AddressWithPaybuttons[]
  refreshWalletList: Function
  userId: string
  usedNetworks: UserNetworksInfo[]
}

export default function WalletForm ({ userAddresses, refreshWalletList, userId, usedNetworks }: IProps): ReactElement {
  const { register, handleSubmit, reset } = useForm<WalletPOSTParameters>()
  const [modal, setModal] = useState(false)
  const [error, setError] = useState('')
  const [selectedAddressIdList, setSelectedAddressIdList] = useState([] as string[])

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

  function handleSelectedAddressesChange(checked: boolean, addressId: string): void {
    const addressIsSelected = selectedAddressIdList.includes(addressId)
    if (addressIsSelected && checked === false) {
      setSelectedAddressIdList(
        selectedAddressIdList.filter(id => id !== addressId)
      )
    }
    if (!addressIsSelected && checked === true) {
      setSelectedAddressIdList(
        [...selectedAddressIdList, addressId]
      )
    }
  }

  useEffect(() => {
  }, [selectedAddressIdList])

  useEffect(() => {
    setModal(false)
    reset()
  }, [userAddresses])

  useEffect(() => {
    setSelectedAddressIdList([])
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

                  <h4>Select Buttons</h4>
                  <div className={style.buttonlist_ctn}>
                    {userAddresses.map((addr, index) => (
                      <div className={style.input_field} key={`create-addr-${addr.id}`}>
                        <input
                          type='checkbox'
                          value={addr.id}
                          id={`addressIdList.${index}`}
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
                  <div className={style.makedefault_ctn} key={'wallet-create'}>
                    {usedNetworks.some(network => network.ticker === 'xec') &&
                      <div className={style.input_field}>
                        <input
                          {...register('isXECDefault')}
                          type="checkbox"
                          id='isXECDefault'
                        />
                        <label htmlFor='xec-default' className={style.makedefault_margin}>Default XEC Wallet</label>
                      </div>
                    }
                     {usedNetworks.some(network => network.ticker === 'bch') &&
                    <div className={style.input_field}>
                      <input
                        {...register('isBCHDefault')}
                        type="checkbox"
                        id='isBCHDefault'
                      />
                      <label htmlFor='bch-default' className={style.makedefault_margin}>Default BCH Wallet</label>
                    </div>
                   }
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
