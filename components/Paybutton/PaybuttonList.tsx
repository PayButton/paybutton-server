import React, { FunctionComponent } from 'react'
import { Paybutton } from '@prisma/client'

interface IProps { paybuttons: Paybutton[] }
export default ({ paybuttons }: IProps): FunctionComponent<IProps> =>
  <ul>
    {paybuttons.map(paybutton => (
      <li key={paybutton.id}>
        <section>
          <h3><a href={'button/' + (paybutton.id as string)}>{paybutton.id} {paybutton.name}</a></h3>
          <ul>
            {paybutton.addresses.map(item => (<li key={item.address.address}> {item.address.address}</li>))}
            {paybutton.buttonData}
          </ul>
        </section>
      </li>
    ))}
  </ul>
