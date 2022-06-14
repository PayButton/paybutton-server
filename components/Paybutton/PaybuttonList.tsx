import React from 'react'
import { Paybutton } from 'types/index'

type IProps = { paybuttons: Paybutton[] }
export default ({paybuttons}:IProps) => 
<ul>
{paybuttons.map(paybutton => (
    <li key={paybutton.id}>
      <section>
        <h3>{paybutton.id}</h3>
        <ul>
          {paybutton.addresses.map(item => (<li key={item.address}>{item.chain.title}: {item.address}</li>))}
        </ul>
      </section>
    </li>
))}
</ul>
