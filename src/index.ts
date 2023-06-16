import * as N3 from 'n3';
import { parseN3File } from './parser';

const XSD  = 'http://www.w3.org/2001/XMLSchema#';
const RDFS = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';

main();

async function main() : Promise<void> {
    const store = await parseN3File('data/00-simple.n3');
    const n3s = makeGraph(store, N3.DataFactory.defaultGraph());
    console.log(n3s);
}

type IPSO = {
    subject: ITerm | ITerm[] ,
    predicate: ITerm | ITerm[] ,
    object: ITerm | ITerm[],
};

type ITerm = INamedNode | IBlankNode | ILiteral | IGraph;

type INamedNode = {
    value: string;
};

type IBlankNode = {
    value: string;
};

type ILiteral = {
    value: string;
    type: string;
};

type IGraph = IPSO[] ;

function pref(type: string, value: string) : string {
    return type + value;
}

function makeGraph(store: N3.Store, graph: N3.Term) : string {
    const graphList : string[] = [];

    // First process the named nodes...
    store.forEach((quad) => {
        if (quad.subject.termType === 'NamedNode' 
                && !isGraphLike(quad,graph)) {
            let subject   = parseTerm(quad.subject, store);
            let predicate = parseTerm(quad.predicate, store);
            let object    = parseTerm(quad.object, store);
            graphList.push(`${predicate}(${subject},${object}).`);
        }
    }, null, null, null, graph);

    // Next process the explicit bnodes...
    store.forEach((quad) => {
        if (quad.subject.termType === 'BlankNode' 
                && !isListLike(quad) 
                && !isGraphLike(quad,graph)) {
            let subject   = parseTerm(quad.subject, store);
            let predicate = parseTerm(quad.predicate, store);
            let object    = parseTerm(quad.object, store);
            graphList.push(`${predicate}(${subject},${object}).`);
        }
    }, null, null, null, graph);

    return graphList.join("\n");
}

function parseTerm(term: N3.Term, store: N3.Store) : string {
    if (term.termType === 'NamedNode') {
        if (term.value === pref(RDFS,'nil')) {
            return '[]';
        }
        else {
            return `'<${term.value}>'`;
        }
    }
    else if (term.termType === 'Literal') {
        if (term.datatypeString === pref(XSD,'boolean')) {
            return `${term.value}`;
        }
        else if (term.datatypeString === pref(XSD,'integer')) {
            return `${term.value}`;
        }
        else {
            return `literal('${term.value}',type('${term.datatypeString}')`;
        }
    }
    else if (term.termType === 'BlankNode') {
        if (isList(term,store)) {
            return makeList(term,store);
        }
        else if (isGraph(term,store)) {
            return '(' + makeGraph(store,term) + ')';
        }
        else {
            const genid = makeGenId(term);
            return `'<${genid}>'`;   
        }
    }
    else {
        return '';
    }
}

function makeGenId(term: N3.Term) : string {
    const value = term.value.replace(/^.*(_|\.)/,'e_') ;
    return `http://eyereasoner.github.io/.well-known/genid/2486415431719254739#${value}`;   
}

function isGraphLike(quad: N3.Quad, graph: N3.Term) : boolean {
    if (quad.graph.id === graph.id) {
        return false;
    }
    else {
        return true;
    }
}

function isListLike(quad: N3.Quad) : boolean {
    if (quad.predicate.value === pref(RDFS,'first') ||
        quad.predicate.value === pref(RDFS,'rest')) {
        return true;
    }
    else {
        return false;
    }
} 

function isList(term: N3.Term, store: N3.Store) : boolean {
    const first = store.getQuads(term,pref(RDFS,'first'),null,null);
    const rest = store.getQuads(term,pref(RDFS,'rest'),null,null);

    if (first.length == 1 || rest.length == 1) {
        return true;
    }
    else {
        return false;
    }
}

function isGraph(term: N3.Term, store: N3.Store) : boolean {
    const graph = store.getQuads(null, null, null, term);

    if (graph.length == 0) {
        return false;
    }
    else {
        return true;
    }
}

function makeList(term: N3.Term, store: N3.Store) : string {
    let termList : string[] = [];
    let searchTerm = term;
    let brake = false;

    do {
        const first = store.getQuads(searchTerm,pref(RDFS,'first'),null,null);
        const rest  = store.getQuads(searchTerm,pref(RDFS,'rest'),null,null);

        if (first.length == 0) {
            if (rest.length == 0 || rest.length != 1) {
                brake = true;
            }
            else {
                brake = true;
            }
        }
        else if (first.length != 1 || rest.length != 1) {
            brake = true;
        } 
        else if (first[0].object.value === pref(RDFS,'nil')) {
            brake = true;
        }
        else {
            const termValue = parseTerm(first[0].object, store);

            termList.push(termValue);

            if (rest[0].object.value === pref(RDFS,'nil')) {
                brake = true;
            }
            else {
                searchTerm = rest[0].object;
            }
        }

        first.forEach( (quad) => { store.removeQuad(quad) });
        rest.forEach( (quad) => { store.removeQuad(quad) });
    } while (!brake);
    
    return '[' + 
        termList.join(",") +
    ']';
}