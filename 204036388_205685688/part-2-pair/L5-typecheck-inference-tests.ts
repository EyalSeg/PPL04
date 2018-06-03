// L5-typecheck
import * as assert from "assert";
import { makeDefineExp, makeNumExp, makeProcExp, makeVarDecl, makeVarRef, parse, isProgram ,Program, Exp} from './L5-ast';
import { typeofExp, L5typeof, typeofProgram } from './L5-typecheck';
import { makeEmptyTEnv, makeExtendTEnv } from './TEnv';
import { makeBoolTExp, makeNumTExp, makeProcTExp, makeTVar, makeVoidTExp, makePairTExp, parseTE, unparseTExp, TExp } from './TExp';
import {isError} from './error'
import { combineSub,makeSub, applySub, Sub } from "./L5-substitution-adt";
import {infer ,inferType, canUnify, splitEquation} from "./L5-type-equations"
import * as A from "./L5-ast";
import * as S from "./L5-substitution-adt";
import * as E from "./L5-type-equations";
import * as T from "./TExp";

// parseTE
assert.deepEqual(parseTE("number"), makeNumTExp());
assert.deepEqual(parseTE("boolean"), makeBoolTExp());
assert.deepEqual(parseTE("T1"), makeTVar("T1"));
assert.deepEqual(parseTE("(T * T -> boolean)"), makeProcTExp([makeTVar("T"), makeTVar("T")], makeBoolTExp()));
assert.deepEqual(parseTE("(number -> (number -> number))"), makeProcTExp([makeNumTExp()], makeProcTExp([makeNumTExp()], makeNumTExp())));
assert.deepEqual(parseTE("void"), makeVoidTExp());
assert.deepEqual(parseTE("(Empty -> void)"), makeProcTExp([], makeVoidTExp()));

// unparseTExp
assert.deepEqual(unparseTExp(makeNumTExp()), "number");
assert.deepEqual(unparseTExp(makeBoolTExp()), "boolean");
assert.deepEqual(unparseTExp(makeTVar("T1")), "T1");
assert.deepEqual(unparseTExp(makeProcTExp([makeTVar("T"), makeTVar("T")], makeBoolTExp())), "(T * T -> boolean)");
assert.deepEqual(unparseTExp(makeProcTExp([makeNumTExp()], makeProcTExp([makeNumTExp()], makeNumTExp()))), "(number -> (number -> number))");

// parse with type annotations
assert.deepEqual(parse("(define (a : number) 1)"), makeDefineExp(makeVarDecl("a", makeNumTExp()), makeNumExp(1)));
assert.deepEqual(parse("(lambda ((x : number)) : number x)"),
                 makeProcExp([makeVarDecl("x", makeNumTExp())], [makeVarRef("x")], makeNumTExp()));

// L5typeof
assert.deepEqual(L5typeof("5"), "number");
assert.deepEqual(L5typeof("#t"), "boolean");

assert.deepEqual(L5typeof("+"), "(number * number -> number)");
assert.deepEqual(L5typeof("-"), "(number * number -> number)");
assert.deepEqual(L5typeof("*"), "(number * number -> number)");
assert.deepEqual(L5typeof("/"), "(number * number -> number)");
assert.deepEqual(L5typeof("="), "(number * number -> boolean)");
assert.deepEqual(L5typeof("<"), "(number * number -> boolean)");
assert.deepEqual(L5typeof(">"), "(number * number -> boolean)");
assert.deepEqual(L5typeof("not"), "(boolean -> boolean)");

// typeof varref in a given TEnv
assert.deepEqual(typeofExp(parse("x"), makeExtendTEnv(["x"], [makeNumTExp()], makeEmptyTEnv())), makeNumTExp());

// IfExp
assert.deepEqual(L5typeof("(if (> 1 2) 1 2)"), "number");
assert.deepEqual(L5typeof("(if (= 1 2) #t #f)"), "boolean");

// ProcExp
assert.deepEqual(L5typeof("(lambda ((x : number)) : number x)"), "(number -> number)");
assert.deepEqual(L5typeof("(lambda ((x : number)) : boolean (> x 1))"), "(number -> boolean)");

assert.deepEqual(L5typeof("(lambda((x : number)) : (number -> number) (lambda((y : number)) : number (* y x)))"),
                 "(number -> (number -> number))");

assert.deepEqual(L5typeof("(lambda((f : (number -> number))) : number (f 2))"),
                 "((number -> number) -> number)");

assert.deepEqual(L5typeof(`(lambda((x : number)) : number
                             (let (((y : number) x)) (+ x y)))`),
                 "(number -> number)");

