"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// L5-typecheck
// ========================================================
var deepEqual = require("deep-equal");
var ramda_1 = require("ramda");
var L5_ast_1 = require("./L5-ast");
var TEnv_1 = require("./TEnv");
// import { isEmpty, isLetrecExp, isLitExp, isStrExp, BoolExp } from "./L5-ast";
var TExp_1 = require("./TExp");
var error_1 = require("./error");
var list_1 = require("./list");
// Purpose: Check that type expressions are equivalent
// as part of a fully-annotated type check process of exp.
// Return an error if the types are different - true otherwise.
// Exp is only passed for documentation purposes.
var checkEqualType = function (te1, te2, exp) {
    return error_1.isError(te1) ? te1 :
        error_1.isError(te2) ? te2 :
            deepEqual(te1, te2) ||
                Error("Incompatible types: " + TExp_1.unparseTExp(te1) + " and " + TExp_1.unparseTExp(te2) + " in " + L5_ast_1.unparse(exp));
};
// Compute the type of L5 AST exps to TE
// ===============================================
// Compute a Typed-L5 AST exp to a Texp on the basis
// of its structure and the annotations it contains.
// Purpose: Compute the type of a concrete fully-typed expression
exports.L5typeof = function (concreteExp) {
    return TExp_1.unparseTExp(exports.typeofExp(L5_ast_1.parse(concreteExp), TEnv_1.makeEmptyTEnv()));
};
// Purpose: Compute the type of an expression
// Traverse the AST and check the type according to the exp type.
// We assume that all variables and procedures have been explicitly typed in the program.
exports.typeofExp = function (exp, tenv) {
    return L5_ast_1.isNumExp(exp) ? exports.typeofNum(exp) :
        L5_ast_1.isBoolExp(exp) ? exports.typeofBool(exp) :
            L5_ast_1.isStrExp(exp) ? typeofStr(exp) :
                L5_ast_1.isPrimOp(exp) ? exports.typeofPrim(exp) :
                    L5_ast_1.isVarRef(exp) ? TEnv_1.applyTEnv(tenv, exp.var) :
                        L5_ast_1.isIfExp(exp) ? exports.typeofIf(exp, tenv) :
                            L5_ast_1.isProcExp(exp) ? exports.typeofProc(exp, tenv) :
                                L5_ast_1.isAppExp(exp) ? exports.typeofApp(exp, tenv) :
                                    L5_ast_1.isLetExp(exp) ? exports.typeofLet(exp, tenv) :
                                        L5_ast_1.isLetrecExp(exp) ? exports.typeofLetrec(exp, tenv) :
                                            L5_ast_1.isDefineExp(exp) ? exports.typeofDefine(exp, tenv) :
                                                L5_ast_1.isProgram(exp) ? exports.typeofProgram(exp, tenv) :
                                                    // Skip isSetExp(exp) isLitExp(exp)
                                                    Error("Unknown type");
};
// Purpose: Compute the type of a sequence of expressions
// Check all the exps in a sequence - return type of last.
// Pre-conditions: exps is not empty.
exports.typeofExps = function (exps, tenv) {
    return L5_ast_1.isEmpty(list_1.rest(exps)) ? exports.typeofExp(list_1.first(exps), tenv) :
        error_1.isError(exports.typeofExp(list_1.first(exps), tenv)) ? exports.typeofExp(list_1.first(exps), tenv) :
            exports.typeofExps(list_1.rest(exps), tenv);
};
// a number literal has type num-te
exports.typeofNum = function (n) { return TExp_1.makeNumTExp(); };
// a boolean literal has type bool-te
exports.typeofBool = function (b) { return TExp_1.makeBoolTExp(); };
// a string literal has type str-te
var typeofStr = function (s) { return TExp_1.makeStrTExp(); };
// primitive ops have known proc-te types
var numOpTExp = TExp_1.parseTE('(number * number -> number)');
var numCompTExp = TExp_1.parseTE('(number * number -> boolean)');
var boolOpTExp = TExp_1.parseTE('(boolean * boolean -> boolean)');
var typePredTExp = TExp_1.parseTE('(T -> boolean)');
// Todo: cons, car, cdr
exports.typeofPrim = function (p) {
    return ['+', '-', '*', '/'].includes(p.op) ? numOpTExp :
        ['and', 'or'].includes(p.op) ? boolOpTExp :
            ['>', '<', '='].includes(p.op) ? numCompTExp :
                ['number?', 'boolean?', 'string?', 'symbol?', 'list?'].includes(p.op) ? typePredTExp :
                    (p.op === 'not') ? TExp_1.parseTE('(boolean -> boolean)') :
                        (p.op === 'eq?') ? TExp_1.parseTE('(T1 * T2 -> boolean)') :
                            (p.op === 'string=?') ? TExp_1.parseTE('(T1 * T2 -> boolean)') :
                                (p.op === 'display') ? TExp_1.parseTE('(T -> void)') :
                                    (p.op === 'newline') ? TExp_1.parseTE('(Empty -> void)') :
                                        Error("Unknown primitive " + p.op);
};
// Purpose: compute the type of an if-exp
// Typing rule:
//   if type<test>(tenv) = boolean
//      type<then>(tenv) = t1
//      type<else>(tenv) = t1
// then type<(if test then else)>(tenv) = t1
exports.typeofIf = function (ifExp, tenv) {
    var testTE = exports.typeofExp(ifExp.test, tenv);
    var thenTE = exports.typeofExp(ifExp.then, tenv);
    var altTE = exports.typeofExp(ifExp.alt, tenv);
    var constraint1 = checkEqualType(testTE, TExp_1.makeBoolTExp(), ifExp);
    var constraint2 = checkEqualType(thenTE, altTE, ifExp);
    if (error_1.isError(constraint1))
        return constraint1;
    else if (error_1.isError(constraint2))
        return constraint2;
    else
        return thenTE;
};
// Purpose: compute the type of a proc-exp
// Typing rule:
// If   type<body>(extend-tenv(x1=t1,...,xn=tn; tenv)) = t
// then type<lambda (x1:t1,...,xn:tn) : t exp)>(tenv) = (t1 * ... * tn -> t)
exports.typeofProc = function (proc, tenv) {
    var argsTEs = ramda_1.map(function (vd) { return vd.texp; }, proc.args);
    var extTEnv = TEnv_1.makeExtendTEnv(ramda_1.map(function (vd) { return vd.var; }, proc.args), argsTEs, tenv);
    var constraint1 = checkEqualType(exports.typeofExps(proc.body, extTEnv), proc.returnTE, proc);
    if (error_1.isError(constraint1))
        return constraint1;
    else
        return TExp_1.makeProcTExp(argsTEs, proc.returnTE);
};
// Purpose: compute the type of an app-exp
// Typing rule:
// If   type<rator>(tenv) = (t1*..*tn -> t)
//      type<rand1>(tenv) = t1
//      ...
//      type<randn>(tenv) = tn
// then type<(rator rand1...randn)>(tenv) = t
// We also check the correct number of arguments is passed.
exports.typeofApp = function (app, tenv) {
    var ratorTE = exports.typeofExp(app.rator, tenv);
    if (!TExp_1.isProcTExp(ratorTE))
        return Error("Application of non-procedure: " + TExp_1.unparseTExp(ratorTE) + " in " + L5_ast_1.unparse(app));
    if (app.rands.length !== ratorTE.paramTEs.length)
        return Error("Wrong parameter numbers passed to proc: " + L5_ast_1.unparse(app));
    var constraints = ramda_1.zipWith(function (rand, trand) { return checkEqualType(exports.typeofExp(rand, tenv), trand, app); }, app.rands, ratorTE.paramTEs);
    if (error_1.hasNoError(constraints))
        return ratorTE.returnTE;
    else
        return Error(error_1.getErrorMessages(constraints));
};
// Purpose: compute the type of a let-exp
// Typing rule:
// If   type<val1>(tenv) = t1
//      ...
//      type<valn>(tenv) = tn
//      type<body>(extend-tenv(var1=t1,..,varn=tn; tenv)) = t
// then type<let ((var1 val1) .. (varn valn)) body>(tenv) = t
exports.typeofLet = function (exp, tenv) {
    var vars = ramda_1.map(function (b) { return b.var.var; }, exp.bindings);
    var vals = ramda_1.map(function (b) { return b.val; }, exp.bindings);
    var varTEs = ramda_1.map(function (b) { return b.var.texp; }, exp.bindings);
    var constraints = ramda_1.zipWith(function (varTE, val) { return checkEqualType(varTE, exports.typeofExp(val, tenv), exp); }, varTEs, vals);
    if (error_1.hasNoError(constraints))
        return exports.typeofExps(exp.body, TEnv_1.makeExtendTEnv(vars, varTEs, tenv));
    else
        return Error(error_1.getErrorMessages(constraints));
};
// Purpose: compute the type of a letrec-exp
// We make the same assumption as in L4 that letrec only binds proc values.
// Typing rule:
//   (letrec((p1 (lambda (x11 ... x1n1) body1)) ...) body)
//   tenv-body = extend-tenv(p1=(t11*..*t1n1->t1)....; tenv)
//   tenvi = extend-tenv(xi1=ti1,..,xini=tini; tenv-body)
// If   type<body1>(tenv1) = t1
//      ...
//      type<bodyn>(tenvn) = tn
//      type<body>(tenv-body) = t
// then type<(letrec((p1 (lambda (x11 ... x1n1) body1)) ...) body)>(tenv-body) = t
exports.typeofLetrec = function (exp, tenv) {
    var ps = ramda_1.map(function (b) { return b.var.var; }, exp.bindings);
    var procs = ramda_1.map(function (b) { return b.val; }, exp.bindings);
    if (!list_1.allT(L5_ast_1.isProcExp, procs))
        return Error("letrec - only support binding of procedures - " + exp);
    var paramss = ramda_1.map(function (p) { return p.args; }, procs);
    var bodies = ramda_1.map(function (p) { return p.body; }, procs);
    var tijs = ramda_1.map(function (params) { return ramda_1.map(function (p) { return p.texp; }, params); }, paramss);
    var tis = ramda_1.map(function (proc) { return proc.returnTE; }, procs);
    var tenvBody = TEnv_1.makeExtendTEnv(ps, ramda_1.zipWith(function (tij, ti) { return TExp_1.makeProcTExp(tij, ti); }, tijs, tis), tenv);
    var tenvIs = ramda_1.zipWith(function (params, tij) { return TEnv_1.makeExtendTEnv(ramda_1.map(function (p) { return p.var; }, params), tij, tenvBody); }, paramss, tijs);
    // Unfortunately ramda.zipWith does not work with 3 params
    var constraints = ramda_1.zipWith(function (bodyI, ti_tenvI) {
        return checkEqualType(exports.typeofExps(bodyI, list_1.second(ti_tenvI)), list_1.first(ti_tenvI), exp);
    }, bodies, ramda_1.zip(tis, tenvIs));
    if (error_1.hasNoError(constraints))
        return exports.typeofExps(exp.body, tenvBody);
    else
        return Error(error_1.getErrorMessages(constraints));
};
// Typecheck a full program
// TODO: Thread the TEnv (as in L1)
// Purpose: compute the type of a define
// Typing rule:
//   (define (var : texp) val)
// TODO - write the true definition
exports.typeofDefine = function (exp, tenv) {
    return exports.isDefineValid(exp, tenv) ?
        TExp_1.makeVoidTExp() :
        TypeError();
};
exports.isDefineValid = function (exp, tenv) {
    var valT = exports.typeofExp(exp.val, tenv);
    return deepEqual(exp.var.texp, exports.typeofExp(exp.val, tenv));
};
// Purpose: compute the type of a program
// Typing rule:
// TODO - write the true definition
exports.typeofProgram = function (exp, tenv) {
    if (exp.exps.length == 1)
        return exports.typeofExp(exp.exps[0], tenv);
    var subProg = L5_ast_1.makeProgram(exp.exps.slice(1));
    if (L5_ast_1.isDefineExp(exp.exps[0])) {
        if (!exports.isDefineValid)
            return TypeError();
        var defineExp = exp.exps[0];
        var varArr = [defineExp.var.var];
        var valT = exports.typeofExp(defineExp.val, tenv);
        if (error_1.isError(valT))
            return valT;
        var valArr = [valT];
        var newEnv = TEnv_1.makeExtendTEnv(varArr, valArr, tenv);
        return exports.typeofProgram(subProg, newEnv);
    }
    return exports.typeofProgram(subProg, tenv);
};
//# sourceMappingURL=L5-typecheck.js.map