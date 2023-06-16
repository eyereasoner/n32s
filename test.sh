#!/bin/bash

for f in data/*.n3; do
    node js/index.js $f | tee -a ${f}-result
done