// LetExp
assert.deepEqual(L5typeof("(let (((x : number) 1)) (* x 2))"), "number");

assert.deepEqual(L5typeof(`(let (((x : number) 1)
                                 ((y : number) 2))
                              (lambda((a : number)) : number (+ (* x a) y)))`),
                 "(number -> number)");

// Letrec
assert.deepEqual(L5typeof(`(letrec (((p1 : (number -> number)) (lambda((x : number)) : number (* x x))))
                             p1)`),
                 "(number -> number)");

assert.deepEqual(L5typeof(`(letrec (((p1 : (number -> number)) (lambda((x : number)) : number (* x x))))
                             (p1 2))`),
                 "number");

assert.deepEqual(L5typeof(`(letrec (((odd? : (number -> boolean)) (lambda((n : number)) : boolean
                                                                    (if (= n 0) #f (even? (- n 1)))))
                                    ((even? : (number -> boolean)) (lambda((n : number)) : boolean
                                                                     (if (= n 0) #t (odd? (- n 1))))))
                    (odd? 12))`),
                 "boolean");

// define
assert.deepEqual(L5typeof("(define (foo : number) 5)"), "void");

assert.deepEqual(L5typeof("(define (foo : (number * number -> number)) (lambda((x : number) (y : number)) : number (+ x y)))"),
                 "void");
assert.deepEqual(L5typeof("(define (x : (Empty -> number)) (lambda () : number 1))"), "void");

// Polymorphic tests
assert.deepEqual(L5typeof("(lambda((x : T1)) : T1 x)"), "(T1 -> T1)");

assert.deepEqual(L5typeof(`(let (((x : number) 1))
                             (lambda((y : T) (z : T)) : T
                               (if (> x 2) y z)))`),
                 "(T * T -> T)");

assert.deepEqual(L5typeof("(lambda () : number 1)"), "(Empty -> number)");

// L5-type-equations-tests

// Setup
export const verifyTeOfExpr = (exp: string, texp: string): boolean => {
    const e = A.parse(exp);
    if (A.isProgram(e)) {
        console.log("Program exps not yet supported");
        return false;
    }
    if (isError(e)) {
        console.log(`Bad expression ${exp} - ${e}`)
        return false;
    }
    const expectedType = T.parseTE(texp);
    if (isError(expectedType)) {
        console.log(`Bad expression ${texp} - ${expectedType}`)
        return false;
    }
    const computedType = E.inferType(e);
    const ok = T.equivalentTEs(computedType, expectedType);
    if (! ok) {
        console.log(`
Expected type ${T.unparseTExp(expectedType)}
Computed type: ${T.unparseTExp(computedType)}`);
    }
    return ok;
};

// Test solve
assert.deepEqual(E.solveEquations([E.makeEquation(T.makeTVar("T1"), T.makeTVar("T2"))]),
                 S.makeSub([T.makeTVar("T1")], [T.makeTVar("T2")]));

assert(verifyTeOfExpr("3", "number"));
assert(verifyTeOfExpr("(+ 1 2)", "number"));
assert(verifyTeOfExpr("(+ (+ 1 2) 3)", "number"));
assert(verifyTeOfExpr("+", "(number * number -> number)"));
assert(verifyTeOfExpr(">", "(number * number -> boolean)"));
assert(verifyTeOfExpr("(> 1 2)", "boolean"));
assert(verifyTeOfExpr("(> (+ 1 2) 2)", "boolean"));
assert(verifyTeOfExpr("(lambda (x) (+ x 1))", "(number -> number)"));
assert(verifyTeOfExpr("((lambda (x) (+ x 1)) 3)", "number"));
assert(verifyTeOfExpr("(lambda (x) (x 1))", "((number -> T) -> T)"));

// g: [T1->T2]
// f: [T2->T3]
// ==> (lambda(n) (f (g n)))               : [T1->T3]
// ==> (lambda(f g) (lambda(n) (f (g n)))) : [[T2-T3]*[T1->T2]->[T1->T3]]
assert(verifyTeOfExpr("(lambda (f g) (lambda (n) (f (g n))))",
                      "((T2 -> T3) * (T1 -> T2) -> (T1 -> T3))"));

// f: [N->N]
// ==> (lambda(x) (- (f 3) (f x)))             : [N->N]
// ==> (lambda(f) (lambda(x) (- (f 3) (f x)))) : [[N->N]->[N->N]]
assert(verifyTeOfExpr("(lambda (f) (lambda (x) (- (f 3) (f x))))",
                      "((number -> number) -> (number -> number))"));

