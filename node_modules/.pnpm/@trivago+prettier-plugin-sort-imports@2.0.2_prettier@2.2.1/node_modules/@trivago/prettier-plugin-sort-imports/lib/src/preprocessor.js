"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from) {
    for (var i = 0, il = from.length, j = to.length; i < il; i++, j++)
        to[j] = from[i];
    return to;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.preprocessor = void 0;
var parser_1 = require("@babel/parser");
var traverse_1 = __importDefault(require("@babel/traverse"));
var types_1 = require("@babel/types");
var get_code_from_ast_1 = require("./utils/get-code-from-ast");
var get_sorted_nodes_1 = require("./utils/get-sorted-nodes");
var get_parser_plugins_1 = require("./utils/get-parser-plugins");
function preprocessor(code, options) {
    var importOrder = options.importOrder, importOrderSeparation = options.importOrderSeparation, prettierParser = options.parser, _a = options.experimentalBabelParserPluginsList, experimentalBabelParserPluginsList = _a === void 0 ? [] : _a;
    var plugins = get_parser_plugins_1.getParserPlugins(prettierParser);
    var importNodes = [];
    var parserOptions = {
        sourceType: 'module',
        plugins: __spreadArray(__spreadArray([], plugins), experimentalBabelParserPluginsList),
    };
    var ast = parser_1.parse(code, parserOptions);
    var interpreter = ast.program.interpreter;
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
    // short-circuit if there are no import declaration
    if (importNodes.length === 0)
        return code;
    var allImports = get_sorted_nodes_1.getSortedNodes(importNodes, importOrder, importOrderSeparation);
    return get_code_from_ast_1.getCodeFromAst(allImports, code, interpreter);
}
exports.preprocessor = preprocessor;
