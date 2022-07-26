import React, { FunctionComponent } from 'react'
import { Paybutton } from '@prisma/client'

interface IProps {
  paybutton: Paybutton
}
export default ({ paybutton }: IProps): FunctionComponent => {
  return (
    <section>
      <h3>{paybutton.id} {paybutton.name}</h3>
      <ul>
        {paybutton.addresses.map(item => (
          <li key={item.address.address}> {item.address.address}</li>
        ))}
        {paybutton.buttonData}
      </ul>
    </section>
  )
}
