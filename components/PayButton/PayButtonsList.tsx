import React from 'react'
import { PayButton } from 'types/index'

type IProps = { payButtons: PayButton[] }
export default ({payButtons}:IProps) => 
<ul>
{payButtons.map(payButton => (
    <li key={payButton.id}>
      <section>
        <h3>{payButton.id}</h3>
        <ul>
          {payButton.addresses.map(address => (<li key={address}>{address}</li>))}
        </ul>
      </section>
    </li>
))}
</ul>