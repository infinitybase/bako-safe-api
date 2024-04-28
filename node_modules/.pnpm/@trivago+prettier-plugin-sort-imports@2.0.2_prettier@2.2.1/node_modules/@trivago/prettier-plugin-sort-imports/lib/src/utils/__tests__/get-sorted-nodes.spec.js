"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var parser_1 = require("@babel/parser");
var traverse_1 = __importDefault(require("@babel/traverse"));
var types_1 = require("@babel/types");
var get_sorted_nodes_1 = require("../get-sorted-nodes");
var code = "// first comment\n// second comment\nimport z from 'z';\nimport c from 'c';\nimport g from 'g';\nimport t from 't';\nimport k from 'k';\nimport a from 'a';\n";
var getImportNodes = function (code, options) {
    var importNodes = [];
    var ast = parser_1.parse(code, __assign(__assign({}, options), { sourceType: 'module' }));
    traverse_1.default(ast, {
        ImportDeclaration: function (path) {
            var tsModuleParent = path.findParent(function (p) {
                return types_1.isTSModuleDeclaration(p);
            });
            if (!tsModuleParent) {
                importNodes.push(path.node);
            }
        },
    });
    return importNodes;
};
var getSortedNodesNames = function (imports) {
    return imports
        .filter(function (i) { return i.type === 'ImportDeclaration'; })
        .map(function (i) { return i.source.value; });
}; // TODO: get from specifier
test('it returns all sorted nodes', function () {
    var result = getImportNodes(code);
    var sorted = get_sorted_nodes_1.getSortedNodes(result, [], false);
    expect(sorted).toMatchSnapshot();
    expect(getSortedNodesNames(sorted)).toEqual(['a', 'c', 'g', 'k', 't', 'z']);
});
test('it returns all sorted nodes with sort order', function () {
    var result = getImportNodes(code);
    var sorted = get_sorted_nodes_1.getSortedNodes(result, ['^a$', '^t$', '^k$'], true);
    expect(sorted).toMatchSnapshot();
    expect(getSortedNodesNames(sorted)).toEqual(['c', 'g', 'z', 'a', 't', 'k']);
});
