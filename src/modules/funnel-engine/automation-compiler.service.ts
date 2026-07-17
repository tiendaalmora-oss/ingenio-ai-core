import { Injectable, Logger } from '@nestjs/common';

export interface DslStep {
  id: string;
  type: string; // event, ai, crm, whatsapp, skill, automation, condition, end
  name: string;
  description?: string;
  next?: string;
  onTrue?: string;
  onFalse?: string;
}

export interface AutomationDsl {
  steps: DslStep[];
}

@Injectable()
export class AutomationCompilerService {
  private readonly logger = new Logger(AutomationCompilerService.name);

  compileToReactFlow(dsl: AutomationDsl): any {
    this.logger.log('Compilando DSL a React Flow JSON...');

    const nodes: any[] = [];
    const edges: any[] = [];
    
    if (!dsl.steps || dsl.steps.length === 0) {
      return { nodes, edges };
    }

    // Encuentra el nodo trigger (el que no es next/onTrue/onFalse de nadie)
    const referencedIds = new Set<string>();
    dsl.steps.forEach(s => {
      if (s.next) referencedIds.add(s.next);
      if (s.onTrue) referencedIds.add(s.onTrue);
      if (s.onFalse) referencedIds.add(s.onFalse);
    });

    const triggerNode = dsl.steps.find(s => !referencedIds.has(s.id)) || dsl.steps[0];

    const stepMap = new Map<string, DslStep>();
    dsl.steps.forEach(s => stepMap.set(s.id, s));

    // Layouting simple recursivo
    const positionMap = new Map<string, { x: number, y: number }>();

    const calculatePositions = (stepId: string, currentX: number, currentY: number) => {
      if (positionMap.has(stepId)) return;

      positionMap.set(stepId, { x: currentX, y: currentY });
      const step = stepMap.get(stepId);
      if (!step) return;

      if (step.type === 'condition') {
        if (step.onTrue) calculatePositions(step.onTrue, currentX - 250, currentY + 160);
        if (step.onFalse) calculatePositions(step.onFalse, currentX + 250, currentY + 160);
      } else {
        if (step.next) calculatePositions(step.next, currentX, currentY + 160);
      }
    };

    calculatePositions(triggerNode.id, 250, 50);

    // Construir Nodes y Edges
    dsl.steps.forEach(step => {
      const pos = positionMap.get(step.id) || { x: 250, y: 50 };

      // Node
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

      // Edges
      if (step.type === 'condition') {
        if (step.onTrue) {
          edges.push({ id: `e-${step.id}-${step.onTrue}`, source: step.id, target: step.onTrue, sourceHandle: 'true' });
        }
        if (step.onFalse) {
          edges.push({ id: `e-${step.id}-${step.onFalse}`, source: step.id, target: step.onFalse, sourceHandle: 'false' });
        }
      } else {
        if (step.next) {
          edges.push({ id: `e-${step.id}-${step.next}`, source: step.id, target: step.next });
        }
      }
    });

    return { nodes, edges };
  }
}
