import { BaseModel } from './BaseModel'
import { HookStateEntry } from './HookStateEntry'

export type AccountNamespaceHookStateEntry = {
  Flags: number
  HookStateData: string
  HookStateKey: string
  LedgerEntryType: 'HookState'
  OwnerNode: string
  index: string
}

export class HookState<T extends BaseModel> {
  entries: HookStateEntry<T>[]

  constructor(entries: AccountNamespaceHookStateEntry[]) {
    this.entries = entries.map((entry) => new HookStateEntry(entry))
  }
}
