"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CrmModule = void 0;
const common_1 = require("@nestjs/common");
const crm_event_listener_service_1 = require("./services/crm-event-listener.service");
const prisma_contact_repository_1 = require("./services/prisma-contact.repository");
const contact_repository_interface_1 = require("./ports/out/contact-repository.interface");
let CrmModule = class CrmModule {
};
exports.CrmModule = CrmModule;
exports.CrmModule = CrmModule = __decorate([
    (0, common_1.Module)({
        imports: [],
        controllers: [],
        providers: [
            crm_event_listener_service_1.CrmEventListenerService,
            {
                provide: contact_repository_interface_1.CONTACT_REPOSITORY,
                useClass: prisma_contact_repository_1.PrismaContactRepository,
            },
        ],
        exports: [],
    })
], CrmModule);
//# sourceMappingURL=crm.module.js.map