import * as N3 from 'n3';
import * as fs from 'fs';
import { getLogger } from "log4js";

const logger = getLogger();

export {
    parseN3File,
    parseN3,
    serializeN3Store
};

async function parseN3File(file: string) : Promise<N3.Store> {
    logger.debug(`parsing: ${file}`);
    const n3 = fs.readFileSync(file, { encoding: "utf8"});
    return parseN3(n3);
}

async function parseN3(n3: string) : Promise<N3.Store> {
    const parser = new N3.Parser({ format: 'Notation3' });

    const store  = new N3.Store(); 

    parser.parse(n3,
        (error, quad, _prefixes) => {
            if (error) {
                throw new Error(error.message);
            }

            if (quad) {
                store.add(quad)
            }
            else {
                // We are done with parsing
            }
        }
    );

    return store;
}

function serializeN3Store(store: N3.Store) : void {
    store.forEach( (quad) => {
        const subject   = quad.subject.value;
        const predicate = quad.predicate.value;
        const object    = quad.object.value;
        const graph     = quad.graph.value;

        console.log(`${subject} || ${predicate} || ${object} IN ${graph}`);
    }, null, null, null, null);
}