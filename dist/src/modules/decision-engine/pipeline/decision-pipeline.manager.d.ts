import { RuleRegistryService } from '../registry/rule-registry.service';
import { IDecisionRequest, DecisionResult } from '../interfaces/decision-context.interface';
import { TenantResolverService } from '../../tenant/services/tenant-resolver.service';
export declare class DecisionPipelineManager {
    private readonly ruleRegistry;
    private readonly tenantResolver;
    private readonly logger;
    constructor(ruleRegistry: RuleRegistryService, tenantResolver: TenantResolverService);
    process(request: IDecisionRequest): Promise<DecisionResult>;
}
