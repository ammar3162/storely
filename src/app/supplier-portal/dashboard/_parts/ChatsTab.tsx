'use client'
import { MessageCircle } from 'lucide-react'
import type { SupplierDashboard } from './useSupplierDashboard'

export default function ChatsTab({ m }: { m: SupplierDashboard }) {
  const { chatMessages, openChatOrgId, setOpenChatOrgId, chatReply, setChatReply, chatSending, activeTab, sendChatReply } = m
  return (
    <>
        {activeTab==='chats' && (
          <section className="sd-panel">
            <h2>المحادثات</h2>
            {(() => {
              const orgIds = Array.from(new Set(chatMessages.map((m:any)=>m.org_id)))
              if (orgIds.length===0) return <div className="sd-empty"><MessageCircle size={28}/><b>لا توجد محادثات</b><span>تظهر هنا رسائل العملاء إليك.</span></div>
              return (
                <div className="sd-list">
                  {orgIds.map((oid:any) => {
                    const orgMsgs = chatMessages.filter((m:any)=>m.org_id===oid)
                    const orgName = orgMsgs[orgMsgs.length-1]?.org_name || 'عميل'
                    const isOpen = openChatOrgId===oid
                    return (
                      <div key={oid} className="sd-chat">
                        <button className="sd-chat-head" onClick={()=>setOpenChatOrgId(isOpen?null:oid)} aria-expanded={isOpen}>
                          <b>{orgName}</b><span>{orgMsgs.length} رسالة</span>
                        </button>
                        {isOpen && (<>
                          <div className="sd-chat-body">
                            {orgMsgs.map((m:any)=>(<div key={m.id} className={'sd-msg '+(m.sender_type==='supplier'?'me':'them')}>{m.message}</div>))}
                          </div>
                          <div className="sd-inline" style={{padding:10,borderTop:'1px solid var(--line)'}}>
                            <input className="sd-in" value={chatReply} onChange={e=>setChatReply(e.target.value)} onKeyDown={e=>{if(e.key==='Enter') sendChatReply(oid)}} placeholder="اكتب ردك…"/>
                            <button className="sd-btn" onClick={()=>sendChatReply(oid)} disabled={chatSending || !chatReply.trim()}>{chatSending?'…':'إرسال'}</button>
                          </div>
                        </>)}
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </section>
        )}
    </>
  )
}
