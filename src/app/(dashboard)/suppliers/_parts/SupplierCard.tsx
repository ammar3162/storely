'use client'
import { useSupplierCard } from './useSupplierCard'
import SupplierCardHeader from './SupplierCardHeader'
import SupplierCardDetails from './SupplierCardDetails'
import SupplierDeleteConfirm from './SupplierDeleteConfirm'
import SupplierTimeline from './SupplierTimeline'

export default function SupplierCard(props: any) {
  const m = useSupplierCard(props)
  const { autoOpen, cardRef } = m

  return (
    <div ref={cardRef} style={{ background:'white', border: autoOpen ? '2px solid #029FA2' : '1.5px solid #e2e8f0', borderRadius:16, overflow:'hidden', boxShadow:'0 1px 3px rgba(15,23,42,.04),0 1px 2px rgba(15,23,42,.03)', transition:'box-shadow .2s' }}>
      <SupplierCardHeader m={m}/>

      <SupplierCardDetails m={m}/>

      <SupplierDeleteConfirm m={m}/>

      <SupplierTimeline m={m}/>

    </div>
  )
}
