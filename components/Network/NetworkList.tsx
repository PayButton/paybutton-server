import React, { FunctionComponent } from 'react'
import { Network } from '@prisma/client'

interface IProps { networks: Network[] }
export default ({ networks }: IProps): FunctionComponent<IProps> =>
  <ul>
    {networks.map(network => (
      <li key={network.id}>
        <section>
          <h3>{network.title}</h3> ({network.slug})
        </section>
      </li>
    ))}
  </ul>
