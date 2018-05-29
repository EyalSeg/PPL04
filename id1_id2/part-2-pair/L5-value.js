"use strict";
// ========================================================
// Value type definition for L5
Object.defineProperty(exports, "__esModule", { value: true });
var L5_ast_1 = require("./L5-ast");
exports.isFunctional = function (x) { return L5_ast_1.isPrimOp(x) || exports.isClosure(x); };
;
exports.makeClosure = function (params, body, env) {
    return ({ tag: "Closure", params: params, body: body, env: env });
};
exports.isClosure = function (x) { return x.tag === "Closure"; };
;
;
;
exports.isSExp = function (x) {
    return typeof (x) === 'string' || typeof (x) === 'boolean' || typeof (x) === 'number' ||
        exports.isSymbolSExp(x) || exports.isCompoundSExp(x) || exports.isEmptySExp(x) || L5_ast_1.isPrimOp(x) || exports.isClosure(x);
};
exports.makeCompoundSExp = function (val) {
    return ({ tag: "CompoundSexp", val: val });
};
exports.isCompoundSExp = function (x) { return x.tag === "CompoundSexp"; };
exports.makeEmptySExp = function () { return ({ tag: "EmptySExp" }); };
exports.isEmptySExp = function (x) { return x.tag === "EmptySExp"; };
exports.makeSymbolSExp = function (val) {
    return ({ tag: "SymbolSExp", val: val });
};
exports.isSymbolSExp = function (x) { return x.tag === "SymbolSExp"; };
//# sourceMappingURL=L5-value.js.map