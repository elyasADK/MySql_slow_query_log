FROM node:14

ARG UID=1000
ARG GID=1000

RUN groupadd -g $GID ovos && \
    useradd -m -u $UID -g ovos -s /bin/bash ovos

WORKDIR /usr/src/app

RUN chown -R ovos:ovos /usr/src/app

USER ovos

COPY package*.json ./

RUN npm install

COPY . .

CMD [ "node", "app.js" ]
