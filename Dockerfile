FROM node:14

ARG UID=$UID
ARG GID=$GID

RUN if getent passwd $UID; then \
        userdel -f $(getent passwd $UID | cut -d: -f1); \
    fi && \
    if getent group $GID; then \
        groupdel $(getent group $GID | cut -d: -f1); \
    fi

RUN groupadd -g $GID ovos
RUN useradd -m -u $UID -g $GID -s /bin/bash ovos

WORKDIR /usr/src/app

RUN chown -R ovos:ovos /usr/src/app

USER ovos

COPY package*.json ./

RUN npm install

COPY . .

CMD [ "node", "app.js" ]
