import { useSyncExternalStore } from 'react'
import { getHideAmount, setHideAmount, subscribeHideAmount } from '../utils/amountVisibility'

export function useHideAmount() {
  const hideAmount = useSyncExternalStore(subscribeHideAmount, getHideAmount, () => false)
  return { hideAmount, setHideAmount }
}