assert(verifyTeOfExpr("(lambda (x) (+ (+ x 1) (+ x 1)))", "(number -> number)"));
assert(verifyTeOfExpr("(lambda () (lambda (x) (+ (+ x 1) (+ x 1))))", "(Empty -> (number -> number))"));

assert(verifyTeOfExpr("((lambda (x) (x 1 2)) +)", "number"));
assert(verifyTeOfExpr("((lambda (x) (x 1)) (lambda (y) y))", "number"));

// Circular types cannot be inferred
assert(verifyTeOfExpr("(lambda (x) (x x))", "T"));

// A free variable cannot have type inferred
assert(verifyTeOfExpr("x", "T"));

// A free variable whose type is inferred from context
assert(verifyTeOfExpr("(+ x 1)", "number"));

// Not enough info in context to infer type of f
assert(verifyTeOfExpr("(f 1)", "T"));

// Primitive provides sufficient info
assert(verifyTeOfExpr("(> (f 1) 0)", "boolean"));

// Parameters that are not used
assert(verifyTeOfExpr("(lambda (x) 1)", "(T -> number)"));
assert(verifyTeOfExpr("(lambda (x y) x)", "(T1 * T2 -> T1)"));
assert(verifyTeOfExpr("((lambda (x) 1) 2)", "number"));

// Bad number of parameters
// Extra param
assert(verifyTeOfExpr("((lambda () 1) 2)", "Error"));
// Missing param
assert(verifyTeOfExpr("((lambda (x) 1))", "Error"));


// ---------------------------------------------------------------------------------------------------------------------------------------------------------------






// ----------------------------------------------------------------------------------------------------------------------------------

// parse check
assert.deepEqual(parseTE(`(Pair number number)`),makePairTExp(makeNumTExp(),makeNumTExp()));
assert.deepEqual(parseTE(`(Pair number number)`),makePairTExp(makeNumTExp(),makeNumTExp()));
assert.deepEqual(parseTE(`(Pair boolean number)`),makePairTExp(makeBoolTExp(),makeNumTExp()));
assert.deepEqual(parseTE(`(Pair boolean boolean)`),makePairTExp(makeBoolTExp(),makeBoolTExp()));
assert.deepEqual(parseTE(`(Pair T1 boolean)`),makePairTExp(makeTVar(`T1`),makeBoolTExp()));
assert.deepEqual(parseTE(`(Pair T1 T2)`),makePairTExp(makeTVar(`T1`),makeTVar(`T2`)));
assert.deepEqual(parseTE(`(Pair T1 (number * number -> T1))`),
                 makePairTExp(makeTVar(`T1`),makeProcTExp([makeNumTExp(),makeNumTExp()],makeTVar(`T1`))));
assert.deepEqual(parseTE(`(Pair (boolean * boolean -> T2) (number * number -> T1))`),
                 makePairTExp(makeProcTExp([makeBoolTExp(),makeBoolTExp()],makeTVar(`T2`)),makeProcTExp([makeNumTExp(),makeNumTExp()],makeTVar(`T1`))));

// unparse check
assert.deepEqual(unparseTExp(makePairTExp(makeNumTExp(),makeNumTExp())),`(Pair number number)`);
assert.deepEqual(unparseTExp(makePairTExp(makeNumTExp(),makeNumTExp())),`(Pair number number)`);
assert.deepEqual(unparseTExp(makePairTExp(makeBoolTExp(),makeNumTExp())),`(Pair boolean number)`);
assert.deepEqual(unparseTExp(makePairTExp(makeBoolTExp(),makeBoolTExp())),`(Pair boolean boolean)`);
assert.deepEqual(unparseTExp(makePairTExp(makeTVar(`T1`),makeBoolTExp())),`(Pair T1 boolean)`);
assert.deepEqual(unparseTExp(makePairTExp(makeTVar(`T1`),makeTVar(`T2`))),`(Pair T1 T2)`);
assert.deepEqual(unparseTExp(makePairTExp(makeTVar(`T1`),makeProcTExp([makeNumTExp(),makeNumTExp()],makeTVar(`T1`)))),
                 `(Pair T1 (number * number -> T1))`);
assert.deepEqual(unparseTExp(makePairTExp(makeProcTExp([makeBoolTExp(),makeBoolTExp()],makeTVar(`T2`)),makeProcTExp([makeNumTExp(),makeNumTExp()],makeTVar(`T1`)))),
                 `(Pair (boolean * boolean -> T2) (number * number -> T1))`);

