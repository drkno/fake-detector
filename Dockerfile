FROM node:latest

RUN mkdir -p /opt/ffmpeg && \
    cd /opt/ffmpeg && \
    curl -L https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz --output ffmpeg.tar.xz && \
    tar --strip-components=1 -xf ffmpeg.tar.xz && \
    ln -s /opt/ffmpeg/ffmpeg /usr/bin/ffmpeg && \
    ln -s /opt/ffmpeg/ffprobe /usr/bin/ffprobe && \
    rm ffmpeg.tar.xz

COPY ./ /app

RUN cd /app && npm install

WORKDIR /app
ENTRYPOINT [ "node", "index.js" ]
