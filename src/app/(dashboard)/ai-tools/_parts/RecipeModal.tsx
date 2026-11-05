'use client'
import { Suspense, lazy } from 'react'
import { ListSkeleton } from '@/components/PageSkeleton'
import type { AiToolsPage } from './useAiTools'

// نافذة الوصفة تنحمّل بس لما تنفتح
const RecipeCreateModal = lazy(() => import('@/components/RecipeCreateModal'))

export default function RecipeModal({ m }: { m: AiToolsPage }) {
  const { showRecipeModal, setShowRecipeModal, rawMaterials, showRecipesList, editingRecipeId, setEditingRecipeId, loadRecipesList } = m
  return (
    <>
      {showRecipeModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:700,display:'flex',alignItems:'center',justifyContent:'center',padding:16,backdropFilter:'blur(4px)'}} onClick={()=>{setShowRecipeModal(false);setEditingRecipeId(null)}}>
          <Suspense fallback={<ListSkeleton/>}>
          <RecipeCreateModal
            onClose={()=>{setShowRecipeModal(false);setEditingRecipeId(null)}}
            onSaved={()=>{setShowRecipeModal(false);setEditingRecipeId(null);if(showRecipesList)loadRecipesList()}}
            rawMaterials={rawMaterials}
            orgId={typeof window!=='undefined'?sessionStorage.getItem('s_org_id'):null}
            branchId={typeof window!=='undefined'?sessionStorage.getItem('s_branch_id'):null}
            editingRecipeId={editingRecipeId}
          />
          </Suspense>
        </div>
      )}
    </>
  )
}