// matching pair check
assert.deepEqual(T.matchTVarsInTE(<TExp>parseTE(`(Pair number number)`),<TExp>parseTE(`(Pair number number)`), (x) => x, () => false),[]);
assert.deepEqual(T.matchTVarsInTE(<TExp>parseTE(`(Pair number boolean)`),<TExp>parseTE(`(Pair number number)`), (x) => x, () => false),false);
assert.deepEqual(T.matchTVarsInTE(<TExp>parseTE(`(Pair number boolean)`),<TExp>parseTE(`(Pair number boolean)`), (x) => x, () => false),[]);
assert.deepEqual(T.matchTVarsInTE(<TExp>parseTE(`(Pair boolean boolean)`),<TExp>parseTE(`(Pair number boolean)`), (x) => x, () => false),false);
assert.deepEqual(T.matchTVarsInTE(<TExp>parseTE(`(Pair boolean boolean)`),<TExp>parseTE(`(Pair boolean boolean)`), (x) => x, () => false),[]);
assert.deepEqual(T.matchTVarsInTE(<TExp>parseTE(`(Pair T2 boolean)`),<TExp>parseTE(`(Pair T2 boolean)`), (x) => x, () => false),[]);
assert.deepEqual(T.matchTVarsInTE(<TExp>parseTE(`(Pair T2 boolean)`),<TExp>parseTE(`(Pair T3 boolean)`), (x) => x, () => false),
                [{left:makeTVar(`T2`),right:makeTVar(`T3`)}]);
assert.deepEqual(T.matchTVarsInTE(<TExp>parseTE(`(Pair T2 T4)`),<TExp>parseTE(`(Pair T3 T5)`), (x) => x, () => false),
[{left:makeTVar(`T2`),right:makeTVar(`T3`)},{left:makeTVar(`T4`),right:makeTVar(`T5`)}]);
assert.deepEqual(T.matchTVarsInTE(<TExp>parseTE(`(Pair T2 T4)`),<TExp>parseTE(`number`), (x) => x, () => false),false);
assert.deepEqual(T.matchTVarsInTE(<TExp>parseTE(`number`),<TExp>parseTE(`(Pair T2 T4)`), (x) => x, () => false),false);
assert.deepEqual(T.matchTVarsInTE(<TExp>parseTE(`(Pair T2 T4)`),<TExp>parseTE(`(Pair T3 number)`), (x) => x, () => false),false);
assert.deepEqual(T.matchTVarsInTE(<TExp>parseTE(`(Pair number T4)`),<TExp>parseTE(`(Pair T3 T5)`), (x) => x, () => false),false);

// check no occurrences
assert.deepEqual(S.checkNoOccurrence(makeTVar(`T1`),<TExp>parseTE(`(Pair number number)`)),true);
assert.deepEqual(isError(S.checkNoOccurrence(makeTVar(`T1`),<TExp>parseTE(`(Pair T1 number)`))),true);
assert.deepEqual(S.checkNoOccurrence(makeTVar(`T1`),<TExp>parseTE(`(Pair boolean boolean)`)),true);
assert.deepEqual(isError(S.checkNoOccurrence(makeTVar(`T1`),<TExp>parseTE(`(Pair boolean T1)`))),true);
assert.deepEqual(S.checkNoOccurrence(makeTVar(`T1`),<TExp>parseTE(`(Pair boolean T2)`)),true);
assert.deepEqual(isError(S.checkNoOccurrence(makeTVar(`T1`),<TExp>parseTE(`(Pair boolean (number * number -> T1))`))),true);
assert.deepEqual(S.checkNoOccurrence(makeTVar(`T1`),<TExp>parseTE(`(Pair boolean (number * number -> T2))`)),true);
assert.deepEqual(isError(S.checkNoOccurrence(makeTVar(`T1`),<TExp>parseTE(`(Pair (number * T1 -> T2) (number * number -> T2))`))),true);
assert.deepEqual(S.checkNoOccurrence(makeTVar(`T1`),<TExp>parseTE(`(Pair (number * T3 -> T2) (number * number -> T2))`)),true);
assert.deepEqual(S.checkNoOccurrence(makeTVar(`T1`),<TExp>parseTE(`(Pair (number * T3 -> T2) (Pair number boolean))`)),true);
assert.deepEqual(isError(S.checkNoOccurrence(makeTVar(`T1`),<TExp>parseTE(`(Pair (number * T3 -> T2) (Pair T1 boolean))`))),true);

// checking apply sub on pairs
assert.deepEqual(unparseTExp(applySub(<Sub>makeSub([makeTVar(`T1`)],[<TExp>parseTE(`number`)]),<TExp>parseTE(`(Pair number number)`))),
                 `(Pair number number)`);
