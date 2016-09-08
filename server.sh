#!/bin/bash

http-server ./src -c 0 -S -C ./certs/server-crt.pem -K ./certs/server-key.pem -p 8443