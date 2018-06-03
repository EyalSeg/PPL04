"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// L5-typecheck
var assert = require("assert");
var L5_ast_1 = require("./L5-ast");
var L5_typecheck_1 = require("./L5-typecheck");
var TEnv_1 = require("./TEnv");
var TExp_1 = require("./TExp");
var error_1 = require("./error");
var L5_substitution_adt_1 = require("./L5-substitution-adt");
var L5_type_equations_1 = require("./L5-type-equations");
var A = require("./L5-ast");
var S = require("./L5-substitution-adt");
var E = require("./L5-type-equations");
var T = require("./TExp");
// parseTE
assert.deepEqual(TExp_1.parseTE("number"), TExp_1.makeNumTExp());
assert.deepEqual(TExp_1.parseTE("boolean"), TExp_1.makeBoolTExp());
assert.deepEqual(TExp_1.parseTE("T1"), TExp_1.makeTVar("T1"));
assert.deepEqual(TExp_1.parseTE("(T * T -> boolean)"), TExp_1.makeProcTExp([TExp_1.makeTVar("T"), TExp_1.makeTVar("T")], TExp_1.makeBoolTExp()));
assert.deepEqual(TExp_1.parseTE("(number -> (number -> number))"), TExp_1.makeProcTExp([TExp_1.makeNumTExp()], TExp_1.makeProcTExp([TExp_1.makeNumTExp()], TExp_1.makeNumTExp())));
assert.deepEqual(TExp_1.parseTE("void"), TExp_1.makeVoidTExp());
assert.deepEqual(TExp_1.parseTE("(Empty -> void)"), TExp_1.makeProcTExp([], TExp_1.makeVoidTExp()));
// unparseTExp
assert.deepEqual(TExp_1.unparseTExp(TExp_1.makeNumTExp()), "number");
assert.deepEqual(TExp_1.unparseTExp(TExp_1.makeBoolTExp()), "boolean");
assert.deepEqual(TExp_1.unparseTExp(TExp_1.makeTVar("T1")), "T1");
assert.deepEqual(TExp_1.unparseTExp(TExp_1.makeProcTExp([TExp_1.makeTVar("T"), TExp_1.makeTVar("T")], TExp_1.makeBoolTExp())), "(T * T -> boolean)");
assert.deepEqual(TExp_1.unparseTExp(TExp_1.makeProcTExp([TExp_1.makeNumTExp()], TExp_1.makeProcTExp([TExp_1.makeNumTExp()], TExp_1.makeNumTExp()))), "(number -> (number -> number))");
// parse with type annotations
assert.deepEqual(L5_ast_1.parse("(define (a : number) 1)"), L5_ast_1.makeDefineExp(L5_ast_1.makeVarDecl("a", TExp_1.makeNumTExp()), L5_ast_1.makeNumExp(1)));
assert.deepEqual(L5_ast_1.parse("(lambda ((x : number)) : number x)"), L5_ast_1.makeProcExp([L5_ast_1.makeVarDecl("x", TExp_1.makeNumTExp())], [L5_ast_1.makeVarRef("x")], TExp_1.makeNumTExp()));
// L5typeof
assert.deepEqual(L5_typecheck_1.L5typeof("5"), "number");
assert.deepEqual(L5_typecheck_1.L5typeof("#t"), "boolean");
assert.deepEqual(L5_typecheck_1.L5typeof("+"), "(number * number -> number)");
assert.deepEqual(L5_typecheck_1.L5typeof("-"), "(number * number -> number)");
assert.deepEqual(L5_typecheck_1.L5typeof("*"), "(number * number -> number)");
assert.deepEqual(L5_typecheck_1.L5typeof("/"), "(number * number -> number)");
assert.deepEqual(L5_typecheck_1.L5typeof("="), "(number * number -> boolean)");
assert.deepEqual(L5_typecheck_1.L5typeof("<"), "(number * number -> boolean)");
assert.deepEqual(L5_typecheck_1.L5typeof(">"), "(number * number -> boolean)");
assert.deepEqual(L5_typecheck_1.L5typeof("not"), "(boolean -> boolean)");
// typeof varref in a given TEnv
assert.deepEqual(L5_typecheck_1.typeofExp(L5_ast_1.parse("x"), TEnv_1.makeExtendTEnv(["x"], [TExp_1.makeNumTExp()], TEnv_1.makeEmptyTEnv())), TExp_1.makeNumTExp());
// IfExp
assert.deepEqual(L5_typecheck_1.L5typeof("(if (> 1 2) 1 2)"), "number");
assert.deepEqual(L5_typecheck_1.L5typeof("(if (= 1 2) #t #f)"), "boolean");
// ProcExp
assert.deepEqual(L5_typecheck_1.L5typeof("(lambda ((x : number)) : number x)"), "(number -> number)");
assert.deepEqual(L5_typecheck_1.L5typeof("(lambda ((x : number)) : boolean (> x 1))"), "(number -> boolean)");
assert.deepEqual(L5_typecheck_1.L5typeof("(lambda((x : number)) : (number -> number) (lambda((y : number)) : number (* y x)))"), "(number -> (number -> number))");
assert.deepEqual(L5_typecheck_1.L5typeof("(lambda((f : (number -> number))) : number (f 2))"), "((number -> number) -> number)");
assert.deepEqual(L5_typecheck_1.L5typeof("(lambda((x : number)) : number\n                             (let (((y : number) x)) (+ x y)))"), "(number -> number)");
// LetExp
assert.deepEqual(L5_typecheck_1.L5typeof("(let (((x : number) 1)) (* x 2))"), "number");
assert.deepEqual(L5_typecheck_1.L5typeof("(let (((x : number) 1)\n                                 ((y : number) 2))\n                              (lambda((a : number)) : number (+ (* x a) y)))"), "(number -> number)");
// Letrec
assert.deepEqual(L5_typecheck_1.L5typeof("(letrec (((p1 : (number -> number)) (lambda((x : number)) : number (* x x))))\n                             p1)"), "(number -> number)");
assert.deepEqual(L5_typecheck_1.L5typeof("(letrec (((p1 : (number -> number)) (lambda((x : number)) : number (* x x))))\n                             (p1 2))"), "number");
assert.deepEqual(L5_typecheck_1.L5typeof("(letrec (((odd? : (number -> boolean)) (lambda((n : number)) : boolean\n                                                                    (if (= n 0) #f (even? (- n 1)))))\n                                    ((even? : (number -> boolean)) (lambda((n : number)) : boolean\n                                                                     (if (= n 0) #t (odd? (- n 1))))))\n                    (odd? 12))"), "boolean");
// define
assert.deepEqual(L5_typecheck_1.L5typeof("(define (foo : number) 5)"), "void");
assert.deepEqual(L5_typecheck_1.L5typeof("(define (foo : (number * number -> number)) (lambda((x : number) (y : number)) : number (+ x y)))"), "void");
assert.deepEqual(L5_typecheck_1.L5typeof("(define (x : (Empty -> number)) (lambda () : number 1))"), "void");
// Polymorphic tests
assert.deepEqual(L5_typecheck_1.L5typeof("(lambda((x : T1)) : T1 x)"), "(T1 -> T1)");
assert.deepEqual(L5_typecheck_1.L5typeof("(let (((x : number) 1))\n                             (lambda((y : T) (z : T)) : T\n                               (if (> x 2) y z)))"), "(T * T -> T)");
assert.deepEqual(L5_typecheck_1.L5typeof("(lambda () : number 1)"), "(Empty -> number)");
// L5-type-equations-tests
// Setup
exports.verifyTeOfExpr = function (exp, texp) {
    var e = A.parse(exp);
    if (A.isProgram(e)) {
        console.log("Program exps not yet supported");
        return false;
    }
    if (error_1.isError(e)) {
        console.log("Bad expression " + exp + " - " + e);
        return false;
    }
    var expectedType = T.parseTE(texp);
    if (error_1.isError(expectedType)) {
        console.log("Bad expression " + texp + " - " + expectedType);
        return false;
    }
    var computedType = E.inferType(e);
    var ok = T.equivalentTEs(computedType, expectedType);
    if (!ok) {
        console.log("\nExpected type " + T.unparseTExp(expectedType) + "\nComputed type: " + T.unparseTExp(computedType));
    }
    return ok;
};
// Test solve
assert.deepEqual(E.solveEquations([E.makeEquation(T.makeTVar("T1"), T.makeTVar("T2"))]), S.makeSub([T.makeTVar("T1")], [T.makeTVar("T2")]));
assert(exports.verifyTeOfExpr("3", "number"));
assert(exports.verifyTeOfExpr("(+ 1 2)", "number"));
assert(exports.verifyTeOfExpr("(+ (+ 1 2) 3)", "number"));
assert(exports.verifyTeOfExpr("+", "(number * number -> number)"));
assert(exports.verifyTeOfExpr(">", "(number * number -> boolean)"));
assert(exports.verifyTeOfExpr("(> 1 2)", "boolean"));
assert(exports.verifyTeOfExpr("(> (+ 1 2) 2)", "boolean"));
assert(exports.verifyTeOfExpr("(lambda (x) (+ x 1))", "(number -> number)"));
assert(exports.verifyTeOfExpr("((lambda (x) (+ x 1)) 3)", "number"));
assert(exports.verifyTeOfExpr("(lambda (x) (x 1))", "((number -> T) -> T)"));
// g: [T1->T2]
// f: [T2->T3]
// ==> (lambda(n) (f (g n)))               : [T1->T3]
// ==> (lambda(f g) (lambda(n) (f (g n)))) : [[T2-T3]*[T1->T2]->[T1->T3]]
assert(exports.verifyTeOfExpr("(lambda (f g) (lambda (n) (f (g n))))", "((T2 -> T3) * (T1 -> T2) -> (T1 -> T3))"));
// f: [N->N]
// ==> (lambda(x) (- (f 3) (f x)))             : [N->N]
// ==> (lambda(f) (lambda(x) (- (f 3) (f x)))) : [[N->N]->[N->N]]
assert(exports.verifyTeOfExpr("(lambda (f) (lambda (x) (- (f 3) (f x))))", "((number -> number) -> (number -> number))"));
assert(exports.verifyTeOfExpr("(lambda (x) (+ (+ x 1) (+ x 1)))", "(number -> number)"));
assert(exports.verifyTeOfExpr("(lambda () (lambda (x) (+ (+ x 1) (+ x 1))))", "(Empty -> (number -> number))"));
assert(exports.verifyTeOfExpr("((lambda (x) (x 1 2)) +)", "number"));
assert(exports.verifyTeOfExpr("((lambda (x) (x 1)) (lambda (y) y))", "number"));
// Circular types cannot be inferred
assert(exports.verifyTeOfExpr("(lambda (x) (x x))", "T"));
// A free variable cannot have type inferred
assert(exports.verifyTeOfExpr("x", "T"));
// A free variable whose type is inferred from context
assert(exports.verifyTeOfExpr("(+ x 1)", "number"));
// Not enough info in context to infer type of f
assert(exports.verifyTeOfExpr("(f 1)", "T"));
// Primitive provides sufficient info
assert(exports.verifyTeOfExpr("(> (f 1) 0)", "boolean"));
// Parameters that are not used
assert(exports.verifyTeOfExpr("(lambda (x) 1)", "(T -> number)"));
assert(exports.verifyTeOfExpr("(lambda (x y) x)", "(T1 * T2 -> T1)"));
assert(exports.verifyTeOfExpr("((lambda (x) 1) 2)", "number"));
// Bad number of parameters
// Extra param
assert(exports.verifyTeOfExpr("((lambda () 1) 2)", "Error"));
// Missing param
assert(exports.verifyTeOfExpr("((lambda (x) 1))", "Error"));
// ---------------------------------------------------------------------------------------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------------------------------------------------------
// parse check
assert.deepEqual(TExp_1.parseTE("(Pair number number)"), TExp_1.makePairTExp(TExp_1.makeNumTExp(), TExp_1.makeNumTExp()));
assert.deepEqual(TExp_1.parseTE("(Pair number number)"), TExp_1.makePairTExp(TExp_1.makeNumTExp(), TExp_1.makeNumTExp()));
assert.deepEqual(TExp_1.parseTE("(Pair boolean number)"), TExp_1.makePairTExp(TExp_1.makeBoolTExp(), TExp_1.makeNumTExp()));
assert.deepEqual(TExp_1.parseTE("(Pair boolean boolean)"), TExp_1.makePairTExp(TExp_1.makeBoolTExp(), TExp_1.makeBoolTExp()));
assert.deepEqual(TExp_1.parseTE("(Pair T1 boolean)"), TExp_1.makePairTExp(TExp_1.makeTVar("T1"), TExp_1.makeBoolTExp()));
assert.deepEqual(TExp_1.parseTE("(Pair T1 T2)"), TExp_1.makePairTExp(TExp_1.makeTVar("T1"), TExp_1.makeTVar("T2")));
assert.deepEqual(TExp_1.parseTE("(Pair T1 (number * number -> T1))"), TExp_1.makePairTExp(TExp_1.makeTVar("T1"), TExp_1.makeProcTExp([TExp_1.makeNumTExp(), TExp_1.makeNumTExp()], TExp_1.makeTVar("T1"))));
assert.deepEqual(TExp_1.parseTE("(Pair (boolean * boolean -> T2) (number * number -> T1))"), TExp_1.makePairTExp(TExp_1.makeProcTExp([TExp_1.makeBoolTExp(), TExp_1.makeBoolTExp()], TExp_1.makeTVar("T2")), TExp_1.makeProcTExp([TExp_1.makeNumTExp(), TExp_1.makeNumTExp()], TExp_1.makeTVar("T1"))));
// unparse check
assert.deepEqual(TExp_1.unparseTExp(TExp_1.makePairTExp(TExp_1.makeNumTExp(), TExp_1.makeNumTExp())), "(Pair number number)");
assert.deepEqual(TExp_1.unparseTExp(TExp_1.makePairTExp(TExp_1.makeNumTExp(), TExp_1.makeNumTExp())), "(Pair number number)");
assert.deepEqual(TExp_1.unparseTExp(TExp_1.makePairTExp(TExp_1.makeBoolTExp(), TExp_1.makeNumTExp())), "(Pair boolean number)");
assert.deepEqual(TExp_1.unparseTExp(TExp_1.makePairTExp(TExp_1.makeBoolTExp(), TExp_1.makeBoolTExp())), "(Pair boolean boolean)");
assert.deepEqual(TExp_1.unparseTExp(TExp_1.makePairTExp(TExp_1.makeTVar("T1"), TExp_1.makeBoolTExp())), "(Pair T1 boolean)");
assert.deepEqual(TExp_1.unparseTExp(TExp_1.makePairTExp(TExp_1.makeTVar("T1"), TExp_1.makeTVar("T2"))), "(Pair T1 T2)");
assert.deepEqual(TExp_1.unparseTExp(TExp_1.makePairTExp(TExp_1.makeTVar("T1"), TExp_1.makeProcTExp([TExp_1.makeNumTExp(), TExp_1.makeNumTExp()], TExp_1.makeTVar("T1")))), "(Pair T1 (number * number -> T1))");
assert.deepEqual(TExp_1.unparseTExp(TExp_1.makePairTExp(TExp_1.makeProcTExp([TExp_1.makeBoolTExp(), TExp_1.makeBoolTExp()], TExp_1.makeTVar("T2")), TExp_1.makeProcTExp([TExp_1.makeNumTExp(), TExp_1.makeNumTExp()], TExp_1.makeTVar("T1")))), "(Pair (boolean * boolean -> T2) (number * number -> T1))");
// matching pair check
assert.deepEqual(T.matchTVarsInTE(TExp_1.parseTE("(Pair number number)"), TExp_1.parseTE("(Pair number number)"), function (x) { return x; }, function () { return false; }), []);
assert.deepEqual(T.matchTVarsInTE(TExp_1.parseTE("(Pair number boolean)"), TExp_1.parseTE("(Pair number number)"), function (x) { return x; }, function () { return false; }), false);
assert.deepEqual(T.matchTVarsInTE(TExp_1.parseTE("(Pair number boolean)"), TExp_1.parseTE("(Pair number boolean)"), function (x) { return x; }, function () { return false; }), []);
assert.deepEqual(T.matchTVarsInTE(TExp_1.parseTE("(Pair boolean boolean)"), TExp_1.parseTE("(Pair number boolean)"), function (x) { return x; }, function () { return false; }), false);
assert.deepEqual(T.matchTVarsInTE(TExp_1.parseTE("(Pair boolean boolean)"), TExp_1.parseTE("(Pair boolean boolean)"), function (x) { return x; }, function () { return false; }), []);
assert.deepEqual(T.matchTVarsInTE(TExp_1.parseTE("(Pair T2 boolean)"), TExp_1.parseTE("(Pair T2 boolean)"), function (x) { return x; }, function () { return false; }), []);
assert.deepEqual(T.matchTVarsInTE(TExp_1.parseTE("(Pair T2 boolean)"), TExp_1.parseTE("(Pair T3 boolean)"), function (x) { return x; }, function () { return false; }), [{ left: TExp_1.makeTVar("T2"), right: TExp_1.makeTVar("T3") }]);
assert.deepEqual(T.matchTVarsInTE(TExp_1.parseTE("(Pair T2 T4)"), TExp_1.parseTE("(Pair T3 T5)"), function (x) { return x; }, function () { return false; }), [{ left: TExp_1.makeTVar("T2"), right: TExp_1.makeTVar("T3") }, { left: TExp_1.makeTVar("T4"), right: TExp_1.makeTVar("T5") }]);
assert.deepEqual(T.matchTVarsInTE(TExp_1.parseTE("(Pair T2 T4)"), TExp_1.parseTE("number"), function (x) { return x; }, function () { return false; }), false);
assert.deepEqual(T.matchTVarsInTE(TExp_1.parseTE("number"), TExp_1.parseTE("(Pair T2 T4)"), function (x) { return x; }, function () { return false; }), false);
assert.deepEqual(T.matchTVarsInTE(TExp_1.parseTE("(Pair T2 T4)"), TExp_1.parseTE("(Pair T3 number)"), function (x) { return x; }, function () { return false; }), false);
assert.deepEqual(T.matchTVarsInTE(TExp_1.parseTE("(Pair number T4)"), TExp_1.parseTE("(Pair T3 T5)"), function (x) { return x; }, function () { return false; }), false);
// check no occurrences
assert.deepEqual(S.checkNoOccurrence(TExp_1.makeTVar("T1"), TExp_1.parseTE("(Pair number number)")), true);
assert.deepEqual(error_1.isError(S.checkNoOccurrence(TExp_1.makeTVar("T1"), TExp_1.parseTE("(Pair T1 number)"))), true);
assert.deepEqual(S.checkNoOccurrence(TExp_1.makeTVar("T1"), TExp_1.parseTE("(Pair boolean boolean)")), true);
assert.deepEqual(error_1.isError(S.checkNoOccurrence(TExp_1.makeTVar("T1"), TExp_1.parseTE("(Pair boolean T1)"))), true);
assert.deepEqual(S.checkNoOccurrence(TExp_1.makeTVar("T1"), TExp_1.parseTE("(Pair boolean T2)")), true);
assert.deepEqual(error_1.isError(S.checkNoOccurrence(TExp_1.makeTVar("T1"), TExp_1.parseTE("(Pair boolean (number * number -> T1))"))), true);
assert.deepEqual(S.checkNoOccurrence(TExp_1.makeTVar("T1"), TExp_1.parseTE("(Pair boolean (number * number -> T2))")), true);
assert.deepEqual(error_1.isError(S.checkNoOccurrence(TExp_1.makeTVar("T1"), TExp_1.parseTE("(Pair (number * T1 -> T2) (number * number -> T2))"))), true);
assert.deepEqual(S.checkNoOccurrence(TExp_1.makeTVar("T1"), TExp_1.parseTE("(Pair (number * T3 -> T2) (number * number -> T2))")), true);
assert.deepEqual(S.checkNoOccurrence(TExp_1.makeTVar("T1"), TExp_1.parseTE("(Pair (number * T3 -> T2) (Pair number boolean))")), true);
assert.deepEqual(error_1.isError(S.checkNoOccurrence(TExp_1.makeTVar("T1"), TExp_1.parseTE("(Pair (number * T3 -> T2) (Pair T1 boolean))"))), true);
// checking apply sub on pairs
assert.deepEqual(TExp_1.unparseTExp(L5_substitution_adt_1.applySub(L5_substitution_adt_1.makeSub([TExp_1.makeTVar("T1")], [TExp_1.parseTE("number")]), TExp_1.parseTE("(Pair number number)"))), "(Pair number number)");
assert.deepEqual(TExp_1.unparseTExp(L5_substitution_adt_1.applySub(L5_substitution_adt_1.makeSub([TExp_1.makeTVar("T1")], [TExp_1.parseTE("number")]), TExp_1.parseTE("(Pair number T1)"))), "(Pair number number)");
assert.deepEqual(TExp_1.unparseTExp(L5_substitution_adt_1.applySub(L5_substitution_adt_1.makeSub([TExp_1.makeTVar("T1")], [TExp_1.parseTE("number")]), TExp_1.parseTE("(Pair number T1)"))), "(Pair number number)");
assert.deepEqual(TExp_1.unparseTExp(L5_substitution_adt_1.applySub(L5_substitution_adt_1.makeSub([TExp_1.makeTVar("T1")], [TExp_1.parseTE("number")]), TExp_1.parseTE("(Pair number T2)"))), "(Pair number T2)");
assert.deepEqual(TExp_1.unparseTExp(L5_substitution_adt_1.applySub(L5_substitution_adt_1.makeSub([TExp_1.makeTVar("T1")], [TExp_1.parseTE("boolean")]), TExp_1.parseTE("(Pair T1 T2)"))), "(Pair boolean T2)");
assert.deepEqual(TExp_1.unparseTExp(L5_substitution_adt_1.applySub(L5_substitution_adt_1.makeSub([TExp_1.makeTVar("T1"), TExp_1.makeTVar("T2")], [TExp_1.parseTE("boolean"), TExp_1.parseTE("number")]), TExp_1.parseTE("(Pair T1 T2)"))), "(Pair boolean number)");
assert.deepEqual(TExp_1.unparseTExp(L5_substitution_adt_1.applySub(L5_substitution_adt_1.makeSub([TExp_1.makeTVar("T1"), TExp_1.makeTVar("T2")], [TExp_1.parseTE("boolean"), TExp_1.parseTE("number")]), TExp_1.parseTE("(Pair T1 T3)"))), "(Pair boolean T3)");
assert.deepEqual(TExp_1.unparseTExp(L5_substitution_adt_1.applySub(L5_substitution_adt_1.makeSub([TExp_1.makeTVar("T1"), TExp_1.makeTVar("T3")], [TExp_1.parseTE("boolean"), TExp_1.parseTE("number")]), TExp_1.parseTE("(Pair T1 T3)"))), "(Pair boolean number)");
assert.deepEqual(TExp_1.unparseTExp(L5_substitution_adt_1.applySub(L5_substitution_adt_1.makeSub([TExp_1.makeTVar("T1"), TExp_1.makeTVar("T3")], [TExp_1.parseTE("(boolean * boolean -> number)"),
    TExp_1.parseTE("number")]), TExp_1.parseTE("(Pair T1 T3)"))), "(Pair (boolean * boolean -> number) number)");