assert.deepEqual(unparseTExp(applySub(<Sub>makeSub([makeTVar(`T1`)],[<TExp>parseTE(`number`)]),<TExp>parseTE(`(Pair number T1)`))),
                `(Pair number number)`);
assert.deepEqual(unparseTExp(applySub(<Sub>makeSub([makeTVar(`T1`)],[<TExp>parseTE(`number`)]),<TExp>parseTE(`(Pair number T1)`))),
                `(Pair number number)`);
assert.deepEqual(unparseTExp(applySub(<Sub>makeSub([makeTVar(`T1`)],[<TExp>parseTE(`number`)]),<TExp>parseTE(`(Pair number T2)`))),
                `(Pair number T2)`);
assert.deepEqual(unparseTExp(applySub(<Sub>makeSub([makeTVar(`T1`)],[<TExp>parseTE(`boolean`)]),<TExp>parseTE(`(Pair T1 T2)`))),
                `(Pair boolean T2)`);
assert.deepEqual(unparseTExp(applySub(<Sub>makeSub([makeTVar(`T1`),makeTVar(`T2`)],[<TExp>parseTE(`boolean`),<TExp>parseTE(`number`)]),
                 <TExp>parseTE(`(Pair T1 T2)`))),`(Pair boolean number)`);
assert.deepEqual(unparseTExp(applySub(<Sub>makeSub([makeTVar(`T1`),makeTVar(`T2`)],[<TExp>parseTE(`boolean`),<TExp>parseTE(`number`)]),
                 <TExp>parseTE(`(Pair T1 T3)`))),`(Pair boolean T3)`);
assert.deepEqual(unparseTExp(applySub(<Sub>makeSub([makeTVar(`T1`),makeTVar(`T3`)],[<TExp>parseTE(`boolean`),<TExp>parseTE(`number`)]),
                 <TExp>parseTE(`(Pair T1 T3)`))),`(Pair boolean number)`);
assert.deepEqual(unparseTExp(applySub(<Sub>makeSub([makeTVar(`T1`),makeTVar(`T3`)],[<TExp>parseTE(`(boolean * boolean -> number)`),
                 <TExp>parseTE(`number`)]),<TExp>parseTE(`(Pair T1 T3)`))),`(Pair (boolean * boolean -> number) number)`);
assert.deepEqual(unparseTExp(applySub(<Sub>makeSub([makeTVar(`T1`),makeTVar(`T3`)],[<TExp>parseTE(`(boolean * boolean -> number)`),
                 <TExp>parseTE(`number`)]),<TExp>parseTE(`(Pair T1 T3)`))),`(Pair (boolean * boolean -> number) number)`);
assert.deepEqual(unparseTExp(applySub(<Sub>makeSub([makeTVar(`T1`),makeTVar(`T3`)],[<TExp>parseTE(`(Pair number number)`),
                 <TExp>parseTE(`number`)]),<TExp>parseTE(`(Pair T1 T3)`))),`(Pair (Pair number number) number)`);
assert.deepEqual(unparseTExp(applySub(<Sub>makeSub([makeTVar(`T1`),makeTVar(`T3`)],[<TExp>parseTE(`(Pair number number)`),
                 <TExp>parseTE(`(boolean * boolean -> number)`)]),<TExp>parseTE(`(Pair T1 T3)`))),
                 `(Pair (Pair number number) (boolean * boolean -> number))`);

// checking making equation on quote
let exp = <Exp>parse(`(quote (1 . 2))`);
let pool = E.expToPool(<Exp>parse(`(quote (1 . 2))`));
assert.deepEqual(E.makeEquationFromExp(exp,pool),[E.makeEquation(E.inPool(pool,exp),<TExp>parseTE(`(Pair number number)`))]);

exp = <Exp>parse(`(quote ((#f . #t) . 2))`);
pool = E.expToPool(<Exp>parse(`(quote ((#f . #t) .  2))`));
assert.deepEqual(E.makeEquationFromExp(exp,pool),[E.makeEquation(E.inPool(pool,exp),<TExp>parseTE(`(Pair (Pair boolean boolean) number)`))]);

exp = <Exp>parse(`(quote ((#f . #t) . (1 . #t)))`);
pool = E.expToPool(<Exp>parse(`(quote ((#f . #t) . (1 . #t)))`));
assert.deepEqual(E.makeEquationFromExp(exp,pool),[E.makeEquation(E.inPool(pool,exp),<TExp>parseTE(`(Pair (Pair boolean boolean) (Pair number boolean))`))]);

