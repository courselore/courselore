import { Courselore } from "./index.js";
export interface AdministrationOptions {
    latestVersion?: string;
    userSystemRolesWhoMayCreateCourses: UserSystemRolesWhoMayCreateCourses;
}
export declare type UserSystemRolesWhoMayCreateCourses = typeof userSystemRolesWhoMayCreateCourseses[number];
export declare const userSystemRolesWhoMayCreateCourseses: readonly ["all", "staff-and-administrators", "administrators"];
export declare type SystemRole = typeof systemRoles[number];
export declare const systemRoles: readonly ["none", "staff", "administrator"];
declare const _default: (app: Courselore) => void;
export default _default;
//# sourceMappingURL=administration.d.ts.map