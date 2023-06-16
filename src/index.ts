#!/usr/bin/env node

import * as N3 from 'n3';
import { parseN3File, makeGraph, writeGraph } from './parser';

if (process.argv.length != 3) {
    console.log(`usage: ${process.argv[1]} n3-file`);
    process.exit(1);
}

const input = process.argv[2];

main(input);

async function main(path: string) : Promise<void> {
    const store = await parseN3File(path);
    const graph = makeGraph(store);
    const n3s = writeGraph(graph);
    console.log(n3s);
}