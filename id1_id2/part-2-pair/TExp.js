"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/*
;; TExp AST
;; ========
;; Type checking language
;; Syntax with optional type annotations for var declarations and function return types.

;; Type language
;; <texp>         ::= <atomic-te> | <compound-te> | <tvar> | <pair>
;; <atomic-te>    ::= <num-te> | <bool-te> | <void-te>
;; <num-te>       ::= number   // num-te()
;; <bool-te>      ::= boolean  // bool-te()
;; <str-te>       ::= string   // str-te()
;; <void-te>      ::= void     // void-te()
;; <compound-te>  ::= <proc-te> | <tuple-te>
;; <non-tuple-te> ::= <atomic-te> | <proc-te> | <tvar>
;; <proc-te>      ::= [ <tuple-te> -> <non-tuple-te> ] // proc-te(param-tes: list(te), return-te: te)
;; <tuple-te>     ::= <non-empty-tuple-te> | <empty-te>
;; <non-empty-tuple-te> ::= ( <non-tuple-te> *)* <non-tuple-te> // tuple-te(tes: list(te))
;; <empty-te>     ::= Empty
;; <tvar>         ::= a symbol starting with T // tvar(id: Symbol, contents; Box(string|boolean))
;; <pair>         ::= [<texp> <texp>]

