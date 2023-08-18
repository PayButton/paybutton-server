import React, { useState } from 'react';
import ThirdPartyEmailPasswordNode from 'supertokens-node/recipe/thirdpartyemailpassword';
import supertokensNode from 'supertokens-node';
import * as SuperTokensConfig from '../../config/backendConfig';
import Session from 'supertokens-node/recipe/session';
import { GetServerSideProps } from 'next';
import Page from 'components/Page';
import ChangePassword from 'components/Account/ChangePassword';
import style from './account.module.css';

export const getServerSideProps: GetServerSideProps = async (context) => {
  // this runs on the backend, so we must call init on supertokens-node SDK
  supertokensNode.init(SuperTokensConfig.backendConfig());
  let session;
  try {
    session = await Session.getSession(context.req, context.res);
  } catch (err: any) {
    if (err.type === Session.Error.TRY_REFRESH_TOKEN) {
      return { props: { fromSupertokens: 'needs-refresh' } };
    } else if (err.type === Session.Error.UNAUTHORISED) {
      return { props: {} };
    } else {
      throw err;
    }
  }
  if (session === undefined) return;
  const userId = session?.getUserId();

  return {
    props: {
      userId,
      user: await ThirdPartyEmailPasswordNode.getUserById(userId),
    },
  };
};

interface IProps {
  userId: string;
  user: ThirdPartyEmailPasswordNode.User | undefined;
}

export default function Account({ user, userId }: IProps): React.ReactElement {
  const [changePassword, setChangePassword] = useState(false);
  const toggleChangePassword = () => {
    setChangePassword(!changePassword);
  };
  if (user !== null) {
    return (
      <div className={style.account_ctn}>
        <h2>Account</h2>
        <div className={style.label}>Email</div>
        <div className={style.account_card}>{user.email}</div>
        <div
          onClick={() => setChangePassword(!changePassword)}
          className={style.updatebtn}
        >
          {!changePassword ? 'Update Password' : 'Cancel'}
        </div>
        {changePassword && (
          <>
            <div className={style.label}>Update Password</div>
            <ChangePassword toggleChangePassword={toggleChangePassword} />
          </>
        )}
      </div>
    );
  }
  return <Page />;
}
