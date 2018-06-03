"use strict";
// ===========================================================
// AST type models for L5
// L5 extends L4 with:
// optional type annotations
Object.defineProperty(exports, "__esModule", { value: true });
var ramda_1 = require("ramda");
var p = require("s-expression");
var L5_value_1 = require("./L5-value");
var TExp_1 = require("./TExp");
var error_1 = require("./error");
var list_1 = require("./list");
exports.isExp = function (x) { return exports.isDefineExp(x) || exports.isCExp(x); };
exports.isCExp = function (x) { return exports.isAtomicExp(x) || exports.isCompoundExp(x); };
exports.isAtomicExp = function (x) {
    return exports.isNumExp(x) || exports.isBoolExp(x) || exports.isStrExp(x) ||
        exports.isPrimOp(x) || exports.isVarRef(x);
};
exports.isCompoundExp = function (x) {
    return exports.isAppExp(x) || exports.isIfExp(x) || exports.isProcExp(x) || exports.isLitExp(x) || exports.isLetExp(x) || exports.isLetrecExp(x) || exports.isSetExp(x);
};
exports.expComponents = function (e) {
    return exports.isIfExp(e) ? [e.test, e.then, e.alt] :
        exports.isProcExp(e) ? e.body :
            exports.isLetExp(e) ? e.body.concat(ramda_1.map(function (b) { return b.val; }, e.bindings)) :
                exports.isLetrecExp(e) ? e.body.concat(ramda_1.map(function (b) { return b.val; }, e.bindings)) :
                    exports.isAppExp(e) ? [e.rator].concat(e.rands) :
                        exports.isSetExp(e) ? [e.val] :
                            exports.isDefineExp(e) ? [e.val] :
                                [];
}; // Atomic expressions have no components
;
exports.makeProgram = function (exps) { return ({ tag: "Program", exps: exps }); };
exports.isProgram = function (x) { return x.tag === "Program"; };
;
exports.makeDefineExp = function (v, val) {
    return ({ tag: "DefineExp", var: v, val: val });
};
exports.isDefineExp = function (x) { return x.tag === "DefineExp"; };
;
exports.makeNumExp = function (n) { return ({ tag: "NumExp", val: n }); };
exports.isNumExp = function (x) { return x.tag === "NumExp"; };
;
exports.makeBoolExp = function (b) { return ({ tag: "BoolExp", val: b }); };
exports.isBoolExp = function (x) { return x.tag === "BoolExp"; };
;
exports.makeStrExp = function (s) { return ({ tag: "StrExp", val: s }); };
exports.isStrExp = function (x) { return x.tag === "StrExp"; };
;
exports.makePrimOp = function (op) { return ({ tag: "PrimOp", op: op }); };
exports.isPrimOp = function (x) { return x.tag === "PrimOp"; };
;
exports.makeVarRef = function (v) { return ({ tag: "VarRef", var: v }); };
exports.isVarRef = function (x) { return x.tag === "VarRef"; };
;
exports.makeVarDecl = function (v, te) { return ({ tag: "VarDecl", var: v, texp: te }); };
exports.isVarDecl = function (x) { return x.tag === "VarDecl"; };
;
exports.makeAppExp = function (rator, rands) {
    return ({ tag: "AppExp", rator: rator, rands: rands });
};
exports.isAppExp = function (x) { return x.tag === "AppExp"; };
;
exports.makeIfExp = function (test, then, alt) {
    return ({ tag: "IfExp", test: test, then: then, alt: alt });
};
exports.isIfExp = function (x) { return x.tag === "IfExp"; };
;
exports.makeProcExp = function (args, body, returnTE) {
    return ({ tag: "ProcExp", args: args, body: body, returnTE: returnTE });
};
exports.isProcExp = function (x) { return x.tag === "ProcExp"; };
;
exports.makeBinding = function (v, val) {
    return ({ tag: "Binding", var: v, val: val });
};
exports.isBinding = function (x) { return x.tag === "Binding"; };
;
exports.makeLetExp = function (bindings, body) {
    return ({ tag: "LetExp", bindings: bindings, body: body });
};
exports.isLetExp = function (x) { return x.tag === "LetExp"; };
;
exports.makeLitExp = function (val) { return ({ tag: "LitExp", val: val }); };
exports.isLitExp = function (x) { return x.tag === "LitExp"; };
;
exports.makeLetrecExp = function (bindings, body) {
    return ({ tag: "LetrecExp", bindings: bindings, body: body });
};
exports.isLetrecExp = function (x) { return x.tag === "LetrecExp"; };
;
exports.makeSetExp = function (v, val) {
    return ({ tag: "SetExp", var: v, val: val });
};
exports.isSetExp = function (x) { return x.tag === "SetExp"; };
// ========================================================
// Parsing utilities
exports.isEmpty = function (x) { return x.length === 0; };
exports.isArray = function (x) { return x instanceof Array; };
exports.isString = function (x) { return typeof x === "string"; };
exports.isNumber = function (x) { return typeof x === "number"; };
exports.isBoolean = function (x) { return typeof x === "boolean"; };
// s-expression returns strings quoted as "a" as [String: 'a'] objects
// to distinguish them from symbols - which are encoded as 'a'
// These are constructed using the new String("a") constructor
// and can be distinguished from regular strings based on the constructor.
exports.isSexpString = function (x) {
    return !exports.isString(x) && x.constructor && x.constructor.name === "String";
};
// A weird method to check that a string is a string encoding of a number
exports.isNumericString = function (x) { return JSON.stringify(+x) === x; };
// ========================================================
// Parsing
exports.parse = function (x) {
    return exports.parseSexp(p(x));
};
exports.parseSexp = function (sexp) {
    return exports.isEmpty(sexp) ? Error("Parse: Unexpected empty") :
        exports.isArray(sexp) ? parseCompound(sexp) :
            exports.isString(sexp) ? exports.parseAtomic(sexp) :
                exports.isSexpString(sexp) ? exports.parseAtomic(sexp) :
                    Error("Parse: Unexpected type " + sexp);
};
exports.parseAtomic = function (sexp) {
    return sexp === "#t" ? exports.makeBoolExp(true) :
        sexp === "#f" ? exports.makeBoolExp(false) :
            exports.isNumericString(sexp) ? exports.makeNumExp(+sexp) :
                exports.isSexpString(sexp) ? exports.makeStrExp(sexp.toString()) :
                    isPrimitiveOp(sexp) ? exports.makePrimOp(sexp) :
                        exports.makeVarRef(sexp);
};
/*
    // <prim-op>  ::= + | - | * | / | < | > | = | not |  eq? | string=?
    //                  | cons | car | cdr | list? | number?
    //                  | boolean? | symbol? | string?
*/
var isPrimitiveOp = function (x) {
    return x === "+" ||
        x === "-" ||
        x === "*" ||
        x === "/" ||
        x === ">" ||
        x === "<" ||
        x === "=" ||
        x === "not" ||
        x === "eq?" ||
        x === "string=?" ||
        x === "cons" ||
        x === "car" ||
        x === "cdr" ||
        x === "list?" ||
        x === "number?" ||
        x === "boolean?" ||
        x === "symbol?" ||
        x === "string?" ||
        x === "display" ||
        x === "newline";
};
var parseCompound = function (sexps) {
    return exports.isEmpty(sexps) ? Error("Unexpected empty sexp") :
        (list_1.first(sexps) === "L5") ? parseProgram(ramda_1.map(exports.parseSexp, list_1.rest(sexps))) :
            (list_1.first(sexps) === "define") ? parseDefine(list_1.rest(sexps)) :
                exports.parseCExp(sexps);
};
var parseProgram = function (es) {
    return exports.isEmpty(es) ? Error("Empty program") :
        list_1.allT(exports.isExp, es) ? exports.makeProgram(es) :
            error_1.hasNoError(es) ? Error("Program cannot be embedded in another program - " + es) :
                Error(error_1.getErrorMessages(es));
};
var safeMakeDefineExp = function (vd, val) {
    return error_1.isError(vd) ? vd :
        error_1.isError(val) ? val :
            exports.makeDefineExp(vd, val);
};
var parseDefine = function (es) {
    return (es.length !== 2) ? Error("define should be (define var val) - " + es) :
        !isConcreteVarDecl(es[0]) ? Error("Expected (define <VarDecl> <CExp>) - " + es[0]) :
            safeMakeDefineExp(exports.parseVarDecl(es[0]), exports.parseCExp(es[1]));
};
exports.parseCExp = function (sexp) {
    return exports.isArray(sexp) ? parseCompoundCExp(sexp) :
        exports.isString(sexp) ? exports.parseAtomic(sexp) :
            exports.isSexpString(sexp) ? exports.parseAtomic(sexp) :
                Error("Unexpected type" + sexp);
};
var parseCompoundCExp = function (sexps) {
    return exports.isEmpty(sexps) ? Error("Unexpected empty") :
        list_1.first(sexps) === "if" ? parseIfExp(sexps) :
            list_1.first(sexps) === "lambda" ? parseProcExp(sexps) :
                list_1.first(sexps) === "let" ? parseLetExp(sexps) :
                    list_1.first(sexps) === "letrec" ? parseLetrecExp(sexps) :
                        list_1.first(sexps) === "set!" ? parseSetExp(sexps) :
                            list_1.first(sexps) === "quote" ? exports.parseLitExp(sexps) :
                                //  first(sexps) === "cons" ? parseConsExp(sexps) :
                                parseAppExp(sexps);
};
// const parseConsExp = (sexps : any[]) : PairTExp | Error =>{
//     let left = sexps[1]
//     let right = sexps[2]
//     let leftT = L5typeof(left)
//     let rightT = L5typeof(right)
//     return makePairTExp(leftT, rightT)
// }
var parseAppExp = function (sexps) {
    return error_1.safeFL(function (cexps) { return exports.makeAppExp(list_1.first(cexps), list_1.rest(cexps)); })(ramda_1.map(exports.parseCExp, sexps));
};
var parseIfExp = function (sexps) {
    return error_1.safeFL(function (cexps) { return exports.makeIfExp(cexps[0], cexps[1], cexps[2]); })(ramda_1.map(exports.parseCExp, list_1.rest(sexps)));
};
// (lambda (<vardecl>*) [: returnTE]? <CExp>+)
var parseProcExp = function (sexps) {
    var args = ramda_1.map(exports.parseVarDecl, sexps[1]);
    var returnTE = (sexps[2] === ":") ? TExp_1.parseTExp(sexps[3]) : TExp_1.makeFreshTVar();
    var body = ramda_1.map(exports.parseCExp, (sexps[2] === ":") ? sexps.slice(4) : sexps.slice(2));
    if (!error_1.hasNoError(args))
        return Error(error_1.getErrorMessages(args));
    else if (!error_1.hasNoError(body))
        return Error(error_1.getErrorMessages(body));
    else if (error_1.isError(returnTE))
        return Error("Bad return type: " + returnTE);
    else
        return exports.makeProcExp(args, body, returnTE);
};
// LetExp ::= (let (<binding>*) <cexp>+)
var parseLetExp = function (sexps) {
    return sexps.length < 3 ? Error("Expected (let (<binding>*) <cexp>+) - " + sexps) :
        safeMakeLetExp(parseBindings(sexps[1]), ramda_1.map(exports.parseCExp, sexps.slice(2)));
};
var safeMakeLetExp = function (bindings, body) {
    return error_1.isError(bindings) ? bindings :
        error_1.hasNoError(body) ? exports.makeLetExp(bindings, body) :
            Error(error_1.getErrorMessages(body));
};
var isConcreteVarDecl = function (sexp) {
    return exports.isString(sexp) ||
        (exports.isArray(sexp) && sexp.length > 2 && exports.isString(sexp[0]) && (sexp[1] === ':'));
};
var safeMakeVarDecl = function (v, te) {
    return error_1.isError(te) ? te :
        exports.makeVarDecl(v, te);
};
exports.parseVarDecl = function (x) {
    return exports.isString(x) ? exports.makeVarDecl(x, TExp_1.makeFreshTVar()) :
        safeMakeVarDecl(x[0], TExp_1.parseTExp(x[2]));
};
exports.parseDecls = function (sexps) {
    return ramda_1.map(exports.parseVarDecl, sexps);
};
var parseBindings = function (pairs) {
    return safeMakeBindings(exports.parseDecls(ramda_1.map(list_1.first, pairs)), ramda_1.map(exports.parseCExp, ramda_1.map(list_1.second, pairs)));
};
var safeMakeBindings = function (decls, vals) {
    return (error_1.hasNoError(vals) && error_1.hasNoError(decls)) ? ramda_1.zipWith(exports.makeBinding, decls, vals) :
        !error_1.hasNoError(vals) ? Error(error_1.getErrorMessages(vals)) :
            Error(error_1.getErrorMessages(decls));
};
// LetrecExp ::= (letrec (<binding>*) <cexp>+)
var parseLetrecExp = function (sexps) {
    return sexps.length < 3 ? Error("Expected (letrec (<binding>*) <cexp>+) - " + sexps) :
        safeMakeLetrecExp(parseBindings(sexps[1]), ramda_1.map(exports.parseCExp, sexps.slice(2)));
};
var safeMakeLetrecExp = function (bindings, body) {
    return error_1.isError(bindings) ? bindings :
        error_1.hasNoError(body) ? exports.makeLetrecExp(bindings, body) :
            Error(error_1.getErrorMessages(body));
};
var parseSetExp = function (es) {
    return (es.length !== 3) ? Error("set! should be (set! var val) - " + es) :
        !exports.isString(es[1]) ? Error("Expected (set! <var> <CExp>) - " + es[1]) :
            error_1.safeF(function (val) { return exports.makeSetExp(exports.makeVarRef(es[1]), val); })(exports.parseCExp(es[2]));
};
exports.parseLitExp = function (sexps) {
    return error_1.safeF(exports.makeLitExp)(exports.parseSExp(list_1.second(sexps)));
};
// x is the output of p (sexp parser)
exports.parseSExp = function (x) {
    return x === "#t" ? true :
        x === "#f" ? false :
            exports.isNumericString(x) ? +x :
                exports.isSexpString(x) ? x.toString() :
                    exports.isString(x) ? L5_value_1.makeSymbolSExp(x) :
                        x.length === 0 ? L5_value_1.makeEmptySExp() :
                            exports.isArray(x) ? L5_value_1.makeCompoundSExp(ramda_1.map(exports.parseSExp, x)) :
                                Error("Bad literal expression: " + x);
};
exports.unparse = function (e) {
    return error_1.isError(e) ? e :
        // NumExp | StrExp | BoolExp | PrimOp | VarRef
        exports.isNumExp(e) ? "" + e.val :
            exports.isStrExp(e) ? "\"" + e.val + "\"" :
                exports.isBoolExp(e) ? (e.val ? "#t" : "#f") :
                    exports.isPrimOp(e) ? e.op :
                        exports.isVarRef(e) ? e.var :
                            // AppExp | IfExp | ProcExp | LetExp | LitExp | LetrecExp | SetExp
                            exports.isAppExp(e) ? "(" + exports.unparse(e.rator) + " " + ramda_1.map(exports.unparse, e.rands).join(" ") + ")" :
                                exports.isIfExp(e) ? "(if " + exports.unparse(e.test) + " " + exports.unparse(e.then) + " " + exports.unparse(e.alt) + ")" :
                                    exports.isLetExp(e) ? "(let (" + unparseBinding(e.bindings) + ") " + ramda_1.map(exports.unparse, e.body).join(" ") + ")" :
                                        exports.isLetrecExp(e) ? "(letrec (" + unparseBinding(e.bindings) + ") " + ramda_1.map(exports.unparse, e.body).join(" ") + ")" :
                                            exports.isProcExp(e) ? "(lambda (" + ramda_1.map(unparseVarDecl, e.args).join(" ") + ")" + unparseReturn(e.returnTE) + " " + ramda_1.map(exports.unparse, e.body).join(" ") + ")" :
                                                exports.isLitExp(e) ? "'" + unparseSExp(e.val) :
                                                    exports.isSetExp(e) ? "(set! " + e.var + " " + exports.unparse(e.val) + ")" :
                                                        // DefineExp | Program
                                                        exports.isDefineExp(e) ? "(define " + unparseVarDecl(e.var) + " " + exports.unparse(e.val) + ")" :
                                                            "(L5 " + ramda_1.map(exports.unparse, e.exps) + ")";
};
var unparseReturn = function (te) {
    return TExp_1.isTVar(te) ? "" :
        " : " + TExp_1.unparseTExp(te);
};
var unparseBinding = function (bindings) {
    return ramda_1.map(function (b) { return "(" + unparseVarDecl(b.var) + " " + exports.unparse(b.val) + ")"; }, bindings).join(" ");
};
var unparseVarDecl = function (vd) {
    return TExp_1.isTVar(vd.texp) ? vd.var :
        "(" + vd.var + " : " + TExp_1.unparseTExp(vd.texp) + ")";
};
//  number | boolean | string | PrimOp | Closure | SymbolSExp | EmptySExp | CompoundSExp
var unparseSExp = function (s) {
    return L5_value_1.isEmptySExp(s) ? "()" :
        L5_value_1.isSymbolSExp(s) ? s.val :
            L5_value_1.isCompoundSExp(s) ? "(" + ramda_1.map(unparseSExp, s.val).join(" ") + ")" :
                L5_value_1.isClosure(s) ? "(#Closure)" :
                    exports.isPrimOp(s) ? s.op :
                        exports.isBoolean(s) ? (s ? "#t" : "#f") :
                            "" + s;
};
//# sourceMappingURL=L5-ast.js.map