;; Examples of type expressions
;; number
;; boolean
;; void
;; [number -> boolean]
;; [number * number -> boolean]
;; [number -> [number -> boolean]]
;; [Empty -> number]
;; [Empty -> void]
*/
var ramda_1 = require("ramda");
var p = require("s-expression");
var L5_ast_1 = require("./L5-ast");
var box_1 = require("./box");
var error_1 = require("./error");
var list_1 = require("./list");
exports.isTExp = function (x) { return exports.isAtomicTExp(x) || exports.isCompoundTExp(x) || exports.isTVar(x); };
exports.isAtomicTExp = function (x) {
    return exports.isNumTExp(x) || exports.isBoolTExp(x) || exports.isStrTExp(x) || exports.isVoidTExp(x);
};
exports.isCompoundTExp = function (x) { return exports.isProcTExp(x) || exports.isTupleTExp(x); };
exports.isNonTupleTExp = function (x) {
    return exports.isAtomicTExp(x) || exports.isProcTExp(x) || exports.isTVar(x);
};
exports.makeNumTExp = function () { return ({ tag: "NumTExp" }); };
exports.isNumTExp = function (x) { return x.tag === "NumTExp"; };
exports.makeBoolTExp = function () { return ({ tag: "BoolTExp" }); };
exports.isBoolTExp = function (x) { return x.tag === "BoolTExp"; };
exports.makeStrTExp = function () { return ({ tag: "StrTExp" }); };
exports.isStrTExp = function (x) { return x.tag === "StrTExp"; };
exports.makeVoidTExp = function () { return ({ tag: "VoidTExp" }); };
exports.isVoidTExp = function (x) { return x.tag === "VoidTExp"; };
exports.makeProcTExp = function (paramTEs, returnTE) {
    return ({ tag: "ProcTExp", paramTEs: paramTEs, returnTE: returnTE });
};
exports.isProcTExp = function (x) { return x.tag === "ProcTExp"; };
// Uniform access to all components of a ProcTExp
exports.procTExpComponents = function (pt) {
    return pt.paramTEs.concat([pt.returnTE]);
};
exports.makePairTExp = function (leftT, rightT) { return ({ tag: "PairTExp", TLeft: leftT, TRight: rightT }); };
exports.isPairTExp = function (x) { return x.tag === "PairTExp"; };
exports.isTupleTExp = function (x) {
    return exports.isNonEmptyTupleTExp(x) || exports.isEmptyTupleTExp(x);
};
;
exports.makeEmptyTupleTExp = function () { return ({ tag: "EmptyTupleTExp" }); };
exports.isEmptyTupleTExp = function (x) { return x.tag === "EmptyTupleTExp"; };
;
exports.makeNonEmptyTupleTExp = function (tes) {
    return ({ tag: "NonEmptyTupleTExp", TEs: tes });
};
exports.isNonEmptyTupleTExp = function (x) { return x.tag === "NonEmptyTupleTExp"; };
exports.isEmptyTVar = function (x) {
    return (x.tag === "TVar") && box_1.unbox(x.contents) === undefined;
};
exports.makeTVar = function (v) {
    return ({ tag: "TVar", var: v, contents: box_1.makeBox(undefined) });
};
var makeTVarGen = function () {
    var count = 0;
    return function () {
        count++;
        return exports.makeTVar("T_" + count);
    };
};
exports.makeFreshTVar = makeTVarGen();
exports.isTVar = function (x) { return x.tag === "TVar"; };
exports.eqTVar = function (tv1, tv2) { return tv1.var === tv2.var; };
exports.tvarContents = function (tv) { return box_1.unbox(tv.contents); };
exports.tvarSetContents = function (tv, val) {
    return box_1.setBox(tv.contents, val);
};
exports.tvarIsNonEmpty = function (tv) { return exports.tvarContents(tv) !== undefined; };
exports.tvarDeref = function (te) {
    if (!exports.isTVar(te))
        return te;
    var contents = exports.tvarContents(te);
    if (contents === undefined)
        return te;
    else if (exports.isTVar(contents))
        return exports.tvarDeref(contents);
    else
        return contents;
};
// ========================================================
// TExp Utilities
// Purpose: uniform access to atomic types
exports.atomicTExpName = function (te) { return te.tag; };
exports.eqAtomicTExp = function (te1, te2) {
    return exports.atomicTExpName(te1) === exports.atomicTExpName(te2);
};
// ========================================================
// TExp parser
exports.parseTE = function (t) {
    return exports.parseTExp(p(t));
};
/*
;; Purpose: Parse a type expression
;; Type: [SExp -> TEx[]]
;; Example:
;; parseTExp("number") => 'num-te
;; parseTExp('boolean') => 'bool-te
;; parseTExp('T1') => '(tvar T1)
;; parseTExp('(T * T -> boolean)') => '(proc-te ((tvar T) (tvar T)) bool-te)
;; parseTExp('(number -> (number -> number)') => '(proc-te (num-te) (proc-te (num-te) num-te))
*/
exports.parseTExp = function (texp) {
    return (texp === "number") ? exports.makeNumTExp() :
        (texp === "boolean") ? exports.makeBoolTExp() :
            (texp === "void") ? exports.makeVoidTExp() :
                (texp === "string") ? exports.makeStrTExp() :
                    L5_ast_1.isString(texp) ? exports.makeTVar(texp) :
                        L5_ast_1.isArray(texp) ? parseCompoundTExp(texp) :
                            Error("Unexpected TExp - " + texp);
};
/*
;; expected structure: (<params> -> <returnte>)
;; expected exactly one -> in the list
;; We do not accept (a -> b -> c) - must parenthesize
*/
var parseCompoundTExp = function (texps) {
    if (texps[0] = "pair") {
        return exports.makePairTExp(texps[1], texps[2]);
    }
    var pos = texps.indexOf('->');
    return (pos === -1) ? Error("Procedure type expression without -> - " + texps) :
        (pos === 0) ? Error("No param types in proc texp - " + texps) :
            (pos === texps.length - 1) ? Error("No return type in proc texp - " + texps) :
                (texps.slice(pos + 1).indexOf('->') > -1) ? Error("Only one -> allowed in a procexp - " + texps) :
                    safeMakeProcTExp(parseTupleTExp(texps.slice(0, pos)), exports.parseTExp(texps[pos + 1]));
};
var safeMakeProcTExp = function (args, returnTE) {
    return error_1.isError(returnTE) ? returnTE :
        error_1.hasNoError(args) ? exports.makeProcTExp(args, returnTE) :
            Error(error_1.getErrorMessages(args));
};
/*
;; Expected structure: <te1> [* <te2> ... * <ten>]?
;; Or: Empty
*/
var parseTupleTExp = function (texps) {
    var isEmptyTuple = function (x) {
        return (x.length === 1) && (x[0] === 'Empty');
    };
    // [x1 * x2 * ... * xn] => [x1,...,xn]
    var splitEvenOdds = function (x) {
        return L5_ast_1.isEmpty(x) ? [] :
            L5_ast_1.isEmpty(list_1.rest(x)) ? x :
                (x[1] !== '*') ? [Error("Parameters of procedure type must be separated by '*': " + texps)] : [x[0]].concat(splitEvenOdds(x.splice(2)));
    };
    if (isEmptyTuple(texps))
        return [];
    else {
        var argTEs = splitEvenOdds(texps);
        if (error_1.hasNoError(argTEs))
            return ramda_1.map(exports.parseTExp, argTEs);
        else
            return ramda_1.filter(error_1.isError, argTEs);
    }
};
/*
;; Purpose: Unparse a type expression Texp into its concrete form
*/
exports.unparseTExp = function (te) {
    var unparseTuple = function (paramTes) {
        return L5_ast_1.isEmpty(paramTes) ? ["Empty"] : [exports.unparseTExp(paramTes[0])].concat(ramda_1.chain(function (te) { return ['*', exports.unparseTExp(te)]; }, list_1.rest(paramTes)));
    };
    var up = function (x) {
        return error_1.isError(x) ? x :
            exports.isNumTExp(x) ? 'number' :
                exports.isBoolTExp(x) ? 'boolean' :
                    exports.isStrTExp(x) ? 'string' :
                        exports.isVoidTExp(x) ? 'void' :
                            exports.isEmptyTVar(x) ? x.var :
                                exports.isTVar(x) ? up(exports.tvarContents(x)) :
                                    exports.isProcTExp(x) ? unparseTuple(x.paramTEs).concat(['->', exports.unparseTExp(x.returnTE)]) :
                                        ["never"];
    };
    var unparsed = up(te);
    return L5_ast_1.isString(unparsed) ? unparsed :
        error_1.isError(unparsed) ? unparsed :
            L5_ast_1.isArray(unparsed) ? "(" + unparsed.join(' ') + ")" :
                "Error " + unparsed;
};
var matchTVarsInTE = function (te1, te2, succ, fail) {
    return (exports.isTVar(te1) || exports.isTVar(te2)) ? matchTVarsinTVars(exports.tvarDeref(te1), exports.tvarDeref(te2), succ, fail) :
        (exports.isAtomicTExp(te1) || exports.isAtomicTExp(te2)) ?
            ((exports.isAtomicTExp(te1) && exports.isAtomicTExp(te2) && exports.eqAtomicTExp(te1, te2)) ? succ([]) : fail()) :
            matchTVarsInTProcs(te1, te2, succ, fail);
};
// te1 and te2 are the result of tvarDeref
var matchTVarsinTVars = function (te1, te2, succ, fail) {
    return (exports.isTVar(te1) && exports.isTVar(te2)) ? (exports.eqTVar(te1, te2) ? succ([]) : succ([{ left: te1, right: te2 }])) :
        (exports.isTVar(te1) || exports.isTVar(te2)) ? fail() :
            matchTVarsInTE(te1, te2, succ, fail);
};
var matchTVarsInTProcs = function (te1, te2, succ, fail) {
    return (exports.isProcTExp(te1) && exports.isProcTExp(te2)) ? matchTVarsInTEs(exports.procTExpComponents(te1), exports.procTExpComponents(te2), succ, fail) :
        fail();
};
var matchTVarsInTEs = function (te1, te2, succ, fail) {
    return (L5_ast_1.isEmpty(te1) && L5_ast_1.isEmpty(te2)) ? succ([]) :
        (L5_ast_1.isEmpty(te1) || L5_ast_1.isEmpty(te2)) ? fail() :
            // Match first then continue on rest
            matchTVarsInTE(list_1.first(te1), list_1.first(te2), function (subFirst) { return matchTVarsInTEs(list_1.rest(te1), list_1.rest(te2), function (subRest) { return succ(ramda_1.concat(subFirst, subRest)); }, fail); }, fail);
};
// Signature: equivalent-tes?(te1, te2)
// Purpose:   Check whether 2 type expressions are equivalent up to
//            type variable renaming.
// Example:  equivalentTEs(parseTExp('(T1 * (Number -> T2) -> T3))',
//                         parseTExp('(T4 * (Number -> T5) -> T6))') => #t
exports.equivalentTEs = function (te1, te2) {
    // console.log(`EqTEs ${JSON.stringify(te1)} - ${JSON.stringify(te2)}`);
    var tvarsPairs = matchTVarsInTE(te1, te2, function (x) { return x; }, function () { return false; });
    // console.log(`EqTEs pairs = ${map(JSON.stringify, tvarsPairs)}`)
    if (L5_ast_1.isBoolean(tvarsPairs))
        return false;
    else {
        var uniquePairs = ramda_1.uniq(tvarsPairs);
        return (ramda_1.uniq(ramda_1.map(function (p) { return p.left.var; }, tvarsPairs)).length === ramda_1.uniq(ramda_1.map(function (p) { return p.right.var; }, tvarsPairs)).length);
    }
};
//# sourceMappingURL=TExp.js.map