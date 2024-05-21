import * as fs from 'fs';
import { IN3SToken, N3SLexer } from "./N3SLexer";
import { IBlankNode, ILiteral, INamedNode, IList, ITerm } from "./N3Parser";
import { getLogger, Logger } from "log4js";

const termType = {
    Subject: 0,
    Predicate: 1 ,
    Object : 2 ,
    LeftParen: 3 ,
    RightParen: 4 ,
    Dot: 5
};

type ICallBack = (token: IN3SToken) => ICallBack ;

export class N3SParser {
    private subject : ITerm;
    private predicate : ITerm;
    private object : ITerm;
    private nextTerm : number;
    private listStack : ITerm[];
    private lexer : N3SLexer;
    private inList : boolean;
    private readCallback : ICallBack;
    private logger : Logger;

    constructor() {
        this.lexer = new N3SLexer();
        this.subject = {} as ITerm;
        this.predicate = {} as ITerm;
        this.object = {} as ITerm;
        this.nextTerm = termType.Predicate;
        this.listStack = [] as ITerm[];
        this.inList = false;
        this.readCallback = this.readInTopContext;
        this.logger = getLogger();
    }

    private readInTopContext(token: IN3SToken) : ICallBack {
        switch(token.type) {
            case 'directive':
                // Ignore directives...
                return this.readTerm;
            default:
                return this.readTerm(token);
        }
    }

    private readTerm(token: IN3SToken) : ICallBack {
        this.logger.debug(`readTerm %s`, token);

        let entity : ITerm | undefined = undefined;

        switch (this.nextTerm) {
            case termType.Dot:
                if ( token.type === '.') {
                    this.gatherResults();
                    this.nextTerm = termType.Predicate;
                    return this.readTerm;
                }
                else {
                    this.logger.error(`expecting '.' but got %s`,token);
                    throw new Error(`Expecting '.'`); 
                } 
            case termType.RightParen:
                if ( token.type === ')') {
                    this.nextTerm = termType.Dot;
                    return this.readTerm;
                }
                else {
                    this.logger.error(`expecting ')' but got %s`,token);
                    throw new Error(`Expecting ')'`); 
                }
            case termType.LeftParen: 
                if ( token.type === '(') {
                    this.nextTerm = termType.Subject;
                    return this.readTerm;
                }
                else {
                    this.logger.error(`expecting '(' but got %s`,token);
                    throw new Error(`Expecting '('`); 
                }
            case termType.Predicate:
                if ( token.type === "IRI" || token.type === "blank"  || token.type === 'eof') {
                    // we are ok
                }
                else {
                    this.logger.error(`expecting IRI or blank but got %s`,token);
                    throw new Error(`Expecting IRI or blank`);
                }
                break;
        }

        switch (token.type) {
            case "IRI":
                entity = this.readEntity(token);
                break;
            case "literal":
                entity = this.readEntity(token);
                break;
            case "blank":
                entity = this.readEntity(token);
                break;
            case "[" :
                this.listStack = [];
                this.inList = true;
                break;
            case "]":
                entity = {
                    type: 'List',
                    value: this.listStack,
                    datatype: null 
                } as IList;
                this.listStack = [];
                this.inList = false;
                break;
        };

        if (entity !== undefined && ! this.inList) {
            switch (this.nextTerm) { 
                case termType.Subject:
                    this.subject = entity;
                    this.nextTerm = termType.Object;
                    break;
                case termType.Predicate:
                    this.predicate = entity;
                    this.nextTerm = termType.LeftParen;
                    break;
                case termType.Object:
                    this.object = entity;
                    this.nextTerm = termType.RightParen;
                    break;
            };
        }

        return this.readTerm;
    }

    private gatherResults() : void {
        this.logger.debug(`subject: %s`,this.subject);
        this.logger.debug(`predicate: %s`,this.predicate);
        this.logger.debug(`object: %s`,this.object);
    }

    private readEntity(token: IN3SToken) : ITerm | undefined {
        this.logger.debug(`readEntity %s`, token);
 
        let value = undefined;

        switch (token.type) {
            case 'IRI':
                value = {
                    type: 'NamedNode',
                    value: token.value,
                    datatype: null
                } as INamedNode;
                break;
            case 'literal':
                value = {
                    type: 'Literal',
                    value: token.value,
                    datatype: token.prefix
                } as ILiteral;
                break;
            case 'blank':
                value = {
                    type: 'BlankNode',
                    value: token.value,
                    datatype: null
                } as IBlankNode;
                break;
            default:
                this.error(`Expected entity but got ${token.type}`, token);
                value = undefined;
        };

        if (value !== undefined && this.inList) {
            this.logger.debug(`pushing value to listStack pos=%d`,this.listStack.length + 1);
            this.listStack.push(value);
        }

        this.logger.debug(`value=%s`,value);

        return value;
    }

    public parse(path: string) {
        const input = fs.readFileSync(path, { encoding: 'utf-8'});
        this.lexer.tokenize(input)?.every( (token: IN3SToken) => {
            return this.readCallback = this.readCallback(token);
        });
    }

    // ### `error` emits an error message through the callback
    private error(message: string, token: IN3SToken) {
        throw new Error(`${message} on line ${token.line}.`);
    }
}