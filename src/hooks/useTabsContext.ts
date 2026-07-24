import { useContext } from 'react'
import { TabsCacheContext } from '../context/types'

export function useTabsContext() {
  return useContext(TabsCacheContext)
}
