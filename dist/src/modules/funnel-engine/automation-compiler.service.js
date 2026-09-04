"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var AutomationCompilerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutomationCompilerService = void 0;
const common_1 = require("@nestjs/common");
let AutomationCompilerService = AutomationCompilerService_1 = class AutomationCompilerService {
    logger = new common_1.Logger(AutomationCompilerService_1.name);
    compileToReactFlow(dsl) {
        this.logger.log('Compilando DSL a React Flow JSON...');
        const nodes = [];
        const edges = [];
        if (!dsl.steps || dsl.steps.length === 0) {
            return { nodes, edges };
        }
        const referencedIds = new Set();
        dsl.steps.forEach(s => {
            if (s.next)
                referencedIds.add(s.next);
            if (s.onTrue)
                referencedIds.add(s.onTrue);
            if (s.onFalse)
                referencedIds.add(s.onFalse);
        });
        const triggerNode = dsl.steps.find(s => !referencedIds.has(s.id)) || dsl.steps[0];
        const stepMap = new Map();
        dsl.steps.forEach(s => stepMap.set(s.id, s));
        const positionMap = new Map();
        const calculatePositions = (stepId, currentX, currentY) => {
            if (positionMap.has(stepId))
                return;
            positionMap.set(stepId, { x: currentX, y: currentY });
            const step = stepMap.get(stepId);
            if (!step)
                return;
            if (step.type === 'condition') {
                if (step.onTrue)
                    calculatePositions(step.onTrue, currentX - 250, currentY + 160);
                if (step.onFalse)
                    calculatePositions(step.onFalse, currentX + 250, currentY + 160);
            }
            else {
                if (step.next)
                    calculatePositions(step.next, currentX, currentY + 160);
            }
        };
        calculatePositions(triggerNode.id, 250, 50);
        dsl.steps.forEach(step => {
            const pos = positionMap.get(step.id) || { x: 250, y: 50 };
            nodes.push({
                id: step.id,
                type: 'businessNode',
                position: pos,
                data: {
                    type: step.type,
                    category: step.type.toUpperCase(),
                    label: step.name,
                    description: step.description
                }
            });
            if (step.type === 'condition') {
                if (step.onTrue) {
                    edges.push({ id: `e-${step.id}-${step.onTrue}`, source: step.id, target: step.onTrue, sourceHandle: 'true' });
                }
                if (step.onFalse) {
                    edges.push({ id: `e-${step.id}-${step.onFalse}`, source: step.id, target: step.onFalse, sourceHandle: 'false' });
                }
            }
            else {
                if (step.next) {
                    edges.push({ id: `e-${step.id}-${step.next}`, source: step.id, target: step.next });
                }
            }
        });
        return { nodes, edges };
    }
};
exports.AutomationCompilerService = AutomationCompilerService;
exports.AutomationCompilerService = AutomationCompilerService = AutomationCompilerService_1 = __decorate([
    (0, common_1.Injectable)()
], AutomationCompilerService);
//# sourceMappingURL=automation-compiler.service.js.map