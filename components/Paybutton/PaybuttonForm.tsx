import React, { ReactElement } from 'react'

export default function PaybuttonForm (): ReactElement {
  return (
    <form action='/api/paybutton' method='post'>
      <label htmlFor='name'>Name</label>
      <input type='text' id='name' name='name' required />

      <label htmlFor='buttonData'>Button Data</label>
      <textarea id='buttonData' name='buttonData' />

      <label htmlFor='addresses'>Addresses</label>
      <textarea id='addresses' name='addresses' required />

      <label htmlFor='userId'>userId</label>
      <textarea id='userId' name='userId' required />

      <button type='submit'>Submit</button>
    </form>
  )
}
