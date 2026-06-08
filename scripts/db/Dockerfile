FROM mariadb:latest

RUN mkhomedir_helper mysql

RUN apt-get update || true && \
      apt-get install -y gettext pv || true

RUN mkdir -p /home/mysql/raw_entrypoint && \
    mkdir -p /home/mysql/entrypoint

USER 0

RUN chown -R mysql:mysql /home/mysql/raw_entrypoint && \
  chown -R  mysql:mysql /home/mysql/entrypoint
