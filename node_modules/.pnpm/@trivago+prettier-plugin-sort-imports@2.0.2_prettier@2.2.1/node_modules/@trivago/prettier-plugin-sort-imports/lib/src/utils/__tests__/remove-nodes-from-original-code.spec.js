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
var __spreadArray = (this && this.__spreadArray) || function (to, from) {
    for (var i = 0, il = from.length, j = to.length; i < il; i++, j++)
        to[j] = from[i];
    return to;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var prettier_1 = require("prettier");
var parser_1 = require("@babel/parser");
var traverse_1 = __importDefault(require("@babel/traverse"));
var types_1 = require("@babel/types");
var get_all_comments_from_nodes_1 = require("../get-all-comments-from-nodes");
var get_sorted_nodes_1 = require("../get-sorted-nodes");
var remove_nodes_from_original_code_1 = require("../remove-nodes-from-original-code");
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
var code = "// first comment\n// second comment\nimport z from 'z';\nimport c from 'c';\nimport g from 'g';\nimport t from 't';\nimport k from 'k';\nimport a from 'a';\n";
test('it should remove nodes from the original code', function () {
    var importNodes = getImportNodes(code);
    var sortedNodes = get_sorted_nodes_1.getSortedNodes(importNodes, [], false);
    var allCommentsFromImports = get_all_comments_from_nodes_1.getAllCommentsFromNodes(sortedNodes);
    var commentAndImportsToRemoveFromCode = __spreadArray(__spreadArray([], sortedNodes), allCommentsFromImports);
    var codeWithoutImportDeclarations = remove_nodes_from_original_code_1.removeNodesFromOriginalCode(code, commentAndImportsToRemoveFromCode);
    var result = prettier_1.format(codeWithoutImportDeclarations, { parser: 'babel' });
    expect(result).toEqual('');
});