// chceck quote 
assert.deepEqual(infer(`(quote (1 . 2))`),`(Pair number number)`);
assert.deepEqual(infer(`(quote ((#f . #t) . 2))`),`(Pair (Pair boolean boolean) number)`);
assert.deepEqual(infer(`(quote ((#f . 5) . 2))`),`(Pair (Pair boolean number) number)`);
assert.deepEqual(infer(`(quote ((#f . 5) . (1 . 3)))`),`(Pair (Pair boolean number) (Pair number number))`);
assert.deepEqual(infer(`'(1 . 2)`),`(Pair number number)`);
assert.deepEqual(infer(`'((#f . #t) . 2)`),`(Pair (Pair boolean boolean) number)`);
assert.deepEqual(infer(`'((#f . 5) . 2)`),`(Pair (Pair boolean number) number)`);
assert.deepEqual(infer(`'((#f . 5) . (1 . 3))`),`(Pair (Pair boolean number) (Pair number number))`);
assert.deepEqual(infer(`(quote (#f . 6))`),`(Pair boolean number)`);

// checking unify
assert.deepEqual(canUnify(E.makeEquation(<TExp>parseTE(`(Pair number number)`),<TExp>parseTE(`(Pair number number)`))),true);
assert.deepEqual(canUnify(E.makeEquation(<TExp>parseTE(`(Pair boolean number)`),<TExp>parseTE(`(Pair number number)`))),true);
assert.deepEqual(canUnify(E.makeEquation(<TExp>parseTE(`(Pair boolean number)`),<TExp>parseTE(`(Pair number boolean)`))),true);
assert.deepEqual(canUnify(E.makeEquation(<TExp>parseTE(`(number -> number)`),<TExp>parseTE(`(number -> number)`))),true);
assert.deepEqual(canUnify(E.makeEquation(<TExp>parseTE(`(number * number -> number)`),<TExp>parseTE(`(number -> number)`))),false);
assert.deepEqual(canUnify(E.makeEquation(<TExp>parseTE(`(number * number -> number)`),<TExp>parseTE(`(Pair boolean boolean)`))),false);
assert.deepEqual(canUnify(E.makeEquation(<TExp>parseTE(`(Pair (Pair number number) number)`),<TExp>parseTE(`(Pair boolean boolean)`))),true);

// checking split
assert.deepEqual(splitEquation(E.makeEquation(<TExp>parseTE(`(Pair number number)`),<TExp>parseTE(`(Pair number number)`))),
                 [E.makeEquation(<TExp>parseTE(`number`),<TExp>parseTE(`number`)),E.makeEquation(<TExp>parseTE(`number`),<TExp>parseTE(`number`))]);
assert.deepEqual(splitEquation(E.makeEquation(<TExp>parseTE(`(Pair boolean number)`),<TExp>parseTE(`(Pair number number)`))),
                 [E.makeEquation(<TExp>parseTE(`boolean`),<TExp>parseTE(`number`)),E.makeEquation(<TExp>parseTE(`number`),<TExp>parseTE(`number`))]);
assert.deepEqual(splitEquation(E.makeEquation(<TExp>parseTE(`(Pair boolean number)`),<TExp>parseTE(`(Pair number boolean)`))),
                 [E.makeEquation(<TExp>parseTE(`boolean`),<TExp>parseTE(`number`)),E.makeEquation(<TExp>parseTE(`number`),<TExp>parseTE(`boolean`))]);
assert.deepEqual(splitEquation(E.makeEquation(<TExp>parseTE(`(Pair boolean number)`),<TExp>parseTE(`(Pair number boolean)`))),
                 [E.makeEquation(<TExp>parseTE(`boolean`),<TExp>parseTE(`number`)),E.makeEquation(<TExp>parseTE(`number`),<TExp>parseTE(`boolean`))]);
assert.deepEqual(splitEquation(E.makeEquation(<TExp>parseTE(`(Pair (Pair number boolean) number)`),<TExp>parseTE(`(Pair number boolean)`))),
                 [E.makeEquation(<TExp>parseTE(`(Pair number boolean)`),<TExp>parseTE(`number`)),E.makeEquation(<TExp>parseTE(`number`),<TExp>parseTE(`boolean`))]);
assert.deepEqual(splitEquation(E.makeEquation(<TExp>parseTE(`(Pair (Pair number boolean) number)`),<TExp>parseTE(`(Pair number T2)`))),
                 [E.makeEquation(<TExp>parseTE(`(Pair number boolean)`),<TExp>parseTE(`number`)),E.makeEquation(<TExp>parseTE(`number`),<TExp>parseTE(`T2`))]);


// checking solve
assert.deepEqual(E.solveEquations([E.makeEquation(<TExp>parseTE(`(Pair number number)`),<TExp>parseTE(`(Pair number number)`))]),
                 S.makeSub([], []));
