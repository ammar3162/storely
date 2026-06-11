'use client'
import { createContext, useContext, useState } from 'react'

interface BranchCtx { branchId: string|null; setBranchId: (id:string)=>void }
const BranchContext = createContext<BranchCtx>({ branchId:null, setBranchId:()=>{} })

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const [branchId, setBranchIdState] = useState<string|null>(
    typeof window !== 'undefined' ? sessionStorage.getItem('s_branch_id') : null
  )
  function setBranchId(id: string) {
    sessionStorage.setItem('s_branch_id', id)
    setBranchIdState(id)
  }
  return <BranchContext.Provider value={{ branchId, setBranchId }}>{children}</BranchContext.Provider>
}

export const useBranch = () => useContext(BranchContext)
