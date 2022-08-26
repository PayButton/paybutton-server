import React, { FunctionComponent } from 'react'
import { Network } from '@prisma/client'
import style from './network.module.css'

interface IProps { networks: Network[] }
export default ({ networks }: IProps): FunctionComponent<IProps> => {
  return (
    <div className={style.network_ctn}>
      {networks.map(network => (
        <div key={network.id} className={style.card_wrapper}>
            <div className={style.network_card_text}>
              <div className={style.cardTitle}>{network.title}</div>
              <div>Last block: X time ago</div>
                {network.title === 'eCash' ? 
                  <div className={style.cardStatus} style={{ color: '#04b504' }}>Connected</div> :
                  <div className={style.cardStatus}>Disconnected</div>
                }
            </div>
        </div>
      ))}
    </div>
  )
}