assert.deepEqual(TExp_1.unparseTExp(L5_substitution_adt_1.applySub(L5_substitution_adt_1.makeSub([TExp_1.makeTVar("T1"), TExp_1.makeTVar("T3")], [TExp_1.parseTE("(boolean * boolean -> number)"),
    TExp_1.parseTE("number")]), TExp_1.parseTE("(Pair T1 T3)"))), "(Pair (boolean * boolean -> number) number)");
assert.deepEqual(TExp_1.unparseTExp(L5_substitution_adt_1.applySub(L5_substitution_adt_1.makeSub([TExp_1.makeTVar("T1"), TExp_1.makeTVar("T3")], [TExp_1.parseTE("(Pair number number)"),
    TExp_1.parseTE("number")]), TExp_1.parseTE("(Pair T1 T3)"))), "(Pair (Pair number number) number)");
assert.deepEqual(TExp_1.unparseTExp(L5_substitution_adt_1.applySub(L5_substitution_adt_1.makeSub([TExp_1.makeTVar("T1"), TExp_1.makeTVar("T3")], [TExp_1.parseTE("(Pair number number)"),
    TExp_1.parseTE("(boolean * boolean -> number)")]), TExp_1.parseTE("(Pair T1 T3)"))), "(Pair (Pair number number) (boolean * boolean -> number))");
