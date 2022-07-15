import React, { FunctionComponent } from 'react'
import { Paybutton } from '@prisma/client'

interface IProps { paybuttons: Paybutton[] }
export default ({ paybuttons }: IProps): FunctionComponent<IProps> =>
  <ul>
    {paybuttons.map(paybutton => (
      <li key={paybutton.id}>
        <section>
          <h3>{paybutton.id} {paybutton.name}</h3>
          <ul>
            {paybutton.addresses.map(item => (<li key={item.paybuttonAddress.address}> {item.paybuttonAddress.address}</li>))}
            {paybutton.buttonData}
          </ul>
        </section>
      </li>
    ))}
  </ul>
