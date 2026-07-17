import { Injectable, Logger } from '@nestjs/common';
import { AutomationDsl, DslStep } from '../automation-compiler.service';
import { ExecutionContext } from './execution-context.interface';
import { NodeExecutorService } from './node-executor.service';
import { RuntimeLoggerService } from './runtime-logger.service';

@Injectable()
export class RuntimeEngineService {
  private readonly logger = new Logger(RuntimeEngineService.name);

  constructor(
    private readonly executor: NodeExecutorService,
    private readonly runtimeLogger: RuntimeLoggerService
  ) {}

  parseReactFlowToDsl(reactFlowJson: any): AutomationDsl {
    const nodes = reactFlowJson.nodes || [];
    const edges = reactFlowJson.edges || [];
    
    const steps: DslStep[] = nodes.map((n: any) => {
      const step: DslStep = {
        id: n.id,
        type: n.data?.type || 'event',
        name: n.data?.label || 'Unnamed',
        description: n.data?.description
      };

      const outgoingEdges = edges.filter((e: any) => e.source === n.id);
      
      if (step.type === 'condition') {
        const trueEdge = outgoingEdges.find((e: any) => e.sourceHandle === 'true');
        const falseEdge = outgoingEdges.find((e: any) => e.sourceHandle === 'false');
        if (trueEdge) step.onTrue = trueEdge.target;
        if (falseEdge) step.onFalse = falseEdge.target;
      } else {
        if (outgoingEdges.length > 0) {
          step.next = outgoingEdges[0].target;
        }
      }
      return step;
    });

    return { steps };
  }

  async executeFlow(dsl: AutomationDsl, context: ExecutionContext) {
    this.logger.log(`Iniciando ejecución de flujo para tenant ${context.tenantId} (Session: ${context.sessionId})`);
    
    // Buscar nodo trigger inicial
    const triggerSteps = dsl.steps.filter(s => s.type === 'event');
    let currentStepId: string | null = triggerSteps.length > 0 ? triggerSteps[0].id : null;

    if (!currentStepId) {
      this.logger.warn('No se encontró nodo trigger inicial en el DSL.');
      return;
    }

    const maxSteps = 50; // Prevención de loops infinitos
    let stepsExecuted = 0;

    const stepMap = new Map<string, DslStep>();
    dsl.steps.forEach(s => stepMap.set(s.id, s));

    while (currentStepId && stepsExecuted < maxSteps) {
      const step = stepMap.get(currentStepId);
      if (!step) {
        this.logger.error(`Paso ${currentStepId} no encontrado en el DSL.`);
        break;
      }

      currentStepId = await this.executor.execute(step, context);
      stepsExecuted++;
    }

    this.runtimeLogger.logStep(context.tenantId, context.sessionId, 'END', 'system', `Ejecución finalizada. Pasos ejecutados: ${stepsExecuted}`);
  }
}