// checking making equation on quote
var exp = L5_ast_1.parse("(quote (1 . 2))");
var pool = E.expToPool(L5_ast_1.parse("(quote (1 . 2))"));
assert.deepEqual(E.makeEquationFromExp(exp, pool), [E.makeEquation(E.inPool(pool, exp), TExp_1.parseTE("(Pair number number)"))]);
exp = L5_ast_1.parse("(quote ((#f . #t) . 2))");
pool = E.expToPool(L5_ast_1.parse("(quote ((#f . #t) .  2))"));
assert.deepEqual(E.makeEquationFromExp(exp, pool), [E.makeEquation(E.inPool(pool, exp), TExp_1.parseTE("(Pair (Pair boolean boolean) number)"))]);
exp = L5_ast_1.parse("(quote ((#f . #t) . (1 . #t)))");
pool = E.expToPool(L5_ast_1.parse("(quote ((#f . #t) . (1 . #t)))"));
assert.deepEqual(E.makeEquationFromExp(exp, pool), [E.makeEquation(E.inPool(pool, exp), TExp_1.parseTE("(Pair (Pair boolean boolean) (Pair number boolean))"))]);
// chceck quote 
assert.deepEqual(L5_type_equations_1.infer("(quote (1 . 2))"), "(Pair number number)");
assert.deepEqual(L5_type_equations_1.infer("(quote ((#f . #t) . 2))"), "(Pair (Pair boolean boolean) number)");
assert.deepEqual(L5_type_equations_1.infer("(quote ((#f . 5) . 2))"), "(Pair (Pair boolean number) number)");
assert.deepEqual(L5_type_equations_1.infer("(quote ((#f . 5) . (1 . 3)))"), "(Pair (Pair boolean number) (Pair number number))");
assert.deepEqual(L5_type_equations_1.infer("'(1 . 2)"), "(Pair number number)");
assert.deepEqual(L5_type_equations_1.infer("'((#f . #t) . 2)"), "(Pair (Pair boolean boolean) number)");
assert.deepEqual(L5_type_equations_1.infer("'((#f . 5) . 2)"), "(Pair (Pair boolean number) number)");
assert.deepEqual(L5_type_equations_1.infer("'((#f . 5) . (1 . 3))"), "(Pair (Pair boolean number) (Pair number number))");
assert.deepEqual(L5_type_equations_1.infer("(quote (#f . 6))"), "(Pair boolean number)");
// checking unify
assert.deepEqual(L5_type_equations_1.canUnify(E.makeEquation(TExp_1.parseTE("(Pair number number)"), TExp_1.parseTE("(Pair number number)"))), true);
assert.deepEqual(L5_type_equations_1.canUnify(E.makeEquation(TExp_1.parseTE("(Pair boolean number)"), TExp_1.parseTE("(Pair number number)"))), true);
assert.deepEqual(L5_type_equations_1.canUnify(E.makeEquation(TExp_1.parseTE("(Pair boolean number)"), TExp_1.parseTE("(Pair number boolean)"))), true);
assert.deepEqual(L5_type_equations_1.canUnify(E.makeEquation(TExp_1.parseTE("(number -> number)"), TExp_1.parseTE("(number -> number)"))), true);
assert.deepEqual(L5_type_equations_1.canUnify(E.makeEquation(TExp_1.parseTE("(number * number -> number)"), TExp_1.parseTE("(number -> number)"))), false);
assert.deepEqual(L5_type_equations_1.canUnify(E.makeEquation(TExp_1.parseTE("(number * number -> number)"), TExp_1.parseTE("(Pair boolean boolean)"))), false);
assert.deepEqual(L5_type_equations_1.canUnify(E.makeEquation(TExp_1.parseTE("(Pair (Pair number number) number)"), TExp_1.parseTE("(Pair boolean boolean)"))), true);
// checking split
assert.deepEqual(L5_type_equations_1.splitEquation(E.makeEquation(TExp_1.parseTE("(Pair number number)"), TExp_1.parseTE("(Pair number number)"))), [E.makeEquation(TExp_1.parseTE("number"), TExp_1.parseTE("number")), E.makeEquation(TExp_1.parseTE("number"), TExp_1.parseTE("number"))]);
assert.deepEqual(L5_type_equations_1.splitEquation(E.makeEquation(TExp_1.parseTE("(Pair boolean number)"), TExp_1.parseTE("(Pair number number)"))), [E.makeEquation(TExp_1.parseTE("boolean"), TExp_1.parseTE("number")), E.makeEquation(TExp_1.parseTE("number"), TExp_1.parseTE("number"))]);
assert.deepEqual(L5_type_equations_1.splitEquation(E.makeEquation(TExp_1.parseTE("(Pair boolean number)"), TExp_1.parseTE("(Pair number boolean)"))), [E.makeEquation(TExp_1.parseTE("boolean"), TExp_1.parseTE("number")), E.makeEquation(TExp_1.parseTE("number"), TExp_1.parseTE("boolean"))]);
assert.deepEqual(L5_type_equations_1.splitEquation(E.makeEquation(TExp_1.parseTE("(Pair boolean number)"), TExp_1.parseTE("(Pair number boolean)"))), [E.makeEquation(TExp_1.parseTE("boolean"), TExp_1.parseTE("number")), E.makeEquation(TExp_1.parseTE("number"), TExp_1.parseTE("boolean"))]);
assert.deepEqual(L5_type_equations_1.splitEquation(E.makeEquation(TExp_1.parseTE("(Pair (Pair number boolean) number)"), TExp_1.parseTE("(Pair number boolean)"))), [E.makeEquation(TExp_1.parseTE("(Pair number boolean)"), TExp_1.parseTE("number")), E.makeEquation(TExp_1.parseTE("number"), TExp_1.parseTE("boolean"))]);
assert.deepEqual(L5_type_equations_1.splitEquation(E.makeEquation(TExp_1.parseTE("(Pair (Pair number boolean) number)"), TExp_1.parseTE("(Pair number T2)"))), [E.makeEquation(TExp_1.parseTE("(Pair number boolean)"), TExp_1.parseTE("number")), E.makeEquation(TExp_1.parseTE("number"), TExp_1.parseTE("T2"))]);
// checking solve
assert.deepEqual(E.solveEquations([E.makeEquation(TExp_1.parseTE("(Pair number number)"), TExp_1.parseTE("(Pair number number)"))]), S.makeSub([], []));
assert.deepEqual(E.solveEquations([E.makeEquation(TExp_1.parseTE("(Pair T1 number)"), TExp_1.parseTE("(Pair number number)"))]), S.makeSub([T.makeTVar("T1")], [T.makeNumTExp()]));
assert.deepEqual(E.solveEquations([E.makeEquation(TExp_1.parseTE("(Pair T2 boolean)"), TExp_1.parseTE("(Pair number T1)"))]), S.makeSub([T.makeTVar("T1"), T.makeTVar("T2")], [T.makeBoolTExp(), T.makeNumTExp()]));
assert.deepEqual(E.solveEquations([E.makeEquation(TExp_1.parseTE("(Pair (Pair T2 T3) boolean)"), TExp_1.parseTE("(Pair (Pair boolean number) T1)"))]), S.makeSub([T.makeTVar("T3"), T.makeTVar("T2"), T.makeTVar("T1")], [TExp_1.makeNumTExp(), T.makeBoolTExp(), T.makeBoolTExp()]));
assert.deepEqual(E.solveEquations([E.makeEquation(TExp_1.parseTE("(Pair (Pair T2 T3) (Pair number number))"), TExp_1.parseTE("(Pair (Pair boolean number) T1)"))]), S.makeSub([T.makeTVar("T3"), T.makeTVar("T2"), T.makeTVar("T1")], [TExp_1.makeNumTExp(), T.makeBoolTExp(), T.makePairTExp(TExp_1.makeNumTExp(), TExp_1.makeNumTExp())]));
assert.deepEqual(E.solveEquations([E.makeEquation(TExp_1.parseTE("(Pair (Pair T2 T3) (Pair T5 T6))"), TExp_1.parseTE("(Pair (Pair boolean number) (Pair number boolean))"))]), S.makeSub([T.makeTVar("T6"), T.makeTVar("T5"), T.makeTVar("T3"), T.makeTVar("T2")], [T.makeBoolTExp(), TExp_1.makeNumTExp(), TExp_1.makeNumTExp(), T.makeBoolTExp()]));
// checking cons car cdr
assert.deepEqual(L5_type_equations_1.infer("(cons 1 2)"), "(Pair number number)");
assert.deepEqual(L5_type_equations_1.infer("(cons #f 2)"), "(Pair boolean number)");
assert.deepEqual(L5_type_equations_1.infer("(cons #f #t)"), "(Pair boolean boolean)");
assert.deepEqual(L5_type_equations_1.infer("(cons #f #t)"), "(Pair boolean boolean)");
assert.deepEqual(L5_type_equations_1.infer("(car (cons #f #t))"), "boolean");
assert.deepEqual(L5_type_equations_1.infer("(cdr (cons #f 2))"), "number");
assert.deepEqual(L5_type_equations_1.infer("(car (cons '(1 . 2) 2))"), "(Pair number number)");
assert.deepEqual(L5_type_equations_1.infer("(cdr (cons #f (quote (#t . #f))))"), "(Pair boolean boolean)");
// checking infer
assert.deepEqual(L5_type_equations_1.infer("(\n                            ( lambda (x)\n                                   x\n                            )\n                            '(1 . 2)\n                        )"), "(Pair number number)");
assert.deepEqual(L5_type_equations_1.infer("(\n                            ( lambda (x)\n                                (\n                                    ( lambda ((y : (Pair number number)))\n                                        5\n                                    )\n                                    x\n                                )\n                            )\n                            '(1 . 2)\n                        )"), "number");
assert.deepEqual(L5_type_equations_1.infer("(\n                                    ( lambda (x)\n                                        (\n                                            ( lambda ((y : (Pair number number)))\n                                                5\n                                            )\n                                            x\n                                        )\n                                    )\n                                    3\n                                )").startsWith("T_"), true);
assert.deepEqual(L5_type_equations_1.infer("(\n                            ( lambda (x)\n                                (\n                                    ( lambda ((y : ((Pair number number) * (Pair boolean boolean) ->  (Pair boolean number))))\n                                        5\n                                    )\n                                    ( lambda ((w1 : (Pair number number)) (w2 : (Pair boolean boolean)))\n                                        '(#f . 1)\n                                    )\n                                )\n                            )\n                            3\n                        )"), "number");
assert.deepEqual(L5_type_equations_1.infer("(\n                                    ( lambda (x)\n                                        (\n                                            ( lambda ((y : ((Pair number boolean) * (Pair boolean boolean) ->  (Pair boolean number))))\n                                                5\n                                            )\n                                            ( lambda ((w1 : (Pair number number)) (w2 : (Pair boolean boolean)))\n                                                '(#f . 1)\n                                            )\n                                        )\n                                    )\n                                    3\n                                )").startsWith("T_"), true);
assert.deepEqual(L5_type_equations_1.infer("(\n                            ( lambda (x)\n                                (\n                                    ( lambda ((y : ((Pair number boolean) * (Pair boolean boolean) ->  (Pair boolean number))))\n                                        '(1 . 2)\n                                    )\n                                    ( lambda ((w1 : (Pair number boolean)) (w2 : (Pair boolean boolean)))\n                                        '(#f . 1)\n                                    )\n                                )\n                            )\n                            6\n                        )"), "(Pair number number)");
assert.deepEqual(L5_type_equations_1.infer("(\n                            ( lambda (x)\n                                (\n                                    ( lambda ((y : ((Pair number boolean) * (Pair boolean boolean) ->  (Pair boolean number))))\n                                        ( y '(1 . #f) '(#t . #f))\n                                    )\n                                    ( lambda ((w1 : (Pair number boolean)) (w2 : (Pair boolean boolean)))\n                                        '(#f . 1)\n                                    )\n                                )\n                            )\n                            6\n                        )"), "(Pair boolean number)");
assert.deepEqual(L5_type_equations_1.infer("(\n                                    ( lambda (x)\n                                        (\n                                            ( lambda ((y : ((Pair number boolean) * (Pair boolean boolean) ->  (Pair boolean number))))\n                                                ( y '(1 . #f) '(#t . 5))\n                                            )\n                                            ( lambda ((w1 : (Pair number boolean)) (w2 : (Pair boolean boolean)))\n                                                '(#f . 1)\n                                            )\n                                        )\n                                    )\n                                    6\n                                )").startsWith("T_"), true);
assert.deepEqual(L5_type_equations_1.infer("(\n                            ( lambda (x)\n                                (\n                                    ( lambda ((y : ((Pair number boolean) * (Pair boolean number) ->  (Pair boolean number))))\n                                        ( y '(1 . #f) '(#t . 5))\n                                    )\n                                    ( lambda ((w1 : (Pair number boolean)) (w2 : (Pair boolean number)))\n                                        '(#f . 1)\n                                    )\n                                )\n                            )\n                            6\n                        )"), "(Pair boolean number)");
assert.deepEqual(L5_type_equations_1.infer("(\n                                    ( lambda (x)\n                                        (\n                                            ( lambda ((y : ((Pair number boolean) * (Pair boolean number) ->  (Pair number number))))\n                                                ( y '(1 . #f) '(#t . 5))\n                                            )\n                                            ( lambda ((w1 : (Pair number boolean)) (w2 : (Pair boolean number)))\n                                                '(#f . 1)\n                                            )\n                                        )\n                                    )\n                                    6\n                                )").startsWith("T_"), true);
assert.deepEqual(L5_type_equations_1.infer("(\n                                    ( lambda (x)\n                                        (\n                                            ( lambda ((y : ((Pair number boolean) * (Pair boolean number) ->  number)))\n                                                ( y '(1 . #f) '(#t . 5))\n                                            )\n                                            ( lambda ((w1 : (Pair number boolean)) (w2 : (Pair boolean number)))\n                                                '(#f . 1)\n                                            )\n                                        )\n                                    )\n                                    6\n                                )").startsWith("T_"), true);
assert.deepEqual(L5_type_equations_1.infer("(\n                            ( lambda (x)\n                                (\n                                    ( lambda ((y : ((Pair number boolean) * (Pair boolean number) ->  boolean)))\n                                        ( y '(1 . #f) '(#t . 5))\n                                    )\n                                    ( lambda ((w1 : (Pair number boolean)) (w2 : (Pair boolean number)))\n                                        #f\n                                    )\n                                )\n                            )\n                            6\n                        )"), "boolean");
assert.deepEqual(L5_type_equations_1.infer("(\n                            ( lambda (x)\n                                (\n                                    ( lambda ((y : ((Pair number boolean) * (Pair boolean number) ->  boolean)))\n                                        ( y (cons 1 #f) '(#t . 5))\n                                    )\n                                    ( lambda ((w1 : (Pair number boolean)) (w2 : (Pair boolean number)))\n                                        (cdr '(4 . #t))\n                                    )\n                                )\n                            )\n                            6\n                        )"), "boolean");
assert.deepEqual(L5_type_equations_1.infer("(\n                                    ( lambda (x)\n                                        (\n                                            ( lambda ((y : ((Pair number boolean) * (Pair boolean number) ->  boolean)))\n                                                ( y (cons 1 #f) '(#t . 5))\n                                            )\n                                            ( lambda ((w1 : (Pair number boolean)) (w2 : (Pair boolean number)))\n                                                (car '(4 . #t))\n                                            )\n                                        )\n                                    )\n                                    6\n                                )").startsWith("T_"), true);
assert.deepEqual(L5_type_equations_1.infer("(\n                            ( lambda (x)\n                                (\n                                    ( lambda ((y : ((Pair number boolean) * (Pair boolean number) ->  number)))\n                                        ( y (cons 1 #f) '(#t . 5))\n                                    )\n                                    ( lambda ((w1 : (Pair number boolean)) (w2 : (Pair boolean number)))\n                                        (car '(4 . #t))\n                                    )\n                                )\n                            )\n                            6\n                        )"), "number");
//# sourceMappingURL=L5-typecheck-inference-tests.js.map