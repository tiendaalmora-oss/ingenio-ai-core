"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Contact = void 0;
class Contact {
    id;
    tenantId;
    name;
    phone;
    phoneNormalized;
    externalId;
    constructor(id, tenantId, name, phone, phoneNormalized, externalId) {
        this.id = id;
        this.tenantId = tenantId;
        this.name = name;
        this.phone = phone;
        this.phoneNormalized = phoneNormalized;
        this.externalId = externalId;
    }
}
exports.Contact = Contact;
//# sourceMappingURL=contact.entity.js.map