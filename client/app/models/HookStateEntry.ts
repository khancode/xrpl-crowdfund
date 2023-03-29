import { BaseModel } from './BaseModel'
import { AccountNamespaceHookStateEntry } from './HookState'
import { HookStateKey } from './HookStateKey'
import { HookStateValue } from './HookStateValue'

export class HookStateEntry<T extends BaseModel> {
  key: HookStateKey
  value: HookStateValue<T>

  constructor({
    HookStateKey: hookStateKey,
    HookStateData: hookStateValue,
  }: AccountNamespaceHookStateEntry) {
    this.key = HookStateKey.from(hookStateKey)
    this.value = HookStateValue.from(hookStateValue, this.key.dataLookupFlag)
  }
}
