import Head from 'next/head'
import React, { useState } from 'react'
import * as SuperTokensConfig from '../../../config/backendConfig'
import Image from 'next/image'
import logoImageSource from 'assets/logo.png'
import style from 'styles/signin.module.css'
import { GetServerSideProps } from 'next/types'
import supertokensNode from 'supertokens-node'
import { fetchOrganization, fetchInviteForToken } from 'services/organizationService'
import { Organization, OrganizationInvite } from '@prisma/client'
import { removeDateFields } from 'utils/index'
import { useRouter } from 'next/router'
import { frontEndGetSession } from 'utils/setSession'

export const getServerSideProps: GetServerSideProps = async (context) => {
  // this runs on the backend, so we must call init on supertokens-node SDK
  supertokensNode.init(SuperTokensConfig.backendConfig())
  const sessionResult = await frontEndGetSession(context)
  if (!sessionResult.success) {
    return sessionResult.failedResult.payload
  }

  const token = context.params?.id
  if (token === undefined || Array.isArray(token)) {
    return {
      redirect: {
        permanent: false,
        destination: '/account'
      }
    }
  }

  const organizationInvite: OrganizationInvite = await fetchInviteForToken(token)
  if (organizationInvite.usedBy !== '') {
    return {
      props: {
        organization: null,
        organizationInvite: null
      }
    }
  } else {
    const organization = await fetchOrganization(organizationInvite.organizationId)
    return {
      props: {
        organization: removeDateFields(organization),
        organizationInvite: removeDateFields(organizationInvite)
      }
    }
  }
}

interface IProps {
  organization: Organization | null
  organizationInvite: OrganizationInvite | null
}

export default function JoinOrg ({ organization, organizationInvite }: IProps): JSX.Element {
  if (organization === null || organizationInvite === null) {
    return (
      <div>
        <Head>
          <title>Blockchain Poker | Join Organization</title>
          <meta name="description" content="Join Organization" />
        </Head>

        <div className={style.login_ctn}>
          <Image src={logoImageSource} alt='Blockchain Poker' />
          <div className={style.login_box}>
            <div style={{ marginBottom: '20px' }}>
              This invite is invalid.
            </div>
          </div>
        </div>
      </div>
    )
  }

  const router = useRouter()
  const [error, setError] = useState('')

  async function onSubmit (): Promise<void> {
    const res = await fetch('/api/organization/join/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        token: organizationInvite?.token
      })
    })
    if (res.status === 200) {
      void router.push('/account')
    } else {
      const data = await res.json()
      setError(data.message)
    }
  }

  return (
    <div>
      <Head>
        <title>Blockchain Poker | Join Organization</title>
        <meta name="description" content="Join Organization" />
      </Head>

      <div className={style.login_ctn}>
        <Image src={logoImageSource} alt='Blockchain Poker' />
        <div className={style.login_box}>
          <div style={{ marginBottom: '20px' }}>
            You have been invited to join <b>{organization.name}</b>
          </div>
          {error !== '' && <div className={style.error_message}>{error}</div>}
          <div style={{ textAlign: 'center', width: '100%' }}>
            <button onClick={() => { void onSubmit() } } className="button_main" style={{ width: '100%' }}>Join</button>
          </div>
        </div>
      </div>
    </div>
  )
}
