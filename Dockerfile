FROM node:lts
RUN apt-get update && apt-get -y install tmux
USER node
WORKDIR /home/node/src/
ENV PATH /home/node/src/node_modules/.bin:$PATH
EXPOSE 3000
