import Button from 'components/Button'
import Link from 'next/link'
import style from './account.module.css'

const ProPurchase = (): JSX.Element => {
  return <div className={style.upgrade_btn}>
    <Link href='/pro'>
      <Button>Upgrade to Pro</Button>
    </Link>
  </div>
}

export default ProPurchase
