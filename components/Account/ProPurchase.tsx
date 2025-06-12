import Button from 'components/Button'
import Link from 'next/link'

const ProPurchase = (): JSX.Element => {
  return <Button className=''>
      <Link href='/pro'>Upgrade to Pro</Link>
    </Button>
}

export default ProPurchase
