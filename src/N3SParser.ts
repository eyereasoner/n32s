import { IN3SToken, N3SLexer } from "./N3SLexer";
import { IBlankNode, IGraph , ILiteral, INamedNode, ITerm } from "./parser";

type ICallBack = (token: IN3SToken) => ICallBack ;

export class N3SParser {
    private subject : ITerm;
    private lexer : N3SLexer;
    private readCallback : ICallBack;

    constructor() {
        this.lexer = new N3SLexer();
        this.subject = {} as ITerm;
        this.readCallback = this.readInTopContext;
    }

    private readInTopContext(token: IN3SToken) : ICallBack {
        switch(token.type) {
            case 'directive':
                // Ignore directives...
                return this.readSubject;
            default:
                return this.readSubject(token);
        }
    }

    private readSubject(token: IN3SToken) : ICallBack {
        switch (token.type) {
            case 'IRI':
                const entity = this.readEntity(token);
                if (entity !== undefined) {
                    this.subject = entity;
                }
                return this.readSubject;
            default:
                return this.readSubject;
        };
    }

    private readEntity(token: IN3SToken) : ITerm | undefined {
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

        return value;
    }

    public parse(input: string) {
        this.lexer.tokenize(input)?.every( (token: IN3SToken) => {
            return this.readCallback = this.readCallback(token);
        });
    }

    // ### `error` emits an error message through the callback
    private error(message: string, token: IN3SToken) {
        throw new Error(`${message} on line ${token.line}.`);
    }
}