#!/usr/bin/env node

import { N3Parser } from './N3Parser';
import { N3SParser } from './N3SParser';
import { program } from 'commander';
import * as log4js from 'log4js';

program.version('0.0.4')
       .argument('<file>')
       .option('-r,--reverse','inverse parsing')
       .option('-d,--info','output debugging messages')
       .option('-dd,--debug','output more debugging messages')
       .option('-ddd,--trace','output much more debugging messages');

program.parse(process.argv);

const opts   = program.opts();
const logger = log4js.getLogger();

if (opts.info) {
  logger.level = "info";
}

if (opts.debug) {
  logger.level = "debug";
}

if (opts.trace) {
  logger.level = "trace";
}

const input = program.args[0];

logger.info(`input: ${input}`);

const knownPredicates = [
    'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
    'http://www.w3.org/2000/10/swap/.*',
];

main(input);

async function main(path: string) : Promise<void> {
    if (opts.reverse) {
      const parser = new N3SParser();
      const result = await parser.parse(path);
      console.log(result);
    }
    else {
      const parser = new N3Parser({});
      parser.parse(path)
            .then(graph => {
              const n3s = parser.asN3S(graph, knownPredicates);
              console.log(n3s);
            })
            .catch(e => {
              console.error(e);
              process.exit(2);
            });
    }
}