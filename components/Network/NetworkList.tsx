import React, { FunctionComponent, useState } from 'react'
import {
  NetworkWithConnectionInfo,
  UserNetworksInfo
} from 'services/networkService'
import style from './network.module.css'
import moment from 'moment'

interface IProps {
  networks: NetworkWithConnectionInfo[]
  userNetworks: UserNetworksInfo[]
}

const NetworkComponent: FunctionComponent<IProps> = ({
  networks,
  userNetworks
}) => {
  const [show, setShow] = useState(false)

  return (
    <div className={style.network_ctn}>
      {networks.map((network) => {
        return (
          <div
            key={network.id}
            className={style.card_wrapper}

            style={
              (userNetworks.some((n) => n.ticker === network.ticker) || userNetworks.length === 0)
                ? {}
                : show ? { order: '2', display: 'inline-block' } : { order: '2', display: 'none' }}
          >
            <div className={style.network_card_text}>
              <div className={style.cardTitle}>{network.title}</div>
              {
                network.connected
                  ? (
                    <>
                      {
                      network.maintenance
                        ? <div className={style.cardStatus}>Under Maintenance</div>
                        : <div
                        className={style.cardStatus}
                        style={{ color: '#04b504' }}
                      >
                        Connected
                      </div>
                      }
                      <div>
                        Last block:{' '}
                        {network.lastBlockTimestamp !== undefined
                          ? moment.unix(network.lastBlockTimestamp).fromNow()
                          : '-'}
                      </div>
                    </>
                    )
                  : (
                      network.maintenance
                        ? <div className={style.cardStatus}>Under Maintenance</div>
                        : <div className={style.cardStatus}>Disconnected</div>
                    )
              }
            </div>
          </div>
        )
      })}
      {userNetworks.length < 2 && userNetworks.length !== 0 &&
        <div
          className={`${style.showNetworksCtn} button_outline`}
          onClick={() => setShow(!show)}
        >
          {!show ? 'Show Other Networks' : 'Hide Other Networks'}
        </div>
      }
    </div>
  )
}

export default NetworkComponent
