"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// L5-type-equations
var R = require("ramda");
var A = require("./L5-ast");
var S = require("./L5-substitution-adt");
var TC = require("./L5-typecheck");
var T = require("./TExp");
var error_1 = require("./error");
var list_1 = require("./list");
;
exports.makeEmptyPool = function () { return []; };
exports.isEmptyPool = function (x) { return x.length === 0; };
// Purpose: construct a pool with one additional pair
//          (exp fresh-tvar)
// @Pre: exp is not already in pool.
exports.extendPool = function (exp, pool) {
    return R.prepend({ e: exp, te: T.makeFreshTVar() }, pool);
};
// Purpose: construct a pool with one additional pair
//          ((VarRef var) texp)
//          from a (VarDecl var texp) declaration.
// @Pre: var is not already in pool - which means
// that all bound variables have been renamed with distinct names.
var extendPoolVarDecl = function (vd, pool) {
    return R.prepend({ e: A.makeVarRef(vd.var), te: vd.texp }, pool);
};
exports.inPool = function (pool, e) { return R.prop('te')(R.find(R.propEq('e', e), pool)); };
// Map a function over a list of expressions to accumulate
// matching sub-expressions into a pool.
// fun should construct a new pool given a new expression from exp-list
// that has not yet been seen before.
var mapPool = function (fun, exps, result) {
    return A.isEmpty(exps) ? result :
        mapPool(fun, list_1.rest(exps), exports.inPool(result, list_1.first(exps)) ? result : fun(list_1.first(exps), result));
};
var mapPoolVarDecls = function (fun, vds, result) {
    return A.isEmpty(vds) ? result :
        mapPoolVarDecls(fun, list_1.rest(vds), exports.inPool(result, A.makeVarRef(list_1.first(vds).var)) ? result : fun(list_1.first(vds), result));
};
// Purpose: Traverse the abstract syntax tree L5-exp
//          and collect all sub-expressions into a Pool of fresh type variables.
// Example:
// (ExpToPool parse('(+ x 1)')) =>
// '(((AppExp PrimOp(+) [VarRef(x), NumExp(1)]) TVar(T252722))
//   (NumExp(1) TVar(T252721))
//   (VarRef(x) TVar(T252720))
//   (PrimOp(+) TVar(T252719)))
exports.expToPool = function (exp) {
    var findVars = function (e, pool) {
        return A.isAtomicExp(e) ? exports.extendPool(e, pool) :
            A.isProcExp(e) ? exports.extendPool(e, mapPool(findVars, e.body, mapPoolVarDecls(extendPoolVarDecl, e.args, pool))) :
                A.isCompoundExp(e) ? exports.extendPool(e, mapPool(findVars, A.expComponents(e), pool)) :
                    exports.makeEmptyPool();
    };
    return findVars(exp, exports.makeEmptyPool());
};
;
exports.makeEquation = function (l, r) { return ({ left: l, right: r }); };
// Constructor for equations for a Scheme expression:
// this constructor implements the second step of the type-inference-equations
// algorithm -- derive equations for all composite sub expressions of a
// given L5 expression. Its input is a pool of pairs (L5-exp Tvar).
// A Scheme expression is mapped to a pool with L5-exp->pool
// Signature: poolToEquations(pool)
// Purpose: Return a set of equations for a given Exp encoded as a pool
// Type: [Pool -> List(Equation)]
// @Pre: pool is the result of expTopool(exp)
exports.poolToEquations = function (pool) {
    // VarRef generate no equations beyond that of var-decl - remove them.
    var poolWithoutVars = R.filter(R.propSatisfies(R.complement(A.isVarRef), 'e'), pool);
    return R.chain(function (e) { return exports.makeEquationFromExp(e, pool); }, R.pluck('e', poolWithoutVars));
};
// Signature: make-equation-from-exp(exp, pool)
// Purpose: Return a single equation
// @Pre: exp is a member of pool
exports.makeEquationFromExp = function (exp, pool) {
    // The type of procedure is (T1 * ... * Tn -> Te)
    // where Te is the type of the last exp in the body of the proc.
    // and   Ti is the type of each of the parameters.
    // No need to traverse the other body expressions - they will be
    // traversed by the overall loop of pool->equations
    return A.isProcExp(exp) ? [exports.makeEquation(exports.inPool(pool, exp), T.makeProcTExp(R.map(function (vd) { return vd.texp; }, exp.args), exports.inPool(pool, R.last(exp.body))))] :
        // An application must respect the type of its operator
        // Type(Operator) = [T1 * .. * Tn -> Te]
        // Type(Application) = Te
        A.isAppExp(exp) ? [exports.makeEquation(exports.inPool(pool, exp.rator), T.makeProcTExp(R.map(function (e) { return exports.inPool(pool, e); }, exp.rands), exports.inPool(pool, exp)))] :
            // The type of a number is Number
            A.isNumExp(exp) ? [exports.makeEquation(exports.inPool(pool, exp), T.makeNumTExp())] :
                // The type of a boolean is Boolean
                A.isBoolExp(exp) ? [exports.makeEquation(exports.inPool(pool, exp), T.makeBoolTExp())] :
                    // The type of a primitive procedure is given by the primitive.
                    A.isPrimOp(exp) ? [exports.makeEquation(exports.inPool(pool, exp), error_1.trust(TC.typeofPrim(exp)))] :
                        [];
}; // Error(`makeEquationFromExp: Unsupported exp ${exp}`)
// ========================================================
// Signature: inferType(exp)
// Purpose: Infer the type of an expression using the equations method
// Example: unparseTExp(inferType(parse('(lambda (f x) (f (f x)))')))
//          ==> '((T_1 -> T_1) * T_1 -> T_1)'
exports.inferType = function (exp) {
    // console.log(`Infer ${A.unparse(exp)}`)
    var pool = exports.expToPool(exp);
    // console.log(`Pool ${JSON.stringify(pool)}`);
    var equations = exports.poolToEquations(pool);
    // console.log(`Equations ${JSON.stringify(equations)}`);
    var sub = exports.solveEquations(equations);
    // console.log(`Sub ${JSON.stringify(sub)}`);
    var texp = exports.inPool(pool, exp);
    // console.log(`TExp = ${T.unparseTExp(texp)}`);
    if (T.isTVar(texp) && !error_1.isError(sub))
        return S.subGet(sub, texp);
    else
        return texp;
};
// Type: [Concrete-Exp -> Concrete-TExp]
exports.infer = function (exp) {
    var p = A.parse(exp);
    return A.isExp(p) ? error_1.safeF(T.unparseTExp)(error_1.safeF(exports.inferType)(p)) :
        Error('Unsupported exp: ${p}');
};
// ========================================================
// type equation solving
// Signature: solveEquations(equations)
// Purpose: Solve the type equations and return the resulting substitution
//          or error, if not solvable
// Type: [List(Equation) -> Sub | Error]
// Example: solveEquations(
//            poolToEquations(
//              expToPool(
//                parse('((lambda (x) (x 11)) (lambda (y) y))')))) => sub
exports.solveEquations = function (equations) {
    return solve(equations, S.makeEmptySub());
};
// Signature: solve(equations, substitution)
// Purpose: Solve the equations, starting from a given substitution.
//          Returns the resulting substitution, or error, if not solvable
var solve = function (equations, sub) {
    var solveVarEq = function (tvar, texp) {
        var sub2 = S.extendSub(sub, tvar, texp);
        return error_1.isError(sub2) ? sub2 : solve(list_1.rest(equations), sub2);
    };
    var bothSidesAtomic = function (eq) {
        return T.isAtomicTExp(eq.left) && T.isAtomicTExp(eq.right);
    };
    var handleBothSidesAtomic = function (eq) {
        return (T.isAtomicTExp(eq.left) && T.isAtomicTExp(eq.right) && T.eqAtomicTExp(eq.left, eq.right)) ?
            solve(list_1.rest(equations), sub) :
            Error("Equation with non-equal atomic type " + eq);
    };
    if (A.isEmpty(equations))
        return sub;
    var eq = exports.makeEquation(S.applySub(sub, list_1.first(equations).left), S.applySub(sub, list_1.first(equations).right));
    return T.isTVar(eq.left) ? solveVarEq(eq.left, eq.right) :
        T.isTVar(eq.right) ? solveVarEq(eq.right, eq.left) :
            bothSidesAtomic(eq) ? handleBothSidesAtomic(eq) :
                (T.isCompoundTExp(eq.left) && T.isCompoundTExp(eq.right) && canUnify(eq)) ?
                    solve(R.concat(list_1.rest(equations), splitEquation(eq)), sub) :
                    Error("Equation contains incompatible types " + eq);
};
// Signature: canUnify(equation)
// Purpose: Compare the structure of the type expressions of the equation
var canUnify = function (eq) {
    return T.isProcTExp(eq.left) && T.isProcTExp(eq.right) &&
        (eq.left.paramTEs.length === eq.right.paramTEs.length);
};
// Signature: splitEquation(equation)
// Purpose: For an equation with unifyable type expressions,
//          create equations for corresponding components.
// Type: [Equation -> List(Equation)]
// Example: splitEquation(
//            makeEquation(parseTExp('(T1 -> T2)'),
//                         parseTExp('(T3 -> (T4 -> T4))')) =>
//            [ {left:T2, right: (T4 -> T4)},
//              {left:T3, right: T1)} ]
// @Pre: isCompoundExp(eq.left) && isCompoundExp(eq.right) && canUnify(eq)
var splitEquation = function (eq) {
    return (T.isProcTExp(eq.left) && T.isProcTExp(eq.right)) ?
        R.zipWith(exports.makeEquation, R.prepend(eq.left.returnTE, eq.left.paramTEs), R.prepend(eq.right.returnTE, eq.right.paramTEs)) :
        [];
};
//# sourceMappingURL=L5-type-equations.js.map