assert.deepEqual(E.solveEquations([E.makeEquation(<TExp>parseTE(`(Pair T1 number)`),<TExp>parseTE(`(Pair number number)`))]),
                S.makeSub([T.makeTVar("T1")], [T.makeNumTExp()]));
assert.deepEqual(E.solveEquations([E.makeEquation(<TExp>parseTE(`(Pair T2 boolean)`),<TExp>parseTE(`(Pair number T1)`))]),
                S.makeSub([T.makeTVar("T1"),T.makeTVar("T2")], [T.makeBoolTExp(),T.makeNumTExp()]));
assert.deepEqual(E.solveEquations([E.makeEquation(<TExp>parseTE(`(Pair (Pair T2 T3) boolean)`),<TExp>parseTE(`(Pair (Pair boolean number) T1)`))]),
                S.makeSub([T.makeTVar("T3"),T.makeTVar("T2"),T.makeTVar("T1")], [makeNumTExp(),T.makeBoolTExp(),T.makeBoolTExp()]));
assert.deepEqual(E.solveEquations([E.makeEquation(<TExp>parseTE(`(Pair (Pair T2 T3) (Pair number number))`),<TExp>parseTE(`(Pair (Pair boolean number) T1)`))]),
                S.makeSub([T.makeTVar("T3"),T.makeTVar("T2"),T.makeTVar("T1")], 
                [makeNumTExp(),T.makeBoolTExp(),T.makePairTExp(makeNumTExp(),makeNumTExp())]));
assert.deepEqual(E.solveEquations([E.makeEquation(<TExp>parseTE(`(Pair (Pair T2 T3) (Pair T5 T6))`),<TExp>parseTE(`(Pair (Pair boolean number) (Pair number boolean))`))]),
                S.makeSub([T.makeTVar("T6"),T.makeTVar("T5"),T.makeTVar("T3"),T.makeTVar("T2")], 
                [T.makeBoolTExp(),makeNumTExp(),makeNumTExp(),T.makeBoolTExp()]));

// checking cons car cdr
assert.deepEqual(infer(`(cons 1 2)`),`(Pair number number)`);
assert.deepEqual(infer(`(cons #f 2)`),`(Pair boolean number)`);
assert.deepEqual(infer(`(cons #f #t)`),`(Pair boolean boolean)`);
assert.deepEqual(infer(`(cons #f #t)`),`(Pair boolean boolean)`);
assert.deepEqual(infer(`(car (cons #f #t))`),`boolean`);
assert.deepEqual(infer(`(cdr (cons #f 2))`),`number`);
assert.deepEqual(infer(`(car (cons '(1 . 2) 2))`),`(Pair number number)`);
assert.deepEqual(infer(`(cdr (cons #f (quote (#t . #f))))`),`(Pair boolean boolean)`);

                        
// checking infer
assert.deepEqual(infer(`(
                            ( lambda (x)
                                   x
                            )
                            '(1 . 2)
                        )`),`(Pair number number)`);

assert.deepEqual(infer(`(
                            ( lambda (x)
                                (
                                    ( lambda ((y : (Pair number number)))
                                        5
                                    )
                                    x
                                )
                            )
                            '(1 . 2)
                        )`),`number`);

assert.deepEqual((<String>infer(`(
                                    ( lambda (x)
                                        (
                                            ( lambda ((y : (Pair number number)))
                                                5
                                            )
                                            x
                                        )
                                    )
                                    3
                                )`)).startsWith(`T_`),true);

 assert.deepEqual(infer(`(
                            ( lambda (x)
                                (
                                    ( lambda ((y : ((Pair number number) * (Pair boolean boolean) ->  (Pair boolean number))))
                                        5
                                    )
                                    ( lambda ((w1 : (Pair number number)) (w2 : (Pair boolean boolean)))
                                        '(#f . 1)
                                    )
                                )
                            )
                            3
                        )`),"number");

assert.deepEqual((<String>infer(`(
                                    ( lambda (x)
                                        (
                                            ( lambda ((y : ((Pair number boolean) * (Pair boolean boolean) ->  (Pair boolean number))))
                                                5
                                            )
                                            ( lambda ((w1 : (Pair number number)) (w2 : (Pair boolean boolean)))
                                                '(#f . 1)
                                            )
                                        )
                                    )
                                    3
                                )`)).startsWith(`T_`),true);

