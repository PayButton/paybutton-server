FROM  --platform=linux/amd64 node:lts-alpine
RUN apk add --no-cache python3 make g++ openssl1.1-compat bash
SHELL ["/bin/bash", "-c"]
USER node
RUN yarn global add pm2
WORKDIR /home/node/src/
RUN mkdir -p /home/node/.pm2/logs
RUN chmod -R 2755 /home/node/.pm2
RUN chown -R node:node /home/node/.pm2

ENV PATH /home/node/src/node_modules/.bin:/home/node/.yarn/bin:$PATH
EXPOSE 3000
EXPOSE 5000
