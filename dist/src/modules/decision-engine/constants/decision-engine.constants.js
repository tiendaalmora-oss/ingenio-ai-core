"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RULE_PRIORITIES = exports.DECISION_RULE_TOKEN = void 0;
exports.DECISION_RULE_TOKEN = Symbol('DECISION_RULE_TOKEN');
exports.RULE_PRIORITIES = {
    INFRASTRUCTURE: 10,
    TRIVIAL_FILTERS: 20,
    BUSINESS_CONSTRAINTS: 30,
    DETERMINISTIC_RULES: 40,
    SEMANTIC_CACHE: 50,
};
//# sourceMappingURL=decision-engine.constants.js.map