assert.deepEqual(infer(`(
                            ( lambda (x)
                                (
                                    ( lambda ((y : ((Pair number boolean) * (Pair boolean boolean) ->  (Pair boolean number))))
                                        '(1 . 2)
                                    )
                                    ( lambda ((w1 : (Pair number boolean)) (w2 : (Pair boolean boolean)))
                                        '(#f . 1)
                                    )
                                )
                            )
                            6
                        )`),"(Pair number number)");

assert.deepEqual(infer(`(
                            ( lambda (x)
                                (
                                    ( lambda ((y : ((Pair number boolean) * (Pair boolean boolean) ->  (Pair boolean number))))
                                        ( y '(1 . #f) '(#t . #f))
                                    )
                                    ( lambda ((w1 : (Pair number boolean)) (w2 : (Pair boolean boolean)))
                                        '(#f . 1)
                                    )
                                )
                            )
                            6
                        )`),"(Pair boolean number)");

assert.deepEqual((<String>infer(`(
                                    ( lambda (x)
                                        (
                                            ( lambda ((y : ((Pair number boolean) * (Pair boolean boolean) ->  (Pair boolean number))))
                                                ( y '(1 . #f) '(#t . 5))
                                            )
                                            ( lambda ((w1 : (Pair number boolean)) (w2 : (Pair boolean boolean)))
                                                '(#f . 1)
                                            )
                                        )
                                    )
                                    6
                                )`)).startsWith("T_"),true);

assert.deepEqual(infer(`(
                            ( lambda (x)
                                (
                                    ( lambda ((y : ((Pair number boolean) * (Pair boolean number) ->  (Pair boolean number))))
                                        ( y '(1 . #f) '(#t . 5))
                                    )
                                    ( lambda ((w1 : (Pair number boolean)) (w2 : (Pair boolean number)))
                                        '(#f . 1)
                                    )
                                )
                            )
                            6
                        )`),"(Pair boolean number)");

assert.deepEqual((<String>infer(`(
                                    ( lambda (x)
                                        (
                                            ( lambda ((y : ((Pair number boolean) * (Pair boolean number) ->  (Pair number number))))
                                                ( y '(1 . #f) '(#t . 5))
                                            )
                                            ( lambda ((w1 : (Pair number boolean)) (w2 : (Pair boolean number)))
                                                '(#f . 1)
                                            )
                                        )
                                    )
                                    6
                                )`)).startsWith("T_"),true);

assert.deepEqual((<String>infer(`(
                                    ( lambda (x)
                                        (
                                            ( lambda ((y : ((Pair number boolean) * (Pair boolean number) ->  number)))
                                                ( y '(1 . #f) '(#t . 5))
                                            )
                                            ( lambda ((w1 : (Pair number boolean)) (w2 : (Pair boolean number)))
                                                '(#f . 1)
                                            )
                                        )
                                    )
                                    6
                                )`)).startsWith("T_"),true);

assert.deepEqual(infer(`(
                            ( lambda (x)
                                (
                                    ( lambda ((y : ((Pair number boolean) * (Pair boolean number) ->  boolean)))
                                        ( y '(1 . #f) '(#t . 5))
                                    )
                                    ( lambda ((w1 : (Pair number boolean)) (w2 : (Pair boolean number)))
                                        #f
                                    )
                                )
                            )
                            6
                        )`),"boolean");


assert.deepEqual(infer(`(
                            ( lambda (x)
                                (
                                    ( lambda ((y : ((Pair number boolean) * (Pair boolean number) ->  boolean)))
                                        ( y (cons 1 #f) '(#t . 5))
                                    )
                                    ( lambda ((w1 : (Pair number boolean)) (w2 : (Pair boolean number)))
                                        (cdr '(4 . #t))
                                    )
                                )
                            )
                            6
                        )`),"boolean");

assert.deepEqual((<String>infer(`(
                                    ( lambda (x)
                                        (
                                            ( lambda ((y : ((Pair number boolean) * (Pair boolean number) ->  boolean)))
                                                ( y (cons 1 #f) '(#t . 5))
                                            )
                                            ( lambda ((w1 : (Pair number boolean)) (w2 : (Pair boolean number)))
                                                (car '(4 . #t))
                                            )
                                        )
                                    )
                                    6
                                )`)).startsWith("T_"),true);

assert.deepEqual(infer(`(
                            ( lambda (x)
                                (
                                    ( lambda ((y : ((Pair number boolean) * (Pair boolean number) ->  number)))
                                        ( y (cons 1 #f) '(#t . 5))
                                    )
                                    ( lambda ((w1 : (Pair number boolean)) (w2 : (Pair boolean number)))
                                        (car '(4 . #t))
                                    )
                                )
                            )
                            6
                        )`),"number");

