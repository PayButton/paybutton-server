import React, { FunctionComponent } from 'react'
import { NetworkWithConnectionInfo } from 'services/networkService'
import style from './network.module.css'

interface IProps { networks: NetworkWithConnectionInfo[] }
export default ({ networks }: IProps): FunctionComponent<IProps> => {
  return (
    <div className={style.network_ctn}>
      {networks.map(network => (
        <div key={network.id} className={style.card_wrapper}>
            <div className={style.network_card_text}>
              <div className={style.cardTitle}>{network.title}</div>
                {network.connected
                  ? <>
                    <div className={style.cardStatus} style={{ color: '#04b504' }}>Connected</div>
                    <div>Last block: {network.minutesSinceLastBlock ?? '-'} time ago</div>
                  </>
                  : <div className={style.cardStatus}>Disconnected</div>
                }
            </div>
        </div>
      ))}
    </div>
  )
}
