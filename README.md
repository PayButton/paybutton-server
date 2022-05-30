# paybutton-server

https://paybutton.org

## Developing
- [Install and configure Docker](https://docs.docker.com/get-docker/)
- [Install docker-compose](https://docs.docker.com/compose/install/)
- **Optional**: Enable _social login_ by filling up `.env` or `.env.local` file with your social provider credentials. You can get testing credentials and more detailed instructions [here](https://supertokens.com/docs/thirdpartyemailpassword/quick-setup/backend#2-initialise-supertokens).
- **Optional**: Set `GRPC_NODE_URL` environment variable in `.env.local` or `.env` to a **BCHD** node to get access to its API.
- Run the following make command* to build/pull the relevant docker images and run the server locally:

  _*If you run docker as root user, run the following commands with `sudo`_
    ```
    make dev
    ```
- App will be available at http://localhost:3000.
- Local changes on source code should trigger a reload immediately.

## Want to join the team?

Send us an email and we'll get in touch: contact@paybutton.org

