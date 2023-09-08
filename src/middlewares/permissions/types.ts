export enum Modules {
  CONFIGS = 'configs',
  ROLES = 'roles',
}

export interface IModuleListItem {
  name: string;
  initials: string;
  key: Modules;
}

export const ModulesList: IModuleListItem[] = [
  {
    name: 'Configurations',
    initials: 'CFG',
    key: Modules.CONFIGS,
  },
  {
    name: 'Roles',
    initials: 'CFG',
    key: Modules.ROLES,
  },
];
