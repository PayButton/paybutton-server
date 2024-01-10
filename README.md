# paybutton-server
[![master status](https://github.com/paybutton/paybutton-server/actions/workflows/on-push-master.yml/badge.svg)](https://github.com/paybutton/paybutton-server/actions/workflows/on-push-master.yml)

https://paybutton.org

## Developing
### Installing and running PayButton locally
- [Install and configure Docker](https://docs.docker.com/get-docker/)
- Clone the repo and go to the repo directory
- Copy `config/example-config.json` to `paybutton-config.json`
- Create a `.env.local` file with the environment variables:
  + `PRICE_API_TOKEN="<COINDANCE_API_KEY>"`
  + `WS_AUTH_KEY="<RANDOMLY_GENERATED_UUID>"`
  + `MASTER_SECRET_KEY="<RANDOMLY_GENERATED_UUID>"`

- Run the following make command* to build/pull the relevant docker images and run the server locally:


    ```
    make dev
    ```
	_*If you run docker as root user, run the command above with `sudo`_

- App will be available at http://localhost:3000.
- Local changes on source code should trigger a reload immediately.


### Optional configuration
- For production, set `ENVIRONMENT=production` in `.env.local.` This optimizes the build for performance and skips the setup of various dev tools (like LiveReload).
<!--
- Enable _social login_ by filling up `.env` or `.env.local` file with your social provider credentials. You can get testing credentials and more detailed instructions [here](https://supertokens.com/docs/thirdpartyemailpassword/quick-setup/backend#2-initialise-supertokens).
-->

## Want to join the team?

Send us an email and we'll get in touch: contact@paybutton.org

