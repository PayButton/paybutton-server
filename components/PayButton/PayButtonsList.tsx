import React from 'react'
import { ButtonResource } from 'types/index'

type IProps = { payButtons: ButtonResource[] }
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