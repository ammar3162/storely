import sys

path = "src/app/(auth)/login/page.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

orig = content

old = """            {/* معاينة مصغّرة للوحة التحكم */}
            <div style={{position:'relative',background:'white',borderRadius:16,border:'1px solid #eef0f2',boxShadow:'0 16px 40px rgba(15,23,42,.1)',overflow:'hidden',marginBottom:24}}>
              <div style={{background:'linear-gradient(135deg,#16a34a,#15803d)',padding:'10px 14px',display:'flex',alignItems:'center',gap:8}}>
                <div style={{width:20,height:20,borderRadius:6,background:'rgba(255,255,255,.9)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10}}>📦</div>
                <span style={{color:'white',fontSize:11,fontWeight:800}}>Storely</span>
              </div>
              <div style={{padding:14}}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6,marginBottom:10}}>
                  {[['15','صرف','#16a34a'],['4','ناقص','#dc2626'],['72','مخزون','#2563eb']].map(([v,l,c2])=>(
                    <div key={l as string} style={{background:'#f8fafc',borderRadius:8,padding:'7px 6px',textAlign:'center' as const}}>
                      <div style={{fontSize:14,fontWeight:900,color:c2 as string}}>{v}</div>
                      <div style={{fontSize:8,color:'#9ca3af',marginTop:1}}>{l}</div>
                    </div>
                  ))}
                </div>
                <div style={{background:'#fffbeb',border:'1px solid #fde68a',borderRadius:8,padding:'7px 10px',display:'flex',alignItems:'center',gap:6}}>
                  <span style={{fontSize:11}}>⚠️</span>
                  <span style={{fontSize:10,color:'#92400e',fontWeight:700}}>4 أصناف وصلت للحد الأدنى</span>
                </div>
              </div>
              <div style={{position:'absolute',bottom:-12,left:-10,background:'white',borderRadius:10,border:'1px solid #eef0f2',boxShadow:'0 8px 20px rgba(15,23,42,.12)',padding:'8px 10px',display:'flex',alignItems:'center',gap:7}}>
                <div style={{width:22,height:22,borderRadius:6,background:'#25d366',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11}}>📲</div>
                <span style={{fontSize:9,fontWeight:800,color:'#111827'}}>تنبيه واتساب فوري</span>
              </div>
            </div>"""

new = """            {/* صورة حقيقية بدل المعاينة المزيّفة */}
            <div style={{position:'relative',borderRadius:16,overflow:'hidden',boxShadow:'0 16px 40px rgba(15,23,42,.12)',marginBottom:24}}>
              <img src="/storely-team.jpg" alt="Storely" style={{width:'100%',display:'block',objectFit:'cover'}}/>
              <div style={{position:'absolute',bottom:-12,left:-10,background:'white',borderRadius:10,border:'1px solid #eef0f2',boxShadow:'0 8px 20px rgba(15,23,42,.12)',padding:'8px 10px',display:'flex',alignItems:'center',gap:7}}>
                <div style={{width:22,height:22,borderRadius:6,background:'#25d366',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11}}>📲</div>
                <span style={{fontSize:9,fontWeight:800,color:'#111827'}}>تنبيه واتساب فوري</span>
              </div>
            </div>"""

assert old in content, "STEP1_FAIL"
content = content.replace(old, new, 1)

if content == orig:
    print("NO_CHANGE")
    sys.exit(1)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("SUCCESS")
