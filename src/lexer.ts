import * as N3 from 'n3';
import { N3SLexer } from './N3SLexer';
import { N3SParser } from './N3SParser';

main();

async function main() : Promise<void> {
  //  const lexer = new N3.Lexer({ lineMode: false , n3: true});

    //const sample = "'<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>'('<urn:example.org:Alice>','<urn:example.org:Person>').";
    //const sample = "'_:x'(true,'<urn:example.org:Person>').";
    //const sample = "'_:x'(false,'<urn:example.org:Person>').";
    //const sample = "'_:x'(12.3,'<urn:example.org:Person>').";
    //const sample = "'_:x'(false,literal('3.14','http://www.w3.org/2001/XMLSchema#float')).";
    //const sample  = "% test \n'<http://www.w3.org/2000/10/swap/log#onNegativeSurface>'(['_:X'],('<http://www.w3.org/2000/10/swap/log#onNegativeSurface>'([],('<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>'('_:X','<urn:example.org:Human>'))),'<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>'('_:X','<urn:example.org:Person>'))).";
    //const sample = "'_:x'(false,'hello world').\ntrue(true,true).";
    //const sample = "-12.23";
    //const sample = ".";
    //const sample = "% a comment\n";
    const sample = ":- dynamics foo\n'<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>'('<urn:example.org:Alice>','<urn:example.org:Person>').";

   // lexer.tokenize(sample).every( token => {
//        console.log(token);
     //   return true;
//    });

    // const myLexer = new N3SLexer();

    // myLexer.tokenize(sample)?.every( token => {
    //     console.log(token);
    //     return true;
    // });

    const parser = new N3SParser();

    parser.parse(sample);
}